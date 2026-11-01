# UNAUFHALTSAM

Psychologischer Fokus- und Frusttest aus Eddie’s World.

**Real life. No staging.**

UNAUFHALTSAM ist kein klassisches Casual Game. Das Spiel testet Fokus, Erinnerung und Durchhaltevermögen unter steigendem Druck.

Ein Fehler beendet den Lauf.

## Spielprinzip

1. Eine Box wird markiert.
2. Die Position muss gemerkt werden.
3. Die Boxen werden gemischt.
4. Die richtige Box muss gewählt werden.
5. Mit jeder erfolgreichen Runde steigt die Schwierigkeit.

Das System wächst bis zur **Wall bei 30 Boxen**.

## Projektstruktur

```text
/
├── index.html
├── game/
│   └── index.html
├── unaufhaltsam/
│   └── index.html
├── datenschutz.html
├── impressum.html
├── logo.png
├── eddie_head.png
├── eddie_tongue.png
└── unaufhaltsam_brand.png
```

### `index.html`

Kompakte Standalone-Version des Fokus-Games.

- HTML / CSS / JavaScript
- kein Build-System
- kein Framework
- lokaler Bestwert über `localStorage`
- direkter Einstieg über den Browser

### `game/index.html`

Kleine eigenständige Spielversion.

### `unaufhaltsam/index.html`

Erweiterte Version des Spiels.

Enthalten sind unter anderem:

- Firebase-Anbindung
- Firestore
- anonyme Firebase-Authentifizierung
- globales Leaderboard
- lokaler Bestwert
- steigende Schwierigkeit
- maximale Spielgrenze bei 30 Boxen
- Eddie-/UNAUFHALTSAM-Branding

## Technologie

- HTML5
- CSS
- Vanilla JavaScript
- Firebase SDK 9.22 Compat
- Firebase Authentication
- Cloud Firestore
- Browser `localStorage`

Es gibt keine klassische Build-Pipeline. Das Projekt kann als statische Website ausgeliefert werden.

## Spielstand

Der lokale Bestwert wird im Browser gespeichert.

Die erweiterte Version verwendet zusätzlich Firebase für das globale Ranking.

## Level 30

Level 30 ist die Wall.

Das Spiel begrenzt die Anzahl der Boxen auf 30 und den für das globale Ranking gespeicherten Fortschritt entsprechend.

## Plattformstatus

UNAUFHALTSAM existiert als eigenständiges Webgame.

Zusätzliche Plattformversionen oder Integrationen sollten vom Kernspiel getrennt behandelt werden. Der Webgame-Kern bleibt dabei die gemeinsame Basis.

## Direkter Ergebnisbildschirm

Alle drei Spieleinstiege verwenden `results.js` und `results.css`:

- Ergebnis mit erreichtem Level (der bisherigen Boxenanzahl) und Laufzeit seit Start, einschließlich Merken, Mischen und Aufdecken.
- Bestehende lokale Rekordschlüssel und Wertung bleiben erhalten. Mehr gelöste Runden zählen; die Zeit ist kein zusätzlicher Ranking-Tiebreaker.
- „Noch ein Versuch“ setzt den Lauf ohne Seitenreload zurück. Der bestehende Animationsloop wird nicht erneut gestartet.
- Web Share auf unterstützten Geräten; sonst Clipboard, bei verweigertem Zugriff manuell markierbarer Text. Ein abgebrochener Share-Dialog kopiert nichts. Geteilt wird die aktuelle Spielroute ohne Query-Parameter oder Fragment.
- Die Firebase-Version zeigt direkt das Ergebnis. Nur bei einem neuen lokalen Rekord ist die Namenseingabe für das globale Ranking optional erreichbar. Schreiben erfolgt erst nach „SAVE RANK“, mit dem bestehenden Schema; ein bereits höherer ausgelesener Serverrekord wird nicht überschrieben. Netzwerkfehler blockieren den Neustart nicht.
- Gesperrter Browserspeicher lässt das Spiel weiterlaufen; der Rekord bleibt dann nur in der aktuellen Sitzung.

### Messung und Grenze

`game_start`, `game_over` und `retry_clicked` werden einmal pro entsprechendem Übergang ausgelöst. Lokale Summen liegen unter `<bisheriger Rekordschlüssel>_events_v1`. `retry_clicked / game_over` beschreibt direkte Neustarts pro beendetem Lauf auf diesem Browser, keine spielerübergreifende Retention. Wiederholte Aufrufe desselben Spielendes und Doppelklicks zählen nicht zusätzlich. Ein Klick auf den normalen Startknopf ist kein `retry_clicked`.

Zusätzlich sendet die Seite ein lokales `CustomEvent('unaufhaltsam:event')` mit `{name, params}`. Die Parameter enthalten Variante, Version `results_v1` sowie bei Spielende/Neustart Level und Dauer, bei Spielende auch `new_best`. Keine Namen oder geteilten Texte werden als Ereignis übertragen.

**Cloud-Messung ist noch nicht eingerichtet oder live geprüft.** Es werden weder Analytics-SDKs nachgeladen noch Firestore-Event-Dokumente angelegt. Für eine bereits konfigurierte und freigegebene Firebase-Analytics-Compat-Instanz kann die vorhandene Einbindung `window.unaufhaltsamAnalytics = vorhandeneAnalyticsInstanz` setzen. Der Adapter ruft dann `logEvent(name, params)` auf. Ohne diesen Anschluss bleiben die Zähler lokal; alte Läufe haben keine neue Baseline. Für eine Wirkungsaussage müssen Baseline und Testzeitraum vergleichbar sein, einschließlich Einstiegsroute und Trafficquelle.

### Lokale Prüfung

Node.js und Playwright als Entwicklungsabhängigkeit installieren, dann:

```sh
npm install
npx playwright install chromium
npm test
```

Die Tests starten einen lokalen Server und sperren externe Browseranfragen. Firebase wird simuliert; damit sind sie kein Nachweis für produktive Firebase-Regeln, Cloud-Analytics oder die Share-Auswahl auf einem echten Smartphone. Ein bereits vorhandenes Chromium kann über `BROWSER_EXECUTABLE_PATH` gewählt werden.

## Marke

UNAUFHALTSAM gehört zum Eddie’s-World-System.

Eddie steht für den realen Ursprung:

**Real life. No staging.**

UNAUFHALTSAM überträgt diesen Kern auf Fokus, Frusttoleranz und Weitermachen.
