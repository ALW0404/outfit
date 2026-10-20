# KI einrichten — Schritt für Schritt

Zwei Dinge musst du anlegen: einen **Gemini-Schlüssel** bei Google und einen **Worker** bei
Cloudflare. Zusammen etwa 15 Minuten. Du brauchst **kein Node.js** und musst nichts installieren.

**Warum der Umweg über einen Worker?** Der Gemini-Schlüssel darf nicht in die App. Alles, was
in der App steht, kann jeder lesen, der die Seite öffnet — dein Schlüssel wäre sofort
missbrauchbar. Im Worker liegt er sicher.

---

# Teil 1 · Gemini-Schlüssel (3 Minuten)

### 1.1
Öffne **<https://aistudio.google.com/apikey>** und melde dich mit deinem Google-Konto an.

### 1.2
Klicke **Create API key**. Wähle ein bestehendes Projekt oder lege ein neues an.

### 1.3
Kopiere den Schlüssel. Er fängt mit `AIza` an.

> Lass das Fenster offen oder lege den Schlüssel kurz in eine Notiz. Du brauchst ihn gleich.
> **Nicht** in den Projektordner speichern.

---

# Teil 2 · Worker anlegen (7 Minuten)

### 2.1 — Neuen Worker erstellen

Öffne **<https://dash.cloudflare.com/?to=/:account/workers-and-pages>**

Klicke auf **Create** (manchmal *Create application*) → **Workers** → **Hello World** →
**Deploy**.

Vergib vorher den Namen **`outfit-ki`**.

> Je nach Oberfläche heißt der Menüpunkt links *Workers & Pages* oder *Compute*. Beides führt
> an dieselbe Stelle.

### 2.2 — Code einsetzen

Klicke **Edit code** (oder **`</>` Edit**).

Im Editor **alles markieren und löschen**, dann den gesamten Inhalt der Datei
**`worker/worker.js`** einfügen.

Klicke **Deploy**.

Oben steht jetzt deine Adresse, etwa:
`https://outfit-ki.dein-konto.workers.dev`

**Kopiere sie.**

### 2.3 — Schlüssel hinterlegen

Gehe im Worker auf **Settings** → **Variables and Secrets** → **Add**.

| Feld | Wert |
|---|---|
| Type | **Secret** ← wichtig, nicht *Text* |
| Name | `GEMINI_KEY` |
| Value | dein `AIza…`-Schlüssel |

**Save** und danach **Deploy**.

### 2.4 — Modellnamen festlegen  ← **häufigste Fehlerquelle**

Rufe auf: deine Worker-Adresse mit **`/modelle`** am Ende.

Du bekommst eine Liste aller Modelle, die **dein** Schlüssel nutzen darf, und welches gerade
eingestellt ist:

```json
{"eingestellt":"gemini-2.5-flash","nutzbar":["gemini-2.0-flash","gemini-flash-latest", …]}
```

Steht `eingestellt` **nicht** in `nutzbar`, antwortet Gemini mit 404 und die App zeigt „502".
Dann unter **Settings → Variables and Secrets** eine Textvariable anlegen:

| Name | Wert |
|---|---|
| `GEMINI_MODEL` | einen Namen aus deiner `nutzbar`-Liste, am besten einen mit `flash` |

**Achtung:** Die Liste unter `/modelle` zeigt auch Modelle, die Google für **neue Konten**
gesperrt hat. Sie erscheinen als nutzbar, liefern beim Aufruf aber:

```
404 This model models/… is no longer available to new users.
    Please update your code to use models/…
```

Der Worker liest den genannten Nachfolger aus der Meldung und versucht es einmal damit.
Trage ihn danach trotzdem fest in `GEMINI_MODEL` ein — das spart bei jedem Aufruf einen
Fehlversuch.

Wartungsarme Alternative: **`gemini-flash-latest`**. Das zieht automatisch auf das jeweils
aktuelle Flash-Modell nach und läuft nicht in diese Sperre.

**Deploy** und erneut `/modelle` aufrufen.

### 2.5 — Prüfen

Rufe im Browser auf: deine Worker-Adresse mit **`/status`** am Ende.

Du solltest sehen:

```json
{"bereit":true,"heute":0,"limit":10,"modell":"gemini-2.5-flash",
 "offen":["KV-Bindung ZAEHLER fehlt …","ALLOW_ORIGIN nicht gesetzt …"]}
```

