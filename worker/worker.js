/**
 * Outfit – KI-Dienst als Cloudflare Worker.
 *
 * Die App ruft ausschließlich diesen Worker. Der Gemini-Schlüssel liegt hier
 * als Secret und niemals in der App: clientseitiges JavaScript ist öffentlich
 * lesbar, ein Schlüssel dort wäre sofort kompromittiert.
 *
 * Endpunkte:
 *   GET  /status      Verbrauch des Tages
 *   POST /analyse     ein Kleidungsstück  -> Stilmerkmale
 *   POST /stilprofil  mehrere Pins        -> Stilregeln
 */

const SILHOUETTEN = ['cropped','schmal','tailliert','gerade','fliessend','weit','oversized'];
const MATERIALIEN = ['baumwolle','leinen','seide','viskose','jersey','synthetik',
                     'denim','strick','wolle','leder','wildleder','daune'];
const MUSTER      = ['uni','meliert','gestreift','kariert','grafisch','gebluemt','animal'];
const STILE       = ['minimal','klassisch','casual','sportlich','elegant','boho','romantisch','edgy'];
const SAISONS     = ['fruehjahr','sommer','herbst','winter'];

/* Lite-Modell als Vorgabe: höheres kostenloses Kontingent, und für Silhouette,
   Material und Muster reicht seine Leistung. "-latest" zieht automatisch auf die
   jeweils aktuelle Fassung nach, statt wie ältere Modelle irgendwann gesperrt zu
   werden. Mit der Variable GEMINI_MODEL überschreibbar. */
const STANDARD_MODELL = 'gemini-flash-lite-latest';
const RUECKFALL_MODELL = 'gemini-flash-lite-latest';
/* Die Stylistin braucht Urteilsvermögen, nicht Masse: zwei bis vier Abfragen am
   Tag. Dafür lohnt das stärkere Modell – das Lite-Modell kombinierte Glitzerpumps
   zu Alltagsteilen. Ist sein Kontingent erschöpft, springt der Rückfall ein. */
const STYLIST_MODELL = 'gemini-flash-latest';

const SCHEMA_TEIL = {
  type: 'OBJECT',
  properties: {
    silhouette:   { type: 'STRING', enum: SILHOUETTEN },
    material:     { type: 'STRING', enum: MATERIALIEN },
    muster:       { type: 'STRING', enum: MUSTER },
    stil:         { type: 'ARRAY', items: { type: 'STRING', enum: STILE } },
    farbe:        { type: 'STRING' },
    waerme:       { type: 'INTEGER' },
    formalitaet:  { type: 'INTEGER' },
    jahreszeiten: { type: 'ARRAY', items: { type: 'STRING', enum: SAISONS } },
    sportbekleidung: { type: 'BOOLEAN' }
  },
  required: ['silhouette','material','muster','stil','farbe','waerme','formalitaet','jahreszeiten','sportbekleidung']
};

/* Die Tagesgrenze zählt Abfragen, nicht Bilder. Mehrere Teile in einer Abfrage
   vervielfachen deshalb den Durchsatz bei gleichem Kontingent. */
const SCHEMA_MEHRERE = {
  type: 'OBJECT',
  properties: {
    teile: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: Object.assign({ index: { type: 'INTEGER' } }, SCHEMA_TEIL.properties),
        required: ['index'].concat(SCHEMA_TEIL.required)
      }
    }
  },
  required: ['teile']
};

/* Die Stylistin bekommt den Schrank als kurze Textliste, nicht als Bilder –
   so passen über 150 Teile in eine Abfrage, und eine Abfrage liefert 15 Outfits. */
const SCHEMA_STYLIST = {
  type: 'OBJECT',
  properties: {
    outfits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          teile: { type: 'ARRAY', items: { type: 'STRING' } },
          grund: { type: 'STRING' }
        },
        required: ['teile', 'grund']
      }
    }
  },
  required: ['outfits']
};

const PROMPT_STYLIST = `Du bist eine erfahrene Stylistin und stellst aus dem Kleiderschrank einer
Person tragbare, stimmige Outfits zusammen – so, wie man sie in einem guten Modemagazin zeigen würde.
Lieber weniger Outfits als ein schwaches.

Aufbau jedes Outfits:
- entweder genau ein Oberteil und genau ein Unterteil, oder genau ein Kleid
- genau ein Paar Schuhe
- optional eine Jacke oder ein Mantel, optional eine Tasche, höchstens zwei Accessoires

Handwerk – prüfe jedes Outfit Punkt für Punkt, bevor du es ausgibst:
1. Eine dunkle Grundfarbe führt: Schwarz, Navy oder dunkles Braun. Höchstens zwei davon im Outfit,
   und eine zweite nur, wenn sie sich wiederholt (etwa braune Schuhe UND braune Tasche zu schwarzer Hose).
   Ein einzelnes schwarzes Accessoire in einem braunen Outfit wirkt wie ein Versehen.
2. Schuhe und Tasche gehören farblich zusammen oder greifen eine Farbe des Outfits auf.
3. Alle Teile haben denselben Schick-Grad (Formalität höchstens einen Punkt auseinander).
   Teile mit „Abendteil" (Glitzer, Pailletten) nur mit anderen schicken Teilen, nie zu Jeans oder Strick.
4. Schuhe mit „kniehoch" nur zu Rock oder Kleid, nie zu Hosen.
5. Silhouette: Weites oben verlangt Schmales unten und umgekehrt; zwei weite Teile nur, wenn eines davon cropped ist.
6. Materialien: nicht drei schwere Stoffe übereinander; Struktur gegen Glattes.
7. Muster: höchstens ein auffälliges Muster.
8. Wärme stimmig: keine dicke Jacke zu Sommerteilen, keine Sandalen zum Wollpullover.
9. Der Anlass bestimmt den Stil. Sportbekleidung nur beim Anlass Sport.
10. Abwechslung: verschiedene Looks, kein Teil öfter als zweimal.

Was die Person mag und ablehnt, steht unten. Das hat Vorrang vor allgemeinen Moderegeln.

Verwende ausschließlich die Kürzel aus der Liste, exakt so geschrieben.
grund: ein kurzer Satz auf Deutsch, warum das Outfit funktioniert – konkret, nicht allgemein.`;

