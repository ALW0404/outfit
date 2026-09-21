/* Outfit – lokale PWA, Daten in localStorage + IndexedDB (Bilder) */
'use strict';

/* ================= Utils ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const pad2 = n => String(n).padStart(2, '0');
const localISO = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayISO = () => localISO(new Date());
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = v => (v * 100).toFixed(2) + '%';
const fmtNudge = v => (v > 0 ? '+' : '') + Math.round(v * 100);

/* ================= Kategorien ================= */
const CATS = {
  top:    { label: 'Oberteil',   ico: '👕', z: 20, w: 1.22, anchor: 'shoulder', warmth: 2 },
  bottom: { label: 'Hose/Rock',  ico: '👖', z: 15, w: 1.06, anchor: 'waist',    warmth: 2 },
  dress:  { label: 'Kleid',      ico: '👗', z: 18, w: 1.20, anchor: 'shoulder', warmth: 2 },
  outer:  { label: 'Jacke',      ico: '🧥', z: 30, w: 1.42, anchor: 'shoulder', warmth: 4 },
  shoes:  { label: 'Schuhe',     ico: '👟', z: 12, w: 0.95, anchor: 'floor',    warmth: 2 },
  acc:    { label: 'Accessoire', ico: '🧣', z: 40, w: 0.75, anchor: 'neck',     warmth: 1 }
};
const CAT_ORDER = ['top', 'bottom', 'dress', 'outer', 'shoes', 'acc'];
const WARMTH_LBL = ['', 'sehr leicht', 'leicht', 'mittel', 'warm', 'sehr warm'];
const FORMAL_LBL = ['', 'sehr leger', 'leger', 'normal', 'schick', 'sehr schick'];

const CAL_PTS = [
  { key: 'shoulderL', label: 'Schulter links im Bild', hint: 'Äußere Kante, wo der Ärmel ansetzt' },
  { key: 'shoulderR', label: 'Schulter rechts im Bild', hint: 'Gegenüberliegende Schulterkante' },
  { key: 'waist',     label: 'Taille',                  hint: 'Wo der Hosenbund sitzt' },
  { key: 'crotch',    label: 'Schritt',                 hint: 'Übergang zu den Beinen' },
  { key: 'knee',      label: 'Knie',                    hint: 'Mitte der Kniescheibe' },
  { key: 'floor',     label: 'Boden',                   hint: 'Wo deine Sohlen den Boden berühren' }
];

/* ================= Datenbank (localStorage) ================= */
const LS_KEY = 'outfit-v1';
const LS_UI = 'outfit-ui';

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const d = JSON.parse(raw); if (d && d.version === 1) return d; }
  } catch (e) { console.warn('DB laden fehlgeschlagen', e); }
  return { version: 1, items: [], body: null, outfits: [], prefs: {} };
}
let DB = loadDB();
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch (e) { toast('Speicher voll – bitte in Daten aufräumen'); console.error(e); }
}

let UI = { tab: 'today', closetFilter: 'all' };
try { Object.assign(UI, JSON.parse(localStorage.getItem(LS_UI) || '{}')); } catch (e) {}
UI.modal = null; UI.draft = null; UI.calIdx = -1; UI.testOutfit = null;
function saveUI() {
  localStorage.setItem(LS_UI, JSON.stringify({ tab: UI.tab, closetFilter: UI.closetFilter }));
}

const itemById = id => DB.items.find(i => i.id === id);

/* ================= Bilder (IndexedDB) ================= */
let _idb = null;
function idb() {
  return _idb ? Promise.resolve(_idb) : new Promise((res, rej) => {
    const r = indexedDB.open('outfit-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pics');
    r.onsuccess = () => { _idb = r.result; res(_idb); };
    r.onerror = () => rej(r.error);
  });
}
const idbOp = (mode, fn) => idb().then(db => new Promise((res, rej) => {
  const tx = db.transaction('pics', mode); const st = tx.objectStore('pics');
  const rq = fn(st);
  tx.oncomplete = () => res(rq && rq.result);
  tx.onerror = () => rej(tx.error);
}));
const picPut = (id, blob) => idbOp('readwrite', st => st.put(blob, id));
const picGet = id => idbOp('readonly', st => st.get(id));
const picDel = id => id ? idbOp('readwrite', st => st.delete(id)) : Promise.resolve();

