# 💪 Krafttrainings App

Eine moderne Progressive Web App zum Tracken deiner Krafttrainings-Einheiten mit Cloud-Synchronisation!

## ✨ Features

### 📊 Trainings-Tracking
- Übungen mit Gewicht, Sätzen und Wiederholungen eintragen
- Trainings bearbeiten und löschen
- Nach Datum gruppierte Anzeige
- Nach Übungen suchen
- Verschiedene Sortieroptionen

### 🏆 Persönliche Bestleistungen
- Automatische Berechnung für die "Big 3":
  - 🦵 Kniebeugen Front
  - 💪 Bankdrücken
  - 🏋️ Kreuzheben
- Maximales Gewicht, Wiederholungen und Datum
- Gesamt-Trainingseinheiten pro Übung

### 🔄 Cloud-Synchronisation
- Automatische Synchronisation zwischen allen Geräten
- Offline-First: Funktioniert auch ohne Internet
- Echtzeit-Updates
- Automatisches Backup in der Cloud
- Login mit Google oder E-Mail/Passwort

### 📱 Progressive Web App (PWA)
- Installierbar auf iPhone/iPad/Android
- Funktioniert wie eine native App
- Vollständige Offline-Funktionalität
- Schnell & zuverlässig

### 🎨 Modernes Design
- Responsive für alle Bildschirmgrößen
- Schöne Animationen und Übergänge
- Intuitive Benutzeroberfläche
- Dark Mode kompatibel

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
