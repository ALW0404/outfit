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
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffled = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);

/* ================= Kategorien ================= */
/* role steuert die Collage, weight die Größe darin, warmth den Vorgabewert */
const CATS = {
  top:    { label: 'Tops & Shirts',           kurz: 'Tops',    ico: '👕', role: 'base_top',    warmth: 2 },
  knit:   { label: 'Pullover & Strickjacken', kurz: 'Strick',  ico: '🧶', role: 'base_top',    warmth: 4 },
  blouse: { label: 'Blusen',                  kurz: 'Blusen',  ico: '👚', role: 'base_top',    warmth: 2 },
  pants:  { label: 'Hose',                    kurz: 'Hosen',   ico: '👖', role: 'base_bottom', warmth: 3 },
  skirt:  { label: 'Rock',                    kurz: 'Röcke',   ico: '🩱', role: 'base_bottom', warmth: 2 },
  dress:  { label: 'Kleid',                   kurz: 'Kleider', ico: '👗', role: 'base_full',   warmth: 2 },
  outer:  { label: 'Jacke & Mantel',          kurz: 'Jacken',  ico: '🧥', role: 'layer',       warmth: 4 },
  shoes:  { label: 'Schuhe',                  kurz: 'Schuhe',  ico: '👟', role: 'shoes',       warmth: 2 },
  bag:    { label: 'Tasche',                  kurz: 'Taschen', ico: '👜', role: 'bag',         warmth: 1 },
  acc:    { label: 'Accessoire',              kurz: 'Acc',     ico: '🧣', role: 'acc',         warmth: 1 }
};
const CAT_ORDER = ['top', 'knit', 'blouse', 'pants', 'skirt', 'dress', 'outer', 'shoes', 'bag', 'acc'];
/* Bausteine einer Kombination – Reihenfolge wie in der Collage */
const SLOTS = [
  { key: 'base_top',    label: 'Oberteil',   cats: ['top', 'knit', 'blouse'] },
  { key: 'base_bottom', label: 'Unterteil',  cats: ['pants', 'skirt'] },
  { key: 'base_full',   label: 'Kleid',      cats: ['dress'] },
  { key: 'layer',       label: 'Jacke',      cats: ['outer'] },
  { key: 'shoes',       label: 'Schuhe',     cats: ['shoes'] },
  { key: 'bag',         label: 'Tasche',     cats: ['bag'] },
  { key: 'acc',         label: 'Accessoire', cats: ['acc'], max: 2 }
];
const fmtDate = iso => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}.${m}.${y}` : ''; };

const WARMTH_LBL = ['', 'sehr leicht', 'leicht', 'mittel', 'warm', 'sehr warm'];
const FORMAL_LBL = ['', 'sehr leger', 'leger', 'normal', 'schick', 'sehr schick'];

const SEASONS = [
  { key: 'fruehjahr', label: 'Frühjahr', ico: '🌱' },
  { key: 'sommer',    label: 'Sommer',   ico: '☀️' },
  { key: 'herbst',    label: 'Herbst',   ico: '🍂' },
  { key: 'winter',    label: 'Winter',   ico: '❄️' }
];
const seasonNow = () => ['winter','winter','fruehjahr','fruehjahr','fruehjahr','sommer',
  'sommer','sommer','herbst','herbst','herbst','winter'][new Date().getMonth()];
/* Zielwärme je Jahreszeit, gegen die Teile bewertet werden */
const SEASON_WARMTH = { fruehjahr: 2.6, sommer: 1.5, herbst: 3.4, winter: 4.4 };
/* Vorgabe beim Erfassen: aus der Wärme abgeleitet, vom User überschreibbar */
const seasonsFromWarmth = w => w <= 1 ? ['sommer']
  : w === 2 ? ['fruehjahr', 'sommer', 'herbst']
  : w === 3 ? ['fruehjahr', 'herbst']
  : w === 4 ? ['herbst', 'winter'] : ['winter'];

/* ================= Farbwelten ================= */
function hexToHSL(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}
const WORLD_LBL = { neutral: 'Neutral', rot: 'Rot & Rosé', braun: 'Braun & Camel', gelb: 'Gelb & Senf',
  gruen: 'Grün', tuerkis: 'Türkis', blau: 'Blau & Denim', lila: 'Lila', pink: 'Pink & Beere' };

/* Ordnet eine Farbe einer Farbwelt zu.
   Farbton allein reicht nicht: ein dunkles, gedämpftes Warm ist Braun und nicht Rot,
   ein helles warmes Creme ist Neutral und keine eigene Farbwelt. */
function colorWorld(hex) {
  const c = hexToHSL(hex);
  if (!c) return 'neutral';
  const { h, s, l } = c;
  if (l > 0.92 || l < 0.09 || s < 0.15) return 'neutral';
  /* Nude, Sand, Creme, Beige */
  if (h >= 8 && h <= 60 && (l > 0.78 ? s < 0.45 : (l > 0.58 && s < 0.32))) return 'neutral';
  const warm = h >= 335 || h <= 48;
  if (warm && s < 0.38 && l < 0.58) return 'braun';
  if (h >= 335 || h < 14) return 'rot';
  if (h < 48) return 'braun';
  if (h < 68) return 'gelb';
  if (h < 160) return 'gruen';
  if (h < 200) return 'tuerkis';
  if (h < 258) return 'blau';
  if (h < 300) return 'lila';
  return 'pink';
}
/* Bunte Welten eines Teils – Neutral zählt bewusst nicht mit (Entscheidung des Users) */
const itemWorlds = it => [...new Set((it.colors || []).map(colorWorld))].filter(w => w !== 'neutral');
const outfitWorlds = items => [...new Set(items.flatMap(itemWorlds))];
const MAX_WORLDS = 3;
/* Stabiler Schlüssel, um dieselbe Kombination nicht doppelt zu merken */
const outfitKey = ids => [...ids].sort().join('|');
/* Ein Outfit passt nur in die Jahreszeiten, die alle seine Teile mittragen */
const outfitSeasons = items => !items.length ? []
  : SEASONS.map(s => s.key).filter(k => items.every(it => (it.seasons || []).includes(k)));

/* ================= Datenbank (localStorage) ================= */
const LS_KEY = 'outfit-v1';
const LS_UI = 'outfit-ui';
const DB_VERSION = 3;

/* v1 kannte nur top/bottom/acc – die feineren Kategorien muss der User nachsortieren. */
const CAT_MIGRATION = { top: 'top', bottom: 'pants', acc: 'acc', dress: 'dress', outer: 'outer', shoes: 'shoes' };
const NEEDS_SORT_FROM = new Set(['top', 'bottom', 'acc']);

function migrate(d) {
  if (!d) return d;
  if (d.version === 1) {
    (d.items || []).forEach(it => {
      const old = it.cat;
      it.cat = CAT_MIGRATION[old] || 'top';
      if (NEEDS_SORT_FROM.has(old)) it.needsSort = true;
      if (!it.seasons) it.seasons = seasonsFromWarmth(it.warmth || 3);
      delete it.fit;
    });
    delete d.body;
    d.trends = d.trends || [];
    d.version = 2;
  }
  if (d.version === 2) {
    /* Jahreszeiten waren bisher nur aus der Wärme geraten – alle zur Bestätigung vormerken */
    (d.items || []).forEach(it => { if (it.seasonsAuto === undefined) it.seasonsAuto = true; });
    d.tossed = d.tossed || [];
    d.snoozed = d.snoozed || {};
    d.version = 3;
  }
  return d;
}
function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = migrate(JSON.parse(raw));
      if (d && d.version === DB_VERSION) return d;
    }
  } catch (e) { console.warn('DB laden fehlgeschlagen', e); }
  return { version: DB_VERSION, items: [], trends: [], outfits: [], tossed: [], snoozed: {}, prefs: {} };
}
let DB = loadDB();
/* Abgelaufene „Not today"-Sperren beim Start wegräumen, sonst wächst der Speicher endlos */
(() => {
  const heute = todayISO();
  const s = DB.snoozed || {};
  let weg = 0;
  for (const k of Object.keys(s)) if (s[k] !== heute) { delete s[k]; weg++; }
  if (weg) localStorage.setItem(LS_KEY, JSON.stringify(DB));
})();
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch (e) { toast('Speicher voll – bitte in Daten aufräumen'); console.error(e); }
}

let UI = { tab: 'today', closetFilter: 'all', season: seasonNow(), mood: 3 };
try { Object.assign(UI, JSON.parse(localStorage.getItem(LS_UI) || '{}')); } catch (e) {}
UI.modal = null; UI.draft = null; UI.sorting = false;
UI.builder = null; UI.picker = null; UI.queue = null;
UI.seasonDraft = null; UI.seasonDraftId = null;
function saveUI() {
  localStorage.setItem(LS_UI, JSON.stringify({ tab: UI.tab, closetFilter: UI.closetFilter,
    season: UI.season, mood: UI.mood }));
}
const itemById = id => DB.items.find(i => i.id === id);
const needsSortCount = () => DB.items.filter(i => i.needsSort).length;
const seasonTodoCount = () => DB.items.filter(i => i.seasonsAuto).length;

/* Kombinationen, die nicht mehr vorgeschlagen werden sollen */
function blockedKeys() {
  const heute = todayISO();
  const s = new Set(DB.tossed || []);
  Object.entries(DB.snoozed || {}).forEach(([k, d]) => { if (d === heute) s.add(k); });
  (DB.outfits || []).forEach(o => s.add(outfitKey(o.ids)));
  return s;
}

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
const canvasToBlob = (cv, type, q) => new Promise(res => cv.toBlob(b => res(b), type, q));

/* Safari kann WebP erst ab iOS 17 schreiben; toBlob fällt sonst still auf PNG zurück. */
let _webp = null;
async function webpOK() {
  if (_webp !== null) return _webp;
  const cv = document.createElement('canvas'); cv.width = cv.height = 4;
  const b = await canvasToBlob(cv, 'image/webp', 0.8);
  _webp = !!b && b.type === 'image/webp';
  return _webp;
}
/* Transparenz erhalten: WebP wenn möglich, sonst PNG. Ohne Alpha reicht JPEG. */
async function encode(cv, hasAlpha) {
  if (!hasAlpha) return canvasToBlob(cv, 'image/jpeg', 0.82);
  if (await webpOK()) {
    const b = await canvasToBlob(cv, 'image/webp', 0.85);
    if (b) return b;
  }
  return canvasToBlob(cv, 'image/png');
}

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
  return { minX, minY, maxX, maxY, cut: transparent / (w * h) > 0.02 };
}

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

async function prepItemImage(src, max = 760) {
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
  const blob = await encode(out, cut);
  return { blob, colors, cut, ar: out.height / out.width };
}

/* ================= Collage =================
   Zweispaltige Komposition nach dem Vorbild klassischer Outfit-Collagen:
   links die Silhouette (Oberteil über Unterteil bzw. Kleid), rechts die Ebenen
   (Jacke, Tasche, Schuhe), Accessoires schweben in den Ecken. Die Spalten
   überlappen sich leicht, das erzeugt Tiefe statt Rasteroptik. */
const COLLAGE_AR = 1.25;          /* Höhe/Breite der Collage, 4:5 */
const K = 1 / COLLAGE_AR;         /* Breitenanteil → Höhenanteil */
const ROLE_WEIGHT = { base_top: 1.0, base_bottom: 1.45, base_full: 2.3,
                      layer: 1.45, bag: 0.85, shoes: 0.72, acc: 0.5 };
const LEFT_REF = 2.45, RIGHT_REF = 2.60;  /* Vollbesetzung, damit Teile nicht aufblähen */
const ACC_BOXES = [
  { x0: 0.04, x1: 0.36, y0: 0.02, y1: 0.15 },
  { x0: 0.04, x1: 0.32, y0: 0.80, y1: 0.93 }
];
const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

function packColumn(list, x0, x1, yTop, yBot, refW, z) {
  if (!list.length) return [];
  const totalW = list.reduce((s, it) => s + ROLE_WEIGHT[CATS[it.cat].role], 0);
  const full = yBot - yTop;
  const used = full * Math.min(1, totalW / refW);
  let y = yTop + (full - used) / 2;
  return list.map(it => {
    const h = used * (ROLE_WEIGHT[CATS[it.cat].role] / totalW);
    const box = { x0, x1, y0: y, y1: y + h, z };
    y += h;
    return { it, box };
  });
}
/* Seitenverhältnis erhalten und mittig in die Box legen */
function fitInBox(it, box, shrink = 0.98) {
  const bw = (box.x1 - box.x0) * shrink;
  const bh = (box.y1 - box.y0) * shrink;
  const ar = it.ar || 1.2;
  let fw = bw, fh = fw * ar * K;
  if (fh > bh) { fh = bh; fw = fh / (ar * K); }
  return { left: (box.x0 + box.x1) / 2 - fw / 2, top: (box.y0 + box.y1) / 2 - fh / 2,
           w: fw, h: fh, z: box.z };
}
function collageLayout(items) {
  const byRole = {};
  items.forEach(it => { const r = CATS[it.cat].role; (byRole[r] = byRole[r] || []).push(it); });
  const left = byRole.base_full ? byRole.base_full
    : [].concat(byRole.base_top || [], byRole.base_bottom || []);
  const right = [].concat(byRole.layer || [], byRole.bag || [], byRole.shoes || []);
  const placed = [
    ...packColumn(left, 0.05, 0.58, 0.13, 0.96, LEFT_REF, 1),
    ...packColumn(right, 0.43, 0.98, 0.04, 0.91, RIGHT_REF, 2)
  ].map(p => ({ it: p.it, r: fitInBox(p.it, p.box) }));
  (byRole.acc || []).slice(0, 2).forEach((it, i) => {
    placed.push({ it, r: fitInBox(it, Object.assign({ z: 3 }, ACC_BOXES[i])) });
  });
  return placed;
}
function collageHTML(items, opt = {}) {
  if (!items || !items.length) return '<p class="hint">Keine Teile für diese Collage.</p>';
  const pieces = collageLayout(items).map(p =>
    `<div class="cpiece" style="left:${pct(p.r.left)}; top:${pct(p.r.top)}; width:${pct(p.r.w)}; height:${pct(p.r.h)}; z-index:${p.r.z}">
       <img data-pic="${p.it.picId}" alt="${esc(p.it.name || CATS[p.it.cat].label)}"></div>`).join('');
  return `<div class="collage"${opt.onclick ? ` onclick="${opt.onclick}"` : ''}>${pieces}</div>`;
}

/* ================= Vorschlagslogik ================= */
const poolFor = season => DB.items.filter(it => !it.seasons || !it.seasons.length || it.seasons.includes(season));
const trendWorlds = () => new Set(DB.trends.flatMap(t => (t.colors || []).map(colorWorld))
  .filter(w => w !== 'neutral'));
/* Wärme bestimmen Basis und Jacke – Tasche und Kette sind dafür irrelevant */
const warmthOf = items => {
  const rel = items.filter(i => ['base_top','base_bottom','base_full','layer'].includes(CATS[i.cat].role));
  return avg(rel.map(i => i.warmth || 3));
};

function drawOutfit(pool, opts) {
  const byRole = {};
  pool.forEach(it => { const r = CATS[it.cat].role; (byRole[r] = byRole[r] || []).push(it); });
  const tops = byRole.base_top || [], bottoms = byRole.base_bottom || [],
        dresses = byRole.base_full || [], shoes = byRole.shoes || [],
        layers = byRole.layer || [], bags = byRole.bag || [], accs = byRole.acc || [];
  if (!shoes.length) return null;
  const canPair = tops.length && bottoms.length;
  const useDress = dresses.length && (!canPair || Math.random() < 0.22);
  if (!useDress && !canPair) return null;
  const base = useDress ? [pick(dresses)] : [pick(tops), pick(bottoms)];
  const out = base.concat([pick(shoes)]);
  const target = SEASON_WARMTH[opts.season];
  if (layers.length && warmthOf(base) < target + 0.4 && (target >= 3 || Math.random() < 0.35)) {
    out.push(pick(layers));
  }
  if (bags.length && Math.random() < 0.7) out.push(pick(bags));
  if (accs.length && Math.random() < 0.5) out.push(pick(accs));
  return out;
}
/* Harte Regel des Users: höchstens drei bunte Farbwelten je Outfit */
const validOutfit = items => outfitWorlds(items).length <= MAX_WORLDS;

function scoreOutfit(items, opts) {
  const worlds = outfitWorlds(items);
  const f = items.map(i => i.formality || 3);
  const tw = opts.trends;
  const hit = worlds.filter(w => tw.has(w)).length;
  let s = 100;
  s -= worlds.length * 5;                                  /* ruhiger schlägt bunt */
  s -= (Math.max(...f) - Math.min(...f)) * 9;              /* kein Stilbruch */
  s -= Math.abs(avg(f) - opts.formality) * 7;              /* Anlass treffen */
  s -= Math.abs(warmthOf(items) - SEASON_WARMTH[opts.season]) * 8;
  s += hit * 9;                                            /* liegt im Trend */
  return s;
}

function suggest(n = 12) {
  const pool = poolFor(UI.season);
  const opts = { season: UI.season, formality: UI.mood, trends: trendWorlds() };
  const blocked = blockedKeys();
  const cands = [], seen = new Set();
  for (let i = 0; i < 1400 && cands.length < 60; i++) {
    const o = drawOutfit(pool, opts);
    if (!o || !validOutfit(o)) continue;
    const key = outfitKey(o.map(x => x.id));
    if (seen.has(key) || blocked.has(key)) continue;
    seen.add(key);
    cands.push({ ids: o.map(x => x.id), score: scoreOutfit(o, opts) });
  }
  cands.sort((a, b) => b.score - a.score);
  /* Aus den besten mischen: gute Qualität, aber nicht jeden Tag dieselbe Reihenfolge */
  return shuffled(cands.slice(0, Math.max(n * 2, 20))).slice(0, n);
}
/* Nachfüllen, solange noch etwas Ungesehenes übrig ist */
function ensureQueue() {
  if (!UI.queue) UI.queue = [];
  if (UI.queue.length >= 3) return;
  const da = new Set(UI.queue.map(q => outfitKey(q.ids)));
  suggest(12).forEach(c => { if (!da.has(outfitKey(c.ids))) UI.queue.push(c); });
}

/* ================= Rendern ================= */
function render() {
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === UI.tab));
  const main = $('#main');
  main.innerHTML = UI.sorting ? renderSorter()
    : UI.builder ? renderBuilder()
    : UI.tab === 'today' ? renderToday()
    : UI.tab === 'closet' ? renderCloset()
    : UI.tab === 'outfits' ? renderOutfits()
    : UI.tab === 'trends' ? renderTrends()
    : renderData();
  $('#modal-root').innerHTML = renderModal();
  hydratePics();
  attachSwipe();
  if (UI.tab === 'data' && !UI.sorting && !UI.builder) showUsage();
  saveUI();
}

const seasonChips = (active, fn) => `<div class="chips">${SEASONS.map(s =>
  `<button class="chip ${active === s.key ? 'active' : ''}" onclick="${fn}('${s.key}')">${s.ico} ${s.label}</button>`).join('')}</div>`;

function renderToday() {
  ensureQueue();
  const moods = [[2, 'Leger'], [3, 'Normal'], [4, 'Schick']];
  const c = UI.queue[0];
  return `<div class="card">
    <h3>Jahreszeit</h3>
    ${seasonChips(UI.season, 'App.setSeason')}
    <h3>Anlass</h3>
    <div class="chips">${moods.map(([v, l]) =>
      `<button class="chip ${UI.mood === v ? 'active' : ''}" onclick="App.setMood(${v})">${l}</button>`).join('')}</div>
  </div>
  ${c ? swipeHTML(c) : `<div class="card"><h2>Für heute durch</h2>
      <p class="hint">Keine weiteren Kombinationen für ${esc(SEASONS.find(x => x.key === UI.season).label)}
      und diesen Anlass. Morgen kommen die „Not today"-Vorschläge wieder – oder du änderst oben die Auswahl.</p>
      ${(DB.tossed || []).length ? `<button class="btn block" onclick="App.resetTossed()">Verworfene wieder zulassen (${DB.tossed.length})</button>` : ''}
    </div>`}`;
}

function swipeHTML(c) {
  const items = c.ids.map(itemById).filter(Boolean);
  const worlds = outfitWorlds(items);
  return `<div class="swipe">
    <div class="swipe-card" id="card">
      <div class="stamp take">TAKE</div>
      <div class="stamp toss">TOSS</div>
      <div class="stamp skip">NOT TODAY</div>
      ${collageHTML(items)}
      <p class="small" style="margin:10px 0 6px">${items.map(it =>
        esc(it.name || CATS[it.cat].label)).join(' · ')}</p>
      <span class="worldtags">${worlds.length
        ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
        : '<span class="wtag">nur Neutral</span>'}</span>
    </div>
  </div>
  <div class="swipe-actions">
    <button class="act toss" onclick="App.decide('toss')" aria-label="Toss">✕<span>Toss</span></button>
    <button class="act skip" onclick="App.decide('skip')" aria-label="Not today">↷<span>Not today</span></button>
    <button class="act take" onclick="App.decide('take')" aria-label="Take">♥<span>Take</span></button>
  </div>
  <p class="small center">Nach rechts wischen für Take, nach links für Toss.</p>`;
}

/* --- Nachsortieren nach der Migration --- */
const SORT_OPTIONS = {
  top: ['top', 'knit', 'blouse'],
  pants: ['pants', 'skirt'],
  acc: ['acc', 'bag']
};
function renderSorter() {
  return UI.sorting === 'season' ? renderSeasonSorter() : renderCatSorter();
}

function renderSeasonSorter() {
  const todo = DB.items.filter(i => i.seasonsAuto);
  if (!todo.length) {
    return `<div class="card center">
      <h2>Fertig</h2>
      <p class="hint">Alle Jahreszeiten sind bestätigt.</p>
      <button class="btn primary block" onclick="App.stopSort()">Zurück zum Schrank</button>
    </div>`;
  }
  const it = todo[0];
  const gewaehlt = currentSeasonDraft(it);
  return `<div class="card">
    <h2>Jahreszeiten <span class="small">noch ${todo.length}</span></h2>
    <p class="hint" style="margin:0 0 10px">Bisher nur aus der Wärme geraten. Mehrfachauswahl –
    bestätige oder korrigiere.</p>
    <div class="checker"><img data-pic="${it.picId}" alt=""></div>
    <p class="center small" style="margin:8px 0 4px">${esc(it.name || '(ohne Namen)')}
      · ${esc(CATS[it.cat].label)} · ${esc(WARMTH_LBL[it.warmth || 3])}</p>
    <div class="chips" style="justify-content:center">
      ${SEASONS.map(s => `<button class="chip ${gewaehlt.includes(s.key) ? 'active' : ''}"
        onclick="App.seasonToggle('${s.key}')">${s.ico} ${s.label}</button>`).join('')}
    </div>
    <button class="btn primary block" style="margin-top:10px" onclick="App.seasonConfirm()"
      ${gewaehlt.length ? '' : 'disabled'}>Übernehmen und weiter</button>
    ${gewaehlt.length ? '' : '<p class="small center">Mindestens eine Jahreszeit wählen.</p>'}
    <div class="btn-row" style="margin-top:6px">
      <button class="btn small" onclick="App.seasonSkip()">Später</button>
      <button class="btn small" onclick="App.stopSort()">Abbrechen</button>
    </div>
  </div>`;
}
/* Entwurf je Teil, damit Antippen nicht sofort speichert */
function currentSeasonDraft(it) {
  if (UI.seasonDraftId !== it.id) {
    UI.seasonDraftId = it.id;
    UI.seasonDraft = [...(it.seasons || [])];
  }
  return UI.seasonDraft;
}

function renderCatSorter() {
  const todo = DB.items.filter(i => i.needsSort);
  if (!todo.length) {
    return `<div class="card center">
      <h2>Fertig</h2>
      <p class="hint">Alle Teile haben jetzt eine Unterkategorie.</p>
      <button class="btn primary block" onclick="App.stopSort()">Zurück zum Schrank</button>
    </div>`;
  }
  const it = todo[0];
  const opts = SORT_OPTIONS[it.cat] || CAT_ORDER;
  return `<div class="card">
    <h2>Nachsortieren <span class="small">noch ${todo.length}</span></h2>
    <p class="hint" style="margin:0 0 10px">Die alte Version kannte nur grobe Kategorien.
    Tippe an, was es ist – das Teil wandert direkt weiter.</p>
    <div class="checker"><img data-pic="${it.picId}" alt=""></div>
    <p class="center small" style="margin:8px 0 12px">${esc(it.name || '(ohne Namen)')}</p>
    ${opts.map(c => `<button class="btn block" style="margin-bottom:8px"
      onclick="App.sortInto('${it.id}','${c}')">${CATS[c].ico} ${CATS[c].label}</button>`).join('')}
    <button class="btn block" style="margin-bottom:8px" onclick="App.editItem('${it.id}')">
      ↗︎ Andere Kategorie …</button>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn small" onclick="App.sortSkip('${it.id}')">Später</button>
      <button class="btn small" onclick="App.stopSort()">Abbrechen</button>
    </div>
  </div>`;
}

function renderCloset() {
  const f = UI.closetFilter;
  const list = f === 'all' ? DB.items : DB.items.filter(i => i.cat === f);
  const sorted = [...list].sort((a, b) =>
    CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || (b.addedAt || 0) - (a.addedAt || 0));
  const counts = c => DB.items.filter(i => i.cat === c).length;
  const todo = needsSortCount();
  const stodo = seasonTodoCount();
  return `${stodo ? `<div class="card accent">
    <h2>${stodo} ${stodo === 1 ? 'Teil braucht' : 'Teile brauchen'} bestätigte Jahreszeiten</h2>
    <p class="hint" style="margin:0 0 10px">Die Jahreszeiten sind bisher nur aus der Wärme abgeleitet.
    Einmal durchgehen und bestätigen oder korrigieren – geht meist mit einem Tipp pro Teil.</p>
    <button class="btn primary block" onclick="App.startSort('season')">Jahreszeiten durchgehen</button>
  </div>` : ''}
  ${todo ? `<div class="card accent">
    <h2>${todo} ${todo === 1 ? 'Teil braucht' : 'Teile brauchen'} eine Unterkategorie</h2>
    <p class="hint" style="margin:0 0 10px">Aus der alten Version übernommen: Oberteile sind noch nicht in
    Tops, Strick und Blusen getrennt, Röcke stecken bei den Hosen, Taschen bei den Accessoires.</p>
    <button class="btn primary block" onclick="App.startSort()">Jetzt nachsortieren</button>
  </div>` : ''}
  <div class="card">
    <div class="btn-row">
      <button class="btn primary" onclick="App.addItem('camera')">📷 Foto machen</button>
      <button class="btn" onclick="App.addItem('library')">🖼️ Aus Fotos</button>
      <button class="btn" onclick="App.pasteItem()">📋 Einfügen</button>
    </div>
    <p class="small" style="margin:8px 0 0">Auf dem iPhone: Teil in der Fotos-App lange antippen →
    <b>Motiv kopieren</b> → hier auf <b>Einfügen</b>.</p>
  </div>
  <div class="card">
    <div class="chips">
      <button class="chip ${f === 'all' ? 'active' : ''}" onclick="App.filterCloset('all')">Alle ${DB.items.length}</button>
      ${CAT_ORDER.filter(c => counts(c)).map(c =>
        `<button class="chip ${f === c ? 'active' : ''}" onclick="App.filterCloset('${c}')">${CATS[c].ico} ${CATS[c].kurz} ${counts(c)}</button>`).join('')}
    </div>
    ${sorted.length ? `<div class="grid">${sorted.map(it => tileHTML(it)).join('')}</div>`
      : '<p class="hint">Noch nichts in dieser Kategorie.</p>'}
  </div>`;
}
function tileHTML(it, onclick) {
  /* Nur echte Strings zählen: bei map(tileHTML) käme sonst der Index als onclick an */
  const action = typeof onclick === 'string' ? onclick : `App.editItem('${it.id}')`;
  return `<div class="tile" onclick="${action}">
    ${it.needsSort ? '<span class="dot" title="Unterkategorie fehlt"></span>' : ''}
    <div class="thumbwrap"><img data-pic="${it.picId}" alt="${esc(it.name || '')}"></div>
    <div class="swatches">${(it.colors || []).map(c =>
      `<span class="sw" style="background:${esc(c)}"></span>`).join('')}</div>
    <div class="cap">${esc(it.name || CATS[it.cat].label)}</div>
  </div>`;
}

function renderOutfits() {
  const list = [...DB.outfits].reverse();
  return `<div class="card">
    <h2>Deine Outfits</h2>
    <p class="hint" style="margin:0 0 10px">Gemerkte Vorschläge aus <i>Heute</i> und Kombinationen,
    die du selbst zusammenstellst.</p>
    <button class="btn primary block" onclick="App.newOutfit()">Eigene Kombination bauen</button>
  </div>
  ${list.length ? list.map(savedOutfitHTML).join('')
    : `<div class="card"><p class="hint">Noch nichts gesammelt. Im Reiter <i>Heute</i> einen Vorschlag
       mit 👍 merken – oder oben selbst eine Kombination bauen.</p></div>`}`;
}

function savedOutfitHTML(o) {
  const items = o.ids.map(itemById).filter(Boolean);
  const fehlend = o.ids.length - items.length;
  const worlds = outfitWorlds(items);
  const seasons = outfitSeasons(items);
  return `<div class="card">
    ${items.length ? collageHTML(items)
      : '<p class="hint">Alle Teile dieses Outfits wurden inzwischen gelöscht.</p>'}
    ${o.name ? `<p style="margin:10px 0 0; font-weight:600">${esc(o.name)}</p>` : ''}
    <p class="small" style="margin:8px 0 8px">${items.map(it =>
      esc(it.name || CATS[it.cat].label)).join(' · ') || '–'}</p>
    ${fehlend ? `<p class="warn">${fehlend} ${fehlend === 1 ? 'Teil ist' : 'Teile sind'} nicht mehr im Schrank.</p>` : ''}
    <div class="btn-row" style="justify-content:space-between">
      <span class="worldtags">
        ${seasons.map(k => `<span class="wtag">${SEASONS.find(s => s.key === k).ico}</span>`).join('')}
        ${worlds.length ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
          : '<span class="wtag">nur Neutral</span>'}
      </span>
      <span class="btn-row">
        <button class="btn small" onclick="App.editOutfit('${o.id}')">Bearbeiten</button>
        <button class="btn small danger" onclick="App.delOutfit('${o.id}')">Löschen</button>
      </span>
    </div>
    <p class="small" style="margin:8px 0 0">${o.own ? 'Selbst gebaut' : 'Gemerkt'} · ${fmtDate(o.date)}</p>
  </div>`;
}

/* --- Baukasten für eigene Kombinationen --- */
function slotRowHTML(slot, ids) {
  const gewaehlt = ids.map(itemById).filter(it => it && slot.cats.includes(it.cat));
  const max = slot.max || 1;
  const label = !gewaehlt.length ? 'wählen' : gewaehlt.length < max ? '+ weiteres' : 'ändern';
  return `<div class="slot">
    <div class="slot-head">
      <span class="slot-label">${esc(slot.label)}</span>
      <button class="btn small" onclick="App.pickSlot('${slot.key}')">${label}</button>
    </div>
    ${gewaehlt.map(it => `<div class="slot-item" onclick="App.unpick('${it.id}')">
      <img data-pic="${it.picId}" alt=""><span>${esc(it.name || CATS[it.cat].label)}</span>
      <span class="x">✕</span></div>`).join('')}
  </div>`;
}

function renderBuilder() {
  const b = UI.builder;
  const items = b.ids.map(itemById).filter(Boolean);
  const worlds = outfitWorlds(items);
  const seasons = outfitSeasons(items);
  const zuBunt = worlds.length > MAX_WORLDS;
  return `<div class="card">
    <div class="sheet-head">
      <h2>${b.editId ? 'Outfit bearbeiten' : 'Eigene Kombination'}</h2>
      <button class="btn small" onclick="App.closeBuilder()">Abbrechen</button>
    </div>
    ${items.length ? collageHTML(items)
      : '<div class="collage empty"><span>Wähle unten die Teile aus</span></div>'}
    <div class="slots">${SLOTS.map(s => slotRowHTML(s, b.ids)).join('')}</div>
    <label class="fld" style="margin-top:14px">Name (optional)
      <input type="text" value="${esc(b.name || '')}" placeholder="z. B. Bürotag im Herbst"
        oninput="App.builderName(this.value)">
    </label>
    <div class="worldtags" style="margin-bottom:8px">
      ${seasons.length ? seasons.map(k =>
        `<span class="wtag">${SEASONS.find(s => s.key === k).ico} ${SEASONS.find(s => s.key === k).label}</span>`).join('')
        : '<span class="wtag">keine gemeinsame Jahreszeit</span>'}
      ${worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')}
    </div>
    ${zuBunt ? `<p class="warn">${worlds.length} bunte Farbwelten – über deiner Regel von ${MAX_WORLDS}.
      Speichern geht trotzdem, automatisch vorgeschlagen würde diese Kombination aber nicht.</p>` : ''}
    <button class="btn primary block" style="margin-top:6px" onclick="App.saveOutfit()"
      ${items.length < 2 ? 'disabled' : ''}>Speichern</button>
    ${items.length < 2 ? '<p class="small center">Mindestens zwei Teile auswählen.</p>' : ''}
  </div>`;
}

function renderTrends() {
  const t = DB.trends;
  const worlds = [...trendWorlds()];
  return `<div class="card">
    <h2>Trends</h2>
    <p class="hint">Pinterest lässt sich technisch nicht direkt anzapfen – die API braucht eine
    freigegebene Server-App, und Safari blockiert den direkten Zugriff. Der Weg, der funktioniert:</p>
    <ol class="hint" style="margin:8px 0 12px; padding-left:20px">
      <li>Pin in Pinterest öffnen → Teilen → <b>Bild sichern</b></li>
      <li>Hier unten auf <b>Aus Fotos</b> und den Pin auswählen</li>
    </ol>
    <div class="btn-row">
      <button class="btn primary" onclick="App.addTrend('library')">🖼️ Aus Fotos</button>
      <button class="btn" onclick="App.pasteTrend()">📋 Einfügen</button>
    </div>
  </div>
  ${worlds.length ? `<div class="card">
    <h3>Deine aktuellen Farbwelten</h3>
    <span class="worldtags">${worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')}</span>
    <p class="small" style="margin:10px 0 0">Outfits in diesen Welten werden bei den Vorschlägen bevorzugt.</p>
  </div>` : ''}
  <div class="card">
    <h3>Gesammelte Pins ${t.length ? '· ' + t.length : ''}</h3>
    ${t.length ? `<div class="grid">${t.map(x => `<div class="tile" onclick="App.delTrend('${x.id}')">
        <div class="thumbwrap plain"><img data-pic="${x.picId}" alt=""></div>
        <div class="swatches">${(x.colors || []).map(c => `<span class="sw" style="background:${esc(c)}"></span>`).join('')}</div>
      </div>`).join('')}</div>
      <p class="small" style="margin:10px 0 0">Zum Löschen antippen.</p>`
      : '<p class="hint">Noch keine Pins gesammelt.</p>'}
  </div>`;
}

function renderData() {
  const n = DB.items.length;
  return `<div class="card">
    <h2>Daten</h2>
    <p class="hint">Alles liegt auf diesem Gerät: ${n} ${n === 1 ? 'Teil' : 'Teile'}, ${DB.trends.length} Pins,
    ${DB.outfits.length} gemerkte Outfits.</p>
    <p class="small" id="usage">Speicher wird ermittelt …</p>
  </div>
  <div class="card">
    <h3>Sichern</h3>
    <div class="btn-row">
      <button class="btn primary" onclick="App.exportData(true)">Export mit Bildern</button>
      <button class="btn" onclick="App.exportData(false)">Nur Daten</button>
    </div>
    <h3>Zurückholen</h3>
    <button class="btn block" onclick="App.chooseImport()">Backup einlesen</button>
  </div>
  <div class="card">
    <h3>Bilder verkleinern</h3>
    <p class="hint" style="margin:0 0 10px">Rechnet alle gespeicherten Bilder neu und kleiner.
    Spart deutlich Platz, die Qualität reicht für die Collage weiterhin. Dauert bei vielen Teilen
    ein bis zwei Minuten.</p>
    <button class="btn block" onclick="App.optimize()">Jetzt verkleinern</button>
    <p class="small" id="optout"></p>
  </div>
  <div class="card">
    <h3>Aufräumen</h3>
    <button class="btn danger block" onclick="App.wipe()">Alles löschen</button>
  </div>`;
}

/* ================= Modal ================= */
function renderModal() {
  if (UI.modal === 'pick') return renderPicker();
  if (UI.modal !== 'item' || !UI.draft) return '';
  const d = UI.draft;
  const isNew = !itemById(d.id);
  const worlds = itemWorlds(d);
  return `<div class="overlay" onclick="App.cancelItem()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>${isNew ? 'Neues Teil' : 'Teil bearbeiten'}</h2>
      <button class="btn small" onclick="App.cancelItem()">Abbrechen</button>
    </div>
    <div class="checker"><img data-pic="${d.picId}" alt=""></div>
    ${d.cut ? '' : `<p class="warn" style="margin:8px 0 0">Hintergrund ist noch dran. Tipp: in der Fotos-App
      das Teil lange antippen, <b>Motiv kopieren</b>, dann hier <b>Einfügen</b>.</p>`}
    <h3>Kategorie</h3>
    <div class="chips">
      ${CAT_ORDER.map(c => `<button class="chip ${d.cat === c ? 'active' : ''}"
        onclick="App.draftSet('cat','${c}')">${CATS[c].ico} ${CATS[c].label}</button>`).join('')}
    </div>
    <label class="fld" style="margin-top:12px">Name (optional)
      <input type="text" value="${esc(d.name || '')}" placeholder="${esc(CATS[d.cat].label)}"
        oninput="App.draftSet('name', this.value, true)">
    </label>
    <h3>Jahreszeiten</h3>
    <p class="small" style="margin:0 0 6px">Mehrfachauswahl – ein Teil darf zu mehreren passen.</p>
    <div class="chips">
      ${SEASONS.map(s => `<button class="chip ${(d.seasons || []).includes(s.key) ? 'active' : ''}"
        onclick="App.draftSeason('${s.key}')">${s.ico} ${s.label}</button>`).join('')}
    </div>
    <label class="fld" style="margin-top:12px">Wärme
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
    <div class="swatches" style="justify-content:flex-start">
      ${(d.colors || []).map(c => `<span class="sw big" style="background:${esc(c)}"></span>`).join('')
        || '<span class="small">keine erkannt</span>'}
    </div>
    <span class="worldtags" style="margin-top:8px; display:inline-block">${worlds.length
      ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
      : '<span class="wtag">Neutral</span>'}</span>
    <button class="btn primary block" style="margin-top:14px" onclick="App.saveItem()">Speichern</button>
    ${isNew ? '' : '<button class="btn danger block" onclick="App.deleteItem()">Teil löschen</button>'}
  </div></div>`;
}

function renderPicker() {
  const slot = SLOTS.find(s => s.key === UI.picker);
  if (!slot) return '';
  const list = DB.items.filter(i => slot.cats.includes(i.cat))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return `<div class="overlay" onclick="App.closePick()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>${esc(slot.label)} wählen</h2>
      <button class="btn small" onclick="App.closePick()">Abbrechen</button>
    </div>
    ${list.length ? `<div class="grid">${list.map(it =>
        tileHTML(it, `App.choosePick(&#39;${it.id}&#39;)`)).join('')}</div>`
      : '<p class="hint">In dieser Kategorie ist noch nichts im Schrank.</p>'}
  </div></div>`;
}

/* Wischen: nur waagerecht, damit die Seite senkrecht scrollbar bleibt */
function attachSwipe() {
  const card = $('#card');
  if (!card) return;
  const SCHWELLE = 85;
  let sx = 0, sy = 0, dx = 0, dy = 0, zieht = false;
  const stamps = k => card.querySelector('.stamp.' + k);
  const zeige = () => {
    stamps('take').style.opacity = dx > 15 ? Math.min(1, (dx - 15) / 70) : 0;
    stamps('toss').style.opacity = dx < -15 ? Math.min(1, (-dx - 15) / 70) : 0;
  };
  card.addEventListener('pointerdown', e => {
    zieht = true; sx = e.clientX; sy = e.clientY; dx = dy = 0;
    card.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
  });
  card.addEventListener('pointermove', e => {
    if (!zieht) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dx) < 20) return;  /* senkrecht scrollen lassen */
    card.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx / 24}deg)`;
    zeige();
  });
  const ende = () => {
    if (!zieht) return;
    zieht = false;
    card.style.transition = 'transform .25s ease, opacity .25s ease';
    if (Math.abs(dx) > SCHWELLE) App.decide(dx > 0 ? 'take' : 'toss');
    else {
      card.style.transform = '';
      card.querySelectorAll('.stamp').forEach(s => s.style.opacity = 0);
    }
  };
  card.addEventListener('pointerup', ende);
  card.addEventListener('pointercancel', ende);
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