const picURLCache = new Map();
async function picURL(id) {
  if (!id) return null;
  if (picURLCache.has(id)) return picURLCache.get(id);
  const blob = await picGet(id).catch(() => null);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  picURLCache.set(id, u); return u;
}
function dropPicURL(id) {
  const u = picURLCache.get(id);
  if (u) { URL.revokeObjectURL(u); picURLCache.delete(id); }
}
function hydratePics() {
  document.querySelectorAll('img[data-pic]').forEach(async img => {
    const u = await picURL(img.dataset.pic);
    if (u) img.src = u; else img.style.visibility = 'hidden';
  });
}

/* ================= Bildverarbeitung ================= */
const loadImg = src => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error('Bild nicht lesbar'));
  img.src = src;
});
const blobToDataURL = blob => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
});
function dataURLtoBlob(du) {
  const [head, b64] = du.split(',');
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
const canvasToBlob = (cv, type, q) => new Promise((res, rej) =>
  cv.toBlob(b => b ? res(b) : rej(new Error('toBlob')), type, q));

/* Schneidet transparente Ränder weg; gibt null zurück, wenn das Bild keine Transparenz hat. */
function alphaBounds(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1, transparent = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = d[(y * w + x) * 4 + 3];
      if (a < 24) { transparent++; continue; }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const ratio = transparent / (w * h);
  return { minX, minY, maxX, maxY, cut: ratio > 0.02 };
}

/* Liest die auffälligsten Farben aus den undurchsichtigen Pixeln. */
function extractColors(ctx, w, h, max = 3) {
  const d = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const key = (d[i] >> 4) * 1024 + (d[i + 1] >> 4) * 32 + (d[i + 2] >> 4);
    let b = buckets.get(key);
    if (!b) { b = { n: 0, r: 0, g: 0, bl: 0 }; buckets.set(key, b); }
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.bl += d[i + 2];
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
    .map(b => [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.bl / b.n)]);
  const out = [];
  for (const c of sorted) {
    if (out.length >= max) break;
    if (out.every(o => (o[0] - c[0]) ** 2 + (o[1] - c[1]) ** 2 + (o[2] - c[2]) ** 2 > 3600)) out.push(c);
  }
  return out.map(c => '#' + c.map(v => pad2(v.toString(16))).join(''));
}

/* Datei/Blob → zugeschnittenes Bild + Farben. Behält Transparenz als PNG. */
async function prepItemImage(src, max = 900) {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  let img;
  try { img = await loadImg(url); }
  finally { if (typeof src !== 'string') setTimeout(() => URL.revokeObjectURL(url), 0); }

  const k0 = Math.min(1, 1400 / Math.max(img.width, img.height));
  const w0 = Math.max(1, Math.round(img.width * k0));
  const h0 = Math.max(1, Math.round(img.height * k0));
  const cv = document.createElement('canvas');
  cv.width = w0; cv.height = h0;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w0, h0);

  const bounds = alphaBounds(ctx, w0, h0);
  const bx = bounds ? bounds.minX : 0, by = bounds ? bounds.minY : 0;
  const bw = bounds ? bounds.maxX - bounds.minX + 1 : w0;
  const bh = bounds ? bounds.maxY - bounds.minY + 1 : h0;
  const cut = !!(bounds && bounds.cut);

  const k = Math.min(1, max / Math.max(bw, bh));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(bw * k));
  out.height = Math.max(1, Math.round(bh * k));
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.drawImage(cv, bx, by, bw, bh, 0, 0, out.width, out.height);

  const colors = extractColors(octx, out.width, out.height);
  const blob = cut ? await canvasToBlob(out, 'image/png')
                   : await canvasToBlob(out, 'image/jpeg', 0.85);
  return { blob, colors, cut, ar: out.height / out.width };
}

