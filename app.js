// ========================================
// DATA MANAGEMENT
// ========================================

// ========================================
// DATEN MIGRATION (für Backwards Compatibility)
// ========================================

function migrateOldData() {
    // Trainings migrieren
    let trainings = JSON.parse(localStorage.getItem('trainings')) || [];
    let migrated = false;

    trainings = trainings.map(training => {
        // Alte Struktur: reps war ein einzelner Wert
        // Neue Struktur: reps ist ein Array
        if (typeof training.reps === 'number') {
            migrated = true;
            const sets = training.sets || 1;
            const repsArray = [];

            // Konvertiere einzelnen Wert in Array (alle Sätze mit gleichen Wiederholungen)
            for (let i = 0; i < sets; i++) {
                repsArray.push(training.reps);
            }

            return {
                ...training,
                reps: repsArray,
                trainingType: training.trainingType || 'weight',
                timeMinutes: training.timeMinutes || null,
                timeSeconds: training.timeSeconds || null
            };
        }

        // Falls trainingType fehlt, setze default
        if (!training.trainingType) {
            migrated = true;
            return {
                ...training,
                trainingType: 'weight'
            };
        }

        return training;
    });

    if (migrated) {
        localStorage.setItem('trainings', JSON.stringify(trainings));
        console.log('✅ Alte Trainingsdaten erfolgreich migriert!');
    }

    return trainings;
}

// Trainingseinträge aus localStorage laden (mit Migration)
let trainings = migrateOldData();

// Gewichts-Merkhilfe: Übung -> Wiederholungen -> Gewicht
let weightNotes = JSON.parse(localStorage.getItem('weightNotes')) || [];

let bodyWeights = (JSON.parse(localStorage.getItem('bodyWeights')) || []).sort((a, b) => new Date(b.date) - new Date(a.date));
let dailyBorgValues = JSON.parse(localStorage.getItem('dailyBorgValues')) || [];
let personalInfo = JSON.parse(localStorage.getItem('personalInfo')) || { age: null, height: null, targetWeight: null };
let exercises = JSON.parse(localStorage.getItem('exercises')) || [];

// Edit-Modus Tracking
let editMode = false;
let editingId = null;

// Training Type (weight or time)
let currentTrainingType = 'weight';

// ========================================
// ZENTRALER APP STATE
// ========================================

const AppState = {
    // Daten-Referenzen (für schrittweise Migration)
    get trainings() { return trainings; },
    get weightNotes() { return weightNotes; },
    get bodyWeights() { return bodyWeights; },
    get dailyBorgValues() { return dailyBorgValues; },
    get personalInfo() { return personalInfo; },
    get exercises() { return exercises; },

    // UI-State
    get editMode() { return editMode; },
    get editingId() { return editingId; },
    get currentTrainingType() { return currentTrainingType; }
};

// ========================================
// EDIT-STATE MANAGEMENT
// ========================================

function isCurrentlyEditing(id = null) {
    if (id !== null) {
        return editMode && editingId === id;
    }
    return editMode;
}

function setEditMode(training = null) {
    if (training) {
        editMode = true;
        editingId = training.id;
        currentTrainingType = training.trainingType || 'weight';
    } else {
        editMode = false;
        editingId = null;
        currentTrainingType = 'weight';
    }
}

function updateEditUI() {
    const isEditing = editMode;

    // Formular-Titel und Button
    if (formTitle) {
        formTitle.textContent = isEditing ? 'Training bearbeiten ✏️' : 'Neues Training eintragen';
    }
    if (submitBtn) {
        submitBtn.textContent = isEditing ? 'Änderungen speichern' : 'Eintrag hinzufügen';
    }
    if (cancelBtn) {
        cancelBtn.style.display = isEditing ? 'block' : 'none';
    }
    if (inputSection) {
        inputSection.classList.toggle('editing', isEditing);
    }

    // Training Type Toggle UI
    if (toggleBtns) {
        toggleBtns.forEach(btn => {
            if (btn.getAttribute('data-type') === currentTrainingType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Gewicht/Zeit Gruppen anzeigen
    if (weightGroup && timeGroup) {
        if (currentTrainingType === 'weight') {
            weightGroup.style.display = 'block';
            timeGroup.style.display = 'none';
        } else {
            weightGroup.style.display = 'none';
            timeGroup.style.display = 'block';
        }
    }
}

// ========================================
// TRAININGS STORE
// ========================================

const TrainingsStore = {
    getAll() {
        return [...trainings];
    },

    getById(id) {
        return trainings.find(t => t.id === id);
    },

    add(training) {
        trainings.push(training);
        this._persist();
        this._notifyChange();
        return training;
    },

    update(id, data) {
        const index = trainings.findIndex(t => t.id === id);
        if (index !== -1) {
            trainings[index] = { ...trainings[index], ...data };
            this._persist();
            this._notifyChange();
            return trainings[index];
        }
        return null;
    },

    remove(id) {
        const removed = trainings.find(t => t.id === id);
        trainings = trainings.filter(t => t.id !== id);
        this._persist();
        this._notifyChange();
        return removed;
    },

    _persist() {
        localStorage.setItem('trainings', JSON.stringify(trainings));
    },

    _notifyChange() {
        displayTrainings();
        displayPersonalRecords();
        updateStatistics();
    }
};

// ========================================
// DOM ELEMENTE
// ========================================

const form = document.getElementById('trainingForm');
const trainingList = document.getElementById('trainingList');
const currentDateElement = document.getElementById('currentDate');
const dateInput = document.getElementById('date');
const clearHistoryBtn = document.getElementById('clearHistory');
const recordsList = document.getElementById('recordsList');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const inputSection = document.querySelector('.input-section');
const setsInput = document.getElementById('sets');
const repsInputsContainer = document.getElementById('repsInputs');
const weightGroup = document.getElementById('weightGroup');
const timeGroup = document.getElementById('timeGroup');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const differentWeightsCheckbox = document.getElementById('differentWeights');

// Gewichts-Merkhilfe elements
const weightNoteForm = document.getElementById('weightNoteForm');
const weightNotesList = document.getElementById('weightNotesList');
const weightNoteExerciseSelect = document.getElementById('weightNoteExercise');
const weightNotesFilterExercise = document.getElementById('weightNotesFilterExercise');

// Trainingshistorie Filter
const historyExerciseFilter = document.getElementById('historyExerciseFilter');

// Settings elements
const bodyDataForm = document.getElementById('bodyDataForm');
const bodyWeightHistory = document.getElementById('bodyWeightHistory');
const exerciseForm = document.getElementById('exerciseForm');
const exerciseList = document.getElementById('exerciseList');
const exerciseSelect = document.getElementById('exercise');


// ========================================
// INITIALISIERUNG
// ========================================

function setCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = today.toLocaleDateString('de-DE', options);

    const dateString = today.toISOString().split('T')[0];
    dateInput.value = dateString;

    // Auch für Body Weight Date
    const bodyWeightDateInput = document.getElementById('bodyWeightDate');
    if (bodyWeightDateInput) {
        bodyWeightDateInput.value = dateString;
    }
}

// ========================================
// TRAINING TYPE TOGGLE (Gewicht/Zeit)
// ========================================

toggleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        toggleBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        currentTrainingType = this.getAttribute('data-type');

        if (currentTrainingType === 'weight') {
            weightGroup.style.display = 'block';
            timeGroup.style.display = 'none';
            document.getElementById('weight').required = true;
            document.getElementById('timeMinutes').required = false;
            document.getElementById('timeSeconds').required = false;
        } else {
            weightGroup.style.display = 'none';
            timeGroup.style.display = 'block';
            document.getElementById('weight').required = false;
            document.getElementById('timeMinutes').required = true;
            document.getElementById('timeSeconds').required = true;
        }
    });
});

// ========================================
// REPS INPUTS DYNAMISCH GENERIEREN
// ========================================

setsInput.addEventListener('input', generateRepsInputs);
differentWeightsCheckbox.addEventListener('change', generateRepsInputs);

/**
 * Generiert die Wiederholungs-Eingabefelder
 * @param {boolean} clearValues - Wenn true, werden alle Werte geleert (nach dem Speichern)
 */
