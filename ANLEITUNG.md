# Outfit-App – Anleitung

> Der Weg Richtung App Store steht in [ROADMAP.md](ROADMAP.md).
> Die KI-Einrichtung (Gemini, Cloudflare) steht in [EINRICHTUNG.md](EINRICHTUNG.md).

Kleiderschrank-PWA: läuft komplett im Browser, kein Server, keine Accounts, keine laufenden Kosten.
Alle Bilder und Daten bleiben auf dem Gerät.

## Design

Seit dem 20.10.2026 im Editorial-Stil: Titel in *Instrument Serif* (Open Font License, liegt unter
`fonts/`), warmes Papier als Grund, Produktfotos auf Studiogrund. Die Tab-Leiste schwebt als Glas,
Blätter fahren hoch und runter, Karten fliegen mit Schwung. Die vorherige Fassung ist archiviert –
bei GitHub als Release **„Design 1 – vor dem Redesign“** (Tag `design-1`), lokal unter `archiv/`.

## Die fünf Reiter

**Heute** – ein Vorschlag nach dem anderen, zum Durchwischen. Oben stellst du Jahreszeit und
Anlass ein, darunter kommt die Karte. Drei Entscheidungen:

| | Bedeutung |
|---|---|
| **Take** (nach rechts wischen) | Favorit – wandert in *Outfits* |
| **Like** (Knopf) | tragbar, aber nicht souverän – kein Favorit, kein Fehler; kommt nach zwei Wochen wieder |
| **Toss** (nach links wischen) | kommt nie wieder |

Bei **Toss** klappt direkt unter der Karte die Frage *Was hat nicht gepasst?* auf: Farben,
Schuhe, Zu schick, Zu leger, Stilbruch, Jahreszeit, *Layer zu viel* (etwa wenn die Jacke
über dem Pullover zu eng wird) oder *k. A.* Erst mit der Antwort fliegt die
Karte raus; das × schließt die Frage, ohne zu verwerfen.

Die Heute-Ansicht ist so bemessen, dass Auswahl, Karte und Knöpfe ohne Scrollen auf den
Bildschirm passen – die Collage wird dafür bei Bedarf kleiner. Gewischt wird nur waagerecht.

Verworfene Kombinationen lassen sich zurückholen: wenn keine Vorschläge mehr übrig sind, erscheint
*Verworfene wieder zulassen*.

**Anlass Sport** zeigt nur Sportbekleidung und Sneaker – und Sportbekleidung taucht umgekehrt in
keinem anderen Anlass auf. Erkannt wird sie am Namen (Sport, Yoga, Pilates, Leggings …) oder an der
KI-Analyse; im Teil lässt sich das über den Knopf *Sportbekleidung* von Hand festlegen.

**KI-Stylistin.** Ist der KI-Dienst eingerichtet, stellt beim ersten Öffnen einer Auswahl
(Jahreszeit + Anlass) eine Stylistin 15 Outfits aus deinem Schrank zusammen – in einer einzigen
Abfrage. Sie achtet auf Silhouetten, Materialien und Farben, lernt aus deinen gemerkten und
verworfenen Outfits und schreibt zu jedem Vorschlag einen Satz, warum er funktioniert.
Jeder Vorschlag muss trotzdem die festen Regeln bestehen (Farbwelten, Wärme, Sport nur mit Sport);
was durchfällt, wird still aussortiert.

**Lernen aus Take und Toss.** Die App zählt bei jedem Vorschlag, welche Merkmale in deinen
verworfenen und welche in deinen gemerkten Outfits vorkommen – etwa Schwarz mit dunklem Braun,
Schuhe und Tasche in verschiedenen Farbfamilien, zwei Muster, Sneaker zu schicken Teilen.
Was du deutlich öfter verwirfst als merkst, bekommt Abzug; was du oft verworfen und nie gemerkt
hast, wird gesperrt. Das läuft live auf deinem Gerät mit deinem aktuellen Stand und wird bei
jedem Toss neu berechnet. Dieselben Erkenntnisse gehen als Sätze an die Stylistin, zusammen mit
deinen gemerkten Outfits und den letzten verworfenen.

**Like** zählt beim Lernen als halbes Plus und geht als eigene Gruppe an die Stylistin: „tragbar,
aber nicht begeisternd – das ist die Untergrenze". Begründete Ablehnungen bekommt die Stylistin
zuerst zu sehen. *Verworfene wieder zulassen* gibt die Kombinationen frei, vergisst
sie fürs Lernen aber nicht.