/* Körperfoto: nur verkleinern, nichts zuschneiden. */
async function prepBodyImage(file, max = 1400) {
  const url = URL.createObjectURL(file);
  let img;
  try { img = await loadImg(url); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return { blob: await canvasToBlob(cv, 'image/jpeg', 0.85), ratio: cv.height / cv.width };
}

/* ================= Paper-Doll ================= */
const calDone = () => {
  const b = DB.body;
  return !!(b && b.picId && b.cal && CAL_PTS.every(p => b.cal[p.key]));
};
function calGeom() {
  const c = DB.body.cal;
  return {
    cx: (c.shoulderL.x + c.shoulderR.x) / 2,
    shW: Math.abs(c.shoulderR.x - c.shoulderL.x),
    shY: (c.shoulderL.y + c.shoulderR.y) / 2,
    waistY: c.waist.y, crotchY: c.crotch.y, kneeY: c.knee.y, floorY: c.floor.y
  };
}
function dollLayout(item) {
  const meta = CATS[item.cat] || CATS.top;
  const g = calGeom();
  const fit = item.fit || {};
  const w = g.shW * meta.w * (fit.scale || 1);
  const left = g.cx + (fit.dx || 0) - w / 2;
  /* Höhe explizit setzen, damit sich die Länge unabhängig von der Breite justieren lässt.
     w ist ein Anteil der Container-Breite, height ein Anteil der Höhe – daher /bodyRatio. */
  const bodyRatio = (DB.body && DB.body.ratio) || 1.5;
  const h = w * (item.ar || 1.4) * (fit.sy || 1) / bodyRatio;
  let vert;
  if (meta.anchor === 'floor') {
    vert = `bottom:${pct(1 - clamp(g.floorY + (fit.dy || 0), 0, 1.5))}`;
  } else {
    const base = meta.anchor === 'waist' ? g.waistY - 0.015
               : meta.anchor === 'neck'  ? g.shY - 0.075
               : g.shY - 0.015;
    vert = `top:${pct(base + (fit.dy || 0))}`;
  }
  return `left:${pct(left)}; width:${pct(w)}; height:${pct(h)}; ${vert}; z-index:${meta.z};`;
}

/* items: Array von Kleidungsstücken (oder null-Einträge, die übersprungen werden) */
function dollHTML(items, opt = {}) {
  const b = DB.body;
  if (!b || !b.picId) return '<p class="hint">Noch kein Körperfoto gesetzt.</p>';
  const ratio = b.ratio || 1.6;
  const pieces = calDone() ? (items || []).filter(Boolean).map(it =>
    `<div class="piece" style="${dollLayout(it)}"><img data-pic="${it.picId}" alt="${esc(it.name || CATS[it.cat].label)}"></div>`
  ).join('') : '';
  const markers = opt.markers && b.cal ? CAL_PTS.map((p, i) => {
    const v = b.cal[p.key];
    return v ? `<div class="mk" style="left:${pct(v.x)}; top:${pct(v.y)}">${i + 1}</div>` : '';
  }).join('') : '';
  const cls = 'doll' + (opt.tap ? ' tapmode' : '');
  const click = opt.tap ? ' onclick="App.calTap(event)"' : '';
  return `<div class="${cls}" id="${opt.id || 'doll'}" style="max-width:${opt.maxw || 320}px; aspect-ratio:1/${ratio}"${click}>
    <img class="base" data-pic="${b.picId}" alt="Körperfoto">${pieces}${markers}</div>`;
}

/* ================= Rendern ================= */
function render() {
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === UI.tab));
  const main = $('#main');
  main.innerHTML = UI.tab === 'today' ? renderToday()
    : UI.tab === 'closet' ? renderCloset()
    : UI.tab === 'body' ? renderBody()
    : renderData();
  $('#modal-root').innerHTML = renderModal();
  hydratePics();
  if (UI.tab === 'data') showUsage();
  saveUI();
}

