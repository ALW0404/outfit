# Outfit – Weg in den App Store

Stand 18.10.2026. Lebendes Dokument: bei jedem Schritt fortschreiben.

## Die harten Rahmenbedingungen

| Punkt | Lage |
|---|---|
| Apple Developer Program | **99 €/Jahr**, dauerhaft. Erst fällig beim Einreichen. |
| Apple-Richtlinie 4.2 | Eine verpackte Webseite wird **abgelehnt**. Es braucht echte native Funktionen. |
| Xcode | Auf dem Mac fehlt es noch (nur Command Line Tools). Kostenlos, ca. 15 GB. |
| Node.js | Fehlt ebenfalls. Nötig für Capacitor. Kostenlos. |
| Datenschutzerklärung | Pflicht für jede App im Store, mit erreichbarer URL. |
| App-Privacy-Angaben | Pflicht. Derzeit einfach: Daten verlassen das Gerät nicht. |
| Mit Werbung/Tracking | Zusätzlich ATT-Abfrage und DSGVO-Zustimmung nötig. |

Die ursprüngliche Zusage „kostenlos ohne jegliche Abos" gilt ab dem Store-Schritt nicht mehr.

## Phase 0 – Design auf Produktniveau · *läuft*

- [x] Farb- und Typo-System: warme Neutraltöne, nahezu schwarze Primärfarbe, Terrakotta als Akzent
- [x] Emoji vollständig durch Strich-Icons ersetzt (`ICONS` + `ico()` in app.js)
- [x] Tab-Leiste mit echten Icons, Titel je Reiter, Trennlinie erst beim Scrollen
- [x] App-Icon neu: Kleiderbügel, cremefarben auf Tiefschwarz, mit Kantenglättung
- [x] **Studio**: aus dem Handyfoto ein Produktbild – Freisteller per Modell,
      Weißabgleich über die Hintergrundfläche, Belichtung, einheitlicher Rand
- [ ] Leerzustände und Ladezustände gestalten
- [ ] Bewegung: Übergänge zwischen Reitern, Karten-Animation beim Wischen
- [ ] Onboarding für neue Nutzer (erste Teile erfassen)
- [ ] Barrierefreiheit: Kontraste prüfen, Dynamic Type, VoiceOver-Beschriftungen

## Phase 0b – Umzug auf Cloudflare Pages · *empfohlen, zwei harte Vorteile*

- [ ] Projekt auf Cloudflare Pages umziehen, Deploy direkt aus Git
- [x] `_headers` liegt bereit (COOP/COEP + Cache für `ki/`)

**Warum das mehr ist als Geschmack:**

1. **Kein manuelles Hochladen mehr.** Cloudflare Pages baut direkt aus dem Repository.
2. **Eigene Kopfzeilen.** Mit `Cross-Origin-Opener-Policy` und `-Embedder-Policy` wird die Seite
   cross-origin-isoliert. Erst dann darf WebAssembly mehrere Kerne nutzen, und das
   Freistell-Modell läuft spürbar schneller. GitHub Pages kann keine eigenen Kopfzeilen setzen.
3. Workers und R2 liegen im selben Konto – der Server aus Phase 1 ist dort keine neue Baustelle.

## Phase 1 – Server · *Voraussetzung für beide Upgrades*

Ein kleiner Dienst, der nachts läuft. Gratis-Tarife reichen anfangs.

- [ ] Hosting wählen (Cloudflare Workers, Deno Deploy oder Fly.io)
- [ ] Nächtlicher Import der Produktfeeds
- [ ] Endpunkt: Produktsuche nach Kategorie, Farbwelt, Jahreszeit
- [ ] Endpunkt: Trendbild der Saison (Farbwelten und Silhouetten aus den Feeds)

**Erkenntnis:** Affiliate und Trends brauchen *dieselbe* Infrastruktur. Was die Shops
gerade in ihre Neuheiten stellen, ist der Trend. Pinterest wird dafür nicht gebraucht.

## Phase 1b – KI-Teileanalyse · *gebaut, wartet auf Einrichtung*

- [x] Stilmerkmale je Teil: Silhouette, Material, Muster, Stil-Schlagworte, Klartextfarbe
- [x] Engine nutzt sie: Silhouettenbalance als **harte** Regel (oversized oben + weit unten
      wird abgelehnt), höchstens ein lautes Muster, Materialmischung begrenzt, Stilkohärenz
      als Bonus, Kontrast-Bonus für weit/schmal
- [x] Cloudflare Worker (`worker/worker.js`) mit Tageslimit über KV
- [x] Stapelverarbeitung mit Wiederaufnahme nach Kontingentgrenze
- [x] Bestätigte Werte des Nutzers werden **nicht** überschrieben
- [ ] Einrichtung durch den Nutzer → [EINRICHTUNG.md](EINRICHTUNG.md)
- [ ] 173 Teile analysieren lassen

## Phase 2 – Upgrade „Trends"

- [x] Worker-Endpunkt `/stilprofil` (Pins → Stilregeln als JSON)
- [x] App-Seite: zwölf neueste Pins senden, Profil anzeigen, Regler „mein Stil ↔ ganz Trend"
- [x] Engine wertet Stil, Silhouetten und Materialien des Profils aus, gewichtet über den Regler
- [ ] Stufe 1: Trendbild aus den Produktfeeds ableiten
- [ ] Regler „mein Stil ↔ was gerade läuft" – gewichtet Trend gegen den eigenen Schrank
      und die bisherigen Take-/Toss-Entscheidungen
