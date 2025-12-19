// ========================================
// DATA MANAGEMENT
// ========================================

// Trainingseinträge aus localStorage laden
let trainings = JSON.parse(localStorage.getItem('trainings')) || [];
let trainingPlans = JSON.parse(localStorage.getItem('trainingPlans')) || [];
let bodyWeights = JSON.parse(localStorage.getItem('bodyWeights')) || [];
let personalInfo = JSON.parse(localStorage.getItem('personalInfo')) || { age: null, height: null };

// Edit-Modus Tracking
let editMode = false;
let editingId = null;

// Training Type (weight or time)
let currentTrainingType = 'weight';

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

// Plan elements
const planForm = document.getElementById('planForm');
const planList = document.getElementById('planList');

// Settings elements
const bodyDataForm = document.getElementById('bodyDataForm');
const bodyWeightHistory = document.getElementById('bodyWeightHistory');
const personalInfoForm = document.getElementById('personalInfoForm');

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

function generateRepsInputs() {
    const numSets = parseInt(setsInput.value) || 3;
    repsInputsContainer.innerHTML = '';

    for (let i = 1; i <= numSets; i++) {
        const repInputGroup = document.createElement('div');
        repInputGroup.className = 'rep-input-group';

        repInputGroup.innerHTML = `
            <label for="rep${i}">Satz ${i}</label>
            <input type="number" id="rep${i}" min="1" placeholder="Wdh." required>
        `;

        repsInputsContainer.appendChild(repInputGroup);
    }
}

// Initial generieren
generateRepsInputs();