function renderToday() {
  const n = DB.items.length;
  const byCat = c => DB.items.filter(i => i.cat === c).length;
  const ready = byCat('top') >= 2 && (byCat('bottom') >= 2 || byCat('dress') >= 1) && byCat('shoes') >= 1;
  return `<div class="card">
    <h2>Guten Morgen</h2>
    <p class="hint">Die Vorschlagslogik – Wetter, Anlass, Stimmung – kommt als Nächstes.
    Zuerst braucht sie etwas zum Kombinieren.</p>
  </div>
  <div class="card">
    <h3>Dein Schrank</h3>
    <p style="margin:0 0 10px"><b style="font-size:22px">${n}</b> ${n === 1 ? 'Teil' : 'Teile'} erfasst</p>
    ${CAT_ORDER.map(c => `<div class="calrow"><span class="num">${byCat(c)}</span>
      <span class="lbl">${CATS[c].ico} ${CATS[c].label}</span></div>`).join('')}
    <p class="small" style="margin-top:12px">
      ${ready ? '✓ Genug für erste Kombinationen.'
              : 'Sinnvoll wird es ab 2 Oberteilen, 2 Hosen und einem Paar Schuhen.'}
    </p>
    <button class="btn primary block" onclick="App.setTab('closet')">Teile hinzufügen</button>
  </div>
  <div class="card">
    <h3>Körperfoto</h3>
    <p class="hint" style="margin:0 0 10px">${calDone()
      ? '✓ Kalibriert – Vorschläge lassen sich auf dir darstellen.'
      : 'Noch nicht eingerichtet. Ohne Kalibrierung gibt es nur die Collage-Ansicht.'}</p>
    <button class="btn block" onclick="App.setTab('body')">${calDone() ? 'Prüfen' : 'Einrichten'}</button>
  </div>`;
}

function renderCloset() {
  const f = UI.closetFilter;
  const list = f === 'all' ? DB.items : DB.items.filter(i => i.cat === f);
  const sorted = [...list].sort((a, b) =>
    CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || (b.addedAt || 0) - (a.addedAt || 0));
  const counts = c => DB.items.filter(i => i.cat === c).length;
  return `<div class="card">
    <div class="btn-row" style="margin-bottom:4px">
      <button class="btn primary" onclick="App.addItem('camera')">📷 Foto machen</button>
      <button class="btn" onclick="App.addItem('library')">🖼️ Aus Fotos</button>
      <button class="btn" onclick="App.pasteItem()">📋 Einfügen</button>
    </div>
    <p class="small" style="margin:8px 0 0">
      Bester Weg auf dem iPhone: Teil in der Fotos-App lange antippen → <b>Motiv kopieren</b> → hier auf
      <b>Einfügen</b>. Dann ist der Hintergrund schon weg.</p>
  </div>
  <div class="card">
    <div class="chips">
      <button class="chip ${f === 'all' ? 'active' : ''}" onclick="App.filterCloset('all')">Alle ${DB.items.length}</button>
      ${CAT_ORDER.filter(c => counts(c) > 0).map(c =>
        `<button class="chip ${f === c ? 'active' : ''}" onclick="App.filterCloset('${c}')">${CATS[c].ico} ${counts(c)}</button>`).join('')}
    </div>
    ${sorted.length ? `<div class="grid">${sorted.map(tileHTML).join('')}</div>`
      : `<p class="hint">Noch nichts drin. Fang mit den Teilen an, die du wirklich oft trägst –
         15 Stück reichen für den Anfang.</p>`}
  </div>`;
}
function tileHTML(it) {
  return `<div class="tile" onclick="App.editItem('${it.id}')">
    <div class="thumbwrap"><img data-pic="${it.picId}" alt="${esc(it.name || '')}"></div>
    <div class="swatches">${(it.colors || []).map(c =>
      `<span class="sw" style="background:${esc(c)}"></span>`).join('')}</div>
    <div class="cap">${esc(it.name || CATS[it.cat].label)}</div>
  </div>`;
}