App.setTab = tab => { UI.tab = tab; UI.modal = null; UI.sorting = false; UI.builder = null; UI.picker = null; UI.queue = null;
UI.seasonDraft = null; UI.seasonDraftId = null; render(); };
App.filterCloset = c => { UI.closetFilter = c; render(); };
App.setSeason = s => { UI.season = s; UI.queue = null; render(); };
App.setMood = v => { UI.mood = v; UI.queue = null; render(); };

/* Take / Toss / Not today */
App.decide = what => {
  const c = UI.queue && UI.queue[0];
  if (!c) return;
  const key = outfitKey(c.ids);
  if (what === 'take') {
    if (!DB.outfits.some(o => outfitKey(o.ids) === key)) {
      DB.outfits.push({ id: uid(), date: todayISO(), ids: [...c.ids], liked: true });
    }
    toast('Gemerkt – liegt unter Outfits');
  } else if (what === 'toss') {
    DB.tossed = DB.tossed || [];
    if (!DB.tossed.includes(key)) DB.tossed.push(key);
  } else {
    DB.snoozed = DB.snoozed || {};
    DB.snoozed[key] = todayISO();       /* morgen wieder im Spiel */
  }
  save();
  UI.queue.shift();
  const card = $('#card');
  if (!card) return render();
  const x = what === 'take' ? 520 : what === 'toss' ? -520 : 0;
  const y = what === 'skip' ? 420 : 0;
  card.style.transition = 'transform .25s ease, opacity .25s ease';
  card.style.transform = `translate(${x}px, ${y}px) rotate(${x / 24}deg)`;
  card.style.opacity = '0';
  if (what === 'skip') card.querySelector('.stamp.skip').style.opacity = 1;
  setTimeout(render, 230);
};
App.resetTossed = () => {
  if (!confirm('Alle verworfenen Kombinationen wieder zulassen?')) return;
  DB.tossed = [];
  save();
  UI.queue = null;
  render();
};

