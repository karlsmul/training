/**
 * Strength Index System
 *
 * Misst reale Leistungsentwicklung unabhängig von Wiederholungen
 * durch e1RM-Berechnung, SessionScores und EMA-basiertem Strength-Index.
 */

// ========================================
// TYPEN (JSDoc)
// ========================================

/**
 * @typedef {Object} WorkoutSet
 * @property {string} exercise - Name der Übung
 * @property {number} weight - Gewicht in kg
 * @property {number} reps - Wiederholungen
 * @property {number} [rpe] - Rate of Perceived Exertion (6-10), optional
 * @property {string} date - ISO-Datum (YYYY-MM-DD)
 * @property {number} [timestamp] - Unix-Timestamp
 */

/**
 * @typedef {Object} SessionScore
 * @property {string} exercise - Name der Übung
 * @property {string} date - ISO-Datum
 * @property {number} e1rmMax - Höchster e1RM der Session
 * @property {number} e1rmAvg - Durchschnittlicher e1RM der Session
 * @property {number} volumeLoad - Gesamtvolumen (Gewicht × Wiederholungen)
 * @property {number} setCount - Anzahl der Sätze
 * @property {number} score - Kombinierter Session-Score
 */

/**
 * @typedef {Object} StrengthStatus
 * @property {string} exercise - Name der Übung
 * @property {number} currentE1RM - Aktueller geschätzter 1RM
 * @property {number} strengthIndex - EMA-basierter Strength-Index
 * @property {number} trend - Trend (-1 bis +1, negativ = Abnahme)
 * @property {string} status - 'improving' | 'maintaining' | 'declining' | 'peaking' | 'recovering'
 * @property {string} recommendation - Trainingsempfehlung
 * @property {number} readinessScore - Bereitschafts-Score (0-100)
 */

/**
 * @typedef {Object} StrengthHistory
 * @property {string} date - ISO-Datum
 * @property {number} strengthIndex - Strength-Index an diesem Tag
 * @property {number} e1rm - e1RM an diesem Tag
 */

// ========================================
// KONSTANTEN
// ========================================

const EMA_ALPHA_SHORT = 0.3;  // Schneller EMA (reagiert auf aktuelle Leistung)
const EMA_ALPHA_LONG = 0.1;   // Langsamer EMA (Langzeit-Trend)
const TREND_THRESHOLD = 0.02; // 2% Änderung für Trend-Erkennung
const RECOVERY_DAYS = 2;      // Minimale Erholungstage zwischen Sessions
const PEAK_THRESHOLD = 1.05;  // 5% über Langzeit-EMA = Peak

// ========================================
// E1RM FORMELN
// ========================================

/**
 * Berechnet den geschätzten 1RM (e1RM) mit der Epley-Formel
 * @param {number} weight - Gewicht in kg
 * @param {number} reps - Wiederholungen (1-30)
 * @param {number} [rpe] - RPE (6-10), optional für Anpassung
 * @returns {number} Geschätzter 1RM
 */
function calculateE1RM(weight, reps, rpe = null) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;

    // Epley-Formel: e1RM = weight × (1 + reps/30)
    let e1rm = weight * (1 + reps / 30);

    // RPE-Anpassung (falls vorhanden)
    // RPE 10 = maximale Anstrengung, keine Anpassung
    // RPE 8 = 2 Reps in Reserve → e1RM anpassen
    if (rpe !== null && rpe >= 6 && rpe <= 10) {
        const repsInReserve = 10 - rpe;
        const adjustedReps = reps + repsInReserve;
        e1rm = weight * (1 + adjustedReps / 30);
    }

    return Math.round(e1rm * 10) / 10; // Auf 0.1 kg runden
}

/**
 * Alternative e1RM-Berechnung mit Brzycki-Formel
 * Genauer für niedrige Wiederholungszahlen (1-10)
 * @param {number} weight
 * @param {number} reps
 * @returns {number}
 */
function calculateE1RM_Brzycki(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    if (reps > 12) {
        // Brzycki ist ungenau über 12 Reps, fallback zu Epley
        return calculateE1RM(weight, reps);
    }

    // Brzycki: e1RM = weight × 36 / (37 - reps)
    return Math.round((weight * 36 / (37 - reps)) * 10) / 10;
}

// ========================================
// STRENGTH INDEX KLASSE
// ========================================

class StrengthIndex {
    constructor() {
        // Speicher für alle Workout-Sets pro Übung
        /** @type {Map<string, WorkoutSet[]>} */
        this.workoutSets = new Map();

        // Session-Scores pro Übung
        /** @type {Map<string, SessionScore[]>} */
        this.sessionScores = new Map();

        // EMA-Werte pro Übung
        /** @type {Map<string, {short: number, long: number, history: StrengthHistory[]}>} */
        this.emaData = new Map();

        // Lade gespeicherte Daten
        this.loadFromStorage();
    }

