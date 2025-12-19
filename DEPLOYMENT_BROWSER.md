# 🚀 Automatisches Deployment (NUR über Browser)

Kein Terminal nötig! Einmalige Einrichtung über Browser, dann deployt die App automatisch bei jedem Git Push.

---

## Schritt 1: Firebase Service Account erstellen (5 Minuten)

### 1.1 Gehe zur Firebase Console
- Öffne: https://console.firebase.google.com/
- Wähle dein Projekt: **krafttraining-app**

### 1.2 Service Account erstellen
1. Klicke oben links auf **Zahnrad** ⚙️ → **Projekteinstellungen**
2. Gehe zum Tab **Dienstkonten** (Service Accounts)
3. Klicke unten auf **"X Dienstkontoschlüssel verwalten"** (Link zu Google Cloud Console)
4. Du wirst zu Google Cloud Console weitergeleitet

### 1.3 In Google Cloud Console
1. Klicke auf **"+ DIENSTKONTO ERSTELLEN"** (oben)
2. **Dienstkontoname:** `github-actions` (oder beliebig)
3. **Beschreibung:** `Für GitHub Actions Deployment`
4. Klicke **ERSTELLEN UND FORTFAHREN**
5. **Rolle auswählen:**
   - Suche nach: `Firebase Hosting Admin`
   - Wähle: **Firebase Hosting-Administrator**
   - Klicke **WEITER**
6. Klicke **FERTIG**

### 1.4 JSON-Schlüssel erstellen
1. In der Liste siehst du jetzt dein neues Dienstkonto `github-actions@...`
2. Klicke auf die **3 Punkte** rechts (⋮) → **Schlüssel verwalten**
3. Klicke **SCHLÜSSEL HINZUFÜGEN** → **Neuen Schlüssel erstellen**
4. Typ: **JSON**
5. Klicke **ERSTELLEN**
6. Eine JSON-Datei wird heruntergeladen - **BEHALTE SIE!**

**⚠️ WICHTIG:** Diese Datei ist geheim! Teile sie mit niemandem!

---

## Schritt 2: GitHub Secret hinzufügen (2 Minuten)

### 2.1 Gehe zu deinem GitHub Repository
- Öffne: https://github.com/DEIN-USERNAME/training

### 2.2 Secret erstellen
1. Klicke auf **Settings** (oben rechts)
2. Links im Menü: **Secrets and variables** → **Actions**
3. Klicke auf **"New repository secret"** (grüner Button)

### 2.3 Secret eingeben
1. **Name:** `FIREBASE_SERVICE_ACCOUNT`
2. **Secret:**
   - Öffne die heruntergeladene JSON-Datei mit einem Texteditor
   - Kopiere den **GESAMTEN INHALT** (alles von `{` bis `}`)
   - Füge ihn hier ein
3. Klicke **Add secret**

---

## Schritt 3: Firebase Hosting aktivieren (1 Minute)

### 3.1 Zurück zur Firebase Console
- https://console.firebase.google.com/
- Projekt: **krafttraining-app**

### 3.2 Hosting aktivieren
1. Links im Menü: **Build** → **Hosting**
2. Klicke **Get started**
3. Klicke 3x auf **Next** (wir nutzen GitHub Actions, nicht Firebase CLI)
4. Klicke **Finish**

**Fertig!** 🎉

---

## Schritt 4: Testen (1 Minute)

### 4.1 GitHub Actions Workflow triggern

**Option A: Automatisch (empfohlen)**
- Die GitHub Action wird automatisch ausgeführt, sobald du Code zu GitHub pushst
- Warte einfach, bis die Dateien hier committed sind

**Option B: Manuell**
1. Gehe zu deinem GitHub Repository
2. Klicke auf **Actions** (oben)
3. Links siehst du: **Deploy to Firebase Hosting**
4. Rechts klicke: **Run workflow** → **Run workflow**

### 4.2 Deployment beobachten
1. Klicke auf den laufenden Workflow
2. Du siehst den Fortschritt
3. Nach ca. 1-2 Minuten: ✅ **Deployment complete!**

### 4.3 App öffnen
Deine App ist jetzt live unter:
- **https://krafttraining-app.web.app**
- **https://krafttraining-app.firebaseapp.com**

---

## 🎊 Ab jetzt: Automatisch!

Sobald du Code änderst und zu GitHub pushst:
1. GitHub erkennt die Änderung
2. GitHub Actions startet automatisch
3. Deine App wird zu Firebase deployed
4. **Du musst NICHTS tun!** 🚀

---

## Alternative: Manuell deployen (nicht empfohlen)

Falls du doch lieber manuell deployen willst:

1. Gehe zur Firebase Console → Hosting
2. Klicke auf **"Deploy to Firebase Hosting"**
3. Ziehe alle deine Dateien in den Upload-Bereich:
   - index.html
   - app.js
   - sync.js
   - style.css
   - firebase-config.js
   - manifest.json
   - service-worker.js
   - icon.svg
4. Klicke **Deploy**

**ABER:** Das ist mühsam! Bei jedem Update alle Dateien neu hochladen.

GitHub Actions ist 100x besser! ✨

---

## ❓ Troubleshooting

**Problem: "Workflow failed"**
→ Prüfe ob das GitHub Secret richtig gesetzt ist (Settings → Secrets → Actions)

**Problem: "Permission denied"**
→ Das Service Account braucht die Rolle "Firebase Hosting-Administrator"

**Problem: "404 after deployment"**
→ Warte 2-3 Minuten, Firebase braucht etwas Zeit zum Aktivieren

**Problem: Service Account JSON-Datei verloren**
→ Erstelle einen neuen Schlüssel (Schritt 1.4)

---

## 📱 Nach dem ersten Deploy

**Auf dem Handy:**
1. Cache leeren (Safari: Einstellungen → Safari → Verlauf löschen)
2. Neue URL öffnen: https://krafttraining-app.web.app
3. PWA neu installieren: "Zum Home-Bildschirm hinzufügen"

---

**Alles klar? Dann kannst du loslegen!** 🚀