/* --- Gemerkte Outfits und eigener Baukasten --- */
App.newOutfit = () => { UI.builder = { ids: [], name: '', editId: null }; render(); };
App.editOutfit = id => {
  const o = DB.outfits.find(x => x.id === id);
  if (!o) return;
  UI.builder = { ids: o.ids.filter(itemById), name: o.name || '', editId: o.id };
  render();
};
App.closeBuilder = () => { UI.builder = null; UI.picker = null; UI.queue = null;
UI.seasonDraft = null; UI.seasonDraftId = null; UI.modal = null; render(); };
/* Kein render(): sonst verliert das Textfeld beim Tippen den Fokus */
App.builderName = v => { if (UI.builder) UI.builder.name = v; };
App.pickSlot = key => { UI.picker = key; UI.modal = 'pick'; render(); };
App.closePick = () => { UI.picker = null; UI.modal = null; render(); };
App.choosePick = id => {
  const it = itemById(id);
  const slot = SLOTS.find(s => s.key === UI.picker);
  if (!it || !slot || !UI.builder) return;
  const b = UI.builder;
  const max = slot.max || 1;
  /* Ist der Slot voll, fliegt der älteste Eintrag raus */
  const imSlot = b.ids.map(itemById).filter(o => o && slot.cats.includes(o.cat) && o.id !== id);
  const behalten = imSlot.slice(Math.max(0, imSlot.length - (max - 1))).map(o => o.id);
  let ids = b.ids.filter(x => { const o = itemById(x); return o && !slot.cats.includes(o.cat); })
    .concat(behalten, [id]);
  /* Kleid und Oberteil/Unterteil schließen einander aus */
  const rolle = x => { const o = itemById(x); return o ? CATS[o.cat].role : null; };
  if (slot.key === 'base_full') ids = ids.filter(x => !['base_top', 'base_bottom'].includes(rolle(x)));
  else if (slot.key === 'base_top' || slot.key === 'base_bottom') ids = ids.filter(x => rolle(x) !== 'base_full');
  b.ids = ids;
  UI.picker = null; UI.modal = null;
  render();
};
App.unpick = id => {
  if (!UI.builder) return;
  UI.builder.ids = UI.builder.ids.filter(x => x !== id);
  render();
};
App.saveOutfit = () => {
  const b = UI.builder;
  if (!b) return;
  const items = b.ids.map(itemById).filter(Boolean);
  if (items.length < 2) return;
  if (b.editId) {
    const o = DB.outfits.find(x => x.id === b.editId);
    if (o) { o.ids = [...b.ids]; o.name = b.name || ''; }
  } else {
    if (DB.outfits.some(o => outfitKey(o.ids) === outfitKey(b.ids))) {
      toast('Diese Kombination hast du schon');
      return;
    }
    DB.outfits.push({ id: uid(), date: todayISO(), ids: [...b.ids],
      name: b.name || '', own: true, liked: true });
  }
  save();
  UI.builder = null; UI.tab = 'outfits';
  toast('Gespeichert');
  render();
};
App.delOutfit = id => {
  if (!confirm('Dieses Outfit aus der Liste entfernen?')) return;
  DB.outfits = DB.outfits.filter(o => o.id !== id);
  save();
  render();
};

