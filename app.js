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
  thumb:   '<path d="M7.5 10.5v9.3H4.6a1 1 0 0 1-1-1v-7.3a1 1 0 0 1 1-1h2.9Z"/><path d="M7.5 10.5 11.2 3.6a2 2 0 0 1 2.4 2.2l-.6 3.9h5.3a2 2 0 0 1 2 2.4l-1.3 6.2a2 2 0 0 1-2 1.5H7.5"/>',
  heart:   '<path d="M12 20.3s-7.3-4.5-7.3-9.7a4.3 4.3 0 0 1 7.3-3 4.3 4.3 0 0 1 7.3 3c0 5.2-7.3 9.7-7.3 9.7Z"/>',
  lock:    '<rect x="4.8" y="10.8" width="14.4" height="9.7" rx="2.2"/><path d="M8.2 10.8V7.2a3.8 3.8 0 0 1 7.6 0v3.6"/>',
  unlock:  '<rect x="4.8" y="10.8" width="14.4" height="9.7" rx="2.2"/><path d="M8.2 10.8V7.2a3.8 3.8 0 0 1 6.9-2.2"/>',
  camera:  '<path d="M3.8 8.2h3.1L8.4 6h7.2l1.5 2.2h3.1a1 1 0 0 1 1 1v8.8a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.4" r="3.4"/>',
  image:   '<rect x="3" y="5" width="18" height="14" rx="2.4"/><circle cx="8.6" cy="10.1" r="1.4"/><path d="m3.6 17.2 4.8-4.3 3.9 3.4 2.5-2 5.2 4.6"/>',
  paste:   '<rect x="6" y="4" width="12" height="17" rx="2.2"/><path d="M9.2 4.2V3.2h5.6v1"/><path d="M9.4 10.2h5.2M9.4 14h3.6"/>',
  dice:    '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4"/><circle cx="8.6" cy="8.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.4" cy="15.4" r="1.15" fill="currentColor" stroke="none"/>',
  more:    '<path d="M7 17 17 7M9.4 7H17v7.6"/>',
  check:   '<path d="m5 12.8 4.6 4.6L19 7.4"/>',
  plus:    '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
  wolke:   '<path d="M7 18.5h10.2a3.8 3.8 0 0 0 .5-7.6 5.6 5.6 0 0 0-10.8 1.4A3.1 3.1 0 0 0 7 18.5Z"/>',
  sonnewolke: '<path d="M9.2 5.2V3.6M4.6 7.1l-1.1-1.1M3.4 11.4H1.8M13.8 6l1.1-1.1"/><path d="M6.6 11.4a3.4 3.4 0 0 1 6.3-1.8"/><path d="M9 20h8.6a3.3 3.3 0 0 0 .4-6.6 4.8 4.8 0 0 0-9.2 1.2A2.7 2.7 0 0 0 9 20Z"/>',
  regen:   '<path d="M7 15h10.2a3.8 3.8 0 0 0 .5-7.6 5.6 5.6 0 0 0-10.8 1.4A3.1 3.1 0 0 0 7 15Z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  schnee:  '<path d="M7 14h10.2a3.8 3.8 0 0 0 .5-7.6 5.6 5.6 0 0 0-10.8 1.4A3.1 3.1 0 0 0 7 14Z"/><path d="M8.5 18.5h.01M12 20h.01M15.5 18.5h.01" stroke-width="2.6"/>',
  gewitter:'<path d="M7 14h10.2a3.8 3.8 0 0 0 .5-7.6 5.6 5.6 0 0 0-10.8 1.4A3.1 3.1 0 0 0 7 14Z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>',
  ort:     '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  search:  '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  chev:    '<path d="m9 5 7 7-7 7"/>',
  chevdown:'<path d="m6 9 6 6 6-6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7.2" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
  shoe:    '<path d="M3 16.5V9.8c0-.6.5-1 1-.9 1.7.3 3.1 1.3 4 2.7l.7 1.1c.5.7 1.2 1.2 2 1.4l7.8 1.8A3 3 0 0 1 21 18.8V19H4a1 1 0 0 1-1-1v-1.5Z"/><path d="M3 16.5h18"/>',
  tee:     '<path d="M8.5 3.5 4 6l1.6 4 2.2-.9V20.5h8.4V9.1l2.2.9L20 6l-4.5-2.5c-.5 1.6-1.9 2.6-3.5 2.6S9 5.1 8.5 3.5Z"/>',
  blitz:   '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z"/>',
  layers:  '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  minus:   '<path d="M6 12h12"/>',
  download:'<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M5 19.5h14"/>',
  upload:  '<path d="M12 20V9"/><path d="m7 13.5 5-5 5 5"/><path d="M5 4.5h14"/>',
  shrink:  '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  trash:   '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7"/>',
  pencil:  '<path d="M15.2 5.2 18.8 8.8"/><path d="M4 20l1-4.4L16.4 4.2a1.8 1.8 0 0 1 2.6 0l.8.8a1.8 1.8 0 0 1 0 2.6L8.4 19 4 20Z"/>'
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
if (UI.outTagFilter !== 'all' && UI.outTagFilter !== 'unvollstaendig' && !OUTFIT_TAGS.some(t => t.key === UI.outTagFilter)) UI.outTagFilter = 'all';
if (UI.closetFilter !== 'all' && UI.closetFilter !== '_ohneki' && !CATS[UI.closetFilter]) UI.closetFilter = 'all';
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
/* Teile aus Pins sind Wünsche, keine Teile im Schrank: sie tauchen in keinem Vorschlag auf */
const eigene = () => DB.items.filter(i => !i.wunsch && !i.geloescht);
const wuensche = () => DB.items.filter(i => i.wunsch && !i.geloescht);
/* Teil weg, aber noch in gemerkten Outfits: bleibt sichtbar, als „nicht mehr da" markiert */
const outfitUnvollstaendig = o => o.ids.some(id => { const it = itemById(id); return !it || it.geloescht; });
const needsSortCount = () => eigene().filter(i => i.needsSort).length;
/* Teile, die in noch keiner gemerkten Kombination vorkommen – pro Render einmal berechnet */
let _usedIds = null;
const istUngenutzt = id => {
  if (!_usedIds) _usedIds = new Set((DB.outfits || []).flatMap(o => o.ids));
  return !_usedIds.has(id);
};

const seasonTodoCount = () => eigene().filter(i => i.seasonsAuto).length;

const LIKE_PAUSE_TAGE = 14;
/* Kombinationen, die nicht mehr vorgeschlagen werden sollen */
function blockedKeys() {
  const heute = todayISO();
  const s = new Set(DB.tossed || []);
  Object.entries(DB.snoozed || {}).forEach(([k, d]) => { if (d === heute) s.add(k); });
  /* Like heißt „geht, aber nicht begeisternd" – zwei Wochen Ruhe, dann darf es wiederkommen */
  const grenze = localISO(new Date(Date.now() - LIKE_PAUSE_TAGE * 864e5));
  Object.entries(DB.okay || {}).forEach(([k, d]) => { if (d > grenze) s.add(k); });
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
  /* Liegt das Bild schon im Speicher, sofort setzen – sonst blinkt es bei jedem
     Neuzeichnen. Nur wirklich neu geladene Bilder werden weich eingeblendet. */
  document.querySelectorAll('img[data-pic]').forEach(async img => {
    const id = img.dataset.pic;
    if (picURLCache.has(id)) { img.src = picURLCache.get(id); return; }
    img.classList.add('laedt');
    const u = await picURL(id);
    if (!u) { img.style.visibility = 'hidden'; return; }
    img.onload = () => img.classList.remove('laedt');
    img.src = u;
    if (img.complete) img.classList.remove('laedt');
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
function umrissAlpha(umriss, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  /* Kaum ausweiten: wo der Umriss an Haut oder anderes Textil grenzt, soll nichts
     davon mitkommen. Außenkanten zum Hintergrund schneidet ohnehin das Modell. */
  const rand = Math.max(2, Math.round(Math.max(w, h) * 0.004));
  if ('filter' in c) c.filter = `blur(${rand}px)`;
  c.fillStyle = c.strokeStyle = '#fff';
  c.lineWidth = rand; c.lineJoin = 'round';
  c.beginPath();
  umriss.forEach(([y, x], i) => {
    const px = x / 1000 * w, py = y / 1000 * h;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  });
  c.closePath(); c.fill(); c.stroke();
  const d = c.getImageData(0, 0, w, h).data;
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  return a;
}

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

  /* Umriss vom KI-Dienst: nur das gewählte Teil behalten. Die feinen Kanten
     kommen weiter vom Freistell-Modell, der Umriss trennt nur, was das Modell
     nicht trennen kann – Rock vom T-Shirt, Jacke vom Bügel, Kleidung von Armen. */
  if (opts.umriss) {
    const m = umrissAlpha(opts.umriss, w, h);
    for (let i = 0; i < w * h; i++) alpha[i] = (alpha[i] * m[i]) / 255;
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
    `<div class="cpiece${p.it.geloescht ? ' weg' : ''}" style="left:${pct(p.r.left)}; top:${pct(p.r.top)}; width:${pct(p.r.w)}; height:${pct(p.r.h)}; z-index:${p.r.z}">
       <img data-pic="${p.it.picId}" alt="${esc(p.it.name || CATS[p.it.cat].label)}">
       ${p.it.geloescht ? `<span class="weg-marke" title="Nicht mehr im Schrank">${ico('minus')}</span>` : ''}</div>`).join('');
  const sticker = opt.tag
    ? `<span class="osticker">${ico(tagInfo(opt.tag).ico)}${opt.tagLabel ? esc(tagInfo(opt.tag).label) : ''}</span>`
    : '';
  return `<div class="collage${opt.klein ? ' klein' : ''}"${opt.onclick ? ` onclick="${opt.onclick}"` : ''}>${pieces}${sticker}</div>`;
}

/* ================= Vorschlagslogik ================= */
/* Jahreszeit ist eine harte Bedingung. Teile ohne gepflegte Angabe werden aus der
   Wärme abgeleitet, damit sie nicht stillschweigend in jeder Jahreszeit auftauchen. */
const itemSeasons = it => (it.seasons && it.seasons.length) ? it.seasons : seasonsFromWarmth(it.warmth || 3);
/* Sportbekleidung war für die Engine bisher eine ganz normale Hose mit Anlass 2 –
   und damit kombinierbar mit Cowboy Boots. Sie bekommt einen eigenen Anlass und
   taucht in Leger/Normal/Schick nicht mehr auf. Erkennung: eigene Markierung am
   Teil, sonst KI-Analyse, sonst der Name. */
const SPORT_NAME = /(^|[\s-])(sport|yoga|pilates|gym|fitness|training|jogging|running)|legging/i;
const SNEAKER_NAME = /sneaker|turnschuh|laufschuh|new balance|adidas|nike|asics|puma|reebok|vans|converse|hoka|salomon|on running/i;
const istSport = it => it.sport === true || (it.sport !== false &&
  ((it.ki && it.ki.sportbekleidung === true) || SPORT_NAME.test(it.name || '')));
const istSneaker = it => it.cat === 'shoes' && (istSport(it) || SNEAKER_NAME.test(it.name || ''));
const SPORT_ANLASS = 1;
const istSportModus = () => UI.mood === SPORT_ANLASS;

/* Sommerteile: neben ihnen ist nichts Warmes stimmig, auch wenn jedes Teil für
   sich zur gewählten Jahreszeit passt. */
const SOMMER_NAME = /tank|neckholder|träger|bandeau|bustier|shorts|sandale|flip|pantolette|bikini|badeanzug|leinen/i;
const istSommerteil = it => (it.warmth || 3) <= 1 || SOMMER_NAME.test(it.name || '')
  || (itemSeasons(it).length === 1 && itemSeasons(it)[0] === 'sommer');

const FARBWORT = /weiß|weiss|creme|ecru|beige|sand|greige|taupe|braun|camel|cognac|schoko|mocca|schwarz|grau|anthrazit|silber|gold|rot|bordeaux|weinrot|rosé|rose|rosa|pink|beere|lila|flieder|blau|navy|denim|jeans|türkis|grün|oliv|khaki|salbei|gelb|senf|orange|terracotta|rost|nude|snake|leo|animal/i;

/* Abendteile: Glitzer und Pailletten gehören zum Anlass „Schick", nicht in den
   Alltag. In den gemerkten Outfits kamen sie nur zu Abendkleidern vor. */
const GLITZER_NAME = /glitzer|glitter|pailletten|strass|metallic|lurex|lamé/i;
const istGlitzer = it => GLITZER_NAME.test(it.name || '');
const SCHICK_ANLASS = 4;

/* Kniehohe Stiefel verschwinden unter der Hose. 73 verworfene, kein gemerktes
   Outfit mit Stiefel und Hose – zu Rock und Kleid dagegen passen sie. */
const KNIEHOCH_NAME = /stiefel(?!ette)|cowboy|overknee|reitstiefel/i;
const istKniehoch = it => it.cat === 'shoes' && KNIEHOCH_NAME.test(it.name || '');

/* Dunkle Grundfarbe eines Teils: Schwarz, Navy oder dunkles Braun.
   Der Name gilt vor der gemessenen Farbe – die liegt bei Schuhen oft daneben. */
function dunkleBasis(it) {
  const n = (it.name || '').toLowerCase();
  if (/schwarz/.test(n)) return 'schwarz';
  if (/dunkelblau|navy|marine/.test(n)) return 'navy';
  if (/hellbraun|mittelbraun|camel|taupe|beige|creme/.test(n)) return null;
  if (/braun|cognac|schoko|mocca|espresso/.test(n)) return 'braun';
  if (FARBWORT.test(n)) return null;
  const c = hexToHSL((it.colors || [])[0]);
  if (!c) return null;
  const w = colorWorld(it.colors[0]);
  if (w === 'neutral' && c.l < 0.16) return 'schwarz';
  if (w === 'braun' && c.l < 0.3) return 'braun';
  if (w === 'blau' && c.l < 0.28) return 'navy';
  return null;
}
const basenVon = items => new Set(items.map(dunkleBasis).filter(Boolean));

const poolFor = season => eigene().filter(it => itemSeasons(it).includes(season) &&
  (istSportModus() ? (istSport(it) || istSneaker(it)) : !istSport(it)) &&
  (UI.mood === SCHICK_ANLASS || !istGlitzer(it)));
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

/* Wärme muss im Outfit stimmig sein, nicht nur jedes Teil für sich.
   Vorher durfte eine Jacke beliebig warm sein („das ist ihr Zweck") – so kam
   ein Wollmantel auf ein Outfit mit Shorts und Sandalen. */
function waermeStimmig(items) {
  const lagen = items.filter(i => CATS[i.cat].role === 'layer');
  const rest = items.filter(i => ['base_top', 'base_bottom', 'base_full', 'shoes'].includes(CATS[i.cat].role));
  if (!rest.length) return true;
  const w = rest.map(i => i.warmth || 3);
  const minW = Math.min(...w), maxW = Math.max(...w);
  if (rest.some(istSommerteil) && (maxW >= 4 || lagen.some(l => (l.warmth || 3) >= 3))) return false;
  if (lagen.some(l => (l.warmth || 3) - minW > 2)) return false;
  if (maxW - minW > 2) return false;
  return true;
}

/* Wenige, eindeutige Stilbrüche – nur für analysierte Teile. Mehr lässt sich mit
   festen Regeln nicht sauber fassen; den Rest beurteilt die KI-Stylistin. */
const STIL_KONFLIKT = [['sportlich', 'elegant']];
function stileVertraeglich(items) {
  const an = items.filter(istAnalysiert);
  return STIL_KONFLIKT.every(([x, y]) => !(
    an.some(i => stileVon(i).includes(x) && !stileVon(i).includes(y)) &&
    an.some(i => stileVon(i).includes(y) && !stileVon(i).includes(x))));
}

/* Sport nur mit Sport – kein Yoga-Oberteil unter der Teddyweste */
const sportRein = items => {
  const kleidung = items.filter(i => i.cat !== 'shoes');
  return kleidung.every(istSport) || !kleidung.some(istSport);
};

/* Drei dunkle Grundfarben – Navy, Braun und Schwarz – wirken zusammen unruhig.
   Kam in keinem gemerkten Outfit vor, in 48 verworfenen. Zwei davon gehen, wenn
   es bewusst aussieht; das bewertet das Lernen weiter unten. */
const basenOk = items => basenVon(items).size <= 2;

const stiefelOk = items => !items.some(istKniehoch) ||
  !items.some(i => i.cat === 'pants' && !(ki(i) && ki(i).silhouette === 'schmal'));

/* Glitzer nur zu schicken Teilen – der Glitzerpumps zur Jeans war der Fehlgriff */
const glitzerOk = items => !items.some(istGlitzer) ||
  items.filter(i => ['base_top', 'base_bottom', 'base_full'].includes(CATS[i.cat].role) && !istGlitzer(i))
    .every(i => (i.formality || 3) >= 4);

/* Harte Regeln: Farbwelten, Stilbruch, Jahreszeit, Silhouette, Wärme, Sport */
function validOutfit(items, season) {
  if (outfitWorlds(items).length > MAX_WORLDS) return false;
  if (!formalityFits(items)) return false;
  if (season && !warmthFits(items, season)) return false;
  if (!volumenPasst(items)) return false;
  if (!waermeStimmig(items)) return false;
  if (!sportRein(items)) return false;
  if (!stileVertraeglich(items)) return false;
  if (!basenOk(items) || !stiefelOk(items) || !glitzerOk(items)) return false;
  if (gelerntGesperrt(items)) return false;
  return true;
}

/* ================= Lernen aus Take und Toss =================
   Vorher wurde ein verworfenes Outfit nur genau so gesperrt – das nächste mit
   denselben Schwächen kam trotzdem. Jetzt zählt die App für eine Reihe
   verständlicher Merkmale, wie oft sie in verworfenen und wie oft in gemerkten
   Outfits vorkommen. Was deutlich öfter verworfen wird, bekommt Abzug; was nie
   gemerkt, aber oft verworfen wurde, wird gesperrt. Dieselben Erkenntnisse gehen
   als Sätze an die Stylistin. */
const kernTeile = items => items.filter(i => ['base_top', 'base_bottom', 'base_full'].includes(CATS[i.cat].role));
const MUSTER_NAME = /leo|animal|zebra|snake|karo|kariert|streif|gestreift|blumen|floral|paisley|gepunktet|print/i;
const lautesMuster = it => lautVon(it) >= 1 || MUSTER_NAME.test(it.name || '');
const farbFamilie = it => {
  const b = dunkleBasis(it);
  if (b) return b;
  const n = (it.name || '').toLowerCase();
  if (/camel|taupe|cognac|hellbraun|mittelbraun|braun/.test(n)) return 'braun';
  if (/creme|weiß|weiss|ecru|beige|sand|offwhite/.test(n)) return 'hell';
  return null;
};

const MERKMALE = [
  { key: 'schwarzBraun', text: 'Schwarz und dunkles Braun im selben Outfit',
    test: it => { const b = basenVon(it); return b.has('schwarz') && b.has('braun'); } },
  { key: 'navySchwarz', text: 'Navy zusammen mit Schwarz',
    test: it => { const b = basenVon(it); return b.has('navy') && b.has('schwarz'); } },
  { key: 'navyBraun', text: 'Navy zusammen mit dunklem Braun',
    test: it => { const b = basenVon(it); return b.has('navy') && b.has('braun'); } },
  { key: 'schuhTasche', text: 'Schuhe und Tasche in verschiedenen Farbfamilien',
    test: it => {
      const s = it.find(i => i.cat === 'shoes'), t = it.find(i => i.cat === 'bag');
      const a = s && farbFamilie(s), b = t && farbFamilie(t);
      return !!(a && b && a !== b);
    } },
  { key: 'formSpanne', text: 'sehr schicke neben sehr legeren Teilen',
    test: it => { const f = it.filter(i => !['bag', 'acc'].includes(CATS[i.cat].role)).map(i => i.formality || 3);
      return f.length > 1 && Math.max(...f) - Math.min(...f) >= 2; } },
  { key: 'sneakerSchick', text: 'Sneaker zu schicken Teilen',
    test: it => it.some(istSneaker) && kernTeile(it).some(i => (i.formality || 3) >= 4) },
  { key: 'zweiMuster', text: 'zwei auffällige Muster in einem Outfit',
    test: it => it.filter(lautesMuster).length >= 2 },
  /* Jacke über Strick: oft zu eng, die Jacke geht nicht mehr zu */
  { key: 'jackeUeberStrick', text: 'eine Jacke über einem Pullover oder einer Strickjacke',
    test: it => it.some(i => i.cat === 'outer') && it.some(i => i.cat === 'knit') }
];

/* Begründungen aus dem Toss-Dialog, Schlüssel → Text für die Stylistin */
const TOSS_GRUENDE = [
  ['farben', 'Farben'], ['schuhe', 'Schuhe'], ['zuschick', 'Zu schick'],
  ['zuleger', 'Zu leger'], ['stil', 'Stilbruch'], ['saison', 'Jahreszeit'],
  ['layer', 'Layer zu viel']
];

const LIKE_GEWICHT = 0.5;
let _lernen = null, _lernenStand = '';
function lernstand() {
  const alleToss = [...new Set([...(DB.tossArchiv || []), ...(DB.tossed || [])])];
  const stand = alleToss.length + '|' + (DB.outfits || []).length + '|' +
    Object.keys(DB.okay || {}).length + '|' + DB.items.length;
  if (_lernen && _lernenStand === stand) return _lernen;
  const zuItems = ids => ids.map(itemById).filter(Boolean);
  const verworfen = alleToss.map(k => zuItems(k.split('|'))).filter(x => x.length >= 2);
  /* Positiv zählen gemerkte Outfits voll, „Like" halb: tragbar, aber kein Vorbild */
  const gemerkt = [
    ...(DB.outfits || []).map(o => ({ it: zuItems(o.ids), w: 1 })),
    ...Object.keys(DB.okay || {}).map(k => ({ it: zuItems(k.split('|')), w: LIKE_GEWICHT }))
  ].filter(x => x.it.length >= 2);
  const T = verworfen.length, S = gemerkt.reduce((a, x) => a + x.w, 0);
  const merkmale = MERKMALE.map(m => {
    const t = verworfen.filter(m.test).length;
    const g = gemerkt.reduce((a, x) => a + (m.test(x.it) ? x.w : 0), 0);
    /* Verhältnis der Anteile, geglättet – bei wenigen Daten bleibt es nahe 1 */
    const verh = ((t + 1) / (T + 2)) / ((g + 1) / (S + 2));
    return { ...m, t, g, verh,
      sperre: T >= 30 && S >= 10 && g === 0 && t >= 15,
      abzug: T >= 20 && t >= 8 ? clamp(Math.log(verh), 0, 2.5) * 22 : 0 };
  });
  _lernen = { T, S, merkmale };
  _lernenStand = stand;
  return _lernen;
}
const gelerntGesperrt = items => lernstand().merkmale.some(m => m.sperre && m.test(items));
const gelerntAbzug = items => lernstand().merkmale.reduce((s, m) => s + (m.abzug && m.test(items) ? m.abzug : 0), 0);

/* Für die Stylistin in Worte gefasst */
function gelernteSaetze() {
  const l = lernstand();
  const pz = (a, b) => Math.round(a * 100 / Math.max(1, b));
  return l.merkmale.filter(m => m.sperre || m.abzug >= 8).map(m => m.sperre
    ? `Nie: ${m.text} (${m.t}-mal verworfen, nie gemerkt).`
    : `Möglichst nicht: ${m.text} (in ${pz(m.t, l.T)} % der verworfenen, nur ${pz(m.g, l.S)} % der gemerkten Outfits).`);
}

function scoreOutfit(items, opts) {
  const worlds = outfitWorlds(items);
  const f = items.map(i => i.formality || 3);
  const hit = worlds.filter(w => opts.trends.has(w)).length;
  let s = 100 - gelerntAbzug(items);
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
/* Nachfüllen, solange noch etwas Ungesehenes übrig ist.
   Zuerst kommen die Outfits der KI-Stylistin, danach die lokale Auswahl.
   Solange die Stylistin noch arbeitet, wird nicht lokal aufgefüllt – sonst
   swipt man schon schwächere Vorschläge weg, bevor die guten da sind. */
function ensureQueue() {
  if (!UI.queue) UI.queue = [];
  if (UI.queue.length >= 3) return;
  const da = new Set(UI.queue.map(q => outfitKey(q.ids)));
  stylistOffen().forEach(c => {
    const k = outfitKey(c.ids);
    if (!da.has(k)) { UI.queue.push({ ids: [...c.ids], grund: c.grund, ki: true }); da.add(k); }
  });
  if (UI.queue.length >= 3 || stylistWartet()) return;
  suggest(12, UI.queue).forEach(c => { if (!da.has(outfitKey(c.ids))) UI.queue.push(c); });
}

/* Gibt es mit diesem Schrank überhaupt ein gültiges Outfit? Unterscheidet
   „alles schon gesehen" von „hier passt nichts zusammen". */
function kombinierbar(season) {
  const pool = poolFor(season);
  for (let i = 0; i < 600; i++) {
    const o = drawOutfit(pool, { season });
    if (o && validOutfit(o, season)) return true;
  }
  return false;
}

/* Technische Fehler in eine Sprache übersetzen, die in einer App etwas zu
   suchen hat. Die Rohmeldung landet in kiDetail und in der Konsole – sichtbar
   nur dort, wo man sie zum Einrichten braucht. */
let kiDetail = '';

/* Meldungen richten sich danach, **wer** etwas tun kann.

   Ein Nutzer aus dem Store kann weder ein Modell umstellen noch einen Schlüssel
   hinterlegen. Ihm zu schreiben „Das eingestellte KI-Modell ist nicht verfügbar"
   hilft ihm nicht, sondern lässt die App kaputt wirken. Solche Fälle sind Sache
   des Betreibers – der Nutzer bekommt nur zu wissen, dass es vorübergehend ist
   und dass der Rest der App weiterläuft.

   Die Rohmeldung landet in kiDetail und in der Konsole, sichtbar in den
   Entwicklereinstellungen. */
function fehlerText(e) {
  const m = String((e && e.message) || e || '');
  kiDetail = m;
  console.warn('KI-Dienst:', m);

  /* Fälle, in denen der Nutzer selbst etwas tun kann */
  if (/erreichbar|Failed to fetch|NetworkError|Load failed/i.test(m)) {
    return 'Keine Verbindung. Prüf dein Netz und versuch es gleich noch einmal.';
  }
  const warte = /retry in ([0-9]+)m/i.exec(m);
  if (/429|quota|kontingent/i.test(m)) {
    return warte
      ? `Die Stilanalyse ist gerade ausgelastet. In etwa ${warte[1]} Minuten wieder möglich.`
      : 'Die Stilanalyse ist gerade ausgelastet. Versuch es später noch einmal.';
  }
  if (/Mindestens drei Pins/i.test(m)) return m;

  /* Alles Übrige kann nur der Betreiber beheben – Modellname, Schlüssel,
     Freigabe, fehlende Einrichtung. Für den Nutzer ist das dasselbe. */
  return 'Die Stilanalyse ist zurzeit nicht verfügbar. Dein Schrank und deine Outfits funktionieren normal weiter.';
}

/* ================= KI-Dienst =================
   Die App spricht ausschließlich mit dem eigenen Cloudflare Worker.
   Der Gemini-Schlüssel liegt dort und niemals hier: clientseitiges
   JavaScript ist öffentlich lesbar. */
/* Vor dem Ausliefern hier die eigene Worker-Adresse eintragen. Dann braucht
   kein Nutzer etwas einzustellen – das Feld in den Einstellungen dient nur noch
   zum Überschreiben während der Entwicklung. */
const STANDARD_WORKER = 'https://outfit-ki.alexander-webner18.workers.dev';

const dienstUrl = () =>
  (((DB.prefs && DB.prefs.worker) || STANDARD_WORKER) || '').replace(/\/+$/, '');
const entwicklermodus = () => !!(DB.prefs && DB.prefs.entwickler);

/* Zufällige Kennung dieses Geräts – damit der Dienst Kontingente und den Nachtlauf
   je Person trennen kann. Enthält nichts Persönliches. */
function geraetId() {
  DB.prefs = DB.prefs || {};
  if (!DB.prefs.geraet) { DB.prefs.geraet = (uid() + uid()).replace(/[^a-z0-9]/g, '').slice(0, 24); save(); }
  return DB.prefs.geraet;
}
const dienstKopf = () => ({ 'Content-Type': 'application/json', 'X-Geraet': geraetId() });

/* ---- Wetter ----
   Open-Meteo: frei, ohne Schlüssel. Ort aus der Einstellung, sonst der aktuelle
   Standort. 30 Minuten zwischengespeichert, damit nicht jedes Neuzeichnen fragt. */
let _wetter = null, _wetterLaedt = false;
const LS_WETTER = 'outfit-wetter';
try { _wetter = JSON.parse(localStorage.getItem(LS_WETTER) || 'null'); } catch (e) {}
const wetterIcon = c => c === 0 ? 'sun' : c <= 2 ? 'sonnewolke' : c <= 48 ? 'wolke'
  : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'schnee' : c >= 95 ? 'gewitter' : 'regen';
const wetterText = c => c === 0 ? 'Sonnig' : c <= 2 ? 'Heiter' : c === 3 ? 'Bewölkt' : c <= 48 ? 'Nebel'
  : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'Schnee' : c >= 95 ? 'Gewitter' : 'Regen';

async function standortErmitteln() {
  const pos = await new Promise((res, rej) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 3600000 })
    : rej(new Error('kein GPS')));
  const lat = +pos.coords.latitude.toFixed(3), lon = +pos.coords.longitude.toFixed(3);
  let name = 'Hier';
  try {
    const r = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=de`)).json();
    name = r.city || r.locality || r.principalSubdivision || name;
  } catch (e) {}
  return { lat, lon, name };
}

async function wetterLaden(erzwingen) {
  if (_wetterLaedt) return;
  const fest = DB.prefs && DB.prefs.ort;
  if (!erzwingen && _wetter && Date.now() - _wetter.zeit < 30 * 60000 &&
      (!fest || (_wetter.ort && _wetter.ort.lat === fest.lat && _wetter.ort.lon === fest.lon))) return;
  _wetterLaedt = true;
  try {
    const ort = fest || await standortErmitteln();
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lon}` +
      '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max' +
      '&timezone=auto&forecast_days=1';
    const d = await (await fetch(u)).json();
    _wetter = { zeit: Date.now(), ort, jetzt: Math.round(d.current.temperature_2m), code: d.current.weather_code,
      min: Math.round(d.daily.temperature_2m_min[0]), max: Math.round(d.daily.temperature_2m_max[0]),
      regen: d.daily.precipitation_probability_max ? d.daily.precipitation_probability_max[0] : null };
    try { localStorage.setItem(LS_WETTER, JSON.stringify(_wetter)); } catch (e) {}
  } catch (e) {
    console.warn('Wetter:', e);
    if (!_wetter) _wetter = { fehler: true, zeit: Date.now() };
  } finally {
    _wetterLaedt = false;
    if (UI.tab === 'today' && !UI.builder && !UI.sorting) { const el = $('#wetter'); if (el) el.outerHTML = wetterHTML(); }
  }
}

function wetterHTML() {
  const w = _wetter;
  if (!w || w.fehler || w.jetzt == null) return `<button class="wetter" id="wetter" onclick="App.aktion('ort')">${ico('ort')}
    <span class="wleise">${w && w.fehler ? 'Wetter: Ort wählen' : 'Wetter wird geladen …'}</span></button>`;
  return `<button class="wetter" id="wetter" onclick="App.aktion('ort')" aria-label="Wetter, Ort ändern">
    ${ico(wetterIcon(w.code))}<b>${w.jetzt}°</b>
    <span class="wleise">${w.min}° / ${w.max}°${w.regen != null && w.regen >= 30 ? ` · ${w.regen} % Regen` : ''}</span>
    <span class="word">${esc(w.ort.name)}${DB.prefs && DB.prefs.ort ? '' : ` ${ico('ort')}`}</span></button>`;
}

/* ---- Damen oder Herren ----
   Je Person einstellbar: steuert Kategorien (Hemden statt Blusen, kein Rock und
   kein Kleid), Shop-Links und den Hinweis an die KI. */
const abteilung = () => (DB.prefs && DB.prefs.abteilung) || 'damen';
const herren = () => abteilung() === 'herren';
const AUSGEBLENDET_HERREN = ['skirt', 'dress'];
const sichtbareKats = () => herren() ? CAT_ORDER.filter(c => !AUSGEBLENDET_HERREN.includes(c)) : CAT_ORDER;
function abteilungAnwenden() {
  const h = herren();
  CATS.blouse.label = h ? 'Hemden' : 'Blusen';
  CATS.blouse.kurz = h ? 'Hemden' : 'Blusen';
  TEIL_NAME.blouse = h ? 'Hemd' : 'Bluse';
  KAT_EN.blouse = h ? 'button-up shirt' : 'blouse';
  CATS.top.label = h ? 'T-Shirts & Polos' : 'Tops & Shirts';
}
function setAbteilung(a) {
  DB.prefs = DB.prefs || {};
  DB.prefs.abteilung = a;
  save(); abteilungAnwenden(); UI.queue = null;
  render();
}

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
    headers: dienstKopf(),
    body: JSON.stringify({ bild, kategorie: CATS[item.cat].label, name: item.name || '' })
  });
  return await antwortLesen(res);
}

