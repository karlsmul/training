# Implementierungsplan: Planbasiertes Auswertungssystem

## Übersicht

Ersetzung des bestehenden EMA-basierten Strength Index Systems durch ein planbasiertes Auswertungssystem mit klaren Kennzahlen und Empfehlungen.

---

## 1. Datenstrukturen

### 1.1 Bestehend (unverändert)
```javascript
// TrainingPlan (bereits vorhanden)
{
    id: number,
    exercise: string,
    weight3Reps: number|null,   // Baseline für 3er
    weight6Reps: number|null,   // Baseline für 6er
    weight10Reps: number|null   // Baseline für 10er
}

// Training (bereits vorhanden)
{
    id: number,
    exercise: string,
    date: string,
    weight: number|null,
    weightsPerSet: number[]|null,
    sets: number,
    reps: number[]  // z.B. [6, 6, 5, 4]
}

// DailyBorgValue (bereits vorhanden)
{
    id: number,
    date: string,
    borgValue: number  // 1-10
}
```

### 1.2 Neu: SessionAnalysis (ersetzt SessionScore)
```javascript
{
    exercise: string,
    date: string,
    repRange: '3er' | '6er' | '10er',

    // Geplante Werte (aus Plan)
    plannedWeight: number,      // Baseline-Gewicht aus Plan
    plannedReps: number,        // Ziel-Wdh (3, 6 oder 10)
    plannedTotalReps: number,   // 4 × Ziel-Wdh
    planE1RM: number,           // Baseline × (1 + Ziel-Wdh/30)

    // Tatsächliche Werte
    actualWeights: number[],    // Gewichte pro Satz [100, 100, 100, 100]
    actualReps: number[],       // Wiederholungen pro Satz [6, 6, 5, 4]
    actualTotalReps: number,    // Summe aller Wdh
    setE1RMs: number[],         // e1RM pro Satz
    avgE1RM: number,            // Durchschnitt aller e1RMs

    // Berechnete Kennzahlen
    pfi: number,                // Plan Fulfillment Index
    strengthIndex: number,      // Ist-e1RM / Plan-e1RM × 100
    progressReserve: number,    // Strength Index - 100

    // Borg (vom Tag)
    borgValue: number|null,
    efficiencyScore: number|null,  // progressReserve / borg

    // Empfehlung
    recommendation: {
        status: 'hold' | 'observe' | 'increase' | 'fatigue',
        text: string,
        suggestedWeight: number|null
    }
}
```

---

## 2. Berechnungsfunktionen

### 2.1 Kernformeln

```javascript
// e1RM (bereits vorhanden)
e1RM = weight × (1 + reps / 30)

// Plan Fulfillment Index
PFI = actualTotalReps / plannedTotalReps
    = actualTotalReps / (4 × targetReps)

// Plan-e1RM
planE1RM = baselineWeight × (1 + targetReps / 30)

// Ist-e1RM (Durchschnitt aller Sätze)
avgE1RM = sum(setE1RMs) / 4

// Strength Index (planbasiert)
strengthIndex = (avgE1RM / planE1RM) × 100

// Progress-Reserve
progressReserve = strengthIndex - 100

// Effizienz-Score
efficiencyScore = progressReserve / borgValue
```

### 2.2 Empfehlungslogik

```javascript
function getRecommendation(strengthIndex, pfi, borg) {
    if (strengthIndex < 97) {
        return { status: 'fatigue', text: 'Ermüdung - Erholung prüfen' };
    }
    if (strengthIndex >= 98 && strengthIndex <= 102) {
        return { status: 'hold', text: 'Gewicht halten' };
    }
    if (strengthIndex > 102 && strengthIndex < 105) {
        return { status: 'observe', text: 'Beobachten' };
    }
    if (strengthIndex >= 105 && pfi >= 1.05 && borg <= 7) {
        return { status: 'increase', text: '+2.5 kg', suggestedWeight: +2.5 };
    }
    return { status: 'observe', text: 'Beobachten' };
}
```

---

## 3. Dateiänderungen

### 3.1 strength-index.js → plan-analysis.js (komplett neu schreiben)

**Struktur:**
```javascript
// Konstanten
const SETS_PER_EXERCISE = 4;
const REP_TARGETS = { '3er': 3, '6er': 6, '10er': 10 };

// Hilfsfunktionen
function calculateE1RM(weight, reps) { ... }
function getRepRangeFromPlan(exercise, weight) { ... }
function getBorgForDate(date) { ... }

// Kernklasse
class PlanAnalysis {
    constructor() { ... }

    // Analyse einer einzelnen Session
    analyzeSession(training, plan, borgValue) { ... }

    // Analyse aller Trainings eines Tages
    analyzeDayTrainings(date) { ... }

    // Empfehlung generieren
    getRecommendation(analysis) { ... }

    // Durchschnitt über alle Übungen
    getOverallStats(date) { ... }

    // Historie für Chart
    getHistory(exercise, limit = 10) { ... }
}
```

### 3.2 app.js Änderungen

**Zu entfernen:**
- `initStrengthIndex()`
- `populateStrengthExerciseDropdown()`
- `displayStrengthIndex()`
- `updateStrengthChart()`

**Neu hinzufügen:**
- `initPlanAnalysis()`
- `displayPlanAnalysis(date)` - Zeigt Analyse für einen Tag
- `updateAnalysisChart(exercise)`

