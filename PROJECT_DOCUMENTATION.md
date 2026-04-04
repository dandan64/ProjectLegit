# Legit - Technical Documentation & System Architecture

This document provides a comprehensive guide to the **Legit** Chrome Extension, detailing its multi-agent architecture, the analysis pipeline, and the underlying technical implementations.

---

## 🔍 Core Philosophy: Lateral Reading & SIFT
Unlike traditional "fact-checkers" that might only look at the content of a page, Legit is built on the principle of **Lateral Reading**. It employs the **SIFT** methodology:
1.  **S**top.
2.  **I**nvestigate the source.
3.  **F**ind better coverage.
4.  **T**race claims, quotes, and media to their original context.

The AI agents in this system are specifically instructed *not* to take the article at face value, but to use external search tools to verify the publisher's reputation and the consensus of the broader news ecosystem.

---

## 🗺️ Visual Flow: The Lifecycle of an Analysis

The following diagram illustrates the complete technical journey from the moment a user initiates an analysis to the interactive highlighting of verified facts.

```mermaid
flowchart TD
    %% Phase 1: Initiation & Extraction
    Start(["<b>1. Start Analysis</b><br/>User clicks 'Activate' in Popup"]) --> InjectRead["<b>2. Content Extraction</b><br/>Inject Readability.js into Tab"]
    InjectRead --> ParseDOM["<b>3. DOM Parsing</b><br/>Extract Clean Text, Title, Author,<br/>and Metadata using Mozilla Engine"]
    
    %% Phase 2: Orchestration
    ParseDOM --> Orchestrate["<b>4. Agent Orchestration</b><br/>Initialize Multi-Agent Suite<br/><i>(Source, Author, Bias, Consensus)</i>"]
    
    %% Phase 3: AI Analysis (Parallel)
    subgraph AI_Engine ["<b>5. Multi-Agent Intelligence Layer</b>"]
        direction TB
        Orchestrate --> Agent1["<b>Source Agent</b><br/>Lateral Reading & Funding"]
        Orchestrate --> Agent2["<b>Consensus Agent</b><br/>Cross-Checking Claims"]
        Orchestrate --> Agent3["<b>Author Agent</b><br/>Reputation Research"]
        Orchestrate --> Agent4["<b>Psychologist Agent</b><br/>Bias & Emotion Detection"]
        
        Agent1 & Agent2 & Agent3 & Agent4 --> API_Call["<b>6. API Communication</b><br/>Send message to background.js"]
    end
    
    %% Phase 4: Service Worker & External Tools
    subgraph Service_Worker ["<b>7. Background Logic</b>"]
        API_Call --> CacheCheck{"<b>Cache Check</b><br/>Recent Result?"}
        CacheCheck -- No --> Gemini["<b>Gemini 1.5/2.5 Flash</b><br/>with Google Search Tooling"]
        Gemini --> API_Return["Process Response"]
        CacheCheck -- Yes --> API_Return
    end
    
    %% Phase 5: Synthesis
    API_Return --> Summary["<b>8. Synthesis</b><br/>Summary Agent compiles final verdict<br/>and calculates weighted score"]
    
    %% Phase 6: UI Rendering
    Summary --> Render["<b>9. UI Rendering</b><br/>Update Side-panel with Glassmorphism<br/>Ratings & Deep-dive Explanations"]
    
    %% Phase 7: Interactive Highlighting
    Render --> UserClick(["<b>10. Interaction</b><br/>User clicks Citation Link"])
    UserClick --> InjectHighlighter["<b>11. Highlighter Injection</b><br/>Inject contentHighlighter.js"]
    
    subgraph Match_Engine ["<b>12. Fuzzy Match Engine</b>"]
        InjectHighlighter --> MatchExact["Exact String Match"]
        MatchExact -- Fail --> MatchWS["Whitespace-flexible Match"]
        MatchWS -- Fail --> MatchLev["<b>Levenshtein Distance</b><br/>Fuzzy Matching Algorithm"]
    end
    
    MatchLev & MatchWS & MatchExact --> Highlight["<b>13. Visual Feedback</b><br/>Scroll to View & Animated<br/>Highlight Insertion"]

    %% Styling
    classDef phase fill:#f5f5f5,stroke:#333,stroke-width:2px;
    classDef ai fill:#e1f5fe,stroke:#01579b,color:#01579b,stroke-width:2px;
    classDef logic fill:#fff3e0,stroke:#e65100,color:#e65100,stroke-width:2px;
    classDef visual fill:#e8f5e9,stroke:#2e7d32,color:#2e7d32,stroke-width:2px;
    
    class Start,InjectRead,ParseDOM,Orchestrate phase;
    class Agent1,Agent2,Agent3,Agent4,Summary ai;
    class API_Call,CacheCheck,Gemini,API_Return logic;
    class Render,UserClick,InjectHighlighter,MatchExact,MatchWS,MatchLev,Highlight visual;
    ```