function generateRepsInputs(clearValues = false) {
    const numSets = parseInt(setsInput.value) || 4;
    const useDifferentWeights = differentWeightsCheckbox.checked && currentTrainingType === 'weight';

    // Bestehende Werte speichern (falls nicht explizit geleert werden soll)
    const existingReps = [];
    const existingWeights = [];
    if (!clearValues) {
        for (let i = 1; i <= 10; i++) {
            const repInput = document.getElementById(`rep${i}`);
            const weightInput = document.getElementById(`weight${i}`);
            if (repInput) existingReps[i] = repInput.value;
            if (weightInput) existingWeights[i] = weightInput.value;
        }
    }

    repsInputsContainer.innerHTML = '';

    for (let i = 1; i <= numSets; i++) {
        const repInputGroup = document.createElement('div');
        repInputGroup.className = useDifferentWeights ? 'rep-input-group with-weight' : 'rep-input-group';

        if (useDifferentWeights) {
            repInputGroup.innerHTML = `
                <label for="rep${i}">Satz ${i}</label>
                <input type="number" id="rep${i}" min="1" placeholder="Wdh." required>
                <input type="number" id="weight${i}" step="0.5" placeholder="kg" required>
            `;
        } else {
            repInputGroup.innerHTML = `
                <label for="rep${i}">Satz ${i}</label>
                <input type="number" id="rep${i}" min="1" placeholder="Wdh." required>
            `;
        }

        repsInputsContainer.appendChild(repInputGroup);

        // Bestehende Werte wiederherstellen (falls vorhanden und nicht geleert)
        if (!clearValues && existingReps[i]) {
            document.getElementById(`rep${i}`).value = existingReps[i];
        }
        if (!clearValues && existingWeights[i] && useDifferentWeights) {
            document.getElementById(`weight${i}`).value = existingWeights[i];
        }
    }
}

// Initial generieren
generateRepsInputs();

// ========================================
// ÜBUNGSVERWALTUNG
// ========================================

function populateExerciseDropdown() {
    if (!exerciseSelect) {
        console.warn('populateExerciseDropdown: exerciseSelect Element nicht gefunden');
        return;
    }

    // IMMER frisch aus localStorage laden - das ist die einzige Wahrheitsquelle
    const storedExercises = JSON.parse(localStorage.getItem('exercises')) || [];

    // Globale Variable aktualisieren (unabhängig davon ob leer oder nicht)
    exercises = storedExercises;

    console.log('populateExerciseDropdown: Lade', exercises.length, 'Übungen aus localStorage');

    const currentValue = exerciseSelect.value;
    exerciseSelect.innerHTML = '<option value="">-- Übung auswählen --</option>';

    exercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        option.textContent = exercise;
        exerciseSelect.appendChild(option);
    });

    // Restore selected value if it exists
    if (currentValue && exercises.includes(currentValue)) {
        exerciseSelect.value = currentValue;
    }

    // Auch Gewichts-Merkhilfe Dropdown füllen
    if (weightNoteExerciseSelect) {
        const noteCurrentValue = weightNoteExerciseSelect.value;
        weightNoteExerciseSelect.innerHTML = '<option value="">-- Übung auswählen --</option>';

        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            weightNoteExerciseSelect.appendChild(option);
        });

        if (noteCurrentValue && exercises.includes(noteCurrentValue)) {
            weightNoteExerciseSelect.value = noteCurrentValue;
        }
    }

    // Gewichts-Merkhilfe Filter-Dropdown füllen
    if (weightNotesFilterExercise) {
        const filterCurrentValue = weightNotesFilterExercise.value;
        weightNotesFilterExercise.innerHTML = '<option value="">-- Übung wählen --</option>';

        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            weightNotesFilterExercise.appendChild(option);
        });

        if (filterCurrentValue && exercises.includes(filterCurrentValue)) {
            weightNotesFilterExercise.value = filterCurrentValue;
        }
    }

    // Trainingshistorie Filter-Dropdown füllen (aus tatsächlichen Trainings)
    if (historyExerciseFilter) {
        const historyFilterValue = historyExerciseFilter.value;
        historyExerciseFilter.innerHTML = '<option value="">-- Übung wählen --</option>';

        // Übungen aus den tatsächlichen Trainings holen (nicht aus der Übungsliste)
        const trainedExercises = [...new Set(trainings.map(t => t.exercise))].sort();

        trainedExercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            // Anzahl der Trainings für diese Übung anzeigen
            const count = trainings.filter(t => t.exercise === exercise).length;
            option.textContent = `${exercise} (${count})`;
            historyExerciseFilter.appendChild(option);
        });

        if (historyFilterValue && trainedExercises.includes(historyFilterValue)) {
            historyExerciseFilter.value = historyFilterValue;
        }
    }

    console.log('Übungs-Dropdowns gefüllt mit', exercises.length, 'Übungen');
}

// ========================================
// TRAINING HINZUFÜGEN/BEARBEITEN
// ========================================

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const numSets = parseInt(setsInput.value);
    const reps = [];
    const weightsPerSet = [];
    const useDifferentWeights = differentWeightsCheckbox.checked && currentTrainingType === 'weight';

    // Wiederholungen und optional Gewichte pro Satz sammeln
    for (let i = 1; i <= numSets; i++) {
        const repValue = parseInt(document.getElementById(`rep${i}`).value);
        reps.push(repValue);

        if (useDifferentWeights) {
            const weightValue = parseFloat(document.getElementById(`weight${i}`).value);
            weightsPerSet.push(weightValue);
        }
    }

    let training;

    if (editMode) {
        // Training bearbeiten
        const trainingIndex = trainings.findIndex(t => t.id === editingId);
        if (trainingIndex !== -1) {
            training = {
                id: editingId,
                exercise: document.getElementById('exercise').value,
                trainingType: currentTrainingType,
                weight: currentTrainingType === 'weight' && !useDifferentWeights ? parseFloat(document.getElementById('weight').value) : null,
                weightsPerSet: useDifferentWeights ? weightsPerSet : null,
                timeMinutes: currentTrainingType === 'time' ? parseInt(document.getElementById('timeMinutes').value) || 0 : null,
                timeSeconds: currentTrainingType === 'time' ? parseInt(document.getElementById('timeSeconds').value) || 0 : null,
                sets: numSets,
                reps: reps,
                date: document.getElementById('date').value
            };
            trainings[trainingIndex] = training;
            showNotification('Training erfolgreich aktualisiert!');

            if (typeof syncToCloud === 'function') {
                await syncToCloud(training);
            }
        }
        cancelEdit();
    } else {
        // Neues Training hinzufügen
        training = {
            id: Date.now(),
            exercise: document.getElementById('exercise').value,
            trainingType: currentTrainingType,
            weight: currentTrainingType === 'weight' && !useDifferentWeights ? parseFloat(document.getElementById('weight').value) : null,
            weightsPerSet: useDifferentWeights ? weightsPerSet : null,
            timeMinutes: currentTrainingType === 'time' ? parseInt(document.getElementById('timeMinutes').value) || 0 : null,
            timeSeconds: currentTrainingType === 'time' ? parseInt(document.getElementById('timeSeconds').value) || 0 : null,
            sets: numSets,
            reps: reps,
            date: document.getElementById('date').value
        };
        trainings.push(training);
        showNotification('Training erfolgreich hinzugefügt!');

        if (typeof syncToCloud === 'function') {
            await syncToCloud(training);
        }

        form.reset();
        setCurrentDate();
        generateRepsInputs(true); // true = Werte leeren nach dem Speichern
    }

    saveTrainings();
    displayTrainings();
    displayPersonalRecords();
    updateStatistics();
});

function saveTrainings() {
    localStorage.setItem('trainings', JSON.stringify(trainings));
}

// ========================================
// TRAINING BEARBEITEN
// ========================================