**Feste Stilregeln** zusätzlich: höchstens zwei dunkle Grundfarben (Schwarz, Navy, dunkles Braun),
kniehohe Stiefel nur zu Rock oder Kleid, Glitzer und Pailletten nur beim Anlass *Schick* und nur
zu schicken Teilen.

**Nachtlauf.** Jede Nacht gegen 4 Uhr stellt die Stylistin auf dem Server die Outfits für die
zuletzt gewählte Jahreszeit und alle vier Anlässe zusammen. Morgens sind sie beim Öffnen sofort da.
Dafür legt die App beim Öffnen und Verlassen eine Textfassung des Schranks in deinem
Cloudflare-Konto ab – Namen, Farben, Merkmale und das Gelernte, **keine Fotos**. Was du tagsüber
entscheidest, fließt so in die nächste Nacht ein. Wechselst du auf eine andere Jahreszeit, fragt die
App dort wie bisher live nach.

Von selbst fragt die App höchstens einmal am Tag je Auswahl nach. Sind die Vorschläge durch, laufen
die einfachen weiter; *Ideen der Stylistin holen* fragt sofort neu an. Ist der Dienst ausgelastet,
merkt man davon nur, dass die Begründung auf der Karte fehlt.

**Schrank** – alle Teile, gefiltert nach Kategorie. Neue Teile über Kamera, Fotomediathek
oder Zwischenablage.

**Outfits** – alles Gemerkte plus eigene Kombinationen, als Raster mit vier sichtbaren
Collagen. Antippen vergrößert und zeigt Teile, Farbwelten und Kategorie.

Sortieren nach *Neueste* oder *Saison* (Frühling/Sommer → Herbst/Winter → Special Occasion),
filtern nach Kategorie oder nach einem einzelnen Kleidungsstück.

Jede Kombination trägt eine **Kategorie** als Sticker in der Ecke: ☀️ Frühling/Sommer,
🍂 Herbst/Winter, ✨ Special Occasion. Sie wird beim Speichern aus den Teilen vorgeschlagen und lässt sich
in der Detailansicht ändern.

Über *+ Eigene* stellst du selbst zusammen: pro Baustein ein Teil auswählen, die Collage oben baut
sich sofort mit. Kleid und Oberteil/Unterteil schließen einander aus, Accessoires gehen zu zweit.

**Fixieren:** Mit dem Schloss neben einem gewählten Teil hältst du es fest. *Rest würfeln* tauscht
dann nur die übrigen Plätze aus – so baust du gezielt um ein Lieblingsstück herum. Sind Teile
fixiert, richtet sich die Jahreszeit nach ihnen: wer Shorts fixiert, bekommt kein Winteroutfit.

Dieselbe Kombination wird nicht doppelt abgelegt. Eigene Kombinationen darfst du auch über der
Drei-Farbwelten-Regel speichern – die Regel gilt für automatische Vorschläge, nicht für deine
eigene Entscheidung; die App weist nur darauf hin.

**Trends** – gesammelte Pinterest-Pins. Die App liest die Farbpalette aus jedem Pin und
bevorzugt Outfits in diesen Farbwelten.

Ist der KI-Dienst eingerichtet, entsteht daraus zusätzlich ein **Stilprofil**: Gemini liest aus
deinen Pins ab, worauf dein Geschmack zielt, und liefert Regeln zu Stil, Silhouetten, Materialien
und Farben. Der Regler **Gewichtung** entscheidet, wie stark das die Vorschläge steuert –
von „mein Stil" bis „ganz Trend".

**Daten** – Backup, Wiederherstellung, Bilder verkleinern.

## Kategorien

Tops & Shirts · Pullover & Strickjacken · Blusen · Hose · Rock · Kleid · Jacke & Mantel ·
Schuhe · Tasche · Accessoire

Beim Nachsortieren bietet die App die naheliegenden Unterkategorien an. Für Teile, die von
vornherein falsch einsortiert waren, gibt es dort zusätzlich **Andere Kategorie …** mit der
vollen Auswahl.

An Teilen, die in **keiner** gemerkten Kombination vorkommen, sitzt oben links eine kleine rote
Ecke. So siehst du, was im Schrank noch ungenutzt liegt.

Die Kategorie steuert, wo ein Teil in der Collage landet: Oberteile und Unterteile bilden
links die Silhouette, Jacke, Tasche und Schuhe stehen rechts, Accessoires sitzen mittig
oben und unten.

## Jahreszeiten

