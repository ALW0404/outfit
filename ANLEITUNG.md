# Outfit-App – Anleitung

Kleiderschrank-PWA: läuft komplett im Browser, keine Server, keine Accounts, keine laufenden Kosten.
Alle Bilder und Daten bleiben auf dem Gerät.

## Was drin ist (Stand 21.09.2026)

- **Schrank**: Kleidungsstücke erfassen mit Foto, aus der Fotomediathek oder aus der Zwischenablage.
  Hintergrund wird automatisch weggeschnitten, wenn das Bild transparent ist; Farben werden aus dem
  Bild gelesen; pro Teil Kategorie, Wärme (1–5) und Anlass (1–5).
- **Körper**: Ganzkörperfoto plus Kalibrierung über sechs Punkte. Danach lassen sich Teile darauf legen.
- **Testvorschau**: würfelt ein Beispiel-Outfit aus dem Schrank aufs Körperfoto.
- **Daten**: Backup als JSON (mit oder ohne Bilder), Wiedereinlesen, alles löschen.

Noch **nicht** drin: die Vorschlagslogik (Wetter, Anlass, Stimmung, drei Vorschläge morgens).

## Auf dem iPhone benutzen

1. Die acht Dateien `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.json`,
   `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` in ein **öffentliches** GitHub-Repo laden.
   (GitHub Pages gibt es im Gratis-Tarif nur für öffentliche Repos.)
   `ANLEITUNG.md`, `make_icons.py` und `serve.py` gehören **nicht** dazu – die sind nur fürs Entwickeln.
2. Im Repo unter *Settings → Pages* als Quelle den Branch wählen. Nach ein paar Minuten gibt es eine URL.
3. Die URL in **Safari** öffnen (nicht Chrome), Teilen-Symbol → **Zum Home-Bildschirm**.
4. Ab dann startet sie wie eine normale App und funktioniert auch offline.

## Teile erfassen – der schnelle Weg

Der beste Weg zu sauberen Bildern kostet nichts und steckt schon im iPhone:

1. Kleidungsstück flach hinlegen (Bett, Boden, ruhiger Untergrund) und fotografieren.
2. In der **Fotos**-App das Bild öffnen, das Kleidungsstück **lange antippen**, bis es aufleuchtet.
3. **Motiv kopieren** wählen.
4. In der Outfit-App auf **Einfügen** tippen.

Damit ist der Hintergrund weg und das Teil liegt sauber frei. Ohne diesen Schritt landet das Foto
mitsamt Hintergrund im Schrank – die App weist darauf hin, verbietet es aber nicht.

Fotografiere alle Teile möglichst aus demselben Abstand und in derselben Haltung. Dann passt die
Größe auf dem Körperfoto meistens von allein.

## Kalibrierung

Einmalig im Reiter **Körper**: Ganzkörperfoto wählen, dann sechs Punkte antippen
(beide Schultern, Taille, Schritt, Knie, Boden). Erst danach kann die App Kleidung an die richtige
Stelle legen.

Sitzt ein einzelnes Teil daneben, lässt sich das im Schrank beim jeweiligen Teil korrigieren:
**Breite**, **Länge**, **Seitlich**, **Höhe**. Das ist einmal pro Teil nötig und bleibt gespeichert.
Besonders die Länge ist oft anzupassen, weil sie aus dem Seitenverhältnis des Fotos kommt –
eine Hose, die zu kurz wirkt, ist meist nur zu nah fotografiert.

## Cache-Falle (wichtig beim Weiterentwickeln)

`sw.js` cacht aggressiv. Nach **jeder** Änderung an `app.js`, `style.css` oder `index.html` muss oben
in `sw.js` die Zeile

```js
const CACHE = 'outfit-v1';
```

hochgezählt werden (`outfit-v2`, `outfit-v3`, …). Sonst behalten schon installierte Geräte die alte
Version und die Änderung kommt nie an.

## Lokal testen

```
python3 serve.py
```

startet einen Testserver auf <http://127.0.0.1:8735>. Im Browser vorher Service Worker und Caches
löschen, sonst läuft altes JavaScript.

Icons neu erzeugen: `python3 make_icons.py` (braucht keine externen Bibliotheken).

## Backup

Im Reiter **Daten** gibt es „Export mit Bildern". Das ist ein vollständiges Backup inklusive
Kleidungsfotos und Körperfoto (ca. 10–15 KB pro Teil). Sinnvoll, bevor du Safari-Daten löschst oder
das Gerät wechselst – die App speichert ausschließlich lokal, es gibt keine Kopie in der Cloud.

Ein Backup mehrfach einzulesen erzeugt keine Duplikate: bereits bekannte Teile werden übersprungen.