---

## 🏗️ System Architecture

Legit is a Manifest V3 Chrome Extension organized into four primary layers:

### 1. The Orchestrator (`scripts/popup.js`)
The "brain" of the user interface. It manages the state of the analysis, triggers the agents in the correct sequence (handling dependencies), and calculates the final credibility score.

### 2. The Service Worker (`scripts/background.js`)
Acts as a secure proxy between the extension and the **Google Gemini API**. 
- **Security**: Manages API keys stored in `chrome.storage`.
- **Performance**: Implements a 30-minute in-memory cache and rate-limiting (30 requests/min).
- **Persistence**: Handles the long-term caching of results.

### 3. The Content Extractors (`scripts/Readability.js` & `scripts/contentHighlighter.js`)
- **Readability**: A port of Mozilla's engine that strips "clutter" (ads, menus) to extract clean article text for AI consumption.
- **Highlighter**: A specialized script injected into the webpage that uses the **Levenshtein Distance** algorithm to perform fuzzy text matching, allowing the extension to highlight quotes even if the page formatting has changed.

### 4. The Multi-Agent System (`scripts/agents.js`)
A collection of specialized AI personas, each with distinct "System Instructions" and expertise.

---

## 🌊 The Analysis Pipeline

The analysis flows through a structured, multi-stage pipeline:

### Phase 1: Extraction & Preparation
- The UI triggers `Readability.js` to get a clean text snapshot.
- The system identifies the domain, author, and title.

### Phase 2: Parallel Research (The "Newsroom")
Legit runs multiple agents concurrently. Some are **Background Agents** (doing research) and others are **UI Agents** (presenting findings).

| Agent | Type | Focus | Dependency |
| :--- | :--- | :--- | :--- |
| **Source Verify** | Background | Searches Google for publisher ownership/funding. | None |
| **Consensus Verify** | Background | Cross-checks facts against independent news outlets. | None |
| **Source Format** | UI | Formats raw research into readable citations. | `source-verify` |
| **Consensus Format** | UI | Links findings to supporting/contradicting sources. | `consensus-verify` |
| **The Profiler** | UI | Researches author credentials and professional history. | None |
| **The Psychologist** | UI | Analyzes text for emotional bias and loaded language. | None |
| **The Headline Critic**| UI | Detects clickbait by comparing title to body text. | None |

### Phase 3: Scoring & Synthesis
- **Weighting**: Factual consensus (25%) and Source reputation (20%) carry the highest weight, while style and headline carry less (10%).
- **Chief Analyst**: A final "Summary" agent reads all other agent findings to write a cohesive 2-4 sentence "Bottom Line" verdict.

---

## 🛠️ Key Technical Implementations

### 🧠 Intelligent Caching System
To optimize API usage, Legit uses a tiered caching strategy:
1.  **Session Cache**: Rapid access in `background.js`.
2.  **Persistent Cache**: Stored in `chrome.storage.local`.
3.  **Quota Management**: If storage hits the Chrome limit, the system automatically deletes the oldest 30% of cached items to make room for new analyses.

### 🔦 Fuzzy Quote Matching
Because news sites often update their text or have complex HTML, exact string matching often fails. Legit uses a **Levenshtein Distance** calculation in `contentHighlighter.js`. It breaks the article into word-windows and finds the segment with the lowest "edit distance" to the AI's quote, ensuring highlighting works even with minor discrepancies.

### 🌐 Localization Engine
The extension is fully bilingual (English/Hebrew).
- `localization.js` handles UI strings.
- `agents.js` dynamically alters the AI's prompt based on the detected language, ensuring that not just the UI, but the **AI analysis itself** is delivered in the user's preferred language.

---

## 📁 File Map

- **`manifest.json`**: Extension configuration and permissions.
- **`Legit.html` / `legit.css`**: The "Glassmorphism" side-panel UI.
- **`scripts/utils.js`**: Contains the mathematical scoring logic and UI component builders.
- **`_locales/`**: Standard Chrome translation files for the store and menu.
- **`Images/`**: Contains the visual assets used for both the UI and documentation.
