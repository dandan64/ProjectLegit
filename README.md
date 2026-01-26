# Legit: AI-Powered Media Forensics

<div align="center">
  <img src="Images/Legit_logo_128.png" alt="Legit Logo" width="128" height="128">
  <br>
  <br>
  
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Powered By Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)]()
  
  **Real-time analysis of news credibility, bias, and cross-verification using Multi-Agent AI orchestration.**
</div>

---

## 📖 Overview

**Legit** is a Chromium-based browser extension designed to combat misinformation through forensic media analysis. Unlike simple "true/false" checkers, Legit employs a **Multi-Agent System (MAS)** architecture where distinct AI agents specialize in specific tasks—source verification, author profiling, bias detection, and cross-reference consensus.

Built on the **Chrome Side Panel API** and powered by **Google's Gemini 2.0 Flash**, Legit provides users with a granular "Legitimacy Score" and context-aware citations, allowing for lateral reading without leaving the tab.

## ✨ Key Features

### 🕵️‍♂️ Multi-Agent Analysis Engine
Legit breaks down every article using specialized AI agents:
* **Source Agent:** Evaluates domain reputation using SIFT (Stop, Investigate, Find, Trace) methodology and financial transparency checks.
* **Author Agent:** Investigates bylines to distinguish between expert journalists, opinion writers, and AI-generated personas.
* **Consensus Agent:** Performs real-time cross-verification against Tier-1 news outlets to flag breaking news vs. unsubstantiated claims.
* **Bias Agent:** Runs a "virtual panel" of 11 expert personas (political, gender, corporate) to detect structural and lexical bias.
* **Headline Agent:** Audits "Truth Gaps" between sensationalist headlines and the actual body text (clickbait detection).

### ⚡ Technical Highlights
* **Smart Citation Highlighting:** Uses a custom **Levenshtein Distance algorithm** to fuzzy-match AI-generated quotes back to the DOM, handling differences in whitespace and formatting robustly.
* **Smart Caching Strategy:** Implements an LRU-style caching mechanism with storage quota management to minimize API costs and latency.
* **Localization:** Native support for **English** and **Hebrew** (RTL), including UI flipping and prompt adaptation.
* **Readability Integration:** Utilizes a modified Mozilla Readability engine to extract clean article content, removing ads and boilerplate before analysis.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism UI), Vanilla JavaScript (ES6+).
* **Extension Framework:** Chrome Manifest V3, Side Panel API, Scripting API.
* **AI Backend:** Google Gemini API (`gemini-2.0-flash-exp`) via REST.
* **Data Processing:** DOM TreeWalker for text node mapping, fuzzy string matching.

## 🚀 Installation & Setup

### Prerequisites
1.  A Chromium-based browser (Chrome, Edge, Brave).
2.  A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Free tier available).

### Local Development
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/legit-extension.git](https://github.com/yourusername/legit-extension.git)
    cd legit-extension
    ```
2.  **Load into Chrome:**
    * Open Chrome and navigate to `chrome://extensions/`.
    * Toggle **Developer mode** in the top right corner.
    * Click **Load unpacked**.
    * Select the `legit-extension` directory.
3.  **Pin the Extension:**
    * Click the puzzle piece icon in your browser toolbar and pin **Legit**.

### Configuration
1.  Open the Legit extension side panel.
2.  Paste your **Gemini API Key** into the settings field.
3.  Click **Save API Key**.

## 🧠 How It Works (Architecture)

1.  **Extraction:** When the user clicks "Analyze", the `contentScript` injects a parser to sanitize the DOM and extract the core article text/metadata.
2.  **Orchestration:** `popup.js` initializes the Agent Grid. Independent agents (Source, Style, Headline) run in parallel via `Promise.all`.
3.  **Dependency Chaining:** The **Consensus Agent** runs a preliminary search, and its output is fed into the **Citation Formatter**, ensuring quotes are verified before display.
4.  **Synthesis:** The **Summary Agent** waits for all threads to resolve, then synthesizes a human-readable executive summary based on the weighted scores of all sub-agents.
5.  **UI Rendering:** Results are streamed to the Side Panel. If a user clicks a citation, `contentHighlighter.js` calculates the text offset and scrolls the viewport to the evidence in the article.

## 🔒 Privacy & Security

* **Data Minimization:** No browsing history is tracked. Analysis is only triggered explicitly by the user on a per-tab basis.
* **Direct API Calls:** API calls are made directly from the user's client to Google servers. No intermediate servers or analytics are used.
* **Local Storage:** API keys and cached results are stored locally on the device using `chrome.storage.local`.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with 💻 and ☕ by Daniel and Mosh</sub>
</div>