function editTraining(id) {
    const training = trainings.find(t => t.id === id);
    if (!training) return;

    editMode = true;
    editingId = id;

    // Formular mit Daten füllen
    document.getElementById('exercise').value = training.exercise;

    // Training Type setzen
    currentTrainingType = training.trainingType || 'weight';
    toggleBtns.forEach(btn => {
        if (btn.getAttribute('data-type') === currentTrainingType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (currentTrainingType === 'weight') {
        weightGroup.style.display = 'block';
        timeGroup.style.display = 'none';

        // Check if training has weightsPerSet
        if (training.weightsPerSet && training.weightsPerSet.length > 0) {
            differentWeightsCheckbox.checked = true;
        } else {
            differentWeightsCheckbox.checked = false;
            document.getElementById('weight').value = training.weight || '';
        }
    } else {
        weightGroup.style.display = 'none';
        timeGroup.style.display = 'block';
        document.getElementById('timeMinutes').value = training.timeMinutes || 0;
        document.getElementById('timeSeconds').value = training.timeSeconds || 0;
    }

    setsInput.value = training.sets;
    document.getElementById('date').value = training.date;

    // Reps Inputs generieren und füllen
    generateRepsInputs();
    training.reps.forEach((rep, index) => {
        const repInput = document.getElementById(`rep${index + 1}`);
        if (repInput) {
            repInput.value = rep;
        }

        // Fill weight inputs if weightsPerSet exists
        if (training.weightsPerSet && training.weightsPerSet[index] !== undefined) {
            const weightInput = document.getElementById(`weight${index + 1}`);
            if (weightInput) {
                weightInput.value = training.weightsPerSet[index];
            }
        }
    });

    // UI anpassen
    formTitle.textContent = 'Training bearbeiten ✏️';
    submitBtn.textContent = 'Änderungen speichern';
    cancelBtn.style.display = 'block';
    inputSection.classList.add('editing');

    inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
    editMode = false;
    editingId = null;

    form.reset();
    setCurrentDate();
    differentWeightsCheckbox.checked = false;
    generateRepsInputs(true); // true = Werte leeren beim Abbrechen

    // Training Type zurücksetzen
    currentTrainingType = 'weight';
    toggleBtns.forEach(btn => {
        if (btn.getAttribute('data-type') === 'weight') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    weightGroup.style.display = 'block';
    timeGroup.style.display = 'none';

    formTitle.textContent = 'Neues Training eintragen';
    submitBtn.textContent = 'Eintrag hinzufügen';
    cancelBtn.style.display = 'none';
    inputSection.classList.remove('editing');
}

cancelBtn.addEventListener('click', cancelEdit);

// ========================================
// TRAINING LÖSCHEN
// ========================================

async function deleteTraining(id) {
    if (confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
        trainings = trainings.filter(training => training.id !== id);
        saveTrainings();
        displayTrainings();
        displayPersonalRecords();
        updateStatistics();

        if (typeof deleteFromCloud === 'function') {
            await deleteFromCloud(id);
        }

        showNotification('Eintrag gelöscht!');
    }
}

clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Möchtest du wirklich alle Einträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        trainings = [];
        saveTrainings();
        displayTrainings();
        displayPersonalRecords();
        updateStatistics();
        showNotification('Alle Einträge gelöscht!');
    }
});

// ========================================
// TRAININGS ANZEIGEN
// ========================================

// Globale Variable für ausgewählte Übung in der Historie
let selectedHistoryExercise = null;

// Historie-Dropdown aktualisieren (aus tatsächlichen Trainings)
function updateHistoryExerciseDropdown() {
    if (!historyExerciseFilter) return;

    const currentValue = historyExerciseFilter.value;
    historyExerciseFilter.innerHTML = '<option value="">-- Übung wählen --</option>';

    // Übungen aus den tatsächlichen Trainings holen
    const trainedExercises = [...new Set(trainings.map(t => t.exercise))].sort();

    trainedExercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        const count = trainings.filter(t => t.exercise === exercise).length;
        option.textContent = `${exercise} (${count})`;
        historyExerciseFilter.appendChild(option);
    });

    // Wert wiederherstellen falls vorhanden
    if (currentValue && trainedExercises.includes(currentValue)) {
        historyExerciseFilter.value = currentValue;
    }
}

function displayTrainings() {
    if (!trainingList) return;

    // Dropdown aktualisieren
    updateHistoryExerciseDropdown();

    // Keine Trainings vorhanden
    if (trainings.length === 0) {
        trainingList.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Trainingseinträge vorhanden.</p>
                <p>Füge dein erstes Training hinzu!</p>
            </div>
        `;
        return;
    }

    // Keine Übung ausgewählt
    selectedHistoryExercise = historyExerciseFilter ? historyExerciseFilter.value : null;

    if (!selectedHistoryExercise) {
        trainingList.innerHTML = `
            <div class="empty-state">
                <p>Wähle eine Übung aus dem Dropdown-Menü, um deine Trainingshistorie zu sehen.</p>
            </div>
        `;
        return;
    }

    // Trainings für diese Übung filtern (neueste zuerst)
    const trainingsForExercise = trainings
        .filter(t => t.exercise === selectedHistoryExercise)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (trainingsForExercise.length === 0) {
        trainingList.innerHTML = `
            <div class="empty-state">
                <p>Keine Trainings für "${selectedHistoryExercise}" gefunden.</p>
            </div>
        `;
        return;
    }

    // Trainings nach Datum gruppieren
    const trainingsByDate = {};
    trainingsForExercise.forEach(training => {
        if (!trainingsByDate[training.date]) {
            trainingsByDate[training.date] = [];
        }
        trainingsByDate[training.date].push(training);
    });

    // HTML für jedes Datum generieren
    const datesHTML = Object.keys(trainingsByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const trainingsHTML = trainingsByDate[date].map(training => {
                // Reps anzeigen
                const repsDisplay = Array.isArray(training.reps)
                    ? training.reps.join(', ')
                    : training.reps || '0';

                // Summe der Wiederholungen
                const totalReps = Array.isArray(training.reps)
                    ? training.reps.reduce((sum, rep) => sum + parseInt(rep || 0), 0)
                    : parseInt(training.reps || 0);

                // Gewicht oder Zeit anzeigen
                let valueDisplay = '';
                if (training.trainingType === 'time') {
                    const mins = training.timeMinutes || 0;
                    const secs = training.timeSeconds || 0;
                    valueDisplay = `${mins > 0 ? mins + ' min ' : ''}${secs} sek`;
                } else {
                    if (training.weightsPerSet && training.weightsPerSet.length > 0) {
                        valueDisplay = training.weightsPerSet.join(' / ') + ' kg';
                    } else if (training.weight) {
                        valueDisplay = `${training.weight} kg`;
                    } else {
                        valueDisplay = 'Körpergewicht';
                    }
                }

                return `
                    <div class="training-item">
                        <div class="training-info">
                            <div class="training-details">
                                <div class="detail-item">
                                    <div class="detail-label">${training.trainingType === 'time' ? 'Zeit' : 'Gewicht'}</div>
                                    <div class="detail-value">${valueDisplay}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Sätze</div>
                                    <div class="detail-value">${training.sets}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Wdh.</div>
                                    <div class="detail-value">${repsDisplay}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Gesamt</div>
                                    <div class="detail-value">${totalReps}</div>
                                </div>
                            </div>
                        </div>
                        <div class="training-actions">
                            <button class="edit-btn" onclick="editTraining(${training.id})">Bearbeiten</button>
                            <button class="delete-btn" onclick="deleteTraining(${training.id})">Löschen</button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="date-block">
                    <div class="date-header-simple">
                        <span class="date-icon">📅</span>
                        <span class="date-title">${formattedDate}</span>
                    </div>
                    <div class="date-trainings">
                        ${trainingsHTML}
                    </div>
                </div>
            `;
        }).join('');

    trainingList.innerHTML = `
        <div class="exercise-history-header">
            <h3>${selectedHistoryExercise}</h3>
            <span class="training-count">${trainingsForExercise.length} Einträge</span>
        </div>
        ${datesHTML}
    `;
}

// Event Listener für Übungs-Filter
if (historyExerciseFilter) {
    historyExerciseFilter.addEventListener('change', displayTrainings);
}

// ========================================
// BORG-WERT FUNKTIONEN
// ========================================

function saveDailyBorg(date, value) {
    const borgValue = parseInt(value);
    const existingIndex = dailyBorgValues.findIndex(b => b.date === date);

    if (existingIndex !== -1) {
        dailyBorgValues[existingIndex].borgValue = borgValue;
    } else {
        dailyBorgValues.push({
            id: Date.now(),
            date: date,
            borgValue: borgValue
        });
    }

    localStorage.setItem('dailyBorgValues', JSON.stringify(dailyBorgValues));

    // Cloud sync wenn verfügbar
    if (typeof syncDailyBorgToCloud === 'function') {
        syncDailyBorgToCloud({ date, borgValue });
    }

    // Charts aktualisieren
    updateBorgValueChart();
}

function updateBorgDisplay(date, value) {
    const display = document.getElementById(`borg-${date}`);
    if (display) {
        const borgValue = parseInt(value);
        const color = borgValue >= 7 ? '#6bcf7f' : borgValue >= 4 ? '#ffd93d' : '#ff6b6b';
        display.style.color = color;
        display.textContent = `${borgValue}/10`;
    }
}

// Globale Funktionen für onclick-Handler
window.saveDailyBorg = saveDailyBorg;
window.updateBorgDisplay = updateBorgDisplay;

// ========================================
// PERSONAL RECORDS
// ========================================

function displayPersonalRecords() {
    const exercises = {
        'Kniebeugen Front': {
            names: ['kniebeugen front', 'front kniebeugen', 'frontkniebeugen', 'front squat', 'front squats'],
            icon: '🦵',
            color: 'gold'
        },
        'Bankdrücken': {
            names: ['bankdrücken', 'bankdrücken', 'bench press', 'benchpress', 'flachbankdrücken'],
            icon: '💪',
            color: 'silver'
        },
        'Kreuzheben': {
            names: ['kreuzheben', 'deadlift', 'deadlifts'],
            icon: '🏋️',
            color: 'bronze'
        }
    };

    const records = {};

    Object.keys(exercises).forEach(exerciseName => {
        const exerciseData = exercises[exerciseName];

        const exerciseTrainings = trainings.filter(training => {
            const trainingName = training.exercise.toLowerCase().trim();
            return training.trainingType === 'weight' &&
                   exerciseData.names.some(name => trainingName.includes(name));
        });

        if (exerciseTrainings.length > 0) {
            const bestTraining = exerciseTrainings.reduce((max, training) => {
                // Höchstes Gewicht für dieses Training ermitteln
                let trainingMaxWeight = training.weight || 0;
                if (training.weightsPerSet && training.weightsPerSet.length > 0) {
                    trainingMaxWeight = Math.max(...training.weightsPerSet);
                }

                // Höchstes Gewicht für aktuelles Maximum ermitteln
                let maxWeight = max.weight || 0;
                if (max.weightsPerSet && max.weightsPerSet.length > 0) {
                    maxWeight = Math.max(...max.weightsPerSet);
                }

                return trainingMaxWeight > maxWeight ? training : max;
            });

            // Höchstes Gewicht und entsprechende Wiederholungen für Anzeige berechnen
            let displayWeight = bestTraining.weight || 0;
            let displayReps = bestTraining.reps;

            if (bestTraining.weightsPerSet && bestTraining.weightsPerSet.length > 0) {
                // Finde den Index des höchsten Gewichts
                const maxWeightIndex = bestTraining.weightsPerSet.indexOf(Math.max(...bestTraining.weightsPerSet));
                displayWeight = bestTraining.weightsPerSet[maxWeightIndex];

                // Zeige nur die Wiederholungen des Satzes mit dem höchsten Gewicht
                if (Array.isArray(bestTraining.reps)) {
                    displayReps = bestTraining.reps[maxWeightIndex];
                }
            } else if (Array.isArray(bestTraining.reps)) {
                // Wenn alle Sätze das gleiche Gewicht haben, zeige nur die höchste Wiederholungszahl
                displayReps = Math.max(...bestTraining.reps);
            }

            records[exerciseName] = {
                ...bestTraining,
                weight: displayWeight,
                reps: displayReps,
                icon: exerciseData.icon,
                color: exerciseData.color,
                totalLifts: exerciseTrainings.length
            };
        }
    });

    if (Object.keys(records).length === 0) {
        recordsList.innerHTML = `
            <div class="no-records">
                <div class="no-records-icon">🏆</div>
                <p>Noch keine Bestleistungen vorhanden</p>
                <p class="no-records-hint">
                    Füge Trainingseinträge für folgende Übungen hinzu:<br>
                    <strong>Kniebeugen Front, Bankdrücken oder Kreuzheben</strong>
                </p>
            </div>
        `;
        return;
    }

    recordsList.innerHTML = Object.keys(exercises).map(exerciseName => {
        const record = records[exerciseName];

        if (!record) {
            return `
                <div class="record-card">
                    <div class="record-exercise">
                        <div class="record-icon">${exercises[exerciseName].icon}</div>
                        <div class="record-name">${exerciseName}</div>
                    </div>
                    <div class="no-records" style="padding: 20px;">
                        <p style="font-size: 1rem;">Noch keine Einträge für diese Übung</p>
                    </div>
                </div>
            `;
        }

        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Zeige nur die Wiederholungszahl des besten Satzes
        const repsDisplay = record.reps || 0;

        return `
            <div class="record-card ${record.color}">
                <div class="record-exercise">
                    <div class="record-icon">${record.icon}</div>
                    <div class="record-name">${exerciseName}</div>
                </div>
                <div class="record-stats">
                    <div class="record-stat">
                        <div class="record-stat-label">Maximales Gewicht</div>
                        <div class="record-stat-value">
                            ${record.weight}
                            <span class="record-stat-unit">kg</span>
                        </div>
                    </div>
                    <div class="record-stat">
                        <div class="record-stat-label">Bei Wiederholungen</div>
                        <div class="record-stat-value">
                            ${repsDisplay}
                        </div>
                    </div>
                </div>
                <div class="record-date">
                    <strong>Erreicht am:</strong> ${formattedDate}
                    <br>
                    <small>Gesamt: ${record.totalLifts} Trainingseinheiten</small>
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// GEWICHTS-MERKHILFE
// ========================================

// Gewichts-Notiz hinzufügen
if (weightNoteForm) {
    weightNoteForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const exercise = weightNoteExerciseSelect.value;
        const reps = parseInt(document.getElementById('weightNoteReps').value);
        const weight = parseFloat(document.getElementById('weightNoteWeight').value);

        if (!exercise || !reps) {
            showNotification('Bitte Übung und Wiederholungen ausfüllen!');
            return;
        }

        // Prüfen ob Eintrag für diese Übung+Wiederholungen bereits existiert
        const existingIndex = weightNotes.findIndex(n => n.exercise === exercise && n.reps === reps);

        const note = {
            id: existingIndex !== -1 ? weightNotes[existingIndex].id : Date.now(),
            exercise: exercise,
            reps: reps,
            weight: isNaN(weight) ? null : weight // Gewicht ist optional
        };

        if (existingIndex !== -1) {
            weightNotes[existingIndex] = note;
            showNotification('Gewicht aktualisiert!');
        } else {
            weightNotes.push(note);
            showNotification('Gewicht gespeichert!');
        }

        localStorage.setItem('weightNotes', JSON.stringify(weightNotes));

        // Sync zur Cloud
        if (typeof syncWeightNoteToCloud === 'function') {
            await syncWeightNoteToCloud(note);
        }

        displayWeightNotes();
        weightNoteForm.reset();
    });
}