`"bereit":true` heißt: **es funktioniert schon.** Die Punkte unter `offen` sind Teil 4 — sie
sind wichtig, aber nicht nötig zum Loslegen.

---

# Teil 3 · In der App eintragen (2 Minuten)

### 3.1
Die Worker-Adresse steht fest in `app.js` bei `STANDARD_WORKER`. In der App ist nichts
einzustellen.

Zum Prüfen gibt es versteckte Entwicklereinstellungen: Reiter **Daten**, **fünfmal auf die
Zeile „Belegt: … MB" tippen**. Dort lässt sich die Adresse für Tests überschreiben.

### 3.2
Worker-Adresse eintragen — **ohne** `/status` am Ende.

### 3.3
**Verbindung prüfen.** Die App zeigt dir jetzt genau dasselbe wie der Worker, inklusive dem,
was noch offen ist.

### 3.4
**Stapel starten.** Die App analysiert deine Teile nacheinander, 6,5 Sekunden Abstand wegen
Googles Minutengrenze. Bei 173 Teilen etwa **19 Minuten** — Reiter offen lassen. Mit
**Anhalten** unterbrechen; beim nächsten Start macht sie weiter.

### 3.5
Wenn ein paar Teile analysiert sind: Reiter **Trends** → **Stilprofil erstellen**.
Das kostet eine einzige Abfrage.

---

# Teil 4 · Absichern — **Pflicht**, seit die Adresse in der App steht

Die Worker-Adresse steht jetzt im Quelltext der App, und der ist öffentlich lesbar. Ohne diese
Schritte kann jeder sie herauslesen und dein Gemini-Kontingent verbrauchen.

`ALLOW_ORIGIN` sperrt Aufrufe von fremden Seiten und ohne Absenderangabe. **Echter Schutz ist
das allein nicht** — eine Absenderangabe lässt sich fälschen. Die eigentliche Bremse ist das
Tageslimit über `ZAEHLER`.

### 4.1 — Nur deine App zulassen

Worker → **Settings** → **Variables and Secrets** → **Add**:

| Feld | Wert |
|---|---|
| Type | Text |
| Name | `ALLOW_ORIGIN` |
| Value | die Adresse deiner App, z. B. `https://alw0404.github.io` |

Genau die Adresse, **ohne** Schrägstrich am Ende und ohne Pfad.

### 4.2 — Tageslimit scharf schalten

Erst einen Speicher anlegen:
**<https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces>** → **Create**
→ Name `outfit-zaehler` → anlegen.

Dann im Worker → **Settings** → **Bindings** → **Add** → **KV namespace**:

| Feld | Wert |
|---|---|
| Variable name | `ZAEHLER` |
| KV namespace | `outfit-zaehler` |

### 4.3 — Limit festlegen

Worker → **Settings** → **Variables and Secrets** → **Add**:

| Name | Wert |
|---|---|
| `TAGESLIMIT` | `200` zum Durcharbeiten, danach `20` |

Nach jeder Änderung **Deploy**. Dann nochmal `/status` aufrufen — die Liste `offen` sollte
leer sein.

---

# Wie viel ist kostenlos?

Google veröffentlicht **keine allgemeingültige Tabelle mehr**. Deine eigenen Werte stehen unter
**<https://aistudio.google.com/rate-limit>**. Dort nachsehen, bevor du `TAGESLIMIT` setzt.

**Am echten Konto gemessen** (Oktober 2026, `gemini-3.8-flash`, kostenloser Tarif):

| | Wert |
|---|---|
| Abfragen pro **Tag** | **20** |
| Sperre nach Erschöpfung | rund 36 Minuten, rollierend |

Die neueren Modelle haben deutlich engere Grenzen als ältere. Ältere Modelle wie
`gemini-2.5-flash` sind für neue Konten gesperrt.

**Auch Fehlversuche zählen** gegen das Kontingent — gescheiterte Aufrufe wegen falschem
Modellnamen oder Schlüssel verbrauchen es mit. Deinen echten Verbrauch siehst du unter
<https://ai.dev/rate-limit>, nicht im Worker: der zählt nur seine eigenen Aufrufe.

**Deshalb schickt die App zwanzig Teile in einer Abfrage.** Die Grenze zählt Abfragen, nicht
Bilder. Deine 173 Teile brauchen damit **9 Abfragen statt 173**.

