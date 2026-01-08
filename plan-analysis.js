/**
 * Plan-Analysis System
 *
 * Planbasiertes Auswertungssystem mit klaren Kennzahlen:
 * - PFI (Plan Fulfillment Index)
 * - Strength Index (planbasiert)
 * - Progress-Reserve
 * - Borg-adjustierter Effizienz-Score
 */

// ========================================
// TYPEN (JSDoc)
// ========================================

/**
 * @typedef {Object} SessionAnalysis
 * @property {string} exercise - Name der Übung
 * @property {string} date - ISO-Datum
 * @property {string} repRange - '3er' | '6er' | '10er'
 * @property {number} plannedWeight - Baseline-Gewicht aus Plan
 * @property {number} plannedReps - Ziel-Wiederholungen (3, 6 oder 10)
 * @property {number} plannedTotalReps - 4 × Ziel-Wdh
 * @property {number} planE1RM - Baseline × (1 + Ziel-Wdh/30)
 * @property {number[]} actualWeights - Gewichte pro Satz
 * @property {number[]} actualReps - Wiederholungen pro Satz
 * @property {number} actualTotalReps - Summe aller Wdh
 * @property {number[]} setE1RMs - e1RM pro Satz
 * @property {number} avgE1RM - Durchschnitt aller e1RMs
 * @property {number} pfi - Plan Fulfillment Index
 * @property {number} strengthIndex - Ist-e1RM / Plan-e1RM × 100
 * @property {number} progressReserve - Strength Index - 100
 * @property {number|null} borgValue - Borg-Wert des Tages
 * @property {number|null} efficiencyScore - progressReserve / borg
 * @property {Object} recommendation - Empfehlung
 */

/**
 * @typedef {Object} Recommendation
 * @property {'hold'|'observe'|'increase'|'fatigue'} status
 * @property {string} text
 * @property {number|null} suggestedWeight
 */

/**
 * @typedef {Object} DayAnalysis
 * @property {string} date
 * @property {SessionAnalysis[]} sessions
 * @property {number} avgStrengthIndex
 * @property {number|null} borgValue
 * @property {number} exerciseCount
 */

// ========================================
// KONSTANTEN
// ========================================

const SETS_PER_EXERCISE = 4;
const REP_TARGETS = { '3er': 3, '6er': 6, '10er': 10 };
const WEIGHT_TOLERANCE = 2.5; // ±2.5 kg Toleranz für Plan-Zuordnung

// Schwellenwerte für Empfehlungen
const SI_FATIGUE_THRESHOLD = 97;
const SI_HOLD_MIN = 98;
const SI_HOLD_MAX = 102;
const SI_OBSERVE_MAX = 105;
const SI_INCREASE_MIN = 105;
const PFI_INCREASE_MIN = 1.05;
const BORG_INCREASE_MAX = 7;

// ========================================
// HILFSFUNKTIONEN
// ========================================

/**
 * Berechnet den geschätzten 1RM (e1RM) mit der Epley-Formel
 * @param {number} weight - Gewicht in kg
 * @param {number} reps - Wiederholungen
 * @returns {number} Geschätzter 1RM
 */
