// Sync-Status
let syncEnabled = false;
let currentUser = null;
let syncInProgress = false;
let lastSyncTime = null;

// Sync initialisieren
async function initSync() {
  const firebaseReady = await initFirebase();

  if (!firebaseReady) {
    console.log('Firebase nicht verfügbar - App läuft im Offline-Modus');
    updateSyncStatus('offline', 'Nur lokal (kein Cloud-Sync)');
    return false;
  }

  // Auth State Observer
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      syncEnabled = true;
      console.log('Angemeldet als:', user.email || user.displayName);

      // Initial-Sync
      await syncFromCloud();

      // Echtzeit-Listener für Änderungen
      startRealtimeSync();

      updateSyncStatus('synced', `Angemeldet als ${user.email || user.displayName}`);
      showUserInfo(user);
    } else {
      currentUser = null;
      syncEnabled = false;
      console.log('Nicht angemeldet');
      updateSyncStatus('offline', 'Nicht angemeldet');
      hideUserInfo();
    }
  });

  return true;
}

// Von Cloud synchronisieren
async function syncFromCloud() {
  if (!syncEnabled || !currentUser) return;

  try {
    syncInProgress = true;
    updateSyncStatus('syncing', 'Synchronisiere...');

    const snapshot = await db.collection('users')
      .doc(currentUser.uid)
      .collection('trainings')
      .get();

    const cloudTrainings = [];
    snapshot.forEach(doc => {
      cloudTrainings.push({ id: parseInt(doc.id), ...doc.data() });
    });

    // Merge mit lokalen Daten
    trainings = mergeTrainings(trainings, cloudTrainings);
    localStorage.setItem('trainings', JSON.stringify(trainings));

    displayTrainings();
    displayPersonalRecords();

    lastSyncTime = new Date();
    updateSyncStatus('synced', `Zuletzt synchronisiert: ${formatTime(lastSyncTime)}`);

    console.log('Sync von Cloud abgeschlossen:', cloudTrainings.length, 'Einträge');
  } catch (error) {
    console.error('Sync-Fehler:', error);
    updateSyncStatus('error', 'Sync-Fehler');
  } finally {
    syncInProgress = false;
  }
}

// Zu Cloud synchronisieren
async function syncToCloud(training) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('trainings')
      .doc(training.id.toString())
      .set({
        exercise: training.exercise,
        trainingType: training.trainingType || 'weight',
        weight: training.weight,
        timeMinutes: training.timeMinutes,
        timeSeconds: training.timeSeconds,
        sets: training.sets,
        reps: training.reps,
        date: training.date,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Training zu Cloud synchronisiert:', training.id);
  } catch (error) {
    console.error('Upload-Fehler:', error);
    // Fehler wird später beim nächsten Sync erneut versucht
  }
}

// Trainingsplan zu Cloud synchronisieren
async function syncPlanToCloud(plan) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('plans')
      .doc(plan.id.toString())
      .set({
        exercise: plan.exercise,
        sets: plan.sets,
        reps: plan.reps,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Trainingsplan zu Cloud synchronisiert:', plan.id);
  } catch (error) {
    console.error('Plan Upload-Fehler:', error);
  }
}

// Körpergewicht zu Cloud synchronisieren
async function syncBodyWeightToCloud(weight) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('bodyWeights')
      .doc(weight.id.toString())
      .set({
        weight: weight.weight,
        date: weight.date,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Körpergewicht zu Cloud synchronisiert:', weight.id);
  } catch (error) {
    console.error('Body Weight Upload-Fehler:', error);
  }
}

// Persönliche Info zu Cloud synchronisieren
async function syncPersonalInfoToCloud(info) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .set({
        age: info.age,
        height: info.height,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    console.log('Persönliche Info zu Cloud synchronisiert');
  } catch (error) {
    console.error('Personal Info Upload-Fehler:', error);
  }
}

// Training aus Cloud löschen
async function deleteFromCloud(id) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('trainings')
      .doc(id.toString())
      .delete();

    console.log('Training aus Cloud gelöscht:', id);
  } catch (error) {
    console.error('Lösch-Fehler:', error);
  }
}

