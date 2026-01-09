/**
 * Big 3 Plan-Auswertung
 *
 * Minimalistisches Auswertungssystem für die Big 3 Übungen:
 * - Front Squat / Kniebeugen
 * - Bankdrücken
 * - Kreuzheben
 *
 * Ampel-Status:
 * - UNDER_PLAN: Ziel nicht erreicht (minReps < targetReps)
 * - IN_PLAN: Ziel erreicht (alle Sätze == targetReps)
 * - OVER_PLAN: Deutlich übertroffen (mindestens ein Satz >= targetReps + 2)
 */

// ========================================
// KONSTANTEN
// ========================================

// Big 3 Übungen (nur diese werden ausgewertet)
const BIG_3_EXERCISES = [
    'Kreuzheben',
    'Kniebeugen',
    'Front Squat',
    'Bankdrücken',
    'Bench Press'
];

// Ziel-Wiederholungen je nach Trainingstag
const TARGET_REPS = {
    '3er': 3,
    '6er': 6,
    '10er': 10
};

// Status-Typen
const PlanStatus = {
    UNDER_PLAN: 'under_plan',
    IN_PLAN: 'in_plan',
    OVER_PLAN: 'over_plan'
};

// ========================================
// HILFSFUNKTIONEN
// ========================================

/**
 * Prüft ob eine Übung zu den Big 3 gehört
 * @param {string} exercise - Name der Übung
 * @returns {boolean}
 */
function isBig3Exercise(exercise) {
    if (!exercise) return false;
    const normalized = exercise.toLowerCase().trim();

    // Prüfe verschiedene Schreibweisen
    const matches = BIG_3_EXERCISES.some(big3 => {
        const big3Lower = big3.toLowerCase();
        return normalized.includes(big3Lower) ||
               big3Lower.includes(normalized) ||
               normalized === big3Lower;
    });

    return matches;
}

/**
 * Ermittelt die Ziel-Wiederholungen basierend auf dem Trainingsplan
 * @param {string} exercise - Name der Übung
 * @param {number} weight - Verwendetes Gewicht
 * @returns {number|null} - Ziel-Wiederholungen (10, 6, oder 3) oder null wenn kein Plan gefunden
 */
function getTargetRepsFromPlan(exercise, weight) {
    if (typeof trainingPlans === 'undefined' || !trainingPlans || !Array.isArray(trainingPlans)) {
        return null;
    }

    // Suche nach passendem Plan für diese Übung
    const plan = trainingPlans.find(p => p.exercise === exercise);
    if (!plan) return null;

    // Prüfe welchem Wiederholungsbereich das Gewicht entspricht (±2.5kg Toleranz)
    if (plan.weight10 && Math.abs(weight - plan.weight10) <= 2.5) {
        return 10;
    }
    if (plan.weight6 && Math.abs(weight - plan.weight6) <= 2.5) {
        return 6;
    }
    if (plan.weight3 && Math.abs(weight - plan.weight3) <= 2.5) {
        return 3;
    }

    return null;
}

/**
 * Ermittelt automatisch den Wiederholungsbereich
 * @param {number[]} reps - Array der Wiederholungen
 * @returns {string} - '3er', '6er' oder '10er'
 */
function detectRepRange(reps) {
    if (!Array.isArray(reps) || reps.length === 0) return '10er';

    const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;

    if (avgReps <= 4) return '3er';
    if (avgReps <= 7) return '6er';
    return '10er';
}

// ========================================
// HAUPTLOGIK: ÜBUNGS-AUSWERTUNG
// ========================================

/**
 * @typedef {Object} ExerciseEvaluation
 * @property {string} exercise - Name der Übung
 * @property {string} date - Trainingsdatum
 * @property {number} weight - Verwendetes Gewicht
 * @property {number[]} reps - Wiederholungen pro Satz
 * @property {number} targetReps - Ziel-Wiederholungen
 * @property {number} minReps - Minimum der Wiederholungen
 * @property {number} maxReps - Maximum der Wiederholungen
 * @property {string} status - 'under_plan' | 'in_plan' | 'over_plan'
 * @property {boolean} increaseWeight - Soll Gewicht erhöht werden?
 * @property {string} statusText - Deutsche Beschreibung
 * @property {string} recommendation - Empfehlung für nächstes Training
 */

/**
 * Wertet ein einzelnes Training aus
 * @param {Object} training - Training-Objekt
 * @returns {ExerciseEvaluation|null}
 */