// Gewichts-Notizen anzeigen (nur für ausgewählte Übung)
function displayWeightNotes() {
    if (!weightNotesList) return;

    // Keine Übung ausgewählt
    const selectedExercise = weightNotesFilterExercise ? weightNotesFilterExercise.value : null;

    if (!selectedExercise) {
        weightNotesList.innerHTML = `
            <div class="empty-state">
                <p>Wähle eine Übung aus dem Dropdown-Menü, um deine Gewichts-Notizen zu sehen.</p>
            </div>
        `;
        return;
    }

    // Notizen für ausgewählte Übung filtern
    const notesForExercise = weightNotes
        .filter(n => n.exercise === selectedExercise)
        .sort((a, b) => b.reps - a.reps); // Höhere Wdh. zuerst

    if (notesForExercise.length === 0) {
        weightNotesList.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Gewichte für "${selectedExercise}" notiert.</p>
                <p>Trage dein erstes Gewicht ein!</p>
            </div>
        `;
        return;
    }

    // HTML generieren
    const notesHtml = notesForExercise.map(note => {
        const weightDisplay = note.weight !== null ? `${note.weight} kg` : 'Körpergewicht';
        return `
            <div class="weight-note-row">
                <span class="weight-note-reps">${note.reps} Wdh.</span>
                <span class="weight-note-weight">${weightDisplay}</span>
                <button class="delete-btn-small" onclick="deleteWeightNote(${note.id})">×</button>
            </div>
        `;
    }).join('');

    weightNotesList.innerHTML = `
        <div class="weight-note-card">
            <h3 class="weight-note-exercise">${selectedExercise}</h3>
            <div class="weight-note-list">
                ${notesHtml}
            </div>
        </div>
    `;
}

// Event Listener für Filter-Dropdown
if (weightNotesFilterExercise) {
    weightNotesFilterExercise.addEventListener('change', displayWeightNotes);
}

// Gewichts-Notiz löschen
async function deleteWeightNote(id) {
    if (confirm('Diesen Eintrag wirklich löschen?')) {
        weightNotes = weightNotes.filter(n => n.id !== id);
        localStorage.setItem('weightNotes', JSON.stringify(weightNotes));

        // Aus Cloud löschen
        if (typeof deleteWeightNoteFromCloud === 'function') {
            await deleteWeightNoteFromCloud(id);
        }

        displayWeightNotes();
        showNotification('Eintrag gelöscht!');
    }
}

// Globale Funktion für onclick-Handler
window.deleteWeightNote = deleteWeightNote;

// ========================================
// EINSTELLUNGEN - KÖRPERGEWICHT
// ========================================

bodyDataForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const bodyWeight = {
        id: Date.now(),
        weight: parseFloat(document.getElementById('bodyWeight').value),
        date: document.getElementById('bodyWeightDate').value
    };

    bodyWeights.push(bodyWeight);
    bodyWeights.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('bodyWeights', JSON.stringify(bodyWeights));

    // Zu Cloud synchronisieren
    if (typeof syncBodyWeightToCloud === 'function') {
        await syncBodyWeightToCloud(bodyWeight);
    }

    displayBodyWeightHistory();
    updateBodyWeightChart();
    bodyDataForm.reset();
    setCurrentDate();
    showNotification('Körpergewicht gespeichert!');
});

function displayBodyWeightHistory() {
    if (bodyWeights.length === 0) {
        bodyWeightHistory.innerHTML = '<p style="text-align: center; color: #999;">Noch keine Einträge</p>';
        return;
    }

    // Sortiere nach Datum absteigend (neueste zuerst)
    const sortedWeights = [...bodyWeights].sort((a, b) => new Date(b.date) - new Date(a.date));

    bodyWeightHistory.innerHTML = sortedWeights.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // Formatiere Gewicht mit zwei Nachkommastellen und Komma als Trennzeichen
        const formattedWeight = entry.weight.toFixed(2).replace('.', ',');

        return `
            <div class="body-weight-entry">
                <span class="date">${formattedDate}</span>
                <span class="weight">${formattedWeight} kg</span>
                <button class="delete-btn" onclick="deleteBodyWeight(${entry.id})">×</button>
            </div>
        `;
    }).join('');
}

async function deleteBodyWeight(id) {
    bodyWeights = bodyWeights.filter(w => w.id !== id);
    localStorage.setItem('bodyWeights', JSON.stringify(bodyWeights));

    // Aus Cloud löschen
    if (typeof deleteBodyWeightFromCloud === 'function') {
        await deleteBodyWeightFromCloud(id);
    }

    displayBodyWeightHistory();
    updateBodyWeightChart();
    showNotification('Eintrag gelöscht!');
}

// Zielgewicht speichern
function saveTargetWeight() {
    const targetWeightInput = document.getElementById('targetWeight');
    const targetWeight = parseFloat(targetWeightInput.value);

    if (targetWeight && targetWeight > 0) {
        personalInfo.targetWeight = targetWeight;
    } else {
        personalInfo.targetWeight = null; // Leer = kein Zielgewicht
    }

    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));

    // Sync zur Cloud
    if (typeof syncPersonalInfoToCloud === 'function') {
        syncPersonalInfoToCloud();
    }

    updateBodyWeightChart();
    showNotification('Zielgewicht gespeichert!');
}

// Zielgewicht beim App-Start laden
function loadTargetWeight() {
    const targetWeightInput = document.getElementById('targetWeight');
    if (targetWeightInput && personalInfo.targetWeight) {
        targetWeightInput.value = personalInfo.targetWeight;
    }
}

// ========================================
// ÜBUNGSLISTE VERWALTEN
// ========================================

exerciseForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newExercise = document.getElementById('newExercise').value.trim();

    if (!newExercise) return;

    if (exercises.includes(newExercise)) {
        showNotification('Diese Übung existiert bereits!');
        return;
    }

    exercises.push(newExercise);
    exercises.sort();
    localStorage.setItem('exercises', JSON.stringify(exercises));

    // Sync zur Cloud
    if (typeof syncExercisesToCloud === 'function') {
        syncExercisesToCloud();
    }

    populateExerciseDropdown();
    displayExerciseList();
    exerciseForm.reset();
    showNotification('Übung hinzugefügt!');
});

function displayExerciseList() {
    if (!exerciseList) {
        console.warn('displayExerciseList: exerciseList Element nicht gefunden');
        return;
    }

    // IMMER frisch aus localStorage laden
    const storedExercises = JSON.parse(localStorage.getItem('exercises')) || [];
    exercises = storedExercises;

    console.log('displayExerciseList: Zeige', exercises.length, 'Übungen');

    // Summary-Text aktualisieren mit Anzahl
    const summaryEl = document.getElementById('exerciseSummary');
    if (summaryEl) {
        summaryEl.textContent = `Gespeicherte Übungen anzeigen (${exercises.length})`;
    }

    if (exercises.length === 0) {
        exerciseList.innerHTML = '<p style="text-align: center; color: #999;">Noch keine Übungen</p>';
        return;
    }

    exerciseList.innerHTML = exercises.map(exercise => `
        <div class="exercise-item">
            <span class="name">${exercise}</span>
            <button class="delete-btn" onclick="deleteExercise('${exercise.replace(/'/g, "\\'")}')">Löschen</button>
        </div>
    `).join('');
}

function deleteExercise(exerciseName) {
    if (confirm(`Übung "${exerciseName}" wirklich löschen?`)) {
        exercises = exercises.filter(e => e !== exerciseName);
        localStorage.setItem('exercises', JSON.stringify(exercises));

        // Sync zur Cloud
        if (typeof syncExercisesToCloud === 'function') {
            syncExercisesToCloud();
        }

        populateExerciseDropdown();
        displayExerciseList();
        showNotification('Übung gelöscht!');
    }
}


// ========================================
// STATISTIKEN
// ========================================

function updateStatistics() {
    // Einzigartige Trainingstage ermitteln
    const uniqueDates = [...new Set(trainings.map(t => t.date))];

    // Trainingstage diesen Monat
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyDates = uniqueDates.filter(date => {
        const dateObj = new Date(date);
        return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
    });

    document.getElementById('monthlyTrainings').textContent = monthlyDates.length;

    // Durchschnitt pro Monat
    if (uniqueDates.length > 0) {
        const dates = uniqueDates.map(d => new Date(d));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                          (maxDate.getMonth() - minDate.getMonth()) + 1;

        const avgMonthly = Math.round(uniqueDates.length / monthsDiff);
        document.getElementById('avgMonthlyTrainings').textContent = avgMonthly;
    } else {
        document.getElementById('avgMonthlyTrainings').textContent = 0;
    }

    // Gesamt Trainingstage
    document.getElementById('totalTrainings').textContent = uniqueDates.length;
}

// ========================================
// GESAMTWIEDERHOLUNGEN PRO ÜBUNG
// ========================================

// Zielwerte für 100%
const TARGET_WEEK_REPS_DEFAULT = 76;   // 4×3 + 4×6 + 4×10 = 12 + 24 + 40 = 76
const TARGET_WEEK_REPS_KLIMMZUEGE = 120; // 3×4×10 = 120

// Aktuell ausgewählter Monat für Trainingsvolumen (null = aktueller Monat)
let selectedVolumeMonth = null;

function getWeekTargetForExercise(exerciseName) {
    // Klimmzüge haben ein anderes Ziel
    if (exerciseName.toLowerCase().includes('klimmzug') || exerciseName.toLowerCase().includes('klimmzüge')) {
        return TARGET_WEEK_REPS_KLIMMZUEGE;
    }
    return TARGET_WEEK_REPS_DEFAULT;
}

function getMonthTargetForExercise(exerciseName, year, month) {
    const weekTarget = getWeekTargetForExercise(exerciseName);
    // Berechne anteilig basierend auf der Anzahl der Tage im Monat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Wochen im Monat = Tage / 7
    const weeksInMonth = daysInMonth / 7;
    return Math.round(weekTarget * weeksInMonth);
}

function getWeekDatesForMonth(year, month) {
    // Für vergangene Monate: Alle Wochen des Monats (keine aktuelle Woche)
    // Für aktuellen Monat: Aktuelle Kalenderwoche
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    if (isCurrentMonth) {
        // Aktuelle Woche
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { start: monday, end: sunday };
    } else {
        // Letzte volle Woche des vergangenen Monats
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const dayOfWeek = lastDayOfMonth.getDay();
        const sundayOffset = dayOfWeek === 0 ? 0 : -dayOfWeek;

        const sunday = new Date(lastDayOfMonth);
        sunday.setDate(lastDayOfMonth.getDate() + sundayOffset);
        sunday.setHours(23, 59, 59, 999);

        const monday = new Date(sunday);
        monday.setDate(sunday.getDate() - 6);
        monday.setHours(0, 0, 0, 0);

        return { start: monday, end: sunday };
    }
}

function getMonthDates(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return { start: firstDay, end: lastDay };
}

function populateVolumeMonthDropdown() {
    const dropdown = document.getElementById('volumeMonth');
    if (!dropdown) return;

    // Sammle alle Monate mit Trainings
    const monthsWithData = new Set();
    trainings.forEach(t => {
        if (t.trainingType === 'weight' || !t.trainingType) {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            monthsWithData.add(monthKey);
        }
    });

    // Aktuellen Monat immer hinzufügen
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    monthsWithData.add(currentMonthKey);

    // Sortiere Monate absteigend (neueste zuerst)
    const sortedMonths = Array.from(monthsWithData).sort().reverse();

    // Bestimme welcher Monat ausgewählt sein soll
    const selectedKey = selectedVolumeMonth
        ? `${selectedVolumeMonth.year}-${String(selectedVolumeMonth.month).padStart(2, '0')}`
        : currentMonthKey;

    dropdown.innerHTML = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month, 1);
        const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

        return `<option value="${monthKey}" ${monthKey === selectedKey ? 'selected' : ''}>${label}</option>`;
    }).join('');

    // Event-Listener für Monatswechsel (nur einmal setzen)
    if (!dropdown.hasAttribute('data-listener-added')) {
        dropdown.setAttribute('data-listener-added', 'true');
        dropdown.addEventListener('change', function() {
            const [year, month] = this.value.split('-').map(Number);
            selectedVolumeMonth = { year, month };
            displayTrainingVolume();
        });
    }

    // Initial auf aktuellen Monat setzen, falls noch nicht gesetzt
    if (!selectedVolumeMonth) {
        selectedVolumeMonth = { year: now.getFullYear(), month: now.getMonth() };
    }
}

function calculateTotalReps(exerciseTrainings) {
    let total = 0;
    exerciseTrainings.forEach(training => {
        const reps = Array.isArray(training.reps) ? training.reps : [training.reps];
        reps.forEach(rep => {
            total += parseInt(rep) || 0;
        });
    });
    return total;
}

// Chart-Instanzen speichern
let volumeCharts = {};

function displayTrainingVolume() {
    const container = document.getElementById('volumeContainer');
    if (!container) return;

    // Dropdown initialisieren falls noch nicht geschehen
    populateVolumeMonthDropdown();

    // Alte Charts zerstören
    Object.values(volumeCharts).forEach(chart => chart.destroy());
    volumeCharts = {};

    // Ausgewählten Monat bestimmen
    const now = new Date();
    const year = selectedVolumeMonth ? selectedVolumeMonth.year : now.getFullYear();
    const month = selectedVolumeMonth ? selectedVolumeMonth.month : now.getMonth();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    // Alle Übungen sammeln (nur Gewichtstraining)
    const exerciseNames = [...new Set(
        trainings
            .filter(t => t.trainingType === 'weight' || !t.trainingType)
            .map(t => t.exercise)
    )].sort();

    if (exerciseNames.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Trainingsdaten vorhanden.</p>
            </div>
        `;
        return;
    }

    const weekDates = getWeekDatesForMonth(year, month);
    const monthDates = getMonthDates(year, month);

    // Für jede Übung das Volumen berechnen
    const volumeData = exerciseNames.map(exerciseName => {
        const allExerciseTrainings = trainings.filter(t =>
            t.exercise === exerciseName && (t.trainingType === 'weight' || !t.trainingType)
        );

        const weekTrainings = allExerciseTrainings.filter(t => {
            const date = new Date(t.date);
            return date >= weekDates.start && date <= weekDates.end;
        });

        const monthTrainings = allExerciseTrainings.filter(t => {
            const date = new Date(t.date);
            return date >= monthDates.start && date <= monthDates.end;
        });

        const weekReps = calculateTotalReps(weekTrainings);
        const monthReps = calculateTotalReps(monthTrainings);

        const weekTarget = getWeekTargetForExercise(exerciseName);
        const monthTarget = getMonthTargetForExercise(exerciseName, year, month);

        return {
            name: exerciseName,
            weekReps,
            monthReps,
            weekTarget,
            monthTarget,
            weekPercent: Math.round((weekReps / weekTarget) * 100),
            monthPercent: Math.round((monthReps / monthTarget) * 100)
        };
    });

    // Nur Übungen anzeigen, die Daten im Monat haben
    const activeExercises = volumeData.filter(v => v.monthReps > 0);

    if (activeExercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Trainings in diesem Monat.</p>
            </div>
        `;
        return;
    }

    const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long' });
    const weekLabel = isCurrentMonth ? 'Akt. Woche' : 'Letzte Woche';

    // HTML mit Canvas für jede Übung erstellen
    const exercisesHTML = activeExercises.map((exercise, index) => `
        <div class="volume-card">
            <div class="volume-card-header">${exercise.name}</div>
            <div class="volume-charts-row">
                <div class="volume-chart-container">
                    <canvas id="weekChart${index}"></canvas>
                    <div class="volume-chart-label">${weekLabel}</div>
                    <div class="volume-chart-reps">${exercise.weekReps} / ${exercise.weekTarget}</div>
                </div>
                <div class="volume-chart-container">
                    <canvas id="monthChart${index}"></canvas>
                    <div class="volume-chart-label">${monthName}</div>
                    <div class="volume-chart-reps">${exercise.monthReps} / ${exercise.monthTarget}</div>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="volume-cards">${exercisesHTML}</div>`;

    // Charts erstellen
    activeExercises.forEach((exercise, index) => {
        createVolumeChart(`weekChart${index}`, exercise.weekPercent, exercise.name + ' Woche');
        createVolumeChart(`monthChart${index}`, exercise.monthPercent, exercise.name + ' Monat');
    });
}

function createVolumeChart(canvasId, percent) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Farbe basierend auf Prozent
    let color;
    if (percent >= 105) {
        color = '#6bcf7f'; // Grün - Ziel übertroffen!
    } else if (percent >= 80) {
        color = '#ffd93d'; // Gelb - Fast am Ziel
    } else if (percent >= 50) {
        color = '#ff9f43'; // Orange - Auf dem Weg
    } else {
        color = '#ff6b6b'; // Rot - Noch weit weg
    }

    // Begrenze Anzeige auf 100% für den Kreis, zeige aber echten Wert
    const displayPercent = Math.min(percent, 100);
    const remaining = 100 - displayPercent;

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [displayPercent, remaining],
                backgroundColor: [color, '#e0e0e0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillStyle = color;
                ctx.fillText(percent + '%', centerX, centerY);
                ctx.restore();
            }
        }]
    });

    volumeCharts[canvasId] = chart;
}

// Für Kompatibilität mit sync.js
function populateTotalRepsExerciseDropdown() {
    displayTrainingVolume();
}

// ========================================
// PLAN ANALYSIS UI
// ========================================

let analysisChart = null;
let currentAnalysisDate = null;

/**
 * Initialisiert das Plan Analysis System
 */
function initPlanAnalysis() {
    if (typeof planAnalysis === 'undefined') {
        console.warn('PlanAnalysis nicht geladen');
        return;
    }

    // Cache leeren für frische Berechnung
    planAnalysis.clearCache();

    // Aktuellsten Trainingstag finden
    const dates = planAnalysis.getTrainingDates();
    currentAnalysisDate = dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0];

    // Event-Listener für Dropdown
    const dateSelect = document.getElementById('analysisDateSelect');
    if (dateSelect && !dateSelect.hasAttribute('data-listener-added')) {
        dateSelect.setAttribute('data-listener-added', 'true');
        dateSelect.addEventListener('change', function() {
            currentAnalysisDate = this.value;
            displayPlanAnalysis(currentAnalysisDate);
        });
    }

    // Initiale Anzeige
    displayPlanAnalysis(currentAnalysisDate);
}

/**
 * Befüllt das Datums-Dropdown für die Plan-Analyse
 */
function populateAnalysisDateDropdown() {
    const dateSelect = document.getElementById('analysisDateSelect');
    if (!dateSelect) return;

    const dates = planAnalysis.getTrainingDates();

    if (dates.length === 0) {
        dateSelect.innerHTML = '<option value="">Keine Trainings</option>';
        return;
    }

    dateSelect.innerHTML = dates.map(date => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        // Anzahl analysierter Übungen für diesen Tag
        const analysis = planAnalysis.analyzeDayTrainings(date);
        const exerciseCount = analysis.sessions.length;
        return `<option value="${date}">${formattedDate} (${exerciseCount} Übungen)</option>`;
    }).join('');

    // Aktuell ausgewähltes Datum setzen
    if (currentAnalysisDate && dates.includes(currentAnalysisDate)) {
        dateSelect.value = currentAnalysisDate;
    } else if (dates.length > 0) {
        currentAnalysisDate = dates[0];
        dateSelect.value = currentAnalysisDate;
    }
}

/**
 * Zeigt die Plan-Analyse für einen bestimmten Tag an
 * @param {string} date - ISO-Datum
 */
function displayPlanAnalysis(date) {
    const dateSelect = document.getElementById('analysisDateSelect');
    const summaryContainer = document.getElementById('analysisSummary');
    const listContainer = document.getElementById('exerciseAnalysisList');
    const chartContainer = document.getElementById('analysisChartContainer');

    if (!dateSelect || !summaryContainer || !listContainer) {
        console.warn('PlanAnalysis UI-Elemente nicht gefunden');
        return;
    }

    // Dropdown aktualisieren
    populateAnalysisDateDropdown();

    // Analyse abrufen
    const analysis = planAnalysis.analyzeDayTrainings(date);

    // Keine Trainings an diesem Tag
    if (analysis.sessions.length === 0) {
        summaryContainer.innerHTML = `
            <div class="analysis-empty">
                <p>Keine Trainings an diesem Tag</p>
            </div>
        `;
        listContainer.innerHTML = '';
        if (chartContainer) chartContainer.style.display = 'none';
        return;
    }

    // Zusammenfassung
    summaryContainer.innerHTML = `
        <div class="analysis-summary-grid">
            <div class="summary-card">
                <span class="summary-label">Ø Strength Index</span>
                <span class="summary-value ${getSIColorClass(analysis.avgStrengthIndex)}">${analysis.avgStrengthIndex}%</span>
            </div>
            <div class="summary-card">
                <span class="summary-label">Borg</span>
                <span class="summary-value">${analysis.borgValue !== null ? analysis.borgValue : '-'}</span>
            </div>
            <div class="summary-card">
                <span class="summary-label">Übungen</span>
                <span class="summary-value">${analysis.exerciseCount}</span>
            </div>
        </div>
    `;

    // Übungs-Analyse-Cards
    listContainer.innerHTML = analysis.sessions.map(session => createAnalysisCard(session)).join('');

    // Chart aktualisieren (wenn es Daten gibt)
    if (chartContainer && analysis.sessions.length > 0) {
        chartContainer.style.display = 'block';
        updateAnalysisChart(analysis.sessions[0].exercise);
    }
}

/**
 * Erstellt eine Analyse-Card für eine Übung
 * @param {Object} session - SessionAnalysis Objekt
 * @returns {string} HTML
 */
function createAnalysisCard(session) {
    const ampel = getAmpelEmoji(session.recommendation.status);
    const siColorClass = getSIColorClass(session.strengthIndex);
    const reserveColorClass = session.progressReserve >= 0 ? 'positive' : 'negative';

    // Wiederholungen formatieren
    const repsDisplay = session.actualReps.filter(r => r > 0).join(', ');

    return `
        <div class="analysis-card">
            <div class="analysis-card-header">
                <span class="ampel-status">${ampel}</span>
                <span class="exercise-name">${session.exercise}</span>
                <span class="rep-range-badge">${session.repRange}</span>
            </div>

            <div class="analysis-plan-ist">
                <div class="plan-row">
                    <span class="label">Plan:</span>
                    <span class="value">${session.plannedWeight} kg × 4×${session.plannedReps} = ${session.plannedTotalReps} Wdh</span>
                </div>
                <div class="ist-row">
                    <span class="label">Ist:</span>
                    <span class="value">${session.actualWeights[0]} kg × [${repsDisplay}] = ${session.actualTotalReps} Wdh</span>
                </div>
            </div>

            <div class="analysis-metrics-grid">
                <div class="metric-card">
                    <span class="metric-label">PFI</span>
                    <span class="metric-value">${(session.pfi * 100).toFixed(1)}%</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Strength Index</span>
                    <span class="metric-value ${siColorClass}">${session.strengthIndex}%</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Reserve</span>
                    <span class="metric-value ${reserveColorClass}">${session.progressReserve >= 0 ? '+' : ''}${session.progressReserve}%</span>
                </div>
            </div>

            <div class="analysis-recommendation ${session.recommendation.status}">
                <span class="recommendation-icon">${getRecommendationIcon(session.recommendation.status)}</span>
                <span class="recommendation-text">${session.recommendation.text}</span>
            </div>
        </div>
    `;
}

/**
 * Gibt das Ampel-Emoji basierend auf dem Status zurück
 * @param {string} status
 * @returns {string}
 */
function getAmpelEmoji(status) {
    switch (status) {
        case 'increase': return '✅';
        case 'hold': return '🟡';
        case 'observe': return '🟡';
        case 'fatigue': return '❌';
        default: return '🟡';
    }
}

/**
 * Gibt das Empfehlungs-Icon zurück
 * @param {string} status
 * @returns {string}
 */
function getRecommendationIcon(status) {
    switch (status) {
        case 'increase': return '📈';
        case 'hold': return '➡️';
        case 'observe': return '👀';
        case 'fatigue': return '⚠️';
        default: return '💡';
    }
}

/**
 * Gibt die CSS-Klasse für den Strength Index zurück
 * @param {number} si
 * @returns {string}
 */
function getSIColorClass(si) {
    if (si >= 105) return 'si-excellent';
    if (si >= 98) return 'si-good';
    if (si >= 97) return 'si-warning';
    return 'si-danger';
}

/**
 * Aktualisiert den Analyse-Chart für eine Übung
 * @param {string} exercise
 */
function updateAnalysisChart(exercise) {
    const canvas = document.getElementById('analysisChart');
    if (!canvas || typeof planAnalysis === 'undefined') return;

    const history = planAnalysis.getExerciseHistory(exercise, 10);

    if (history.length < 2) {
        canvas.parentElement.style.display = 'none';
        return;
    }

    canvas.parentElement.style.display = 'block';

    if (analysisChart) {
        analysisChart.destroy();
    }

    // Daten in chronologischer Reihenfolge (älteste zuerst)
    const sortedHistory = [...history].reverse();

    const labels = sortedHistory.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    });

    const siData = sortedHistory.map(h => h.strengthIndex);
    const pfiData = sortedHistory.map(h => h.pfi * 100);

    const ctx = canvas.getContext('2d');
    analysisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Strength Index (%)',
                    data: siData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'PFI (%)',
                    data: pfiData,
                    borderColor: '#6bcf7f',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5],
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                annotation: {
                    annotations: {
                        line100: {
                            type: 'line',
                            yMin: 100,
                            yMax: 100,
                            borderColor: 'rgba(255, 107, 107, 0.5)',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                display: true,
                                content: '100%',
                                position: 'end'
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: 80,
                    max: 120,
                    title: {
                        display: true,
                        text: 'Prozent (%)'
                    }
                }
            }
        }
    });
}

// Legacy-Funktionen für Kompatibilität
function initStrengthIndex() {
    initPlanAnalysis();
}

function populateStrengthExerciseDropdown() {
    // Nicht mehr benötigt
}

function displayStrengthIndex(exercise) {
    // Nicht mehr benötigt
}

function updateStrengthChart(exercise) {
    updateAnalysisChart(exercise);
}

// ========================================
// CHARTS
// ========================================

let bodyWeightChart = null;
let personalRecordsChart = null;
let borgValueChart = null;

function updateBodyWeightChart() {
    const canvas = document.getElementById('bodyWeightChart');
    if (!canvas) return;

    if (bodyWeights.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Noch keine Körpergewicht-Daten vorhanden</p>';
        return;
    }

    // Daten sortieren nach Datum
    const sortedWeights = [...bodyWeights].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sortedWeights.map(w => {
        const date = new Date(w.date);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    });

    const data = sortedWeights.map(w => w.weight);

    // Zielgewicht laden
    const targetWeight = personalInfo.targetWeight;

    // Berechne sinnvollen Y-Achsen-Bereich (±3 kg vom Min/Max, auf ganze kg gerundet)
    const minWeight = Math.min(...data, targetWeight || Infinity);
    const maxWeight = Math.max(...data, targetWeight || -Infinity);
    const padding = 3; // kg Puffer oben und unten
    const yMin = Math.floor(minWeight - padding);
    const yMax = Math.ceil(maxWeight + padding);

    if (bodyWeightChart) {
        bodyWeightChart.destroy();
    }

    // Datasets vorbereiten
    const datasets = [{
        label: 'Körpergewicht (kg)',
        data: data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
    }];

    // Zielgewicht als rote Linie hinzufügen (falls vorhanden)
    if (targetWeight) {
        datasets.push({
            label: 'Zielgewicht (kg)',
            data: new Array(labels.length).fill(targetWeight),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderDash: [5, 5],
            tension: 0,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 2
        });
    }

    const ctx = canvas.getContext('2d');
    bodyWeightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Formatiere Gewicht mit einer Nachkommastelle und Komma
                            const weight = context.parsed.y.toFixed(1).replace('.', ',');
                            return 'Körpergewicht: ' + weight + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: yMin,
                    max: yMax,
                    ticks: {
                        stepSize: 1, // 1 kg Schritte für bessere Lesbarkeit
                        callback: function(value) {
                            // Formatiere Y-Achsen-Werte mit einer Nachkommastelle
                            return value.toFixed(1).replace('.', ',') + ' kg';
                        }
                    }
                }
            }
        }
    });
}

function updatePersonalRecordsChart() {
    const canvas = document.getElementById('personalRecordsChart');
    if (!canvas) return;

    // Big 3 Übungen filtern
    const exercises = {
        'Kniebeugen Front': ['kniebeugen front', 'front kniebeugen', 'frontkniebeugen', 'front squat'],
        'Bankdrücken': ['bankdrücken', 'bench press', 'benchpress'],
        'Kreuzheben': ['kreuzheben', 'deadlift']
    };

    const datasets = [];

    Object.keys(exercises).forEach((exerciseName, index) => {
        const names = exercises[exerciseName];
        const exerciseTrainings = trainings.filter(t => {
            const tName = t.exercise.toLowerCase().trim();
            return t.trainingType === 'weight' && names.some(name => tName.includes(name));
        });

        if (exerciseTrainings.length > 0) {
            // Nach Datum sortieren
            const sorted = exerciseTrainings.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Max Gewicht pro Training tracken
            const dataPoints = sorted.map(t => ({
                x: t.date,
                y: t.weight
            }));

            const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];

            datasets.push({
                label: exerciseName,
                data: dataPoints,
                borderColor: colors[index],
                backgroundColor: colors[index] + '40',
                tension: 0.4
            });
        }
    });

    if (datasets.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Noch keine PR-Daten für die Big 3 vorhanden</p>';
        return;
    }

    if (personalRecordsChart) {
        personalRecordsChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    personalRecordsChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd.MM'
                        }
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Gewicht (kg)'
                    }
                }
            }
        }
    });
}

function updateBorgValueChart() {
    const canvas = document.getElementById('borgValueChart');
    if (!canvas) return;

    if (dailyBorgValues.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Noch keine Borg-Werte vorhanden</p>';
        return;
    }

    // Berechne monatliche Durchschnitte
    const monthlyData = {};

    dailyBorgValues.forEach(entry => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { sum: 0, count: 0 };
        }

        monthlyData[monthKey].sum += entry.borgValue;
        monthlyData[monthKey].count += 1;
    });

    // Sortiere nach Monat und berechne Durchschnitte
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    });

    const averages = sortedMonths.map(monthKey => {
        const data = monthlyData[monthKey];
        return (data.sum / data.count).toFixed(1);
    });

    if (borgValueChart) {
        borgValueChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    borgValueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Borg-Wert (Monatsdurchschnitt)',
                data: averages,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Durchschnitt: ${context.parsed.y}/10`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 10,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Borg-Wert (1-10)'
                    }
                }
            }
        }
    });
}