Jedes Teil bekommt eine oder mehrere Jahreszeiten – Mehrfachauswahl ist ausdrücklich vorgesehen,
eine Jeans darf zu Frühjahr, Herbst und Winter gehören. Beim Erfassen wird die Auswahl aus der
Wärme vorgeschlagen und lässt sich überschreiben.

Die Jahreszeit ist bei den Vorschlägen eine **harte** Bedingung: ein Teil, das nicht zur gewählten
Jahreszeit gehört, taucht gar nicht erst auf. Dazu kommen zwei weitere harte Regeln – kein tragendes
Teil darf grob aus der Jahreszeit fallen (das verhindert Sandalen unter dem Wollmantel), und zwischen
dem legersten und dem schicksten Teil dürfen höchstens zwei Stufen liegen.

Eine geratene Auswahl gilt als **unbestätigt**. Im Schrank steht dann oben *Jahreszeiten durchgehen*:
Teil für Teil mit vorbelegten Chips – stimmt es, ein Tipp auf *Übernehmen und weiter*; stimmt es
nicht, vorher korrigieren. *Später* schiebt ein Teil ans Ende. Sobald du die Jahreszeiten eines
Teils selbst anfasst – auch im normalen Bearbeiten-Dialog – gilt es als bestätigt. Im Reiter *Heute* werden nur Teile der
gewählten Jahreszeit kombiniert.

## Stilmerkmale

Ist der KI-Dienst eingerichtet, bekommt jedes Teil zusätzlich Silhouette, Material, Muster,
Stil-Schlagworte und eine Klartextfarbe. Die Vorschlagslogik nutzt das:

- **Silhouettenbalance** als harte Regel — oversized oben und weit unten wird nicht vorgeschlagen.
  Bewusster Kontrast (weit oben, schmal unten) wird belohnt.
- **Höchstens ein lautes Muster** je Outfit.
- **Materialmischung begrenzt** — nicht drei schwere Stoffe übereinander.
- **Stilkohärenz** — Teile mit gemeinsamer Handschrift werden bevorzugt.

Teile ohne Analyse blockieren nichts; sie zählen als neutral. Im Schrank zeigt der Filter
**ohne KI**, welche noch fehlen.

## Farbwelten

Die App liest aus jedem Bild die auffälligsten Farben und ordnet sie einer Farbwelt zu:
Rot & Rosé, Braun & Camel, Gelb & Senf, Grün, Türkis, Blau & Denim, Lila, Pink & Beere.

Weiß, Creme, Beige, Grau und Schwarz gelten als **Neutral** und zählen nicht mit.
Ein Outfit darf höchstens **drei bunte Farbwelten** enthalten – Vorschläge, die darüber liegen,
entstehen gar nicht erst.

Die Zuordnung schaut nicht nur auf den Farbton: ein dunkles, gedämpftes Warm ist Braun und
nicht Rot, ein helles warmes Creme ist Neutral und keine eigene Farbwelt.

## Pinterest

Direkt anzapfen geht nicht. Die Pinterest-API verlangt eine registrierte, freigegebene App mit
Server-Geheimnis, das eine reine Browser-App nicht sicher halten kann; zusätzlich blockiert der
Browser den direkten Zugriff auf fremde Seiten. Auch „App als Ziel im Teilen-Menü" scheidet aus –
das gibt es nur in Chrome auf Android, nicht in Safari.

Was funktioniert:

1. Pin in Pinterest öffnen → Teilen → **Bild sichern**
2. In der App unter *Trends* → **Aus Fotos** → Pin auswählen

Die App zieht sich die Farbpalette selbst heraus. Je mehr Pins, desto klarer das Bild deiner
aktuellen Farbwelten.

## Studio – Produktbild aus dem Handyfoto

Nach *Foto machen* oder *Aus Fotos* öffnet sich das Studio:

- **Freisteller per Modell.** Läuft auf dem Gerät, Fotos gehen nirgendwohin. Beim ersten Mal
  werden 15 MB geladen, danach offline.
- **Kante** regelt, wie hart der Rand ausfällt.
- **Licht korrigieren** hebt die Belichtung an – abschaltbar, wenn dir das Original lieber ist.
  **Belichtung** regelt zusätzlich nach.
- **Schatten entfernen** trimmt einen Schlagschatten am Rand weg. Standardmäßig aus, weil das
  Modell Schatten meist schon selbst ausschließt; bei hellen Teilen auf hellem Untergrund kann
  die Nachbehandlung sonst Löcher reißen.
- **Original ansehen** zeigt das unbearbeitete Foto zum Vergleich.