function evaluateExercise(training) {
    // Nur Big 3 auswerten
    if (!isBig3Exercise(training.exercise)) {
        return null;
    }

    // Nur Gewichtstraining
    if (training.trainingType === 'time') {
        return null;
    }

    // Gewicht ermitteln
    const weight = training.weightsPerSet
        ? training.weightsPerSet[0]
        : training.weight;

    if (!weight || weight <= 0) {
        return null;
    }

    // Wiederholungen als Array
    const reps = Array.isArray(training.reps)
        ? training.reps.map(r => parseInt(r) || 0).filter(r => r > 0)
        : [parseInt(training.reps) || 0].filter(r => r > 0);

    if (reps.length === 0) {
        return null;
    }

    // Ziel-Wiederholungen ermitteln
    let targetReps = getTargetRepsFromPlan(training.exercise, weight);

    // Falls kein Plan vorhanden, automatisch erkennen
    if (targetReps === null) {
        const repRange = detectRepRange(reps);
        targetReps = TARGET_REPS[repRange];
    }

    // Statistiken berechnen
    const minReps = Math.min(...reps);
    const maxReps = Math.max(...reps);
    const allSetsOnTarget = reps.every(r => r === targetReps);

    // Status bestimmen
    let status;
    let increaseWeight = false;
    let statusText;
    let recommendation;

    if (minReps < targetReps) {
        // UNDER_PLAN: Mindestens ein Satz unter Ziel
        status = PlanStatus.UNDER_PLAN;
        statusText = 'Unter Plan';
        recommendation = `Ziel: ${targetReps} Wdh. pro Satz erreichen`;
    } else if (maxReps >= targetReps + 2) {
        // OVER_PLAN: Mindestens ein Satz deutlich über Ziel (≥ targetReps + 2)
        status = PlanStatus.OVER_PLAN;
        increaseWeight = true;
        statusText = 'Über Plan';
        recommendation = `Gewicht erhöhen! (aktuell ${weight}kg → ${weight + 2.5}kg)`;
    } else {
        // IN_PLAN: Alle Sätze im Zielbereich
        status = PlanStatus.IN_PLAN;
        statusText = 'Im Plan';
        recommendation = 'Gewicht beibehalten';
    }

    return {
        exercise: training.exercise,
        date: training.date,
        weight: weight,
        reps: reps,
        targetReps: targetReps,
        minReps: minReps,
        maxReps: maxReps,
        status: status,
        increaseWeight: increaseWeight,
        statusText: statusText,
        recommendation: recommendation
    };
}

/**
 * Wertet alle Trainings eines Tages aus
 * @param {string} date - ISO-Datum
 * @returns {Object} - { date, evaluations: ExerciseEvaluation[], summary }
 */
function evaluateDay(date) {
    if (typeof trainings === 'undefined' || !trainings) {
        return { date, evaluations: [], summary: null };
    }

    // Trainings des Tages
    const dayTrainings = trainings.filter(t => t.date === date);

    // Nur Big 3 auswerten
    const evaluations = dayTrainings
        .map(t => evaluateExercise(t))
        .filter(e => e !== null);

    // Zusammenfassung
    let summary = null;
    if (evaluations.length > 0) {
        const underPlan = evaluations.filter(e => e.status === PlanStatus.UNDER_PLAN).length;
        const inPlan = evaluations.filter(e => e.status === PlanStatus.IN_PLAN).length;
        const overPlan = evaluations.filter(e => e.status === PlanStatus.OVER_PLAN).length;
        const shouldIncrease = evaluations.filter(e => e.increaseWeight).length;

        summary = {
            total: evaluations.length,
            underPlan,
            inPlan,
            overPlan,
            shouldIncrease,
            overallStatus: underPlan > 0 ? PlanStatus.UNDER_PLAN :
                          overPlan > 0 ? PlanStatus.OVER_PLAN : PlanStatus.IN_PLAN
        };
    }

    return { date, evaluations, summary };
}

/**
 * Gibt alle Trainingstage mit Big 3 Übungen zurück
 * @returns {string[]} - Sortierte ISO-Daten (neueste zuerst)
 */
function getBig3TrainingDates() {
    if (typeof trainings === 'undefined' || !trainings) return [];

    const big3Trainings = trainings.filter(t =>
        isBig3Exercise(t.exercise) &&
        t.trainingType !== 'time'
    );

    const dates = [...new Set(big3Trainings.map(t => t.date))];
    return dates.sort((a, b) => new Date(b) - new Date(a));
}

/**
 * Holt die letzten Auswertungen für eine bestimmte Übung
 * @param {string} exercise - Name der Übung
 * @param {number} limit - Max. Anzahl
 * @returns {ExerciseEvaluation[]}
 */
function getExerciseHistory(exercise, limit = 5) {
    if (typeof trainings === 'undefined' || !trainings) return [];

    const exerciseTrainings = trainings
        .filter(t => t.exercise === exercise && t.trainingType !== 'time')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

    return exerciseTrainings
        .map(t => evaluateExercise(t))
        .filter(e => e !== null);
}

// ========================================
// UI RENDERING
// ========================================

/**
 * Rendert die Plan-Analyse im Auswertung-Tab
 */
