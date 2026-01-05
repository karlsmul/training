# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kreuzheben is a German-language Progressive Web App (PWA) for strength training tracking. Built with vanilla HTML5/CSS3/JavaScript (no frameworks), it follows an offline-first architecture with Firebase cloud synchronization.

## Deployment

**Automatic**: Push to `main` or `claude/strength-training-app-wOLFJ` triggers GitHub Actions deployment to Firebase Hosting.

**Manual**:
```bash
firebase deploy --only hosting
```

**No build process** - files are served directly. No npm dependencies.

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page app entry, tab-based UI structure |
| `app.js` (~1,750 lines) | Main application logic, data management, UI rendering |
| `sync.js` (~1,000 lines) | Firebase authentication and cloud synchronization |
| `firebase-config.js` | Firebase SDK initialization |
| `service-worker.js` | PWA offline caching (network-first strategy) |
| `style.css` | All styling, dark purple gradient theme |

### Script Loading Order (Critical)
In `index.html`, scripts must load in this order:
1. Firebase SDK (CDN)
2. `firebase-config.js`
3. `sync.js` (depends on firebase-config)
4. `app.js` (depends on sync)

### Data Storage

**localStorage keys** (offline-first, primary):
- `trainings` - Training entries
- `trainingPlans` - Weight reference plans
- `bodyWeights` - Body measurements
- `dailyBorgValues` - Perceived exertion ratings
- `personalInfo` - User age/height
- `exercises` - Custom exercise list

**Cloud** (when logged in): Firestore under `/users/{userId}/` with matching subcollections

### State Management

Global variables in `app.js`:
- `trainings`, `trainingPlans`, `bodyWeights`, `personalInfo`, `exercises` - data arrays
- `editMode`, `editingId` - edit state tracking
- `currentTrainingType` - weight vs. time toggle

In `sync.js`:
- `syncEnabled`, `currentUser`, `syncInProgress`, `lastSyncTime`

### Key Patterns

**Sync merge strategy**: Cloud updates merge with local data; local takes priority for exercises.

**UI update protection**: `inputTimestamps` tracking prevents UI refreshes while user is typing. Manual update button instead of auto-refresh.

**Service worker versioning**: Cache name includes version (e.g., `krafttraining-v14`). HTML never cached; JS/CSS cached with cache-busting parameters.

## Common Modifications

- **Adding features**: Modify `app.js` for logic, add UI to `index.html`
- **Cloud sync issues**: Check `sync.js` merge functions and realtime listeners
- **Styling changes**: Edit `style.css`
- **Cache issues**: Increment service worker cache version and update cache-busting params in `index.html`
