// Sync-Status
let syncEnabled = false;
let currentUser = null;
let syncInProgress = false;
let lastSyncTime = null;

// Referenzen zu Firebase (werden in initFirebase gesetzt)
let db, auth;

// Sync initialisieren
async function initSync() {
  const firebaseReady = await initFirebase();

  // Hole Firebase-Referenzen von window
  db = window.db;
  auth = window.auth;

  if (!firebaseReady || !db || !auth) {
    console.log('Firebase nicht verfügbar - App läuft im Offline-Modus');
    updateSyncStatus('offline', 'Nur lokal (kein Cloud-Sync)');
    return false;
  }

  console.log('✅ Firebase-Referenzen erfolgreich geladen (db:', !!db, ', auth:', !!auth, ')');

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

    // Trainings laden
    const trainingsSnapshot = await db.collection('users')
      .doc(currentUser.uid)
      .collection('trainings')
      .get();

    const cloudTrainings = [];
    trainingsSnapshot.forEach(doc => {
      cloudTrainings.push({ id: parseInt(doc.id), ...doc.data() });
    });

    // Merge mit lokalen Daten
    trainings = mergeTrainings(trainings, cloudTrainings);
    localStorage.setItem('trainings', JSON.stringify(trainings));

    // Upload aller lokalen Trainings zur Cloud, die noch nicht dort sind
    for (const training of trainings) {
      const existsInCloud = cloudTrainings.some(ct => ct.id === training.id);
      if (!existsInCloud) {
        await syncToCloud(training);
      }
    }

    // Daily Borg Values laden
    const borgSnapshot = await db.collection('users')
      .doc(currentUser.uid)
      .collection('dailyBorgValues')
      .get();

    const cloudBorgValues = [];
    borgSnapshot.forEach(doc => {
      cloudBorgValues.push(doc.data());
    });

    // Merge Borg Values
    dailyBorgValues = mergeBorgValues(dailyBorgValues, cloudBorgValues);
    localStorage.setItem('dailyBorgValues', JSON.stringify(dailyBorgValues));

    // Upload aller lokalen Borg Values zur Cloud, die noch nicht dort sind
    for (const borgValue of dailyBorgValues) {
      const existsInCloud = cloudBorgValues.some(cb => cb.date === borgValue.date);
      if (!existsInCloud) {
        await syncDailyBorgToCloud(borgValue);
      }
    }

    // Plans laden
    const plansSnapshot = await db.collection('users')
      .doc(currentUser.uid)
      .collection('plans')
      .get();

    const cloudPlans = [];
    plansSnapshot.forEach(doc => {
      cloudPlans.push({ id: parseInt(doc.id), ...doc.data() });
    });

    // Merge Plans
    trainingPlans = mergePlans(trainingPlans, cloudPlans);
    localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));

    // Upload aller lokalen Plans zur Cloud, die noch nicht dort sind
    for (const plan of trainingPlans) {
      const existsInCloud = cloudPlans.some(cp => cp.id === plan.id);
      if (!existsInCloud) {
        await syncPlanToCloud(plan);
      }
    }

    // Body Weights laden
    const bodyWeightsSnapshot = await db.collection('users')
      .doc(currentUser.uid)
      .collection('bodyWeights')
      .get();

    const cloudBodyWeights = [];
    bodyWeightsSnapshot.forEach(doc => {
      cloudBodyWeights.push({ id: parseInt(doc.id), ...doc.data() });
    });

    // Merge Body Weights
    bodyWeights = mergeBodyWeights(bodyWeights, cloudBodyWeights);
    localStorage.setItem('bodyWeights', JSON.stringify(bodyWeights));

    // Upload aller lokalen Body Weights zur Cloud, die noch nicht dort sind
    for (const weight of bodyWeights) {
      const existsInCloud = cloudBodyWeights.some(cw => cw.id === weight.id);
      if (!existsInCloud) {
        await syncBodyWeightToCloud(weight);
      }
    }

    // Personal Info laden
    const userDoc = await db.collection('users')
      .doc(currentUser.uid)
      .get();

    // Merge Personal Info und Exercises
    let hasLocalData = false;
    let hasLocalExercises = exercises.length > 0;

    if (userDoc.exists) {
      const cloudPersonalInfo = userDoc.data();
      if (cloudPersonalInfo.age !== undefined) {
        personalInfo.age = cloudPersonalInfo.age;
      }
      if (cloudPersonalInfo.height !== undefined) {
        personalInfo.height = cloudPersonalInfo.height;
      }

      // Merge Übungen: Lokale Übungen haben Priorität und werden IMMER behalten
      if (cloudPersonalInfo.exercises && Array.isArray(cloudPersonalInfo.exercises) && cloudPersonalInfo.exercises.length > 0) {
        // Nur mergen wenn Cloud tatsächlich Übungen hat
        const mergedExercises = [...new Set([...exercises, ...cloudPersonalInfo.exercises])];
        exercises = mergedExercises.sort();
        console.log('Übungen gemerged:', exercises.length, 'Übungen');
      } else if (hasLocalExercises) {
        // Cloud hat keine Übungen, aber wir haben lokale - behalte die lokalen
        console.log('Keine Cloud-Übungen gefunden, behalte lokale:', exercises.length, 'Übungen');
      }

      localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
      localStorage.setItem('exercises', JSON.stringify(exercises));
    } else {
      hasLocalData = true;
    }

    // IMMER zur Cloud hochladen wenn wir lokale Übungen haben
    if (hasLocalExercises || hasLocalData || personalInfo.age || personalInfo.height) {
      await syncPersonalInfoToCloud(personalInfo);
      console.log('Lokale Daten zur Cloud hochgeladen');
    }

    displayTrainings();
    displayPersonalRecords();
    displayTrainingPlans();
    displayBodyWeightHistory();
    displayStats();
    populateExerciseDropdown();
    displayExerciseList();

    lastSyncTime = new Date();
    updateSyncStatus('synced', `Zuletzt synchronisiert: ${formatTime(lastSyncTime)}`);

    console.log('Sync von Cloud abgeschlossen:', cloudTrainings.length, 'Trainings,', cloudBorgValues.length, 'Borg-Werte,', cloudPlans.length, 'Pläne,', cloudBodyWeights.length, 'Körpergewichte,', exercises.length, 'Übungen');
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
        weightsPerSet: training.weightsPerSet || null,
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
        weight6Reps: plan.weight6Reps || null,
        weight10Reps: plan.weight10Reps || null,
        weight3Reps: plan.weight3Reps || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Gewichts-Referenz zu Cloud synchronisiert:', plan.id);
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
        exercises: exercises,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    console.log('Persönliche Info zu Cloud synchronisiert');
  } catch (error) {
    console.error('Personal Info Upload-Fehler:', error);
  }
}