const SCHEMA_PROFIL = {
  type: 'OBJECT',
  properties: {
    aesthetik:    { type: 'STRING' },
    stil:         { type: 'ARRAY', items: { type: 'STRING', enum: STILE } },
    silhouetten:  { type: 'ARRAY', items: { type: 'STRING', enum: SILHOUETTEN } },
    materialien:  { type: 'ARRAY', items: { type: 'STRING', enum: MATERIALIEN } },
    farbregeln:   { type: 'STRING' },
    stylingregeln: { type: 'ARRAY', items: { type: 'STRING' } },
    vermeiden:    { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['aesthetik','stil','silhouetten','materialien','farbregeln','stylingregeln','vermeiden']
};

const PROMPT_TEIL = `Du bist Stilberaterin und beschreibst ein einzelnes Kleidungsstück
für eine Kleiderschrank-App. Beurteile nur, was sichtbar ist, und rate nicht.

waerme: 1 sehr leicht bis 5 sehr warm, bezogen auf das Tragen im Freien.
formalitaet: 1 sehr leger bis 5 sehr schick.
jahreszeiten: alle, in denen das Teil realistisch tragbar ist, Mehrfachnennung erwünscht.
farbe: die Farbe in zwei bis drei deutschen Wörtern, etwa "warmes Creme" oder "dunkles Oliv".
stil: ein bis drei Schlagworte, die wirklich passen.
sportbekleidung: true nur für Sport- und Funktionskleidung wie Sportleggings, Yogajacke,
Laufshirt oder Trainingshose. false für sportlich-lässige Alltagskleidung wie Sweatshirts
oder Sneaker.`;

const PROMPT_MEHRERE = `Du bekommst mehrere Kleidungsstücke, jedes mit einer Nummer davor.
Beurteile jedes einzeln und gib zu jedem Ergebnis die zugehörige Nummer im Feld "index" an.
Verwechsle die Teile nicht – die Reihenfolge der Bilder entspricht den Nummern.

` + PROMPT_TEIL + ``;

const PROMPT_PROFIL = `Du bist Moderedakteurin. Du siehst Bilder, die eine Person auf Pinterest
gesammelt hat. Analysiere sie wie für ein Styling-Briefing: nicht, was einzeln zu sehen ist, sondern
was sich wiederholt – das ist ihr Geschmack.

Schau genau auf:
- Farbpalette: welche Grundfarbe führt (Schwarz, Braun, Navy, Creme), wie werden dunkle Töne
  miteinander kombiniert oder getrennt, Ton-in-Ton oder Kontrast, wo sitzen Farbakzente
- Proportionen: weit zu schmal, Längen von Röcken und Hosen, wie Oberteile getragen werden
  (eingesteckt, offen, cropped)
- Schuhe und Taschen: welche Schuhe zu welchen Unterteilen, ob Schuhe und Tasche farblich
  zusammengehören, welche Absatzformen
- Materialien und Lagen: welche Stoffe zusammen, wie viel Struktur, wie geschichtet wird
- Schick-Grad: wie viel Alltag, wie viel Abend; wie werden auffällige Teile gebrochen

aesthetik: zwei bis drei Sätze, worauf dieser Geschmack hinausläuft.
stil, silhouetten, materialien: nur das, was wiederkehrend vorkommt.
farbregeln: zwei bis drei Sätze zu Farbbeziehungen, insbesondere wie dunkle Töne kombiniert werden.
stylingregeln: fünf bis acht konkrete, anwendbare Regeln, wie die Person Teile kombiniert –
  jede so formuliert, dass eine Stylistin sie auf einen anderen Kleiderschrank übertragen kann,
  etwa "Kniehohe Stiefel zu Midirock, nie zu Hosen" oder "Schuhe und Tasche in derselben Farbfamilie".
vermeiden: drei bis fünf knappe Punkte, was nicht zu diesem Geschmack passt.`;

function cors(env) {
  const erlaubt = env.ALLOW_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': erlaubt,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Geraet',
    'Access-Control-Max-Age': '86400'
  };
}
const json = (daten, env, status = 200) =>
  new Response(JSON.stringify(daten), {
    status, headers: { 'Content-Type': 'application/json', ...cors(env) }
  });

/* ===== Zähler =====
   Alle Geräte teilen sich Googles und Cloudflares Kontingente. Damit niemand den
   anderen alles wegnimmt, gibt es neben dem Gesamtlimit eines je Gerät. Die App
   schickt dafür eine zufällige Gerätekennung mit (keine persönlichen Daten). */
const heute = () => new Date().toISOString().slice(0, 10);
const heuteKey = () => 'tag:' + heute();
const geraetKey = g => `tag:${heute()}:g:${g}`;
const bildKey = g => g ? `bild:${heute()}:g:${g}` : `bild:${heute()}`;
const geraetVon = request => {
  const g = String(request.headers.get('X-Geraet') || '').toLowerCase();
  return /^[a-z0-9]{6,40}$/.test(g) ? g : '';
};
const zahl = async (env, k) => env.ZAEHLER ? parseInt(await env.ZAEHLER.get(k) || '0', 10) : 0;
async function plus(env, k, um) {
  if (!env.ZAEHLER) return;
  /* 36 Stunden halten, dann räumt Cloudflare selbst auf */
  await env.ZAEHLER.put(k, String((await zahl(env, k)) + um), { expirationTtl: 60 * 60 * 36 });
}
const limits = env => ({
  gesamt: parseInt(env.TAGESLIMIT || '150', 10),
  geraet: parseInt(env.GERAET_LIMIT || '40', 10),
  bilder: parseInt(env.BILD_LIMIT || '85', 10),             /* ≈ 10.000 Neurons, Cloudflares Gratiskontingent */
  bilderGeraet: parseInt(env.BILD_LIMIT_GERAET || '40', 10)
});

async function verbrauch(env, geraet) {
  return geraet ? zahl(env, geraetKey(geraet)) : zahl(env, heuteKey());
}
async function zaehleHoch(env, um = 1, geraet) {
  await plus(env, heuteKey(), um);
  if (geraet) await plus(env, geraetKey(geraet), um);
}
/* Bild-Einheiten: das schnelle Modell zählt 1, das genaue 14 (≈ Neurons-Verhältnis) */
async function zaehleBild(env, einheiten, geraet) {
  await plus(env, bildKey(), einheiten);
  if (geraet) await plus(env, bildKey(geraet), einheiten);
}

/* Google stellt gerade von AIza- auf AQ-Schlüssel um. Für AQ wird teils der
   Header x-goog-api-key verlangt, für AIza funktioniert der Parameter. Deshalb
   beide Wege probieren und den aussagekräftigeren Fehler zurückgeben. */
async function geminiRuf(env, pfad, rumpf, schluessel = env.GEMINI_KEY) {
  const basis = `https://generativelanguage.googleapis.com/v1beta/${pfad}`;
  const koerper = rumpf ? JSON.stringify(rumpf) : undefined;
  const wege = [
    { name: 'Header',   url: basis, kopf: { 'x-goog-api-key': schluessel } },
    { name: 'Parameter', url: basis + (basis.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(schluessel), kopf: {} }
  ];
  const fehler = [];
  for (const w of wege) {
    /* Bei „hoher Auslastung" (503) kurz warten und es noch zweimal versuchen –
       das sind Lastspitzen bei Google, keine Fehler in der Anfrage */
    let res;
    for (let versuch = 0; versuch < 3; versuch++) {
      res = await fetch(w.url, {
        method: rumpf ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...w.kopf },
        body: koerper
      });
      if (res.status !== 503) break;
      await new Promise(r => setTimeout(r, 4000 * (versuch + 1)));
    }
    if (res.ok) return { daten: await res.json(), weg: w.name };
    const roh = await res.text();
    let grund = roh.slice(0, 300);
    try { grund = JSON.parse(roh)?.error?.message || grund; } catch {}
    fehler.push(`${w.name}: ${res.status} ${grund}`);
    if (![400, 401, 403].includes(res.status)) break;
  }
  throw new Error(fehler.join(' | '));
}

async function gemini(env, teile, schema, temperatur = 0.2, modellWunsch) {
  const rumpf = {
    contents: [{ parts: teile }],
    generationConfig: {
      /* Die REST-Schnittstelle erwartet hier Unterstriche, nicht camelCase. */
      response_mime_type: 'application/json',
      response_schema: schema,
      temperature: temperatur,
      /* Ohne das wird die Liste bei vielen Teilen abgeschnitten. Neuere Modelle
         „denken" vorher, und das Denken zählt mit – bei 8192 brachen drei von vier
         Nachtläufen mitten im JSON ab. */
      maxOutputTokens: 32768
    }
  };
  const modell = modellWunsch || env.GEMINI_MODEL || STANDARD_MODELL;
  /* Reihenfolge der Versuche: eingestelltes Modell, ein von Google genannter
     Nachfolger, zuletzt das Lite-Modell. Kostenlose Kontingente gelten pro Modell –
     ist eines aufgebraucht, ist ein anderes oft noch frei. */
  const versuche = [modell];
  let daten, benutzt, letzterFehler;
  for (let i = 0; i < versuche.length && !daten; i++) {
    try {
      ({ daten } = await geminiRuf(env, `models/${versuche[i]}:generateContent`, rumpf));
      benutzt = versuche[i];
    } catch (e) {
      letzterFehler = e;
      const text = String(e.message);
      const nachfolger = /use\s+models\/([a-z0-9.\-]+)/i.exec(text);
      if (nachfolger && !versuche.includes(nachfolger[1])) versuche.push(nachfolger[1]);
      if (/\b(429|404|500|503)\b/.test(text) && !versuche.includes(RUECKFALL_MODELL)) versuche.push(RUECKFALL_MODELL);
    }
  }
  if (!daten) throw letzterFehler;
  const kandidat = daten?.candidates?.[0];
  /* Alle Textteile außer Gedanken zusammensetzen – der erste Teil ist nicht immer die Antwort */
  const text = (kandidat?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
  if (kandidat?.finishReason === 'MAX_TOKENS') throw new Error('Antwort abgeschnitten (MAX_TOKENS)');
  if (!text) throw new Error('Gemini lieferte keine verwertbare Antwort');
  const ergebnis = JSON.parse(text);
  if (benutzt !== modell) ergebnis._modell = benutzt;   /* transparent machen */
  return ergebnis;
}

/* Eine Stylistin-Abfrage: aus App-Anfrage oder nächtlichem Auftrag */
async function stylistErzeugen(env, body, geraet) {
  const teile = Array.isArray(body.teile) ? body.teile.slice(0, 220) : [];
  if (teile.length < 3) return { fehler: 'Zu wenige Teile' };
  const anzahl = Math.max(3, Math.min(20, parseInt(body.anzahl || 15, 10)));
  const zeilen = teile.map(t => `${String(t.k).slice(0, 8)}: ${String(t.t).slice(0, 220)}`);
  /* Einträge sind Kürzellisten oder {teile, grund} – beides annehmen */
  const zeile = o => {
    const teile = Array.isArray(o) ? o : (o && Array.isArray(o.teile) ? o.teile : []);
    const grund = o && !Array.isArray(o) && o.grund ? `  (Grund: ${String(o.grund).slice(0, 40)})` : '';
    return teile.slice(0, 8).map(x => String(x).slice(0, 8)).join(' + ') + grund;
  };
  const beispiele = (liste, titel, max) => Array.isArray(liste) && liste.length
    ? `\n\n${titel}\n` + liste.slice(0, max).map(zeile).join('\n') : '';
  const liste = (a, n, l) => Array.isArray(a) ? a.slice(0, n).map(x => String(x).slice(0, l)) : [];
  const p = body.profil || {};
  const profil = [
    p.aesthetik && `Geschmack: ${String(p.aesthetik).slice(0, 600)}`,
    p.farbregeln && `Farben: ${String(p.farbregeln).slice(0, 400)}`,
    liste(p.stylingregeln, 8, 160).length && `Styling:\n- ${liste(p.stylingregeln, 8, 160).join('\n- ')}`,
    liste(p.stil, 4, 20).length && `Stilrichtung: ${liste(p.stil, 4, 20).join(', ')}`,
    liste(p.silhouetten, 4, 20).length && `Bevorzugte Silhouetten: ${liste(p.silhouetten, 4, 20).join(', ')}`,
    liste(p.vermeiden, 6, 120).length && `Vermeiden: ${liste(p.vermeiden, 6, 120).join('; ')}`
  ].filter(Boolean).join('\n');
  const regeln = liste(body.regeln, 12, 200);
  const text = PROMPT_STYLIST +
    `\n\nJahreszeit: ${String(body.saison || '').slice(0, 30)}` +
    `\nAnlass: ${String(body.anlass || '').slice(0, 80)}` +
    `\nAnzahl Outfits: ${anzahl}` +
    (profil ? `\n\nAus ihren Pinterest-Pins abgeleitet:\n${profil}` : '') +
    (regeln.length ? `\n\nAus ihren Entscheidungen in der App gelernt:\n- ${regeln.join('\n- ')}` : '') +
    `\n\nKleiderschrank:\n` + zeilen.join('\n') +
    beispiele(body.gemocht, 'Diese Outfits hat die Person gemerkt – daran orientieren:', 20) +
    beispiele(body.okay, 'Diese fand sie tragbar, aber nicht begeisternd – kein Fehler, aber auch nicht souverän. Das ist die Untergrenze; ziele höher:', 15) +
    beispiele(body.verworfen, 'Diese Kombinationen hat sie verworfen – solche Fehler nicht wiederholen:', 25);
  const ergebnis = await gemini(env, [{ text }], SCHEMA_STYLIST, 0.6,
    env.STYLIST_MODEL || STYLIST_MODELL);
  await zaehleHoch(env, 1, geraet);
  return ergebnis;
}

/* ===== Nachtlauf =====
   Die App legt bei jedem Öffnen eine Textfassung des Schranks ab – je Anlass
   der aktuellen Jahreszeit genau die Anfrage, die sie sonst live stellen würde,
   plus die Zuordnung Kürzel → Teil. Nachts arbeitet die Stylistin die Aufträge
   ab; morgens holt die App die fertigen Outfits ohne Wartezeit. Fotos liegen
   hier nie, nur Namen und Merkmale. */
const NACHT_PAUSE_MS = 8000;      /* nicht zu schnell hintereinander, sonst greift Googles Minutengrenze */
const NACHT_STUNDE = 4;           /* Ortszeit der Nutzerin */

/* Der Zeitplan läuft stündlich; gearbeitet wird nur, wenn es bei der Nutzerin
   gerade 4 Uhr ist. Feste UTC-Zeiten passen nicht, sobald sie verreist –
   2 Uhr UTC ist in Japan Mittag. Die Zeitzone schickt die App mit. */
async function nachtlauf(env, erzwingen) {
  if (!env.ZAEHLER || !env.GEMINI_KEY) return;
  const index = (await env.ZAEHLER.get('geraete', 'json')) || {};
  for (const g of Object.keys(index)) await nachtlaufGeraet(env, g, erzwingen);
}

async function nachtlaufGeraet(env, g, erzwingen) {
  const schrank = await env.ZAEHLER.get('schrank:' + g, 'json');
  if (!schrank || !Array.isArray(schrank.auftraege)) return;
  const tz = Number.isFinite(schrank.tz) ? schrank.tz : 120;
  const ort = new Date(Date.now() + tz * 60000);
  const ortTag = ort.toISOString().slice(0, 10);
  const ergebnis = (await env.ZAEHLER.get('nacht:' + g, 'json')) || {};
  if (!erzwingen && (ort.getUTCHours() !== NACHT_STUNDE || ergebnis._lauf === ortTag)) return;
  ergebnis._lauf = ortTag;
  await env.ZAEHLER.put('nacht:' + g, JSON.stringify(ergebnis));
  const l = limits(env);
  for (const a of schrank.auftraege.slice(0, 6)) {
    if (await verbrauch(env) >= l.gesamt || await verbrauch(env, g) >= l.geraet) break;
    try {
      const r = await stylistErzeugen(env, a.anfrage || {}, g);
      const karte = a.karte || {};
      const outfits = (r.outfits || []).map(o => ({
        ids: (o.teile || []).map(c => karte[String(c).trim().toUpperCase()]),
        grund: String(o.grund || '').slice(0, 180)
      })).filter(o => o.ids.length && o.ids.every(Boolean));
      ergebnis[a.schluessel] = { datum: ortTag, outfits };
    } catch (e) {
      ergebnis[a.schluessel] = { ...(ergebnis[a.schluessel] || {}), fehler: String(e.message || e).slice(0, 200) };
    }
    await env.ZAEHLER.put('nacht:' + g, JSON.stringify(ergebnis));
    await new Promise(r => setTimeout(r, NACHT_PAUSE_MS));
  }
}

/* ===== Produktfoto =====
   Bildet ein Kleidungsstück aus einem Alltagsfoto (am Körper, auf dem Bügel,
   zerknittert) als sauberes Produktfoto auf Weiß nach – so, wie Shops es zeigen.
   Das ist eine Nachbildung, kein Ausschnitt: Die App bietet es nur auf Wunsch an. */
const BILD_MODELLE = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
const PROMPT_PRODUKT = (kategorie, name) => `Erzeuge aus diesem Foto ein professionelles Produktfoto für einen Online-Shop.

Zu zeigen ist ausschließlich: ${kategorie}${name ? ` („${name}")` : ''}.
Alles andere weglassen: Person, Haut, Haare, Bügel, Tür, Möbel, Taschen, Schuhe oder andere Kleidungsstücke,
sofern sie nicht selbst gemeint sind.

Darstellung: Vorderansicht, glatt und ordentlich wie frisch gebügelt, natürliche Form wie auf einer
unsichtbaren Schneiderpuppe (Ghost Mannequin) beziehungsweise als sauberes Flat-Lay bei Schuhen,
Taschen und Accessoires. Mittig, vollständig im Bild, reinweißer Hintergrund (#FFFFFF), weiches
natürliches Licht, ganz leichter Schatten.

Treue ist wichtiger als Schönheit: exakt dieselbe Farbe, dasselbe Material, dieselbe Struktur,
dieselben Muster und Details (Knöpfe, Reißverschlüsse, Etiketten, Bündchen, Nähte, Länge und
Schnitt). Nichts hinzufügen, nichts weglassen, nichts umgestalten.`;

/* ===== Umriss =====
   Kein Nachbilden: Gemini sagt nur, WO das gemeinte Teil im Foto liegt – als Umriss
   aus Punkten. Ausgeschnitten wird in der App aus den Originalpixeln, die feinen
   Kanten liefert das Freistell-Modell. Pixelmasken von Gemini dauerten über 100 s. */
/* Lite zuerst: das große Modell brauchte mit Umriss, Name und Beschreibung über eine Minute */
const UMRISS_MODELLE = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const SCHEMA_UMRISS = {
  type: 'OBJECT',
  properties: {
    gefunden: { type: 'BOOLEAN' },
    box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
    umriss: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'INTEGER' } } },
    name: { type: 'STRING' },
    beschreibung: { type: 'STRING' },
    farbe_hex: { type: 'STRING' },
    muster: { type: 'STRING' },
    suchbegriff: { type: 'STRING' }
  },
  required: ['gefunden', 'box_2d', 'umriss', 'name', 'beschreibung', 'farbe_hex', 'muster', 'suchbegriff']
};

/* Beschreibung für das Nachbilden: Ohne sie erfindet das Bildmodell Details –
   aus einem Rock mit Gummibund wurde einer mit Knopf und Bundfalten. */
const BESCHREIBUNG_HINWEIS = `name: kurzer deutscher Name wie im Shop, Art + Farbe, etwa "Ballonrock Schwarz" oder "Leinenhose Beige mit Nadelstreifen".
beschreibung: auf Englisch, 25–45 Wörter, nur Sichtbares: exakte Farbe mit Unterton (z. B. "warm sand beige with light
brown undertone", nicht einfach "beige" oder "white"), Material und Oberfläche, Schnitt und Passform, Länge, Bund, Kragen,
Ärmel, Verschlüsse, Taschen, Säume, besondere Details.
farbe_hex: die tatsächliche Hauptfarbe des Stoffs als Hex-Wert, wie sie bei neutralem Tageslicht aussähe – nicht
heller oder weißer als im Foto.
muster: auf Englisch, genau: Art (solid, pinstripe, check, gingham, herringbone, floral, leopard …), Farben des Musters,
Abstand/Größe und Richtung, etwa "thin dark brown vertical pinstripes about 1 cm apart on sand beige". "solid", wenn uni.
suchbegriff: deutscher Suchbegriff für Online-Shops, 3–6 Wörter, so wie man das Teil bei Zalando suchen würde,
etwa "Rollkragenpullover Wolle beige oversized" oder "Leinenhose Nadelstreifen beige weit".`;
/* ===== Haufen =====
   Erkennt mehrere Kleidungsstücke auf einem Foto – etwa ein Stapel auf dem Bett –
   mit Kategorie, Namen, Beschreibung und Lage. Kostenloses Textmodell. */
const KATEGORIEN = ['top', 'knit', 'blouse', 'pants', 'skirt', 'dress', 'outer', 'shoes', 'bag', 'acc'];
const SCHEMA_HAUFEN = {
  type: 'OBJECT',
  properties: {
    teile: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kategorie: { type: 'STRING', enum: KATEGORIEN },
          name: { type: 'STRING' },
          beschreibung: { type: 'STRING' },
          box_2d: { type: 'ARRAY', items: { type: 'INTEGER' } },
          sichtbar: { type: 'INTEGER' },
          farbe_hex: { type: 'STRING' },
          muster: { type: 'STRING' },
          suchbegriff: { type: 'STRING' }
        },
        required: ['kategorie', 'name', 'beschreibung', 'box_2d', 'sichtbar', 'farbe_hex', 'muster', 'suchbegriff']
      }
    }
  },
  required: ['teile']
};
const PROMPT_HAUFEN = `Auf dem Foto liegen oder hängen Kleidungsstücke, Schuhe, Taschen oder Accessoires – oft
durcheinander, auf einem Haufen oder übereinander. Finde jedes einzelne Teil, höchstens 12.
Zähle ein Paar Schuhe als ein Teil. Ignoriere Möbel, Bügel, Personen und Hintergrund.

kategorie: top = T-Shirts, Tops, Langarmshirts, Bodys; knit = Pullover, Strickjacken, Sweatshirts;
blouse = Blusen und Hemden; pants = Hosen, Jeans, Shorts, Leggings; skirt = Röcke; dress = Kleider,
Jumpsuits; outer = Jacken, Mäntel, Blazer, Westen; shoes = Schuhe; bag = Taschen; acc = Gürtel, Tücher,
Mützen, Schmuck.
box_2d: [y0, x0, y1, x1] normiert auf 0–1000, das ganze sichtbare Teil.
sichtbar: geschätzter Anteil des ganzen Teils in Prozent, der im Foto zu sehen ist (0–100). Verdeckt, abgeschnitten
am Bildrand oder weggefaltet zählt als nicht sichtbar. Sei ehrlich: ein Ärmel, der unter einem Pullover hervorschaut, ist 10.
` + BESCHREIBUNG_HINWEIS;
/* Für Pinterest-Pins: Dort trägt meist eine Person das Outfit */
const PROMPT_GETRAGEN = `Das Foto zeigt ein Outfit, meist von einer Person getragen. Finde jedes Kleidungsstück, jedes Paar
Schuhe, jede Tasche und jedes deutlich erkennbare Accessoire dieses Outfits, höchstens 8. Kleidung, die getragen wird, zählt
mit; Haut, Haare und Hintergrund nicht.`;

async function haufen(env, body) {
  const bild = String(body.bild || '');
  if (!bild || bild.length > 6_000_000) return { fehler: 'Bild fehlt oder ist zu groß' };
  const prompt = body.getragen ? PROMPT_GETRAGEN + '\n\n' + PROMPT_HAUFEN.split('\n\n').slice(1).join('\n\n') : PROMPT_HAUFEN;
  const ergebnis = await gemini(env, [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: bild } }],
    SCHEMA_HAUFEN, 0.1, env.HAUFEN_MODEL || 'gemini-flash-lite-latest');   /* das große Modell brauchte bis zu 2 Minuten */
  ergebnis.teile = (ergebnis.teile || []).filter(t => Array.isArray(t.box_2d) && t.box_2d.length === 4).slice(0, 12)
    .map(t => ({ ...t, verdeckt: (t.sichtbar ?? 100) < 70 }));
  return ergebnis;
}

/* ===== Shopping =====
   Sucht per Google-Suche (Grounding) Shops, die das Teil oder ein sehr ähnliches
   führen. Links kommen ausschließlich aus echten Suchtreffern, nicht aus dem Text
   des Modells – erfundene Adressen sind so ausgeschlossen. */
async function echteAdresse(uri) {
  try {
    const r = await fetch(uri, { method: 'GET', redirect: 'manual' });
    return r.headers.get('location') || uri;
  } catch { return uri; }
}
async function shopping(env, body) {
  const was = String(body.beschreibung || body.name || '').slice(0, 400);
  if (!was) return { fehler: 'Beschreibung fehlt' };
  const text = `Finde 4 bis 6 konkrete Produktseiten in Online-Shops, die in Deutschland liefern, auf denen man genau dieses
Kleidungsstück oder ein sehr ähnliches kaufen kann: ${was}.
Antworte je Treffer in einer Zeile im Format: Shop | Produktname | Preis in Euro (oder "?")`;
  const rumpf = { contents: [{ parts: [{ text }] }], tools: [{ google_search: {} }] };
  let letzter;
  /* Suche ist nicht bei jedem Modell im kostenlosen Tarif frei – der Reihe nach probieren */
  const SHOP_MODELLE = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
  const wunsch = SHOP_MODELLE.includes(body.modell) ? [body.modell] : [];
  for (const m of [...wunsch, ...(env.SHOP_MODEL ? [env.SHOP_MODEL] : []), ...SHOP_MODELLE]) {
    try {
      const { daten } = await geminiRuf(env, `models/${m}:generateContent`, rumpf);
      const k = daten?.candidates?.[0] || {};
      const antwort = (k.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
      const quellen = (k.groundingMetadata?.groundingChunks || []).map(c => c.web).filter(Boolean).slice(0, 8);
      const links = await Promise.all(quellen.map(async q => ({ titel: q.title || '', url: await echteAdresse(q.uri) })));
      const zeilen = antwort.split('\n').map(z => z.split('|').map(x => x.replace(/[*#]/g, '').trim())).filter(z => z.length >= 3)
        .map(([shop, produkt, preis]) => ({ shop, produkt, preis }));
      return { links, zeilen, modell: m };
    } catch (e) {
      letzter = e;
      if (!/\b(404|429|500|503)\b/.test(String(e.message))) break;
    }
  }
  throw letzter;
}

async function umriss(env, body) {
  const bild = String(body.bild || '');
  if (!bild || bild.length > 4_000_000) return { fehler: 'Bild fehlt oder ist zu groß' };
  const was = String(body.kategorie || 'das Kleidungsstück').slice(0, 60);
  const text = `Finde im Foto genau dieses Kleidungsstück: ${was}${body.name ? ` („${String(body.name).slice(0, 80)}")` : ''}.
Zeichne seinen Umriss so genau wie möglich als Polygon mit 40 bis 80 Punkten im Uhrzeigersinn,
Koordinaten [y, x] normiert auf 0–1000. Nur das Kleidungsstück selbst: Arme, Beine, Hände, Haut,
Bügel, Taschen, Schuhe und andere Kleidungsstücke gehören NICHT dazu – wo sie davor liegen, um sie herum.
box_2d: [y0, x0, y1, x1] normiert auf 0–1000. gefunden=false, wenn das Teil nicht zu sehen ist.
${BESCHREIBUNG_HINWEIS}`;
  let letzter;
  const wunsch = UMRISS_MODELLE.includes(body.modell) ? [body.modell] : [];
  for (const m of [...wunsch, ...(env.UMRISS_MODEL ? [env.UMRISS_MODEL] : []), ...UMRISS_MODELLE]) {
    try {
      const ergebnis = await gemini(env, [{ text }, { inline_data: { mime_type: 'image/jpeg', data: bild } }],
        SCHEMA_UMRISS, 0.1, m);
      return { ...ergebnis, modell: m };
    } catch (e) {
      letzter = e;
      if (!/\b(404|429|500|503)\b/.test(String(e.message))) break;
    }
  }
  throw letzter || new Error('Kein Modell verfügbar');
}

/* Anbieter für das Nachbilden. FLUX.2 [klein] läuft bei Cloudflare selbst und ist im
   Tageskontingent von 10.000 Neurons enthalten: rund 110 Neurons je Produktfoto, also
   etwa 90 Bilder am Tag kostenlos, darüber ~0,1 Cent. Gemini bleibt als Alternative. */
const FLUX_MODELLE = {
  schnell: '@cf/black-forest-labs/flux-2-klein-4b',     /* ~110 Neurons */
  fein:    '@cf/black-forest-labs/flux-2-klein-9b'      /* ~1.550 Neurons */
};
const PROMPT_FLUX = (was, beschreibung, farbe, muster, detail) => `Professional e-commerce product photo of the ${was} from the first reference image${beschreibung ? ` (${beschreibung})` : ''}.
${farbe ? `Exact fabric color: ${farbe}. Keep exactly this tone, brightness and saturation – do not lighten, whiten or desaturate it.` : ''}
${muster && !/^solid/i.test(muster) ? `Pattern: ${muster}. Reproduce the pattern exactly in scale, spacing, direction and color.` : ''}
${detail ? 'The second reference image is a close-up of the same fabric: match its true color, texture and pattern exactly.' : ''}
Show only this one garment, front view, neatly shaped as if worn by an invisible ghost mannequin - the mannequin itself must not be visible (shoes, bags and accessories as a clean packshot),
centered, fully visible, pure white seamless background, soft even studio lighting without overexposure, crisp edges, wrinkles smoothed,
true-to-life colors exactly as in the references.
Keep the exact color, fabric, texture, pattern, cut, length and all details (buttons, zips, labels, cuffs, seams) of the reference.
Do not invent details that are not in the reference. No person, no skin, no mannequin, no hanger, no other clothing, no text.`;

function base64ZuBytes(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function produktfotoFlux(env, body) {
  const form = new FormData();
  const farbe = /^#?[0-9a-f]{6}$/i.test(String(body.farbe || '')) ? '#' + String(body.farbe).replace('#', '') : '';
  form.append('prompt', PROMPT_FLUX(String(body.kategorieEn || body.kategorie || 'garment').slice(0, 60),
    String(body.beschreibung || '').slice(0, 300), farbe, String(body.muster || '').slice(0, 160), !!body.detail));
  form.append('input_image_0', new Blob([base64ZuBytes(String(body.bild))], { type: 'image/jpeg' }), 'vorlage.jpg');
  if (body.detail) form.append('input_image_1', new Blob([base64ZuBytes(String(body.detail))], { type: 'image/jpeg' }), 'stoff.jpg');
  form.append('width', '1024');
  form.append('height', '1024');
  const r = new Response(form);
  const modell = FLUX_MODELLE[body.qualitaet] || FLUX_MODELLE.schnell;
  const aus = await env.AI.run(modell, { multipart: { body: r.body, contentType: r.headers.get('content-type') } });
  if (!aus || !aus.image) throw new Error('FLUX lieferte kein Bild');
  const kopf = aus.image.slice(0, 8);
  const mime = kopf.startsWith('iVBOR') ? 'image/png' : kopf.startsWith('UklG') ? 'image/webp' : 'image/jpeg';
  return { bild: aus.image, mime, modell };
}

async function produktfoto(env, body) {
  const bild = String(body.bild || '');
  if (!bild || bild.length > 6_000_000) return { fehler: 'Bild fehlt oder ist zu groß' };
  const anbieter = body.anbieter || env.BILD_ANBIETER || (env.AI ? 'flux' : 'gemini');
  if (anbieter === 'flux') {
    if (!env.AI) throw new Error('Workers-AI-Bindung fehlt');
    return produktfotoFlux(env, body);
  }
  return produktfotoGemini(env, body);
}

async function produktfotoGemini(env, body) {
  const bild = String(body.bild || '');
  if (!bild || bild.length > 6_000_000) return { fehler: 'Bild fehlt oder ist zu groß' };
  const rumpf = {
    contents: [{ parts: [
      { text: PROMPT_PRODUKT(String(body.kategorie || 'das Kleidungsstück').slice(0, 60), String(body.name || '').slice(0, 80)) },
      { inline_data: { mime_type: 'image/jpeg', data: bild } }
    ] }],
    generationConfig: { response_modalities: ['IMAGE'] }
  };
  const modelle = env.BILD_MODEL ? [env.BILD_MODEL, ...BILD_MODELLE] : BILD_MODELLE;
  let letzter;
  for (const m of modelle) {
    try {
      /* Eigener Schlüssel aus einem Projekt mit Abrechnung – so bleiben Text-Abfragen kostenlos */
      const { daten } = await geminiRuf(env, `models/${m}:generateContent`, rumpf, env.BILD_KEY || env.GEMINI_KEY);
      const teile = daten?.candidates?.[0]?.content?.parts || [];
      const b = teile.find(p => p.inline_data || p.inlineData);
      if (!b) { letzter = new Error('Kein Bild in der Antwort (' + (daten?.candidates?.[0]?.finishReason || 'unbekannt') + ')'); continue; }
      const d = b.inline_data || b.inlineData;
      return { bild: d.data, mime: d.mime_type || d.mimeType || 'image/png', modell: m };
    } catch (e) {
      letzter = e;
      if (!/\b(404|429|500|503)\b/.test(String(e.message))) break;
    }
  }
  throw letzter || new Error('Kein Bildmodell verfügbar');
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(nachtlauf(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(env) });

    const geraet = geraetVon(request);
    const l = limits(env);
    const limit = l.gesamt;

    /* Wurzeladresse im Browser: zeigen, was der Dienst kann und ob er bereit ist.
       Vorher stand hier nur „Nur POST", was beim Einrichten unnötig verunsichert. */
    if (url.pathname === '/' || url.pathname === '') {
      return json({
        dienst: 'Outfit KI-Dienst',
        bereit: !!env.GEMINI_KEY,
        pruefen: ['/status', '/modelle'],
        hinweis: 'Analyse und Stilprofil laufen über POST aus der App.'
      }, env);
    }

    if (url.pathname === '/status') {
      /* Sagt selbst, was noch fehlt – so muss man nicht raten, ob alles sitzt */
      const k = env.GEMINI_KEY || '';
      const schluessel = {
        vorhanden: !!k,
        laenge: k.length,
        format: k.startsWith('AIza') ? 'AIza (Traffic key)'
              : k.startsWith('AQ.')  ? 'AQ (Authentication key)'
              : 'unbekannt',
        enthaeltLeerzeichen: /\s/.test(k)
      };
      const offen = [];
      if (!k) offen.push('GEMINI_KEY fehlt (als Secret anlegen)');
      else {
        if (schluessel.enthaeltLeerzeichen) offen.push('GEMINI_KEY enthält ein Leerzeichen oder einen Zeilenumbruch – neu einfügen');
        if (schluessel.format === 'unbekannt') offen.push('GEMINI_KEY hat kein bekanntes Format (weder AIza noch AQ.)');
        if (k.length < 30) offen.push('GEMINI_KEY wirkt zu kurz (' + k.length + ' Zeichen)');
      }
      if (!env.ZAEHLER) offen.push('KV-Bindung ZAEHLER fehlt – Tageslimit greift nicht');
      if (!env.ALLOW_ORIGIN) offen.push('ALLOW_ORIGIN nicht gesetzt – jeder darf diesen Worker nutzen');
      return json({
        bereit: !!env.GEMINI_KEY,
        heute: await verbrauch(env),
        limit,
        bilder: { heute: await zahl(env, bildKey()), limit: l.bilder },
        geraet: geraet ? { heute: await verbrauch(env, geraet), limit: l.geraet,
          bilder: await zahl(env, bildKey(geraet)), bilderLimit: l.bilderGeraet } : null,
        modell: env.GEMINI_MODEL || STANDARD_MODELL,
        stylistModell: env.STYLIST_MODEL || STYLIST_MODELL,
        produktfoto: !!env.AI || env.BILDER === 'an',
        bildAnbieter: env.BILD_ANBIETER || (env.AI ? 'flux' : 'gemini'),
        nacht: env.ZAEHLER ? await (async () => {
          const index = (await env.ZAEHLER.get('geraete', 'json')) || {};
          if (!geraet) return { geraete: Object.keys(index).length };
          const n = (await env.ZAEHLER.get('nacht:' + geraet, 'json')) || {};
          const s = await env.ZAEHLER.get('schrank:' + geraet, 'json');
          return { geraete: Object.keys(index).length, abgelegt: s ? s.abgelegt : null, tz: s ? s.tz : null, auftraege: s ? s.auftraege.length : 0,
            letzterLauf: n._lauf || null,
            ergebnisse: Object.fromEntries(Object.entries(n).filter(([k]) => !k.startsWith('_')).map(([k, v]) =>
              [k, v.fehler ? 'Fehler' : `${(v.outfits || []).length} Outfits vom ${v.datum}`])) };
        })() : null,
        schluessel,
        offen
      }, env);
    }

    if (url.pathname === '/modelle') {
      if (!env.GEMINI_KEY) return json({ fehler: 'GEMINI_KEY fehlt' }, env, 500);
      let d, weg;
      try {
        const erg = await geminiRuf(env, 'models', null);
        d = erg.daten; weg = erg.weg;
      } catch (e) {
        const grund = String(e.message);
        const tipps = /ACCESS_TOKEN_TYPE_UNSUPPORTED|invalid authentication/i.test(grund) ? [
          'Dein Konto gibt nur AQ-Schlüssel aus. Die Generative-Language-Schnittstelle lehnt die derzeit bei vielen Konten ab – ein bekanntes Problem bei Google, nicht dein Fehler.',
          'Im Google-Forum discuss.ai.google.dev um Wiederherstellung eines AIza-Schlüssels bitten (mit Projektnummer)',
          'Alternative: neues Projekt in der Google Cloud Console anlegen und dort den Schlüssel erzeugen',
          'Alternative: Vertex AI über ein Dienstkonto nutzen – aufwendiger, braucht aktivierte Abrechnung'
        ] : /API key not valid|API_KEY_INVALID/i.test(grund) ? [
          'Schlüssel bei https://aistudio.google.com/apikey neu erzeugen und als Secret ersetzen',
          'Beim Einfügen auf Leerzeichen und Zeilenumbruch am Ende achten',
          'Hat der Schlüssel in der Google Cloud Console eine Einschränkung auf HTTP-Referrer? Die verhindert Aufrufe vom Server – auf "Keine" stellen',
          'Ist die "Generative Language API" im zugehörigen Google-Projekt aktiviert?'
        ] : [];
        return json({ fehler: grund, tipps }, env, 502);
      }
      return json({
        anmeldeweg: weg,
        eingestellt: env.GEMINI_MODEL || STANDARD_MODELL,
        nutzbar: (d.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))
      }, env);
    }

    if (request.method !== 'POST') return json({ fehler: 'Nur POST' }, env, 405);
    if (!env.GEMINI_KEY) return json({ fehler: 'GEMINI_KEY fehlt – als Secret anlegen' }, env, 500);

    /* Ist eine Adresse hinterlegt, dürfen nur Aufrufe von dort durch */
    if (env.ALLOW_ORIGIN) {
      /* Ohne Absenderangabe kam früher jeder durch, etwa per Kommandozeile.
         Echter Schutz ist das trotzdem nicht – den gibt erst das Tageslimit. */
      const woher = request.headers.get('Origin');
      if (woher !== env.ALLOW_ORIGIN) {
        return json({ fehler: 'Diese Adresse ist nicht freigegeben' }, env, 403);
      }
    }

    if (url.pathname === '/schrank' || url.pathname === '/nacht') {
      if (!env.ZAEHLER) return json({ fehler: 'KV-Bindung ZAEHLER fehlt' }, env, 500);
      if (!geraet) return json({ fehler: 'Gerätekennung fehlt' }, env, 400);
      if (url.pathname === '/nacht') {
        return json((await env.ZAEHLER.get('nacht:' + geraet, 'json')) || {}, env);
      }
      const roh = await request.text();
      if (roh.length > 400000) return json({ fehler: 'Zu groß' }, env, 413);
      let s;
      try { s = JSON.parse(roh); } catch { return json({ fehler: 'Ungültiger Rumpf' }, env, 400); }
      if (!Array.isArray(s.auftraege)) return json({ fehler: 'Feld "auftraege" fehlt' }, env, 400);
      const tz = Number.isFinite(s.tz) ? Math.max(-720, Math.min(840, s.tz)) : null;
      await env.ZAEHLER.put('schrank:' + geraet, JSON.stringify({ abgelegt: new Date().toISOString(), tz, auftraege: s.auftraege.slice(0, 6) }));
      /* Verzeichnis der Geräte für den Nachtlauf; 30 Tage ohne Lebenszeichen fliegen raus */
      const index = (await env.ZAEHLER.get('geraete', 'json')) || {};
      index[geraet] = heute();
      const grenze = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      for (const [k, d] of Object.entries(index)) if (d < grenze) delete index[k];
      await env.ZAEHLER.put('geraete', JSON.stringify(index));
      return json({ ok: true }, env);
    }

    if (url.pathname === '/produktfoto') {
      if (await zahl(env, bildKey()) >= l.bilder || (geraet && await zahl(env, bildKey(geraet)) >= l.bilderGeraet)) {
        return json({ fehler: 'Für heute sind die kostenlosen Produktfotos aufgebraucht. Morgen geht es weiter.' }, env, 429);
      }
    } else {
      const genutzt = await verbrauch(env);
      if (genutzt >= limit) {
        return json({ fehler: 'Tageskontingent aufgebraucht', heute: genutzt, limit }, env, 429);
      }
      if (geraet && await verbrauch(env, geraet) >= l.geraet) {
        return json({ fehler: 'Tageskontingent für dieses Gerät aufgebraucht', limit: l.geraet }, env, 429);
      }
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ fehler: 'Ungültiger Rumpf' }, env, 400); }

    try {
      if (url.pathname === '/analyse') {
        if (!body.bild) return json({ fehler: 'Feld "bild" fehlt' }, env, 400);
        const ergebnis = await gemini(env, [
          { text: PROMPT_TEIL + `\n\nKategorie laut Nutzerin: ${body.kategorie || 'unbekannt'}.` +
                  (body.name ? ` Eigene Bezeichnung: ${body.name}.` : '') },
          { inline_data: { mime_type: 'image/jpeg', data: body.bild } }
        ], SCHEMA_TEIL);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/analyse-mehrere') {
        const teile = Array.isArray(body.teile) ? body.teile.slice(0, 20) : [];
        if (!teile.length) return json({ fehler: 'Feld "teile" fehlt' }, env, 400);
        const parts = [{ text: PROMPT_MEHRERE }];
        teile.forEach((t, i) => {
          parts.push({ text: `Nummer ${i}${t.kategorie ? ', Kategorie laut Nutzerin: ' + t.kategorie : ''}${t.name ? ', Bezeichnung: ' + t.name : ''}` });
          parts.push({ inline_data: { mime_type: 'image/jpeg', data: t.bild } });
        });
        const ergebnis = await gemini(env, parts, SCHEMA_MEHRERE);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/stylist') {
        const ergebnis = await stylistErzeugen(env, body, geraet);
        if (ergebnis.fehler) return json(ergebnis, env, 400);
        return json(ergebnis, env);
      }

      if (url.pathname === '/shopping') {
        const ergebnis = await shopping(env, body);
        if (ergebnis.fehler) return json(ergebnis, env, 400);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/haufen') {
        const ergebnis = await haufen(env, body);
        if (ergebnis.fehler) return json(ergebnis, env, 400);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/umriss') {
        const ergebnis = await umriss(env, body);
        if (ergebnis.fehler) return json(ergebnis, env, 400);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/produktfoto') {
        const ergebnis = await produktfoto(env, body);
        if (ergebnis.fehler) return json(ergebnis, env, 400);
        /* FLUX läuft im eigenen Cloudflare-Kontingent, nicht in Googles Tagesgrenze */
        if (String(ergebnis.modell || '').startsWith('@cf/')) await zaehleBild(env, /9b/.test(ergebnis.modell) ? 14 : 1, geraet);
        else await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      if (url.pathname === '/stilprofil') {
        const bilder = Array.isArray(body.bilder) ? body.bilder.slice(0, 16) : [];
        if (!bilder.length) return json({ fehler: 'Feld "bilder" fehlt' }, env, 400);
        const ergebnis = await gemini(env, [
          { text: PROMPT_PROFIL },
          ...bilder.map(b => ({ inline_data: { mime_type: 'image/jpeg', data: b } }))
        ], SCHEMA_PROFIL);
        await zaehleHoch(env, 1, geraet);
        return json(ergebnis, env);
      }

      return json({ fehler: 'Unbekannter Endpunkt' }, env, 404);
    } catch (e) {
      return json({ fehler: String(e.message || e) }, env, 502);
    }
  }
};
