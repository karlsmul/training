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
let trainingPlans = (JSON.parse(localStorage.getItem('trainingPlans')) || []).filter(plan =>
    plan.weight6Reps || plan.weight10Reps || plan.weight3Reps
);
let bodyWeights = (JSON.parse(localStorage.getItem('bodyWeights')) || []).sort((a, b) => new Date(b.date) - new Date(a.date));
let dailyBorgValues = JSON.parse(localStorage.getItem('dailyBorgValues')) || [];
let personalInfo = JSON.parse(localStorage.getItem('personalInfo')) || { age: null, height: null };
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
    get trainingPlans() { return trainingPlans; },
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
const searchInput = document.getElementById('searchExercise');
const sortSelect = document.getElementById('sortBy');
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

// Plan elements
const planForm = document.getElementById('planForm');
const planList = document.getElementById('planList');

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

function generateRepsInputs() {
    const numSets = parseInt(setsInput.value) || 3;
    const useDifferentWeights = differentWeightsCheckbox.checked && currentTrainingType === 'weight';
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
    }
}

// Initial generieren
generateRepsInputs();

// ========================================
// ÜBUNGSVERWALTUNG
// ========================================

function populateExerciseDropdown() {
    if (!exerciseSelect) return;

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

    // Auch Plan Exercise Dropdown füllen
    const planExerciseSelect = document.getElementById('planExercise');
    if (planExerciseSelect) {
        const planCurrentValue = planExerciseSelect.value;
        planExerciseSelect.innerHTML = '<option value="">-- Übung auswählen --</option>';

        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            planExerciseSelect.appendChild(option);
        });

        if (planCurrentValue && exercises.includes(planCurrentValue)) {
            planExerciseSelect.value = planCurrentValue;
        }
    }
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
        generateRepsInputs();
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
    generateRepsInputs();

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

/**
 * Ermittelt den Wiederholungsbereich eines Trainings basierend auf dem Plan
 * @param {Object} training - Das Training
 * @returns {string|null} '3er' | '6er' | '10er' | null
 */
function getRepRangeType(training) {
    if (training.trainingType === 'time') return null;

    const plan = trainingPlans.find(p => p.exercise === training.exercise);
    if (!plan) return null;

    const weight = training.weightsPerSet ? training.weightsPerSet[0] : training.weight;
    if (!weight) return null;

    // Finde den passenden Wiederholungsbereich basierend auf dem Gewicht
    // Toleranz von ±2.5 kg für Rundungen
    const tolerance = 2.5;

    if (plan.weight3Reps && Math.abs(weight - plan.weight3Reps) <= tolerance) {
        return '3er';
    }
    if (plan.weight6Reps && Math.abs(weight - plan.weight6Reps) <= tolerance) {
        return '6er';
    }
    if (plan.weight10Reps && Math.abs(weight - plan.weight10Reps) <= tolerance) {
        return '10er';
    }

    return null;
}

/**
 * Prüft ob ein Training das Wiederholungsziel erreicht hat
 * @param {Object} training - Das Training
 * @returns {Object} { achieved: boolean, repRangeType: string|null, targetReps: number }
 */
function checkRepGoalAchieved(training) {
    if (training.trainingType === 'time') {
        return { achieved: false, repRangeType: null, targetReps: 0 };
    }

    const repRangeType = getRepRangeType(training);
    if (!repRangeType) {
        return { achieved: false, repRangeType: null, targetReps: 0 };
    }

    // Ziel-Wiederholungen pro Satz
    const targetReps = repRangeType === '3er' ? 3 : repRangeType === '6er' ? 6 : 10;

    // Prüfe ob alle Sätze das Ziel erreicht haben
    const repsArray = Array.isArray(training.reps) ? training.reps : [training.reps];
    const achieved = repsArray.every(rep => parseInt(rep) >= targetReps);

    return { achieved, repRangeType, targetReps };
}

