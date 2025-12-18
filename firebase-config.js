// Firebase Konfiguration
// WICHTIG: Diese Datei muss mit deinen eigenen Firebase Credentials ausgefüllt werden!

// Anleitung:
// 1. Gehe zu https://console.firebase.google.com
// 2. Erstelle ein neues Projekt (oder verwende ein bestehendes)
// 3. Aktiviere "Firestore Database" (im Build-Menü)
// 4. Aktiviere "Authentication" → Sign-in method → Google (oder E-Mail/Passwort)
// 5. Gehe zu Projekteinstellungen → Füge eine Web-App hinzu
// 6. Kopiere die Firebase-Config hierher

const firebaseConfig = {
  // Ersetze diese Platzhalter mit deinen echten Firebase-Credentials:
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJECT_ID.firebaseapp.com",
  projectId: "DEIN_PROJECT_ID",
  storageBucket: "DEIN_PROJECT_ID.appspot.com",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
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