// ========================================
// TAB NAVIGATION
// ========================================

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        this.classList.add('active');

        const tabMap = {
            'history': 'historyTab',
            'plan': 'planTab',
            'records': 'recordsTab',
            'stats': 'statsTab',
            'settings': 'settingsTab'
        };

        const targetTab = document.getElementById(tabMap[tabName]);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Charts aktualisieren wenn Stats Tab geöffnet wird
        if (tabName === 'stats') {
            updateStatistics();
            updateBodyWeightChart();
            updatePersonalRecordsChart();
            updateBorgValueChart();
            displayTrainingVolume();
            initStrengthIndex();
        }

        // Personal Records aktualisieren
        if (tabName === 'records') {
            displayPersonalRecords();
        }

        // Gewichts-Merkhilfe anzeigen
        if (tabName === 'plan') {
            displayWeightNotes();
        }

        // Settings laden
        if (tabName === 'settings') {
            displayBodyWeightHistory();
            displayExerciseList();
        }
    });
});

// ========================================
// BENACHRICHTIGUNGEN
// ========================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .plan-comparison {
        display: flex;
        gap: 10px;
        margin: 10px 0;
        padding: 8px;
        background: rgba(102, 126, 234, 0.05);
        border-radius: 5px;
    }

    .comparison-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.85rem;
        padding: 4px 8px;
        border-radius: 4px;
    }

    .comparison-item.success {
        background: rgba(76, 175, 80, 0.1);
        color: #4caf50;
    }

    .comparison-item.warning {
        background: rgba(255, 152, 0, 0.1);
        color: #ff9800;
    }