// Plan aus Cloud löschen
async function deletePlanFromCloud(id) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('plans')
      .doc(id.toString())
      .delete();

    console.log('Plan aus Cloud gelöscht:', id);
  } catch (error) {
    console.error('Plan Lösch-Fehler:', error);
  }
}

// Körpergewicht aus Cloud löschen
async function deleteBodyWeightFromCloud(id) {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('bodyWeights')
      .doc(id.toString())
      .delete();

    console.log('Körpergewicht aus Cloud gelöscht:', id);
  } catch (error) {
    console.error('Body Weight Lösch-Fehler:', error);
  }
}

// Echtzeit-Synchronisation starten
function startRealtimeSync() {
  if (!syncEnabled || !currentUser) return;

  db.collection('users')
    .doc(currentUser.uid)
    .collection('trainings')
    .onSnapshot((snapshot) => {
      if (syncInProgress) return; // Verhindere Loop während Initial-Sync

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = parseInt(change.doc.id);

        if (change.type === 'added' || change.type === 'modified') {
          // Update lokale Daten
          const index = trainings.findIndex(t => t.id === id);
          const training = { id, ...data };

          if (index !== -1) {
            trainings[index] = training;
          } else {
            trainings.push(training);
          }
        }

        if (change.type === 'removed') {
          trainings = trainings.filter(t => t.id !== id);
        }
      });

      localStorage.setItem('trainings', JSON.stringify(trainings));
      displayTrainings();
      displayPersonalRecords();

      lastSyncTime = new Date();
      updateSyncStatus('synced', `Aktualisiert: ${formatTime(lastSyncTime)}`);
    }, (error) => {
      console.error('Realtime-Sync Fehler:', error);
      updateSyncStatus('error', 'Verbindungsfehler');
    });
}

// Trainings mergen (Cloud hat Priorität bei Konflikten)
function mergeTrainings(local, cloud) {
  const merged = new Map();

  // Lokale Trainings hinzufügen
  local.forEach(training => {
    merged.set(training.id, training);
  });

  // Cloud-Trainings überschreiben lokale (Cloud hat Priorität)
  cloud.forEach(training => {
    merged.set(training.id, training);
  });

  return Array.from(merged.values());
}

