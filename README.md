# 💪 Krafttrainings App

Eine einfache, benutzerfreundliche Web-Anwendung zum Tracken deiner Krafttrainings-Einheiten.

## Features

- ✅ Übungen mit Gewicht, Sätzen und Wiederholungen eintragen
- ✅ Datum für jede Trainingseinheit erfassen
- ✅ Vollständige Trainingshistorie anzeigen
- ✅ Nach Übungen suchen
- ✅ Sortierung nach Datum oder Übungsname
- ✅ Einzelne Einträge löschen
- ✅ Komplette Historie löschen
- ✅ Daten werden lokal im Browser gespeichert (localStorage)
- ✅ Responsive Design für mobile Geräte

## Installation & Nutzung

1. Öffne die `index.html` Datei in deinem Browser
2. Die App ist sofort einsatzbereit!

Keine Installation, keine Server, keine Abhängigkeiten - einfach öffnen und loslegen!

## Anleitung

### Training hinzufügen
1. Fülle das Formular aus:
   - **Übung**: Name der Übung (z.B. "Bankdrücken")
   - **Gewicht**: Gewicht in kg (z.B. 80)
   - **Sätze**: Anzahl der Sätze (z.B. 3)
   - **Wiederholungen**: Anzahl der Wiederholungen pro Satz (z.B. 10)
   - **Datum**: Wird automatisch auf heute gesetzt, kann geändert werden
2. Klicke auf "Eintrag hinzufügen"

### Trainingshistorie verwalten
- **Suchen**: Gib einen Übungsnamen in das Suchfeld ein
- **Sortieren**: Wähle die Sortierung (Neueste zuerst, Älteste zuerst, Nach Übung)
- **Löschen**: Klicke auf "Löschen" bei einem Eintrag, um ihn zu entfernen
- **Alle löschen**: Klicke auf "Alle löschen" um die komplette Historie zu löschen

## Technologie

- HTML5
- CSS3 (mit Flexbox/Grid)
- Vanilla JavaScript (ES6+)
- localStorage für Datenpersistenz

## Datenspeicherung

Alle Daten werden lokal im Browser gespeichert (localStorage). Das bedeutet:
- ✅ Deine Daten bleiben privat und verlassen nie deinen Computer
- ✅ Funktioniert offline
- ⚠️ Daten gehen verloren, wenn Browser-Daten gelöscht werden
- ⚠️ Daten sind nicht zwischen verschiedenen Browsern synchronisiert

## Browser-Kompatibilität

Die App funktioniert in allen modernen Browsern:
- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Opera
