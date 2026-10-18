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
const pctSigned = v => (v > 0 ? '+' : '') + Math.round(v * 100);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffled = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);

/* ================= Icons =================
   Strichgrafiken statt Emoji: Emoji sehen auf jedem Gerät anders aus
   und verraten sofort die Bastel-App. */
const ICONS = {
  today:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  closet:  '<path d="M12 8.6V7a2.5 2.5 0 1 1 2.5-2.5"/><path d="M12 8.6 3.9 14.9a1.3 1.3 0 0 0 .8 2.3h14.6a1.3 1.3 0 0 0 .8-2.3L12 8.6Z"/>',
  outfits: '<path d="M18 21 12 17l-6 4V5.5A2.5 2.5 0 0 1 8.5 3h7A2.5 2.5 0 0 1 18 5.5V21Z"/>',
  trends:  '<path d="M12 17v5"/><path d="M8.6 2h6.8l-1 5.6 2.8 3.3V13H6.8v-2.1l2.8-3.3L8.6 2Z"/>',
  data:    '<rect x="3" y="4" width="18" height="4.5" rx="1.2"/><path d="M5.2 8.5V18a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2V8.5"/><path d="M10 12.3h4"/>',
  sprout:  '<path d="M12 21v-8.4"/><path d="M12 12.6C12 9 9.6 6.6 6 6.6c0 3.6 2.4 6 6 6Z"/><path d="M12 13.2c0-3 2-5 5-5 0 3-2 5-5 5Z"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  leaf:    '<path d="M4.2 19.8C4.2 11.5 9.6 5.4 20 4.4c0 10.8-5.9 15.2-11.9 15.2-2.2 0-3.9-.9-3.9-.9Z"/><path d="M8.8 16c2-3.2 5.2-5.7 9.2-7.3"/>',
  snow:    '<path d="M12 2.5v19M4.3 7.2l15.4 9.6M19.7 7.2 4.3 16.8"/><path d="M9.6 4.8 12 7.1l2.4-2.3M9.6 19.2 12 16.9l2.4 2.3"/>',
  sparkle: '<path d="M12 3.2 13.8 8.4 19 10.2 13.8 12 12 17.2 10.2 12 5 10.2 10.2 8.4 12 3.2Z"/><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>',
  x:       '<path d="M17.5 6.5 6.5 17.5M6.5 6.5l11 11"/>',
  again:   '<path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4"/><path d="M3.2 4v5h5"/>',
  heart:   '<path d="M12 20.3s-7.3-4.5-7.3-9.7a4.3 4.3 0 0 1 7.3-3 4.3 4.3 0 0 1 7.3 3c0 5.2-7.3 9.7-7.3 9.7Z"/>',
  lock:    '<rect x="4.8" y="10.8" width="14.4" height="9.7" rx="2.2"/><path d="M8.2 10.8V7.2a3.8 3.8 0 0 1 7.6 0v3.6"/>',
  unlock:  '<rect x="4.8" y="10.8" width="14.4" height="9.7" rx="2.2"/><path d="M8.2 10.8V7.2a3.8 3.8 0 0 1 6.9-2.2"/>',
  camera:  '<path d="M3.8 8.2h3.1L8.4 6h7.2l1.5 2.2h3.1a1 1 0 0 1 1 1v8.8a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.4" r="3.4"/>',
  image:   '<rect x="3" y="5" width="18" height="14" rx="2.4"/><circle cx="8.6" cy="10.1" r="1.4"/><path d="m3.6 17.2 4.8-4.3 3.9 3.4 2.5-2 5.2 4.6"/>',
  paste:   '<rect x="6" y="4" width="12" height="17" rx="2.2"/><path d="M9.2 4.2V3.2h5.6v1"/><path d="M9.4 10.2h5.2M9.4 14h3.6"/>',
  dice:    '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"/><circle cx="8.6" cy="8.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.15" fill="currentColor" stroke="none"/>',
  more:    '<path d="M7 17 17 7M9.4 7H17v7.6"/>',
  check:   '<path d="m5 12.8 4.6 4.6L19 7.4"/>',
  plus:    '<path d="M12 5.2v13.6M5.2 12h13.6"/>'
};
const ico = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ================= Kategorien ================= */
/* role steuert die Collage, weight die Größe darin, warmth den Vorgabewert */
const CATS = {
  top:    { label: 'Tops & Shirts',           kurz: 'Tops',    role: 'base_top',    warmth: 2 },
  knit:   { label: 'Pullover & Strickjacken', kurz: 'Strick',  role: 'base_top',    warmth: 4 },
  blouse: { label: 'Blusen',                  kurz: 'Blusen',  role: 'base_top',    warmth: 2 },
  pants:  { label: 'Hose',                    kurz: 'Hosen',   role: 'base_bottom', warmth: 3 },
  skirt:  { label: 'Rock',                    kurz: 'Röcke',   role: 'base_bottom', warmth: 2 },
  dress:  { label: 'Kleid',                   kurz: 'Kleider', role: 'base_full',   warmth: 2 },
  outer:  { label: 'Jacke & Mantel',          kurz: 'Jacken',  role: 'layer',       warmth: 4 },
  shoes:  { label: 'Schuhe',                  kurz: 'Schuhe',  role: 'shoes',       warmth: 2 },
  bag:    { label: 'Tasche',                  kurz: 'Taschen', role: 'bag',         warmth: 1 },
  acc:    { label: 'Accessoire',              kurz: 'Acc',     role: 'acc',         warmth: 1 }
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
/* Kategorien auf Outfit-Ebene, Reihenfolge = Sortierreihenfolge */
const OUTFIT_TAGS = [
  { key: 'fs',      label: 'Frühling/Sommer', ico: 'sun' },
  { key: 'hw',      label: 'Herbst/Winter',   ico: 'leaf' },
  { key: 'special', label: 'Special Occasion', ico: 'sparkle' }
];
const tagInfo = k => OUTFIT_TAGS.find(t => t.key === k) || OUTFIT_TAGS[0];
const TAG_ORDER = { fs: 1, hw: 2, special: 3 };

const fmtDate = iso => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}.${m}.${y}` : ''; };

const WARMTH_LBL = ['', 'sehr leicht', 'leicht', 'mittel', 'warm', 'sehr warm'];
const FORMAL_LBL = ['', 'sehr leger', 'leger', 'normal', 'schick', 'sehr schick'];

const SEASONS = [
  { key: 'fruehjahr', label: 'Frühjahr', ico: 'sprout' },
  { key: 'sommer',    label: 'Sommer',   ico: 'sun' },
  { key: 'herbst',    label: 'Herbst',   ico: 'leaf' },
  { key: 'winter',    label: 'Winter',   ico: 'snow' }
];
const seasonNow = () => ['winter','winter','fruehjahr','fruehjahr','fruehjahr','sommer',
  'sommer','sommer','herbst','herbst','herbst','winter'][new Date().getMonth()];
/* Zielwärme je Jahreszeit, gegen die Teile bewertet werden */
const SEASON_WARMTH = { fruehjahr: 2.6, sommer: 1.5, herbst: 3.4, winter: 4.4 };
/* Vorgabe beim Erfassen: aus der Wärme abgeleitet, vom User überschreibbar */
/* Wärme 3 schließt den Winter mit ein: eine Jeans ist Wärme 3 und trotzdem ein Winterteil.
   Ohne das bleibt der Winter-Pool ohne Unterteile und es entsteht kein einziger Vorschlag. */
const seasonsFromWarmth = w => w <= 1 ? ['sommer']
  : w === 2 ? ['fruehjahr', 'sommer', 'herbst']
  : w === 3 ? ['fruehjahr', 'herbst', 'winter']
  : w === 4 ? ['herbst', 'winter'] : ['winter'];

/* ================= Stilmerkmale =================
   Was die KI je Teil liefert. Die Zahlenwerte machen die Begriffe für die
   Engine rechenbar: „volumen" steuert die Silhouettenbalance, „schwer" die
   Materialmischung. */
const SILHOUETTEN = {
  cropped:   { label: 'Cropped',   volumen: 0 },
  schmal:    { label: 'Schmal',    volumen: 0 },
  tailliert: { label: 'Tailliert', volumen: 0 },
  gerade:    { label: 'Gerade',    volumen: 1 },
  fliessend: { label: 'Fließend',  volumen: 1 },
  weit:      { label: 'Weit',      volumen: 2 },
  oversized: { label: 'Oversized', volumen: 2 }
};
const MATERIALIEN = {
  baumwolle: { label: 'Baumwolle', schwer: 0 },
  leinen:    { label: 'Leinen',    schwer: 0 },
  seide:     { label: 'Seide',     schwer: 0 },
  viskose:   { label: 'Viskose',   schwer: 0 },
  jersey:    { label: 'Jersey',    schwer: 0 },
  synthetik: { label: 'Synthetik', schwer: 0 },
  denim:     { label: 'Denim',     schwer: 1 },
  strick:    { label: 'Strick',    schwer: 1 },
  wolle:     { label: 'Wolle',     schwer: 1 },
  leder:     { label: 'Leder',     schwer: 1 },
  wildleder: { label: 'Wildleder', schwer: 1 },
  daune:     { label: 'Daune',     schwer: 1 }
};
const MUSTER = {
  uni:        { label: 'Uni',        laut: 0 },
  meliert:    { label: 'Meliert',    laut: 0 },
  gestreift:  { label: 'Gestreift',  laut: 1 },
  kariert:    { label: 'Kariert',    laut: 1 },
  grafisch:   { label: 'Grafisch',   laut: 2 },
  gebluemt:   { label: 'Geblümt',    laut: 2 },
  animal:     { label: 'Animal',     laut: 2 }
};
const STILE = ['minimal', 'klassisch', 'casual', 'sportlich', 'elegant', 'boho', 'romantisch', 'edgy'];

/* Zugriff mit Rückfall, solange ein Teil noch nicht analysiert ist */
const ki = it => it.ki || null;
const volumenVon = it => {
  const s = ki(it) && SILHOUETTEN[ki(it).silhouette];
  return s ? s.volumen : 1;                 /* unbekannt = mittel, damit nichts blockiert */
};
const schwerVon = it => {
  const m = ki(it) && MATERIALIEN[ki(it).material];
  return m ? m.schwer : 0;
};
const lautVon = it => {
  const m = ki(it) && MUSTER[ki(it).muster];
  return m ? m.laut : 0;
};
const stileVon = it => (ki(it) && ki(it).stil) || [];
const istAnalysiert = it => !!(it.ki && it.ki.analysiert);

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
/* Vorschlag für die Outfit-Kategorie aus den Teilen */
function autoTag(items) {
  if (!items.length) return 'fs';
  const f = items.map(i => i.formality || 3);
  if (f.reduce((a, b) => a + b, 0) / f.length >= 4) return 'special';
  const s = outfitSeasons(items);
  const warm = s.includes('fruehjahr') || s.includes('sommer');
  const kalt = s.includes('herbst') || s.includes('winter');
  if (warm && !kalt) return 'fs';
  if (kalt && !warm) return 'hw';
  /* Teile tragen beide Hälften mit: über die Wärme entscheiden */
  const w = items.map(i => i.warmth || 3);
  return (w.reduce((a, b) => a + b, 0) / w.length) >= 2.8 ? 'hw' : 'fs';
}
const outfitTag = o => o.tag || autoTag(o.ids.map(itemById).filter(Boolean));

const outfitSeasons = items => !items.length ? []
  : SEASONS.map(s => s.key).filter(k => items.every(it => (it.seasons || []).includes(k)));

/* ================= Datenbank (localStorage) ================= */
const LS_KEY = 'outfit-v1';
const LS_UI = 'outfit-ui';
const DB_VERSION = 5;

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
  if (d.version === 3) {
    /* Ableitung hat sich geändert (Wärme 3 zählt jetzt auch zum Winter).
       Nur ungeprüfte Teile neu ableiten – bestätigte bleiben unangetastet. */
    (d.items || []).forEach(it => {
      if (it.seasonsAuto) it.seasons = seasonsFromWarmth(it.warmth || 3);
    });
    d.version = 4;
  }
  if (d.version === 4) {
    /* Kategorien auf Outfit-Ebene wurden von vier auf drei geändert.
       'uebergang' hat keine Entsprechung – Tag löschen, dann leitet outfitTag() neu ab. */
    const alt = { sommer: 'fs', winter: 'hw', special: 'special' };
    (d.outfits || []).forEach(o => {
      if (!o.tag) return;
      if (alt[o.tag]) o.tag = alt[o.tag]; else delete o.tag;
    });
    d.version = 5;
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

let UI = { tab: 'today', closetFilter: 'all', season: seasonNow(), mood: 3,
  outSort: 'neu', outFilter: null, outTagFilter: 'all', trendGewicht: 0.5 };
try { Object.assign(UI, JSON.parse(localStorage.getItem(LS_UI) || '{}')); } catch (e) {}
/* Gespeicherte Auswahl gegen die aktuellen Listen prüfen: ändert sich ein Schlüssel,
   zeigt die App sonst stillschweigend eine leere Liste an. */
if (UI.outTagFilter !== 'all' && !OUTFIT_TAGS.some(t => t.key === UI.outTagFilter)) UI.outTagFilter = 'all';
if (UI.closetFilter !== 'all' && !CATS[UI.closetFilter]) UI.closetFilter = 'all';
if (!SEASONS.some(s => s.key === UI.season)) UI.season = seasonNow();
if (!['neu', 'saison'].includes(UI.outSort)) UI.outSort = 'neu';
if (typeof UI.trendGewicht !== 'number') UI.trendGewicht = 0.5;

UI.modal = null; UI.draft = null; UI.sorting = false;
UI.builder = null; UI.picker = null; UI.queue = null; UI.detail = null;
UI.studio = null;
UI.seasonDraft = null; UI.seasonDraftId = null;
function saveUI() {
  localStorage.setItem(LS_UI, JSON.stringify({ tab: UI.tab, closetFilter: UI.closetFilter,
    season: UI.season, mood: UI.mood, outSort: UI.outSort, outTagFilter: UI.outTagFilter,
    trendGewicht: UI.trendGewicht }));
}
const itemById = id => DB.items.find(i => i.id === id);
const needsSortCount = () => DB.items.filter(i => i.needsSort).length;
/* Teile, die in noch keiner gemerkten Kombination vorkommen – pro Render einmal berechnet */
let _usedIds = null;
const istUngenutzt = id => {
  if (!_usedIds) _usedIds = new Set((DB.outfits || []).flatMap(o => o.ids));
  return !_usedIds.has(id);
};

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

async function prepItemImage(src, max = 760, schonFertig) {
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

  if (schonFertig) max = Math.max(max, 900);   /* Studio hat schon zugeschnitten */
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


/* ================= Studio =================
   Macht aus einem Handyfoto ein Produktbild: Hintergrund weg,
   Weißabgleich über die Hintergrundfläche, Tonwerte auf das Teil
   gezogen, gleichmäßiger Rand. Alles im Browser, ohne Modell. */
const STUDIO_WORK = 1400;      /* Auflösung beim Übernehmen */
const STUDIO_PREVIEW = 480;    /* Auflösung beim Schieben der Regler */

function canvasFrom(img, max) {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

/* Wahrnehmungsnähere Farbdistanz als reines RGB, trotzdem billig */
function colDist2(r1, g1, b1, r2, g2, b2) {
  const rm = (r1 + r2) * 0.5;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

/* Die häufigsten Randfarben – grobe Histogramm-Eimer, Mittel je Eimer */
function borderRefs(d, w, h) {
  const eimer = new Map();
  const step = Math.max(1, Math.round((w + h) / 400));
  const add = i => {
    const o = i * 4;
    if (d[o + 3] < 128) return;
    const k = (d[o] >> 5) * 64 + (d[o + 1] >> 5) * 8 + (d[o + 2] >> 5);
    let b = eimer.get(k);
    if (!b) { b = { n: 0, r: 0, g: 0, bl: 0 }; eimer.set(k, b); }
    b.n++; b.r += d[o]; b.g += d[o + 1]; b.bl += d[o + 2];
  };
  for (let x = 0; x < w; x += step) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y += step) { add(y * w); add(y * w + w - 1); }
  return [...eimer.values()].sort((a, b) => b.n - a.n).slice(0, 4)
    .map(b => [b.r / b.n, b.g / b.n, b.bl / b.n]);
}

/* ---------- Freistellen per Segmentierungsmodell ----------
   u2netp (Apache 2.0) über onnxruntime-web, beides im Ordner ki/ und damit
   gleiche Herkunft, offline-fähig und später in der nativen App mitlieferbar.
   Das Modell berechnet nur eine Maske – die Pixel des Kleidungsstücks
   bleiben unangetastet. Ein generatives Modell würde das Teil neu zeichnen. */
const KI_N = 320;
let kiSessionP = null;

function kiVerfuegbar() { return typeof WebAssembly === 'object'; }

function ladeSkript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('ort.min.js fehlt'));
    document.head.appendChild(s);
  });
}

function kiSession() {
  if (kiSessionP) return kiSessionP;
  kiSessionP = (async () => {
    if (!window.ort) await ladeSkript('ki/ort.min.js');
    /* Absolut, nicht relativ: onnxruntime importiert den Loader dynamisch,
       und ein bloßes „ki/“ ist als Modulbezeichner ungültig. */
    ort.env.wasm.wasmPaths = new URL('ki/', location.href).href;
    /* Mehrere Kerne gehen nur mit Cross-Origin-Isolation (COOP/COEP).
       Die liefert Cloudflare Pages über _headers; GitHub Pages kann das nicht. */
    ort.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
    ort.env.logLevel = 'error';
    return ort.InferenceSession.create('ki/u2netp.onnx', { executionProviders: ['wasm'] });
  })().catch(e => { kiSessionP = null; throw e; });
  return kiSessionP;
}

/* Liefert die Maske als Graustufen-Canvas in Modellauflösung.
   Von dort lässt sie sich auf jede Zielgröße weich hochskalieren. */
async function kiMaske(quelle) {
  const s = await kiSession();
  const cv = document.createElement('canvas');
  cv.width = KI_N; cv.height = KI_N;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(quelle, 0, 0, KI_N, KI_N);
  const d = c.getImageData(0, 0, KI_N, KI_N).data;

  const n = KI_N * KI_N;
  const f = new Float32Array(3 * n);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < n; i++) {
    f[i]         = (d[i * 4]     / 255 - mean[0]) / std[0];
    f[n + i]     = (d[i * 4 + 1] / 255 - mean[1]) / std[1];
    f[2 * n + i] = (d[i * 4 + 2] / 255 - mean[2]) / std[2];
  }
  const ergebnis = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', f, [1, 3, KI_N, KI_N]) });
  const o = ergebnis[s.outputNames[0]].data;

  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < n; i++) { if (o[i] < mn) mn = o[i]; if (o[i] > mx) mx = o[i]; }
  const spanne = Math.max(1e-6, mx - mn);

  const mcv = document.createElement('canvas');
  mcv.width = KI_N; mcv.height = KI_N;
  const mctx = mcv.getContext('2d');
  const bild = mctx.createImageData(KI_N, KI_N);
  for (let i = 0; i < n; i++) {
    const v = ((o[i] - mn) / spanne) * 255;
    bild.data[i * 4] = bild.data[i * 4 + 1] = bild.data[i * 4 + 2] = v;
    bild.data[i * 4 + 3] = 255;
  }
  mctx.putImageData(bild, 0, 0);
  return mcv;
}

/* Maske auf Zielgröße bringen und mit der gewählten Härte in Alpha wandeln */
function maskeZuAlpha(maskCv, w, h, haerte) {
  const up = document.createElement('canvas');
  up.width = w; up.height = h;
  const uc = up.getContext('2d', { willReadFrequently: true });
  uc.imageSmoothingEnabled = true;
  uc.imageSmoothingQuality = 'high';
  uc.drawImage(maskCv, 0, 0, w, h);
  const d = uc.getImageData(0, 0, w, h).data;
  const alpha = new Uint8ClampedArray(w * h);
  const steil = 1.4 + haerte * 5.5;
  for (let i = 0; i < w * h; i++) {
    alpha[i] = clamp((d[i * 4] - 128) * steil + 128, 0, 255);
  }
  return alpha;
}

/* Kantenstärke je Pixel. Entscheidend fürs Freistellen: ein Lichtverlauf auf
   dem Untergrund ist weich, der Rand eines Kleidungsstücks ist ein harter Sprung.
   Ohne das läuft die Füllung bei dunkler Kleidung auf dunklem Grund einfach durch. */
function edgeMap(d, w, h) {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    lum[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  }
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + w] - lum[i - w];
      e[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return e;
}

/* Flutfüllung vom Rand. Drei Schranken: lokale Farbtreue (verträgt Verläufe),
   Kantensperre (hält am Kleidungsstück an) und ein Abgleich mit den Randfarben. */
function floodBackground(d, w, h, tol) {
  const n = w * h;
  const bg = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const refs = borderRefs(d, w, h);
  const edge = edgeMap(d, w, h);
  const lokal = 50 + tol * 520;
  const kante = 14 + tol * 26;
  const global = 1200 + tol * 42000;
  const nahRef = (r, g, b) => {
    let m = Infinity;
    for (let i = 0; i < refs.length; i++) {
      const v = colDist2(r, g, b, refs[i][0], refs[i][1], refs[i][2]);
      if (v < m) m = v;
    }
    return m;
  };
  const push = i => {
    if (bg[i]) return;
    const o = i * 4;
    if (nahRef(d[o], d[o + 1], d[o + 2]) > global) return;
    bg[i] = 1; stack[sp++] = i;
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  while (sp > 0) {
    const i = stack[--sp];
    const o = i * 4, x = i % w, y = (i / w) | 0;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const nach = (j) => {
      if (bg[j]) return;
      if (edge[j] > kante) return;                 /* harte Kante: hier ist Schluss */
      const p = j * 4;
      if (colDist2(r, g, b, d[p], d[p + 1], d[p + 2]) > lokal) return;
      if (nahRef(d[p], d[p + 1], d[p + 2]) > global) return;
      bg[j] = 1; stack[sp++] = j;
    };
    if (x > 0) nach(i - 1);
    if (x < w - 1) nach(i + 1);
    if (y > 0) nach(i - w);
    if (y < h - 1) nach(i + w);
  }
  return bg;
}

/* Weiche Kante: Alpha zweimal mitteln, sonst sieht der Rand ausgestanzt aus */
function featherAlpha(alpha, w, h, runden) {
  let a = alpha;
  for (let r = 0; r < runden; r++) {
    const b = new Uint8ClampedArray(a.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let s = a[i], c = 1;
        if (x > 0) { s += a[i - 1]; c++; }
        if (x < w - 1) { s += a[i + 1]; c++; }
        if (y > 0) { s += a[i - w]; c++; }
        if (y < h - 1) { s += a[i + w]; c++; }
        b[i] = s / c;
      }
    }
    a = b;
  }
  return a;
}

/* Schatten auf dem Untergrund sehen für ein Segmentierungsmodell wie ein Teil
   des Objekts aus. Ein Schatten ist aber nichts anderes als der Untergrund mit
   weniger Licht – also gleiche Farbrichtung, geringere Helligkeit. Genau danach
   wird gesucht, und zwar nur von außen nach innen, damit dunkle Stoffpartien
   im Inneren unangetastet bleiben. */
function schattenWeg(d, w, h, alpha, bg) {
  const bl = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
  if (bl < 30) return alpha;
  const n = w * h;
  const stack = new Int32Array(n);
  const tiefe = new Int32Array(n);
  let sp = 0;
  const besucht = new Uint8Array(n);
  /* Nur ein schmaler Saum. Ohne diese Grenze frisst sich der Lauf bei hellen
     Teilen auf hellem Untergrund in das Kleidungsstück hinein – gemessen am
     Strickpullover, dem dadurch der halbe Ärmel fehlte. */
  const MAX_TIEFE = Math.max(6, Math.round(Math.max(w, h) * 0.02));
  const istSchatten = i => {
    const o = i * 4;
    const l = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
    if (l > bl * 0.88 || l < 8) return false;   /* deutlich dunkler, nicht nur etwas */
    const f = l / bl;                           /* Untergrund auf diese Helligkeit gedimmt */
    return colDist2(d[o], d[o + 1], d[o + 2], bg.r * f, bg.g * f, bg.b * f) < 1500;
  };
  /* Startpunkte: Pixel am Rand der Maske */
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (alpha[i] < 40 || besucht[i]) continue;
      const randnah = (x === 0 || y === 0 || x === w - 1 || y === h - 1
        || alpha[i - 1] < 40 || alpha[i + 1] < 40 || alpha[i - w] < 40 || alpha[i + w] < 40);
      if (randnah && istSchatten(i)) { besucht[i] = 1; tiefe[i] = 0; stack[sp++] = i; }
    }
  }
  while (sp > 0) {
    const i = stack[--sp];
    alpha[i] = 0;
    if (tiefe[i] >= MAX_TIEFE) continue;
    const x = i % w, y = (i / w) | 0;
    const nach = j => {
      if (besucht[j] || alpha[j] < 40) return;
      if (!istSchatten(j)) return;
      besucht[j] = 1; tiefe[j] = tiefe[i] + 1; stack[sp++] = j;
    };
    if (x > 0) nach(i - 1);
    if (x < w - 1) nach(i + 1);
    if (y > 0) nach(i - w);
    if (y < h - 1) nach(i + w);
  }
  return alpha;
}

/* Belichtung – und bewusst *kein* Weißabgleich.

   Ein Weißabgleich über die Hintergrundfläche war eingebaut und wurde wieder
   entfernt: er unterstellt, der Untergrund sei neutral. Ein cremefarbenes Laken
   oder ein Holzboden ist das nicht, und ihn auf Grau zu zwingen verdreht das
   Kleidungsstück mit. Gemessen am Originalfoto kippte warmes Kunstlicht dadurch
   ins Blaue; ohne Weißabgleich blieb der Farbton über alle Lichtsituationen
   stabil bei 32–38° gegenüber 36° im Original.

   Die Helligkeit wird dagegen als gemeinsamer Faktor auf alle drei Kanäle
   angewendet. Eine Kurve je Kanal würde den Farbton verdrehen. */
function studioTone(d, w, h, alpha, belichtung) {
  const n = w * h;
  let sl = 0, sn = 0;
  for (let i = 0; i < n; i++) {
    if (alpha[i] < 200) continue;
    const o = i * 4;
    sl += 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
    sn++;
  }
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    hist[clamp((0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) | 0, 0, 255)]++;
  }
  let p99 = 255, acc = 0;
  const ziel = n * 0.98;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= ziel) { p99 = v; break; } }
  let auto = clamp(222 / Math.max(24, p99), 0.8, 1.9);

  /* Das Teil darf nicht ausbleichen. Am Originalfoto gemessen liegt ein helles
     Kleidungsstück bei rund 177 – darüber wird zurückgenommen. Bei dunklen
     Teilen greift die Grenze nie. */
  if (sn > 500) {
    const mittel = sl / sn;
    const OBERGRENZE = 181;
    if (mittel * auto > OBERGRENZE) auto = Math.max(0.85, OBERGRENZE / Math.max(1, mittel));
  }
  const m = auto * (1 + belichtung * 0.4);
  return { gr: m, gg: m, gb: m };
}

/* Ein Durchlauf: Maske, Farbe, Zuschnitt, Rand. */
function studioRender(quelle, opts) {
  const w = quelle.width, h = quelle.height;
  const ctx = quelle.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  let alpha;
  if (opts.maskCv) {
    alpha = maskeZuAlpha(opts.maskCv, w, h, opts.tol);
  } else if (opts.freistellen) {
    const bg = floodBackground(d, w, h, opts.tol);
    alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = bg[i] ? 0 : 255;
    alpha = featherAlpha(alpha, w, h, 2);
  } else {
    alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = d[i * 4 + 3];
  }

  if (opts.schatten && (opts.maskCv || opts.freistellen)) {
    let br = 0, bg_ = 0, bb = 0, bn = 0;
    for (let i = 0; i < w * h; i++) {
      if (alpha[i] >= 40) continue;
      const o = i * 4; br += d[o]; bg_ += d[o + 1]; bb += d[o + 2]; bn++;
    }
    if (bn > 500) alpha = schattenWeg(d, w, h, alpha, { r: br / bn, g: bg_ / bn, b: bb / bn });
  }

  const ton = opts.licht ? studioTone(d, w, h, alpha, opts.belichtung)
                        : { gr: 1, gg: 1, gb: 1 };
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    d[o]     = clamp(d[o]     * ton.gr, 0, 255);
    d[o + 1] = clamp(d[o + 1] * ton.gg, 0, 255);
    d[o + 2] = clamp(d[o + 2] * ton.gb, 0, 255);
    d[o + 3] = alpha[i];
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').putImageData(img, 0, 0);

  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const rand = Math.round(Math.max(bw, bh) * 0.05);
  const out = document.createElement('canvas');
  out.width = bw + rand * 2; out.height = bh + rand * 2;
  out.getContext('2d').drawImage(tmp, minX, minY, bw, bh, rand, rand, bw, bh);
  return out;
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
/* Accessoires sitzen waagerecht mittig – erstes oben, zweites unten */
const ACC_BOXES = [
  { x0: 0.33, x1: 0.67, y0: 0.01, y1: 0.15 },
  { x0: 0.35, x1: 0.65, y0: 0.85, y1: 0.99 }
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
  const sticker = opt.tag
    ? `<span class="osticker">${ico(tagInfo(opt.tag).ico)}${opt.tagLabel ? esc(tagInfo(opt.tag).label) : ''}</span>`
    : '';
  return `<div class="collage${opt.klein ? ' klein' : ''}"${opt.onclick ? ` onclick="${opt.onclick}"` : ''}>${pieces}${sticker}</div>`;
}

/* ================= Vorschlagslogik ================= */
/* Jahreszeit ist eine harte Bedingung. Teile ohne gepflegte Angabe werden aus der
   Wärme abgeleitet, damit sie nicht stillschweigend in jeder Jahreszeit auftauchen. */
const itemSeasons = it => (it.seasons && it.seasons.length) ? it.seasons : seasonsFromWarmth(it.warmth || 3);
const poolFor = season => DB.items.filter(it => itemSeasons(it).includes(season));
const trendWorlds = () => new Set(DB.trends.flatMap(t => (t.colors || []).map(colorWorld))
  .filter(w => w !== 'neutral'));
/* Wärme: Schuhe zählen mit – sonst landen Sandalen unter dem Wollmantel */
const WARM_ROLES = ['base_top', 'base_bottom', 'base_full', 'layer', 'shoes'];
const warmthOf = items => {
  const rel = items.filter(i => WARM_ROLES.includes(CATS[i.cat].role));
  return avg(rel.map(i => i.warmth || 3));
};

const MAX_FORMAL_SPREAD = 2;
const WARMTH_TOLERANZ = 1.6;
/* Kein tragendes Teil darf grob aus der Jahreszeit fallen. Jacken dürfen wärmer sein,
   das ist ihre Aufgabe – nur zu dünn dürfen sie nicht sein. */
function warmthFits(items, season) {
  const t = SEASON_WARMTH[season];
  return items.every(it => {
    const role = CATS[it.cat].role;
    if (role === 'bag' || role === 'acc') return true;
    const w = it.warmth || 3;
    if (role === 'layer') return w >= t - 0.6;
    return Math.abs(w - t) <= WARMTH_TOLERANZ;
  });
}
const formalityFits = items => {
  const f = items.map(i => i.formality || 3);
  return Math.max(...f) - Math.min(...f) <= MAX_FORMAL_SPREAD;
};

/* locked: Teile, die gesetzt bleiben; der Rest wird darum herum gezogen. */
function drawOutfit(pool, opts, locked) {
  locked = locked || [];
  const byRole = {};
  pool.forEach(it => { const r = CATS[it.cat].role; (byRole[r] = byRole[r] || []).push(it); });
  const frei = r => (byRole[r] || []).filter(it => !locked.some(l => l.id === it.id));
  const hat = r => locked.some(it => CATS[it.cat].role === r);
  const out = [...locked];

  if (!hat('base_full') && !(hat('base_top') && hat('base_bottom'))) {
    if (hat('base_top')) {
      const b = frei('base_bottom'); if (!b.length) return null; out.push(pick(b));
    } else if (hat('base_bottom')) {
      const t = frei('base_top'); if (!t.length) return null; out.push(pick(t));
    } else {
      const tops = frei('base_top'), bottoms = frei('base_bottom'), dresses = frei('base_full');
      const canPair = tops.length && bottoms.length;
      const useDress = dresses.length && (!canPair || Math.random() < 0.22);
      if (useDress) out.push(pick(dresses));
      else if (canPair) { out.push(pick(tops), pick(bottoms)); }
      else return null;
    }
  }
  if (!hat('shoes')) {
    const s = frei('shoes'); if (!s.length) return null; out.push(pick(s));
  }
  const target = SEASON_WARMTH[opts.season];
  if (!hat('layer')) {
    const l = frei('layer');
    const basis = out.filter(i => ['base_top', 'base_bottom', 'base_full'].includes(CATS[i.cat].role));
    if (l.length && avg(basis.map(i => i.warmth || 3)) < target + 0.4 &&
        (target >= 3 || Math.random() < 0.35)) out.push(pick(l));
  }
  if (!hat('bag')) { const g = frei('bag'); if (g.length && Math.random() < 0.7) out.push(pick(g)); }
  if (!hat('acc')) { const c = frei('acc'); if (c.length && Math.random() < 0.5) out.push(pick(c)); }
  return out;
}

/* Silhouettenbalance: oben und unten nicht gleichzeitig viel Volumen.
   Oversized-Pullover zu weiter Hose ist der klassische Fehlgriff.
   Noch nicht analysierte Teile zählen als mittel und blockieren damit nichts. */
function volumenPasst(items) {
  const oben = items.find(i => CATS[i.cat].role === 'base_top');
  const unten = items.find(i => CATS[i.cat].role === 'base_bottom');
  if (!oben || !unten) return true;
  return volumenVon(oben) + volumenVon(unten) <= 3;
}

/* Harte Regeln: Farbwelten, Stilbruch, Jahreszeit, Silhouette */
function validOutfit(items, season) {
  if (outfitWorlds(items).length > MAX_WORLDS) return false;
  if (!formalityFits(items)) return false;
  if (season && !warmthFits(items, season)) return false;
  if (!volumenPasst(items)) return false;
  return true;
}

function scoreOutfit(items, opts) {
  const worlds = outfitWorlds(items);
  const f = items.map(i => i.formality || 3);
  const hit = worlds.filter(w => opts.trends.has(w)).length;
  let s = 100;
  s -= worlds.length * 5;
  s -= (Math.max(...f) - Math.min(...f)) * 9;
  s -= Math.abs(avg(f) - opts.formality) * 7;
  s -= Math.abs(warmthOf(items) - SEASON_WARMTH[opts.season]) * 10;
  /* Teile, die zur Jahreszeit exakt passen statt nur knapp zu bestehen */
  const passgenau = items.filter(i => itemSeasons(i).includes(opts.season)).length / items.length;
  s += passgenau * 6;
  s += hit * 9;

  /* --- Stilurteil aus der Teil-Analyse. Wirkt nur, soweit Teile analysiert sind. --- */

  /* Höchstens ein lautes Muster im Outfit */
  const laute = items.filter(i => lautVon(i) >= 1).length;
  if (laute > 1) s -= (laute - 1) * 15;

  /* Nicht zu viel schweres Material übereinander */
  const schwere = items.filter(schwerVon).length;
  if (schwere > 2) s -= (schwere - 2) * 9;

  /* Silhouette: leichter Bonus für bewussten Kontrast (weit oben, schmal unten) */
  const oben = items.find(i => CATS[i.cat].role === 'base_top');
  const unten = items.find(i => CATS[i.cat].role === 'base_bottom');
  if (oben && unten && istAnalysiert(oben) && istAnalysiert(unten)) {
    const diff = Math.abs(volumenVon(oben) - volumenVon(unten));
    s += diff === 2 ? 8 : diff === 1 ? 4 : 0;
  }

  /* Stilkohärenz: wie stark teilen die Teile dieselbe Handschrift? */
  const analysiert = items.filter(istAnalysiert);
  if (analysiert.length >= 2) {
    const zaehler = {};
    analysiert.forEach(i => stileVon(i).forEach(t => { zaehler[t] = (zaehler[t] || 0) + 1; }));
    const werte = Object.values(zaehler);
    const beste = werte.length ? Math.max(...werte) : 0;
    s += (beste / analysiert.length) * 15;
    /* Stilprofil aus den Pins. Das Gewicht regelt der Nutzer:
       0 = nur mein eigener Stil, 1 = ganz auf den Trend. */
    const p = opts.profil;
    if (p) {
      const g = opts.trendGewicht == null ? 0.5 : opts.trendGewicht;
      const anteil = (liste, feld) => {
        if (!liste || !liste.length) return 0;
        const t = analysiert.filter(i => {
          const v = feld === 'stil' ? stileVon(i) : [ki(i) && ki(i)[feld]];
          return v.some(x => x && liste.includes(x));
        }).length;
        return t / analysiert.length;
      };
      const bonus = anteil(p.stil, 'stil') * 28
                  + anteil(p.silhouetten, 'silhouette') * 16
                  + anteil(p.materialien, 'material') * 12;
      s += bonus * g;
    }
  }
  return s;
}

/* Sagt, welche Rolle fehlt, damit der Leerzustand nicht "alles gesehen" behauptet */
function poolLuecke(season) {
  const pool = poolFor(season);
  const hat = r => pool.some(i => CATS[i.cat].role === r);
  if (!hat('shoes')) return 'Schuhe';
  if (!hat('base_full') && !(hat('base_top') && hat('base_bottom'))) {
    if (!hat('base_top')) return 'Oberteile';
    if (!hat('base_bottom')) return 'Unterteile oder Kleider';
  }
  return null;
}

/* Verhindert, dass dasselbe Teil in fast jedem Vorschlag auftaucht */
function diversify(cands, n, vorbelegt) {
  const ABSTAND = 3;
  const out = [];
  const zuletzt = new Map();
  (vorbelegt || []).forEach((c, i) => c.ids.forEach(id => zuletzt.set(id, i - (vorbelegt.length))));
  for (const c of cands) {
    if (out.length >= n) break;
    if (c.ids.some(id => zuletzt.has(id) && out.length - zuletzt.get(id) < ABSTAND)) continue;
    c.ids.forEach(id => zuletzt.set(id, out.length));
    out.push(c);
  }
  for (const c of cands) { if (out.length >= n) break; if (!out.includes(c)) out.push(c); }
  return out;
}

function suggest(n = 12, vorbelegt) {
  const pool = poolFor(UI.season);
  const opts = { season: UI.season, formality: UI.mood, trends: trendWorlds(), profil: DB.profil || null, trendGewicht: UI.trendGewicht };
  const blocked = blockedKeys();
  const cands = [], seen = new Set();
  for (let i = 0; i < 2500 && cands.length < 90; i++) {
    const o = drawOutfit(pool, opts);
    if (!o || !validOutfit(o, UI.season)) continue;
    const key = outfitKey(o.map(x => x.id));
    if (seen.has(key) || blocked.has(key)) continue;
    seen.add(key);
    /* kleiner Zufallsanteil: gute Qualität, aber nicht jeden Tag dieselbe Reihenfolge */
    cands.push({ ids: o.map(x => x.id), score: scoreOutfit(o, opts) + Math.random() * 5 });
  }
  cands.sort((a, b) => b.score - a.score);
  return diversify(cands, n, vorbelegt);
}
/* Nachfüllen, solange noch etwas Ungesehenes übrig ist */
function ensureQueue() {
  if (!UI.queue) UI.queue = [];
  if (UI.queue.length >= 3) return;
  const da = new Set(UI.queue.map(q => outfitKey(q.ids)));
  suggest(12, UI.queue).forEach(c => { if (!da.has(outfitKey(c.ids))) UI.queue.push(c); });
}

/* ================= KI-Dienst =================
   Die App spricht ausschließlich mit dem eigenen Cloudflare Worker.
   Der Gemini-Schlüssel liegt dort und niemals hier: clientseitiges
   JavaScript ist öffentlich lesbar. */
const dienstUrl = () => ((DB.prefs && DB.prefs.worker) || '').replace(/\/+$/, '');

/* Fürs Analysieren reichen 512 px – spart Übertragung und Kosten */
async function bildFuerAnalyse(picId, max = 512) {
  const blob = await picGet(picId);
  if (!blob) throw new Error('Bild fehlt');
  const url = URL.createObjectURL(blob);
  const img = await loadImg(url);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  /* Heller Grund statt Transparenz: ein Modell sieht sonst Schwarz */
  const c = cv.getContext('2d');
  c.fillStyle = '#f2efec'; c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(img, 0, 0, cv.width, cv.height);
  const jpg = await canvasToBlob(cv, 'image/jpeg', 0.85);
  return (await blobToDataURL(jpg)).split(',')[1];
}

async function kiAnalyse(item) {
  const basis = dienstUrl();
  if (!basis) throw new Error('Kein KI-Dienst eingerichtet');
  const bild = await bildFuerAnalyse(item.picId);
  const res = await fetch(basis + '/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bild, kategorie: CATS[item.cat].label, name: item.name || '' })
  });
  return await antwortLesen(res);
}

/* Der Worker schickt den Grund im Feld "fehler" mit. Den einfach wegzuwerfen
   und nur den Statuscode zu zeigen macht jede Fehlersuche unmöglich. */
async function antwortLesen(res) {
  if (res.ok) return res.json();
  let grund = '';
  try { grund = (await res.json()).fehler || ''; } catch {}
  if (res.status === 429) throw new Error(grund || 'Tageskontingent aufgebraucht');
  if (res.status === 403) throw new Error(grund || 'Adresse nicht freigegeben (ALLOW_ORIGIN)');
  throw new Error(grund ? `${res.status}: ${grund}` : 'Dienst antwortet mit ' + res.status);
}

/* Übernimmt das Ergebnis. Wärme, Anlass und Jahreszeiten werden nur gesetzt,
   solange der User sie nicht selbst bestätigt hat – seine Arbeit hat Vorrang. */
function kiUebernehmen(item, a) {
  if (!a || typeof a !== 'object') return false;
  item.ki = {
    silhouette: SILHOUETTEN[a.silhouette] ? a.silhouette : null,
    material:   MATERIALIEN[a.material]   ? a.material   : null,
    muster:     MUSTER[a.muster]          ? a.muster     : 'uni',
    stil: Array.isArray(a.stil) ? a.stil.filter(t => STILE.includes(t)).slice(0, 3) : [],
    farbe: typeof a.farbe === 'string' ? a.farbe.slice(0, 40) : '',
    analysiert: Date.now()
  };
  const ungeprueft = !!item.seasonsAuto;
  if (ungeprueft) {
    if (a.waerme >= 1 && a.waerme <= 5) item.warmth = Math.round(a.waerme);
    if (a.formalitaet >= 1 && a.formalitaet <= 5) item.formality = Math.round(a.formalitaet);
    const js = Array.isArray(a.jahreszeiten)
      ? a.jahreszeiten.filter(s => SEASONS.some(x => x.key === s)) : [];
    if (js.length) { item.seasons = js; delete item.seasonsAuto; }
  }
  return true;
}

/* Pins fürs Stilprofil: klein reicht, Gemini sieht die Komposition, nicht Details */
async function pinFuerProfil(picId, max = 384) {
  const blob = await picGet(picId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const img = await loadImg(url);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return (await blobToDataURL(await canvasToBlob(cv, 'image/jpeg', 0.8))).split(',')[1];
}

const PROFIL_PINS = 12;   /* mehr bringt kaum Erkenntnis, kostet aber Tokens */

async function kiStilprofil() {
  const basis = dienstUrl();
  if (!basis) throw new Error('Kein KI-Dienst eingerichtet');
  /* Die neuesten Pins zuerst – der Geschmack von heute zählt */
  const pins = [...DB.trends].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, PROFIL_PINS);
  const bilder = (await Promise.all(pins.map(p => pinFuerProfil(p.picId)))).filter(Boolean);
  if (bilder.length < 3) throw new Error('Mindestens drei Pins nötig');
  const res = await fetch(basis + '/stilprofil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bilder })
  });
  const p = await antwortLesen(res);
  return {
    aesthetik: String(p.aesthetik || '').slice(0, 600),
    stil: (p.stil || []).filter(t => STILE.includes(t)),
    silhouetten: (p.silhouetten || []).filter(t => SILHOUETTEN[t]),
    materialien: (p.materialien || []).filter(t => MATERIALIEN[t]),
    farbregeln: String(p.farbregeln || '').slice(0, 400),
    vermeiden: (p.vermeiden || []).slice(0, 6).map(t => String(t).slice(0, 120)),
    pins: bilder.length,
    erstellt: todayISO()
  };
}

/* ================= Rendern ================= */
const TAB_TITEL = { today: 'Heute', closet: 'Schrank', outfits: 'Outfits', trends: 'Trends', data: 'Daten' };

function render() {
  _usedIds = null;
  const t = $('#title');
  if (t) t.textContent = UI.sorting === 'season' ? 'Jahreszeiten'
    : UI.sorting ? 'Nachsortieren'
    : UI.builder ? 'Kombination'
    : (TAB_TITEL[UI.tab] || 'Outfit');
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
  if (UI.studio) drawStudioPreview();
  attachSwipe();
  if (UI.tab === 'data' && !UI.sorting && !UI.builder) showUsage();
  saveUI();
}

const seasonChips = (active, fn) => `<div class="chips">${SEASONS.map(s =>
  `<button class="chip ${active === s.key ? 'active' : ''}" onclick="${fn}('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}</div>`;

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
  ${c ? swipeHTML(c) : (() => {
      const luecke = poolLuecke(UI.season);
      const saison = esc(SEASONS.find(x => x.key === UI.season).label);
      return `<div class="card"><h2>${luecke ? 'Da fehlt etwas' : 'Für heute durch'}</h2>
      <p class="hint">${luecke
        ? `Für ${saison} sind keine <b>${esc(luecke)}</b> im Schrank. Ohne die lässt sich kein Outfit
           bauen – prüfe im Schrank unter <i>Jahreszeiten durchgehen</i>, ob dort etwas zu eng gesetzt ist.`
        : `Keine weiteren Kombinationen für ${saison} und diesen Anlass. Morgen kommen die
           „Not today\"-Vorschläge wieder – oder du änderst oben die Auswahl.`}</p>
      ${(DB.tossed || []).length ? `<button class="btn block" onclick="App.resetTossed()">Verworfene wieder zulassen (${DB.tossed.length})</button>` : ''}
    </div>`; })()}`;
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
    <button class="act toss" onclick="App.decide('toss')" aria-label="Toss">${ico('x')}<span>Toss</span></button>
    <button class="act skip" onclick="App.decide('skip')" aria-label="Not today">${ico('again')}<span>Not today</span></button>
    <button class="act take" onclick="App.decide('take')" aria-label="Take">${ico('heart')}<span>Take</span></button>
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
        onclick="App.seasonToggle('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}
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
      onclick="App.sortInto('${it.id}','${c}')">${CATS[c].label}</button>`).join('')}
    <button class="btn block" style="margin-bottom:8px" onclick="App.editItem('${it.id}')">
      ${ico('more')} Andere Kategorie …</button>
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
      <button class="btn primary" onclick="App.addItem('camera')">${ico('camera')} Foto machen</button>
      <button class="btn" onclick="App.addItem('library')">${ico('image')} Aus Fotos</button>
      <button class="btn" onclick="App.pasteItem()">${ico('paste')} Einfügen</button>
    </div>
    <p class="small" style="margin:8px 0 0">Auf dem iPhone: Teil in der Fotos-App lange antippen →
    <b>Motiv kopieren</b> → hier auf <b>Einfügen</b>.</p>
  </div>
  <div class="card">
    <div class="chips">
      <button class="chip ${f === 'all' ? 'active' : ''}" onclick="App.filterCloset('all')">Alle ${DB.items.length}</button>
      ${CAT_ORDER.filter(c => counts(c)).map(c =>
        `<button class="chip ${f === c ? 'active' : ''}" onclick="App.filterCloset('${c}')">${CATS[c].kurz} ${counts(c)}</button>`).join('')}
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
    ${istUngenutzt(it.id) ? '<span class="flag" title="In keiner gemerkten Kombination"></span>' : ''}
    <div class="thumbwrap"><img data-pic="${it.picId}" alt="${esc(it.name || '')}"></div>
    <div class="swatches">${(it.colors || []).map(c =>
      `<span class="sw" style="background:${esc(c)}"></span>`).join('')}</div>
    <div class="cap">${esc(it.name || CATS[it.cat].label)}</div>
  </div>`;
}

function renderOutfits() {
  let list = [...DB.outfits];
  if (UI.outTagFilter && UI.outTagFilter !== 'all') list = list.filter(o => outfitTag(o) === UI.outTagFilter);
  if (UI.outFilter) list = list.filter(o => o.ids.includes(UI.outFilter));
  list.sort(UI.outSort === 'saison'
    ? (x, y) => (TAG_ORDER[outfitTag(x)] - TAG_ORDER[outfitTag(y)]) || (y.date || '').localeCompare(x.date || '')
    : (x, y) => (y.date || '').localeCompare(x.date || ''));

  const gefiltert = UI.outFilter ? itemById(UI.outFilter) : null;
  const zaehl = k => DB.outfits.filter(o => outfitTag(o) === k).length;
  return `<div class="card kompakt">
    <div class="btn-row" style="justify-content:space-between; margin-bottom:8px">
      <b>Deine Outfits <span class="small">${list.length}${list.length !== DB.outfits.length ? ' / ' + DB.outfits.length : ''}</span></b>
      <button class="btn small primary" onclick="App.newOutfit()">+ Eigene</button>
    </div>
    ${DB.outfits.length ? `<div class="chips tight">
      <button class="chip mini ${UI.outSort === 'neu' ? 'active' : ''}" onclick="App.setOutSort('neu')">Neueste</button>
      <button class="chip mini ${UI.outSort === 'saison' ? 'active' : ''}" onclick="App.setOutSort('saison')">Saison</button>
      <span class="trenner"></span>
      <button class="chip mini ${UI.outTagFilter === 'all' ? 'active' : ''}" onclick="App.setOutTag('all')">Alle</button>
      ${OUTFIT_TAGS.filter(t => zaehl(t.key)).map(t =>
        `<button class="chip mini ${UI.outTagFilter === t.key ? 'active' : ''}"
          onclick="App.setOutTag('${t.key}')" title="${esc(t.label)}">${ico(t.ico)} ${zaehl(t.key)}</button>`).join('')}
      <span class="trenner"></span>
      ${gefiltert
        ? `<button class="chip mini active" onclick="App.clearOutFilter()">${esc((gefiltert.name || CATS[gefiltert.cat].label).slice(0, 14))} ${ico('x')}</button>`
        : '<button class="chip mini" onclick="App.pickOutFilter()">Teil filtern …</button>'}
    </div>` : ''}
  </div>
  ${list.length ? `<div class="ogrid">${list.map(o => {
      const items = o.ids.map(itemById).filter(Boolean);
      return `<div class="ocell" onclick="App.openOutfit('${o.id}')">
        ${items.length ? collageHTML(items, { klein: true, tag: outfitTag(o) })
          : '<div class="collage klein empty"><span>leer</span></div>'}
        ${o.name ? `<div class="ocap">${esc(o.name)}</div>` : ''}
      </div>`;
    }).join('')}</div>`
    : `<div class="card"><p class="hint">${DB.outfits.length
        ? 'Kein Outfit passt zu diesem Filter.'
        : 'Noch nichts gesammelt. Im Reiter <i>Heute</i> nach rechts wischen – oder oben selbst eine Kombination bauen.'}</p></div>`}`;
}

function renderDetail() {
  const o = DB.outfits.find(x => x.id === UI.detail);
  if (!o) return '';
  const items = o.ids.map(itemById).filter(Boolean);
  const fehlend = o.ids.length - items.length;
  const worlds = outfitWorlds(items);
  const tag = outfitTag(o);
  return `<div class="overlay" onclick="App.closeOutfit()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>${o.name ? esc(o.name) : 'Outfit'}</h2>
      <button class="btn small" onclick="App.closeOutfit()">Schließen</button>
    </div>
    ${items.length ? collageHTML(items, { tag, tagLabel: true })
      : '<p class="hint">Alle Teile dieses Outfits wurden inzwischen gelöscht.</p>'}
    <p class="small" style="margin:10px 0 6px">${items.map(it =>
      esc(it.name || CATS[it.cat].label)).join(' · ') || '–'}</p>
    ${fehlend ? `<p class="warn">${fehlend} ${fehlend === 1 ? 'Teil ist' : 'Teile sind'} nicht mehr im Schrank.</p>` : ''}
    <span class="worldtags">${worlds.length
      ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
      : '<span class="wtag">nur Neutral</span>'}</span>
    <h3>Kategorie</h3>
    <div class="chips">
      ${OUTFIT_TAGS.map(t => `<button class="chip ${tag === t.key ? 'active' : ''}"
        onclick="App.setOutfitTag('${o.id}','${t.key}')">${ico(t.ico)} ${esc(t.label)}</button>`).join('')}
    </div>
    <p class="small">${o.own ? 'Selbst gebaut' : 'Gemerkt'} · ${fmtDate(o.date)}</p>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn" onclick="App.editOutfit('${o.id}')">Bearbeiten</button>
      <button class="btn danger" onclick="App.delOutfit('${o.id}')">Löschen</button>
    </div>
  </div></div>`;
}

/* --- Baukasten für eigene Kombinationen --- */
function slotRowHTML(slot, b) {
  const locked = b.locked || [];
  const gewaehlt = b.ids.map(itemById).filter(it => it && slot.cats.includes(it.cat));
  const max = slot.max || 1;
  const label = !gewaehlt.length ? 'wählen' : gewaehlt.length < max ? '+ weiteres' : 'ändern';
  return `<div class="slot">
    <div class="slot-head">
      <span class="slot-label">${esc(slot.label)}</span>
      <button class="btn small" onclick="App.pickSlot('${slot.key}')">${label}</button>
    </div>
    ${gewaehlt.map(it => {
      const fix = locked.includes(it.id);
      return `<div class="slot-item${fix ? ' fixiert' : ''}">
        <img data-pic="${it.picId}" alt=""><span>${esc(it.name || CATS[it.cat].label)}</span>
        <button class="mini ${fix ? 'on' : ''}" onclick="App.toggleLock('${it.id}')"
          aria-label="${fix ? 'Fixierung lösen' : 'Fixieren'}">${ico(fix ? 'lock' : 'unlock')}</button>
        <button class="mini" onclick="App.unpick('${it.id}')" aria-label="Entfernen">${ico('x')}</button>
      </div>`;
    }).join('')}
  </div>`;
}

/* Fixierte Teile geben die Jahreszeit vor: wer Shorts fixiert, will kein Winteroutfit. */
function builderSeason() {
  const b = UI.builder;
  const locked = ((b && b.locked) || []).map(itemById).filter(Boolean);
  if (!locked.length) return UI.season;
  const gemeinsam = SEASONS.map(s => s.key).filter(k => locked.every(it => itemSeasons(it).includes(k)));
  if (!gemeinsam.length) return UI.season;
  return gemeinsam.includes(UI.season) ? UI.season : gemeinsam[0];
}

function renderBuilder() {
  const b = UI.builder;
  b.locked = b.locked || [];
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
    <div class="btn-row" style="margin-top:12px">
      <button class="btn" onclick="App.rollRest()">${ico('dice')} Rest würfeln</button>
      <span class="small">${b.locked && b.locked.length
        ? b.locked.length + (b.locked.length === 1 ? ' Teil bleibt fix' : ' Teile bleiben fix')
        : 'Teil mit dem Schloss fixieren, dann würfeln'}</span>
    </div>
    <p class="small" style="margin:6px 0 0">Gewürfelt wird für
      <b>${esc(SEASONS.find(s => s.key === builderSeason()).label)}</b>${builderSeason() !== UI.season
        ? ' – aus den fixierten Teilen abgeleitet' : ' (oben unter <i>Heute</i> umstellbar)'}.</p>
    <div class="slots">${SLOTS.map(s => slotRowHTML(s, b)).join('')}</div>
    <label class="fld" style="margin-top:14px">Name (optional)
      <input type="text" value="${esc(b.name || '')}" placeholder="z. B. Bürotag im Herbst"
        oninput="App.builderName(this.value)">
    </label>
    <div class="worldtags" style="margin-bottom:8px">
      ${seasons.length ? seasons.map(k =>
        `<span class="wtag">${ico(SEASONS.find(s => s.key === k).ico)} ${SEASONS.find(s => s.key === k).label}</span>`).join('')
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

const trendLabel = g => g < 0.2 ? 'mein Stil' : g < 0.42 ? 'eher mein Stil'
  : g < 0.6 ? 'ausgewogen' : g < 0.82 ? 'eher Trend' : 'ganz Trend';

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
      <button class="btn primary" onclick="App.addTrend('library')">${ico('image')} Aus Fotos</button>
      <button class="btn" onclick="App.pasteTrend()">${ico('paste')} Einfügen</button>
    </div>
  </div>
  <div class="card">
    <h3>Stilprofil</h3>
    ${(() => {
      const p = DB.profil;
      if (!p) return `<p class="hint" style="margin:0 0 10px">Aus deinen Pins liest die KI heraus,
        worauf dein Geschmack zielt – Silhouetten, Materialien, Farbbeziehungen – und übersetzt
        das in Regeln für die Vorschläge. Dafür braucht es mindestens drei Pins.</p>
        <button class="btn primary block" onclick="App.profilErstellen()"
          ${t.length >= 3 ? '' : 'disabled'}>${ico('sparkle')} Stilprofil erstellen</button>
        ${t.length < 3 ? '<p class="small">Noch ' + (3 - t.length) + ' Pins nötig.</p>' : ''}`;
      const liste = (titel, arr, map) => arr && arr.length
        ? `<h3>${titel}</h3><span class="worldtags">${arr.map(x =>
            `<span class="wtag">${esc(map ? map[x].label : x)}</span>`).join('')}</span>` : '';
      return `<p class="hint" style="margin:0 0 12px">${esc(p.aesthetik)}</p>
        ${liste('Stil', p.stil)}
        ${liste('Silhouetten', p.silhouetten, SILHOUETTEN)}
        ${liste('Materialien', p.materialien, MATERIALIEN)}
        ${p.farbregeln ? `<h3>Farben</h3><p class="small">${esc(p.farbregeln)}</p>` : ''}
        ${p.vermeiden && p.vermeiden.length ? `<h3>Vermeiden</h3>
          <ul class="small" style="margin:0 0 10px; padding-left:18px">
            ${p.vermeiden.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}
        <label class="fld" style="margin-top:14px">Gewichtung
          <div class="slider-row">
            <input type="range" min="0" max="1" step="0.05" value="${UI.trendGewicht}"
              oninput="App.setTrendGewicht(+this.value)">
            <span class="val" data-out="trendGewicht">${trendLabel(UI.trendGewicht)}</span>
          </div>
        </label>
        <div class="btn-row">
          <button class="btn small" onclick="App.profilErstellen()">Neu erstellen</button>
          <button class="btn small danger" onclick="App.profilLoeschen()">Entfernen</button>
        </div>
        <p class="small" style="margin-top:8px">Aus ${p.pins} Pins · ${fmtDate(p.erstellt)}</p>`;
    })()}
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
    <h3>KI-Dienst</h3>
    <p class="hint" style="margin:0 0 10px">Adresse deines Cloudflare Workers. Der Gemini-Schlüssel
    liegt dort, nicht in der App.</p>
    <label class="fld">Worker-Adresse
      <input type="text" value="${esc((DB.prefs && DB.prefs.worker) || '')}"
        placeholder="https://outfit-ki.dein-konto.workers.dev"
        oninput="App.setWorker(this.value)">
    </label>
    <div class="btn-row">
      <button class="btn small" onclick="App.testWorker()">Verbindung prüfen</button>
      <span class="small" id="ki-status" style="white-space:pre-line">${esc(kiStatus)}</span>
    </div>
    <h3>Teile analysieren</h3>
    <p class="hint" style="margin:0 0 10px">${(() => {
      const offen = DB.items.filter(i => !istAnalysiert(i)).length;
      return offen ? `${offen} von ${DB.items.length} Teilen sind noch nicht analysiert.
        Läuft, bis das Tageskontingent erreicht ist, und macht danach dort weiter.`
        : 'Alle Teile sind analysiert.';
    })()}</p>
    <div class="btn-row">
      <button class="btn" onclick="App.analyseAlle()"
        ${DB.items.some(i => !istAnalysiert(i)) ? '' : 'disabled'}>${ico('sparkle')} Stapel starten</button>
      <button class="btn small" onclick="App.analyseStopp()">Anhalten</button>
    </div>
    <p class="small" id="ki-fortschritt">${esc(kiMeldung)}</p>
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
function renderStudio() {
  const s = UI.studio;
  if (!s) return '';
  const laedt = s.status === 'laden';
  return `<div class="overlay"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>Studio</h2>
      <button class="btn small" onclick="App.studioCancel()">Abbrechen</button>
    </div>
    <div class="studio-stage">
      ${laedt ? '<div class="studio-laden"><span class="spin"></span><span>Modell wird geladen …</span></div>'
              : '<canvas id="studio-cv"></canvas>'}
    </div>
    <p class="small center" style="margin:8px 0 2px">${
      s.status === 'ki' ? 'Freigestellt per Modell – die Pixel des Teils bleiben unverändert.'
      : s.status === 'alpha' ? 'Bereits freigestellt – nur Licht und Zuschnitt werden angepasst.'
      : s.status === 'laden' ? 'Beim ersten Mal werden 15 MB geladen, danach läuft es offline.'
      : 'Modell nicht verfügbar – einfacher Freisteller über Farbe und Kanten.'}</p>
    ${laedt ? '' : `
    ${s.status === 'alpha' ? '' : `
    <label class="fld" style="margin-top:14px">Kante
      <div class="slider-row">
        <input type="range" min="0" max="1" step="0.02" value="${s.tol}"
          oninput="App.studioSlide('tol', +this.value)">
        <span class="val" data-out="tol">${s.tol < 0.33 ? 'weich' : s.tol > 0.66 ? 'hart' : 'mittel'}</span>
      </div>
    </label>`}
    <div class="chips" style="margin:0 0 12px">
      <button class="chip ${s.licht ? 'active' : ''}" onclick="App.studioToggleLicht()">
        ${ico('sun')} Licht korrigieren</button>
      <button class="chip ${s.schatten ? 'active' : ''}" onclick="App.studioToggleSchatten()">Schatten entfernen</button>
      <button class="chip" onclick="App.studioToggleVorher()">${s.zeigeVorher ? 'Ergebnis' : 'Original'} ansehen</button>
    </div>
    ${s.licht ? `
    <label class="fld">Belichtung
      <div class="slider-row">
        <input type="range" min="-1" max="1" step="0.04" value="${s.belichtung}"
          oninput="App.studioSlide('belichtung', +this.value)">
        <span class="val" data-out="belichtung">${pctSigned(s.belichtung)}</span>
      </div>
    </label>` : ''}
    <button class="btn primary block" onclick="App.studioCommit()">Übernehmen</button>`}
  </div></div>`;
}

const studioOpts = s => ({
  maskCv: s.maskCv || null,
  freistellen: !s.hatAlpha && !s.maskCv,
  tol: s.tol, belichtung: s.belichtung, licht: s.licht, schatten: s.schatten
});

/* Vorschau rechnet auf kleiner Auflösung – sonst ruckelt der Regler */
let studioZeichnen = null;
function drawStudioPreview() {
  const s = UI.studio;
  const cv = $('#studio-cv');
  if (!s || !cv) return;
  const quelle = s.zeigeVorher ? s.vorher : studioRender(s.klein, studioOpts(s));
  cv.width = quelle.width; cv.height = quelle.height;
  cv.getContext('2d').drawImage(quelle, 0, 0);
}

function renderModal() {
  if (UI.studio) return renderStudio();
  if (UI.detail) return renderDetail();
  if (UI.modal === 'pick') return renderPicker();
  if (UI.modal === 'itempick') return renderItemPicker();
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
        onclick="App.draftSet('cat','${c}')">${CATS[c].label}</button>`).join('')}
    </div>
    <label class="fld" style="margin-top:12px">Name (optional)
      <input type="text" value="${esc(d.name || '')}" placeholder="${esc(CATS[d.cat].label)}"
        oninput="App.draftSet('name', this.value, true)">
    </label>
    <h3>Jahreszeiten</h3>
    <p class="small" style="margin:0 0 6px">Mehrfachauswahl – ein Teil darf zu mehreren passen.</p>
    <div class="chips">
      ${SEASONS.map(s => `<button class="chip ${(d.seasons || []).includes(s.key) ? 'active' : ''}"
        onclick="App.draftSeason('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}
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
    <h3>Stil</h3>
    ${(() => {
      const k = d.ki;
      if (!k || !k.analysiert) return `<p class="small" style="margin:0 0 10px">Noch nicht analysiert.</p>
        <button class="btn block" onclick="App.analyseEins('${d.id}')">${ico('sparkle')} Mit KI analysieren</button>`;
      const chip = t => `<span class="wtag">${esc(t)}</span>`;
      return `<span class="worldtags" style="margin-bottom:8px">
        ${k.silhouette ? chip(SILHOUETTEN[k.silhouette].label) : ''}
        ${k.material ? chip(MATERIALIEN[k.material].label) : ''}
        ${k.muster && k.muster !== 'uni' ? chip(MUSTER[k.muster].label) : ''}
        ${k.farbe ? chip(k.farbe) : ''}
        ${(k.stil || []).map(chip).join('')}
      </span>
      <button class="btn small" style="margin-top:4px" onclick="App.analyseEins('${d.id}')">Neu analysieren</button>`;
    })()}
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

function renderItemPicker() {
  const list = [...DB.items].sort((a, b) =>
    CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || (a.name || '').localeCompare(b.name || ''));
  return `<div class="overlay" onclick="App.closeItemPick()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>Nach welchem Teil filtern?</h2>
      <button class="btn small" onclick="App.closeItemPick()">Abbrechen</button>
    </div>
    ${list.length ? `<div class="grid">${list.map(it =>
        tileHTML(it, `App.chooseOutFilter(&#39;${it.id}&#39;)`)).join('')}</div>`
      : '<p class="hint">Der Schrank ist leer.</p>'}
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

App.setTab = tab => { UI.tab = tab; UI.modal = null; UI.sorting = false; UI.builder = null; UI.picker = null; UI.queue = null; UI.detail = null;
UI.studio = null;
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
      DB.outfits.push({ id: uid(), date: todayISO(), ids: [...c.ids], liked: true,
        tag: autoTag(c.ids.map(itemById).filter(Boolean)) });
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

/* --- Sammlung: Sortieren, Filtern, Detail --- */
App.setOutSort = v => { UI.outSort = v; render(); };
App.setOutTag = v => { UI.outTagFilter = v; render(); };
App.pickOutFilter = () => { UI.modal = 'itempick'; render(); };
App.closeItemPick = () => { UI.modal = null; render(); };
App.chooseOutFilter = id => { UI.outFilter = id; UI.modal = null; render(); };
App.clearOutFilter = () => { UI.outFilter = null; render(); };
App.openOutfit = id => { UI.detail = id; render(); };
App.closeOutfit = () => { UI.detail = null; render(); };
App.setOutfitTag = (id, tag) => {
  const o = DB.outfits.find(x => x.id === id);
  if (!o) return;
  o.tag = tag;
  save();
  render();
};

/* --- Gemerkte Outfits und eigener Baukasten --- */
App.newOutfit = () => { UI.builder = { ids: [], name: '', editId: null, locked: [] }; UI.detail = null; render(); };
App.editOutfit = id => {
  const o = DB.outfits.find(x => x.id === id);
  if (!o) return;
  UI.builder = { ids: o.ids.filter(itemById), name: o.name || '', editId: o.id, locked: [] };
  UI.detail = null;
  render();
};
App.closeBuilder = () => { UI.builder = null; UI.picker = null; UI.queue = null; UI.detail = null;
UI.studio = null;
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
App.toggleLock = id => {
  const b = UI.builder;
  if (!b) return;
  b.locked = b.locked || [];
  b.locked = b.locked.includes(id) ? b.locked.filter(x => x !== id) : b.locked.concat([id]);
  render();
};
/* Würfelt alle nicht fixierten Plätze neu. Fixierte Teile bleiben stehen,
   auch wenn sie streng genommen nicht zur Jahreszeit passen – das ist ja der Zweck. */
App.rollRest = () => {
  const b = UI.builder;
  if (!b) return;
  const locked = (b.locked || []).map(itemById).filter(Boolean);
  const season = builderSeason();
  const pool = poolFor(season);
  const opts = { season, formality: UI.mood, trends: trendWorlds(), profil: DB.profil || null, trendGewicht: UI.trendGewicht };
  /* Nicht immer das Optimum nehmen, sonst würfelt es viermal dasselbe.
     Aus den besten fünf wird zufällig gezogen. */
  const treffer = [];
  const gesehen = new Set();
  for (let i = 0; i < 600; i++) {
    const o = drawOutfit(pool, opts, locked);
    if (!o || !validOutfit(o, season)) continue;
    const key = outfitKey(o.map(x => x.id));
    if (gesehen.has(key) || key === outfitKey(b.ids)) continue;
    gesehen.add(key);
    treffer.push({ o, s: scoreOutfit(o, opts) });
  }
  treffer.sort((x, y) => y.s - x.s);
  let best = treffer.length ? pick(treffer.slice(0, 5)).o : null;
  if (!best) {
    /* Fixierung zu eng: Jahreszeit- und Stilregel fallen lassen, Farbregel bleibt */
    for (let i = 0; i < 500 && !best; i++) {
      const o = drawOutfit(pool, opts, locked);
      if (o && outfitWorlds(o).length <= MAX_WORLDS) best = o;
    }
    if (best) toast('Nur mit gelockerten Regeln möglich');
  }
  if (!best) { toast('Dazu passt nichts – Fixierung lösen'); return; }
  b.ids = best.map(x => x.id);
  render();
};
App.unpick = id => {
  if (!UI.builder) return;
  UI.builder.ids = UI.builder.ids.filter(x => x !== id);
  UI.builder.locked = (UI.builder.locked || []).filter(x => x !== id);
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
      name: b.name || '', own: true, liked: true, tag: autoTag(items) });
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
  UI.detail = null;
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

/* --- Studio --- */
async function openStudio(blob) {
  try {
    const url = URL.createObjectURL(blob);
    const img = await loadImg(url);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const gross = canvasFrom(img, STUDIO_WORK);
    const klein = canvasFrom(img, STUDIO_PREVIEW);
    /* Schon transparent? Dann kommt es aus „Motiv kopieren" und braucht keine Maske. */
    const pd = klein.getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, klein.width, klein.height).data;
    let durchsichtig = 0;
    for (let i = 3; i < pd.length; i += 4) if (pd[i] < 24) durchsichtig++;
    const hatAlpha = durchsichtig / (klein.width * klein.height) > 0.02;

    UI.studio = { gross, klein, vorher: klein, hatAlpha, maskCv: null,
      tol: 0.45, belichtung: 0, licht: true, schatten: false, zeigeVorher: false,
      status: hatAlpha ? 'alpha' : (kiVerfuegbar() ? 'laden' : 'einfach') };
    render();

    if (UI.studio.status === 'laden') {
      try {
        const maske = await kiMaske(gross);
        if (!UI.studio) return;                 /* zwischenzeitlich abgebrochen */
        UI.studio.maskCv = maske;
        UI.studio.status = 'ki';
      } catch (e) {
        console.warn('Modell nicht nutzbar, Rückfall auf Farb-/Kantenverfahren', e);
        if (!UI.studio) return;
        UI.studio.status = 'einfach';
        UI.studio.tol = 0.3;
      }
      render();
    }
  } catch (e) {
    console.error(e);
    toast('Das Bild konnte nicht gelesen werden');
  }
}
App.studioToggleSchatten = () => { UI.studio.schatten = !UI.studio.schatten; UI.studio.zeigeVorher = false; render(); };
App.studioToggleLicht = () => { UI.studio.licht = !UI.studio.licht; UI.studio.zeigeVorher = false; render(); };
App.studioSlide = (key, val) => {
  const s = UI.studio;
  if (!s) return;
  s[key] = val;
  s.zeigeVorher = false;
  const out = document.querySelector(`#modal-root .val[data-out="${key}"]`);
  if (out) out.textContent = key === 'tol'
    ? (val < 0.33 ? 'weich' : val > 0.66 ? 'hart' : 'mittel') : pctSigned(val);
  /* Auf den nächsten Bildaufbau bündeln, sonst rechnet es pro Pixelbewegung */
  if (studioZeichnen) cancelAnimationFrame(studioZeichnen);
  studioZeichnen = requestAnimationFrame(() => { studioZeichnen = null; drawStudioPreview(); });
};
App.studioToggleVorher = () => { UI.studio.zeigeVorher = !UI.studio.zeigeVorher; render(); };

App.studioCancel = () => { UI.studio = null; render(); };
App.studioCommit = async () => {
  const s = UI.studio;
  if (!s) return;
  toast('Wird gerechnet …');
  await new Promise(r => setTimeout(r, 30));   /* Toast zeigen, bevor der Hauptfaden blockiert */
  try {
    const out = studioRender(s.gross, studioOpts(s));
    const blob = await encode(out, true);
    UI.studio = null;
    document.querySelector('.toast')?.remove();
    await startDraftFrom(blob, { fertig: true });
  } catch (e) {
    console.error(e);
    toast('Das Bild konnte nicht verarbeitet werden');
  }
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
  await openStudio(file);
};
App.pasteItem = () => pasteImage(openStudio);
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
async function startDraftFrom(blob, opts) {
  if (!opts || !opts.fertig) toast('Bild wird vorbereitet …');
  try {
    const { blob: out, colors, cut, ar } = await prepItemImage(blob, 900, opts && opts.fertig);
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

let kiMeldung = '';
let kiStatus = '';
let kiStapelLaeuft = false;

/* --- KI --- */
App.setWorker = v => {
  DB.prefs = DB.prefs || {};
  DB.prefs.worker = v.trim();
  save();                                   /* kein render(): Textfeld behält den Fokus */
};
App.testWorker = async () => {
  kiStatus = 'prüfe …';
  render();
  const basis = dienstUrl();
  if (!basis) { kiStatus = 'Keine Adresse eingetragen'; render(); return; }
  try {
    const res = await fetch(basis + '/status');
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { kiStatus = 'Antwort ' + res.status; render(); return; }
    const zeilen = [`Erreichbar · Modell ${j.modell || '?'} · heute ${j.heute ?? 0} von ${j.limit ?? '?'}`];
    if (j.bereit === false) zeilen.push('Noch nicht einsatzbereit.');
    const k = j.schluessel;
    if (k && k.vorhanden) zeilen.push(`Schlüssel: ${k.laenge} Zeichen · Format ${k.format || '?'}${k.enthaeltLeerzeichen ? ' · enthält Leerzeichen' : ''}`);
    (j.offen || []).forEach(o => zeilen.push('• ' + o));
    if (j.bereit && !(j.offen || []).length) zeilen.push('Alles eingerichtet.');
    /* Prüfen, ob das eingestellte Modell für diesen Schlüssel überhaupt existiert */
    try {
      const m = await (await fetch(basis + '/modelle')).json();
      if (Array.isArray(m.nutzbar)) {
        if (m.anmeldeweg) zeilen.push(`Anmeldung über ${m.anmeldeweg} erfolgreich.`);
        if (!m.nutzbar.includes(m.eingestellt)) {
          zeilen.push(`• Modell "${m.eingestellt}" gibt es für deinen Schlüssel nicht.`);
          zeilen.push('  Verfügbar u. a.: ' + m.nutzbar.filter(n => /flash|pro/.test(n)).slice(0, 6).join(', '));
        } else {
          zeilen.push(`Modell "${m.eingestellt}" ist nutzbar.`);
        }
      } else if (m.fehler) {
        zeilen.push('• ' + m.fehler);
        (m.tipps || []).forEach(x => zeilen.push('   – ' + x));
      }
    } catch {}
    kiStatus = zeilen.join('\n');
  } catch (e) {
    kiStatus = 'Nicht erreichbar. Adresse prüfen, oder ALLOW_ORIGIN passt nicht zu dieser Seite.';
  }
  render();
};
App.analyseEins = async id => {
  const it = itemById(id);
  if (!it) return;
  toast('Wird analysiert …');
  try {
    const a = await kiAnalyse(it);
    kiUebernehmen(it, a);
    if (UI.draft && UI.draft.id === id) Object.assign(UI.draft, JSON.parse(JSON.stringify(it)));
    save();
    UI.queue = null;
    document.querySelector('.toast')?.remove();
    toast('Analysiert');
    render();
  } catch (e) {
    console.warn(e);
    toast(e.message || 'Analyse fehlgeschlagen');
  }
};
/* Googles Minutengrenze liegt bei etwa 10 Abfragen. 400 ms Pause wären 150/min
   gewesen und hätten sofort Fehler erzeugt. 6,5 s ergibt gut 9 pro Minute. */
const KI_PAUSE_MS = 6500;

App.analyseAlle = async () => {
  /* Meldung im Zustand halten: sonst wischt das nächste render() sie weg,
     und der Grund fürs Stoppen wäre für den Nutzer unsichtbar. */
  const sag = t => { kiMeldung = t; const el = $('#ki-fortschritt'); if (el) el.textContent = t; };
  const offen = DB.items.filter(i => !istAnalysiert(i));
  if (!offen.length) return;
  let fertig = 0;
  kiStapelLaeuft = true;
  for (const it of offen) {
    if (!kiStapelLaeuft) { sag(`Angehalten nach ${fertig} Teilen.`); save(); UI.queue = null; render(); return; }
    const rest = Math.round((offen.length - fertig) * KI_PAUSE_MS / 60000);
    sag(`${fertig} von ${offen.length} · noch etwa ${rest} Min.`);
    try {
      kiUebernehmen(it, await kiAnalyse(it));
      fertig++;
      save();
    } catch (e) {
      /* Minutengrenze: einmal abwarten und erneut versuchen */
      if (/429|Kontingent|rate/i.test(e.message) && fertig > 0) {
        sag(`Grenze erreicht, warte 60 s … (${fertig} von ${offen.length})`);
        await new Promise(r => setTimeout(r, 60000));
        try { kiUebernehmen(it, await kiAnalyse(it)); fertig++; save(); }
        catch (e2) { save(); sag(`${fertig} analysiert, dann gestoppt: ${e2.message}`); kiStapelLaeuft = false; UI.queue = null; render(); return; }
      } else {
        save();
        sag(`${fertig} analysiert, dann gestoppt: ${e.message}`);
        kiStapelLaeuft = false; UI.queue = null; render();
        return;
      }
    }
    await new Promise(r => setTimeout(r, KI_PAUSE_MS));
  }
  kiStapelLaeuft = false;
  sag(`Fertig: ${fertig} Teile analysiert.`);
  UI.queue = null;
  render();
};
App.analyseStopp = () => { kiStapelLaeuft = false; };

App.setTrendGewicht = v => {
  UI.trendGewicht = v;
  UI.queue = null;
  saveUI();
  const out = document.querySelector('#modal-root .val[data-out="trendGewicht"]')
           || document.querySelector('.val[data-out="trendGewicht"]');
  if (out) out.textContent = trendLabel(v);   /* kein render(): Regler behält den Finger */
};
App.profilErstellen = async () => {
  toast('Pins werden ausgewertet …');
  try {
    DB.profil = await kiStilprofil();
    save();
    UI.queue = null;
    document.querySelector('.toast')?.remove();
    toast('Stilprofil erstellt');
    render();
  } catch (e) {
    console.warn(e);
    toast(e.message || 'Hat nicht geklappt');
  }
};
App.profilLoeschen = () => {
  if (!confirm('Stilprofil entfernen?')) return;
  delete DB.profil;
  save();
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
  (UI.tab === 'trends' ? addTrendFrom : openStudio)(it.getAsFile());
});

render();

/* Trennlinie im Kopf erst zeigen, wenn Inhalt darunter weggescrollt ist */
const topbar = $('#topbar');
const onScroll = () => topbar && topbar.classList.toggle('scrolled', window.scrollY > 4);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