function renderBody() {
  const b = DB.body;
  if (!b || !b.picId) {
    return `<div class="card">
      <h2>Körperfoto</h2>
      <p class="hint">Grundlage für die Darstellung: ein Ganzkörperfoto von dir. Es bleibt auf
      diesem Gerät und wird nirgendwohin hochgeladen.</p>
      <h3>Für ein brauchbares Ergebnis</h3>
      <ul class="hint" style="margin:0 0 12px; padding-left:20px">
        <li>Ganzer Körper im Bild, Füße und Kopf komplett</li>
        <li>Gerade stehen, Arme locker am Körper</li>
        <li>Enge Kleidung, ruhiger Hintergrund</li>
        <li>Handy auf Brusthöhe, nicht von schräg oben</li>
      </ul>
      <button class="btn primary block" onclick="App.chooseBody()">Körperfoto wählen</button>
    </div>`;
  }
  const done = CAL_PTS.filter(p => b.cal && b.cal[p.key]).length;
  const tapping = UI.calIdx >= 0;
  const cur = tapping ? CAL_PTS[UI.calIdx] : null;
  return `<div class="card">
    <h2>Kalibrierung <span class="small">${done}/${CAL_PTS.length}</span></h2>
    ${tapping
      ? `<p class="hint" style="margin:0 0 8px"><b>${esc(cur.label)}</b> antippen – ${esc(cur.hint)}.</p>`
      : `<p class="hint" style="margin:0 0 8px">${done === CAL_PTS.length
          ? 'Fertig. Tippe einen Punkt an, um ihn zu korrigieren.'
          : 'Sechs Punkte antippen, damit Kleidung an der richtigen Stelle landet.'}</p>`}
    ${dollHTML(UI.testOutfit ? UI.testOutfit.map(itemById) : [], { markers: true, tap: tapping, maxw: 340 })}
    <div class="callist">
      ${CAL_PTS.map((p, i) => {
        const has = b.cal && b.cal[p.key];
        return `<div class="calrow ${has ? 'done' : ''} ${UI.calIdx === i ? 'cur' : ''}" onclick="App.calStart(${i})">
          <span class="num">${has ? '✓' : i + 1}</span>
          <span class="lbl">${esc(p.label)}</span>
          <span class="st">${UI.calIdx === i ? 'antippen' : has ? '' : 'offen'}</span>
        </div>`;
      }).join('')}
    </div>
    ${tapping ? `<button class="btn block" style="margin-top:10px" onclick="App.calStop()">Abbrechen</button>` : ''}
  </div>
  <div class="card">
    <h3>Prüfen</h3>
    <p class="hint" style="margin:0 0 10px">Legt ein Beispiel-Outfit aus deinem Schrank auf das Foto.
    Sitzt etwas daneben, lässt sich das pro Teil im Schrank feinjustieren.</p>
    <div class="btn-row">
      <button class="btn primary" onclick="App.testOutfit()" ${calDone() && DB.items.length ? '' : 'disabled'}>Testvorschau</button>
      ${UI.testOutfit ? `<button class="btn" onclick="App.clearTest()">Ausziehen</button>` : ''}
    </div>
    ${!calDone() ? '<p class="small" style="margin-top:8px">Erst alle sechs Punkte setzen.</p>'
      : !DB.items.length ? '<p class="small" style="margin-top:8px">Erst ein paar Teile erfassen.</p>' : ''}
  </div>
  <div class="card">
    <h3>Foto</h3>
    <div class="btn-row">
      <button class="btn" onclick="App.chooseBody()">Anderes Foto</button>
      <button class="btn danger" onclick="App.resetCal()">Kalibrierung zurücksetzen</button>
    </div>
  </div>`;
}

function renderData() {
  const n = DB.items.length;
  return `<div class="card">
    <h2>Daten</h2>
    <p class="hint">Alles liegt auf diesem Gerät: ${n} ${n === 1 ? 'Teil' : 'Teile'}${DB.body ? ' und dein Körperfoto' : ''}.
    Ein Backup ist sinnvoll, bevor du Safari-Daten löschst oder das Handy wechselst.</p>
    <p class="small" id="usage">Speicher wird ermittelt …</p>
  </div>
  <div class="card">
    <h3>Sichern</h3>
    <div class="btn-row">
      <button class="btn primary" onclick="App.exportData(true)">Export mit Bildern</button>
      <button class="btn" onclick="App.exportData(false)">Nur Daten</button>
    </div>
    <p class="small" style="margin-top:8px">Mit Bildern wird die Datei groß (ca. 150 KB pro Teil), ist dafür
    aber ein vollständiges Backup.</p>
    <h3>Zurückholen</h3>
    <button class="btn block" onclick="App.chooseImport()">Backup einlesen</button>
  </div>
  <div class="card">
    <h3>Aufräumen</h3>
    <button class="btn danger block" onclick="App.wipe()">Alles löschen</button>
  </div>`;
}

