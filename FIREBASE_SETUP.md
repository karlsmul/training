# 🔥 Firebase Setup Guide

## Schritt-für-Schritt Anleitung zur Einrichtung von Firebase

### 1. Firebase Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com)
2. Klicke auf "Projekt hinzufügen"
3. Gib einen Projektnamen ein (z.B. "Krafttraining App")
4. Google Analytics kannst du optional aktivieren
5. Klicke auf "Projekt erstellen"

### 2. Firestore Database aktivieren

1. Im linken Menü: Klicke auf "Build" → "Firestore Database"
2. Klicke auf "Datenbank erstellen"
3. Wähle "Im Produktionsmodus starten"
4. Wähle eine Region (z.B. "europe-west3" für Frankfurt)
5. Klicke auf "Aktivieren"

### 3. Firestore Sicherheitsregeln einrichten

1. Gehe zu "Firestore Database" → "Regeln"
2. Ersetze die Standard-Regeln mit folgenden:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Benutzer können nur ihre eigenen Daten lesen und schreiben
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /trainings/{trainingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Klicke auf "Veröffentlichen"

### 4. Authentication aktivieren

1. Im linken Menü: Klicke auf "Build" → "Authentication"
2. Klicke auf "Starten"
3. Unter "Sign-in method" Tab:

#### Option A: Google Sign-In (empfohlen - am einfachsten)
1. Klicke auf "Google"
2. Aktiviere den Schalter
3. Wähle eine Support-E-Mail
4. Klicke auf "Speichern"

#### Option B: E-Mail/Passwort
1. Klicke auf "E-Mail/Passwort"
2. Aktiviere "E-Mail/Passwort"
3. Klicke auf "Speichern"

### 5. Web-App hinzufügen

1. Gehe zur Projektübersicht (oben links)
2. Klicke auf das Web-Icon (`</>`) unter "App hinzufügen"
3. Gib einen App-Namen ein (z.B. "Krafttraining Web")
4. Aktiviere "Firebase Hosting einrichten" (optional)
5. Klicke auf "App registrieren"

### 6. Firebase Konfiguration kopieren

Du siehst jetzt einen Code-Snippet wie diesen:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "dein-projekt.firebaseapp.com",
  projectId: "dein-projekt",
  storageBucket: "dein-projekt.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**WICHTIG:** Kopiere diese Werte!

### 7. Konfiguration in die App einfügen

1. Öffne die Datei `firebase-config.js`
2. Ersetze die Platzhalter mit deinen echten Werten:

```javascript
const firebaseConfig = {
  apiKey: "DEINE_API_KEY",              // ← Hier einfügen
  authDomain: "DEIN_PROJECT.firebaseapp.com",
  projectId: "DEIN_PROJECT_ID",
  storageBucket: "DEIN_PROJECT.appspot.com",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
};
```

### 8. Autorisierte Domains hinzufügen (für PWA/Hosting)

1. Gehe zu "Authentication" → "Settings" → "Authorized domains"
2. Füge deine Domain hinzu (z.B. `deine-app.netlify.app`)
3. `localhost` ist standardmäßig für Entwicklung zugelassen

### 9. Fertig! 🎉

Jetzt kannst du:
- ✅ Die App hosten (siehe INSTALLATION.md)
- ✅ Dich anmelden
- ✅ Trainings werden automatisch synchronisiert
- ✅ Offline-Einträge werden hochgeladen sobald du online bist

## Kosten

Firebase bietet einen **kostenlosen Plan** (Spark Plan):

- **Firestore**: 1 GB Speicher, 50.000 Lesevorgänge/Tag
- **Authentication**: Unbegrenzte Authentifizierungen
- **Hosting**: 10 GB Speicher, 360 MB/Tag Transfer

Für eine persönliche Trainings-App ist das mehr als ausreichend! 🚀

## Sicherheit

⚠️ **WICHTIG:**
- Teile NIEMALS deine `firebase-config.js` Datei mit API-Keys öffentlich
- Die API-Keys sind für Web-Apps gedacht, aber sollten nicht in öffentlichen Repos sein
- Füge `firebase-config.js` zu `.gitignore` hinzu wenn du den Code teilst

### Empfehlung für öffentliche Repositories:

1. Erstelle eine `firebase-config.example.js`:
```javascript
const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJECT_ID.firebaseapp.com",
  // ... mit Platzhaltern
};
```

2. Füge zu `.gitignore` hinzu:
```
firebase-config.js
```

3. Dokumentiere, dass jeder seine eigene `firebase-config.js` erstellen muss

## Troubleshooting

### "Firebase ist noch nicht konfiguriert"
- Überprüfe ob du die Werte in `firebase-config.js` ersetzt hast
- Stelle sicher, dass alle Werte korrekt kopiert wurden

### "Permission denied" Fehler
- Überprüfe die Firestore Sicherheitsregeln
- Stelle sicher, dass du angemeldet bist

### Login funktioniert nicht
- Überprüfe ob Google Sign-In aktiviert ist
- Stelle sicher, dass deine Domain autorisiert ist

### Daten werden nicht synchronisiert
- Öffne die Browser-Konsole (F12) und suche nach Fehlern
- Überprüfe deine Internetverbindung
- Stelle sicher, dass du angemeldet bist

## Weitere Ressourcen

- [Firebase Dokumentation](https://firebase.google.com/docs)
- [Firestore Sicherheitsregeln](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
