# 🚀 Deployment Anleitung

## Firebase Hosting (Empfohlen)

### Einmalige Einrichtung:

1. **Firebase CLI installieren:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Bei Firebase anmelden:**
   ```bash
   firebase login
   ```

3. **Firebase Projekt initialisieren:**
   ```bash
   firebase init hosting
   ```
   - **Fragen beantworten:**
     - "Please select an option" → **Use an existing project**
     - Wähle dein Firebase Projekt aus der Liste
     - "What do you want to use as your public directory?" → **. (Punkt eingeben!)**
     - "Configure as a single-page app?" → **Yes**
     - "Set up automatic builds?" → **No**
     - "File . already exists. Overwrite?" → **No** (für alle Dateien)

### Bei jeder Änderung deployen:

```bash
# Zur Cloud deployen
firebase deploy --only hosting

# Oder mit Nachricht
firebase deploy --only hosting -m "Deine Änderungen beschreiben"
```

**Das war's!** 🎉

Deine App ist jetzt erreichbar unter:
- `https://dein-projekt-id.web.app`
- `https://dein-projekt-id.firebaseapp.com`

### Eigene Domain (Optional):

In der Firebase Console kannst du auch eine eigene Domain verbinden:
1. Firebase Console → Hosting → "Add custom domain"
2. Folge den Anweisungen

---

## Alternative: GitHub Pages

### Setup:

1. **GitHub Pages aktivieren:**
   - Gehe zu deinem GitHub Repository
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main` (oder dein Branch)
   - Folder: `/ (root)`
   - Save

2. **App ist erreichbar unter:**
   ```
   https://dein-username.github.io/training/
   ```

### Wichtig für GitHub Pages:

Da die App in einem Unterordner liegt, musst du evtl. die Basis-URL anpassen:

```javascript
// In service-worker.js die URLs anpassen:
const BASE_URL = '/training/';  // Wenn in Unterordner
```

**ABER:** Firebase Hosting ist besser, weil:
- ✅ Automatisches SSL
- ✅ Globales CDN
- ✅ Bessere PWA-Unterstützung
- ✅ Kein Unterordner-Problem
- ✅ Alles im gleichen Firebase Projekt

---

## Vergleich:

| Feature | Firebase Hosting | GitHub Pages | Netlify |
|---------|-----------------|--------------|---------|
| **Kosten** | Kostenlos (10GB/Monat) | Kostenlos (100GB/Monat) | Kostenlos (100GB/Monat) |
| **SSL** | ✅ Automatisch | ✅ Automatisch | ✅ Automatisch |
| **CDN** | ✅ Global | ✅ Global | ✅ Global |
| **PWA** | ✅ Perfekt | ⚠️ Gut | ✅ Perfekt |
| **Setup** | 5 Minuten | 2 Minuten | 5 Minuten |
| **Integration** | ✅ Mit Firebase DB | ❌ | ❌ |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **Build Commands** | Manuell | Manuell | ✅ Automatisch |

**Empfehlung:** Firebase Hosting, da du bereits Firebase nutzt!