// ========================================
// TRAINING HINZUFÜGEN/BEARBEITEN
// ========================================

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const numSets = parseInt(setsInput.value);
    const reps = [];

    // Wiederholungen pro Satz sammeln
    for (let i = 1; i <= numSets; i++) {
        const repValue = parseInt(document.getElementById(`rep${i}`).value);
        reps.push(repValue);
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
                weight: currentTrainingType === 'weight' ? parseFloat(document.getElementById('weight').value) : null,
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
            weight: currentTrainingType === 'weight' ? parseFloat(document.getElementById('weight').value) : null,
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
        document.getElementById('weight').value = training.weight || '';
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

        const trainingsHTML = trainingsOfDay.map(training => {
            // Soll/Ist Vergleich mit Plan
            const plan = trainingPlans.find(p =>
                p.exercise.toLowerCase() === training.exercise.toLowerCase()
            );

            let planComparisonHTML = '';
            if (plan) {
                const actualSets = training.sets;
                const plannedSets = plan.sets;
                const avgReps = Math.round(training.reps.reduce((a, b) => a + b, 0) / training.reps.length);
                const plannedReps = plan.reps;

                const setsMatch = actualSets >= plannedSets;
                const repsMatch = avgReps >= plannedReps;

                let comparisonItems = '';

                // Gewichtsvergleich (nur wenn Plan ein Gewicht hat und Training gewichtsbasiert ist)
                if (plan.weight && training.trainingType === 'weight') {
                    const weightMatch = training.weight >= plan.weight;
                    comparisonItems += `
                        <div class="comparison-item ${weightMatch ? 'success' : 'warning'}">
                            <span>Gewicht: ${training.weight}/${plan.weight} kg</span>
                            ${weightMatch ? '✅' : '⚠️'}
                        </div>
                    `;
                }

                comparisonItems += `
                    <div class="comparison-item ${setsMatch ? 'success' : 'warning'}">
                        <span>Sätze: ${actualSets}/${plannedSets}</span>
                        ${setsMatch ? '✅' : '⚠️'}
                    </div>
                    <div class="comparison-item ${repsMatch ? 'success' : 'warning'}">
                        <span>Ø Wdh.: ${avgReps}/${plannedReps}</span>
                        ${repsMatch ? '✅' : '⚠️'}
                    </div>
                `;

                planComparisonHTML = `
                    <div class="plan-comparison">
                        ${comparisonItems}
                    </div>
                `;
            }

            // Reps anzeigen
            const repsDisplay = training.reps.join(', ');

            // Gewicht oder Zeit anzeigen
            let valueDisplay = '';
            if (training.trainingType === 'time') {
                const mins = training.timeMinutes || 0;
                const secs = training.timeSeconds || 0;
                valueDisplay = `${mins > 0 ? mins + ' min ' : ''}${secs} sek`;
            } else {
                valueDisplay = `${training.weight} kg`;
            }

            return `
                <div class="training-item">
                    <div class="training-info">
                        <h3>${training.exercise}</h3>
                        ${planComparisonHTML}
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
                return training.weight > max.weight ? training : max;
            });

            records[exerciseName] = {
                ...bestTraining,
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

        const repsDisplay = record.reps.join(' × ');

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

    const weightValue = document.getElementById('planWeight').value;

    const plan = {
        id: Date.now(),
        exercise: document.getElementById('planExercise').value,
        weight: weightValue ? parseFloat(weightValue) : null,
        sets: parseInt(document.getElementById('planSets').value),
        reps: parseInt(document.getElementById('planReps').value)
    };

    trainingPlans.push(plan);
    localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));

    // Zu Cloud synchronisieren
    if (typeof syncPlanToCloud === 'function') {
        await syncPlanToCloud(plan);
    }

    displayTrainingPlans();
    planForm.reset();
    showNotification('Plan hinzugefügt!');
});

function displayTrainingPlans() {
    if (trainingPlans.length === 0) {
        planList.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Trainingspläne erstellt.</p>
                <p>Füge deinen ersten Plan hinzu! 📋</p>
            </div>
        `;
        return;
    }

    planList.innerHTML = trainingPlans.map(plan => `
        <div class="plan-item">
            <div class="plan-info">
                <h3>${plan.exercise}</h3>
                <div class="plan-details">
                    ${plan.weight ? `<span><strong>Soll Gewicht:</strong> ${plan.weight} kg</span>` : ''}
                    <span><strong>Soll Sätze:</strong> ${plan.sets}</span>
                    <span><strong>Soll Wiederholungen:</strong> ${plan.reps}</span>
                </div>
            </div>
            <div class="plan-actions">
                <button class="delete-btn" onclick="deletePlan(${plan.id})">Löschen</button>
            </div>
        </div>
    `).join('');
}

async function deletePlan(id) {
    if (confirm('Plan löschen?')) {
        trainingPlans = trainingPlans.filter(p => p.id !== id);
        localStorage.setItem('trainingPlans', JSON.stringify(trainingPlans));

        // Aus Cloud löschen
        if (typeof deletePlanFromCloud === 'function') {
            await deletePlanFromCloud(id);
        }

        displayTrainingPlans();
        showNotification('Plan gelöscht!');
    }
}

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

    bodyWeightHistory.innerHTML = bodyWeights.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        return `
            <div class="body-weight-entry">
                <span class="date">${formattedDate}</span>
                <span class="weight">${entry.weight} kg</span>
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
// EINSTELLUNGEN - PERSÖNLICHE INFO
// ========================================

personalInfoForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    personalInfo.age = parseInt(document.getElementById('age').value) || null;
    personalInfo.height = parseInt(document.getElementById('height').value) || null;

    localStorage.setItem('personalInfo', JSON.stringify(personalInfo));

    // Zu Cloud synchronisieren
    if (typeof syncPersonalInfoToCloud === 'function') {
        await syncPersonalInfoToCloud(personalInfo);
    }

    showNotification('Persönliche Informationen gespeichert!');
});

function loadPersonalInfo() {
    if (personalInfo.age) {
        document.getElementById('age').value = personalInfo.age;
    }
    if (personalInfo.height) {
        document.getElementById('height').value = personalInfo.height;
    }
}

// ========================================
// STATISTIKEN
// ========================================

function updateStatistics() {
    // Trainings diesen Monat
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyCount = trainings.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    document.getElementById('monthlyTrainings').textContent = monthlyCount;

    // Durchschnitt pro Monat
    if (trainings.length > 0) {
        const dates = trainings.map(t => new Date(t.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                          (maxDate.getMonth() - minDate.getMonth()) + 1;

        const avgMonthly = Math.round(trainings.length / monthsDiff);
        document.getElementById('avgMonthlyTrainings').textContent = avgMonthly;
    } else {
        document.getElementById('avgMonthlyTrainings').textContent = 0;
    }

    // Gesamt Trainings
    document.getElementById('totalTrainings').textContent = trainings.length;
}

// ========================================
// CHARTS
// ========================================

let bodyWeightChart = null;
let personalRecordsChart = null;

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
                }
            },
            scales: {
                y: {
                    beginAtZero: false
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
            loadPersonalInfo();
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

function handleEmailLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    loginWithEmail(email, password);
    hideLoginModal();
}

function handleEmailRegister() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        showNotification('Bitte E-Mail und Passwort eingeben');
        return;
    }
    registerWithEmail(email, password);
    hideLoginModal();
}

window.handleEmailLogin = handleEmailLogin;
window.handleEmailRegister = handleEmailRegister;

// ========================================
// APP INITIALISIERUNG
// ========================================

async function initApp() {
    setCurrentDate();
    generateRepsInputs();
    displayTrainings();
    displayPersonalRecords();
    displayTrainingPlans();
    displayBodyWeightHistory();
    loadPersonalInfo();
    updateStatistics();

    // Sync initialisieren
    if (typeof initSync === 'function') {
        await initSync();
    }
}

// App starten
initApp();