/* ================= Modal ================= */
function renderModal() {
  if (UI.modal !== 'item' || !UI.draft) return '';
  const d = UI.draft;
  const isNew = !itemById(d.id);
  const showFit = calDone();
  return `<div class="overlay" onclick="App.cancelItem()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>${isNew ? 'Neues Teil' : 'Teil bearbeiten'}</h2>
      <button class="btn small" onclick="App.cancelItem()">Abbrechen</button>
    </div>
    <div class="checker"><img data-pic="${d.picId}" alt=""></div>
    ${d.cut ? '' : `<p class="warn" style="margin:8px 0 0">Hintergrund ist noch dran. Tipp: in der Fotos-App
      das Teil lange antippen, <b>Motiv kopieren</b>, dann hier <b>Einfügen</b>.</p>`}
    <div class="chips" style="margin-top:12px">
      ${CAT_ORDER.map(c => `<button class="chip ${d.cat === c ? 'active' : ''}"
        onclick="App.draftSet('cat','${c}')">${CATS[c].ico} ${CATS[c].label}</button>`).join('')}
    </div>
    <label class="fld">Name (optional)
      <input type="text" value="${esc(d.name || '')}" placeholder="${esc(CATS[d.cat].label)}"
        oninput="App.draftSet('name', this.value, true)">
    </label>
    <label class="fld">Wärme
      <div class="slider-row">
        <input type="range" min="1" max="5" step="1" value="${d.warmth}"
          oninput="App.draftSlide('warmth', +this.value)">
        <span class="val" data-out="warmth">${WARMTH_LBL[d.warmth]}</span>
      </div>
    </label>
    <label class="fld">Anlass
      <div class="slider-row">
        <input type="range" min="1" max="5" step="1" value="${d.formality}"
          oninput="App.draftSlide('formality', +this.value)">
        <span class="val" data-out="formality">${FORMAL_LBL[d.formality]}</span>
      </div>
    </label>
    <h3>Farben</h3>
    <div class="btn-row">
      <div class="swatches" style="justify-content:flex-start">
        ${(d.colors || []).map(c => `<span class="sw" style="width:22px; height:22px; background:${esc(c)}"></span>`).join('')
          || '<span class="small">keine erkannt</span>'}
      </div>
    </div>
    ${showFit ? `<h3>Sitz auf dem Körperfoto</h3>
    ${dollHTML([d], { maxw: 190, id: 'fitdoll' })}
    <label class="fld" style="margin-top:10px">Breite
      <div class="slider-row">
        <input type="range" min="0.5" max="1.8" step="0.02" value="${d.fit.scale}"
          oninput="App.draftSlide('fit.scale', +this.value)">
        <span class="val" data-out="fit.scale">${Math.round(d.fit.scale * 100)} %</span>
      </div>
    </label>
    <label class="fld">Länge
      <div class="slider-row">
        <input type="range" min="0.5" max="2" step="0.02" value="${d.fit.sy}"
          oninput="App.draftSlide('fit.sy', +this.value)">
        <span class="val" data-out="fit.sy">${Math.round(d.fit.sy * 100)} %</span>
      </div>
    </label>
    <label class="fld">Seitlich
      <div class="slider-row">
        <input type="range" min="-0.25" max="0.25" step="0.005" value="${d.fit.dx}"
          oninput="App.draftSlide('fit.dx', +this.value)">
        <span class="val" data-out="fit.dx">${fmtNudge(d.fit.dx)}</span>
      </div>
    </label>
    <label class="fld">Höhe
      <div class="slider-row">
        <input type="range" min="-0.2" max="0.2" step="0.005" value="${d.fit.dy}"
          oninput="App.draftSlide('fit.dy', +this.value)">
        <span class="val" data-out="fit.dy">${fmtNudge(d.fit.dy)}</span>
      </div>
    </label>`
    : `<p class="small" style="margin-top:14px">Sobald ein Körperfoto kalibriert ist, kannst du hier den
       Sitz justieren.</p>`}
    <button class="btn primary block" style="margin-top:14px" onclick="App.saveItem()">Speichern</button>
    ${isNew ? '' : `<button class="btn danger block" onclick="App.deleteItem()">Teil löschen</button>`}
  </div></div>`;
}

/* ================= Aktionen ================= */
const App = {};
window.App = App;

let toastTimer = null;
function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

App.setTab = tab => { UI.tab = tab; UI.modal = null; UI.calIdx = -1; render(); };
App.filterCloset = c => { UI.closetFilter = c; render(); };