/* Der Worker schickt den Grund im Feld "fehler" mit. Den einfach wegzuwerfen
   und nur den Statuscode zu zeigen macht jede Fehlersuche unmöglich. */
/* KI-Abfrage mit zwei stillen Wiederholungen. Google ist zeitweise überlastet –
   ein einzelner Aussetzer soll nie zur Fehlermeldung werden. Kontingent-Ende
   (429) wird nicht wiederholt. */
async function dienstAnfrage(pfad, daten, versuche = 3) {
  let letzter;
  /* Nie endlos warten: nach spätestens 2,5 Minuten abbrechen und Bescheid sagen */
  const grenze = pfad === '/produktfoto' ? 150000 : 90000;
  for (let i = 0; i < versuche; i++) {
    try {
      const ab = new AbortController();
      const uhr = setTimeout(() => ab.abort(), grenze);
      const res = await fetch(dienstUrl() + pfad, { method: 'POST', headers: dienstKopf(), body: JSON.stringify(daten), signal: ab.signal })
        .finally(() => clearTimeout(uhr));
      return await antwortLesen(res);
    } catch (e) {
      letzter = e;
      if (/429|aufgebraucht|Kontingent|nicht freigegeben/i.test(String(e.message))) break;
      if (e.name === 'AbortError') { letzter = new Error('Zeitüberschreitung'); break; }
      if (i < versuche - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw letzter;
}

async function antwortLesen(res) {
  if (res.ok) return res.json();
  let grund = '';
  try { grund = (await res.json()).fehler || ''; } catch {}
  if (res.status === 429) throw new Error(grund || 'Tageskontingent aufgebraucht');
  if (res.status === 403) throw new Error(grund || 'Adresse nicht freigegeben (ALLOW_ORIGIN)');
  throw new Error(grund ? `${res.status}: ${grund}` : 'Dienst antwortet mit ' + res.status);
}

/* Mehrere Teile in einer Abfrage. Googles Tagesgrenze zählt Abfragen, nicht
   Bilder – ein Fünferpäckchen verfünffacht damit den Durchsatz. */
/* Zwanzig je Abfrage. Zwölf liefen in der Praxis vollständig zurück, die Ausgabe
   liegt bei zwanzig Ergebnissen noch weit unter der Längengrenze (rund 1.300 von
   8.192 Tokens). Googles Tagesgrenze zählt Abfragen, nicht Bilder – deshalb zählt
   hier jede eingesparte Abfrage doppelt. */
const KI_PAKET = 20;

async function kiAnalyseMehrere(items) {
  const basis = dienstUrl();
  if (!basis) throw new Error('Kein KI-Dienst eingerichtet');
  const teile = [];
  for (const it of items) {
    teile.push({ bild: await bildFuerAnalyse(it.picId), kategorie: CATS[it.cat].label, name: it.name || '' });
  }
  const res = await fetch(basis + '/analyse-mehrere', {
    method: 'POST', headers: dienstKopf(),
    body: JSON.stringify({ teile })
  });
  if (res.status === 404) { const e = new Error('Sammelabfrage nicht unterstützt'); e.alt = true; throw e; }
  const daten = await antwortLesen(res);
  const liste = Array.isArray(daten.teile) ? daten.teile : [];
  return zuordnen(items, liste);
}

/* Zuordnung der Ergebnisse zu den Teilen.

   Modelle halten sich nicht zuverlässig an „ab 0 nummerieren": manche zählen ab 1,
   manche lassen den Index weg. Vorher fiel dadurch je Paket ein Teil stillschweigend
   heraus — der Grund, warum nach zwei Paketen nur 15 statt 24 Teile analysiert waren. */
function zuordnen(items, liste) {
  const indizes = liste.map(x => x && x.index).filter(v => Number.isInteger(v));
  const brauchbar = indizes.length === liste.length && new Set(indizes).size === liste.length;
  let versatz = 0;
  if (brauchbar && indizes.length) {
    const min = Math.min(...indizes), max = Math.max(...indizes);
    if (min === 1 && max === items.length) versatz = 1;        /* ab 1 gezählt */
    else if (min !== 0 || max !== items.length - 1) versatz = min;
  }
  return items.map((it, i) => ({
    item: it,
    a: brauchbar ? (liste.find(x => x.index - versatz === i) || null)
                 : (liste[i] || null)                          /* sonst der Reihe nach */
  }));
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
    sportbekleidung: a.sportbekleidung === true,
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
async function pinFuerProfil(picId, max = 512) {
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

const PROFIL_PINS = 16;   /* eine Abfrage – mehr Pins kosten nur Tokens, kein Kontingent */

async function kiStilprofil() {
  const basis = dienstUrl();
  if (!basis) throw new Error('Kein KI-Dienst eingerichtet');
  /* Die neuesten Pins zuerst – der Geschmack von heute zählt */
  const pins = [...DB.trends].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, PROFIL_PINS);
  const bilder = (await Promise.all(pins.map(p => pinFuerProfil(p.picId)))).filter(Boolean);
  if (bilder.length < 3) throw new Error('Mindestens drei Pins nötig');
  const res = await fetch(basis + '/stilprofil', {
    method: 'POST',
    headers: dienstKopf(),
    body: JSON.stringify({ bilder })
  });
  const p = await antwortLesen(res);
  return {
    aesthetik: String(p.aesthetik || '').slice(0, 600),
    stil: (p.stil || []).filter(t => STILE.includes(t)),
    silhouetten: (p.silhouetten || []).filter(t => SILHOUETTEN[t]),
    materialien: (p.materialien || []).filter(t => MATERIALIEN[t]),
    farbregeln: String(p.farbregeln || '').slice(0, 500),
    stylingregeln: (p.stylingregeln || []).slice(0, 8).map(t => String(t).slice(0, 160)),
    vermeiden: (p.vermeiden || []).slice(0, 6).map(t => String(t).slice(0, 120)),
    pins: bilder.length,
    erstellt: todayISO()
  };
}

/* ================= KI-Stylistin =================
   Feste Regeln erkennen grobe Fehler – Sommertop unter Wollmantel, Leggings zu
   Cowboy Boots –, aber keinen Stil. Ob Silhouetten, Materialien und Farben
   wirklich zusammen gut aussehen, beurteilt die Stylistin: Sie bekommt den
   Schrank als kurze Textliste und stellt in **einer** Abfrage 15 Outfits zusammen.

   Die Regeln bleiben als Sicherheitsnetz: Was die Stylistin vorschlägt, muss
   validOutfit bestehen. Fällt der Dienst aus, läuft die lokale Auswahl weiter.

   Die Ergebnisse liegen in einem eigenen Speicher, nicht in DB – sie sind
   jederzeit neu erzeugbar und gehören nicht ins Backup. */
const LS_STYLIST = 'outfit-stylist';
let STYLIST = {};
try { STYLIST = JSON.parse(localStorage.getItem(LS_STYLIST) || '{}') || {}; } catch (e) {}
const stylistSpeichern = () => { try { localStorage.setItem(LS_STYLIST, JSON.stringify(STYLIST)); } catch (e) {} };

const STYLIST_ANZAHL = 15;
const STYLIST_PAUSE_MS = 30 * 60 * 1000;   /* nach einem Fehler nicht sofort wieder anfragen */
const ANLASS_TEXT = {
  2: 'Freizeit, entspannt und leger',
  3: 'Alltag – Stadt, Büro ohne Dresscode, Treffen mit Freunden',
  4: 'schick – Abendessen, Verabredung, Büro mit Anspruch',
  [SPORT_ANLASS]: 'Sport – Pilates, Yoga, Gym'
};
const stylistSchluessel = () => UI.season + '|' + UI.mood;
let stylistLaeuft = null;          /* Schlüssel der laufenden Abfrage */

function farbName(hex) {
  const w = colorWorld(hex);
  if (w !== 'neutral') return WORLD_LBL[w];
  const c = hexToHSL(hex);
  if (!c) return '';
  if (c.l > 0.8) return 'Weiß/Creme';
  if (c.l < 0.2) return 'Schwarz';
  return c.s > 0.12 && c.h >= 8 && c.h <= 60 ? 'Beige/Sand' : 'Grau';
}

/* Eine Zeile je Teil: alles, was eine Stylistin wissen muss, ohne Bild */
function stylistZeile(it) {
  const k = it.ki || {};
  const t = [CATS[it.cat].label];
  if (it.name) t.push(it.name);
  /* Die aus dem Foto gemessene Farbe ist unzuverlässig (Schatten, Hintergrund):
     eine braune Ballerina kam als „Schwarz/Grau" an. Steht die Farbe schon im
     Namen, gilt der Name; sonst nur der Hauptton als ungefähre Angabe. */
  if (typeof k.farbe === 'string' && k.farbe) t.push('Farbe ' + k.farbe);
  else if (!FARBWORT.test(it.name || '') && (it.colors || []).length) {
    const f = farbName(it.colors[0]);
    if (f) t.push('Farbe etwa ' + f);
  }
  if (SILHOUETTEN[k.silhouette]) t.push(SILHOUETTEN[k.silhouette].label.toLowerCase());
  if (MATERIALIEN[k.material]) t.push(MATERIALIEN[k.material].label);
  if (MUSTER[k.muster] && k.muster !== 'uni') t.push(MUSTER[k.muster].label.toLowerCase());
  if ((k.stil || []).length) t.push('Stil ' + k.stil.join('/'));
  t.push(`Wärme ${it.warmth || 3}/5`, `Formalität ${it.formality || 3}/5`);
  if (istSport(it)) t.push('Sportbekleidung');
  if (istGlitzer(it)) t.push('Abendteil');
  if (istKniehoch(it)) t.push('kniehoch');
  return t.join(', ');
}

/* Aufbau prüfen, den die Stylistin einhalten soll – das Modell hält sich
   meistens daran, aber nicht immer. */
function aufbauOk(items) {
  if (new Set(items.map(i => i.id)).size !== items.length) return false;
  const n = r => items.filter(i => CATS[i.cat].role === r).length;
  const kleid = n('base_full'), oben = n('base_top'), unten = n('base_bottom');
  const kern = (kleid === 1 && !oben && !unten) || (!kleid && oben === 1 && unten === 1);
  return kern && n('shoes') === 1 && n('layer') <= 1 && n('bag') <= 1 && n('acc') <= 2;
}

/* Die Anfrage an die Stylistin – live wie für den Nachtlauf dieselbe.
   poolFor hängt am gewählten Anlass, deshalb kurz umschalten. */
function stylistAnfrage(season, mood) {
  const altMood = UI.mood;
  UI.mood = mood;
  try { return stylistAnfrageBauen(season, mood); } finally { UI.mood = altMood; }
}
function stylistAnfrageBauen(season, mood) {
  const pool = poolFor(season).slice(0, 220);
  const code = new Map(), zurueck = new Map();
  pool.forEach((it, i) => { code.set(it.id, 'T' + (i + 1)); zurueck.set('T' + (i + 1), it); });
  /* Gemerkte und verworfene Outfits als Beispiele – nur solche, deren Teile
     alle in der Liste stehen, sonst kann die Stylistin nichts damit anfangen */
  const alsCodes = ids => ids.length && ids.every(id => code.has(id)) ? ids.map(id => code.get(id)) : null;
  const gemocht = (DB.outfits || []).map(o => alsCodes(o.ids)).filter(Boolean).slice(-20);
  /* Begründete Ablehnungen zuerst – aus denen lässt sich am meisten lernen */
  const gruende = DB.tossGruende || {};
  const grundText = k => (TOSS_GRUENDE.find(g => g[0] === gruende[k]) || [])[1] || '';
  const tossKeys = [...(DB.tossed || [])].reverse();
  const verworfen = [...tossKeys.filter(k => gruende[k]), ...tossKeys.filter(k => !gruende[k])]
    .map(k => ({ teile: alsCodes(k.split('|')), grund: grundText(k) }))
    .filter(v => v.teile).slice(0, 25);
  const p = DB.profil;
  return { zurueck, luecke: pool.length < 3, anfrage: {
      saison: SEASONS.find(x => x.key === season).label,
      anlass: ANLASS_TEXT[mood] || ANLASS_TEXT[3],
      anzahl: STYLIST_ANZAHL,
      abteilung: abteilung(),
      teile: pool.map(it => ({ k: code.get(it.id), t: stylistZeile(it) })),
      profil: p ? { aesthetik: p.aesthetik, farbregeln: p.farbregeln, vermeiden: p.vermeiden || [],
        stylingregeln: p.stylingregeln || [],
        stil: p.stil || [], silhouetten: p.silhouetten || [], materialien: p.materialien || [] } : null,
      regeln: gelernteSaetze(),
      okay: Object.entries(DB.okay || {}).sort((a, b) => b[1].localeCompare(a[1]))
        .map(([k]) => alsCodes(k.split('|'))).filter(Boolean).slice(0, 15),
      gemocht, verworfen
  } };
}

async function kiStylist(season, mood) {
  const basis = dienstUrl();
  if (!basis) throw new Error('Kein KI-Dienst eingerichtet');
  const { anfrage, zurueck } = stylistAnfrage(season, mood);
  const res = await fetch(basis + '/stylist', {
    method: 'POST', headers: dienstKopf(),
    body: JSON.stringify(anfrage)
  });
  const j = await antwortLesen(res);
  const outfits = [], gesehen = new Set();
  let aussortiert = 0;
  for (const o of (j.outfits || [])) {
    const items = (o.teile || []).map(c => zurueck.get(String(c).trim().toUpperCase()));
    if (!items.length || items.some(x => !x) || !aufbauOk(items) || !validOutfit(items, season)) {
      aussortiert++;
      continue;
    }
    const ids = items.map(x => x.id);
    const key = outfitKey(ids);
    if (gesehen.has(key)) continue;
    gesehen.add(key);
    outfits.push({ ids, grund: String(o.grund || '').slice(0, 180) });
  }
  console.info(`Stylistin: ${outfits.length} übernommen, ${aussortiert} von den Regeln aussortiert`);
  return { outfits, aussortiert };
}

/* Noch nicht gezeigte Outfits der Stylistin für die aktuelle Auswahl.
   Erneut geprüft, weil sich Teile seit der Abfrage geändert haben können. */
function stylistOffen() {
  const e = STYLIST[stylistSchluessel()];
  if (!e || !e.outfits || !e.outfits.length) return [];
  const blocked = blockedKeys();
  const imPool = new Set(poolFor(UI.season).map(i => i.id));
  return e.outfits.filter(o => !blocked.has(outfitKey(o.ids)) && o.ids.every(id => imPool.has(id))
    && validOutfit(o.ids.map(itemById), UI.season));
}

function stylistNoetig() {
  if (!dienstUrl() || poolLuecke(UI.season) || nachtLaedt) return false;
  const e = STYLIST[stylistSchluessel()];
  if (e && e.fehlerAm && Date.now() - e.fehlerAm < STYLIST_PAUSE_MS) return false;
  if (!e || !e.datum) return true;
  /* Höchstens einmal am Tag von selbst nachfragen – das Kontingent ist knapp */
  return stylistOffen().length < 3 && e.datum !== todayISO();
}
/* ===== Nachtlauf =====
   Nachts stellt die Stylistin auf dem Server die Outfits für die zuletzt gewählte
   Jahreszeit und alle Anlässe zusammen. Dafür legt die App bei jedem Öffnen die
   Anfragen ab – nur Text, keine Fotos. Beim Start holt sie die Ergebnisse ab,
   bevor sie selbst nachfragt; so gibt es morgens keine Wartezeit. */
const NACHT_ANLAESSE = [2, 3, 4, SPORT_ANLASS];
let nachtLaedt = false;
let _schrankStand = '';

async function schrankAblegen() {
  const basis = dienstUrl();
  if (!basis || !DB.items.length) return;
  const auftraege = [];
  for (const mood of NACHT_ANLAESSE) {
    const { anfrage, zurueck, luecke } = stylistAnfrage(UI.season, mood);
    if (luecke) continue;
    const karte = {};
    zurueck.forEach((it, k) => { karte[k] = it.id; });
    auftraege.push({ schluessel: UI.season + '|' + mood, anfrage, karte });
  }
  const rumpf = JSON.stringify({ auftraege, tz: -new Date().getTimezoneOffset() });
  if (rumpf === _schrankStand) return;         /* nichts geändert – nicht erneut senden */
  try {
    const res = await fetch(basis + '/schrank', {
      method: 'POST', headers: dienstKopf(), body: rumpf });
    if (res.ok) _schrankStand = rumpf;
  } catch (e) { console.warn('Schrank ablegen:', e); }
}

async function nachtAbholen() {
  const basis = dienstUrl();
  if (!basis) return;
  nachtLaedt = true;
  try {
    const ab = new AbortController();
    const uhr = setTimeout(() => ab.abort(), 6000);
    const res = await fetch(basis + '/nacht', { signal: ab.signal,
      method: 'POST', headers: dienstKopf(), body: '{}' });
    clearTimeout(uhr);
    if (!res.ok) return;
    const n = await res.json();
    let neu = false;
    for (const [k, v] of Object.entries(n || {})) {
      if (!v || !v.datum || !Array.isArray(v.outfits) || !v.outfits.length) continue;
      const lokal = STYLIST[k];
      /* Nur übernehmen, was frischer ist als das, was schon auf dem Gerät liegt */
      if (lokal && lokal.datum && lokal.datum >= v.datum) continue;
      STYLIST[k] = { datum: v.datum, outfits: v.outfits.filter(o => o.ids.every(itemById)), nacht: true };
      neu = true;
    }
    if (neu) stylistSpeichern();
  } catch (e) { console.warn('Nachtergebnisse:', e); }
  finally {
    nachtLaedt = false;
    if (UI.tab === 'today' && !UI.builder && !UI.sorting) { UI.queue = null; render(); }
  }
}

const stylistWartet = () => stylistLaeuft === stylistSchluessel() && UI.ohneStylist !== stylistSchluessel();

async function stylistHolen(manuell) {
  if (stylistLaeuft) return;
  const key = stylistSchluessel();
  const season = UI.season, mood = UI.mood;
  stylistLaeuft = key;
  if (manuell) render();
  try {
    const r = await kiStylist(season, mood);
    STYLIST[key] = { datum: todayISO(), outfits: r.outfits };
    if (manuell && !r.outfits.length) toast('Diesmal hat kein Vorschlag die Prüfung bestanden. Versuch es später noch einmal.');
  } catch (e) {
    const alt = STYLIST[key] || {};
    STYLIST[key] = { ...alt, outfits: alt.outfits || [], fehlerAm: Date.now() };
    const text = fehlerText(e);
    if (manuell) toast(text);
  } finally {
    stylistLaeuft = null;
    stylistSpeichern();
    /* Nur neu aufbauen, wenn noch dieselbe Auswahl offen ist. Die Karte, die
       gerade angezeigt wird, bleibt stehen – nichts springt unter dem Finger weg. */
    if (UI.tab === 'today' && !UI.builder && !UI.sorting) {
      if (stylistSchluessel() === key) UI.queue = UI.queue && UI.queue.length ? UI.queue.slice(0, 1) : null;
      render();   /* bei inzwischen anderer Auswahl startet render() deren Abfrage */
    }
  }
}

/* ================= Rendern ================= */
const TAB_TITEL = { today: 'Heute', closet: 'Schrank', outfits: 'Outfits', trends: 'Trends', data: 'Daten' };

/* Segment-Schalter: der Daumen soll gleiten, obwohl jedes Neuzeichnen neue
   Elemente erzeugt. Deshalb mit der alten Position zeichnen und erst im
   nächsten Bild auf die neue schieben. */
const _seg = {};
function segHTML(name, optionen, aktiv, aufruf) {
  const neu = Math.max(0, optionen.findIndex(o => o[0] === aktiv));
  const alt = name in _seg ? _seg[name] : neu;
  _seg[name] = neu;
  const arg = v => typeof v === 'number' ? v : `'${v}'`;
  return `<div class="seg" style="--n:${optionen.length}; --i:${alt}" data-ziel="${neu}">${optionen.map(([v, l, ic]) =>
    `<button class="${v === aktiv ? 'on' : ''}" onclick="${aufruf}(${arg(v)})">${ic ? ico(ic) : ''}${esc(l)}</button>`).join('')}</div>`;
}

/* Knöpfe rechts in der Kopfleiste – je Ansicht */
function kopfAktionen() {
  if (UI.sorting) return `<button class="kopfknopf" onclick="App.stopSort()">Fertig</button>`;
  if (UI.builder) return `<button class="kopfknopf" onclick="App.closeBuilder()">Abbrechen</button>`;
  if (UI.tab === 'closet' && UI.auswahl) return `<button class="kopfknopf" onclick="App.auswahlEnde()">Fertig</button>`;
  if (UI.tab === 'closet') return `<button class="kopfknopf" onclick="App.auswahlStart()">Auswählen</button>
    <button class="kopfknopf dunkel rund" onclick="App.aktion('neu')" aria-label="Teil hinzufügen">${ico('plus')}</button>`;
  if (UI.tab === 'outfits') return `<button class="kopfknopf dunkel rund" onclick="App.newOutfit()" aria-label="Eigene Kombination">${ico('plus')}</button>`;
  if (UI.tab === 'trends') return `<button class="kopfknopf dunkel rund" onclick="App.aktion('pin')" aria-label="Pin hinzufügen">${ico('plus')}</button>`;
  return '';
}

const TABS = ['today', 'closet', 'outfits', 'trends', 'data'];
let _letzteAnsicht = null, _letzterModal = '';

function modalSchluessel() {
  if (UI.studio) return 'studio';
  if (UI.detail) return 'detail:' + UI.detail;
  if (UI.tossOffen && UI.tab === 'today' && !UI.builder && !UI.sorting) return 'toss';
  if (UI.modal === 'haufen') return 'haufen';
  if (UI.modal) return UI.modal + ':' + ((UI.draft && UI.draft.id) || UI.picker || '');
  return '';
}

/* Blätter fahren hoch und wieder runter, statt zu erscheinen und zu verschwinden.
   Beim Neuzeichnen eines offenen Blatts bleibt die Scrollposition erhalten. */
function renderOverlay() {
  const root = $('#modal-root');
  const mk = modalSchluessel();
  const html = renderModal();
  const altSheet = root.querySelector('.sheet');
  const scroll = altSheet ? altSheet.scrollTop : 0;
  if (!html) {
    const o = root.firstElementChild;
    if (o && _letzterModal && !o.classList.contains('zu')) {
      o.classList.remove('neu'); o.classList.add('zu');
      setTimeout(() => { if (!modalSchluessel() && root.firstElementChild === o) root.innerHTML = ''; }, 260);
    } else if (!o || !o.classList.contains('zu')) root.innerHTML = '';
  } else {
    root.innerHTML = html;
    const o = root.firstElementChild;
    if (o && mk !== _letzterModal) o.classList.add('neu');
    else { const sh = root.querySelector('.sheet'); if (sh) sh.scrollTop = scroll; }
  }
  _letzterModal = html ? mk : '';
  hydratePics();
  if (UI.studio) drawStudioPreview();
}

function render() {
  _usedIds = null;
  const titel = UI.sorting === 'season' ? 'Jahreszeiten'
    : UI.sorting ? 'Nachsortieren'
    : UI.builder ? (UI.builder.editId ? 'Bearbeiten' : 'Kombination')
    : (TAB_TITEL[UI.tab] || 'Outfit');
  $('#title').textContent = titel;
  $('#tabbar').style.setProperty('--tab', Math.max(0, TABS.indexOf(UI.tab)));
  document.querySelectorAll('#tabbar button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === UI.tab));
  $('#topaktion').innerHTML = kopfAktionen();
  const main = $('#main');
  const ansicht = UI.sorting ? 'sort' : UI.builder ? 'builder' : UI.tab;
  main.innerHTML = UI.sorting ? renderSorter()
    : UI.builder ? renderBuilder()
    : UI.tab === 'today' ? renderToday()
    : UI.tab === 'closet' ? renderCloset()
    : UI.tab === 'outfits' ? renderOutfits()
    : UI.tab === 'trends' ? renderTrends()
    : renderData();
  if (ansicht !== _letzteAnsicht) {
    if (_letzteAnsicht !== null) window.scrollTo(0, 0);
    main.classList.remove('einblenden'); void main.offsetWidth; main.classList.add('einblenden');
    _letzteAnsicht = ansicht;
  }
  requestAnimationFrame(() => document.querySelectorAll('.seg[data-ziel]').forEach(el =>
    el.style.setProperty('--i', el.dataset.ziel)));
  renderOverlay();
  attachSwipe();
  UI._neueKarte = false;
  if (UI.tab === 'data' && !UI.sorting && !UI.builder) { showUsage(); if (entwicklermodus()) zeigeVerbrauch(); }
  saveUI();
}

const seasonChips = (active, fn) => `<div class="chips">${SEASONS.map(s =>
  `<button class="chip ${active === s.key ? 'active' : ''}" onclick="${fn}('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}</div>`;

function renderToday() {
  if (stylistNoetig() && !stylistLaeuft) setTimeout(() => stylistHolen(false), 0);
  /* Laufende Abfrage für genau diese Auswahl: warten statt lokal auffüllen */
  const wartet = nachtLaedt || (stylistNoetig() && UI.ohneStylist !== stylistSchluessel()) || stylistWartet();
  if (!wartet) ensureQueue();
  const moods = [[2, 'Leger'], [3, 'Normal'], [4, 'Schick'], [SPORT_ANLASS, 'Sport']];
  const c = wartet ? null : UI.queue[0];
  const saisonLbl = esc(SEASONS.find(x => x.key === UI.season).label);
  const saison = SEASONS.find(x => x.key === UI.season);
  /* Kein großer Titel: auf Heute ist das Outfit der Star, jeder Pixel geht an die Karte */
  setTimeout(() => wetterLaden(), 0);
  return `${wetterHTML()}
  <div class="heute-kopf">
    ${segHTML('anlass', moods, UI.mood, 'App.setMood')}
    <button class="kopfknopf" onclick="App.aktion('saison')">${ico(saison.ico)} ${esc(saison.label)} ${ico('chevdown', 'pfeil')}</button>
  </div>
  ${wartet ? `<div class="card stylist-laedt">
      <div class="schimmer">${ico('sparkle')}</div>
      <h2>Deine Stylistin stellt zusammen</h2>
      <p class="hint">Sie geht deinen Schrank für ${saisonLbl} durch. Das dauert ein paar Sekunden.</p>
      <button class="btn small" onclick="App.stylistNichtWarten()">Nicht warten</button>
    </div>`
  : c ? swipeHTML(c, UI.queue.length > 1) + stylistFussHTML()
  : !eigene().length ? `<div class="card leer">
      <div class="leer-ico">${ico('sparkle')}</div>
      <h2>Willkommen</h2>
      <p class="small" style="margin:0 0 8px">Wofür ist dein Schrank?</p>
      ${segHTML('abteilung-start', [['damen', 'Damenmode'], ['herren', 'Herrenmode']], abteilung(), 'App.setAbteilung')}
      <p class="hint">Fotografiere ein paar Teile aus deinem Schrank – Oberteile, Hosen oder Röcke und
      Schuhe. Danach stellt dir die App hier jeden Tag Outfits zusammen.</p>
      <button class="btn primary block" onclick="App.setTab('closet'); App.aktion('neu')">${ico('plus')} Teile hinzufügen</button>
      <p class="small" style="margin:10px 0 0">Tipp: Leg mehrere Teile nebeneinander aufs Bett und fotografiere sie zusammen –
      die App erkennt jedes einzeln und macht Produktfotos daraus.</p>
    </div>`
  : (() => {
      const luecke = poolLuecke(UI.season);
      const sport = istSportModus();
      const geht = luecke ? false : kombinierbar(UI.season);
      const titel = luecke || !geht ? 'Da fehlt etwas' : 'Für heute durch';
      const text = sport && (luecke || !geht)
        ? `Für ${saisonLbl} ist nicht genug Sportkleidung im Schrank. Öffne ein Teil und schalte
           <i>Sportbekleidung</i> ein, oder prüfe, ob deine Sportsachen auch für ${saisonLbl} gesetzt sind.`
        : luecke
        ? `Für ${saisonLbl} sind keine <b>${esc(luecke)}</b> im Schrank. Ohne die lässt sich kein Outfit
           bauen – prüfe die Jahreszeiten deiner Teile.`
        : !geht
        ? `Mit den Teilen für ${saisonLbl} lässt sich für diesen Anlass kein stimmiges Outfit bilden.
           Probier einen anderen Anlass.`
        : `Alles für ${saisonLbl} und diesen Anlass gesehen. Mit „Like" bewertete Outfits kommen
           nach zwei Wochen wieder.`;
      return `<div class="card leer">
        <div class="leer-ico">${ico(luecke || !geht ? 'tee' : 'check')}</div>
        <h2>${titel}</h2>
        <p class="hint">${text}</p>
        ${geht && dienstUrl() && !stylistLaeuft ? `<button class="btn primary block" onclick="App.stylistNeu()">${ico('sparkle')} Neue Ideen der Stylistin</button>` : ''}
        ${geht && (DB.tossed || []).length ? `<button class="btn block" onclick="App.resetTossed()">Verworfene wieder zulassen</button>` : ''}
      </div>`; })()}`;
}

/* Unter der Karte: woher der Vorschlag kommt – und die Möglichkeit, neue
   Ideen zu holen, wenn gerade nur die lokale Auswahl läuft. */
function stylistFussHTML() {
  if (!dienstUrl() || UI.queue.some(q => q.ki)) return '';
  return `<p class="small stylist-fuss">${stylistLaeuft ? 'Die Stylistin arbeitet gerade …'
      : `<button class="linkbtn" onclick="App.stylistNeu()">${ico('sparkle')} Ideen der Stylistin holen</button>`}</p>`;
}

function swipeHTML(c, weitere) {
  const items = c.ids.map(itemById).filter(Boolean);
  const offen = UI.tossOffen === outfitKey(c.ids);
  return `<div class="stapel">
    ${weitere ? '<div class="hinten zwei"></div><div class="hinten"></div>' : ''}
    <div class="swipe-card${offen ? ' toss-offen' : ''}${UI._neueKarte ? ' auftauchen' : ''}" id="card">
      <div class="stamp take">TAKE</div>
      <div class="stamp like">LIKE</div>
      <div class="stamp toss">TOSS</div>
      ${collageHTML(items)}
      <div class="kartentext">
        ${c.ki ? `<div class="quelle">${ico('sparkle')} Deine Stylistin</div>` : ''}
        ${c.grund ? `<p class="grund"><span>${esc(c.grund)}</span></p>` : ''}
        <p class="teilnamen">${items.map(it => esc(it.name || CATS[it.cat].label)).join(' · ')}</p>
      </div>
    </div>
  </div>
  <div class="swipe-actions">
    <button class="act toss" onclick="App.tossFrage()" aria-label="Toss">${ico('x')}<span>Toss</span></button>
    <button class="act like" onclick="App.decide('like')" aria-label="Like">${ico('thumb')}<span>Like</span></button>
    <button class="act take" onclick="App.decide('take')" aria-label="Take">${ico('heart')}<span>Take</span></button>
  </div>`;
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
  const todo = eigene().filter(i => i.seasonsAuto);
  if (!todo.length) {
    return `<h1 class="grosstitel">Jahreszeiten</h1>
    <div class="card leer"><div class="leer-ico">${ico('check')}</div><h2>Alles bestätigt</h2>
      <p class="hint">Alle Teile haben bestätigte Jahreszeiten.</p>
      <button class="btn primary block" onclick="App.stopSort()">Zurück zum Schrank</button></div>`;
  }
  const it = todo[0];
  const gesamt = eigene().length;
  const gewaehlt = currentSeasonDraft(it);
  return `<h1 class="grosstitel">Jahreszeiten</h1>
  <p class="untertitel">Noch ${todo.length} – bisher nur aus der Wärme geraten.</p>
  <div class="fortschritt"><i style="width:${Math.round((gesamt - todo.length) * 100 / gesamt)}%"></i></div>
  <div class="card">
    <div class="checker"><img data-pic="${it.picId}" alt=""></div>
    <p class="center" style="margin:12px 0 4px; font-weight:600">${esc(it.name || '(ohne Namen)')}</p>
    <p class="center small" style="margin:0 0 10px">${esc(CATS[it.cat].label)} · ${esc(WARMTH_LBL[it.warmth || 3])}</p>
    <div class="chips" style="justify-content:center">
      ${SEASONS.map(s => `<button class="chip ${gewaehlt.includes(s.key) ? 'active' : ''}"
        onclick="App.seasonToggle('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}
    </div>
    <button class="btn primary block" style="margin-top:12px" onclick="App.seasonConfirm()"
      ${gewaehlt.length ? '' : 'disabled'}>Übernehmen und weiter</button>
    <button class="btn danger block" onclick="App.seasonSkip()">Später</button>
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
  const todo = eigene().filter(i => i.needsSort);
  if (!todo.length) {
    return `<h1 class="grosstitel">Nachsortieren</h1>
    <div class="card leer"><div class="leer-ico">${ico('check')}</div><h2>Alles sortiert</h2>
      <p class="hint">Alle Teile haben jetzt eine Unterkategorie.</p>
      <button class="btn primary block" onclick="App.stopSort()">Zurück zum Schrank</button></div>`;
  }
  const it = todo[0];
  const opts = (SORT_OPTIONS[it.cat] || CAT_ORDER).filter(c => sichtbareKats().includes(c));
  return `<h1 class="grosstitel">Nachsortieren</h1>
  <p class="untertitel">Noch ${todo.length} – tippe an, was es ist.</p>
  <div class="card">
    <div class="checker"><img data-pic="${it.picId}" alt=""></div>
    <p class="center" style="margin:12px 0 12px; font-weight:600">${esc(it.name || '(ohne Namen)')}</p>
    <div class="liste">
      ${opts.map(c => `<button class="zeile-l ohne-ico" onclick="App.sortInto('${it.id}','${c}')">
        <span class="ltext">${CATS[c].label}</span>${ico('chev', 'chev')}</button>`).join('')}
      <button class="zeile-l ohne-ico" onclick="App.editItem('${it.id}')"><span class="ltext">Andere Kategorie …</span>${ico('chev', 'chev')}</button>
    </div>
    <button class="btn danger block" style="margin-top:6px" onclick="App.sortSkip('${it.id}')">Später</button>
  </div>`;
}

function renderCloset() {
  if (UI.closetFilter === '_ohneki' && !eigene().some(i => !istAnalysiert(i))) UI.closetFilter = 'all';
  if (UI.closetFilter === 'wunsch' && !wuensche().length) UI.closetFilter = 'all';
  const f = UI.closetFilter;
  const counts = c => eigene().filter(i => i.cat === c).length;
  const todo = needsSortCount();
  const stodo = seasonTodoCount();
  const ohneKi = eigene().filter(i => !istAnalysiert(i)).length;
  const nWunsch = wuensche().length;
  if (UI.auswahl) return `<h1 class="grosstitel">${UI.auswahl.size} ausgewählt</h1>
  <p class="untertitel">Tippe weitere Teile an.</p>
  <div id="schrank-grid">${schrankGridHTML()}</div>
  <div style="height:70px"></div>
  <div class="auswahlleiste">
    <button class="btn" onclick="App.auswahlAlle()">${ico('check')} Alle</button>
    <button class="btn" onclick="App.auswahlTeilen()" ${UI.auswahl.size ? '' : 'disabled'}>${ico('upload')} Teilen</button>
    <button class="btn loeschen" onclick="App.auswahlLoeschen()" ${UI.auswahl.size ? '' : 'disabled'}>${ico('trash')} Löschen</button>
  </div>`;
  return `<h1 class="grosstitel">Schrank</h1>
  ${stodo ? `<button class="banner" onclick="App.startSort('season')">
    <span class="ico">${ico('leaf')}</span>
    <span><b>${stodo} ${stodo === 1 ? 'Teil braucht' : 'Teile brauchen'} Jahreszeiten</b>
    <span class="small">Einmal durchgehen und bestätigen</span></span>${ico('chev', 'chev')}</button>` : ''}
  ${todo ? `<button class="banner" onclick="App.startSort()">
    <span class="ico">${ico('layers')}</span>
    <span><b>${todo} ${todo === 1 ? 'Teil braucht' : 'Teile brauchen'} eine Unterkategorie</b>
    <span class="small">Aus der alten Version übernommen</span></span>${ico('chev', 'chev')}</button>` : ''}
  ${DB.items.length ? `<div class="suche">${ico('search')}<input type="search" placeholder="Im Schrank suchen"
      value="${esc(UI.suche || '')}" oninput="App.suche(this.value)" enterkeyhint="search"></div>
  <div class="chips zeile">
    <button class="chip ${f === 'all' ? 'active' : ''}" onclick="App.filterCloset('all')">Alle <span class="zahl">${eigene().length}</span></button>
    ${nWunsch ? `<button class="chip ${f === 'wunsch' ? 'active' : ''}" onclick="App.filterCloset('wunsch')">${ico('heart')} Wunschliste <span class="zahl">${nWunsch}</span></button>` : ''}
    ${ohneKi && ohneKi < eigene().length
      ? `<button class="chip ${f === '_ohneki' ? 'active' : ''}" onclick="App.filterCloset('_ohneki')">ohne KI <span class="zahl">${ohneKi}</span></button>` : ''}
    ${CAT_ORDER.filter(c => counts(c)).map(c =>
      `<button class="chip ${f === c ? 'active' : ''}" onclick="App.filterCloset('${c}')">${CATS[c].kurz} <span class="zahl">${counts(c)}</span></button>`).join('')}
  </div>` : ''}
  <div id="schrank-grid">${schrankGridHTML()}</div>`;
}

/* Raster getrennt, damit die Suche nur das Raster neu zeichnet – sonst
   verliert das Suchfeld bei jedem Buchstaben den Fokus */
function schrankGridHTML() {
  if (!DB.items.length) return `<div class="card leer">
    <div class="leer-ico">${ico('closet')}</div>
    <h2>Dein Schrank ist leer</h2>
    <p class="hint">Fotografiere dein erstes Teil. Am schönsten wird es, wenn du es in der
    Fotos-App freistellst: lange antippen, <b>Motiv kopieren</b>, hier einfügen.</p>
    <button class="btn primary block" onclick="App.aktion('neu')">${ico('plus')} Erstes Teil hinzufügen</button>
  </div>`;
  const f = UI.closetFilter;
  const q = (UI.suche || '').trim().toLowerCase();
  let list = f === 'all' ? eigene()
    : f === 'wunsch' ? wuensche()
    : f === '_ohneki' ? eigene().filter(i => !istAnalysiert(i))
    : eigene().filter(i => i.cat === f);
  if (q) list = list.filter(i => ((i.name || '') + ' ' + CATS[i.cat].label).toLowerCase().includes(q));
  const sorted = [...list].sort((a, b) =>
    CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || (b.addedAt || 0) - (a.addedAt || 0));
  if (!sorted.length) return `<p class="hint center" style="margin-top:30px">${q ? `Nichts gefunden für „${esc(UI.suche.trim())}".` : 'Noch nichts in dieser Kategorie.'}</p>`;
  const ungenutzt = f !== 'wunsch' && sorted.some(it => istUngenutzt(it.id));
  return `${f === 'wunsch' ? '<p class="hint" style="margin:0 4px 10px">Teile aus deinen Pins – sie fließen in keine Vorschläge ein. Antippen zeigt, wo es sie zu kaufen gibt.</p>' : ''}
    <p class="zaehler">${sorted.length} ${sorted.length === 1 ? 'Teil' : 'Teile'}</p>
    <div class="grid">${sorted.map(it => tileHTML(it)).join('')}</div>
    ${ungenutzt ? '<div class="legende"><span><i style="background:var(--red)"></i>noch in keinem Outfit</span></div>' : ''}`;
}
function tileHTML(it, onclick) {
  /* Nur echte Strings zählen: bei map(tileHTML) käme sonst der Index als onclick an */
  const action = typeof onclick === 'string' ? onclick : `App.editItem('${it.id}')`;
  /* Im Schrank: lange drücken startet die Auswahl, dann wählt jeder Tipp aus */
  const imSchrank = typeof onclick !== 'string';
  const wahl = imSchrank && UI.auswahl;
  const gewaehlt = wahl && UI.auswahl.has(it.id);
  return `<div class="tile${it.geloescht ? ' weg' : ''}${wahl ? ' waehlbar' : ''}${gewaehlt ? ' gewaehlt' : ''}" role="button"
    ${imSchrank ? `data-id="${it.id}"` : ''}
    onclick="${it.geloescht ? '' : wahl ? `App.auswahlTipp('${it.id}')` : `if (!App.langGedrueckt()) ${action}`}">
    ${wahl ? `<span class="wahl">${gewaehlt ? ico('check') : ''}</span>` : ''}
    ${it.needsSort ? '<span class="dot" title="Unterkategorie fehlt"></span>' : ''}
    ${!it.wunsch && istUngenutzt(it.id) ? '<span class="flag" title="In keiner gemerkten Kombination"></span>' : ''}
    <div class="thumbwrap"><img data-pic="${it.picId}" alt="${esc(it.name || '')}"></div>
    <div class="cap">${esc(it.name || CATS[it.cat].label)}${it.geloescht ? '<small>nicht mehr da</small>' : ''}</div>
  </div>`;
}

function renderOutfits() {
  let list = [...DB.outfits];
  if (UI.outTagFilter && UI.outTagFilter !== 'all') list = list.filter(o => outfitTag(o) === UI.outTagFilter);
  if (UI.outFilter) list = list.filter(o => o.ids.includes(UI.outFilter));
  if (UI.outTagFilter === 'unvollstaendig') list = [...DB.outfits].filter(outfitUnvollstaendig);
  const nUnvoll = DB.outfits.filter(outfitUnvollstaendig).length;
  list.sort(UI.outSort === 'saison'
    ? (x, y) => (TAG_ORDER[outfitTag(x)] - TAG_ORDER[outfitTag(y)]) || (y.date || '').localeCompare(x.date || '')
    : (x, y) => (y.date || '').localeCompare(x.date || ''));
  const gefiltert = UI.outFilter ? itemById(UI.outFilter) : null;
  const zaehl = k => DB.outfits.filter(o => outfitTag(o) === k).length;
  if (!DB.outfits.length) return `<h1 class="grosstitel">Outfits</h1>
    <div class="card leer"><div class="leer-ico">${ico('heart')}</div>
      <h2>Noch keine Outfits</h2>
      <p class="hint">Wische unter <i>Heute</i> nach rechts, um ein Outfit zu merken – oder stell selbst eines zusammen.</p>
      <button class="btn primary block" onclick="App.newOutfit()">${ico('plus')} Eigene Kombination</button></div>`;
  return `<h1 class="grosstitel">Outfits</h1>
  <div class="chips zeile">
    <button class="chip ${UI.outTagFilter === 'all' ? 'active' : ''}" onclick="App.setOutTag('all')">Alle <span class="zahl">${DB.outfits.length}</span></button>
    ${OUTFIT_TAGS.filter(t => zaehl(t.key)).map(t =>
      `<button class="chip ${UI.outTagFilter === t.key ? 'active' : ''}" onclick="App.setOutTag('${t.key}')">${ico(t.ico)} ${esc(t.label)} <span class="zahl">${zaehl(t.key)}</span></button>`).join('')}
    ${nUnvoll ? `<button class="chip ${UI.outTagFilter === 'unvollstaendig' ? 'active' : ''}" onclick="App.setOutTag('unvollstaendig')">${ico('minus')} Nicht mehr komplett <span class="zahl">${nUnvoll}</span></button>` : ''}
    <span class="trenner"></span>
    ${gefiltert
      ? `<button class="chip active" onclick="App.clearOutFilter()">${esc((gefiltert.name || CATS[gefiltert.cat].label).slice(0, 18))} ${ico('x')}</button>`
      : `<button class="chip" onclick="App.pickOutFilter()">${ico('search')} Mit Teil …</button>`}
  </div>
  ${segHTML('outsort', [['neu', 'Neueste'], ['saison', 'Nach Saison']], UI.outSort, 'App.setOutSort')}
  ${list.length ? `<div class="ogrid">${list.map(o => {
      const items = o.ids.map(itemById).filter(Boolean);
      return `<div class="ocell${outfitUnvollstaendig(o) ? ' unvoll' : ''}" role="button" onclick="App.openOutfit('${o.id}')">
        ${items.length ? collageHTML(items, { klein: true, tag: outfitTag(o) })
          : '<div class="collage klein empty"><span>leer</span></div>'}
        ${o.name ? `<div class="ocap">${esc(o.name)}</div>` : ''}
      </div>`;
    }).join('')}</div>`
    : `<p class="hint center" style="margin-top:30px">Kein Outfit passt zu diesem Filter.</p>`}`;
}

function renderDetail() {
  const o = DB.outfits.find(x => x.id === UI.detail);
  if (!o) return '';
  const items = o.ids.map(itemById).filter(Boolean);
  const fehlend = o.ids.length - items.length + items.filter(i => i.geloescht).length;
  const worlds = outfitWorlds(items);
  const tag = outfitTag(o);
  return `<div class="overlay" onclick="App.closeOutfit()"><div class="sheet" onclick="event.stopPropagation()">
    <div class="sheet-head">
      <h2>${o.name ? esc(o.name) : 'Outfit'}</h2>
      <button class="zu" onclick="App.closeOutfit()" aria-label="Schließen">${ico('x')}</button>
    </div>
    ${items.length ? collageHTML(items, { tag, tagLabel: true })
      : '<p class="hint">Alle Teile dieses Outfits wurden inzwischen gelöscht.</p>'}
    <div class="teileleiste">${items.map(it => tileHTML(it, `App.teilAusOutfit(&#39;${it.id}&#39;)`)).join('')}</div>
    ${fehlend ? `<p class="warn">${ico('minus')} ${fehlend} ${fehlend === 1 ? 'Teil ist' : 'Teile sind'} nicht mehr im Schrank – blass markiert.</p>` : ''}
    <h3 class="abschnitt" style="margin-left:0">Kategorie</h3>
    <div class="chips">
      ${OUTFIT_TAGS.map(t => `<button class="chip ${tag === t.key ? 'active' : ''}"
        onclick="App.setOutfitTag('${o.id}','${t.key}')">${ico(t.ico)} ${esc(t.label)}</button>`).join('')}
    </div>
    <span class="worldtags" style="margin-top:6px">${worlds.length
      ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
      : '<span class="wtag">nur Neutral</span>'}</span>
    <p class="meta">${o.own ? 'Selbst gebaut' : 'Gemerkt'} · ${fmtDate(o.date)}</p>
    <div class="sheet-fuss">
      <button class="btn primary block" onclick="App.editOutfit('${o.id}')">${ico('pencil')} Bearbeiten</button>
      <button class="btn danger block" onclick="App.delOutfit('${o.id}')">Outfit löschen</button>
    </div>
  </div></div>`;
}

/* --- Baukasten für eigene Kombinationen --- */
function slotRowHTML(slot, b) {
  const locked = b.locked || [];
  const gewaehlt = b.ids.map(itemById).filter(it => it && slot.cats.includes(it.cat));
  const max = slot.max || 1;
  const zeilen = gewaehlt.map(it => {
    const fix = locked.includes(it.id);
    return `<div class="zeile-l" role="button" onclick="App.pickSlot('${slot.key}')">
      <img data-pic="${it.picId}" alt="">
      <span class="ltext">${esc(it.name || CATS[it.cat].label)}<small>${esc(slot.label)}${fix ? ' · fixiert' : ''}</small></span>
      <button class="mini ${fix ? 'on' : ''}" onclick="event.stopPropagation(); App.toggleLock('${it.id}')"
        aria-label="${fix ? 'Fixierung lösen' : 'Fixieren'}">${ico(fix ? 'lock' : 'unlock')}</button>
      <button class="mini" onclick="event.stopPropagation(); App.unpick('${it.id}')" aria-label="Entfernen">${ico('x')}</button>
    </div>`;
  });
  if (gewaehlt.length < max) zeilen.push(`<button class="zeile-l" onclick="App.pickSlot('${slot.key}')">
      <span class="lico hell">${ico('plus')}</span>
      <span class="ltext">${esc(slot.label)}${gewaehlt.length ? ' – weiteres' : ''}</span>
      <span class="lwert">wählen</span>${ico('chev', 'chev')}</button>`);
  return zeilen.join('');
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
  return `<h1 class="grosstitel">${b.editId ? 'Bearbeiten' : 'Kombination'}</h1>
  <div class="baukasten">${items.length ? collageHTML(items)
      : '<div class="collage empty"><span>Wähle unten die Teile aus</span></div>'}</div>
  <div class="btn-row" style="margin:14px 0 4px">
    <button class="btn" onclick="App.rollRest()">${ico('dice')} Rest würfeln</button>
    <span class="small" style="flex:1">${b.locked.length
      ? b.locked.length + (b.locked.length === 1 ? ' Teil bleibt fix' : ' Teile bleiben fix')
      : 'Mit dem Schloss fixieren, dann würfeln'} · für ${esc(SEASONS.find(s => s.key === builderSeason()).label)}</span>
  </div>
  <h3 class="abschnitt">Teile</h3>
  <div class="liste">${SLOTS.filter(s => !(herren() && s.key === 'base_full')).map(s => slotRowHTML(s, b)).join('')}</div>
  <h3 class="abschnitt">Name</h3>
  <input type="text" value="${esc(b.name || '')}" placeholder="optional, z. B. Bürotag im Herbst"
    oninput="App.builderName(this.value)" style="background:var(--surface); box-shadow:var(--shadow-1)">
  <div class="worldtags" style="margin:12px 0 8px">
    ${seasons.length ? seasons.map(k =>
      `<span class="wtag">${ico(SEASONS.find(s => s.key === k).ico)} ${SEASONS.find(s => s.key === k).label}</span>`).join('')
      : '<span class="wtag">keine gemeinsame Jahreszeit</span>'}
    ${worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')}
  </div>
  ${zuBunt ? `<p class="warn">${worlds.length} bunte Farbwelten – über deiner Regel von ${MAX_WORLDS}.
    Speichern geht trotzdem, vorgeschlagen würde die Kombination aber nicht.</p>` : ''}
  <button class="btn primary block" style="margin-top:10px" onclick="App.saveOutfit()"
    ${items.length < 2 ? 'disabled' : ''}>Speichern</button>
  ${items.length < 2 ? '<p class="small center">Mindestens zwei Teile auswählen.</p>' : ''}`;
}

const trendLabel = g => g < 0.2 ? 'mein Stil' : g < 0.42 ? 'eher mein Stil'
  : g < 0.6 ? 'ausgewogen' : g < 0.82 ? 'eher Trend' : 'ganz Trend';

function renderTrends() {
  const t = DB.trends;
  const worlds = [...trendWorlds()];
  const p = DB.profil;
  const liste = (titel, arr, map) => arr && arr.length
    ? `<h3>${titel}</h3><span class="worldtags">${arr.map(x =>
        `<span class="wtag">${esc(map ? map[x].label : x)}</span>`).join('')}</span>` : '';
  const punkte = (titel, arr) => arr && arr.length
    ? `<h3>${titel}</h3><ul>${arr.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : '';
  return `<h1 class="grosstitel">Trends</h1>
  ${p ? `<div class="profil">
    <div class="quelle">${ico('sparkle')} Dein Stil</div>
    <blockquote>${esc(p.aesthetik)}</blockquote>
    ${liste('Stil', p.stil)}
    ${UI.profilOffen ? `
    ${liste('Silhouetten', p.silhouetten, SILHOUETTEN)}
    ${liste('Materialien', p.materialien, MATERIALIEN)}
    ${p.farbregeln ? `<h3>Farben</h3><ul><li>${esc(p.farbregeln)}</li></ul>` : ''}
    ${punkte('So kombinierst du', p.stylingregeln)}
    ${punkte('Vermeiden', p.vermeiden)}
    <h3>Gewichtung</h3>
    <div class="slider-row">
      <input type="range" min="0" max="1" step="0.05" value="${UI.trendGewicht}"
        oninput="App.setTrendGewicht(+this.value)">
      <span class="val" data-out="trendGewicht">${trendLabel(UI.trendGewicht)}</span>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn small" onclick="App.profilErstellen()">${ico('again')} Neu erstellen</button>
      <button class="btn small danger" onclick="App.profilLoeschen()">Entfernen</button>
    </div>
    <p class="small" style="margin:10px 0 0">Aus ${p.pins} Pins · ${fmtDate(p.erstellt)}</p>
    <button class="linkbtn hell" onclick="App.profilZu()">Weniger anzeigen</button>`
    : `<button class="linkbtn hell" onclick="App.profilAuf()">Regeln und Gewichtung ${ico('chevdown')}</button>`}
  </div>` : `<div class="card leer">
    <div class="leer-ico">${ico('sparkle')}</div>
    <h2>Dein Stilprofil</h2>
    <p class="hint">Aus deinen Pins liest die KI heraus, worauf dein Geschmack zielt – Silhouetten,
    Materialien, Farben – und übersetzt das in Regeln für die Vorschläge.</p>
    <button class="btn primary block" onclick="App.profilErstellen()" ${t.length >= 3 ? '' : 'disabled'}>${ico('sparkle')} Stilprofil erstellen</button>
    ${t.length < 3 ? `<p class="small">Noch ${3 - t.length} ${3 - t.length === 1 ? 'Pin' : 'Pins'} nötig.</p>` : ''}
  </div>`}
  ${worlds.length ? `<h3 class="abschnitt">Deine Farbwelten</h3>
    <span class="worldtags" style="margin:0 4px">${worlds.map(w => `<span class="wtag" style="background:var(--surface)">${esc(WORLD_LBL[w])}</span>`).join('')}</span>` : ''}
  <h3 class="abschnitt">Gesammelte Pins${t.length ? ' · ' + t.length : ''}</h3>
  ${t.length ? `<div class="pins">${t.map(x => `<div class="pin" role="button" onclick="App.pinAktion('${x.id}')">
      <img data-pic="${x.picId}" alt="">
      ${(x.colors || []).length ? `<div class="swatches">${x.colors.map(c => `<span class="sw" style="background:${esc(c)}"></span>`).join('')}</div>` : ''}
    </div>`).join('')}</div>
    <p class="small center" style="margin:6px 0 0">Antippen: Teile daraus auf die Wunschliste holen oder Pin entfernen.</p>`
    : `<div class="card leer"><div class="leer-ico">${ico('trends')}</div><h2>Noch keine Pins</h2>
      <p class="hint">Sammle Looks, die dir gefallen. Die App liest ihre Farben und bevorzugt sie in den Vorschlägen.</p>
      <button class="btn primary block" onclick="App.aktion('pin')">${ico('plus')} Pin hinzufügen</button></div>`}`;
}

function renderData() {
  const offen = eigene().filter(i => !istAnalysiert(i)).length;
  const zeile = (aufruf, icon, farbe, text, klein, extra = '') =>
    `<button class="zeile-l" onclick="${aufruf}"><span class="lico ${farbe}">${ico(icon)}</span>
      <span class="ltext">${text}${klein ? `<small>${klein}</small>` : ''}</span>${extra || ico('chev', 'chev')}</button>`;
  return `<h1 class="grosstitel">Daten</h1>
  <div class="kennzahlen">
    <div class="kennzahl"><b>${eigene().length}</b><span>Teile</span></div>
    <div class="kennzahl"><b>${DB.outfits.length}</b><span>Outfits</span></div>
    <div class="kennzahl"><b>${DB.trends.length}</b><span>Pins</span></div>
  </div>
  <p class="small" style="margin:8px 4px 0">Alles liegt auf diesem Gerät.
    <span id="usage" onclick="App.tippSpeicher()">Speicher wird ermittelt …</span></p>
  ${entwicklermodus() ? '<p class="small" style="margin:4px">Entwicklereinstellungen sichtbar – fünfmal auf die Speicherangabe tippen blendet sie aus.</p>' : ''}

  <h3 class="abschnitt">Mein Schrank</h3>
  ${segHTML('abteilung', [['damen', 'Damenmode'], ['herren', 'Herrenmode']], abteilung(), 'App.setAbteilung')}
  <p class="small" style="margin:-4px 4px 0">Steuert Kategorien, Shop-Links und die Vorschläge der Stylistin.</p>

  <h3 class="abschnitt">Sichern</h3>
  <div class="liste">
    ${zeile('App.exportData(true)', 'download', '', 'Backup mit Bildern', 'Vollständig – zum Umziehen oder Aufbewahren')}
    ${zeile('App.exportData(false)', 'download', 'hell', 'Nur Daten', 'Klein, ohne Fotos')}
    ${zeile('App.chooseImport()', 'upload', 'hell', 'Backup einlesen', 'Führt zusammen, überschreibt nichts Bestätigtes')}
  </div>

  <h3 class="abschnitt">Stilanalyse</h3>
  <div class="liste">
    ${zeile('App.analyseAlle()', 'sparkle', 'akzent', offen ? 'Teile analysieren' : 'Alle Teile analysiert',
      !dienstUrl() ? 'Zurzeit nicht verfügbar'
        : offen ? `${offen} von ${DB.items.length} ohne Silhouette, Material und Muster` : 'Silhouette, Material und Muster sind erkannt',
      offen && dienstUrl() ? '' : ico('check', 'chev'))}
    ${kiMeldung ? `<div class="zeile-l ohne-ico"><span class="ltext small" id="ki-fortschritt">${esc(kiMeldung)}</span>
      <button class="btn small" onclick="App.analyseStopp()">Anhalten</button></div>` : '<span id="ki-fortschritt" hidden></span>'}
  </div>

  <h3 class="abschnitt">Speicher</h3>
  <div class="liste">
    ${zeile('App.optimize()', 'shrink', 'hell', 'Bilder verkleinern', 'Spart Platz, die Collage bleibt scharf')}
  </div>
  <p class="small" id="optout" style="margin:4px"></p>

  ${entwicklermodus() ? `<h3 class="abschnitt">Verbrauch heute</h3>
  <div class="liste" id="verbrauch"><div class="zeile-l ohne-ico"><span class="ltext small">Wird abgefragt …</span></div></div>
  <h3 class="abschnitt">KI-Dienst</h3>
  <div class="card">
    <label class="fld">Worker-Adresse
      <input type="text" value="${esc((DB.prefs && DB.prefs.worker) || '')}"
        placeholder="https://outfit-ki.dein-konto.workers.dev"
        oninput="App.setWorker(this.value)">
    </label>
    <div class="btn-row">
      <button class="btn small" onclick="App.testWorker()">Verbindung prüfen</button>
      <span class="small" id="ki-status">${esc(kiStatus)}</span>
    </div>
    ${kiPunkte.length ? `<ul class="small" style="margin:8px 0 0; padding-left:18px">
      ${kiPunkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${kiDetail ? `<div style="margin-top:8px">
      <button class="btn small" onclick="App.kiDetailZeigen()">${kiZeigeDetail ? 'Details ausblenden' : 'Technische Details'}</button>
      ${kiZeigeDetail ? `<pre class="detail">${esc(kiDetail)}</pre>` : ''}
    </div>` : ''}
  </div>` : ''}

  <h3 class="abschnitt">Aufräumen</h3>
  <div class="liste">
    <button class="zeile-l rot" onclick="App.wipe()"><span class="lico rot">${ico('trash')}</span>
      <span class="ltext">Alles löschen</span></button>
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
      <button class="zu" onclick="App.studioCancel()" aria-label="Abbrechen">${ico('x')}</button>
    </div>
    <div class="studio-stage">
      ${laedt ? '<div class="studio-laden"><span class="spin"></span><span>Modell wird geladen …</span></div>'
              : '<canvas id="studio-cv"></canvas>'}
    </div>
    ${studioTeilHTML(s, laedt)}
    <p class="small center" style="margin:10px 0 4px">${
      s.nachgebildet ? 'Von der KI als Produktfoto nachgebildet – „Original ansehen" zeigt dein Foto.'
      : s.status === 'ki' ? 'Freigestellt – die Pixel des Teils bleiben unverändert.'
      : s.status === 'alpha' ? 'Bereits freigestellt – nur Licht und Zuschnitt werden angepasst.'
      : s.status === 'laden' ? 'Beim ersten Mal werden 15 MB geladen, danach läuft es offline.'
      : 'Einfacher Freisteller über Farbe und Kanten.'}</p>
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
      <button class="chip ${s.licht ? 'active' : ''}" onclick="App.studioToggleLicht()">${ico('sun')} Licht</button>
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
    <div class="sheet-fuss"><button class="btn primary block" onclick="App.studioCommit()">Übernehmen</button></div>`}
  </div></div>`;
}

/* Welches Teil soll ausgeschnitten werden? Einzahl, weil es um ein Stück geht */
const TEIL_NAME = { top: 'Oberteil', knit: 'Pullover', blouse: 'Bluse', pants: 'Hose', skirt: 'Rock',
  dress: 'Kleid', outer: 'Jacke', shoes: 'Schuhe', bag: 'Tasche', acc: 'Accessoire' };

function studioTeilHTML(s, laedt) {
  if (laedt || !dienstUrl()) return '';
  if (s.bildLaedt) return `<div class="studio-teil"><p class="small"><span class="spin mini"></span>
    Bilde ${esc(s.teilName || TEIL_NAME[s.teilKat] || 'das Teil')} als Produktfoto nach …</p></div>`;
  if (s.nachgebildet) return `<div class="studio-teil">
    <div class="btn-row">
      <button class="btn small" onclick="App.studioNachbilden()">${ico('dice')} Nochmal</button>
      <button class="btn small" onclick="App.studioNachbilden(true)" title="verbraucht etwa 14-mal so viel">${ico('sparkle')} Genauer</button>
      <button class="btn small" onclick="App.studioOriginal()">${ico('again')} Mein Foto verwenden</button>
    </div></div>`;
  const nachbilden = _dienst && _dienst.produktfoto;
  return `<div class="studio-teil">
    <p class="small">${s.teilLaedt ? `<span class="spin mini"></span> Suche ${TEIL_NAME[s.teilLaedt] === 'Schuhe' ? 'die Schuhe' : 'das Teil'} …`
      : s.umriss ? `Nur ${esc(TEIL_NAME[s.teilKat])} ausgeschnitten.`
      : nachbilden ? '<b>Was ist das?</b> Tippe an – die App macht daraus ein Produktfoto.'
      : 'Person, Bügel oder anderes mit im Bild? Tippe an, was ausgeschnitten werden soll:'}</p>
    ${!s.umriss && !s.teilLaedt ? `<button class="linkbtn" style="margin:-2px 0 6px" onclick="App.studioAlleTeile()">${ico('layers')} Mehrere Teile im Bild? Alle auf einmal übernehmen</button>` : ''}
    <div class="chips zeile">
      ${sichtbareKats().map(k => `<button class="chip mini ${s.teilKat === k ? 'active' : ''}"
        onclick="App.studioTeil('${k}')" ${s.teilLaedt ? 'disabled' : ''}>${s.teilLaedt === k ? '<span class="spin mini"></span>' : ''}${TEIL_NAME[k]}</button>`).join('')}
      ${s.umriss ? `<button class="chip mini leise" onclick="App.studioTeil(null)">Ganzes Motiv</button>` : ''}
    </div>
    ${nachbilden && s.umriss ? `<button class="btn small" style="margin-top:4px" onclick="App.studioNachbilden()">${ico('sparkle')} Als Produktfoto nachbilden</button>` : ''}
  </div>`;
}

/* Fähigkeiten des Dienstes einmal je Sitzung abfragen – etwa, ob Nachbilden
   freigeschaltet ist. Kostet kein Kontingent. */
let _dienst = null;
async function dienstFaehigkeiten() {
  if (_dienst || !dienstUrl()) return _dienst;
  try {
    const r = await fetch(dienstUrl() + '/status', { headers: { 'X-Geraet': geraetId() } });
    if (r.ok) _dienst = await r.json();
  } catch (e) {}
  return _dienst;
}

/* Englische Bezeichnung für das Bildmodell – FLUX versteht Englisch am besten */
const KAT_EN = { top: 'top', knit: 'knit sweater', blouse: 'blouse', pants: 'trousers', skirt: 'skirt',
  dress: 'dress', outer: 'jacket', shoes: 'pair of shoes', bag: 'bag', acc: 'accessory' };

/* Ausschnitt nach box_2d (0–1000) mit etwas Rand. Ein enger Ausschnitt gibt dem
   Bildmodell mehr Pixel vom Teil – ganz ohne erfand es Details. */
function ausschnittCanvas(cv, box, rand = 0.05) {
  if (!box || box.length !== 4) return cv;
  const [y0, x0, y1, x1] = box.map(v => clamp(v, 0, 1000) / 1000);
  const w = cv.width, h = cv.height;
  const r = rand * Math.max((x1 - x0) * w, (y1 - y0) * h);
  const sx = Math.max(0, x0 * w - r), sy = Math.max(0, y0 * h - r);
  const sw = Math.min(w, x1 * w + r) - sx, sh = Math.min(h, y1 * h + r) - sy;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw)); out.height = Math.max(1, Math.round(sh));
  out.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

/* Umriss → umschließende Box im selben Maß */
function boxAusUmriss(u) {
  if (!u || !u.length) return null;
  const ys = u.map(p => p[0]), xs = u.map(p => p[1]);
  return [Math.min(...ys), Math.min(...xs), Math.max(...ys), Math.max(...xs)];
}

/* ---- Farbe treu halten ----
   Das Bildmodell hellt gern auf: eine sandbeige Leinenhose kam fast weiß zurück.
   Deshalb wird die Stofffarbe im Originalfoto gemessen und das Ergebnis danach
   im Lab-Raum dorthin geschoben – Helligkeit etwas vorsichtiger, weil Fotos
   drinnen oft zu dunkel sind. */
const srgbLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const linSrgb = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
function rgbLab(r, g, b) {
  const R = srgbLin(r), G = srgbLin(g), B = srgbLin(b);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function labRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const g = t => t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787;
  const X = g(fx) * 0.95047, Y = g(fy), Z = g(fz) * 1.08883;
  return [linSrgb(3.2406 * X - 1.5372 * Y - 0.4986 * Z), linSrgb(-0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    linSrgb(0.0557 * X - 0.2040 * Y + 1.0570 * Z)].map(v => clamp(Math.round(v), 0, 255));
}
const hexLab = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null;
  const n = parseInt(m[1], 16); return rgbLab(n >> 16 & 255, n >> 8 & 255, n & 255); };
const median = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };

/* Mittlere Stofffarbe im Original: Kern der Box (oder des Umrisses), Ausreißer weg */
function messeStoff(cv, box, umriss) {
  const kern = box ? [box[0] + (box[2] - box[0]) * 0.3, box[1] + (box[3] - box[1]) * 0.3,
    box[2] - (box[2] - box[0]) * 0.3, box[3] - (box[3] - box[1]) * 0.3] : [300, 300, 700, 700];
  const t = ausschnittCanvas(cv, kern, 0);
  const k = Math.min(1, 120 / Math.max(t.width, t.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(t.width * k)); c.height = Math.max(1, Math.round(t.height * k));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(t, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const L = [], A = [], B = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const [l, a, b] = rgbLab(d[i], d[i + 1], d[i + 2]);
    L.push(l); A.push(a); B.push(b);
  }
  return L.length > 30 ? [median(L), median(A), median(B)] : null;
}

/* Zielfarbe: gemessen, außer die Messung liegt weit weg von dem, was die Erkennung
   sah – dann lag im Kern der Box vermutlich ein anderes Teil. */
function zielFarbe(cv, box, hex) {
  const m = messeStoff(cv, box), h = hexLab(hex);
  if (!m) return h;
  if (!h) return m;
  const dE = Math.hypot(m[0] - h[0], m[1] - h[1], m[2] - h[2]);
  if (dE > 28) return h;
  /* Mittel aus Messung und Einschätzung bei Tageslicht – die Messung allein trägt
     den Farbstich des Raumlichts mit (ein grauweißes Shirt wurde so braun) */
  return [(m[0] + h[0]) / 2, (m[1] + h[1]) / 2, (m[2] + h[2]) / 2];
}

function farbAngleich(cv, ziel, staerkeL = 0.65, staerkeC = 0.85) {
  if (!ziel) return cv;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  const L = [], A = [], B = [];
  const schritt = Math.max(1, Math.floor(d.length / 4 / 40000)) * 4;
  for (let i = 0; i < d.length; i += schritt) {
    if (d[i + 3] < 220) continue;
    const [l, a, b] = rgbLab(d[i], d[i + 1], d[i + 2]);
    L.push(l); A.push(a); B.push(b);
  }
  if (L.length < 50) return cv;
  /* Begrenzt schieben: nahezu unbunte Teile (Weiß, Grau, Schwarz) nur in der
     Helligkeit, nie in einen Farbton; alles andere höchstens ein Stück weit */
  const zielBunt = Math.hypot(ziel[1], ziel[2]);
  const kappe = (v, m) => clamp(v, -m, m);
  const dL = kappe((ziel[0] - median(L)) * staerkeL, 10);
  const da = zielBunt < 8 ? 0 : kappe((ziel[1] - median(A)) * staerkeC, 7);
  const db = zielBunt < 8 ? 0 : kappe((ziel[2] - median(B)) * staerkeC, 7);
  if (Math.abs(dL) < 1.5 && Math.abs(da) < 1.5 && Math.abs(db) < 1.5) return cv;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [l, a, b] = rgbLab(d[i], d[i + 1], d[i + 2]);
    const [r, g, bl] = labRgb(clamp(l + dL, 0, 100), a + da, b + db);
    d[i] = r; d[i + 1] = g; d[i + 2] = bl;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* Ein Teil als Produktfoto nachbilden lassen und gleich vom weißen Grund lösen */
/* Auf Arbeitsgröße bringen: zu kleine Ausschnitte (Tasche in einem Pin) lehnt
   das Modell mit „Invalid input" ab, größere als 512 Pixel ebenso */
function aufMass(cv, min = 320, max = 504) {
  const k = clamp(min / Math.min(cv.width, cv.height), Math.min(1, max / Math.max(cv.width, cv.height)), max / Math.max(cv.width, cv.height));
  if (Math.abs(k - 1) < 0.01) return cv;
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(cv.width * k)); t.height = Math.max(1, Math.round(cv.height * k));
  const c = t.getContext('2d'); c.imageSmoothingQuality = 'high';
  c.drawImage(cv, 0, 0, t.width, t.height);
  return t;
}

async function nachbilden(cv, box, kat, beschreibung, qualitaet, extra = {}) {
  const bild = await studioBild64(aufMass(ausschnittCanvas(cv, box)), 512);
  /* Zweite Vorlage: Nahaufnahme aus der Mitte des Teils, damit Farbe und Muster
     nicht in 512 Pixeln verloren gehen */
  const kern = box ? [box[0] + (box[2] - box[0]) * 0.32, box[1] + (box[3] - box[1]) * 0.32,
    box[2] - (box[2] - box[0]) * 0.32, box[3] - (box[3] - box[1]) * 0.32] : null;
  const kernCv = kern ? ausschnittCanvas(cv, kern, 0) : null;
  const detail = kernCv && Math.min(kernCv.width, kernCv.height) >= 48 ? await studioBild64(aufMass(kernCv, 256), 512) : '';
  const j = await dienstAnfrage('/produktfoto', { bild, detail, kategorie: TEIL_NAME[kat], kategorieEn: KAT_EN[kat],
    beschreibung: beschreibung || '', farbe: extra.farbe || '', muster: extra.muster || '',
    qualitaet: qualitaet || 'schnell' }, 2);
  const img = await loadImg(`data:${j.mime || 'image/jpeg'};base64,${j.bild}`);
  return canvasFrom(img, STUDIO_WORK);
}
async function vomWeissLoesen(cv) {
  let maskCv = null;
  try { maskCv = await kiMaske(cv); } catch (e) { /* Rückfall: Farbe und Kanten */ }
  return studioRender(cv, { maskCv, freistellen: !maskCv, tol: 0.3, licht: false, schatten: false, belichtung: 0 });
}
const bildFehler = e => {
  const m = String((e && e.message) || e || '');
  if (/Workers AI|neuron|daily|4006|capacity|Produktfotos aufgebraucht/i.test(m)) return 'Für heute sind die kostenlosen Produktfotos aufgebraucht. Morgen geht es weiter.';
  if (/3046|Zeitüberschreitung|timeout|524/i.test(m)) return 'Der Bilddienst antwortet gerade nicht. Nimm vorerst dein Foto – über „Produktfoto neu erzeugen" im Teil geht es später.';
  const t = fehlerText(e);
  return /Stilanalyse/.test(t) ? 'Das Produktfoto ließ sich gerade nicht erzeugen. Versuch es gleich noch einmal.' : t;
};

/* Studio-Bild als JPEG für den Dienst – transparente Stellen auf hellem Grund */
async function studioBild64(cv, max = 1024) {
  const k = Math.min(1, max / Math.max(cv.width, cv.height));
  const t = document.createElement('canvas');
  t.width = Math.round(cv.width * k); t.height = Math.round(cv.height * k);
  const c = t.getContext('2d');
  c.fillStyle = '#f2efec'; c.fillRect(0, 0, t.width, t.height);
  c.drawImage(cv, 0, 0, t.width, t.height);
  return (await blobToDataURL(await canvasToBlob(t, 'image/jpeg', 0.86))).split(',')[1];
}

const studioOpts = s => ({
  maskCv: s.maskCv || null,
  umriss: s.umriss || null,
  freistellen: !s.hatAlpha && !s.maskCv,
  tol: s.tol, belichtung: s.belichtung, licht: s.licht, schatten: s.schatten
});

/* Vorschau rechnet auf kleiner Auflösung – sonst ruckelt der Regler */
let studioZeichnen = null;
function drawStudioPreview() {
  const s = UI.studio;
  const cv = $('#studio-cv');
  if (!s || !cv) return;
  let quelle = s.zeigeVorher ? s.vorher : studioRender(s.klein, studioOpts(s));
  if (!s.zeigeVorher && s.nachgebildet && s.zielFarbe) quelle = farbAngleich(quelle, s.zielFarbe);
  cv.width = quelle.width; cv.height = quelle.height;
  cv.getContext('2d').drawImage(quelle, 0, 0);
}

const GRUND_ICO = { farben: 'palette', schuhe: 'shoe', zuschick: 'sparkle', zuleger: 'tee',
  stil: 'blitz', saison: 'leaf', layer: 'layers' };

function blattKopf(titel, zu) {
  return `<div class="sheet-head"><h2>${titel}</h2>
    <button class="zu" onclick="${zu}" aria-label="Schließen">${ico('x')}</button></div>`;
}

function renderModal() {
  if (UI.studio) return renderStudio();
  if (UI.detail) return renderDetail();
  if (UI.tossOffen && UI.tab === 'today' && !UI.builder && !UI.sorting) {
    return `<div class="overlay leicht" onclick="App.tossZurueck()"><div class="sheet kurz" onclick="event.stopPropagation()">
      ${blattKopf('Was hat nicht gepasst?', 'App.tossZurueck()')}
      <div class="gruende">${TOSS_GRUENDE.map(([k, l]) =>
        `<button onclick="App.tossMit('${k}')">${ico(GRUND_ICO[k] || 'x')}${esc(l)}</button>`).join('')}
        <button class="leise" onclick="App.tossMit('')">${ico('minus')}Keine Angabe</button>
      </div>
    </div></div>`;
  }
  if (UI.modal === 'ort') {
    const fest = DB.prefs && DB.prefs.ort;
    return `<div class="overlay" onclick="App.aktionZu()"><div class="sheet kurz" onclick="event.stopPropagation()">
      ${blattKopf('Wetter-Ort', 'App.aktionZu()')}
      <div class="liste">
        <button class="zeile-l" onclick="App.ortWaehlen(null)"><span class="lico ${fest ? 'hell' : 'akzent'}">${ico('ort')}</span>
          <span class="ltext">Aktueller Standort</span>${fest ? '' : ico('check', 'chev')}</button>
        ${fest ? `<div class="zeile-l"><span class="lico akzent">${ico('check')}</span><span class="ltext">${esc(fest.name)}</span></div>` : ''}
      </div>
      <div class="suche" style="margin-top:12px">${ico('search')}<input type="search" id="ortsuche" placeholder="Stadt suchen"
        oninput="App.ortSuche(this.value)" enterkeyhint="search"></div>
      <div class="liste" id="orttreffer"></div>
    </div></div>`;
  }
  if (UI.modal === 'saison') {
    return `<div class="overlay" onclick="App.aktionZu()"><div class="sheet kurz" onclick="event.stopPropagation()">
      ${blattKopf('Jahreszeit', 'App.aktionZu()')}
      <div class="liste">${SEASONS.map(s => `<button class="zeile-l" onclick="App.waehleSaison('${s.key}')">
        <span class="lico ${UI.season === s.key ? 'akzent' : 'hell'}">${ico(s.ico)}</span>
        <span class="ltext">${s.label}</span>${UI.season === s.key ? ico('check', 'chev') : ''}</button>`).join('')}</div>
    </div></div>`;
  }
  if (UI.modal === 'neu' || UI.modal === 'pin') {
    const pin = UI.modal === 'pin';
    return `<div class="overlay" onclick="App.aktionZu()"><div class="sheet kurz" onclick="event.stopPropagation()">
      ${blattKopf(pin ? 'Pin hinzufügen' : 'Neues Teil', 'App.aktionZu()')}
      <div class="liste">
        ${pin ? '' : `<button class="zeile-l" onclick="App.neuAus('camera')"><span class="lico">${ico('camera')}</span>
          <span class="ltext">Foto machen</span>${ico('chev', 'chev')}</button>`}
        <button class="zeile-l" onclick="App.neuAus('library')"><span class="lico hell">${ico('image')}</span>
          <span class="ltext">Aus Fotos wählen</span>${ico('chev', 'chev')}</button>
        <button class="zeile-l" onclick="App.neuAus('paste')"><span class="lico hell">${ico('paste')}</span>
          <span class="ltext">Einfügen<small>${pin ? 'Bild aus der Zwischenablage' : 'Freigestelltes Motiv aus der Zwischenablage'}</small></span>${ico('chev', 'chev')}</button>
      </div>
      ${pin || !dienstUrl() ? '' : `<div class="liste" style="margin-top:10px">
        <button class="zeile-l" onclick="App.neuAus('haufen')"><span class="lico akzent">${ico('layers')}</span>
          <span class="ltext">Mehrere Teile auf einem Foto<small>Ein Stapel auf dem Bett – jedes Teil wird erkannt und zum Produktfoto</small></span>${ico('chev', 'chev')}</button>
      </div>`}
      <p class="small" style="margin:12px 4px 0">${pin
        ? 'In Pinterest den Pin öffnen → Teilen → <b>Bild sichern</b>, dann hier aus Fotos wählen.'
        : 'Am schönsten: in der Fotos-App das Teil lange antippen → <b>Motiv kopieren</b> → hier einfügen.'}</p>
    </div></div>`;
  }
  if (UI.modal === 'haufen') return renderHaufen();
  if (UI.modal === 'pin-aktion') {
    const p = DB.trends.find(x => x.id === UI.pinId);
    if (!p) return '';
    return `<div class="overlay" onclick="App.aktionZu()"><div class="sheet kurz" onclick="event.stopPropagation()">
      ${blattKopf('Pin', 'App.aktionZu()')}
      <div class="checker" style="min-height:0; padding:10px"><img data-pic="${p.picId}" alt="" style="max-height:220px; border-radius:12px; filter:none"></div>
      <div class="liste" style="margin-top:12px">
        ${dienstUrl() ? `<button class="zeile-l" onclick="App.pinZerlegen('${p.id}')"><span class="lico akzent">${ico('layers')}</span>
          <span class="ltext">Teile auf die Wunschliste<small>Jedes Teil des Looks als Produktfoto – mit Shop-Links</small></span>${ico('chev', 'chev')}</button>` : ''}
        <button class="zeile-l rot" onclick="App.pinLoeschen('${p.id}')"><span class="lico rot">${ico('trash')}</span>
          <span class="ltext">Pin entfernen</span></button>
      </div>
    </div></div>`;
  }
  if (UI.modal === 'pick') return renderPicker();
  if (UI.modal === 'itempick') return renderItemPicker();
  if (UI.modal !== 'item' || !UI.draft) return '';
  const d = UI.draft;
  const isNew = !itemById(d.id);
  const worlds = itemWorlds(d);
  return `<div class="overlay" onclick="App.cancelItem()"><div class="sheet" onclick="event.stopPropagation()">
    ${blattKopf(isNew ? 'Neues Teil' : 'Bearbeiten', 'App.cancelItem()')}
    <div class="checker"><img data-pic="${d.picId}" alt="" id="teilbild" style="${farbFilterCss(d.anpassung)}"></div>
    <div class="nacharbeit">
      <button class="chip mini ${UI.anpassen ? 'active' : ''}" onclick="App.anpassenAuf()">${ico('palette')} Farbe anpassen</button>
      ${d.vorlagePicId && dienstUrl() ? `<button class="chip mini" onclick="App.teilNeuErzeugen()" ${UI.teilErzeugt ? 'disabled' : ''}>${UI.teilErzeugt ? '<span class="spin mini"></span> Wird erzeugt …' : `${ico('dice')} Produktfoto neu erzeugen`}</button>
      <button class="chip mini" onclick="App.teilNeuErzeugen(true)" ${UI.teilErzeugt ? 'disabled' : ''}>${ico('sparkle')} Genauer</button>` : ''}
    </div>
    ${UI.anpassen ? `<div class="card kompakt" style="margin:8px 0 0">
      <label class="fld">Helligkeit<div class="slider-row"><input type="range" min="-40" max="40" step="1" value="${(d.anpassung || {}).hell || 0}" oninput="App.anpassen('hell', +this.value)"><span class="val" data-out="hell">${(d.anpassung || {}).hell || 0}</span></div></label>
      <label class="fld">Farbigkeit<div class="slider-row"><input type="range" min="-100" max="60" step="1" value="${(d.anpassung || {}).farbig || 0}" oninput="App.anpassen('farbig', +this.value)"><span class="val" data-out="farbig">${(d.anpassung || {}).farbig || 0}</span></div></label>
      <label class="fld">Wärme<div class="slider-row"><input type="range" min="-30" max="30" step="1" value="${(d.anpassung || {}).warm || 0}" oninput="App.anpassen('warm', +this.value)"><span class="val" data-out="warm">${(d.anpassung || {}).warm || 0}</span></div></label>
      <p class="small" style="margin:0">Braunstich weg: Farbigkeit nach links. Wird beim Speichern übernommen.</p>
    </div>` : ''}
    ${d.nachgebildet ? `<p class="small center" style="margin:8px 0 0">${ico('sparkle')} Von der KI als Produktfoto nachgebildet</p>` : ''}
    ${d.wunsch ? `<div class="banner" style="margin:12px 0 0" role="button" onclick="App.wunschGekauft()">
      <span class="ico">${ico('heart')}</span><span><b>Auf deiner Wunschliste</b>
      <span class="small">Gekauft? Hier tippen – dann kommt es in deinen Schrank.</span></span>${ico('chev', 'chev')}</div>
      ${shopHTML(d, 'Kaufen')}` : ''}
    ${d.cut ? '' : `<p class="warn" style="margin:8px 0 0">Der Hintergrund ist noch dran. Tipp: in der Fotos-App
      das Teil lange antippen, <b>Motiv kopieren</b>, dann hier einfügen.</p>`}
    <input type="text" value="${esc(d.name || '')}" placeholder="Name, z. B. ${esc(CATS[d.cat].label)} Creme"
      oninput="App.draftSet('name', this.value, true)" style="margin-top:14px; font-size:17px; font-weight:600">
    <h3 class="abschnitt" style="margin-left:0">Kategorie</h3>
    <div class="chips">
      ${sichtbareKats().concat(sichtbareKats().includes(d.cat) ? [] : [d.cat]).map(c => `<button class="chip ${d.cat === c ? 'active' : ''}"
        onclick="App.draftSet('cat','${c}')">${CATS[c].label}</button>`).join('')}
    </div>
    <h3 class="abschnitt" style="margin-left:0">Jahreszeiten</h3>
    <div class="chips">
      ${SEASONS.map(s => `<button class="chip ${(d.seasons || []).includes(s.key) ? 'active' : ''}"
        onclick="App.draftSeason('${s.key}')">${ico(s.ico)} ${s.label}</button>`).join('')}
    </div>
    <h3 class="abschnitt" style="margin-left:0">Eigenschaften</h3>
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
    <div class="liste">
      <button class="zeile-l ohne-ico" onclick="App.draftSport()">
        <span class="ltext">Sportbekleidung<small>Erscheint nur beim Anlass „Sport"</small></span>
        <span class="schalter ${istSport(d) ? 'on' : ''}"></span></button>
    </div>
    <h3 class="abschnitt" style="margin-left:0">Stil</h3>
    ${(() => {
      const k = d.ki;
      if (!k || !k.analysiert) return `<button class="btn block" onclick="App.analyseEins('${d.id}')">${ico('sparkle')} Mit KI analysieren</button>`;
      const chip = t => `<span class="wtag">${esc(t)}</span>`;
      return `<span class="worldtags">
        ${k.silhouette ? chip(SILHOUETTEN[k.silhouette].label) : ''}
        ${k.material ? chip(MATERIALIEN[k.material].label) : ''}
        ${k.muster && k.muster !== 'uni' ? chip(MUSTER[k.muster].label) : ''}
        ${k.farbe ? chip(k.farbe) : ''}
        ${(k.stil || []).map(chip).join('')}
      </span>
      <div><button class="linkbtn" style="margin-top:6px" onclick="App.analyseEins('${d.id}')">${ico('again')} Neu analysieren</button></div>`;
    })()}
    ${d.wunsch ? '' : shopHTML(d, 'Ähnliches finden')}
    <h3 class="abschnitt" style="margin-left:0">Farben</h3>
    <div class="swatches">
      ${(d.colors || []).map(c => `<span class="sw big" style="background:${esc(c)}"></span>`).join('')
        || '<span class="small">keine erkannt</span>'}
    </div>
    <span class="worldtags" style="margin-top:10px">${worlds.length
      ? worlds.map(w => `<span class="wtag">${esc(WORLD_LBL[w])}</span>`).join('')
      : '<span class="wtag">Neutral</span>'}</span>
    ${isNew ? '' : '<button class="btn danger block" style="margin-top:18px" onclick="App.deleteItem()">Teil löschen</button>'}
    <div class="sheet-fuss">
      <button class="btn primary block" onclick="App.saveItem()">Speichern</button>
    </div>
  </div></div>`;
}

function renderItemPicker() {
  const list = [...eigene()].sort((a, b) =>
    CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || (a.name || '').localeCompare(b.name || ''));
  return `<div class="overlay" onclick="App.closeItemPick()"><div class="sheet" onclick="event.stopPropagation()">
    ${blattKopf('Outfits mit …', 'App.closeItemPick()')}
    ${list.length ? `<div class="grid">${list.map(it =>
        tileHTML(it, `App.chooseOutFilter(&#39;${it.id}&#39;)`)).join('')}</div>`
      : '<p class="hint">Der Schrank ist leer.</p>'}
  </div></div>`;
}

function renderPicker() {
  const slot = SLOTS.find(s => s.key === UI.picker);
  if (!slot) return '';
  const list = eigene().filter(i => slot.cats.includes(i.cat))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return `<div class="overlay" onclick="App.closePick()"><div class="sheet" onclick="event.stopPropagation()">
    ${blattKopf(esc(slot.label), 'App.closePick()')}
    ${list.length ? `<div class="grid">${list.map(it =>
        tileHTML(it, `App.choosePick(&#39;${it.id}&#39;)`)).join('')}</div>`
      : '<p class="hint">In dieser Kategorie ist noch nichts im Schrank.</p>'}
  </div></div>`;
}

/* Wischen: nur waagerecht, damit die Seite senkrecht scrollbar bleibt */
function attachSwipe() {
  const card = $('#card');
  if (!card) return;
  /* Folgt dem Finger, kippt je nach Griffpunkt und entscheidet nach Weg ODER
     Schwung – ein kurzer, schneller Wisch reicht wie in jeder Dating-App. */
  const WEG = 110, SCHWUNG = 0.55;
  let sx = 0, sy = 0, dx = 0, dy = 0, zieht = false, oben = 1, lt = 0, lx = 0, vx = 0;
  const stamps = k => card.querySelector('.stamp.' + k);
  const zeige = () => {
    const t = Math.min(1, Math.max(0, (dx - 20) / 80)), s = Math.min(1, Math.max(0, (-dx - 20) / 80));
    stamps('take').style.opacity = t; stamps('take').style.transform = `rotate(-10deg) scale(${0.8 + t * 0.2})`;
    stamps('toss').style.opacity = s; stamps('toss').style.transform = `rotate(10deg) scale(${0.8 + s * 0.2})`;
  };
  card.addEventListener('pointerdown', e => {
    if (card.classList.contains('toss-offen')) return;   /* erst Grund wählen */
    zieht = true; sx = lx = e.clientX; sy = e.clientY; dx = dy = 0; vx = 0; lt = performance.now();
    const r = card.getBoundingClientRect();
    oben = (e.clientY - r.top) < r.height / 2 ? 1 : -1;
    card.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
  });
  card.addEventListener('pointermove', e => {
    if (!zieht) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    const jetzt = performance.now();
    if (jetzt > lt) { vx = 0.7 * vx + 0.3 * ((e.clientX - lx) / (jetzt - lt)); lx = e.clientX; lt = jetzt; }
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dx) < 20) return;  /* senkrecht scrollen lassen */
    card.style.transform = `translate(${dx}px, ${dy * 0.2}px) rotate(${oben * dx / 20}deg)`;
    zeige();
  });
  const ende = () => {
    if (!zieht) return;
    zieht = false;
    card.style.transition = '';
    if (dx > WEG || (vx > SCHWUNG && dx > 30)) App.decide('take');
    else if (dx < -WEG || (vx < -SCHWUNG && dx < -30)) App.tossFrage();
    else {
      card.style.transform = '';
      card.querySelectorAll('.stamp').forEach(s => { s.style.opacity = 0; s.style.transform = ''; });
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

App.setTab = tab => { UI.auswahl = null; UI.tab = tab; UI.modal = null; UI.sorting = false; UI.builder = null; UI.picker = null; UI.queue = null; UI.detail = null;
UI.studio = null;
UI.seasonDraft = null; UI.seasonDraftId = null; render(); };
App.filterCloset = c => { UI.closetFilter = c; render(); };
App.setSeason = s => { UI.season = s; UI.queue = null; render(); };
App.setMood = v => { UI.mood = v; UI.queue = null; render(); };

/* Take / Toss / Not today */
/* Take: Favorit, wandert in Outfits.
   Like: tragbar, aber nicht souverän – kein Favorit, aber auch kein Fehler.
         Für das Lernen ein schwaches Plus, zwei Wochen Ruhe.
   Toss: klappt zuerst die Frage nach dem Grund auf, direkt unter der Karte. */
App.decide = (what, grund) => {
  const c = UI.queue && UI.queue[0];
  if (!c) return;
  const key = outfitKey(c.ids);
  const warOffen = !!UI.tossOffen;
  UI.tossOffen = null;
  if (warOffen) renderOverlay();
  if (what === 'take') {
    if (!DB.outfits.some(o => outfitKey(o.ids) === key)) {
      DB.outfits.push({ id: uid(), date: todayISO(), ids: [...c.ids], liked: true,
        tag: autoTag(c.ids.map(itemById).filter(Boolean)) });
    }
    toast('Gemerkt – liegt unter Outfits');
  } else if (what === 'toss') {
    DB.tossed = DB.tossed || [];
    if (!DB.tossed.includes(key)) DB.tossed.push(key);
    if (grund) { DB.tossGruende = DB.tossGruende || {}; DB.tossGruende[key] = grund; }
  } else {
    DB.okay = DB.okay || {};
    DB.okay[key] = todayISO();
  }
  save();
  UI.queue.shift();
  const card = $('#card');
  if (!card) return render();
  const weit = window.innerWidth + 160;
  const x = what === 'take' ? weit : what === 'toss' ? -weit : 0;
  const y = what === 'like' ? -window.innerHeight * 0.7 : 40;
  card.style.transition = 'transform .38s cubic-bezier(.4,0,.6,1), opacity .38s ease';
  card.style.transform = `translate(${x}px, ${y}px) rotate(${x / 22}deg)` + (what === 'like' ? ' scale(.9)' : '');
  card.style.opacity = what === 'like' ? '0' : '1';
  const st = card.querySelector('.stamp.' + what);
  if (st) { st.style.opacity = 1; st.style.transform = ''; }
  UI._neueKarte = true;
  setTimeout(render, 300);
};
/* Toss öffnet das Gründe-Blatt, ohne die Karte neu zu zeichnen – so kippt
   sie sichtbar zur Seite statt zu springen. */
App.tossFrage = () => {
  const c = UI.queue && UI.queue[0];
  if (!c) return;
  UI.tossOffen = outfitKey(c.ids);
  const card = $('#card');
  if (card) {
    card.style.transform = '';
    card.querySelectorAll('.stamp').forEach(s => { s.style.opacity = ''; s.style.transform = ''; });
    card.classList.add('toss-offen');
  }
  renderOverlay();
};
App.tossMit = grund => App.decide('toss', grund);
App.tossZurueck = () => {
  UI.tossOffen = null;
  const card = $('#card');
  if (card) card.classList.remove('toss-offen');
  renderOverlay();
};
App.aktion = name => { UI.modal = name; renderOverlay(); };
App.aktionZu = () => { UI.modal = null; renderOverlay(); };
App.waehleSaison = k => { UI.modal = null; App.setSeason(k); };
/* Dateiauswahl muss im selben Tipp passieren, sonst blockiert iOS sie */
App.neuAus = quelle => {
  const pin = UI.modal === 'pin';
  UI.modal = null;
  renderOverlay();
  if (pin) { quelle === 'paste' ? App.pasteTrend() : App.addTrend(); return; }
  if (quelle === 'haufen') { App.haufenFoto('library'); return; }
  quelle === 'paste' ? App.pasteItem() : App.addItem(quelle);
};
App.suche = v => {
  UI.suche = v;
  const g = $('#schrank-grid');
  if (!g) return;
  _usedIds = null;
  g.innerHTML = schrankGridHTML();
  hydratePics();
};
App.profilAuf = () => { UI.profilOffen = true; render(); };
App.profilZu = () => { UI.profilOffen = false; render(); };
App.pinAktion = id => { UI.pinId = id; UI.modal = 'pin-aktion'; renderOverlay(); };
App.pinLoeschen = async id => { UI.modal = null; renderOverlay(); await App.delTrend(id); };
App.pinZerlegen = async id => {
  const p = DB.trends.find(x => x.id === id);
  if (!p) return;
  const blob = await picGet(p.picId);
  if (!blob) { toast('Das Bild des Pins fehlt.'); return; }
  UI.modal = null;
  await openHaufen(blob, true);
  if (UI.haufen) UI.haufen.pinId = id;
};
App.wunschGekauft = () => {
  const d = UI.draft;
  if (!d) return;
  delete d.wunsch; delete d.pinId;
  d.seasonsAuto = true;
  toast('Willkommen im Schrank! Speichern nicht vergessen.');
  render();
};

/* Shop-Links: echte Suchseiten mit einem präzisen Suchbegriff. Eine echte
   Produktrecherche per Google-Suche ist im kostenlosen Gemini-Tarif gesperrt –
   mit Abrechnung sind 1.500 Suchen am Tag frei, dann kommt sie hier dazu. */
const shopHTML = (d, titel) => `<h3 class="abschnitt" style="margin-left:0">${titel}</h3>
    <div class="chips">${shopLinks(d).map(([n, u]) =>
      `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ${ico('more')}</a>`).join('')}</div>`;
function shopLinks(it) {
  const q = encodeURIComponent(String(it.suchbegriff || it.name || CATS[it.cat].label).replace(/\s+/g, ' ').trim());
  const h = herren();
  /* Shops ohne eigene Abteilung in der Adresse bekommen das Wort in die Suche */
  const qa = encodeURIComponent((h ? 'Herren ' : 'Damen ') + decodeURIComponent(q));
  return [
    ['Zara', `https://www.zara.com/de/de/search?searchTerm=${q}&section=${h ? 'MAN' : 'WOMAN'}`],
    ['Mango', `https://shop.mango.com/de/de/search/${h ? 'herren' : 'damen'}?q=${q}`],
    ['H&M', `https://www2.hm.com/de_de/search-results.html?q=${qa}`],
    ['Zalando', `https://www.zalando.de/${h ? 'herren' : 'damen'}/?q=${q}`],
    ['About You', `https://www.aboutyou.de/suche?term=${qa}`],
    ['Google Shopping', `https://www.google.com/search?tbm=shop&q=${qa}`],
    ['Vinted · gebraucht', `https://www.vinted.de/catalog?search_text=${qa}`]
  ];
}

/* ---- Mehrfachauswahl im Schrank ---- */
let _langZeit = null, _langStart = null, _langGefeuert = false;
App.langGedrueckt = () => { const g = _langGefeuert; _langGefeuert = false; return g; };
document.addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest('#schrank-grid .tile[data-id]');
  if (!t || UI.auswahl) return;
  _langStart = { x: e.clientX, y: e.clientY };
  clearTimeout(_langZeit);
  _langZeit = setTimeout(() => {
    _langGefeuert = true;
    if (navigator.vibrate) navigator.vibrate(12);
    UI.auswahl = new Set([t.dataset.id]);
    render();
  }, 550);
});
const _langAbbruch = () => { clearTimeout(_langZeit); _langZeit = null; };
document.addEventListener('pointerup', _langAbbruch);
document.addEventListener('pointercancel', _langAbbruch);
document.addEventListener('pointermove', e => {
  if (_langStart && Math.hypot(e.clientX - _langStart.x, e.clientY - _langStart.y) > 10) _langAbbruch();
});
/* iOS-Bildmenü beim langen Drücken unterdrücken */
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#schrank-grid .tile')) e.preventDefault(); });

App.auswahlStart = () => { UI.auswahl = new Set(); render(); };
App.auswahlEnde = () => { UI.auswahl = null; render(); };
App.auswahlTipp = id => {
  if (!UI.auswahl || App.langGedrueckt()) return;   /* der Klick nach dem langen Drücken zählt nicht */
  UI.auswahl.has(id) ? UI.auswahl.delete(id) : UI.auswahl.add(id);
  render();
};
App.auswahlAlle = () => {
  const sichtbar = [...document.querySelectorAll('#schrank-grid .tile[data-id]')].map(t => t.dataset.id);
  const alle = sichtbar.every(id => UI.auswahl.has(id));
  sichtbar.forEach(id => alle ? UI.auswahl.delete(id) : UI.auswahl.add(id));
  render();
};
App.auswahlLoeschen = async () => {
  const ids = [...(UI.auswahl || [])];
  if (!ids.length) return;
  const inOutfits = ids.filter(id => DB.outfits.some(o => o.ids.includes(id))).length;
  if (!confirm(`${ids.length} ${ids.length === 1 ? 'Teil' : 'Teile'} löschen?` +
    (inOutfits ? ` ${inOutfits} davon ${inOutfits === 1 ? 'steckt' : 'stecken'} in Outfits und ${inOutfits === 1 ? 'bleibt' : 'bleiben'} dort als „nicht mehr da" sichtbar.` : ''))) return;
  const weg = [];
  for (const id of ids) {
    const it = itemById(id);
    if (!it) continue;
    if (DB.outfits.some(o => o.ids.includes(id))) { it.geloescht = true; it.geloeschtAm = todayISO(); }
    else weg.push(it);
  }
  DB.items = DB.items.filter(i => !weg.includes(i));
  save();
  UI.auswahl = null; UI.queue = null;
  render();
  toast(`${ids.length} ${ids.length === 1 ? 'Teil' : 'Teile'} gelöscht`);
  for (const i of weg) { dropPicURL(i.picId); await picDel(i.picId).catch(() => {}); }
};
/* Teilen: Produktbilder als PNG über das Teilen-Menü (AirDrop, Nachrichten, Fotos …) */
App.auswahlTeilen = async () => {
  const ids = [...(UI.auswahl || [])].slice(0, 30);
  if (!ids.length) return;
  toast('Bilder werden vorbereitet …');
  const dateien = [];
  for (const id of ids) {
    const it = itemById(id);
    const blob = it && await picGet(it.picId).catch(() => null);
    if (!blob) continue;
    try {
      const img = await loadImg(URL.createObjectURL(blob));
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      cv.getContext('2d').drawImage(img, 0, 0);
      const png = await canvasToBlob(cv, 'image/png');
      const name = String(it.name || CATS[it.cat].label).replace(/[^\wäöüÄÖÜß -]/g, '').trim() || 'Teil';
      dateien.push(new File([png], `${name}.png`, { type: 'image/png' }));
    } catch (e) { console.warn(e); }
  }
  document.querySelector('.toast')?.remove();
  if (!dateien.length) return;
  if (navigator.canShare && navigator.canShare({ files: dateien })) {
    try { await navigator.share({ files: dateien }); } catch (e) { /* abgebrochen */ }
  } else {
    dateien.forEach(f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); });
  }
};

App.setAbteilung = setAbteilung;
let _ortZeit = null;
App.ortSuche = q => {
  clearTimeout(_ortZeit);
  _ortZeit = setTimeout(async () => {
    const el = $('#orttreffer');
    if (!el || q.trim().length < 2) { if (el) el.innerHTML = ''; return; }
    try {
      const d = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=de`)).json();
      App._orte = d.results || [];
      el.innerHTML = App._orte.map((o, i) => `<button class="zeile-l ohne-ico" onclick="App.ortWaehlen(${i})">
        <span class="ltext">${esc(o.name)}<small>${esc([o.admin1, o.country].filter(Boolean).join(', '))}</small></span></button>`).join('')
        || '<div class="zeile-l ohne-ico"><span class="ltext small">Nichts gefunden.</span></div>';
    } catch (e) { el.innerHTML = ''; }
  }, 300);
};
App.ortWaehlen = i => {
  DB.prefs = DB.prefs || {};
  if (i === null) delete DB.prefs.ort;
  else { const o = App._orte[i]; DB.prefs.ort = { name: o.name, lat: +o.latitude.toFixed(3), lon: +o.longitude.toFixed(3) }; }
  save();
  _wetter = null;
  UI.modal = null; render();
  wetterLaden(true);
};

/* ---- Nacharbeit im Teil ---- */
const farbFilterCss = a => !a ? '' : `filter: brightness(${1 + (a.hell || 0) / 100}) saturate(${1 + (a.farbig || 0) / 100}) sepia(${Math.max(0, a.warm || 0) / 100}) hue-rotate(${Math.min(0, a.warm || 0) * 0.6}deg)`;
App.anpassenAuf = () => { UI.anpassen = !UI.anpassen; render(); };
App.anpassen = (k, v) => {
  const d = UI.draft; if (!d) return;
  d.anpassung = { ...(d.anpassung || {}), [k]: v };
  const el = $('#teilbild'); if (el) el.style.cssText = farbFilterCss(d.anpassung);
  const o = document.querySelector(`#modal-root .val[data-out="${k}"]`); if (o) o.textContent = v;
};
/* Anpassung ins Bild einrechnen: Helligkeit, Sättigung über Luma, Wärme über Rot/Blau */
async function anpassungAnwenden(d) {
  const a = d.anpassung;
  if (!a || (!a.hell && !a.farbig && !a.warm)) return;
  const blob = await picGet(d.picId);
  const img = await loadImg(URL.createObjectURL(blob));
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, cv.width, cv.height), p = id.data;
  const hell = 1 + (a.hell || 0) / 100, satt = 1 + (a.farbig || 0) / 100, warm = (a.warm || 0) * 0.8;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    let r = p[i] * hell, g = p[i + 1] * hell, b = p[i + 2] * hell;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    r = y + (r - y) * satt; g = y + (g - y) * satt; b = y + (b - y) * satt;
    p[i] = clamp(r + warm, 0, 255); p[i + 1] = clamp(g, 0, 255); p[i + 2] = clamp(b - warm, 0, 255);
  }
  ctx.putImageData(id, 0, 0);
  const alt = d.picId;
  d.picId = uid();
  await picPut(d.picId, await encode(cv, true));
  d.colors = extractColors(ctx, cv.width, cv.height);
  delete d.anpassung;
  if (!DB.items.some(i => i.picId === alt)) { dropPicURL(alt); picDel(alt).catch(() => {}); }
}

/* Produktfoto aus der gespeicherten Vorlage neu erzeugen */
App.teilNeuErzeugen = async fein => {
  const d = UI.draft;
  if (!d || !d.vorlagePicId) return;
  UI.teilErzeugt = true; render();
  try {
    const img = await loadImg(URL.createObjectURL(await picGet(d.vorlagePicId)));
    const vorlage = canvasFrom(img, 1024);
    const neu = await nachbilden(vorlage, null, d.cat, d.beschreibung || d.name || '', fein ? 'fein' : 'schnell',
      { farbe: d.farbe, muster: d.muster });
    const frei = farbAngleich(await vomWeissLoesen(neu), hexLab(d.farbe));
    const { blob, colors, ar } = await prepItemImage(await encode(frei, true), 900, true);
    d.picId = uid(); d.colors = colors; d.ar = ar; d.cut = true; delete d.anpassung;
    await picPut(d.picId, blob);
    toast('Neues Produktfoto – Speichern übernimmt es');
  } catch (e) { toast(bildFehler(e)); }
  UI.teilErzeugt = false;
  if (UI.draft === d) render();
};

App.teilAusOutfit = id => { UI.detail = null; App.editItem(id); };
App.stylistNeu = () => stylistHolen(true);
/* Wer nicht warten will, bekommt sofort die lokale Auswahl; die Ergebnisse
   der Stylistin rücken nach, sobald sie da sind. */
App.stylistNichtWarten = () => { UI.ohneStylist = stylistSchluessel(); UI.queue = null; render(); };
App.resetTossed = () => {
  if (!confirm('Alle verworfenen Kombinationen wieder zulassen?')) return;
  /* Wieder zulassen heißt nicht vergessen: fürs Lernen bleiben sie im Archiv */
  DB.tossArchiv = [...new Set([...(DB.tossArchiv || []), ...(DB.tossed || [])])].slice(-3000);
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
  geloeschteAufraeumen();
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

    dienstFaehigkeiten().then(() => { if (UI.studio) render(); });
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
App.studioTeil = async kat => {
  const s = UI.studio;
  if (!s) return;
  if (!kat) { s.umriss = null; s.teilKat = null; render(); return; }
  s.teilLaedt = kat; render();
  try {
    const bild = await studioBild64(s.original || s.gross);
    let j;
    try { j = await dienstAnfrage('/umriss', { bild, kategorie: TEIL_NAME[kat] }); }
    catch (e) {
      /* Erkennung fällt aus: trotzdem weitermachen – mit dem ganzen Bild als Vorlage */
      if (/429|aufgebraucht/i.test(String(e.message)) || !(_dienst && _dienst.produktfoto)) throw e;
      j = { gefunden: true, umriss: null, name: '', beschreibung: '', box_2d: null };
    }
    if (UI.studio !== s) return;
    if (j.gefunden && !j.umriss) {
      s.teilKat = kat; s.box = null; s.teilName = ''; s.beschreibung = '';
      if (_dienst && _dienst.produktfoto) { s.teilLaedt = null; App.studioNachbilden(); return; }
    } else if (!j.gefunden || !Array.isArray(j.umriss) || j.umriss.length < 3) {
      toast(`Kein ${TEIL_NAME[kat] === 'Schuhe' ? 'Paar Schuhe' : TEIL_NAME[kat]} im Bild gefunden.`);
    } else {
      s.umriss = j.umriss; s.teilKat = kat; s.zeigeVorher = false;
      s.teilName = String(j.name || '').slice(0, 60);
      s.beschreibung = String(j.beschreibung || '').slice(0, 300);
      s.farbe = j.farbe_hex || ''; s.muster = j.muster || ''; s.suchbegriff = String(j.suchbegriff || '').slice(0, 80);
      s.box = Array.isArray(j.box_2d) && j.box_2d.length === 4 ? j.box_2d : boxAusUmriss(j.umriss);
      /* Jedes Foto soll wie ein Produktbild aussehen – also gleich nachbilden,
         wenn der Dienst das kann. „Zurück zu meinem Foto" macht es rückgängig. */
      if (_dienst && _dienst.produktfoto) { s.teilLaedt = null; App.studioNachbilden(); return; }
    }
  } catch (e) {
    const t = fehlerText(e);
    toast(/Stilanalyse/.test(t) ? 'Das Teil konnte gerade nicht erkannt werden. Versuch es gleich noch einmal.' : t);
  } finally {
    if (UI.studio === s) { s.teilLaedt = null; render(); }
  }
};

/* Nachbilden: aus dem Alltagsfoto ein Produktfoto erzeugen lassen. Bewusst eine
   eigene Aktion – das Ergebnis ist eine Nachbildung, nicht mehr dein Foto. */
App.studioNachbilden = async fein => {
  const s = UI.studio;
  if (!s) return;
  s.feinWunsch = fein === true;
  if (!s.teilKat) { toast('Tippe zuerst an, welches Teil es ist.'); return; }
  s.bildLaedt = true; render();
  try {
    const quelle = s.original || s.gross;
    const neu = await nachbilden(quelle, s.box, s.teilKat, s.beschreibung, s.feinWunsch ? 'fein' : 'schnell',
      { farbe: s.farbe, muster: s.muster });
    if (UI.studio !== s) return;
    s.zielFarbe = s.zielFarbe || zielFarbe(quelle, s.box, s.farbe);
    if (!s.original) { s.original = s.gross; s.vorher = s.klein; }
    s.gross = neu;
    s.klein = canvasFrom(neu, STUDIO_PREVIEW);
    s.umrissMerk = s.umriss || s.umrissMerk; s.umriss = null; s.hatAlpha = false; s.maskCv = null; s.nachgebildet = true;
    s.licht = false; s.status = 'laden'; render();
    try { s.maskCv = await kiMaske(s.gross); s.status = 'ki'; }
    catch (e) { s.status = 'einfach'; s.tol = 0.3; }
  } catch (e) {
    toast(bildFehler(e));
  } finally {
    if (UI.studio === s) { s.bildLaedt = false; render(); }
  }
};

/* Ganzkörperfoto: statt einem Teil alle erkennen – Ablauf wie beim Kleiderhaufen */
App.studioAlleTeile = async () => {
  const s = UI.studio;
  if (!s) return;
  const quelle = s.original || s.gross;
  const blob = await canvasToBlob(quelle, 'image/jpeg', 0.92);
  UI.studio = null;
  await openHaufen(blob, false, true);
};

App.studioOriginal = async () => {
  const s = UI.studio;
  if (!s || !s.original) return;
  s.gross = s.original; s.klein = s.vorher; s.original = null;
  s.nachgebildet = false; s.maskCv = null; s.licht = true; s.umriss = s.umrissMerk || null; s.status = 'laden'; render();
  try { s.maskCv = await kiMaske(s.gross); s.status = 'ki'; }
  catch (e) { s.status = 'einfach'; s.tol = 0.3; }
  if (UI.studio === s) render();
};

/* ===== Haufen: viele Teile auf einem Foto =====
   Foto → Erkennung (Kategorie, Name, Beschreibung, Lage) → Auswahl → jedes Teil
   als Produktfoto nachbilden → prüfen → in den Schrank. */
const daumen = (cv, max = 240) => {
  const k = Math.min(1, max / Math.max(cv.width, cv.height));
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(cv.width * k)); t.height = Math.max(1, Math.round(cv.height * k));
  t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
  return t.toDataURL('image/png');
};

const HAUFEN_MIN_SICHTBAR = 50;

async function openHaufen(file, wunsch, getragen) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const bild = canvasFrom(img, 2000);
    UI.haufen = { bild, foto: daumen(bild, 700), status: 'erkennen', teile: [], wunsch: !!wunsch };
    UI.modal = 'haufen'; render();
    const j = await dienstAnfrage('/haufen', { bild: await studioBild64(bild, 1280), getragen: !!(wunsch || getragen), abteilung: abteilung() });
    const h = UI.haufen;
    if (!h) return;
    /* Zu stark verdeckte Teile gar nicht erst anbieten – die Rekonstruktion
       klappte bei ihnen nie. */
    const alle = (j.teile || []).filter(t => CATS[t.kategorie]);
    const sichtbar = t => (t.sichtbar ?? 100) >= HAUFEN_MIN_SICHTBAR;
    h.ausgeblendet = alle.filter(t => !sichtbar(t)).length;
    h.teile = alle.filter(sichtbar).map(t => ({
      kat: t.kategorie, name: String(t.name || '').slice(0, 60), beschreibung: String(t.beschreibung || '').slice(0, 300),
      farbe: t.farbe_hex || '', muster: t.muster || '', suchbegriff: String(t.suchbegriff || '').slice(0, 80),
      box: t.box_2d, verdeckt: (t.sichtbar ?? 100) < 75, an: true, zustand: 'offen',
      vorschau: daumen(ausschnittCanvas(bild, t.box_2d, 0.03), 220)
    }));
    h.status = h.teile.length ? 'auswahl' : 'leer';
    render();
  } catch (e) {
    console.warn(e);
    if (UI.haufen) { UI.haufen.status = 'fehler'; UI.haufen.meldung = bildFehler(e); render(); }
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}

App.haufenFoto = quelle => {
  UI.dateiZiel = 'haufen';
  App.addItem(quelle);
};
App.haufenTeil = i => { const t = UI.haufen && UI.haufen.teile[i]; if (t) { t.an = !t.an; render(); } };
App.haufenZu = () => {
  if (UI.haufen && UI.haufen.status === 'bilden' && !confirm('Abbrechen? Bereits erzeugte Bilder gehen verloren.')) return;
  UI.haufen = null; UI.modal = null; render();
};

async function haufenBildeEins(h, t, fein) {
  t.zustand = 'laeuft'; render();
  try {
    const neu = await nachbilden(h.bild, t.box, t.kat, t.beschreibung, fein ? 'fein' : 'schnell',
      { farbe: t.farbe, muster: t.muster });
    t.zielFarbe = t.zielFarbe || zielFarbe(h.bild, t.box, t.farbe);
    const frei = farbAngleich(await vomWeissLoesen(neu), t.zielFarbe);
    t.ergebnis = frei; t.ergebnisVorschau = daumen(frei, 300);
    t.zustand = 'fertig'; t.behalten = true;
  } catch (e) {
    console.warn(e);
    t.zustand = 'fehler'; t.meldung = bildFehler(e);
  }
  if (UI.haufen === h) render();
}

App.haufenBilden = async () => {
  const h = UI.haufen;
  if (!h) return;
  h.status = 'bilden'; render();
  /* Nacheinander statt gleichzeitig: schont das Kontingent und zeigt Fortschritt */
  for (const t of h.teile.filter(x => x.an && x.zustand !== 'fertig')) {
    if (UI.haufen !== h) return;
    await haufenBildeEins(h, t);
    if (t.zustand === 'fehler' && /aufgebraucht/.test(t.meldung || '')) break;
  }
  if (UI.haufen === h) { h.status = 'pruefen'; render(); }
};
/* Nochmal = günstiges Modell mit neuem Zufall; Genauer = großes Modell, ~14-mal teurer */
App.haufenNochmal = async (i, fein) => {
  const h = UI.haufen; const t = h && h.teile[i];
  if (!t || t.zustand === 'laeuft') return;
  await haufenBildeEins(h, t, !!fein);
};
/* Kein Produktfoto möglich (etwa Tageskontingent leer): Ausschnitt aus dem
   eigenen Foto freistellen und so übernehmen */
App.haufenOhneNachbildung = async i => {
  const h = UI.haufen; const t = h && h.teile[i];
  if (!t) return;
  t.zustand = 'laeuft'; render();
  try {
    const frei = await vomWeissLoesen(ausschnittCanvas(h.bild, t.box, 0.04));
    t.ergebnis = frei; t.ergebnisVorschau = daumen(frei, 300);
    t.zustand = 'fertig'; t.behalten = true; t.ersatz = true; t.meldung = '';
  } catch (e) { t.zustand = 'fehler'; t.meldung = 'Auch der Ausschnitt hat nicht geklappt.'; }
  if (UI.haufen === h) render();
};
App.haufenAlleOhne = async () => {
  const h = UI.haufen; if (!h) return;
  for (let i = 0; i < h.teile.length; i++) if (h.teile[i].an && h.teile[i].zustand === 'fehler') await App.haufenOhneNachbildung(i);
};

App.haufenBehalten = i => { const t = UI.haufen && UI.haufen.teile[i]; if (t) { t.behalten = !t.behalten; render(); } };

App.haufenUebernehmen = async () => {
  const h = UI.haufen;
  if (!h) return;
  const liste = h.teile.filter(t => t.zustand === 'fertig' && t.behalten);
  if (!liste.length) return;
  h.status = 'speichern'; render();
  let n = 0;
  for (const t of liste) {
    try {
      const blob = await encode(t.ergebnis, true);
      const { blob: out, colors, cut, ar } = await prepItemImage(blob, 900, true);
      const picId = uid();
      await picPut(picId, out);
      /* Ausschnitt aus dem Originalfoto behalten – damit lässt sich das Produktfoto
         später neu erzeugen, auch wenn das Foto selbst längst weg ist */
      const vorlagePicId = uid();
      await picPut(vorlagePicId, await canvasToBlob(aufMass(ausschnittCanvas(h.bild, t.box, 0.05), 320, 640), 'image/jpeg', 0.85));
      const w = CATS[t.kat].warmth;
      DB.items.push({ id: uid(), picId, vorlagePicId, farbe: t.farbe || '', muster: t.muster || '', colors, cut, ar, cat: t.kat, name: t.name,
        warmth: w, formality: 3, seasons: seasonsFromWarmth(w), seasonsAuto: !h.wunsch,
        addedAt: Date.now(), nachgebildet: !t.ersatz, beschreibung: t.beschreibung, suchbegriff: t.suchbegriff || '',
        ...(h.wunsch ? { wunsch: true, pinId: h.pinId || null } : {}) });
      n++;
    } catch (e) { console.warn('Teil nicht gespeichert', e); }
  }
  save();
  UI.haufen = null; UI.modal = null; UI.queue = null;
  UI.tab = 'closet'; UI.closetFilter = h.wunsch ? 'wunsch' : 'all';
  render();
  toast(h.wunsch ? `${n} ${n === 1 ? 'Teil' : 'Teile'} auf der Wunschliste`
    : `${n} ${n === 1 ? 'Teil' : 'Teile'} im Schrank – Jahreszeiten kurz bestätigen`);
};

function renderHaufen() {
  const h = UI.haufen;
  if (!h) return '';
  const an = h.teile.filter(t => t.an).length;
  const fertig = h.teile.filter(t => t.zustand === 'fertig').length;
  const behalten = h.teile.filter(t => t.zustand === 'fertig' && t.behalten).length;
  const titel = { erkennen: h.wunsch ? 'Look zerlegen' : 'Teile erkennen', auswahl: `${h.teile.length} ${h.teile.length === 1 ? 'Teil' : 'Teile'} gefunden`, bilden: 'Produktfotos entstehen',
    pruefen: 'Prüfen', speichern: 'Speichern', leer: 'Nichts gefunden', fehler: 'Hat nicht geklappt' }[h.status];
  const karte = (t, i) => {
    const bild = t.ergebnisVorschau || t.vorschau;
    const zeigt = h.status === 'auswahl' ? (t.an ? 'an' : 'aus')
      : t.zustand === 'fertig' ? (t.behalten ? 'an' : 'aus') : t.zustand;
    const klick = h.status === 'auswahl' ? `App.haufenTeil(${i})`
      : t.zustand === 'fertig' ? `App.haufenBehalten(${i})` : '';
    return `<div class="hteil ${zeigt}" ${klick ? `role="button" onclick="${klick}"` : ''}>
      <div class="hbild${t.ergebnisVorschau ? ' fertig' : ''}"><img src="${bild}" alt="">
        ${t.zustand === 'laeuft' ? '<span class="hlaeuft"><span class="spin"></span></span>' : ''}
        ${zeigt === 'an' ? `<span class="hhaken">${ico('check')}</span>` : ''}</div>
      <div class="hname">${esc(t.name || TEIL_NAME[t.kat])}</div>
      <div class="hkat">${esc(CATS[t.kat].label)}${t.verdeckt && !t.ergebnisVorschau ? ' · teils verdeckt' : ''}</div>
      ${t.zustand === 'fehler' ? `<p class="hfehler">${esc(t.meldung || 'Hat nicht geklappt.')}</p>
        ${/aufgebraucht/.test(t.meldung || '') ? '' : `<button class="linkbtn" onclick="event.stopPropagation(); App.haufenNochmal(${i})">${ico('again')} Nochmal</button>`}
        <button class="linkbtn" onclick="event.stopPropagation(); App.haufenOhneNachbildung(${i})">${ico('image')} Mein Foto nehmen</button>` : ''}
      ${t.ersatz ? '<div class="hkat">Ausschnitt aus deinem Foto</div>' : ''}
      ${t.zustand === 'fertig' && h.status === 'pruefen' && !t.ersatz ? `<button class="linkbtn" onclick="event.stopPropagation(); App.haufenNochmal(${i})">${ico('dice')} Nochmal</button>
        <button class="linkbtn" onclick="event.stopPropagation(); App.haufenNochmal(${i}, true)">${ico('sparkle')} Genauer</button>` : ''}
    </div>`;
  };
  return `<div class="overlay" onclick="App.haufenZu()"><div class="sheet" onclick="event.stopPropagation()">
    ${blattKopf(titel, 'App.haufenZu()')}
    ${h.status === 'erkennen' ? `<div class="hfoto"><img src="${h.foto}" alt=""><div class="hscan"></div></div>
      <p class="hint center" style="margin-top:12px"><span class="spin mini"></span> Ich suche die einzelnen Teile …</p>` : ''}
    ${h.status === 'leer' ? `<p class="hint">Auf dem Foto habe ich keine Kleidung gefunden. Am besten klappt es mit Abstand,
      gutem Licht und Teilen, die nicht ganz übereinanderliegen.</p>` : ''}
    ${h.status === 'fehler' ? `<p class="hint">${esc(h.meldung || 'Die Erkennung hat nicht geklappt.')}</p>` : ''}
    ${h.status === 'auswahl' ? `<p class="hint" style="margin-top:-6px">Tippe an, welche Teile ${h.wunsch ? 'auf die Wunschliste' : 'in den Schrank'}
      sollen. Jedes wird als Produktfoto nachgebildet${h.teile.some(t => t.verdeckt) ? ' – bei teils verdeckten ergänzt die KI, was sie nicht sieht' : ''}.
      ${h.ausgeblendet ? `<br><span class="small">${h.ausgeblendet} ${h.ausgeblendet === 1 ? 'weiteres Teil war' : 'weitere Teile waren'} zu weniger als der Hälfte zu sehen und ${h.ausgeblendet === 1 ? 'wird' : 'werden'} nicht angeboten.</span>` : ''}</p>` : ''}
    ${h.status === 'bilden' ? `<p class="hint" style="margin-top:-6px">${fertig} von ${an} fertig – etwa 10 Sekunden je Teil.</p>
      <div class="fortschritt"><i style="width:${Math.round(fertig * 100 / Math.max(1, an))}%"></i></div>` : ''}
    ${h.status === 'pruefen' && h.teile.some(t => t.an && t.zustand === 'fehler' && /aufgebraucht/.test(t.meldung || '')) ? `<div class="banner" style="margin-bottom:12px" role="button" onclick="App.haufenAlleOhne()">
      <span class="ico">${ico('image')}</span><span><b>Produktfotos für heute aufgebraucht</b>
      <span class="small">Tippe hier, um die Teile als Ausschnitt aus deinem Foto zu übernehmen.</span></span>${ico('chev', 'chev')}</div>` : ''}
    ${h.status === 'pruefen' ? `<p class="hint" style="margin-top:-6px">Tippe Bilder an, die du nicht willst. Nicht getroffen?
      <i>Nochmal</i> versucht es neu, <i>Genauer</i> nimmt das große Modell – das verbraucht etwa 14-mal so viel vom Tageskontingent.</p>` : ''}
    ${h.teile.length && h.status !== 'erkennen' ? `<div class="hgrid">${h.teile.map((t, i) =>
      h.status === 'auswahl' || t.an ? karte(t, i) : '').join('')}</div>` : ''}
    <div class="sheet-fuss">
      ${h.status === 'auswahl' ? `<button class="btn primary block" onclick="App.haufenBilden()" ${an ? '' : 'disabled'}>${ico('sparkle')}
        ${an} ${an === 1 ? 'Teil' : 'Teile'} als Produktfoto anlegen</button>` : ''}
      ${h.status === 'pruefen' ? `<button class="btn primary block" onclick="App.haufenUebernehmen()" ${behalten ? '' : 'disabled'}>
        ${behalten} ${behalten === 1 ? 'Teil' : 'Teile'} ${h.wunsch ? 'auf die Wunschliste' : 'in den Schrank'}</button>` : ''}
      ${h.status === 'speichern' ? `<button class="btn primary block" disabled><span class="spin mini"></span> Wird gespeichert …</button>` : ''}
      ${['leer', 'fehler'].includes(h.status) ? `<button class="btn block" onclick="App.haufenZu()">Schließen</button>` : ''}
    </div>
  </div></div>`;
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
    let out = studioRender(s.gross, studioOpts(s));
    if (s.nachgebildet && s.zielFarbe) out = farbAngleich(out, s.zielFarbe);
    const blob = await encode(out, true);
    UI.studio = null;
    document.querySelector('.toast')?.remove();
    await startDraftFrom(blob, { fertig: true });
    if (UI.draft && s.teilKat) App.draftSet('cat', s.teilKat, true);
    if (UI.draft && s.teilName && !UI.draft.name) UI.draft.name = s.teilName;
    if (UI.draft && s.suchbegriff) UI.draft.suchbegriff = s.suchbegriff;
    if (UI.draft && s.nachgebildet) {
      UI.draft.nachgebildet = true;
      const vorlagePicId = uid();
      await picPut(vorlagePicId, await canvasToBlob(aufMass(ausschnittCanvas(s.original || s.gross, s.box, 0.05), 320, 640), 'image/jpeg', 0.85));
      Object.assign(UI.draft, { vorlagePicId, farbe: s.farbe || '', muster: s.muster || '', beschreibung: s.beschreibung || '' });
    }
    render();
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
  const ziel = UI.dateiZiel; UI.dateiZiel = null;
  if (!file) return;
  input.value = '';
  if (ziel === 'haufen') await openHaufen(file);
  else await openStudio(file);
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
/* Ausdrückliche Markierung schlägt Name und KI – etwa für modische Leggings */
App.draftSport = () => {
  const d = UI.draft;
  if (!d) return;
  d.sport = !istSport(d);
  render();
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
App.saveItem = async () => {
  const d = UI.draft;
  if (!d) return;
  delete d._newPic;
  UI.anpassen = false;
  try { await anpassungAnwenden(d); } catch (e) { console.warn('Farbanpassung', e); }
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
  UI.modal = null; UI.draft = null; UI.anpassen = false;
  if (d && d._newPic) { dropPicURL(d.picId); await picDel(d.picId); }
  render();
};
App.deleteItem = async () => {
  const d = UI.draft;
  if (!d) return;
  const inOutfits = DB.outfits.filter(o => o.ids.includes(d.id)).length;
  if (!confirm(inOutfits
    ? `Dieses Teil löschen? Es steckt in ${inOutfits} ${inOutfits === 1 ? 'Outfit' : 'Outfits'} – dort bleibt es sichtbar, als „nicht mehr da" markiert.`
    : 'Dieses Teil wirklich löschen?')) return;
  UI.modal = null; UI.draft = null; UI.queue = null;
  if (inOutfits) {
    const it = itemById(d.id);
    if (it) { it.geloescht = true; it.geloeschtAm = todayISO(); }
    save();
  } else {
    DB.items = DB.items.filter(i => i.id !== d.id);
    save();
    dropPicURL(d.picId); await picDel(d.picId);
  }
  render();
};

/* Gelöschte Teile, die in keinem Outfit mehr stecken, endgültig entfernen */
async function geloeschteAufraeumen() {
  const gebraucht = new Set(DB.outfits.flatMap(o => o.ids));
  const weg = DB.items.filter(i => i.geloescht && !gebraucht.has(i.id));
  if (!weg.length) return;
  DB.items = DB.items.filter(i => !weg.includes(i));
  save();
  for (const i of weg) { dropPicURL(i.picId); await picDel(i.picId).catch(() => {}); }
}

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
let kiPunkte = [];
let kiZeigeDetail = false;
let kiStapelLaeuft = false;

/* Klassischer Weg zu versteckten Einstellungen: fünfmal auf die Speicherzeile
   tippen. So sieht ein normaler Nutzer die Betreiber-Einstellungen nie. */
let speicherTipps = 0, speicherTippZeit = 0;
App.tippSpeicher = () => {
  const jetzt = Date.now();
  speicherTipps = (jetzt - speicherTippZeit < 2000) ? speicherTipps + 1 : 1;
  speicherTippZeit = jetzt;
  if (speicherTipps < 5) return;
  speicherTipps = 0;
  DB.prefs = DB.prefs || {};
  DB.prefs.entwickler = !DB.prefs.entwickler;
  save();
  toast(DB.prefs.entwickler ? 'Entwicklereinstellungen sichtbar' : 'Entwicklereinstellungen versteckt');
  render();
};

/* --- KI --- */
App.setWorker = v => {
  DB.prefs = DB.prefs || {};
  DB.prefs.worker = v.trim();
  save();                                   /* kein render(): Textfeld behält den Fokus */
};
App.testWorker = async () => {
  kiStatus = 'prüfe …'; kiPunkte = []; kiDetail = ''; render();
  const basis = dienstUrl();
  if (!basis) { kiStatus = 'Keine Adresse eingetragen.'; render(); return; }
  try {
    const res = await fetch(basis + '/status', { headers: { 'X-Geraet': geraetId() } });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { kiStatus = 'Der Dienst antwortet nicht richtig.'; kiDetail = 'HTTP ' + res.status; render(); return; }

    const m = await (await fetch(basis + '/modelle')).json().catch(() => ({}));
    const modellOk = Array.isArray(m.nutzbar) && m.nutzbar.includes(m.eingestellt);

    kiPunkte = [];
    if (j.bereit === false) kiPunkte.push('Zugangsschlüssel fehlt');
    if (Array.isArray(m.nutzbar) && !modellOk) kiPunkte.push(`Modell „${m.eingestellt}" ist nicht nutzbar`);
    if (m.fehler) kiPunkte.push('Der Zugang wird abgelehnt');
    (j.offen || []).forEach(o => {
      if (/ZAEHLER/.test(o)) kiPunkte.push('Tageslimit greift noch nicht');
      else if (/ALLOW_ORIGIN/.test(o)) kiPunkte.push('Dienst ist für jeden offen');
      else if (/Leerzeichen/.test(o)) kiPunkte.push('Schlüssel enthält ein Leerzeichen');
    });

    kiStatus = (j.bereit && modellOk && !m.fehler && !kiPunkte.length)
      ? `Einsatzbereit · Modell ${m.eingestellt} · heute ${j.heute ?? 0} von ${j.limit ?? '?'}`
      : (j.bereit && modellOk && !m.fehler)
        ? `Läuft · Modell ${m.eingestellt} · heute ${j.heute ?? 0} von ${j.limit ?? '?'}`
        : 'Noch nicht einsatzbereit.';

    kiDetail = JSON.stringify({ status: j, modelle: m.fehler ? m : { eingestellt: m.eingestellt,
      anmeldeweg: m.anmeldeweg, anzahlNutzbar: (m.nutzbar || []).length } }, null, 1);
  } catch (e) {
    kiStatus = 'Der KI-Dienst ist nicht erreichbar.';
    kiDetail = String(e.message || e);
  }
  render();
};
App.kiDetailZeigen = () => { kiZeigeDetail = !kiZeigeDetail; render(); };

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
    toast(fehlerText(e));
  }
};
/* Googles Minutengrenze liegt bei etwa 10 Abfragen. 400 ms Pause wären 150/min
   gewesen und hätten sofort Fehler erzeugt. 6,5 s ergibt gut 9 pro Minute. */
const KI_PAUSE_MS = 6500;

App.analyseAlle = async () => {
  const sag = t => { kiMeldung = t; const el = $('#ki-fortschritt'); if (el) el.textContent = t; };
  const offen = eigene().filter(i => !istAnalysiert(i));
  if (!offen.length) return;

  let fertig = 0, sammeln = true, abfragen = 0;
  kiStapelLaeuft = true;

  const pakete = [];
  for (let i = 0; i < offen.length; i += KI_PAKET) pakete.push(offen.slice(i, i + KI_PAKET));

  for (const paket of pakete) {
    if (!kiStapelLaeuft) { sag(`Angehalten nach ${fertig} Teilen.`); save(); UI.queue = null; render(); return; }
    const restMin = Math.max(1, Math.round((offen.length - fertig) / KI_PAKET * KI_PAUSE_MS / 60000));
    sag(`${fertig} von ${offen.length} · noch etwa ${restMin} Min.`);
    try {
      if (sammeln) {
        abfragen++;
        const erg = await kiAnalyseMehrere(paket);
        let imPaket = 0;
        for (const { item, a } of erg) if (a) { kiUebernehmen(item, a); fertig++; imPaket++; }
        /* Unvollständige Pakete sichtbar machen statt sie zu verschlucken.
           Die fehlenden Teile bleiben unanalysiert und kommen beim nächsten Lauf dran. */
        if (imPaket < paket.length) {
          sag(`${fertig} von ${offen.length} · Achtung: Paket lieferte nur ${imPaket} von ${paket.length}`);
          await new Promise(r => setTimeout(r, 1500));
        }
      } else {
        for (const it of paket) { kiUebernehmen(it, await kiAnalyse(it)); fertig++;
          await new Promise(r => setTimeout(r, KI_PAUSE_MS)); }
      }
      save();
    } catch (e) {
      if (e.alt && sammeln) {     /* alter Worker: einzeln weitermachen */
        sammeln = false;
        sag('Worker kennt die Sammelabfrage nicht – mache einzeln weiter.');
        continue;
      }
      save();
      /* Vorher fiel hier bei allem außer dem Kontingent der Grund weg –
         übrig blieb ein nacktes „dann gestoppt". */
      const grund = fehlerText(e);
      sag(`${fertig} von ${offen.length} Teilen analysiert. ${grund}` +
          (entwicklermodus() ? ` (${abfragen} ${abfragen === 1 ? 'Abfrage' : 'Abfragen'})` : ''));
      kiStapelLaeuft = false; UI.queue = null; render();
      return;
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
    toast(fehlerText(e));
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
const allPicIds = () => DB.items.flatMap(i => [i.picId, i.vorlagePicId])
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
/* Backup zusammenführen statt nur neue Teile anzuhängen.

   Vorher wurde ein schon vorhandenes Teil komplett übersprungen – eine KI-Analyse
   oder Sortierarbeit aus dem Backup ging dann verloren. Outfits, Stilprofil und
   verworfene Kombinationen wurden gar nicht eingelesen.

   Regel: der weiter fortgeschrittene Stand gewinnt, aber nie wird etwas
   überschrieben, das auf diesem Gerät schon bestätigt ist. */
function zusammenfuehren(inc) {
  let neuTeile = 0, neuAnalysen = 0, neuSortiert = 0, neuOutfits = 0, profil = false;
  const lokal = new Map(DB.items.map(i => [i.id, i]));

  for (const it of (inc.items || [])) {
    const da = lokal.get(it.id);
    if (!da) { DB.items.push(it); neuTeile++; continue; }

    /* KI-Analyse: die jüngere gewinnt */
    const kiNeu = it.ki && it.ki.analysiert;
    const kiAlt = da.ki && da.ki.analysiert;
    if (kiNeu && (!kiAlt || it.ki.analysiert > da.ki.analysiert)) {
      da.ki = JSON.parse(JSON.stringify(it.ki)); neuAnalysen++;
    }
    /* Unterkategorie: nur übernehmen, wenn hier noch unsortiert */
    if (da.needsSort && !it.needsSort) { da.cat = it.cat; delete da.needsSort; neuSortiert++; }
    /* Jahreszeiten, Wärme, Anlass: nur übernehmen, wenn hier noch ungeprüft */
    if (da.seasonsAuto && !it.seasonsAuto) {
      da.seasons = [...(it.seasons || [])];
      if (it.warmth) da.warmth = it.warmth;
      if (it.formality) da.formality = it.formality;
      delete da.seasonsAuto; neuSortiert++;
    }
  }

  const knownT = new Set(DB.trends.map(t => t.id));
  for (const t of (inc.trends || [])) if (!knownT.has(t.id)) DB.trends.push(t);

  /* Outfits: gleiche Kombination nicht doppelt, auch wenn die ID abweicht */
  const schonDa = new Set(DB.outfits.map(o => o.id));
  const schonKombi = new Set(DB.outfits.map(o => outfitKey(o.ids)));
  for (const o of (inc.outfits || [])) {
    if (schonDa.has(o.id) || schonKombi.has(outfitKey(o.ids))) continue;
    DB.outfits.push(o); schonKombi.add(outfitKey(o.ids)); neuOutfits++;
  }

  DB.tossed = [...new Set([...(DB.tossed || []), ...(inc.tossed || [])])];
  DB.tossGruende = { ...(inc.tossGruende || {}), ...(DB.tossGruende || {}) };
  DB.okay = { ...(inc.okay || {}), ...(DB.okay || {}) };
  DB.tossArchiv = [...new Set([...(DB.tossArchiv || []), ...(inc.tossArchiv || [])])].slice(-3000);

  if (inc.profil && (!DB.profil || (inc.profil.erstellt || '') > (DB.profil.erstellt || ''))) {
    DB.profil = inc.profil; profil = true;
  }

  const teile = [];
  if (neuTeile) teile.push(`${neuTeile} ${neuTeile === 1 ? 'Teil' : 'Teile'}`);
  if (neuAnalysen) teile.push(`${neuAnalysen} ${neuAnalysen === 1 ? 'Analyse' : 'Analysen'}`);
  if (neuSortiert) teile.push(`${neuSortiert}× Sortierung`);
  if (neuOutfits) teile.push(`${neuOutfits} ${neuOutfits === 1 ? 'Outfit' : 'Outfits'}`);
  if (profil) teile.push('Stilprofil');
  return teile.length ? 'Übernommen: ' + teile.join(', ') : '';
}

App.chooseImport = () => { const i = $('#pick-import'); i.value = ''; i.click(); };
App.importChosen = async input => {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'outfit') throw new Error('Kein Outfit-Backup');
    const incoming = migrate(data.db);
    const bericht = zusammenfuehren(incoming);
    for (const [id, du] of Object.entries(data.pics || {})) {
      if (!(await picGet(id).catch(() => null))) await picPut(id, dataURLtoBlob(du));
    }
    save();
    UI.queue = null;
    toast(bericht || 'Nichts Neues im Backup');
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

/* Was heute schon von den gemeinsamen Kontingenten verbraucht ist */
async function zeigeVerbrauch() {
  const el = $('#verbrauch');
  if (!el || !dienstUrl()) return;
  try {
    const d = await (await fetch(dienstUrl() + '/status', { headers: { 'X-Geraet': geraetId() } })).json();
    const zeile = (titel, wert, klein) => `<div class="zeile-l ohne-ico"><span class="ltext">${titel}${klein ? `<small>${klein}</small>` : ''}</span><span class="lwert">${wert}</span></div>`;
    const g = d.geraet || {};
    el.innerHTML = zeile('KI-Abfragen, alle Geräte', `${d.heute} / ${d.limit}`, 'Analyse, Erkennung, Stylistin')
      + zeile('davon dieses Gerät', `${g.heute ?? '–'} / ${g.limit ?? '–'}`)
      + zeile('Produktfotos, alle Geräte', `${d.bilder ? d.bilder.heute : '–'} / ${d.bilder ? d.bilder.limit : '–'}`, '„Genauer" zählt 14')
      + zeile('davon dieses Gerät', `${g.bilder ?? '–'} / ${g.bilderLimit ?? '–'}`)
      + zeile('Geräte im Nachtlauf', d.nacht ? d.nacht.geraete : '–',
        d.nacht && d.nacht.letzterLauf ? `Dein letzter Lauf: ${fmtDate(d.nacht.letzterLauf)}` : '');
  } catch (e) { el.innerHTML = '<div class="zeile-l ohne-ico"><span class="ltext small">Nicht abrufbar.</span></div>'; }
}

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

/* Erst die Ergebnisse der Nacht abholen, dann den aktuellen Schrank für die
   nächste Nacht ablegen. Beim Verlassen der App noch einmal ablegen – dann
   sind die Entscheidungen des Tages in der Nacht schon berücksichtigt. */
let _nachtZuletzt = 0;
const nachtAbgleich = () => {
  if (!dienstUrl() || Date.now() - _nachtZuletzt < 60 * 60 * 1000) return;
  _nachtZuletzt = Date.now();
  nachtAbholen().then(schrankAblegen);
};
abteilungAnwenden();
if (dienstUrl()) nachtLaedt = true;     /* nicht live fragen, bevor die Nacht geprüft ist */
render();
nachtAbgleich();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') nachtAbgleich();
  else schrankAblegen();
});

/* Trennlinie im Kopf erst zeigen, wenn Inhalt darunter weggescrollt ist */
const topbar = $('#topbar');
const onScroll = () => topbar && topbar.classList.toggle('scrolled', window.scrollY > 38);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* Updates für die Homebildschirm-App. iOS hält die App im Speicher und schaut
   von sich aus selten nach einer neuen Fassung. Deshalb: beim Start und bei
   jeder Rückkehr in die App aktiv nachfragen, und sobald eine neue Fassung die
   Kontrolle übernimmt, einmal neu laden – sonst läuft bis zum nächsten
   Kaltstart der alte Code weiter. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch (e) { /* ohne Service Worker läuft die App trotzdem, nur nicht offline */ }
  });
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen) return;
    neuGeladen = true;
    location.reload();
  });
}
