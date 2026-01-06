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
 * @property {string} [repRange] - '3er' | '6er' | '10er' - Wiederholungsbereich basierend auf Plan
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
 * @property {string} [repRange] - '3er' | '6er' | '10er' - Wiederholungsbereich dieser Session
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
 * @property {Object} [repRangeBreakdown] - Aufschlüsselung nach Wiederholungsbereichen
 */

/**
 * @typedef {Object} WeeklyProgress
 * @property {boolean} has3er - Hat 3er-Training diese Woche
 * @property {boolean} has6er - Hat 6er-Training diese Woche
 * @property {boolean} has10er - Hat 10er-Training diese Woche
 * @property {number} completedRanges - Anzahl absolvierter Bereiche (0-3)
 * @property {string[]} missingRanges - Fehlende Bereiche
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
const WEIGHT_TOLERANCE = 2.5; // Toleranz für Gewichtsvergleich mit Plan (±2.5 kg)

// ========================================
// HILFSFUNKTIONEN FÜR REP-RANGE ERKENNUNG
// ========================================

/**
 * Ermittelt den Wiederholungsbereich basierend auf dem Plan
 * @param {string} exercise - Name der Übung
 * @param {number} weight - Verwendetes Gewicht
 * @returns {string|null} '3er' | '6er' | '10er' | null
 */
function getRepRangeFromPlan(exercise, weight) {
    // Zugriff auf trainingPlans aus app.js (globale Variable)
    if (typeof trainingPlans === 'undefined' || !trainingPlans) return null;

    const plan = trainingPlans.find(p => p.exercise === exercise);
    if (!plan) return null;

    // Finde passenden Bereich mit Toleranz
    if (plan.weight3Reps && Math.abs(weight - plan.weight3Reps) <= WEIGHT_TOLERANCE) {
        return '3er';
    }
    if (plan.weight6Reps && Math.abs(weight - plan.weight6Reps) <= WEIGHT_TOLERANCE) {
        return '6er';
    }
    if (plan.weight10Reps && Math.abs(weight - plan.weight10Reps) <= WEIGHT_TOLERANCE) {
        return '10er';
    }

    return null;
}

/**
 * Berechnet die Kalenderwoche (ISO-Format)
 * @param {Date} date
 * @returns {string} Format: 'YYYY-WXX'
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Gibt Start und Ende der aktuellen Kalenderwoche zurück
 * @returns {{start: Date, end: Date}}
 */
function getCurrentWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

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
        console.log('Strength Index: Importiere', trainings.length, 'Trainings');
        const sets = [];

        trainings.forEach(t => {
            // Nur Gewichtstraining (Zeit-Trainings überspringen)
            if (t.trainingType === 'time') return;

            // Überspringe wenn kein Gewicht vorhanden
            if (!t.weight && !t.weightsPerSet) return;

            const repsArray = Array.isArray(t.reps) ? t.reps : [t.reps];
            const weightsArray = t.weightsPerSet || repsArray.map(() => t.weight);

            repsArray.forEach((reps, index) => {
                const weight = parseFloat(weightsArray[index]) || parseFloat(t.weight) || 0;
                const repCount = parseInt(reps) || 0;

                if (weight > 0 && repCount > 0) {
                    // Rep-Range basierend auf Plan ermitteln
                    const repRange = getRepRangeFromPlan(t.exercise, weight);

                    sets.push({
                        exercise: t.exercise,
                        weight: weight,
                        reps: repCount,
                        date: t.date,
                        repRange: repRange
                    });
                }
            });
        });

        console.log('Strength Index: Erstelle', sets.length, 'Sets aus Trainings');

        // Bestehende Daten löschen und neu importieren
        this.workoutSets.clear();
        this.sessionScores.clear();
        this.emaData.clear();

        if (sets.length > 0) {
            this.addWorkoutSets(sets);
        }

        console.log('Strength Index: Übungen verfügbar:', this.getExercises());
    }

    // ========================================
    // SESSION-SCORE BERECHNUNG
    // ========================================

    /**
     * Berechnet den Session-Score für eine Übung an einem Tag
     * Berücksichtigt das 3er/6er/10er Trainingsschema
     * @param {string} exercise
     * @param {string} date
     */
    calculateSessionScore(exercise, date) {
        const sets = this.workoutSets.get(exercise) || [];
        const daySets = sets.filter(s => s.date === date);

        if (daySets.length === 0) return;

        // Rep-Range dieser Session ermitteln (der häufigste Rep-Range an diesem Tag)
        const repRangeCounts = { '3er': 0, '6er': 0, '10er': 0, 'other': 0 };
        daySets.forEach(s => {
            if (s.repRange) {
                repRangeCounts[s.repRange]++;
            } else {
                repRangeCounts['other']++;
            }
        });
        const dominantRepRange = Object.entries(repRangeCounts)
            .filter(([key]) => key !== 'other')
            .sort((a, b) => b[1] - a[1])[0];
        const sessionRepRange = dominantRepRange && dominantRepRange[1] > 0 ? dominantRepRange[0] : null;

        // e1RM für jeden Satz berechnen
        const e1rms = daySets.map(s => calculateE1RM(s.weight, s.reps, s.rpe));

        // Session-Metriken
        const e1rmMax = Math.max(...e1rms);
        const e1rmAvg = e1rms.reduce((a, b) => a + b, 0) / e1rms.length;
        const volumeLoad = daySets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
        const setCount = daySets.length;

        // Angepasste Gewichtung basierend auf Rep-Range
        // 3er: Mehr Gewicht auf Max e1RM (Kraftfokus)
        // 6er: Ausgeglichene Gewichtung (Hypertrophie-Kraft)
        // 10er: Mehr Gewicht auf Volumen (Hypertrophie)
        let maxWeight, avgWeight, volWeight;
        switch (sessionRepRange) {
            case '3er':
                maxWeight = 0.70; avgWeight = 0.20; volWeight = 0.10;
                break;
            case '6er':
                maxWeight = 0.55; avgWeight = 0.30; volWeight = 0.15;
                break;
            case '10er':
                maxWeight = 0.45; avgWeight = 0.25; volWeight = 0.30;
                break;
            default:
                maxWeight = 0.60; avgWeight = 0.25; volWeight = 0.15;
        }

        // Kombinierter Score mit angepasster Gewichtung
        const volumeFactor = Math.min(volumeLoad / (e1rmMax * 10), 2);
        const score = (e1rmMax * maxWeight) + (e1rmAvg * avgWeight) + (e1rmMax * volumeFactor * volWeight);

        const sessionScore = {
            exercise,
            date,
            e1rmMax: Math.round(e1rmMax * 10) / 10,
            e1rmAvg: Math.round(e1rmAvg * 10) / 10,
            volumeLoad: Math.round(volumeLoad),
            setCount,
            score: Math.round(score * 10) / 10,
            repRange: sessionRepRange
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

        // Rep-Range Breakdown hinzufügen
        const repRangeBreakdown = this.getRepRangeBreakdown ? this.getRepRangeBreakdown(exercise) : null;
        const weeklyProgress = this.getWeeklyProgress ? this.getWeeklyProgress(exercise) : null;

        return {
            exercise,
            currentE1RM,
            strengthIndex: ema.short,
            trend,
            status,
            recommendation,
            readinessScore,
            repRangeBreakdown,
            weeklyProgress
        };
    }

    /**
     * Gibt Trainingsempfehlung mit konkreten Gewichten
     * Angepasst für das 3er/6er/10er Schema
     * @param {string} exercise
     * @returns {Object | null}
     */
    getTrainingRecommendation(exercise) {
        const status = this.getStrengthStatus(exercise);
        if (!status) return null;

        const e1rm = status.currentE1RM;
        const roundTo2_5 = (weight) => Math.round(weight / 2.5) * 2.5;

        // Hole wöchentlichen Fortschritt
        const weeklyProgress = status.weeklyProgress || this.getWeeklyProgress(exercise);
        const nextRangeRec = this.getNextRepRangeRecommendation(exercise);

        // Basis-Empfehlung aus dem nächsten Rep-Range
        let recommendation = status.recommendation;
        let targetRange = nextRangeRec ? nextRangeRec.recommendedRange : '6er';

        // Erweitere Empfehlung mit wöchentlichem Fortschritt
        if (weeklyProgress && weeklyProgress.completedRanges < 3) {
            recommendation += ` ${nextRangeRec ? nextRangeRec.reason : ''}`;
        }

        // Berechne Gewichte für alle drei Rep-Ranges
        const weights3er = roundTo2_5(e1rm * 0.90);  // 90% für 3er
        const weights6er = roundTo2_5(e1rm * 0.80);  // 80% für 6er
        const weights10er = roundTo2_5(e1rm * 0.70); // 70% für 10er

        return {
            exercise,
            status: status.status,
            readinessScore: status.readinessScore,
            recommendation,
            // Klassische Gewichtsempfehlung
            weights: {
                light: weights10er,
                target: weights6er,
                heavy: weights3er
            },
            // Spezifische Empfehlungen pro Rep-Range
            repRangeWeights: {
                '3er': { weight: weights3er, reps: 3, sets: 4, intensity: '90%' },
                '6er': { weight: weights6er, reps: 6, sets: 4, intensity: '80%' },
                '10er': { weight: weights10er, reps: 10, sets: 4, intensity: '70%' }
            },
            // Empfohlener nächster Rep-Range
            nextRecommendedRange: targetRange,
            nextRangeWeight: nextRangeRec ? nextRangeRec.targetWeight : weights6er,
            nextRangeReps: nextRangeRec ? nextRangeRec.reps : 6,
            nextRangeSets: nextRangeRec ? nextRangeRec.sets : 4,
            // Legacy-Felder für Kompatibilität
            reps: { min: 3, max: 10 },
            sets: { min: 4, max: 4 },
            e1rm: e1rm,
            strengthIndex: status.strengthIndex,
            trend: status.trend,
            weeklyProgress
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
    // WÖCHENTLICHES 3er/6er/10er SCHEMA
    // ========================================

    /**
     * Ermittelt den wöchentlichen Trainingsfortschritt für das 3er/6er/10er Schema
     * @param {string} exercise
     * @returns {WeeklyProgress}
     */
    getWeeklyProgress(exercise) {
        const scores = this.sessionScores.get(exercise) || [];
        const weekRange = getCurrentWeekRange();

        // Finde alle Sessions dieser Woche
        const weekSessions = scores.filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= weekRange.start && sessionDate <= weekRange.end;
        });

        // Prüfe welche Rep-Ranges diese Woche absolviert wurden
        const completedRanges = new Set(
            weekSessions.map(s => s.repRange).filter(r => r !== null)
        );

        const has3er = completedRanges.has('3er');
        const has6er = completedRanges.has('6er');
        const has10er = completedRanges.has('10er');

        const missingRanges = [];
        if (!has3er) missingRanges.push('3er');
        if (!has6er) missingRanges.push('6er');
        if (!has10er) missingRanges.push('10er');

        return {
            has3er,
            has6er,
            has10er,
            completedRanges: completedRanges.size,
            missingRanges,
            weekSessions
        };
    }

    /**
     * Gibt eine Empfehlung für den nächsten Wiederholungsbereich
     * basierend auf dem wöchentlichen Fortschritt
     * @param {string} exercise
     * @returns {Object}
     */
    getNextRepRangeRecommendation(exercise) {
        const progress = this.getWeeklyProgress(exercise);
        const status = this.getStrengthStatus(exercise);

        if (!status) return null;

        const e1rm = status.currentE1RM;

        // Bestimme den empfohlenen nächsten Rep-Range
        let recommendedRange;
        let reason;

        if (progress.completedRanges === 3) {
            // Alle Bereiche diese Woche absolviert
            recommendedRange = '6er'; // Standard-Empfehlung
            reason = 'Alle Bereiche diese Woche absolviert! Nächste Woche startet neu.';
        } else if (progress.missingRanges.length === 1) {
            // Nur noch ein Bereich fehlt
            recommendedRange = progress.missingRanges[0];
            reason = `Noch ${recommendedRange}-Training offen für diese Woche.`;
        } else if (progress.missingRanges.length === 2) {
            // Zwei Bereiche fehlen - wähle basierend auf Reihenfolge (3er → 6er → 10er)
            const order = ['3er', '6er', '10er'];
            recommendedRange = order.find(r => progress.missingRanges.includes(r));
            reason = `${recommendedRange}-Training empfohlen. Noch ${progress.missingRanges.join(' und ')} offen.`;
        } else {
            // Alle drei fehlen - starte mit 3er
            recommendedRange = '3er';
            reason = 'Neue Woche - starte mit dem 3er-Training für maximale Kraft.';
        }

        // Berechne empfohlene Gewichte für den Rep-Range
        const roundTo2_5 = (weight) => Math.round(weight / 2.5) * 2.5;
        let targetWeight, reps, sets;

        switch (recommendedRange) {
            case '3er':
                // 3er: ~90% e1RM für 3 Wiederholungen
                targetWeight = roundTo2_5(e1rm * 0.90);
                reps = 3;
                sets = 4;
                break;
            case '6er':
                // 6er: ~80% e1RM für 6 Wiederholungen
                targetWeight = roundTo2_5(e1rm * 0.80);
                reps = 6;
                sets = 4;
                break;
            case '10er':
                // 10er: ~70% e1RM für 10 Wiederholungen
                targetWeight = roundTo2_5(e1rm * 0.70);
                reps = 10;
                sets = 4;
                break;
        }

        return {
            exercise,
            recommendedRange,
            reason,
            targetWeight,
            reps,
            sets,
            e1rm,
            weeklyProgress: progress
        };
    }

    /**
     * Gibt eine detaillierte Aufschlüsselung nach Rep-Ranges zurück
     * @param {string} exercise
     * @returns {Object}
     */
    getRepRangeBreakdown(exercise) {
        const scores = this.sessionScores.get(exercise) || [];

        // Gruppiere Sessions nach Rep-Range
        const breakdown = {
            '3er': { sessions: [], avgE1RM: 0, trend: 0 },
            '6er': { sessions: [], avgE1RM: 0, trend: 0 },
            '10er': { sessions: [], avgE1RM: 0, trend: 0 }
        };

        scores.forEach(s => {
            if (s.repRange && breakdown[s.repRange]) {
                breakdown[s.repRange].sessions.push(s);
            }
        });

        // Berechne Durchschnitt und Trend für jeden Bereich
        Object.keys(breakdown).forEach(range => {
            const sessions = breakdown[range].sessions;
            if (sessions.length > 0) {
                breakdown[range].avgE1RM = Math.round(
                    sessions.reduce((sum, s) => sum + s.e1rmMax, 0) / sessions.length * 10
                ) / 10;

                // Trend: Vergleiche letzte 3 Sessions mit vorherigen 3
                if (sessions.length >= 2) {
                    const recent = sessions.slice(-3);
                    const earlier = sessions.slice(-6, -3);
                    if (earlier.length > 0) {
                        const recentAvg = recent.reduce((sum, s) => sum + s.e1rmMax, 0) / recent.length;
                        const earlierAvg = earlier.reduce((sum, s) => sum + s.e1rmMax, 0) / earlier.length;
                        breakdown[range].trend = Math.round((recentAvg / earlierAvg - 1) * 100) / 100;
                    }
                }

                breakdown[range].count = sessions.length;
                breakdown[range].lastSession = sessions[sessions.length - 1];
            }
        });

        return breakdown;
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