**Die KI-Stylistin** braucht eine Abfrage je Auswahl (Jahreszeit + Anlass) und Tag, solange du
nicht von Hand neue Ideen holst – bei normaler Nutzung zwei bis vier am Tag. Sie schickt keine
Bilder, nur eine Textzeile je Teil, und ist damit deutlich günstiger als die Teil-Analyse.
Sie läuft auf dem stärkeren Modell `gemini-flash-latest`; ist dessen Kontingent erschöpft, springt
automatisch `gemini-flash-lite-latest` ein. Ein anderes Modell lässt sich mit der Variable
`STYLIST_MODEL` festlegen – `/status` zeigt unter `stylistModell`, welches gilt.

### Wenn das Kontingent trotzdem nicht reicht

| Weg | Wirkung |
|---|---|
| **Warten** | Die Sperre löst sich rollierend nach etwa 40 Minuten, nicht erst um Mitternacht |
| **Leichteres Modell** | Ist seit Fassung v22 die Vorgabe: `gemini-flash-lite-latest`. Höheres kostenloses Kontingent, und `-latest` wird nicht irgendwann gesperrt |
| **Abrechnung aktivieren** | Im Google-Projekt eine Zahlungsmethode hinterlegen. Für rund 175 Bildanalysen auf einem Flash-Modell liegen die Kosten im Cent-Bereich, die Grenzen steigen um ein Vielfaches |

Warum nicht alle auf einmal? Die *Ausgabe* ist die Grenze, nicht die Eingabe: 173 Ergebnisse
wären rund 14.000 Tokens und würden abgeschnitten. Dazu verliert das Modell bei sehr vielen
Bildern die Zuordnung, und ein Abbruch würde alles kosten statt zwölf Teile.

Die Minutengrenze stößt zuerst zu. Die App hält deshalb 6,5 Sekunden Abstand.

Die 10 pro Tag aus deiner anderen App sind **deine eigene** Begrenzung, nicht die von Google.

| Posten | Kosten |
|---|---|
| Cloudflare Workers | kostenlos bis 100.000 Aufrufe/Tag |
| Cloudflare KV | kostenlos bis 100.000 Lesevorgänge/Tag |
| Gemini (AI Studio) | kostenloser Tarif, danach nach Verbrauch |

---

# Wenn etwas klemmt

| Was du siehst | Was es bedeutet |
|---|---|
| `"bereit":false` | `GEMINI_KEY` fehlt oder wurde als *Text* statt als *Secret* angelegt |
| „Nicht erreichbar" | Adresse falsch, oder `ALLOW_ORIGIN` passt nicht zur App-Adresse |
| Antwort 403 | `ALLOW_ORIGIN` zeigt auf eine andere Adresse als die, von der du aufrufst |
| Antwort 502 | Gemini lehnt ab. **Die App zeigt jetzt den genauen Grund an.** |
| `API key not valid` | siehe unten |
| `{"fehler":"Nur POST"}` beim Aufruf der nackten Adresse | **kein Fehler.** Analyse und Stilprofil laufen über POST. Die Übersicht liegt auf `/`, `/status` und `/modelle` |
| „Tageskontingent aufgebraucht" | `TAGESLIMIT` erreicht; hochsetzen oder morgen weiter |
| Stapel stoppt nach wenigen Teilen | Googles Minutengrenze. Die App wartet automatisch 60 s und versucht es erneut |

---

# App zu Cloudflare Pages umziehen

Der Gewinn gegenüber GitHub Pages: die mitgelieferte Datei `_headers` schaltet mehrere
Prozessorkerne für das Freistell-Modell frei. GitHub Pages kann keine eigenen Kopfzeilen setzen.

## Variante A — ohne GitHub (Direct Upload)

**<https://dash.cloudflare.com/?to=/:account/pages>** → **Create application** →
**Get started** → **Drag and drop your files**

Projektnamen eingeben, den **gesamten Ordner `outfit`** hineinziehen → **Deploy site**.

Grenzen: 1.000 Dateien, 25 MB je Datei. Dein Projekt liegt deutlich darunter.

> Dabei lädst du weiterhin jedes Mal alles hoch — Direct Upload erspart dir GitHub,
> nicht das Hochladen.

## Variante B — aus dem Repository (empfohlen)

**Create application** → **Connect to Git** → Repository `outfit` →
Build command leer lassen, Output directory `/` → **Save and Deploy**.

Ab dann genügt ein Push, die Seite aktualisiert sich selbst. **Das** erspart dir das Hochladen.

## Danach in beiden Fällen

`ALLOW_ORIGIN` im Worker auf die neue Adresse ändern, z. B. `https://outfit.pages.dev`.