function displayTrainings() {
    let filteredTrainings = [...trainings];

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredTrainings = filteredTrainings.filter(training =>
            training.exercise.toLowerCase().includes(searchTerm)
        );
    }

    const sortBy = sortSelect.value;
    filteredTrainings.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'exercise':
                return a.exercise.localeCompare(b.exercise);
            default:
                return 0;
        }
    });

    if (filteredTrainings.length === 0) {
        trainingList.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Trainingseinträge vorhanden.</p>
                <p>Füge dein erstes Training hinzu! 💪</p>
            </div>
        `;
        return;
    }

    // Trainings nach Datum gruppieren
    const groupedByDate = {};
    filteredTrainings.forEach(training => {
        if (!groupedByDate[training.date]) {
            groupedByDate[training.date] = [];
        }
        groupedByDate[training.date].push(training);
    });

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (sortBy === 'date-asc') {
            return new Date(a) - new Date(b);
        }
        return new Date(b) - new Date(a);
    });

    trainingList.innerHTML = sortedDates.map(date => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const trainingsOfDay = groupedByDate[date];

        // Borg-Wert für diesen Tag laden
        const dailyBorg = dailyBorgValues.find(b => b.date === date);
        const borgValue = dailyBorg ? dailyBorg.borgValue : null;
        const borgColor = borgValue ? (borgValue >= 7 ? '#6bcf7f' : borgValue >= 4 ? '#ffd93d' : '#ff6b6b') : '#999';

        const trainingsHTML = trainingsOfDay.map(training => {
            // Reps anzeigen (mit Sicherheitscheck)
            const repsDisplay = Array.isArray(training.reps)
                ? training.reps.join(', ')
                : training.reps || '0';

            // Summe der Wiederholungen berechnen
            const totalReps = Array.isArray(training.reps)
                ? training.reps.reduce((sum, rep) => sum + parseInt(rep || 0), 0)
                : parseInt(training.reps || 0);

            // Prüfe ob Wiederholungsziel erreicht
            const goalCheck = checkRepGoalAchieved(training);
            const achievedClass = goalCheck.achieved ? 'goal-achieved' : '';
            const repRangeBadge = goalCheck.repRangeType
                ? `<span class="rep-range-badge ${goalCheck.achieved ? 'achieved' : ''}">${goalCheck.repRangeType}</span>`
                : '';

            // Gewicht oder Zeit anzeigen
            let valueDisplay = '';
            if (training.trainingType === 'time') {
                const mins = training.timeMinutes || 0;
                const secs = training.timeSeconds || 0;
                valueDisplay = `${mins > 0 ? mins + ' min ' : ''}${secs} sek`;
            } else {
                // Check if individual weights per set exist
                if (training.weightsPerSet && training.weightsPerSet.length > 0) {
                    valueDisplay = training.weightsPerSet.join(' / ') + ' kg';
                } else {
                    valueDisplay = `${training.weight} kg`;
                }
            }

            return `
                <div class="training-item ${achievedClass}">
                    <div class="training-info">
                        <h3>${training.exercise} ${repRangeBadge}</h3>
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
                                <div class="detail-label">Wiederholungen</div>
                                <div class="detail-value">${repsDisplay}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Gesamt Wdh.</div>
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
                <div class="date-header">
                    <div class="date-icon">📅</div>
                    <h3 class="date-title">${formattedDate}</h3>
                    <div class="exercise-count">${trainingsOfDay.length} ${trainingsOfDay.length === 1 ? 'Übung' : 'Übungen'}</div>
                </div>
                <div class="borg-day-container">
                    <label>Wie war das Training heute?</label>
                    <div class="borg-day-input">
                        <input type="range" min="1" max="10" value="${borgValue || 5}"
                               onchange="saveDailyBorg('${date}', this.value)"
                               oninput="updateBorgDisplay('${date}', this.value)"
                               class="borg-slider">
                        <span class="borg-display" id="borg-${date}" style="color: ${borgColor}">
                            ${borgValue ? borgValue + '/10' : '?/10'}
                        </span>
                    </div>
                </div>
                <div class="date-trainings">
                    ${trainingsHTML}
                </div>
            </div>
        `;
    }).join('');
}

searchInput.addEventListener('input', displayTrainings);
sortSelect.addEventListener('change', displayTrainings);

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
// TRAININGSPLAN
// ========================================

planForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const exercise = document.getElementById('planExercise').value;
    const weight6Reps = parseFloat(document.getElementById('weight6Reps').value) || null;
    const weight10Reps = parseFloat(document.getElementById('weight10Reps').value) || null;
    const weight3Reps = parseFloat(document.getElementById('weight3Reps').value) || null;

    // Validierung: mindestens ein Gewicht muss angegeben sein
    if (!weight6Reps && !weight10Reps && !weight3Reps) {
        showNotification('⚠️ Bitte mindestens ein Gewicht eingeben!');
        return;
    }

    const existingPlanIndex = trainingPlans.findIndex(p => p.exercise === exercise);

    const plan = {
        id: existingPlanIndex !== -1 ? trainingPlans[existingPlanIndex].id : Date.now(),
        exercise: exercise,
        weight6Reps: weight6Reps,
        weight10Reps: weight10Reps,
        weight3Reps: weight3Reps
    };

    if (existingPlanIndex !== -1) {
        // Aktualisiere existierenden Plan
        trainingPlans[existingPlanIndex] = plan;
        showNotification('Gewichte aktualisiert!');
    } else {
        // Neuer Plan
        trainingPlans.push(plan);
        showNotification('Gewichte hinzugefügt!');
    }

    localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));

    // Zu Cloud synchronisieren
    if (typeof syncPlanToCloud === 'function') {
        await syncPlanToCloud(plan);
    }

    displayTrainingPlans();
    planForm.reset();
});

function displayTrainingPlans() {
    // Filtere ungültige Pläne (ohne jegliche Gewichte)
    const validPlans = trainingPlans.filter(plan =>
        plan.weight6Reps || plan.weight10Reps || plan.weight3Reps
    );

    if (validPlans.length === 0) {
        planList.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Gewichte gespeichert.</p>
                <p>Füge deine erste Gewichts-Referenz hinzu! 📋</p>
            </div>
        `;
        return;
    }

    planList.innerHTML = validPlans.map(plan => `
        <div class="plan-item">
            <div class="plan-info">
                <h3>${plan.exercise}</h3>
                <div class="weight-reference-table">
                    <div class="weight-ref-row">
                        <div class="weight-ref-label">6 Wiederholungen:</div>
                        <div class="weight-ref-value">${plan.weight6Reps ? plan.weight6Reps + ' kg' : '-'}</div>
                    </div>
                    <div class="weight-ref-row">
                        <div class="weight-ref-label">10 Wiederholungen:</div>
                        <div class="weight-ref-value">${plan.weight10Reps ? plan.weight10Reps + ' kg' : '-'}</div>
                    </div>
                    <div class="weight-ref-row">
                        <div class="weight-ref-label">3 Wiederholungen:</div>
                        <div class="weight-ref-value">${plan.weight3Reps ? plan.weight3Reps + ' kg' : '-'}</div>
                    </div>
                </div>
            </div>
            <div class="plan-actions">
                <button class="edit-btn" onclick="editPlan(${plan.id})">Bearbeiten</button>
                <button class="delete-btn" onclick="deletePlan(${plan.id})">Löschen</button>
            </div>
        </div>
    `).join('');
}

