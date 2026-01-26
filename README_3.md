# Legit - AI-Powered News Credibility Verifier

<div align="center">
  <img src="Images/Legit_logo_128.png" alt="Legit Logo" width="100" />
  <br />
  
  **Instantly verify news credibility, detect bias, and cross-reference sources using a multi-agent AI system directly in your browser.**
  
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Powered By Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-8E75B2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

---

## 📖 About The Project

**Legit** is a Chrome Side Panel extension designed to combat misinformation and media bias using advanced Large Language Model (LLM) analysis. Unlike simple fact-checkers, Legit employs a **Multi-Agent Architecture** where specialized AI personas analyze different aspects of a news article simultaneously.

When you analyze a page, Legit extracts the content and dispatches it to agents specializing in **Source Verification (SIFT method)**, **Author Background**, **Consensus Checking**, **Bias Detection**, and **Linguistic Analysis**. The results are aggregated into a weighted credibility score, providing a forensic breakdown of the content you are reading.

## ✨ Key Features

* **🕵️‍♂️ Multi-Agent Analysis Engine**:
    * **Source Credibility:** Evaluates domain history, funding transparency, and adherence to factual consensus.
    * **Author Analysis:** Investigates the writer's digital footprint and expertise using live search.
    * **Cross-Verification (Consensus):** Atomizes claims and checks them against Tier-1 news outlets to detect circular reporting or breaking news.
    * **Bias & Style:** Detects emotional manipulation, political leaning, and clickbait tactics.
* **🧠 Smart Context Search (SIFT)**: Agents actively use Google Search tools to perform "Lateral Reading," verifying claims against external sources rather than relying solely on the text provided.
* **🔦 Fuzzy Quote Highlighting**: Click on any quote or claim in the analysis to instantly scroll to and highlight it on the webpage, powered by a robust **Levenshtein Distance** algorithm (handles minor text formatting differences).
* **🌍 Localization & RTL Support**: Full support for **English** and **Hebrew** (Right-to-Left UI), including localized prompts and UI elements.
* **⚡ Performance Optimized**:
    * **LRU Caching**: Caches analysis results locally to prevent API rate limiting and reduce costs.
    * **Smart Parsing**: Uses a custom implementation of Mozilla's `Readability.js` to extract clean article text without ads or clutter.

## 🛠️ Tech Stack

* **Platform**: Chrome Extension (Manifest V3)
* **Core Logic**: Vanilla JavaScript (ES6+)
* **AI Backend**: Google Gemini API (Model: `gemini-2.5-flash`)
* **UI/Styling**: CSS3 (Glassmorphism, CSS Variables, Animations), HTML5
* **Content Extraction**: [Readability.js](https://github.com/mozilla/readability)
* **Storage**: `chrome.storage.local` with Quota Management

## 🚀 Getting Started

### Prerequisites

* **Google Chrome** or **Microsoft Edge** (Chromium based).
* A **Google Gemini API Key** (Free tier available). [Get one here](https://aistudio.google.com/app/apikey).

### Installation

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/yourusername/legit-extension.git](https://github.com/yourusername/legit-extension.git)
    cd legit-extension
    ```

2.  **Load into Chrome**
    * Open Chrome and navigate to `chrome://extensions/`.
    * Toggle **Developer mode** (top right corner).
    * Click **Load unpacked**.
    * Select the directory where you cloned the repository.

3.  **Setup**
    * Open the Chrome Side Panel (click the square icon next to your profile or press `Ctrl+B`).
    * Select "Legit" from the dropdown.
    * Enter your **Gemini API Key** and click Save.

## 💡 Usage

1.  Navigate to any news article (e.g., CNN, BBC, Fox News, or a blog).
2.  Open the **Legit** Side Panel.
3.  Click **"Analyze This Page"**.
4.  **View Results**:
    * **Overall Score**: A weighted 0-100 score indicating trustworthiness.
    * **Agent Breakdown**: Click on individual agents (e.g., "Bias Detection") to read detailed findings.
    * **Interactive Quotes**: Click on highlighted quotes in the analysis to find them in the text.
    * **Source Links**: Click on Green (Supporting) or Red (Contradicting) source links to verify claims externally.

## ⚙️ Architecture

The project follows a modular pattern:

* **`popup.js`**: Handles the main UI logic, orchestrates the analysis flow, and renders results.
* **`agents.js`**: Defines the "System Instructions" and "Prompts" for each AI agent (Source, Author, Bias, etc.).
* **`background.js`**: Acts as the bridge to the Gemini API, handles rate limiting, and manages the caching layer.
* **`contentHighlighter.js`**: Injected into the page to perform fuzzy text matching and DOM manipulation for highlighting.

## 🗺️ Roadmap

* [ ] **Export Reports**: Generate PDF/Markdown reports of the analysis.
* [ ] **History Tab**: View a timeline of previously analyzed articles.
* [ ] **Custom Agents**: Allow users to define their own focus (e.g., "Check for scientific accuracy").
* [ ] **Improved Text Extraction**: Enhance `extractTextWithNewlines` (currently WIP) for better formatting preservation.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

**Project Link:** [https://github.com/yourusername/legit-extension](https://github.com/yourusername/legit-extension)

---

<div align="center">
  <sub>Built with ❤️ for media literacy.</sub>
</div>