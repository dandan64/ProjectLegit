# Legit - Technical Architecture & Pipeline

This document provides a deep dive into the internal workings of **Legit**, explaining how the multi-agent AI system analyzes news credibility and how data flows through the extension.

---

## 🏗️ System Overview

Legit is a Chrome Extension (Manifest V3) built with a modular architecture. It leverages the **Google Gemini API** (specifically `gemini-2.0-flash`) to perform complex linguistic and factual analysis.

### Core Components

| Component | Responsibility |
| :--- | :--- |
| **Side Panel (`Legit.html`)** | The main user interface where analysis results are displayed. |
| **Orchestrator (`popup.js`)** | The "brain" of the UI. It extracts page data, triggers agents, manages dependencies, and calculates scores. |
| **Service Worker (`background.js`)** | Handles API communication, security (API keys), rate limiting, and cross-session caching. |
| **Agent Definitions (`agents.js`)** | Contains the specialized prompts and "System Instructions" for each AI persona. |
| **Content Script (`contentHighlighter.js`)** | Injected into the news article to perform fuzzy text matching and DOM-based highlighting. |
| **Parser (`Readability.js`)** | A port of Mozilla's Readability library used to strip "noise" (ads, nav) and extract the core article text. |

---

## 🌊 Data Flow Pipeline

The analysis process follows a strictly defined pipeline to ensure accuracy and efficiency:

### 1. Extraction Phase
When the user clicks "Analyze This Page":
- `popup.js` injects `Readability.js` into the active tab.
- It extracts the **Title**, **Author**, **Site Name**, and **Cleaned Body Text**.
- A "Snapshot" of the page is created, including metadata like the URL and domain.

### 2. Multi-Agent Orchestration
Legit doesn't just ask one question; it runs a "Newsroom" of specialized agents. Some agents depend on others, creating a multi-stage pipeline:

#### **Stage A: External Research (Background Agents)**
- **Source Investigator**: Uses Google Search to find the publisher's ownership, funding, and factual track record.
- **Fact-Checker (Consensus)**: Breaks the article into "Atomic Claims" and searches for independent corroboration or contradictions from other news outlets.

#### **Stage B: Analysis & Formatting (UI Agents)**
- **Citation Formatters**: Take the raw research from Stage A and rewrite it into human-readable paragraphs with **linked citations**.
- **The Profiler**: Researches the author's professional footprint (LinkedIn, Muck Rack).
- **The Psychologist (Bias)**: Scans the text for emotional manipulation and loaded language.
- **The Headline Critic**: Compares the headline's claims against the actual body text to detect clickbait.
- **The Editor (Style)**: Evaluates grammar, structure, and professional standards.

### 3. Scoring & Synthesis
- Each agent returns a **Rating** (e.g., `HIGHLY_CREDIBLE`, `SENSATIONAL`) and a numeric **Score**.
- `popup.js` applies a **Weighted Average** to calculate the final 0-100 Credibility Score.
- A final **Chief Analyst Agent** (Summary) synthesizes all findings into a 2-4 sentence executive summary.

### 4. Interactive Feedback
- **Fuzzy Highlighting**: If an agent quotes a specific sentence from the article, clicking that quote in the side panel uses a **Levenshtein Distance** algorithm in `contentHighlighter.js` to find and scroll to that exact text in the article, even if the formatting differs.

---

## 🛠️ Key Technical Features

### 🧠 Intelligent Caching
To save API costs and improve speed, Legit uses a two-tier cache:
1. **In-Memory Cache**: Stored in `background.js` for the current browser session.
2. **Persistent Cache**: Stored in `chrome.storage.local`, keyed by the article URL.

### 🔍 SIFT & Lateral Reading
The AI is instructed to use the **SIFT method** (Stop, Investigate the source, Find better coverage, Trace claims). It is explicitly told *not* to trust the article it is reading, but to look at what *other* reputable sources say about it.

### 🌐 Localization System
The project uses a custom localization engine (`localization.js`) that handles:
- **UI Strings**: Simple key-value pairs.
- **AI Prompts**: The agents actually switch their output language based on the user's preference, ensuring the analysis is delivered in the user's native tongue (English or Hebrew).

---

## 📁 File Structure Detail

- `_locales/`: Standard Chrome i18n folders.
- `Images/`: UI assets and documentation screenshots.
- `scripts/`:
    - `agents.js`: The "logic" of the AI personalities.
    - `background.js`: API proxy and caching.
    - `contentHighlighter.js`: DOM manipulation for quote finding.
    - `localization.js`: Helper for switching UI/AI languages.
    - `popup.js`: UI event listeners and agent execution loop.
    - `Readability.js`: Content extraction library.
    - `utils.js`: Shared helper functions (UI builders, string escaping).
- `Legit.html`: The layout of the Side Panel.
- `legit.css`: Modern "Glassmorphism" UI styling.
- `manifest.json`: Extension configuration (Permissions, Entry points).
