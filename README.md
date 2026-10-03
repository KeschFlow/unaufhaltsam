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

## Marke

UNAUFHALTSAM gehört zum Eddie’s-World-System.

Eddie steht für den realen Ursprung:

**Real life. No staging.**

UNAUFHALTSAM überträgt diesen Kern auf Fokus, Frusttoleranz und Weitermachen.