/* --- Nachsortieren --- */
App.startSort = mode => {
  UI.sorting = mode || 'cat';
  UI.seasonDraft = null; UI.seasonDraftId = null;
  render();
};
App.stopSort = () => { UI.sorting = false; UI.seasonDraftId = null; render(); };
App.seasonToggle = key => {
  if (!UI.seasonDraft) return;
  UI.seasonDraft = UI.seasonDraft.includes(key)
    ? UI.seasonDraft.filter(s => s !== key) : UI.seasonDraft.concat([key]);
  render();
};
App.seasonConfirm = () => {
  const it = itemById(UI.seasonDraftId);
  if (!it || !UI.seasonDraft || !UI.seasonDraft.length) return;
  it.seasons = [...UI.seasonDraft];
  delete it.seasonsAuto;
  save();
  UI.seasonDraftId = null; UI.seasonDraft = null; UI.queue = null;
  render();
};
App.seasonSkip = () => {
  const it = itemById(UI.seasonDraftId);
  if (!it) return;
  DB.items = DB.items.filter(x => x.id !== it.id).concat([it]);
  save();
  UI.seasonDraftId = null; UI.seasonDraft = null;
  render();
};
App.sortInto = (id, cat) => {
  const it = itemById(id);
  if (!it) return;
  it.cat = cat;
  delete it.needsSort;
  save();
  UI.queue = null;
  render();
};
App.sortSkip = id => {
  const it = itemById(id);
  if (!it) return;
  /* ans Ende der Warteschlange, ohne die Markierung zu verlieren */
  DB.items = DB.items.filter(x => x.id !== id).concat([it]);
  save();
  render();
};

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
App.pasteItem = () => pasteImage(startDraftFrom);
async function pasteImage(handler) {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('unsupported');
    const items = await navigator.clipboard.read();
    for (const it of items) {
      const type = it.types.find(t => t.startsWith('image/'));
      if (type) { await handler(await it.getType(type)); return; }
    }
    toast('In der Zwischenablage ist kein Bild');
  } catch (e) {
    console.warn('Einfügen fehlgeschlagen', e);
    toast('Einfügen ging nicht – nimm „Aus Fotos"');
  }
}
async function startDraftFrom(blob) {
  toast('Bild wird vorbereitet …');
  try {
    const { blob: out, colors, cut, ar } = await prepItemImage(blob);
    const picId = uid();
    await picPut(picId, out);
    UI.draft = {
      id: uid(), picId, colors, cut, ar, cat: 'top', name: '',
      warmth: CATS.top.warmth, formality: 3, seasons: seasonsFromWarmth(CATS.top.warmth),
      addedAt: Date.now(), _newPic: true
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
  UI.draft.seasons = UI.draft.seasons || seasonsFromWarmth(UI.draft.warmth || 3);
  UI.modal = 'item';
  render();
};
App.draftSet = (key, val, quiet) => {
  const d = UI.draft;
  if (!d) return;
  if (key === 'cat' && d.cat !== val) {
    d.warmth = CATS[val].warmth;
    d.seasons = seasonsFromWarmth(d.warmth);
    d.seasonsAuto = true;        /* neu abgeleitet, also wieder ungeprüft */
    delete d.needsSort;
  }
  d[key] = val;
  if (!quiet) render();
};
App.draftSeason = key => {
  const d = UI.draft;
  if (!d) return;
  delete d.seasonsAuto;          /* vom User gesetzt, nicht mehr geraten */
  d.seasons = d.seasons || [];
  d.seasons = d.seasons.includes(key) ? d.seasons.filter(s => s !== key) : d.seasons.concat([key]);
  render();
};
/* Schieberegler dürfen nicht neu rendern – sonst verliert der Finger beim Ziehen das Element. */
App.draftSlide = (path, val) => {
  const d = UI.draft;
  if (!d) return;
  d[path] = val;
  const out = document.querySelector(`#modal-root .val[data-out="${path}"]`);
  if (out) out.textContent = path === 'warmth' ? WARMTH_LBL[val] : FORMAL_LBL[val];
};
App.saveItem = () => {
  const d = UI.draft;
  if (!d) return;
  delete d._newPic;
  if (!d.seasons || !d.seasons.length) d.seasons = seasonsFromWarmth(d.warmth);
  const ex = DB.items.findIndex(i => i.id === d.id);
  if (ex >= 0) DB.items[ex] = d; else DB.items.push(d);
  save();
  UI.modal = null; UI.draft = null; UI.queue = null;
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
  save();
  UI.modal = null; UI.draft = null; UI.queue = null;
  dropPicURL(d.picId); await picDel(d.picId);
  render();
};

/* --- Trends --- */
App.addTrend = () => { const i = $('#pick-trend'); i.value = ''; i.click(); };
App.trendFileChosen = async input => {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  await addTrendFrom(file);
};
App.pasteTrend = () => pasteImage(addTrendFrom);
async function addTrendFrom(blob) {
  toast('Pin wird gelesen …');
  try {
    /* Pins sind Screenshots: nicht freistellen, nur verkleinern und Palette ziehen */
    const url = URL.createObjectURL(blob);
    const img = await loadImg(url);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const k = Math.min(1, 620 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * k));
    cv.height = Math.max(1, Math.round(img.height * k));
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const colors = extractColors(ctx, cv.width, cv.height, 5);
    const picId = uid();
    await picPut(picId, await canvasToBlob(cv, 'image/jpeg', 0.8));
    DB.trends.push({ id: uid(), picId, colors, addedAt: Date.now() });
    save();
    UI.queue = null;
    document.querySelector('.toast')?.remove();
    toast('Pin übernommen');
    render();
  } catch (e) {
    console.error(e);
    toast('Der Pin konnte nicht gelesen werden');
  }
}
App.delTrend = async id => {
  const t = DB.trends.find(x => x.id === id);
  if (!t || !confirm('Diesen Pin entfernen?')) return;
  DB.trends = DB.trends.filter(x => x.id !== id);
  save();
  dropPicURL(t.picId); await picDel(t.picId);
  UI.queue = null;
  render();
};

/* --- Daten --- */
const allPicIds = () => DB.items.map(i => i.picId)
  .concat(DB.trends.map(t => t.picId)).filter(Boolean);

App.exportData = async withPics => {
  const out = { app: 'outfit', version: DB_VERSION, exported: todayISO(), db: DB, pics: {} };
  if (withPics) {
    for (const id of allPicIds()) {
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
    const incoming = migrate(data.db);
    const known = new Set(DB.items.map(i => i.id));
    let added = 0;
    for (const it of (incoming.items || [])) {
      if (known.has(it.id)) continue;
      DB.items.push(it); added++;
    }
    const knownT = new Set(DB.trends.map(t => t.id));
    for (const t of (incoming.trends || [])) if (!knownT.has(t.id)) DB.trends.push(t);
    for (const [id, du] of Object.entries(data.pics || {})) {
      if (!(await picGet(id).catch(() => null))) await picPut(id, dataURLtoBlob(du));
    }
    save();
    UI.queue = null;
    toast(`${added} ${added === 1 ? 'Teil' : 'Teile'} übernommen`);
    render();
  } catch (e) {
    console.error(e);
    toast('Datei konnte nicht gelesen werden');
  }
};

App.optimize = async () => {
  /* Element jedes Mal neu suchen: der Vorgang dauert lange und der Reiter kann wechseln */
  const say = txt => { const el = $('#optout'); if (el) el.textContent = txt; };
  const ids = allPicIds();
  say('0 von ' + ids.length + ' …');
  let before = 0, after = 0, done = 0;
  for (const id of ids) {
    const blob = await picGet(id).catch(() => null);
    if (!blob) continue;
    before += blob.size;
    try {
      const url = URL.createObjectURL(blob);
      const img = await loadImg(url);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      const k = Math.min(1, 760 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const hasAlpha = blob.type === 'image/png' || blob.type === 'image/webp';
      const out = await encode(cv, hasAlpha);
      if (out && out.size < blob.size) { await picPut(id, out); dropPicURL(id); after += out.size; }
      else after += blob.size;
    } catch (e) { after += blob.size; console.warn('Bild übersprungen', id, e); }
    done++;
    if (done % 5 === 0) say(`${done} von ${ids.length} …`);
  }
  const mb = v => (v / 1048576).toFixed(1);
  say(`Fertig: ${mb(before)} MB → ${mb(after)} MB`);
  toast(`Bilder verkleinert: ${mb(before)} → ${mb(after)} MB`);
  hydratePics();
  showUsage();
};

App.wipe = async () => {
  if (!confirm('Wirklich alle Teile, Pins und Outfits löschen?')) return;
  if (!confirm('Das lässt sich nicht rückgängig machen. Sicher?')) return;
  for (const id of allPicIds()) { dropPicURL(id); await picDel(id); }
  DB = { version: DB_VERSION, items: [], trends: [], outfits: [], tossed: [], snoozed: {}, prefs: {} };
  save();
  UI.queue = null; UI.sorting = false;
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
  (UI.tab === 'trends' ? addTrendFrom : startDraftFrom)(it.getAsFile());
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