`;
document.head.appendChild(style);

// ========================================
// LOGIN HANDLERS (für sync.js)
// ========================================

async function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Bitte E-Mail und Passwort eingeben');
        return;
    }

    // Modal bleibt offen bis Login erfolgreich ist
    await loginWithEmail(email, password);
}

async function handleEmailRegister() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Bitte E-Mail und Passwort eingeben');
        return;
    }

    // Modal bleibt offen bis Registrierung erfolgreich ist
    await registerWithEmail(email, password);
}

window.handleEmailLogin = handleEmailLogin;
window.handleEmailRegister = handleEmailRegister;

// Fallback showLoginModal Funktion (falls sync.js nicht lädt)
if (!window.showLoginModal) {
    window.showLoginModal = function() {
        console.log('Fallback showLoginModal wird aufgerufen');
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Login-Modal geöffnet (Fallback)');
        } else {
            console.error('Login-Modal nicht gefunden');
        }
    };
}

// Fallback hideLoginModal Funktion
if (!window.hideLoginModal) {
    window.hideLoginModal = function() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
}

// Display-Funktionen für sync.js exportieren
window.displayTrainings = displayTrainings;
window.displayPersonalRecords = displayPersonalRecords;
window.displayWeightNotes = displayWeightNotes;
window.displayBodyWeightHistory = displayBodyWeightHistory;
window.populateExerciseDropdown = populateExerciseDropdown;
window.displayExerciseList = displayExerciseList;
window.populateTotalRepsExerciseDropdown = populateTotalRepsExerciseDropdown;
window.initStrengthIndex = initStrengthIndex;
window.saveTargetWeight = saveTargetWeight;
window.updateBodyWeightChart = updateBodyWeightChart;

// ========================================
// APP INITIALISIERUNG
// ========================================

async function initApp() {
    setCurrentDate();
    generateRepsInputs(true); // true = Mit leeren Feldern starten
    populateExerciseDropdown();
    displayTrainings();
    displayPersonalRecords();

    // Gewichts-Merkhilfe initialisieren
    displayWeightNotes();

    displayBodyWeightHistory();
    displayExerciseList();
    loadTargetWeight(); // Zielgewicht laden
    updateStatistics();

    // Login Event Listener hinzufügen
    const emailLoginForm = document.getElementById('emailLoginForm');
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleEmailLogin();
        });
    }

    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleEmailRegister();
        });
    }

    // Event Listener für Modal-Close-Button
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.style.display = 'none';
                console.log('Login-Modal geschlossen');
            }
        });
        console.log('Modal-Close Event Listener hinzugefügt');
    }

    // Event Listener für Google-Login-Button
    const googleLoginButton = document.getElementById('googleLoginButton');
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Google-Login Button geklickt');
            if (typeof window.loginWithGoogle === 'function') {
                await window.loginWithGoogle();
            } else {
                console.error('loginWithGoogle Funktion nicht verfügbar - Firebase möglicherweise nicht geladen');
            }
        });
        console.log('Google-Login Event Listener hinzugefügt');
    }

    // Direkte Login-Modal-Funktion (Fallback wenn sync.js nicht geladen)
    function openLoginModal() {
        console.log('openLoginModal aufgerufen');
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Login-Modal geöffnet');
        } else {
            console.error('Login-Modal Element nicht gefunden');
        }
    }

    // Event Listener für initialen Login-Button
    const initialLoginButton = document.getElementById('loginButton');
    if (initialLoginButton) {
        initialLoginButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Initialer Login-Button geklickt');
            // Versuche zuerst die sync.js Funktion, dann Fallback
            if (typeof window.showLoginModal === 'function') {
                window.showLoginModal();
            } else {
                console.warn('window.showLoginModal nicht verfügbar, verwende Fallback');
                openLoginModal();
            }
        });
        console.log('Initialer Login-Button Event Listener hinzugefügt');
    } else {
        console.error('Login-Button Element nicht gefunden!');
    }

    // Event Listener für Manual Update Button
    const updateButton = document.getElementById('updateButton');
    if (updateButton) {
        updateButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Update-Button geklickt');
            if (typeof window.manualUpdateUI === 'function') {
                window.manualUpdateUI();
            } else {
                console.warn('manualUpdateUI Funktion nicht verfügbar');
                // Fallback: Update UI direkt
                displayTrainings();
                displayPersonalRecords();
                displayWeightNotes();
                displayBodyWeightHistory();
                populateExerciseDropdown();
                displayExerciseList();
            }
        });
        console.log('Update-Button Event Listener hinzugefügt');
    }

    // Event Delegation für Login/Logout-Buttons (funktioniert auch wenn Buttons dynamisch erstellt werden)
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.addEventListener('click', (e) => {
            console.log('UserInfo click event:', e.target);

            // Login-Button
            if (e.target.classList.contains('btn-login') || e.target.id === 'loginButton') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Login-Button geklickt (Event Delegation)');
                // Versuche zuerst die sync.js Funktion, dann Fallback
                if (typeof window.showLoginModal === 'function') {
                    window.showLoginModal();
                } else {
                    console.warn('window.showLoginModal nicht verfügbar, verwende Fallback');
                    openLoginModal();
                }
            }
            // Logout-Button
            if (e.target.classList.contains('btn-logout') || e.target.id === 'logoutButton') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Logout-Button geklickt');
                if (typeof window.logout === 'function') {
                    window.logout();
                } else {
                    console.error('logout Funktion nicht verfügbar');
                }
            }
        });
        console.log('Login/Logout Event Delegation hinzugefügt');
    } else {
        console.error('UserInfo Element nicht gefunden!');
    }

    // Sync initialisieren (mit Timeout, damit App nicht hängen bleibt)
    if (typeof initSync === 'function') {
        try {
            console.log('Starte Firebase-Synchronisation...');
            const syncTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sync-Timeout')), 10000)
            );
            await Promise.race([initSync(), syncTimeout]);
            console.log('Firebase-Synchronisation abgeschlossen');
        } catch (error) {
            console.warn('Sync konnte nicht initialisiert werden:', error.message);
            console.log('App läuft im Offline-Modus weiter');
        }
    }

    console.log('✅ App vollständig geladen und bereit!');
}

// App starten
initApp();