    // ========================================
    // DATEN-MANAGEMENT
    // ========================================

    /**
     * Fügt ein Workout-Set hinzu und aktualisiert alle Berechnungen
     * @param {WorkoutSet} set
     */
    addWorkoutSet(set) {
        const exercise = set.exercise;

        // Set mit Timestamp versehen
        const enrichedSet = {
            ...set,
            timestamp: set.timestamp || new Date(set.date).getTime()
        };

        // Zum Speicher hinzufügen
        if (!this.workoutSets.has(exercise)) {
            this.workoutSets.set(exercise, []);
        }
        this.workoutSets.get(exercise).push(enrichedSet);

        // Session-Score neu berechnen
        this.calculateSessionScore(exercise, set.date);

        // EMA aktualisieren
        this.updateEMA(exercise);

        // Speichern
        this.saveToStorage();
    }

    /**
     * Fügt mehrere Sets auf einmal hinzu (z.B. aus bestehenden Trainings)
     * @param {WorkoutSet[]} sets
     */
    addWorkoutSets(sets) {
        // Gruppiere nach Übung und Datum
        const grouped = new Map();

        sets.forEach(set => {
            const exercise = set.exercise;
            if (!this.workoutSets.has(exercise)) {
                this.workoutSets.set(exercise, []);
            }

            const enrichedSet = {
                ...set,
                timestamp: set.timestamp || new Date(set.date).getTime()
            };
            this.workoutSets.get(exercise).push(enrichedSet);

            // Für Session-Score-Berechnung merken
            const key = `${exercise}|${set.date}`;
            if (!grouped.has(key)) {
                grouped.set(key, { exercise, date: set.date });
            }
        });

        // Session-Scores berechnen
        grouped.forEach(({ exercise, date }) => {
            this.calculateSessionScore(exercise, date);
        });

        // EMAs aktualisieren
        const exercises = [...new Set(sets.map(s => s.exercise))];
        exercises.forEach(exercise => this.updateEMA(exercise));

        this.saveToStorage();
    }

    /**
     * Importiert bestehende Trainings-Daten
     * @param {Array} trainings - Array von Training-Objekten aus app.js
     */
    importFromTrainings(trainings) {
        const sets = [];

        trainings.forEach(t => {
            // Nur Gewichtstraining
            if (t.trainingType === 'time') return;

            const repsArray = Array.isArray(t.reps) ? t.reps : [t.reps];
            const weightsArray = t.weightsPerSet || repsArray.map(() => t.weight);

            repsArray.forEach((reps, index) => {
                const weight = weightsArray[index] || t.weight;
                if (weight > 0 && reps > 0) {
                    sets.push({
                        exercise: t.exercise,
                        weight: parseFloat(weight),
                        reps: parseInt(reps),
                        date: t.date
                    });
                }
            });
        });

        // Bestehende Daten löschen und neu importieren
        this.workoutSets.clear();
        this.sessionScores.clear();
        this.emaData.clear();

        this.addWorkoutSets(sets);
    }

    // ========================================
    // SESSION-SCORE BERECHNUNG
    // ========================================