### 3.3 index.html Änderungen

**Stats-Tab (#statsTab) anpassen:**
```html
<div id="statsTab" class="tab-content">
    <!-- Datums-Auswahl -->
    <div class="analysis-date-picker">
        <button id="prevDayBtn">←</button>
        <span id="analysisDate">08.01.2026</span>
        <button id="nextDayBtn">→</button>
    </div>

    <!-- Gesamt-Übersicht -->
    <div class="analysis-summary">
        <div class="summary-card">
            <span class="label">Ø Strength Index</span>
            <span class="value" id="avgStrengthIndex">--</span>
        </div>
        <div class="summary-card">
            <span class="label">Borg</span>
            <span class="value" id="dayBorg">--</span>
        </div>
    </div>

    <!-- Pro Übung -->
    <div id="exerciseAnalysisList"></div>

    <!-- Chart -->
    <div class="chart-container">
        <canvas id="analysisChart"></canvas>
    </div>
</div>
```

### 3.4 style.css Ergänzungen

**Neue CSS-Klassen:**
- `.analysis-card` - Karte pro Übung
- `.ampel-status` - Ampel-Anzeige (❌/🟡/✅)
- `.metric-grid` - Grid für Kennzahlen
- `.recommendation-badge` - Empfehlungs-Badge

---

## 4. UI-Design

### 4.1 Übungs-Analyse-Card

```
┌─────────────────────────────────────────────┐
│ ✅ Kreuzheben (6er)                         │
├─────────────────────────────────────────────┤
│ Plan: 100 kg × 4×6 = 24 Wdh                 │
│ Ist:  100 kg × [6,6,5,4] = 21 Wdh           │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ PFI     │ │ SI      │ │ Reserve │        │
│ │ 87.5%   │ │ 103.2%  │ │ +3.2%   │        │
│ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────┤
│ 💡 Empfehlung: Beobachten                   │
└─────────────────────────────────────────────┘
```

### 4.2 Ampel-Logik

| Status | Ampel | Farbe | Bedingung |
|--------|-------|-------|-----------|
| Ermüdung | ❌ | Rot | SI < 97% |
| Halten | 🟡 | Gelb | SI 98-102% |
| Beobachten | 🟡 | Gelb | SI 102-105% |
| Steigern | ✅ | Grün | SI ≥105%, PFI ≥1.05, Borg ≤7 |

---

## 5. Implementierungsreihenfolge

### Schritt 1: plan-analysis.js erstellen
- [ ] Neue Datei mit Berechnungslogik
- [ ] JSDoc-Typdefinitionen
- [ ] Kernfunktionen: calculateE1RM, analyzeSession, getRecommendation
- [ ] PlanAnalysis Klasse

### Schritt 2: app.js anpassen
- [ ] Alte Strength-Index-Funktionen entfernen
- [ ] Neue displayPlanAnalysis() Funktion
- [ ] Datums-Navigation implementieren
- [ ] Chart-Update für neue Daten

### Schritt 3: index.html anpassen
- [ ] Stats-Tab HTML neu strukturieren
- [ ] Datums-Picker hinzufügen
- [ ] Platzhalter für Analyse-Cards

### Schritt 4: style.css erweitern
- [ ] Neue CSS-Klassen für Analyse-UI
- [ ] Ampel-Styling
- [ ] Responsive Anpassungen

### Schritt 5: Integration & Test
- [ ] Script-Tags in index.html aktualisieren
- [ ] Version auf v19 erhöhen
- [ ] Manueller Test aller Funktionen
- [ ] Commit & Push

---

## 6. Beispiel-Output (10er-Tag)

**Eingabe:**
- Übung: Kreuzheben
- Plan: 90 kg (10er Baseline)
- Trainiert: 90 kg × [10, 10, 9, 8] = 37 Wdh
- Borg: 7

**Berechnung:**
```
Ziel-Wdh: 4 × 10 = 40
PFI = 37 / 40 = 0.925 (92.5%)

Plan-e1RM = 90 × (1 + 10/30) = 90 × 1.333 = 120 kg

Set-e1RMs:
  - Satz 1: 90 × (1 + 10/30) = 120.0 kg
  - Satz 2: 90 × (1 + 10/30) = 120.0 kg
  - Satz 3: 90 × (1 + 9/30)  = 117.0 kg
  - Satz 4: 90 × (1 + 8/30)  = 114.0 kg

Avg-e1RM = (120 + 120 + 117 + 114) / 4 = 117.75 kg

Strength Index = 117.75 / 120 × 100 = 98.1%
Progress-Reserve = 98.1 - 100 = -1.9%
Effizienz-Score = -1.9 / 7 = -0.27

Empfehlung: "Gewicht halten" (SI zwischen 98-102%)
```

**Output:**
```
🟡 Kreuzheben (10er)
├── PFI: 92.5%
├── Strength Index: 98.1%
├── Progress-Reserve: -1.9%
└── Empfehlung: Gewicht halten
```

---

## 7. Abwärtskompatibilität

- Bestehende Trainings-Daten bleiben unverändert
- Bestehende Plan-Daten werden 1:1 weiterverwendet
- Borg-Werte werden wie bisher pro Tag gespeichert
- Keine Migration notwendig

---

## Bestätigung erforderlich

Soll ich mit der Implementierung nach diesem Plan beginnen?
