// Firebase Konfiguration
// WICHTIG: Diese Datei muss mit deinen eigenen Firebase Credentials ausgefüllt werden!

// Anleitung:
// 1. Gehe zu https://console.firebase.google.com
// 2. Erstelle ein neues Projekt (oder verwende ein bestehendes)
// 3. Aktiviere "Firestore Database" (im Build-Menü)
// 4. Aktiviere "Authentication" → Sign-in method → Google (oder E-Mail/Passwort)
// 5. Gehe zu Projekteinstellungen → Füge eine Web-App hinzu
// 6. Kopiere die Firebase-Config hierher

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRg6cSo-1R4YJY3ElgxSe1dyKSSIlCygc",
  authDomain: "krafttraining-app.firebaseapp.com",
  projectId: "krafttraining-app",
  storageBucket: "krafttraining-app.firebasestorage.app",
  messagingSenderId: "671708020612",
  appId: "1:671708020612:web:b77c08b0b4d12a390b67d1",
  measurementId: "G-7J32088TKB"
};

// Firebase initialisieren
let db = null;
let auth = null;

async function initFirebase() {
  try {
    // Prüfe ob Firebase konfiguriert ist
    if (firebaseConfig.apiKey === "DEIN_API_KEY") {
      console.warn('Firebase ist noch nicht konfiguriert. Siehe firebase-config.js');
      return false;
    }

    // Initialisiere Firebase
    const app = firebase.initializeApp(firebaseConfig);

    // Initialisiere Firestore mit Offline-Persistenz
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Mehrere Tabs geöffnet, Persistenz nur im ersten Tab');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser unterstützt keine Offline-Persistenz');
        }
      });

    // Initialisiere Authentication
    auth = firebase.auth();

    console.log('Firebase erfolgreich initialisiert');
    return true;
  } catch (error) {
    console.error('Firebase Initialisierung fehlgeschlagen:', error);
    return false;
  }
}

// Exportiere für globale Verwendung
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;