// Login mit Google
async function loginWithGoogle() {
  try {
    // Prüfe ob Firebase konfiguriert ist
    if (!auth) {
      showNotification('⚠️ Firebase noch nicht konfiguriert! Bitte siehe FIREBASE_SETUP.md');
      console.error('Firebase ist nicht initialisiert. Bitte firebase-config.js konfigurieren.');
      return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    showNotification('Erfolgreich angemeldet!');
    hideLoginModal();
  } catch (error) {
    console.error('Login-Fehler:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      showNotification('Login abgebrochen');
    } else {
      showNotification('Login fehlgeschlagen: ' + error.message);
    }
  }
}

// Login mit E-Mail
async function loginWithEmail(email, password) {
  try {
    // Prüfe ob Firebase konfiguriert ist
    if (!auth) {
      showNotification('⚠️ Firebase noch nicht konfiguriert! Bitte siehe FIREBASE_SETUP.md');
      console.error('Firebase ist nicht initialisiert. Bitte firebase-config.js konfigurieren.');
      return;
    }

    await auth.signInWithEmailAndPassword(email, password);
    showNotification('Erfolgreich angemeldet!');
    hideLoginModal();
  } catch (error) {
    console.error('Login-Fehler:', error);
    if (error.code === 'auth/user-not-found') {
      showNotification('Benutzer nicht gefunden. Bitte registrieren.');
    } else if (error.code === 'auth/wrong-password') {
      showNotification('Falsches Passwort');
    } else {
      showNotification('Login fehlgeschlagen: ' + error.message);
    }
  }
}

// Registrierung mit E-Mail
async function registerWithEmail(email, password) {
  try {
    // Prüfe ob Firebase konfiguriert ist
    if (!auth) {
      showNotification('⚠️ Firebase noch nicht konfiguriert! Bitte siehe FIREBASE_SETUP.md');
      console.error('Firebase ist nicht initialisiert. Bitte firebase-config.js konfigurieren.');
      return;
    }

    if (password.length < 6) {
      showNotification('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    await auth.createUserWithEmailAndPassword(email, password);
    showNotification('Konto erstellt und angemeldet!');
    hideLoginModal();
  } catch (error) {
    console.error('Registrierungs-Fehler:', error);
    if (error.code === 'auth/email-already-in-use') {
      showNotification('E-Mail bereits registriert. Bitte anmelden.');
    } else if (error.code === 'auth/invalid-email') {
      showNotification('Ungültige E-Mail-Adresse');
    } else {
      showNotification('Registrierung fehlgeschlagen: ' + error.message);
    }
  }
}

// Logout
async function logout() {
  try {
    await auth.signOut();
    showNotification('Abgemeldet');
  } catch (error) {
    console.error('Logout-Fehler:', error);
  }
}

// Sync-Status UI aktualisieren
function updateSyncStatus(status, message) {
  const statusElement = document.getElementById('syncStatus');
  const iconElement = document.getElementById('syncIcon');

  if (!statusElement || !iconElement) return;

  iconElement.textContent = {
    'synced': '✅',
    'syncing': '🔄',
    'offline': '📴',
    'error': '⚠️'
  }[status] || '❓';

  statusElement.textContent = message;
  statusElement.className = `sync-status ${status}`;

  // Animation für Syncing
  if (status === 'syncing') {
    iconElement.style.animation = 'spin 1s linear infinite';
  } else {
    iconElement.style.animation = 'none';
  }
}

// Benutzer-Info anzeigen
function showUserInfo(user) {
  const userInfoElement = document.getElementById('userInfo');
  if (!userInfoElement) return;

  userInfoElement.innerHTML = `
    <div class="user-profile">
      ${user.photoURL ? `<img src="${user.photoURL}" alt="Profil" class="user-avatar">` : ''}
      <span class="user-name">${user.email || user.displayName}</span>
      <button onclick="logout()" class="btn-logout">Abmelden</button>
    </div>
  `;
  userInfoElement.style.display = 'flex';
}

// Benutzer-Info verstecken
function hideUserInfo() {
  const userInfoElement = document.getElementById('userInfo');
  if (!userInfoElement) return;

  // Prüfe ob Firebase konfiguriert ist
  if (!auth) {
    userInfoElement.innerHTML = `
      <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 25px; color: white; font-size: 0.85rem; text-align: center; max-width: 500px;">
        ⚠️ Cloud-Sync nicht verfügbar - Firebase Setup erforderlich (siehe Dokumentation)
      </div>
    `;
  } else {
    userInfoElement.innerHTML = `
      <button onclick="showLoginModal()" class="btn-login">Anmelden für Cloud-Sync</button>
    `;
  }
}

// Login-Modal anzeigen
function showLoginModal() {
  // Prüfe ob Firebase konfiguriert ist
  if (!auth) {
    showNotification('⚠️ Firebase noch nicht konfiguriert! Siehe FIREBASE_SETUP.md für Anleitung');
    console.error('Firebase ist nicht initialisiert. Bitte firebase-config.js konfigurieren.');
    return;
  }

  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Login-Modal verstecken
function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Zeit formatieren
function formatTime(date) {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Export für globale Verwendung
window.initSync = initSync;
window.syncToCloud = syncToCloud;
window.syncPlanToCloud = syncPlanToCloud;
window.syncBodyWeightToCloud = syncBodyWeightToCloud;
window.syncPersonalInfoToCloud = syncPersonalInfoToCloud;
window.deleteFromCloud = deleteFromCloud;
window.deletePlanFromCloud = deletePlanFromCloud;
window.deleteBodyWeightFromCloud = deleteBodyWeightFromCloud;
window.loginWithGoogle = loginWithGoogle;
window.loginWithEmail = loginWithEmail;
window.registerWithEmail = registerWithEmail;
window.logout = logout;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