function editPlan(id) {
    const plan = trainingPlans.find(p => p.id === id);
    if (!plan) return;

    // Formular mit Daten füllen
    document.getElementById('planExercise').value = plan.exercise;
    document.getElementById('weight6Reps').value = plan.weight6Reps || '';
    document.getElementById('weight10Reps').value = plan.weight10Reps || '';
    document.getElementById('weight3Reps').value = plan.weight3Reps || '';

    // Scroll zum Formular
    document.getElementById('planForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deletePlan(id) {
    if (confirm('Gewichte für diese Übung löschen?')) {
        trainingPlans = trainingPlans.filter(p => p.id !== id);
        localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));

        // Aus Cloud löschen
        if (typeof deletePlanFromCloud === 'function') {
            await deletePlanFromCloud(id);
        }

        displayTrainingPlans();
        showNotification('Gewichte gelöscht!');
    }
}

// Globale Funktion für onclick-Handler
window.editPlan = editPlan;

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
// STRENGTH INDEX UI
// ========================================

let strengthChart = null;

/**
 * Initialisiert das Strength Index System mit bestehenden Trainingsdaten
 */
function initStrengthIndex() {
    if (typeof strengthIndex === 'undefined') {
        console.warn('Strength Index nicht geladen');
        return;
    }

    // Importiere bestehende Trainings
    strengthIndex.importFromTrainings(trainings);

    // Dropdown befüllen
    populateStrengthExerciseDropdown();

    // Event-Listener für Dropdown
    const dropdown = document.getElementById('strengthExercise');
    if (dropdown && !dropdown.hasAttribute('data-listener-added')) {
        dropdown.setAttribute('data-listener-added', 'true');
        dropdown.addEventListener('change', function() {
            displayStrengthIndex(this.value);
        });
    }
}

/**
 * Befüllt das Übungs-Dropdown für Strength Index
 */