function renderPlanAnalysis() {
    const summaryContainer = document.getElementById('analysisSummary');
    const listContainer = document.getElementById('exerciseAnalysisList');
    const dateSelect = document.getElementById('analysisDateSelect');

    if (!summaryContainer || !listContainer || !dateSelect) {
        console.warn('Plan-Analyse Container nicht gefunden');
        return;
    }

    // Debug: Prüfe ob trainings verfügbar sind
    console.log('renderPlanAnalysis: trainings vorhanden?', typeof trainings !== 'undefined' && trainings ? trainings.length : 0);

    if (typeof trainings !== 'undefined' && trainings && trainings.length > 0) {
        // Zeige alle Übungen zum Debugging
        const allExercises = [...new Set(trainings.map(t => t.exercise))];
        console.log('Alle Übungen in trainings:', allExercises);
        console.log('Big 3 Check für jede Übung:', allExercises.map(e => ({ exercise: e, isBig3: isBig3Exercise(e) })));
    }

    // Datum-Dropdown befüllen
    const dates = getBig3TrainingDates();

    if (dates.length === 0) {
        summaryContainer.innerHTML = '<p class="no-data">Noch keine Big 3 Trainings vorhanden.</p>';
        listContainer.innerHTML = '';
        dateSelect.innerHTML = '<option value="">Keine Daten</option>';
        return;
    }

    // Aktuelle Auswahl oder neuestes Datum
    const currentSelection = dateSelect.value || dates[0];

    dateSelect.innerHTML = dates.map(date => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('de-DE', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        return `<option value="${date}" ${date === currentSelection ? 'selected' : ''}>${formattedDate}</option>`;
    }).join('');

    // Auswertung für ausgewähltes Datum
    const dayEvaluation = evaluateDay(currentSelection);

    // Zusammenfassung rendern
    if (dayEvaluation.summary) {
        const s = dayEvaluation.summary;
        summaryContainer.innerHTML = `
            <div class="analysis-summary-cards">
                <div class="summary-card ${s.underPlan > 0 ? 'warning' : ''}">
                    <span class="summary-icon">⬇️</span>
                    <span class="summary-value">${s.underPlan}</span>
                    <span class="summary-label">Unter Plan</span>
                </div>
                <div class="summary-card ${s.inPlan > 0 ? 'success' : ''}">
                    <span class="summary-icon">✅</span>
                    <span class="summary-value">${s.inPlan}</span>
                    <span class="summary-label">Im Plan</span>
                </div>
                <div class="summary-card ${s.overPlan > 0 ? 'highlight' : ''}">
                    <span class="summary-icon">⬆️</span>
                    <span class="summary-value">${s.overPlan}</span>
                    <span class="summary-label">Über Plan</span>
                </div>
            </div>
        `;
    } else {
        summaryContainer.innerHTML = '<p class="no-data">Keine Big 3 Übungen an diesem Tag.</p>';
    }

    // Einzelne Übungen rendern
    if (dayEvaluation.evaluations.length > 0) {
        listContainer.innerHTML = dayEvaluation.evaluations.map(e => `
            <div class="exercise-analysis-card status-${e.status}">
                <div class="exercise-header">
                    <h4>${e.exercise}</h4>
                    <span class="status-badge ${e.status}">${e.statusText}</span>
                </div>
                <div class="exercise-details">
                    <div class="detail-row">
                        <span class="detail-label">Gewicht:</span>
                        <span class="detail-value">${e.weight} kg</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Wiederholungen:</span>
                        <span class="detail-value">${e.reps.join(' / ')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ziel:</span>
                        <span class="detail-value">${e.targetReps} Wdh. pro Satz</span>
                    </div>
                    ${e.increaseWeight ? `
                    <div class="recommendation highlight">
                        <span class="rec-icon">💪</span>
                        <span class="rec-text">${e.recommendation}</span>
                    </div>
                    ` : `
                    <div class="recommendation">
                        <span class="rec-icon">📋</span>
                        <span class="rec-text">${e.recommendation}</span>
                    </div>
                    `}
                </div>
            </div>
        `).join('');
    } else {
        listContainer.innerHTML = '<p class="no-data">Keine Big 3 Übungen an diesem Tag trainiert.</p>';
    }
}

/**
 * Initialisiert Event-Listener für die Plan-Analyse
 */
function initPlanAnalysis() {
    const dateSelect = document.getElementById('analysisDateSelect');

    if (dateSelect && !dateSelect.hasAttribute('data-listener-added')) {
        dateSelect.setAttribute('data-listener-added', 'true');
        dateSelect.addEventListener('change', function() {
            renderPlanAnalysis();
        });
    }

    // Initial rendern
    renderPlanAnalysis();
}

// ========================================
// EXPORT
// ========================================

// Globale Funktionen für window
window.evaluateExercise = evaluateExercise;
window.evaluateDay = evaluateDay;
window.getBig3TrainingDates = getBig3TrainingDates;
window.getExerciseHistory = getExerciseHistory;
window.renderPlanAnalysis = renderPlanAnalysis;
window.initPlanAnalysis = initPlanAnalysis;
window.isBig3Exercise = isBig3Exercise;
window.PlanStatus = PlanStatus;

// Alte Exporte für Kompatibilität entfernen, falls nicht mehr benötigt
// Die alte PlanAnalysis Klasse wird nicht mehr verwendet

console.log('Big 3 Plan-Auswertung geladen');