// Übungen zu Cloud synchronisieren
async function syncExercisesToCloud() {
  if (!syncEnabled || !currentUser) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .set({
        exercises: exercises,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    console.log('Übungen zu Cloud synchronisiert:', exercises.length);
  } catch (error) {
    console.error('Exercises Upload-Fehler:', error);
  }
}

// Daily Borg-Wert zu Cloud synchronisieren
async function syncDailyBorgToCloud(borgEntry) {
  if (!syncEnabled || !currentUser) return;

  try {
    const docId = borgEntry.date.replace(/-/g, ''); // Datum als ID (z.B. "20241219")
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('dailyBorgValues')
      .doc(docId)
      .set({
        date: borgEntry.date,
        borgValue: borgEntry.borgValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Daily Borg-Wert zu Cloud synchronisiert:', borgEntry.date);
  } catch (error) {
    console.error('Daily Borg Upload-Fehler:', error);
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

// Daily Borg-Wert aus Cloud löschen
async function deleteDailyBorgFromCloud(date) {
  if (!syncEnabled || !currentUser) return;

  try {
    const docId = date.replace(/-/g, '');
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('dailyBorgValues')
      .doc(docId)
      .delete();

    console.log('Daily Borg-Wert aus Cloud gelöscht:', date);
  } catch (error) {
    console.error('Daily Borg Lösch-Fehler:', error);
  }
}

// Echtzeit-Synchronisation starten
function startRealtimeSync() {
  if (!syncEnabled || !currentUser) return;

  // Trainings Realtime-Sync
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

  // Daily Borg Values Realtime-Sync
  db.collection('users')
    .doc(currentUser.uid)
    .collection('dailyBorgValues')
    .onSnapshot((snapshot) => {
      if (syncInProgress) return;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();

        if (change.type === 'added' || change.type === 'modified') {
          const index = dailyBorgValues.findIndex(b => b.date === data.date);

          if (index !== -1) {
            dailyBorgValues[index] = data;
          } else {
            dailyBorgValues.push(data);
          }
        }

        if (change.type === 'removed') {
          dailyBorgValues = dailyBorgValues.filter(b => b.date !== data.date);
        }
      });

      localStorage.setItem('dailyBorgValues', JSON.stringify(dailyBorgValues));
      displayTrainings(); // Borg-Werte werden in den Date-Blocks angezeigt

      lastSyncTime = new Date();
      updateSyncStatus('synced', `Aktualisiert: ${formatTime(lastSyncTime)}`);
    }, (error) => {
      console.error('Borg Values Realtime-Sync Fehler:', error);
    });

  // Plans Realtime-Sync
  db.collection('users')
    .doc(currentUser.uid)
    .collection('plans')
    .onSnapshot((snapshot) => {
      if (syncInProgress) return;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = parseInt(change.doc.id);

        if (change.type === 'added' || change.type === 'modified') {
          const index = trainingPlans.findIndex(p => p.id === id);
          const plan = { id, ...data };

          if (index !== -1) {
            trainingPlans[index] = plan;
          } else {
            trainingPlans.push(plan);
          }
        }

        if (change.type === 'removed') {
          trainingPlans = trainingPlans.filter(p => p.id !== id);
        }
      });

      localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));
      displayTrainingPlans();

      lastSyncTime = new Date();
      updateSyncStatus('synced', `Aktualisiert: ${formatTime(lastSyncTime)}`);
    }, (error) => {
      console.error('Plans Realtime-Sync Fehler:', error);
    });

  // Body Weights Realtime-Sync
  db.collection('users')
    .doc(currentUser.uid)
    .collection('bodyWeights')
    .onSnapshot((snapshot) => {
      if (syncInProgress) return;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = parseInt(change.doc.id);

        if (change.type === 'added' || change.type === 'modified') {
          const index = bodyWeights.findIndex(w => w.id === id);
          const weight = { id, ...data };

          if (index !== -1) {
            bodyWeights[index] = weight;
          } else {
            bodyWeights.push(weight);
          }
        }

        if (change.type === 'removed') {
          bodyWeights = bodyWeights.filter(w => w.id !== id);
        }
      });

      localStorage.setItem('bodyWeights', JSON.stringify(bodyWeights));
      displayBodyWeightHistory();
      displayStats();

      lastSyncTime = new Date();
      updateSyncStatus('synced', `Aktualisiert: ${formatTime(lastSyncTime)}`);
    }, (error) => {
      console.error('Body Weights Realtime-Sync Fehler:', error);
    });

  // Personal Info & Exercises Realtime-Sync
  db.collection('users')
    .doc(currentUser.uid)
    .onSnapshot((snapshot) => {
      if (syncInProgress) return;

      if (snapshot.exists) {
        const data = snapshot.data();
        let updated = false;

        if (data.age !== undefined && data.age !== personalInfo.age) {
          personalInfo.age = data.age;
          updated = true;
        }

        if (data.height !== undefined && data.height !== personalInfo.height) {
          personalInfo.height = data.height;
          updated = true;
        }

        if (data.exercises && Array.isArray(data.exercises)) {
          const currentExercises = JSON.stringify(exercises);
          const newExercises = JSON.stringify(data.exercises);
          if (currentExercises !== newExercises) {
            exercises = data.exercises;
            localStorage.setItem('exercises', JSON.stringify(exercises));
            populateExerciseDropdown();
            displayExerciseList();
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
          displayStats();

          lastSyncTime = new Date();
          updateSyncStatus('synced', `Aktualisiert: ${formatTime(lastSyncTime)}`);
        }
      }
    }, (error) => {
      console.error('Personal Info Realtime-Sync Fehler:', error);
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

// Borg Values mergen (Cloud hat Priorität bei Konflikten)
function mergeBorgValues(local, cloud) {
  const merged = new Map();

  // Lokale Borg-Werte hinzufügen
  local.forEach(borg => {
    merged.set(borg.date, borg);
  });

  // Cloud Borg-Werte überschreiben lokale (Cloud hat Priorität)
  cloud.forEach(borg => {
    merged.set(borg.date, borg);
  });

  return Array.from(merged.values());
}

// Plans mergen (Cloud hat Priorität bei Konflikten)
function mergePlans(local, cloud) {
  const merged = new Map();

  // Lokale Pläne hinzufügen (nur gültige mit mindestens einem Gewicht)
  local.forEach(plan => {
    if (plan.weight6Reps || plan.weight10Reps || plan.weight3Reps) {
      merged.set(plan.id, plan);
    }
  });

  // Cloud-Pläne überschreiben lokale (Cloud hat Priorität, nur gültige)
  cloud.forEach(plan => {
    if (plan.weight6Reps || plan.weight10Reps || plan.weight3Reps) {
      merged.set(plan.id, plan);
    }
  });

  return Array.from(merged.values());
}

// Body Weights mergen (Cloud hat Priorität bei Konflikten)
function mergeBodyWeights(local, cloud) {
  const merged = new Map();

  // Lokale Körpergewichte hinzufügen
  local.forEach(weight => {
    merged.set(weight.id, weight);
  });

  // Cloud Körpergewichte überschreiben lokale (Cloud hat Priorität)
  cloud.forEach(weight => {
    merged.set(weight.id, weight);
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

    console.log('Versuche Anmeldung für:', email);
    await auth.signInWithEmailAndPassword(email, password);
    console.log('Anmeldung erfolgreich!');
    showNotification('✅ Erfolgreich angemeldet!');
    hideLoginModal();
  } catch (error) {
    console.error('Login-Fehler:', error);
    if (error.code === 'auth/user-not-found') {
      showNotification('❌ Benutzer nicht gefunden. Bitte registrieren.');
    } else if (error.code === 'auth/wrong-password') {
      showNotification('❌ Falsches Passwort');
    } else if (error.code === 'auth/invalid-email') {
      showNotification('❌ Ungültige E-Mail-Adresse');
    } else if (error.code === 'auth/network-request-failed') {
      showNotification('❌ Netzwerkfehler. Bitte Internetverbindung prüfen.');
    } else {
      showNotification('❌ Login fehlgeschlagen: ' + error.message);
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
      showNotification('❌ Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    console.log('Versuche Registrierung für:', email);
    await auth.createUserWithEmailAndPassword(email, password);
    console.log('Registrierung erfolgreich!');
    showNotification('✅ Konto erstellt und angemeldet!');
    hideLoginModal();
  } catch (error) {
    console.error('Registrierungs-Fehler:', error);
    if (error.code === 'auth/email-already-in-use') {
      showNotification('❌ E-Mail bereits registriert. Bitte anmelden.');
    } else if (error.code === 'auth/invalid-email') {
      showNotification('❌ Ungültige E-Mail-Adresse');
    } else if (error.code === 'auth/network-request-failed') {
      showNotification('❌ Netzwerkfehler. Bitte Internetverbindung prüfen.');
    } else {
      showNotification('❌ Registrierung fehlgeschlagen: ' + error.message);
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
      <button class="btn-logout" id="logoutButton">Abmelden</button>
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
      <button class="btn-login" id="loginButton">Anmelden für Cloud-Sync</button>
    `;
  }
}

// Login-Modal anzeigen
function showLoginModal() {
  console.log('Login-Modal wird geöffnet...');

  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
    console.log('Login-Modal erfolgreich geöffnet');
  } else {
    console.error('Login-Modal Element nicht gefunden!');
  }

  // Warnung anzeigen wenn Firebase nicht verfügbar ist
  if (!auth) {
    console.warn('Firebase Auth ist nicht verfügbar');
    // Aber Modal trotzdem öffnen - die Fehlermeldung kommt beim Login-Versuch
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
window.syncExercisesToCloud = syncExercisesToCloud;
window.syncDailyBorgToCloud = syncDailyBorgToCloud;
window.deleteFromCloud = deleteFromCloud;
window.deletePlanFromCloud = deletePlanFromCloud;
window.deleteBodyWeightFromCloud = deleteBodyWeightFromCloud;
window.deleteDailyBorgFromCloud = deleteDailyBorgFromCloud;
window.loginWithGoogle = loginWithGoogle;
window.loginWithEmail = loginWithEmail;
window.registerWithEmail = registerWithEmail;
window.logout = logout;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
