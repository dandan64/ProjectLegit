# Legit: AI-Powered Media Forensics

<div align="center">
  <img src="Images/Legit_logo_128.png" alt="Legit Logo" width="100" />
  <br />
  
  **A Chrome side panel extension that analyzes the current page’s credibility using a multi-agent Gemini workflow.**
  
  [![Language](https://img.shields.io/badge/language-JavaScript-yellow?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Manifest](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Build](https://img.shields.io/badge/build-UNKNOWN-lightgrey?style=flat-square)]()
  [![License](https://img.shields.io/badge/license-UNKNOWN-lightgrey?style=flat-square)]()
</div>

---

## 📖 About The Project

**Legit** helps you sanity-check articles while you browse. It extracts the readable content of the active tab (using a bundled Readability parser), runs multiple specialized analysis agents, and combines their outputs into a cohesive report.

The extension calls Google’s Gemini API from the background service worker and can enable the `Google Search` tool for agents that need external verification. It provides:
* An overall legitimacy score.
* A concise, human-readable summary verdict.
* Agent-level ratings and explanations.
* Evidence snippets that can be clicked to highlight the matching text on the page.

## ✨ Key Features

* **🕵️‍♂️ Multi-Agent Analysis**:
    * **Source Credibility:** Ownership signals and history (with search).
    * **Author Verification:** Checks identity and expertise (with search).
    * **Consensus Check:** Cross-verification against independent reporting (with search).
    * **Headline Audit:** Detects "truth gaps" between the title and body.
    * **Bias Analysis:** Detects bias with specific quote evidence (with search).
    * **Style Check:** Evaluates journalistic standards.
* **🧠 Smart Synthesis**: Generates a final summary verdict that runs only after all agents complete.
* **🔦 Precision Highlighting**:
    * Highlights text via exact match, flexible whitespace match, or **Levenshtein fuzzy-match** fallback.
    * Supports multi-node highlighting (works even when a quote spans multiple DOM text nodes).
* **⚡ Caching & Performance**:
    * **Local Storage:** Per-page result caching (24-hour validity) with quota-aware cleanup.
    * **In-Memory:** Prompt-response cache in the background worker (30-minute TTL) plus simple LRU eviction.
    * **Rate Limiting:** Background throttling (Default: 30 requests/minute).
* **🌍 Localization**: Full support for **English** and **Hebrew** with RTL layout switching.
* **🛠️ Robust Extraction**: Safe script injection into the active tab using a bundled Readability parser.

## ⚙️ Architecture

1.  **Extract:** Inject Readability into the active tab and extract a clean article representation (title, byline/author, main text).
2.  **Orchestrate:** Build the agent set for the page and run:
    * *Independent agents* in parallel.
    * *Dependent agents* sequentially (when one agent’s output feeds another).
3.  **Aggregate:** Compute the overall score from weighted agent outputs and generate a final summary.
4.  **Render:** Display agent cards, overall score, and summary in the side panel UI.
5.  **Highlight:** When the user clicks a quote, a content script finds and highlights the relevant text.

## 🛠️ Tech Stack

* **Core**: JavaScript (Vanilla ES6+), HTML, CSS
* **Platform**: Chrome Extensions APIs (Manifest V3)
    * Side Panel API
    * Service Worker Background
    * `chrome.storage`, `chrome.scripting`, `chrome.tabs`
* **Parsing**: Readability (bundled)
* **AI Backend**: Google Gemini API (`generativelanguage.googleapis.com`)
    * Optional `Google Search` tool enabled per-agent

## 🚀 Getting Started

### Prerequisites

* A Chromium-based browser that supports Side Panel extensions (Chrome, Edge, Brave).
* A **Gemini API Key**.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone <YOUR_REPO_URL>
    cd <YOUR_REPO_FOLDER>
    ```

2.  **Verify File Structure**
    Ensure the file layout matches your `manifest.json` and `Legit.html` references. Typical structure:
    * `manifest.json`, `Legit.html`, `legit.css`
    * `scripts/`: `background.js`, `popup.js`, `utils.js`, `agents.js`, `localization.js`, `Readability.js`, `contentHighlighter.js`

    *If your repository structure differs, move files into the folders referenced by the manifest or update the paths.*

3.  **Load into Chrome**
    * Open `chrome://extensions`.
    * Enable **Developer mode**.
    * Click **Load unpacked**.
    * Select the project folder (the folder containing `manifest.json`).

4.  **Setup**
    * Open the side panel (Click extension icon or use `Ctrl+B` / `Cmd+B`).
    * Paste your **Gemini API Key** into the setup screen and save it.

## 💡 Usage

1.  Navigate to an article page you want to evaluate.
2.  Open **Legit** in the side panel.
3.  Click **Analyze This Page**.
4.  **Review Results**:
    * Check the Overall Legitimacy Score and Label.
    * Read the Final Verdict Summary.
    * Explore Agent Cards (ratings and reasoning).
    * Click on **Linked Quotes** to highlight the text inside the page.

## 🔒 Data and Privacy

* **Explicit Trigger:** The extension analyzes only when the user explicitly triggers it for the active tab.
* **Local Key Storage:** The Gemini API key is stored locally via `chrome.storage.local`.
* **Data Transmission:** Extracted page text is sent to the Gemini API for analysis.
* **Caching:** Results may be cached locally per-URL to speed up repeat checks and reduce API calls.

## 🗺️ Roadmap

* [ ] Add automated tests (unit tests for parsing, scoring, and highlighter matching).
* [ ] Add CI build/lint checks.
* [ ] Add an options page for advanced settings (model selection, caching controls, per-agent toggles).
* [ ] Add export of results (copy report, shareable summary).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/<short-name>`).
3.  Commit your changes (`git commit -m "Add <what you changed>"`).
4.  Push and open a Pull Request (`git push origin feature/<short-name>`).
5.  *In the PR, include what changed, screenshots of UI changes, and testing steps.*

## 📄 License

No `LICENSE` file was found in the provided project files.
*Please add a LICENSE file (e.g., MIT or Apache-2.0) and update the badge at the top accordingly.*

## 📧 Contact

* **Name:** <YOUR_NAME>
* **Email:** <YOUR_EMAIL>
* **Project Link:** <YOUR_PROJECT_URL>
