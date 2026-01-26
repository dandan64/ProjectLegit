# Legit: AI-Powered Media Forensics
A Chrome side panel extension that analyzes the current page’s credibility using a multi-agent Gemini workflow, then returns a legitimacy score, a verdict summary, and linkable evidence you can highlight in-page.

## Badges
![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![License](https://img.shields.io/badge/license-UNKNOWN-lightgrey)
![Build](https://img.shields.io/badge/build-UNKNOWN-lightgrey)
![Manifest](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue)

## About the Project
Legit helps you sanity-check articles while you browse. It extracts the readable content of the active tab (using a bundled Readability parser), runs multiple specialized analysis agents, and combines their outputs into:

- An overall legitimacy score
- A concise, human-readable summary verdict
- Agent-level ratings and explanations
- Evidence snippets that can be clicked to highlight the matching text on the page

The extension calls Google’s Gemini API from the background service worker and can enable the `google_search` tool for agents that need external verification.

## Key Features
- Side panel UI (Chrome Side Panel API) for analysis and results
- Multi-agent analysis with weighted scoring (examples include):
  - Source credibility and ownership signals (with search)
  - Author verification (with search)
  - Cross-verification of claims against independent reporting (with search)
  - Headline vs body “truth gap” audit
  - Bias analysis with quote evidence (with search)
  - Writing style and journalistic standards checks
  - Final synthesized summary that runs after all agents complete
- Readability-based article extraction via safe script injection into the active tab
- Evidence linking:
  - Bias and style agents output exact quotes in a structured format
  - Consensus output supports “supporting” and “contradicting” sources using a structured tag format
- In-page quote highlighting:
  - Exact match, flexible whitespace match, and Levenshtein fuzzy-match fallback
  - Multi-node highlighting (works even when a quote spans multiple DOM text nodes)
- Caching and performance:
  - Per-page result caching in `chrome.storage.local` (24-hour validity), with quota-aware cleanup
  - In-memory prompt-response cache in the background worker (30-minute TTL) plus simple LRU eviction
  - Background rate limiting (default: 30 requests/minute)
- Localization:
  - English and Hebrew UI support with RTL layout switching

## Tech Stack
- JavaScript (Vanilla ES6+)
- HTML + CSS
- Chrome Extensions APIs (Manifest V3)
  - Side Panel API
  - Service worker background
  - `chrome.storage`, `chrome.scripting`, `chrome.tabs`
- Readability (bundled in the project)
- Google Gemini API (`generativelanguage.googleapis.com`)
  - Optional `google_search` tool enabled per-agent

## Getting Started

### Prerequisites
- A Chromium-based browser that supports Side Panel extensions (Chrome, Edge, Brave)
- A Gemini API key

### Installation
1. Clone the repository:
   ```bash
   git clone <YOUR_REPO_URL>
   cd <YOUR_REPO_FOLDER>
   ```

2. Verify the file layout matches your `manifest.json` and `Legit.html` script references.  
   Typical expected files:
   - `manifest.json`
   - `Legit.html`
   - `legit.css`
   - `background.js`
   - `popup.js`
   - `utils.js`
   - `agents.js`
   - `localization.js`
   - `Readability.js` (or `readability.js`, depending on your filename)
   - `contentHighlighter.js`

   If your repository structure differs, either:
   - Move files into the folders referenced by `manifest.json`, or
   - Update `manifest.json` and `Legit.html` paths to match your structure.

3. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the project folder (the folder containing `manifest.json`)

4. Open the side panel:
   - Click the extension icon, or use the shortcut:
     - Windows/Linux: `Ctrl+B`
     - macOS: `Command+B`

5. Paste your Gemini API key into the setup screen and save it.

## Usage
1. Navigate to an article page you want to evaluate.
2. Open Legit in the side panel.
3. Click **Analyze This Page**.
4. Review:
   - Overall legitimacy score and label
   - Final verdict summary (synthesized after all agents finish)
   - Agent cards (ratings and reasoning)
   - Linked quotes and sources
5. Click a quote link to highlight the corresponding text inside the page.

## How It Works (High-Level Architecture)
1. **Extract:** Inject Readability into the active tab and extract a clean article representation (title, byline/author, main text).
2. **Orchestrate:** Build the agent set for the page and run:
   - Independent agents in parallel
   - Dependent agents sequentially (when one agent’s output feeds another)
3. **Aggregate:** Compute the overall score from weighted agent outputs and generate a final summary after all agents resolve.
4. **Render:** Display agent cards, overall score, and summary in the side panel UI.
5. **Highlight:** When the user clicks a quote, a content script finds and highlights the relevant text using exact/whitespace/fuzzy matching.

## Data and Privacy Notes
- The extension analyzes only when the user explicitly triggers it for the active tab.
- The Gemini API key is stored locally via `chrome.storage.local`.
- Extracted page text is sent to the Gemini API for analysis.
- Results may be cached locally per-URL to speed up repeat checks and reduce API calls.

## Roadmap
- Add automated tests (unit tests for parsing, scoring, and highlighter matching).
- Add CI build/lint checks.
- Add an options page for advanced settings (model selection, caching controls, per-agent toggles).
- Add export of results (copy report, shareable summary).

## Contributing
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/<short-name>
   ```
3. Make changes with clear commits:
   ```bash
   git commit -m "Add <what you changed>"
   ```
4. Push and open a Pull Request:
   ```bash
   git push origin feature/<short-name>
   ```
5. In the PR, include:
   - What changed and why
   - Screenshots of UI changes (if relevant)
   - Any testing steps

## License
No `LICENSE` file was found in the provided project files.  
Add a `LICENSE` file (for example MIT or Apache-2.0) and update the badge at the top accordingly.

## Contact
- Name: <YOUR_NAME>
- Email: <YOUR_EMAIL>
- Project Link: <YOUR_PROJECT_URL>
