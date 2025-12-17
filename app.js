// Trainingseinträge aus localStorage laden
let trainings = JSON.parse(localStorage.getItem('trainings')) || [];

// DOM Elemente
const form = document.getElementById('trainingForm');
const trainingList = document.getElementById('trainingList');
const currentDateElement = document.getElementById('currentDate');
const dateInput = document.getElementById('date');
const clearHistoryBtn = document.getElementById('clearHistory');
const searchInput = document.getElementById('searchExercise');
const sortSelect = document.getElementById('sortBy');

// Aktuelles Datum anzeigen und als Standard setzen
function setCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = today.toLocaleDateString('de-DE', options);

    // Datum-Input auf heute setzen
    const dateString = today.toISOString().split('T')[0];
    dateInput.value = dateString;
}

// Training hinzufügen
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const newTraining = {
        id: Date.now(),
        exercise: document.getElementById('exercise').value,
        weight: parseFloat(document.getElementById('weight').value),
        sets: parseInt(document.getElementById('sets').value),
        reps: parseInt(document.getElementById('reps').value),
        date: document.getElementById('date').value
    };

    trainings.push(newTraining);
    saveTrainings();
    displayTrainings();
    form.reset();
    setCurrentDate(); // Datum wieder auf heute setzen

    // Erfolgs-Feedback
    showNotification('Training erfolgreich hinzugefügt!');
});

// Trainings in localStorage speichern
function saveTrainings() {
    localStorage.setItem('trainings', JSON.stringify(trainings));
}

// Training löschen
function deleteTraining(id) {
    if (confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
        trainings = trainings.filter(training => training.id !== id);
        saveTrainings();
        displayTrainings();
        showNotification('Eintrag gelöscht!');
    }
}

// Alle Trainings löschen
clearHistoryBtn.addEventListener('click', function() {
    if (confirm('Möchtest du wirklich alle Einträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        trainings = [];
        saveTrainings();
        displayTrainings();
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

    trainingList.innerHTML = filteredTrainings.map(training => {
        const date = new Date(training.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

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
                    <div class="training-date">📅 ${formattedDate}</div>
                </div>
                <button class="delete-btn" onclick="deleteTraining(${training.id})">Löschen</button>
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

// Initialisierung
setCurrentDate();
displayTrainings();