function populateStrengthExerciseDropdown() {
    const dropdown = document.getElementById('strengthExercise');
    if (!dropdown || typeof strengthIndex === 'undefined') return;

    const exercises = strengthIndex.getExercises();
    const currentValue = dropdown.value;

    dropdown.innerHTML = '<option value="">Übung wählen...</option>' +
        exercises.map(ex => `<option value="${ex}" ${ex === currentValue ? 'selected' : ''}>${ex}</option>`).join('');
}

/**
 * Zeigt den Strength Index für eine Übung an
 * @param {string} exercise
 */
function displayStrengthIndex(exercise) {
    const statusContainer = document.getElementById('strengthStatusContainer');
    const recommendationContainer = document.getElementById('strengthRecommendation');

    if (!statusContainer || !recommendationContainer) return;

    if (!exercise) {
        statusContainer.innerHTML = '';
        recommendationContainer.innerHTML = '';
        if (strengthChart) {
            strengthChart.destroy();
            strengthChart = null;
        }
        return;
    }

    const status = strengthIndex.getStrengthStatus(exercise);
    const recommendation = strengthIndex.getTrainingRecommendation(exercise);

    if (!status) {
        statusContainer.innerHTML = '<div class="empty-state"><p>Keine Daten für diese Übung.</p></div>';
        recommendationContainer.innerHTML = '';
        return;
    }

    // Status-Anzeige
    const statusColors = {
        'improving': '#6bcf7f',
        'maintaining': '#ffd93d',
        'declining': '#ff6b6b',
        'peaking': '#00d4ff',
        'recovering': '#ff9f43'
    };

    const statusLabels = {
        'improving': '📈 Verbesserung',
        'maintaining': '➡️ Stabil',
        'declining': '📉 Rückgang',
        'peaking': '🔥 Peak-Form',
        'recovering': '🔄 Erholung'
    };

    const trendArrow = status.trend > 0.02 ? '↑' : status.trend < -0.02 ? '↓' : '→';
    const trendPercent = (status.trend * 100).toFixed(1);

    // Wöchentlicher Fortschritt
    const weeklyProgress = status.weeklyProgress;
    const weekProgressHTML = weeklyProgress ? `
        <div class="weekly-progress-section">
            <h4>Wochenziel (3er/6er/10er)</h4>
            <div class="weekly-progress-badges">
                <span class="week-badge ${weeklyProgress.has3er ? 'completed' : 'pending'}">3er ${weeklyProgress.has3er ? '✓' : '○'}</span>
                <span class="week-badge ${weeklyProgress.has6er ? 'completed' : 'pending'}">6er ${weeklyProgress.has6er ? '✓' : '○'}</span>
                <span class="week-badge ${weeklyProgress.has10er ? 'completed' : 'pending'}">10er ${weeklyProgress.has10er ? '✓' : '○'}</span>
            </div>
            <div class="weekly-progress-bar">
                <div class="progress-fill" style="width: ${(weeklyProgress.completedRanges / 3) * 100}%"></div>
            </div>
            <span class="weekly-progress-text">${weeklyProgress.completedRanges}/3 Bereiche diese Woche</span>
        </div>
    ` : '';

    statusContainer.innerHTML = `
        ${weekProgressHTML}
        <div class="strength-status-grid">
            <div class="strength-stat-card">
                <div class="strength-stat-label">Aktueller e1RM</div>
                <div class="strength-stat-value">${status.currentE1RM} <span class="unit">kg</span></div>
            </div>
            <div class="strength-stat-card">
                <div class="strength-stat-label">Strength Index</div>
                <div class="strength-stat-value">${status.strengthIndex}</div>
            </div>
            <div class="strength-stat-card">
                <div class="strength-stat-label">Trend</div>
                <div class="strength-stat-value trend-${status.trend > 0 ? 'up' : status.trend < 0 ? 'down' : 'stable'}">
                    ${trendArrow} ${trendPercent}%
                </div>
            </div>
            <div class="strength-stat-card">
                <div class="strength-stat-label">Readiness</div>
                <div class="strength-stat-value">${status.readinessScore}<span class="unit">%</span></div>
            </div>
        </div>
        <div class="strength-status-badge" style="background: ${statusColors[status.status]}20; border-color: ${statusColors[status.status]}">
            <span style="color: ${statusColors[status.status]}">${statusLabels[status.status]}</span>
        </div>
    `;

    // Empfehlung
    if (recommendation) {
        // Zeige Empfehlung für nächsten Rep-Range basierend auf Wochenfortschritt
        const nextRange = recommendation.nextRecommendedRange || '6er';
        const repRangeWeights = recommendation.repRangeWeights || {};

        recommendationContainer.innerHTML = `
            <div class="recommendation-card">
                <h4>💡 Trainingsempfehlung</h4>
                <p class="recommendation-text">${recommendation.recommendation}</p>

                <div class="next-training-highlight">
                    <span class="next-label">Nächstes Training:</span>
                    <span class="next-range-badge">${nextRange}</span>
                    <span class="next-weight">${recommendation.nextRangeWeight} kg × ${recommendation.nextRangeSets}×${recommendation.nextRangeReps}</span>
                </div>

                <div class="rep-range-weights-grid">
                    <div class="rep-range-weight-card ${nextRange === '3er' ? 'recommended' : ''} ${weeklyProgress && weeklyProgress.has3er ? 'completed' : ''}">
                        <span class="range-label">3er</span>
                        <span class="range-weight">${repRangeWeights['3er'] ? repRangeWeights['3er'].weight : recommendation.weights.heavy} kg</span>
                        <span class="range-detail">4×3 (90%)</span>
                    </div>
                    <div class="rep-range-weight-card ${nextRange === '6er' ? 'recommended' : ''} ${weeklyProgress && weeklyProgress.has6er ? 'completed' : ''}">
                        <span class="range-label">6er</span>
                        <span class="range-weight">${repRangeWeights['6er'] ? repRangeWeights['6er'].weight : recommendation.weights.target} kg</span>
                        <span class="range-detail">4×6 (80%)</span>
                    </div>
                    <div class="rep-range-weight-card ${nextRange === '10er' ? 'recommended' : ''} ${weeklyProgress && weeklyProgress.has10er ? 'completed' : ''}">
                        <span class="range-label">10er</span>
                        <span class="range-weight">${repRangeWeights['10er'] ? repRangeWeights['10er'].weight : recommendation.weights.light} kg</span>
                        <span class="range-detail">4×10 (70%)</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Chart aktualisieren
    updateStrengthChart(exercise);
}

/**
 * Aktualisiert den Strength Index Chart
 * @param {string} exercise
 */
function updateStrengthChart(exercise) {
    const canvas = document.getElementById('strengthChart');
    if (!canvas || typeof strengthIndex === 'undefined') return;

    const history = strengthIndex.getHistory(exercise);

    if (history.length < 2) {
        canvas.parentElement.style.display = 'none';
        return;
    }

    canvas.parentElement.style.display = 'block';

    if (strengthChart) {
        strengthChart.destroy();
    }

    const labels = history.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    });

    const strengthData = history.map(h => h.strengthIndex);
    const e1rmData = history.map(h => h.e1rm);

    const ctx = canvas.getContext('2d');
    strengthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Strength Index',
                    data: strengthData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'e1RM (kg)',
                    data: e1rmData,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
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
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Strength Index'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'e1RM (kg)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
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

    if (bodyWeightChart) {
        bodyWeightChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    bodyWeightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Körpergewicht (kg)',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
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
                            // Formatiere Gewicht mit zwei Nachkommastellen und Komma
                            const weight = context.parsed.y.toFixed(2).replace('.', ',');
                            return 'Körpergewicht: ' + weight + ' kg';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            // Formatiere Y-Achsen-Werte mit zwei Nachkommastellen und Komma
                            return value.toFixed(2).replace('.', ',') + ' kg';
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

        // Training Plans anzeigen
        if (tabName === 'plan') {
            displayTrainingPlans();
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
window.displayTrainingPlans = displayTrainingPlans;
window.displayBodyWeightHistory = displayBodyWeightHistory;
window.populateExerciseDropdown = populateExerciseDropdown;
window.displayExerciseList = displayExerciseList;
window.populateTotalRepsExerciseDropdown = populateTotalRepsExerciseDropdown;
window.initStrengthIndex = initStrengthIndex;

// ========================================
// APP INITIALISIERUNG
// ========================================

async function initApp() {
    setCurrentDate();
    generateRepsInputs();
    populateExerciseDropdown();
    displayTrainings();
    displayPersonalRecords();
    displayTrainingPlans();
    displayBodyWeightHistory();
    displayExerciseList();
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
                displayTrainingPlans();
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