Das Modell berechnet nur eine Maske. Die Pixel deines Kleidungsstücks bleiben unverändert –
es wird nichts nachgezeichnet.

**Kein Weißabgleich.** Einer war eingebaut und wurde nach Messung wieder entfernt: er unterstellt,
der Untergrund sei neutral. Ein cremefarbenes Laken ist das nicht. Gemessen an einem
Original-Produktfoto kippte warmes Kunstlicht dadurch ins Blaue. Ohne ihn bleibt der Farbton
über alle Lichtsituationen stabil.

Bereits freigestellte Bilder (über „Motiv kopieren") erkennt das Studio und überspringt den
Freisteller.

## Teile erfassen – der schnelle Weg

1. Kleidungsstück flach hinlegen und fotografieren.
2. In der **Fotos**-App das Bild öffnen, das Kleidungsstück **lange antippen**.
3. **Motiv kopieren** wählen.
4. In der Outfit-App auf **Einfügen** tippen.

Damit ist der Hintergrund weg. Ohne diesen Schritt landet das Foto mitsamt Hintergrund im
Schrank – die App weist darauf hin, verbietet es aber nicht.

## Bilder verkleinern

Unter *Daten* → **Jetzt verkleinern**. Rechnet alle gespeicherten Bilder neu, wo möglich als
WebP. Bei 157 Teilen hat das im Test aus 89,7 MB noch 14,1 MB gemacht, in 13 Sekunden.
Lohnt sich: Safari räumt bei Platzmangel irgendwann Daten weg.

WebP schreiben kann Safari erst ab iOS 17. Auf älteren Systemen fällt die App automatisch auf
PNG zurück – dann ist die Ersparnis kleiner, aber nichts geht kaputt.

## Auf dem iPhone benutzen

1. Alle Dateien samt Ordner `ki/` ins Repo laden. (Der Umzug auf Cloudflare Pages
   nimmt dir diesen Schritt dauerhaft ab – siehe [ROADMAP.md](ROADMAP.md).)
2. Im Repo unter *Settings → Pages* den Branch als Quelle wählen.
3. Die Seite in **Safari** öffnen, Teilen-Symbol → **Zum Home-Bildschirm**.

## Updates und Zwischenspeicher

Seit Fassung v24 holt die App ihre Dateien **zuerst aus dem Netz** und nur ohne Verbindung aus
dem Zwischenspeicher. Vorher war es umgekehrt — deshalb zeigte die Homebildschirm-App die alte
Fassung, obwohl online längst eine neue lag. Die App fragt außerdem bei jedem Start und jeder
Rückkehr nach einer neuen Fassung und lädt sich dann einmal selbst neu.

Ausnahme: Modell und Laufzeit unter `ki/` kommen aus dem Zwischenspeicher. Die ändern sich nie.

`CACHE` in `sw.js` trotzdem bei jeder Änderung hochzählen — das räumt den alten Speicher ab.

**Niemals das Homebildschirm-Symbol löschen und neu anlegen, um ein Update zu erzwingen.**
iOS gibt jeder Homebildschirm-App einen eigenen Speicher — mit dem Symbol wäre dein ganzer
Schrank weg. Erst *Daten → Export mit Bildern*, falls es doch einmal nötig sein sollte.

## Lokal testen

```
python3 serve.py
```

startet einen Testserver auf <http://127.0.0.1:8735>. Vorher im Browser Service Worker und
Caches löschen, sonst läuft altes JavaScript.

## Backup

*Daten* → „Export mit Bildern" ist ein vollständiges Backup: Teile mit Bildern, KI-Analysen,
Stilprofil, gemerkte Outfits, gesammelte Pins und verworfene Kombinationen.

Beim Einlesen wird **zusammengeführt**, nicht einfach angehängt:

- Neue Teile kommen samt Analyse dazu.
- Bei Teilen, die es schon gibt, gewinnt der weiter fortgeschrittene Stand: eine Analyse aus
  dem Backup wird übernommen, wenn hier noch keine oder eine ältere ist; Unterkategorie und
  Jahreszeiten werden übernommen, wenn sie hier noch ungeprüft sind.
- **Was auf diesem Gerät schon bestätigt ist, wird nie überschrieben.**
- Gemerkte Outfits kommen dazu, dieselbe Kombination aber nicht doppelt.
- Das Stilprofil wird übernommen, wenn es neuer ist.

Ein Backup mehrfach einzulesen verändert nichts. Backups aus der alten Version werden beim Import automatisch auf die
neue Struktur gehoben; die alten Grobkategorien landen dann in der Nachsortier-Liste.