    /**
     * Berechnet den Session-Score für eine Übung an einem Tag
     * @param {string} exercise
     * @param {string} date
     */
    calculateSessionScore(exercise, date) {
        const sets = this.workoutSets.get(exercise) || [];
        const daySets = sets.filter(s => s.date === date);

        if (daySets.length === 0) return;

        // e1RM für jeden Satz berechnen
        const e1rms = daySets.map(s => calculateE1RM(s.weight, s.reps, s.rpe));

        // Session-Metriken
        const e1rmMax = Math.max(...e1rms);
        const e1rmAvg = e1rms.reduce((a, b) => a + b, 0) / e1rms.length;
        const volumeLoad = daySets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
        const setCount = daySets.length;

        // Kombinierter Score
        // Gewichtung: 60% Max e1RM, 25% Avg e1RM, 15% Volumen-Faktor
        const volumeFactor = Math.min(volumeLoad / (e1rmMax * 10), 2); // Normalisiert
        const score = (e1rmMax * 0.6) + (e1rmAvg * 0.25) + (e1rmMax * volumeFactor * 0.15);

        const sessionScore = {
            exercise,
            date,
            e1rmMax: Math.round(e1rmMax * 10) / 10,
            e1rmAvg: Math.round(e1rmAvg * 10) / 10,
            volumeLoad: Math.round(volumeLoad),
            setCount,
            score: Math.round(score * 10) / 10
        };

        // Speichern (ersetze existierenden Score für dieses Datum)
        if (!this.sessionScores.has(exercise)) {
            this.sessionScores.set(exercise, []);
        }

        const scores = this.sessionScores.get(exercise);
        const existingIndex = scores.findIndex(s => s.date === date);

        if (existingIndex >= 0) {
            scores[existingIndex] = sessionScore;
        } else {
            scores.push(sessionScore);
            // Nach Datum sortieren
            scores.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    }

    // ========================================
    // EMA BERECHNUNG
    // ========================================

    /**
     * Aktualisiert den EMA-Strength-Index für eine Übung
     * @param {string} exercise
     */
    updateEMA(exercise) {
        const scores = this.sessionScores.get(exercise) || [];

        if (scores.length === 0) return;

        // Initialisiere EMA-Daten falls nicht vorhanden
        if (!this.emaData.has(exercise)) {
            const firstScore = scores[0].score;
            this.emaData.set(exercise, {
                short: firstScore,
                long: firstScore,
                history: []
            });
        }

        const ema = this.emaData.get(exercise);

        // Berechne EMA für alle Sessions neu (für Konsistenz)
        let emaShort = scores[0].score;
        let emaLong = scores[0].score;

        const history = [];

        scores.forEach((session, index) => {
            if (index === 0) {
                history.push({
                    date: session.date,
                    strengthIndex: Math.round(emaShort * 10) / 10,
                    e1rm: session.e1rmMax
                });
                return;
            }

            // EMA-Formel: EMA_new = α × value + (1 - α) × EMA_old
            emaShort = EMA_ALPHA_SHORT * session.score + (1 - EMA_ALPHA_SHORT) * emaShort;
            emaLong = EMA_ALPHA_LONG * session.score + (1 - EMA_ALPHA_LONG) * emaLong;

            history.push({
                date: session.date,
                strengthIndex: Math.round(emaShort * 10) / 10,
                e1rm: session.e1rmMax
            });
        });

        ema.short = Math.round(emaShort * 10) / 10;
        ema.long = Math.round(emaLong * 10) / 10;
        ema.history = history;
    }

    // ========================================
    // STATUS & EMPFEHLUNGEN
    // ========================================

    /**
     * Ermittelt den aktuellen Strength-Status für eine Übung
     * @param {string} exercise
     * @returns {StrengthStatus | null}
     */
    getStrengthStatus(exercise) {
        const scores = this.sessionScores.get(exercise);
        const ema = this.emaData.get(exercise);

        if (!scores || scores.length === 0 || !ema) {
            return null;
        }

        const lastSession = scores[scores.length - 1];
        const currentE1RM = lastSession.e1rmMax;

        // Trend berechnen (Vergleich Short vs Long EMA)
        const trendRatio = ema.short / ema.long;
        const trend = Math.round((trendRatio - 1) * 100) / 100; // -1 bis +1 Bereich

        // Status bestimmen
        let status;
        let recommendation;
        let readinessScore;

        // Tage seit letzter Session
        const daysSinceLastSession = Math.floor(
            (Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Vergleich mit Langzeit-Durchschnitt
        const performanceRatio = ema.short / ema.long;

        if (performanceRatio >= PEAK_THRESHOLD) {
            // Peak: Deutlich über Langzeit-Level
            status = 'peaking';
            readinessScore = 95;
            recommendation = 'Du bist in Top-Form! Nutze diese Phase für neue PRs oder schwere Singles.';
        } else if (trend > TREND_THRESHOLD) {
            // Verbesserung
            status = 'improving';
            readinessScore = 85;
            recommendation = 'Gute Entwicklung! Bleib beim aktuellen Programm und steigere progressiv.';
        } else if (trend < -TREND_THRESHOLD) {
            // Rückgang
            status = 'declining';
            readinessScore = 50;

            if (daysSinceLastSession < RECOVERY_DAYS) {
                recommendation = 'Mögliche Ermüdung erkannt. Plane einen Deload oder mehr Erholung ein.';
            } else {
                recommendation = 'Leistungsrückgang festgestellt. Prüfe Schlaf, Ernährung und Stress.';
            }
        } else if (daysSinceLastSession >= 5) {
            // Lange Pause
            status = 'recovering';
            readinessScore = 70;
            recommendation = 'Längere Pause erkannt. Starte mit moderater Intensität (80-85% vom letzten Training).';
        } else {
            // Stabil
            status = 'maintaining';
            readinessScore = 75;
            recommendation = 'Stabile Leistung. Erwäge kleine Steigerungen oder Variation im Training.';
        }

        // Readiness anpassen basierend auf Erholung
        if (daysSinceLastSession < RECOVERY_DAYS && status !== 'peaking') {
            readinessScore = Math.max(40, readinessScore - 20);
            recommendation = `Nur ${daysSinceLastSession} Tag(e) seit dem letzten Training. ` + recommendation;
        }

        return {
            exercise,
            currentE1RM,
            strengthIndex: ema.short,
            trend,
            status,
            recommendation,
            readinessScore
        };
    }

    /**
     * Gibt Trainingsempfehlung mit konkreten Gewichten
     * @param {string} exercise
     * @returns {Object | null}
     */
    getTrainingRecommendation(exercise) {
        const status = this.getStrengthStatus(exercise);
        if (!status) return null;

        const e1rm = status.currentE1RM;

        // Empfohlene Intensitätszonen basierend auf Status
        let intensityRange;
        let repRange;
        let setRange;

        switch (status.status) {
            case 'peaking':
                intensityRange = { min: 0.90, max: 1.0 };
                repRange = { min: 1, max: 3 };
                setRange = { min: 3, max: 5 };
                break;
            case 'improving':
                intensityRange = { min: 0.75, max: 0.85 };
                repRange = { min: 4, max: 8 };
                setRange = { min: 3, max: 5 };
                break;
            case 'declining':
                intensityRange = { min: 0.60, max: 0.70 };
                repRange = { min: 8, max: 12 };
                setRange = { min: 2, max: 3 };
                break;
            case 'recovering':
                intensityRange = { min: 0.70, max: 0.80 };
                repRange = { min: 5, max: 8 };
                setRange = { min: 3, max: 4 };
                break;
            default: // maintaining
                intensityRange = { min: 0.72, max: 0.82 };
                repRange = { min: 5, max: 8 };
                setRange = { min: 4, max: 5 };
        }

        // Gewichte berechnen (auf 2.5 kg runden)
        const roundTo2_5 = (weight) => Math.round(weight / 2.5) * 2.5;

        return {
            exercise,
            status: status.status,
            readinessScore: status.readinessScore,
            recommendation: status.recommendation,
            weights: {
                light: roundTo2_5(e1rm * intensityRange.min),
                target: roundTo2_5(e1rm * (intensityRange.min + intensityRange.max) / 2),
                heavy: roundTo2_5(e1rm * intensityRange.max)
            },
            reps: repRange,
            sets: setRange,
            e1rm: e1rm,
            strengthIndex: status.strengthIndex,
            trend: status.trend
        };
    }

    /**
     * Gibt alle Status für alle Übungen zurück
     * @returns {StrengthStatus[]}
     */
    getAllStrengthStatus() {
        const exercises = [...this.sessionScores.keys()];
        return exercises
            .map(ex => this.getStrengthStatus(ex))
            .filter(s => s !== null);
    }

    // ========================================
    // HISTORY & VISUALISIERUNG
    // ========================================

    /**
     * Gibt die Strength-Index-Historie für eine Übung zurück
     * @param {string} exercise
     * @returns {StrengthHistory[]}
     */
    getHistory(exercise) {
        const ema = this.emaData.get(exercise);
        return ema ? ema.history : [];
    }

    /**
     * Gibt alle Session-Scores für eine Übung zurück
     * @param {string} exercise
     * @returns {SessionScore[]}
     */
    getSessionScores(exercise) {
        return this.sessionScores.get(exercise) || [];
    }

    /**
     * Gibt verfügbare Übungen zurück
     * @returns {string[]}
     */
    getExercises() {
        return [...this.sessionScores.keys()].sort();
    }

    // ========================================
    // PERSISTENZ
    // ========================================

    saveToStorage() {
        try {
            const data = {
                workoutSets: Object.fromEntries(this.workoutSets),
                sessionScores: Object.fromEntries(this.sessionScores),
                emaData: Object.fromEntries(this.emaData)
            };
            localStorage.setItem('strengthIndex', JSON.stringify(data));
        } catch (e) {
            console.error('Fehler beim Speichern des Strength-Index:', e);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('strengthIndex');
            if (data) {
                const parsed = JSON.parse(data);
                this.workoutSets = new Map(Object.entries(parsed.workoutSets || {}));
                this.sessionScores = new Map(Object.entries(parsed.sessionScores || {}));
                this.emaData = new Map(Object.entries(parsed.emaData || {}));
            }
        } catch (e) {
            console.error('Fehler beim Laden des Strength-Index:', e);
        }
    }

    /**
     * Löscht alle Daten und berechnet neu aus Trainings
     * @param {Array} trainings
     */
    rebuild(trainings) {
        this.importFromTrainings(trainings);
    }
}

// ========================================
// EXPORT
// ========================================

// Globale Instanz
const strengthIndex = new StrengthIndex();

// Export für window
window.StrengthIndex = StrengthIndex;
window.strengthIndex = strengthIndex;
window.calculateE1RM = calculateE1RM;