- [ ] Optional später: Pinterest-OAuth für die **eigenen** Boards.
      Kostenlos, aber echte Bürokratie: Entwicklerkonto, App anlegen, Prüfung, Ausgang offen.
      Liefert **nicht** allgemeine Trends – Pinterest Trends hat keine offene Schnittstelle.

## Phase 3 – Upgrade „Shops & Geld"

- [ ] Stufe 1: **Such-Deeplinks.** Aus Kategorie + Farbwelt + Jahreszeit einen Shop-Suchlink
      mit Partner-ID bauen. Kein Server, keine Produktdaten nötig.
- [ ] Bei Awin und Tradedoubler als Publisher anmelden, Shops einzeln freischalten lassen
      (Mango, H&M, Zalando, About You). **Zara/Inditex hat vermutlich kein offenes Programm –
      vor der Umsetzung prüfen.**
- [ ] Stufe 2: **Produktfeeds.** Echte Produkte mit Bild und Preis. Die Datenbank liefern
      die Netzwerke, sie wird nicht selbst gepflegt.
- [ ] Fremde Teile als Outfit-Bestandteil, mit Marker in der Collage (gestrichelt + Preis)
- [ ] Schalter: **nur eigene Teile** ↔ **fremde Teile als Inspiration zulassen**

Ehrliche Erwartung: bei 5–10 % Provision braucht es vierstellige monatliche Nutzerzahlen,
bevor die 99 € gedeckt sind.

## Phase 4 – Verkaufen (Vinted, Kleinanzeigen)

Direktes Einstellen ist **nicht möglich** – weder Vinted (= Kleiderkreisel) noch
Kleinanzeigen bieten eine offene Schnittstelle für Privatinserate. Scraping scheidet
bei einer Store-App aus.

- [ ] Inseratsentwurf erzeugen: Titel, Beschreibung, Kategorie, Zustand, Preisvorschlag
- [ ] In die Zwischenablage legen, Teilen-Menü öffnen, Foto ist bereits freigestellt
- [ ] Neue Felder am Teil: Marke, Kaufpreis, Zustand (sonst ist der Preisvorschlag geraten)
- [ ] Einstieg über die rote Ecke: „Diese Teile stecken in keinem Outfit. Verkaufen?"

## Phase 5 – Nativ und Store

- [ ] Xcode und Node installieren
- [ ] Capacitor-Projekt, bestehende PWA als Grundlage
- [ ] Echte native Funktionen gegen Richtlinie 4.2: Kamera, Fotobibliothek,
      Mitteilungen, Home-Screen-Widget mit dem Outfit des Tages, Haptik
- [ ] Datenschutzerklärung und Support-Seite veröffentlichen
- [ ] App-Store-Eintrag: Screenshots, Beschreibung, Altersfreigabe, Privacy-Angaben
- [ ] 99 € zahlen, einreichen, Review

## Studio – wie es arbeitet

`ki/u2netp.onnx` (4,4 MB, **Apache 2.0**, also kommerziell nutzbar) über `onnxruntime-web`.
Das Modell berechnet **nur eine Maske**; die Pixel des Kleidungsstücks bleiben unverändert.
Ein generatives Modell wie Gemini würde das Teil neu zeichnen und dabei Muster und Etiketten
erfinden – für einen Kleiderschrank das falsche Werkzeug.

Verbreitete Alternativen wie RMBG-1.4 sind **nicht-kommerziell** lizenziert und damit für eine
Store-App mit Werbung oder Affiliate unbrauchbar. Darauf bei jedem Modellwechsel achten.

Am Originalfoto gemessen (Strickpullover, Wahrheit `#bcaf9b`, Farbton 36°, Sättigung 0,198,
Helligkeit 0,673): Ergebnis 37° / 0,185 / 0,692 bei 100 % erhaltener Fläche.

Fällt das Modell aus, greift der einfache Freisteller über Farbe und Kanten. Der ist bei hellen
Teilen auf hellem Grund deutlich schlechter – er ist nur ein Rückfall, keine Lösung.

Später auf iOS: Apples Vision-Schnittstelle (dieselbe wie „Motiv kopieren") als schnellerer Weg,
Modell als Rückfall. Das Browser-Modell läuft auch in der nativen App, weil Capacitor eine
WebView ist – einmal gebaut, überall nutzbar.

## Wofür Gemini sinnvoll wäre

Nicht zum Freistellen, aber:

- [ ] Teile automatisch erkennen: Kategorie, Farbe, Material, Jahreszeit, Anlass aus dem Foto
      (spart genau die Handarbeit, die 157 Teile gekostet haben)
- [ ] Verkaufsinserate texten (Phase 4)
- [ ] Pins auswerten und in Stilregeln übersetzen

## Offene Entscheidungen

1. Finanzierung endgültig: Affiliate, Einmalpreis oder vorerst gar nichts
2. Trendquelle: nur Produktfeeds oder zusätzlich Pinterest-OAuth
3. Name der App im Store („Outfit" ist als Suchbegriff wertlos)
