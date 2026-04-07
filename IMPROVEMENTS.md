# Legit Extension — Improvement Tracker

## Done

- [x] **Delegated event listener for `.quote-link`** (`utils.js`)
  Replaced per-element clone-and-reattach pattern with a single delegated listener on `#agentGrid`. Eliminates unnecessary DOM cloning on every agent completion.

- [x] **`requestAnimationFrame` in `sortGridDynamic`** (`utils.js`)
  DOM mutations deferred to next paint cycle instead of forcing a synchronous reflow mid-execution.

- [x] **Delete `extractTextWithNewlines`** (`utils.js`)
  Dead WIP function, zero call sites. Removed ~35 lines of noise.

- [x] **Remove `readability.js` from `Legit.html`**
  The library is only needed when injected into the active tab via `chrome.scripting.executeScript`. Loading it in the popup's own HTML context was unnecessary parse cost.

- [x] **IIFE wrapping for all scripts** (`localization.js`, `utils.js`, `agents.js`, `ui.js`, `orchestrator.js`, `popup.js`)
  Each file now lives in its own `(() => { ... })()` scope. Functions needed cross-file are explicitly promoted via `window.X = X` at the end of each IIFE. Internal helpers (`ratingToScore`, `escapeAttribute`, `animateValue`, `waitForTabLoad`, etc.) remain private.
  - `localization.js`: changed `var currentLang/TRANSLATIONS` + `typeof` guards to `window.X = window.X || ...` pattern so the file stays safe when injected as a content script into article tabs.

- [x] **Split `popup.js` into focused modules**
  Original 671-line monolith broken into:
  - `orchestrator.js` — `startAnalysis`, `extractPageData`, `runProgressiveAnalysis`, `analyzeAgent`; owns `window.analysisResults`
  - `ui.js` — `showStatus`, `toggleApiKeyView`; both use `document.getElementById` instead of closed-over DOM refs
  - `popup.js` — thin entry point (~130 lines); only DOMContentLoaded wiring and event handlers
  - Load order in `Legit.html`: `localization → utils → agents → ui → orchestrator → popup`

- [x] **Fix latent bug in `loadFromCache`** (`utils.js`)
  The function referenced `setupView` and `resultsView` as bare names, which were `const` variables in popup.js's `DOMContentLoaded` callback — not accessible from utils.js's scope. Replaced with `document.getElementById("setupView")` / `document.getElementById("resultsView")`.

---

## Pending

---

## Future Ideas

- [ ] **Offline / network-failure handling**
  Currently an agent error just shows a red badge. A retry button per card (max 1 retry) would improve UX significantly with minimal backend change.

- [ ] **Agent result caching is keyed by URL only**
  If the same URL serves different content (paywalls, A/B tests, live blogs), the cached result may be stale immediately. Consider mixing a content hash (first 500 chars of extracted text) into the cache key.

- [ ] **Score explanation tooltip**
  Users see a number (0–100) but don't know how it's calculated. A small "?" icon that shows the weighted agent breakdown on hover would make the score feel trustworthy rather than opaque.

- [ ] **Export / share result**
  A "Copy summary" button that puts a plain-text version of the scores and key quotes on the clipboard. Useful for journalists or researchers citing why they trust/distrust a source.

- [ ] **`TRANSLATIONS` object grows unbounded**
  Every new UI string requires a manual entry in both `he` and `en` keys in `localization.js`. Consider a helper that throws at startup if any key is missing from one language — catches mistranslations early instead of silently showing the key name in production.

- [ ] **Background service worker has no error boundary**
  If `background.js` crashes mid-stream (e.g. API key revoked mid-analysis), the popup hangs with spinners. A timeout per agent (e.g. 30s) with a graceful error card would prevent the UI from being stuck.

- [ ] **`contentHighlighter.js` guard pattern is good — apply it to injection calls too**
  The `window.legitHighlighterLoaded` guard prevents double-execution. The `Readability.js` injection in `popup.js:343` has a `.catch(() => {})` for the same reason but the catch silently swallows real errors. Log the error before ignoring it.