/* --- Teil hinzufügen --- */
App.addItem = source => {
  const input = $('#pick-item');
  if (source === 'camera') input.setAttribute('capture', 'environment');
  else input.removeAttribute('capture');
  input.value = '';
  input.click();
};
App.itemFileChosen = async input => {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  await startDraftFrom(file);
};
App.pasteItem = async () => {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('unsupported');
    const items = await navigator.clipboard.read();
    for (const it of items) {
      const type = it.types.find(t => t.startsWith('image/'));
      if (type) { await startDraftFrom(await it.getType(type)); return; }
    }
    toast('In der Zwischenablage ist kein Bild');
  } catch (e) {
    console.warn('Einfügen fehlgeschlagen', e);
    toast('Einfügen ging nicht – nimm „Aus Fotos"');
  }
};
async function startDraftFrom(blob) {
  toast('Bild wird vorbereitet …');
  try {
    const { blob: out, colors, cut, ar } = await prepItemImage(blob);
    const picId = uid();
    await picPut(picId, out);
    UI.draft = {
      id: uid(), picId, colors, cut, ar, cat: 'top', name: '',
      warmth: CATS.top.warmth, formality: 3,
      fit: { dx: 0, dy: 0, scale: 1, sy: 1 }, addedAt: Date.now(), _newPic: true
    };
    UI.modal = 'item';
    document.querySelector('.toast')?.remove();
    render();
  } catch (e) {
    console.error(e);
    toast('Das Bild konnte nicht gelesen werden');
  }
}

App.editItem = id => {
  const it = itemById(id);
  if (!it) return;
  UI.draft = JSON.parse(JSON.stringify(it));
  UI.draft.fit = Object.assign({ dx: 0, dy: 0, scale: 1, sy: 1 }, UI.draft.fit);
  UI.modal = 'item';
  render();
};
App.draftSet = (key, val, quiet) => {
  if (!UI.draft) return;
  if (key === 'cat' && UI.draft.cat !== val) UI.draft.warmth = CATS[val].warmth;
  UI.draft[key] = val;
  if (!quiet) render();
};
/* Schieberegler dürfen nicht neu rendern – sonst verliert der Finger beim Ziehen das Element. */
App.draftSlide = (path, val) => {
  const d = UI.draft;
  if (!d) return;
  if (path.startsWith('fit.')) {
    d.fit[path.slice(4)] = val;
    const piece = $('#fitdoll .piece');
    if (piece) piece.setAttribute('style', dollLayout(d));
  } else {
    d[path] = val;
  }
  const out = document.querySelector(`#modal-root .val[data-out="${path}"]`);
  if (out) out.textContent = path === 'warmth' ? WARMTH_LBL[val]
    : path === 'formality' ? FORMAL_LBL[val]
    : (path === 'fit.scale' || path === 'fit.sy') ? Math.round(val * 100) + ' %'
    : fmtNudge(val);
};
App.saveItem = () => {
  const d = UI.draft;
  if (!d) return;
  delete d._newPic;
  const ex = DB.items.findIndex(i => i.id === d.id);
  if (ex >= 0) DB.items[ex] = d; else DB.items.push(d);
  save();
  UI.modal = null; UI.draft = null;
  toast('Gespeichert');
  render();
};
App.cancelItem = async () => {
  const d = UI.draft;
  UI.modal = null; UI.draft = null;
  if (d && d._newPic) { dropPicURL(d.picId); await picDel(d.picId); }
  render();
};
App.deleteItem = async () => {
  const d = UI.draft;
  if (!d || !confirm('Dieses Teil wirklich löschen?')) return;
  DB.items = DB.items.filter(i => i.id !== d.id);
  if (UI.testOutfit) UI.testOutfit = UI.testOutfit.filter(id => id !== d.id);
  save();
  UI.modal = null; UI.draft = null;
  dropPicURL(d.picId); await picDel(d.picId);
  render();
};

