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
        weight: training.weight,
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
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    showNotification('Erfolgreich angemeldet!');
  } catch (error) {
    console.error('Login-Fehler:', error);
    showNotification('Login fehlgeschlagen: ' + error.message);
  }
}

// Login mit E-Mail
async function loginWithEmail(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showNotification('Erfolgreich angemeldet!');
  } catch (error) {
    console.error('Login-Fehler:', error);
    showNotification('Login fehlgeschlagen: ' + error.message);
  }
}

// Registrierung mit E-Mail
async function registerWithEmail(email, password) {
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    showNotification('Konto erstellt und angemeldet!');
  } catch (error) {
    console.error('Registrierungs-Fehler:', error);
    showNotification('Registrierung fehlgeschlagen: ' + error.message);
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

  userInfoElement.innerHTML = `
    <button onclick="showLoginModal()" class="btn-login">Anmelden für Cloud-Sync</button>
  `;
}

// Login-Modal anzeigen
function showLoginModal() {
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
window.deleteFromCloud = deleteFromCloud;
window.loginWithGoogle = loginWithGoogle;
window.loginWithEmail = loginWithEmail;
window.registerWithEmail = registerWithEmail;
window.logout = logout;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
