// Trainingseinträge aus localStorage laden
let trainings = JSON.parse(localStorage.getItem('trainings')) || [];

// Edit-Modus Tracking
let editMode = false;
let editingId = null;

// DOM Elemente
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

// Aktuelles Datum anzeigen und als Standard setzen
function setCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = today.toLocaleDateString('de-DE', options);

    // Datum-Input auf heute setzen
    const dateString = today.toISOString().split('T')[0];
    dateInput.value = dateString;
}

// Training hinzufügen oder bearbeiten
form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (editMode) {
        // Training bearbeiten
        const trainingIndex = trainings.findIndex(t => t.id === editingId);
        if (trainingIndex !== -1) {
            trainings[trainingIndex] = {
                id: editingId,
                exercise: document.getElementById('exercise').value,
                weight: parseFloat(document.getElementById('weight').value),
                sets: parseInt(document.getElementById('sets').value),
                reps: parseInt(document.getElementById('reps').value),
                date: document.getElementById('date').value
            };
            showNotification('Training erfolgreich aktualisiert!');
        }
        cancelEdit();
    } else {
        // Neues Training hinzufügen
        const newTraining = {
            id: Date.now(),
            exercise: document.getElementById('exercise').value,
            weight: parseFloat(document.getElementById('weight').value),
            sets: parseInt(document.getElementById('sets').value),
            reps: parseInt(document.getElementById('reps').value),
            date: document.getElementById('date').value
        };
        trainings.push(newTraining);
        showNotification('Training erfolgreich hinzugefügt!');
        form.reset();
        setCurrentDate();
    }

    saveTrainings();
    displayTrainings();
    displayPersonalRecords(); // PRs aktualisieren
});

// Trainings in localStorage speichern
function saveTrainings() {
    localStorage.setItem('trainings', JSON.stringify(trainings));
}

// Training bearbeiten
function editTraining(id) {
    const training = trainings.find(t => t.id === id);
    if (!training) return;

    // Wechsel in Edit-Modus
    editMode = true;
    editingId = id;

    // Formular mit Trainingsdaten füllen
    document.getElementById('exercise').value = training.exercise;
    document.getElementById('weight').value = training.weight;
    document.getElementById('sets').value = training.sets;
    document.getElementById('reps').value = training.reps;
    document.getElementById('date').value = training.date;

    // UI anpassen
    formTitle.textContent = 'Training bearbeiten ✏️';
    submitBtn.textContent = 'Änderungen speichern';
    cancelBtn.style.display = 'block';
    inputSection.classList.add('editing');

    // Zum Formular scrollen
    inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Bearbeitung abbrechen
function cancelEdit() {
    editMode = false;
    editingId = null;

    // Formular zurücksetzen
    form.reset();
    setCurrentDate();

    // UI zurücksetzen
    formTitle.textContent = 'Neues Training eintragen';
    submitBtn.textContent = 'Eintrag hinzufügen';
    cancelBtn.style.display = 'none';
    inputSection.classList.remove('editing');
}

// Event Listener für Abbrechen-Button
cancelBtn.addEventListener('click', cancelEdit);

// Training löschen
function deleteTraining(id) {
    if (confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
        trainings = trainings.filter(training => training.id !== id);
        saveTrainings();
        displayTrainings();
        displayPersonalRecords(); // PRs aktualisieren
        showNotification('Eintrag gelöscht!');
    }
}

// Alle Trainings löschen
clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Möchtest du wirklich alle Einträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        trainings = [];
        saveTrainings();
        displayTrainings();
        displayPersonalRecords(); // PRs aktualisieren
        showNotification('Alle Einträge gelöscht!');
    }
});

// Trainings anzeigen
function displayTrainings() {
    let filteredTrainings = [...trainings];

    // Filtern nach Suchbegriff
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredTrainings = filteredTrainings.filter(training =>
            training.exercise.toLowerCase().includes(searchTerm)
        );
    }

    // Sortieren
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

    // Sortierte Datumskeys erstellen
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (sortBy === 'date-asc') {
            return new Date(a) - new Date(b);
        }
        return new Date(b) - new Date(a);
    });

    // HTML für gruppierte Trainings erstellen
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
            return `
                <div class="training-item">
                    <div class="training-info">
                        <h3>${training.exercise}</h3>
                        <div class="training-details">
                            <div class="detail-item">
                                <div class="detail-label">Gewicht</div>
                                <div class="detail-value">${training.weight} kg</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Sätze</div>
                                <div class="detail-value">${training.sets}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Wdh.</div>
                                <div class="detail-value">${training.reps}</div>
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

// Benachrichtigung anzeigen
function showNotification(message) {
    // Einfaches Alert für Feedback (kann später erweitert werden)
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

// Event Listener für Filter und Sortierung
searchInput.addEventListener('input', displayTrainings);
sortSelect.addEventListener('change', displayTrainings);

// Animation für Benachrichtigungen
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
`;
document.head.appendChild(style);

// Tab-Wechsel Funktionalität
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        // Alle Tabs deaktivieren
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Aktiven Tab aktivieren
        this.classList.add('active');
        if (tabName === 'history') {
            document.getElementById('historyTab').classList.add('active');
        } else if (tabName === 'records') {
            document.getElementById('recordsTab').classList.add('active');
            displayPersonalRecords(); // PRs aktualisieren beim Tab-Wechsel
        }
    });
});

// Personal Records berechnen und anzeigen
function displayPersonalRecords() {
    // Die Big 3 Übungen mit verschiedenen Schreibweisen
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

    // Für jede Übung die Bestleistung finden
    Object.keys(exercises).forEach(exerciseName => {
        const exerciseData = exercises[exerciseName];

        // Alle Trainings für diese Übung finden
        const exerciseTrainings = trainings.filter(training => {
            const trainingName = training.exercise.toLowerCase().trim();
            return exerciseData.names.some(name => trainingName.includes(name));
        });

        if (exerciseTrainings.length > 0) {
            // Bestleistung (höchstes Gewicht) finden
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

    // Records anzeigen
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
                            ${record.sets} × ${record.reps}
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

// Initialisierung
setCurrentDate();
displayTrainings();
displayPersonalRecords();
