# 📱 iPhone Installation Guide

## So installierst du die Krafttrainings App auf deinem iPhone

### Schritt 1: App hosten

Die App muss online verfügbar sein. Es gibt mehrere kostenlose Optionen:

#### Option A: GitHub Pages (empfohlen)
1. Pushe den Code zu GitHub
2. Gehe zu Repository Settings → Pages
3. Wähle Branch "main" und Ordner "root"
4. Deine App ist verfügbar unter: `https://[username].github.io/[repo-name]`

#### Option B: Netlify
1. Gehe zu [netlify.com](https://www.netlify.com)
2. Ziehe den `training` Ordner auf die Netlify-Seite
3. Du bekommst eine URL wie: `https://[random-name].netlify.app`

#### Option C: Vercel
1. Installiere Vercel CLI: `npm install -g vercel`
2. Im Projektordner: `vercel`
3. Folge den Anweisungen

### Schritt 2: App auf dem iPhone installieren

1. **Öffne Safari** auf deinem iPhone
   - ⚠️ Wichtig: Muss Safari sein, Chrome/Firefox funktioniert nicht!

2. **Gehe zur App-URL**
   - Tippe die URL ein (z.B. `https://deine-app.netlify.app`)

3. **Teilen-Button** drücken
   - Das ist das Icon unten in der Mitte (Quadrat mit Pfeil nach oben)

4. **"Zum Home-Bildschirm"** wählen
   - Scrolle nach unten in der Liste
   - Wähle "Zum Home-Bildschirm"

5. **App-Name bestätigen**
   - Standardname: "Krafttraining"
   - Du kannst ihn ändern wenn du möchtest
   - Tippe "Hinzufügen"

6. **Fertig!** 🎉
   - Die App ist jetzt auf deinem Home-Screen
   - Öffne sie wie jede andere App

### Funktionen der installierten App

✅ **Offline-Funktionalität**
- Die App funktioniert komplett offline
- Alle Einträge werden lokal auf deinem iPhone gespeichert

✅ **App-Feeling**
- Sieht aus wie eine native App
- Keine Browser-Leiste
- Vollbild-Ansicht

✅ **Schnell & Sicher**
- Lädt sofort, auch ohne Internet
- Daten bleiben auf deinem Gerät
- Kein App Store nötig

### Offline-Nutzung

Die App funktioniert vollständig offline:
- ✅ Trainings hinzufügen
- ✅ Trainings bearbeiten
- ✅ Trainings löschen
- ✅ Bestleistungen anzeigen
- ✅ Nach Übungen suchen
- ✅ Alle Daten werden gespeichert

### Wichtige Hinweise

⚠️ **Daten bleiben auf dem Gerät**
- Deine Trainingsdaten sind aktuell nur auf diesem iPhone gespeichert
- Wenn du die App löschst, sind die Daten weg
- Backup über iCloud wird NICHT automatisch erstellt

⚠️ **Keine Synchronisation (noch nicht)**
- Daten werden nicht zwischen Geräten synchronisiert
- Jedes Gerät hat seine eigenen Daten
- Für Cloud-Sync siehe nächster Abschnitt

## Cloud-Synchronisation einrichten

Die App unterstützt jetzt **automatische Cloud-Synchronisation** mit Firebase! 🚀

### Was du bekommst:
- ✅ **Synchronisation zwischen allen Geräten** (iPhone, iPad, Computer)
- ✅ **Automatisches Backup** in der Cloud
- ✅ **Offline-First**: App funktioniert offline, Daten werden automatisch hochgeladen
- ✅ **Echtzeit-Updates**: Änderungen werden sofort synchronisiert
- ✅ **Kostenlos**: Firebase kostenloser Plan reicht völlig aus

### Setup in 3 Schritten:

#### 1. Firebase Projekt erstellen (5 Minuten)
- Folge der Anleitung in `FIREBASE_SETUP.md`
- Erstelle ein Firebase-Projekt
- Kopiere deine Firebase-Konfiguration

#### 2. Konfiguration einfügen
- Öffne `firebase-config.js`
- Füge deine Firebase-Credentials ein

#### 3. App hosten & anmelden
- Hoste die App (siehe oben)
- Öffne die App
- Klicke auf "Anmelden für Cloud-Sync"
- Wähle Google oder E-Mail/Passwort

### Fertig! 🎉

Deine Trainings werden jetzt automatisch synchronisiert:
- Neuer Eintrag → sofort in die Cloud
- Bearbeitung → sofort aktualisiert
- Löschen → sofort aus Cloud entfernt
- Offline-Änderungen → automatisch hochgeladen wenn online

### Ohne Cloud-Sync nutzen

Du kannst die App auch **ohne Cloud-Sync** nutzen:
- Daten bleiben nur auf deinem Gerät (localStorage)
- Kein Login nötig
- Funktioniert komplett offline
- Einfach den "Anmelden"-Button ignorieren

### Troubleshooting

**"Zum Home-Bildschirm" wird nicht angezeigt?**
- Stelle sicher, dass du Safari verwendest
- Aktualisiere iOS auf die neueste Version
- Versuche die Seite neu zu laden

**App lädt nicht offline?**
- Öffne die App einmal online
- Warte bis alles geladen ist
- Dann funktioniert sie offline

**Daten sind weg?**
- Prüfe ob du die richtige App geöffnet hast
- Browser-Daten dürfen nicht gelöscht werden
- Safari-Cache leeren löscht auch App-Daten!

### Support

Bei Fragen oder Problemen, melde dich! 💪