function calculateE1RM(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Ermittelt den Wiederholungsbereich basierend auf dem Plan
 * @param {string} exercise - Name der Übung
 * @param {number} weight - Verwendetes Gewicht
 * @returns {{repRange: string, plannedWeight: number}|null}
 */
function getRepRangeFromPlan(exercise, weight) {
    if (typeof trainingPlans === 'undefined' || !trainingPlans) return null;

    const plan = trainingPlans.find(p => p.exercise === exercise);
    if (!plan) return null;

    // Prüfe jeden Bereich mit Toleranz
    if (plan.weight3Reps && Math.abs(weight - plan.weight3Reps) <= WEIGHT_TOLERANCE) {
        return { repRange: '3er', plannedWeight: plan.weight3Reps };
    }
    if (plan.weight6Reps && Math.abs(weight - plan.weight6Reps) <= WEIGHT_TOLERANCE) {
        return { repRange: '6er', plannedWeight: plan.weight6Reps };
    }
    if (plan.weight10Reps && Math.abs(weight - plan.weight10Reps) <= WEIGHT_TOLERANCE) {
        return { repRange: '10er', plannedWeight: plan.weight10Reps };
    }

    return null;
}

/**
 * Holt den Borg-Wert für ein bestimmtes Datum
 * @param {string} date - ISO-Datum
 * @returns {number|null}
 */
function getBorgForDate(date) {
    if (typeof dailyBorgValues === 'undefined' || !dailyBorgValues) return null;
    const entry = dailyBorgValues.find(b => b.date === date);
    return entry ? entry.borgValue : null;
}

/**
 * Rundet auf 0.1
 * @param {number} value
 * @returns {number}
 */
function round1(value) {
    return Math.round(value * 10) / 10;
}

// ========================================
// EMPFEHLUNGSLOGIK
// ========================================

/**
 * Generiert eine Empfehlung basierend auf den Kennzahlen
 * @param {number} strengthIndex
 * @param {number} pfi
 * @param {number|null} borg
 * @param {number} currentWeight
 * @returns {Recommendation}
 */
function getRecommendation(strengthIndex, pfi, borg, currentWeight) {
    // Ermüdung: SI < 97%
    if (strengthIndex < SI_FATIGUE_THRESHOLD) {
        return {
            status: 'fatigue',
            text: 'Ermüdung erkannt - Erholung prüfen',
            suggestedWeight: null
        };
    }

    // Gewicht erhöhen: SI ≥ 105%, PFI ≥ 1.05, Borg ≤ 7
    if (strengthIndex >= SI_INCREASE_MIN && pfi >= PFI_INCREASE_MIN && borg !== null && borg <= BORG_INCREASE_MAX) {
        const newWeight = Math.round((currentWeight + 2.5) * 2) / 2; // Auf 0.5 kg runden
        return {
            status: 'increase',
            text: `+2.5 kg → ${newWeight} kg`,
            suggestedWeight: newWeight
        };
    }

    // Beobachten: SI 102-105%
    if (strengthIndex > SI_HOLD_MAX && strengthIndex < SI_INCREASE_MIN) {
        return {
            status: 'observe',
            text: 'Beobachten',
            suggestedWeight: null
        };
    }

    // Halten: SI 98-102%
    if (strengthIndex >= SI_HOLD_MIN && strengthIndex <= SI_HOLD_MAX) {
        return {
            status: 'hold',
            text: 'Gewicht halten',
            suggestedWeight: null
        };
    }

    // Default: Beobachten
    return {
        status: 'observe',
        text: 'Beobachten',
        suggestedWeight: null
    };
}

// ========================================
// PLAN ANALYSIS KLASSE
// ========================================

class PlanAnalysis {
    constructor() {
        // Cache für berechnete Analysen
        this.analysisCache = new Map();
    }

    /**
     * Analysiert ein einzelnes Training
     * @param {Object} training - Training-Objekt aus trainings Array
     * @returns {SessionAnalysis|null}
     */
    analyzeTraining(training) {
        // Nur Gewichtstraining
        if (training.trainingType === 'time') return null;

        // Gewicht ermitteln (erstes Gewicht als Referenz)
        const primaryWeight = training.weightsPerSet
            ? training.weightsPerSet[0]
            : training.weight;

        if (!primaryWeight) return null;

        // Rep-Range aus Plan ermitteln
        const planInfo = getRepRangeFromPlan(training.exercise, primaryWeight);
        if (!planInfo) return null;

        const { repRange, plannedWeight } = planInfo;
        const targetReps = REP_TARGETS[repRange];

        // Tatsächliche Werte extrahieren
        const actualReps = Array.isArray(training.reps) ? training.reps.map(r => parseInt(r) || 0) : [parseInt(training.reps) || 0];
        const actualWeights = training.weightsPerSet
            ? training.weightsPerSet.map(w => parseFloat(w) || primaryWeight)
            : actualReps.map(() => primaryWeight);

        // Auf 4 Sätze normalisieren (falls weniger vorhanden)
        while (actualReps.length < SETS_PER_EXERCISE) {
            actualReps.push(0);
            actualWeights.push(primaryWeight);
        }

        // Berechne e1RM pro Satz
        const setE1RMs = actualReps.map((reps, i) => {
            if (reps <= 0) return 0;
            return calculateE1RM(actualWeights[i], reps);
        });

        // Nur Sätze mit Wiederholungen für Durchschnitt
        const validE1RMs = setE1RMs.filter(e => e > 0);
        const avgE1RM = validE1RMs.length > 0
            ? round1(validE1RMs.reduce((a, b) => a + b, 0) / validE1RMs.length)
            : 0;

        // Plan-e1RM berechnen
        const planE1RM = calculateE1RM(plannedWeight, targetReps);

        // Kennzahlen berechnen
        const actualTotalReps = actualReps.reduce((a, b) => a + b, 0);
        const plannedTotalReps = SETS_PER_EXERCISE * targetReps;

        const pfi = round1(actualTotalReps / plannedTotalReps);
        const strengthIndex = planE1RM > 0 ? round1((avgE1RM / planE1RM) * 100) : 0;
        const progressReserve = round1(strengthIndex - 100);

        // Borg-Wert holen
        const borgValue = getBorgForDate(training.date);
        const efficiencyScore = (borgValue && borgValue > 0)
            ? round1(progressReserve / borgValue)
            : null;

        // Empfehlung generieren
        const recommendation = getRecommendation(strengthIndex, pfi, borgValue, plannedWeight);

        return {
            exercise: training.exercise,
            date: training.date,
            repRange,
            plannedWeight,
            plannedReps: targetReps,
            plannedTotalReps,
            planE1RM,
            actualWeights: actualWeights.slice(0, SETS_PER_EXERCISE),
            actualReps: actualReps.slice(0, SETS_PER_EXERCISE),
            actualTotalReps,
            setE1RMs: setE1RMs.slice(0, SETS_PER_EXERCISE),
            avgE1RM,
            pfi,
            strengthIndex,
            progressReserve,
            borgValue,
            efficiencyScore,
            recommendation
        };
    }

    /**
     * Analysiert alle Trainings eines bestimmten Tages
     * @param {string} date - ISO-Datum
     * @returns {DayAnalysis}
     */
    analyzeDayTrainings(date) {
        // Cache prüfen
        if (this.analysisCache.has(date)) {
            return this.analysisCache.get(date);
        }

        if (typeof trainings === 'undefined' || !trainings) {
            return { date, sessions: [], avgStrengthIndex: 0, borgValue: null, exerciseCount: 0 };
        }

        // Trainings des Tages finden
        const dayTrainings = trainings.filter(t => t.date === date);

        // Analysieren
        const sessions = dayTrainings
            .map(t => this.analyzeTraining(t))
            .filter(s => s !== null);

        // Durchschnittlichen Strength Index berechnen
        const avgStrengthIndex = sessions.length > 0
            ? round1(sessions.reduce((sum, s) => sum + s.strengthIndex, 0) / sessions.length)
            : 0;

        const result = {
            date,
            sessions,
            avgStrengthIndex,
            borgValue: getBorgForDate(date),
            exerciseCount: sessions.length
        };

        // Cache speichern
        this.analysisCache.set(date, result);

        return result;
    }

    /**
     * Löscht den Cache (z.B. nach Datenänderungen)
     */
    clearCache() {
        this.analysisCache.clear();
    }

    /**
     * Gibt alle verfügbaren Trainingstage zurück (sortiert, neueste zuerst)
     * @returns {string[]}
     */
    getTrainingDates() {
        if (typeof trainings === 'undefined' || !trainings) return [];

        const dates = [...new Set(trainings.map(t => t.date))];
        return dates.sort((a, b) => new Date(b) - new Date(a));
    }

    /**
     * Gibt die Historie für eine Übung zurück
     * @param {string} exercise
     * @param {number} limit
     * @returns {SessionAnalysis[]}
     */
    getExerciseHistory(exercise, limit = 10) {
        if (typeof trainings === 'undefined' || !trainings) return [];

        // Alle Trainings dieser Übung
        const exerciseTrainings = trainings
            .filter(t => t.exercise === exercise && t.trainingType === 'weight')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        return exerciseTrainings
            .map(t => this.analyzeTraining(t))
            .filter(s => s !== null);
    }

    /**
     * Berechnet Gesamt-Statistiken über alle Übungen
     * @returns {Object}
     */
    getOverallStats() {
        const dates = this.getTrainingDates();
        if (dates.length === 0) return null;

        // Letzte 7 Trainingstage analysieren
        const recentDates = dates.slice(0, 7);
        const analyses = recentDates.map(d => this.analyzeDayTrainings(d));

        // Durchschnitte berechnen
        const allSessions = analyses.flatMap(a => a.sessions);
        if (allSessions.length === 0) return null;

        return {
            avgStrengthIndex: round1(allSessions.reduce((sum, s) => sum + s.strengthIndex, 0) / allSessions.length),
            avgPFI: round1(allSessions.reduce((sum, s) => sum + s.pfi, 0) / allSessions.length),
            totalSessions: allSessions.length,
            trainingDays: recentDates.length
        };
    }

    /**
     * Prüft ob für eine Übung ein Plan existiert
     * @param {string} exercise
     * @returns {boolean}
     */
    hasPlanForExercise(exercise) {
        if (typeof trainingPlans === 'undefined' || !trainingPlans) return false;
        const plan = trainingPlans.find(p => p.exercise === exercise);
        return plan && (plan.weight3Reps || plan.weight6Reps || plan.weight10Reps);
    }

    /**
     * Importiert Trainings und baut Cache neu auf
     * Wird nach Sync aufgerufen
     */
    rebuild() {
        this.clearCache();
        console.log('PlanAnalysis: Cache gelöscht, bereit für neue Analysen');
    }
}

// ========================================
// EXPORT
// ========================================

// Globale Instanz
const planAnalysis = new PlanAnalysis();

// Export für window
window.PlanAnalysis = PlanAnalysis;
window.planAnalysis = planAnalysis;
window.calculateE1RM = calculateE1RM;

console.log('PlanAnalysis System geladen');