/* --- Körperfoto & Kalibrierung --- */
App.chooseBody = () => { const i = $('#pick-body'); i.value = ''; i.click(); };
App.bodyFileChosen = async input => {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  toast('Foto wird vorbereitet …');
  try {
    const { blob, ratio } = await prepBodyImage(file);
    const old = DB.body && DB.body.picId;
    const picId = uid();
    await picPut(picId, blob);
    DB.body = { picId, ratio, cal: {} };
    save();
    if (old) { dropPicURL(old); await picDel(old); }
    UI.calIdx = 0; UI.testOutfit = null;
    document.querySelector('.toast')?.remove();
    render();
  } catch (e) {
    console.error(e);
    toast('Das Foto konnte nicht gelesen werden');
  }
};
App.calStart = i => { UI.calIdx = UI.calIdx === i ? -1 : i; render(); };
App.calStop = () => { UI.calIdx = -1; render(); };
App.calTap = ev => {
  if (UI.calIdx < 0 || !DB.body) return;
  const box = ev.currentTarget.getBoundingClientRect();
  const x = clamp((ev.clientX - box.left) / box.width, 0, 1);
  const y = clamp((ev.clientY - box.top) / box.height, 0, 1);
  DB.body.cal = DB.body.cal || {};
  DB.body.cal[CAL_PTS[UI.calIdx].key] = { x, y };
  save();
  const next = CAL_PTS.findIndex((p, i) => i > UI.calIdx && !DB.body.cal[p.key]);
  UI.calIdx = next;
  render();
};
App.resetCal = () => {
  if (!DB.body || !confirm('Alle sechs Punkte neu setzen?')) return;
  DB.body.cal = {};
  save();
  UI.calIdx = 0; UI.testOutfit = null;
  render();
};
App.testOutfit = () => {
  const pick = c => {
    const l = DB.items.filter(i => i.cat === c);
    return l.length ? l[Math.floor(Math.random() * l.length)].id : null;
  };
  const dress = pick('dress');
  const useDress = dress && !DB.items.some(i => i.cat === 'top');
  UI.testOutfit = (useDress ? [dress] : [pick('top'), pick('bottom')])
    .concat([pick('shoes'), pick('outer'), pick('acc')]).filter(Boolean);
  if (!UI.testOutfit.length) toast('Noch keine passenden Teile');
  render();
};
App.clearTest = () => { UI.testOutfit = null; render(); };

/* --- Daten --- */
App.exportData = async withPics => {
  const out = { app: 'outfit', version: 1, exported: todayISO(), db: DB, pics: {} };
  if (withPics) {
    const ids = DB.items.map(i => i.picId).concat(DB.body ? [DB.body.picId] : []).filter(Boolean);
    for (const id of ids) {
      const blob = await picGet(id).catch(() => null);
      if (blob) out.pics[id] = await blobToDataURL(blob);
    }
  }
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const name = `outfit-backup-${todayISO()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
App.chooseImport = () => { const i = $('#pick-import'); i.value = ''; i.click(); };
App.importChosen = async input => {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'outfit') throw new Error('Kein Outfit-Backup');
    const known = new Set(DB.items.map(i => i.id));
    let added = 0;
    for (const it of (data.db.items || [])) {
      if (known.has(it.id)) continue;
      DB.items.push(it); added++;
    }
    if (data.db.body && !DB.body) DB.body = data.db.body;
    for (const [id, du] of Object.entries(data.pics || {})) {
      if (!(await picGet(id).catch(() => null))) await picPut(id, dataURLtoBlob(du));
    }
    save();
    toast(`${added} ${added === 1 ? 'Teil' : 'Teile'} übernommen`);
    render();
  } catch (e) {
    console.error(e);
    toast('Datei konnte nicht gelesen werden');
  }
};
App.wipe = async () => {
  if (!confirm('Wirklich alle Teile, das Körperfoto und die Kalibrierung löschen?')) return;
  if (!confirm('Das lässt sich nicht rückgängig machen. Sicher?')) return;
  const ids = DB.items.map(i => i.picId).concat(DB.body ? [DB.body.picId] : []).filter(Boolean);
  for (const id of ids) { dropPicURL(id); await picDel(id); }
  DB = { version: 1, items: [], body: null, outfits: [], prefs: {} };
  save();
  UI.testOutfit = null; UI.calIdx = -1;
  render();
};

async function showUsage() {
  const el = $('#usage');
  if (!el || !navigator.storage || !navigator.storage.estimate) { if (el) el.textContent = ''; return; }
  const { usage } = await navigator.storage.estimate();
  el.textContent = `Belegt: ${(usage / 1048576).toFixed(1)} MB`;
}

/* ================= Start ================= */
document.addEventListener('paste', ev => {
  const it = [...(ev.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (!it) return;
  ev.preventDefault();
  startDraftFrom(it.getAsFile());
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
