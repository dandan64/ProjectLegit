/**
 * @fileoverview Analysis pipeline orchestrator for the Legit Chrome Extension.
 *
 * Handles the full lifecycle of a fresh analysis run:
 *  1. Cache check → early return via loadFromCache() if hit.
 *  2. Page content extraction via injected Readability.js.
 *  3. Two-phase agent fanout (Phase A: parallel; Phase B: sequential dependents).
 *  4. Progressive card updates as each agent completes.
 *  5. Final weighted score display and summary generation.
 *  6. Cache persistence.
 *
 * All Gemini API calls are proxied through background.js so the API key
 * never touches this script's execution context.
 *
 * Extracted from the original popup.js DOMContentLoaded monolith.
 */

(() => {

// Shared state read by popup.js (newAnalysisBtn handler resets it)
window.analysisResults = null;

/**
 * Entry point for a full analysis run.
 *
 * Flow:
 *  1. Query the active tab.
 *  2. Check chrome.storage.local for a cached result — if found, render it
 *     immediately via loadFromCache() and return early.
 *  3. Otherwise inject Readability.js, extract page content, then fan out
 *     to all agents via runProgressiveAnalysis().
 *  4. Compute the final weighted score with displayOverallScore().
 *  5. Request the summary agent via generateFinalSummary().
 *  6. Persist the result to cache with saveToCache().
 *
 * @async
 * @returns {Promise<void>}
 */
async function startAnalysis() {
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");
    const activateBtn = document.getElementById("activateBtn");
    const overallScoreBox = document.getElementById('overallScore');
    const agentGrid = document.getElementById("agentGrid");

    let stopAnimation = null;
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");

        // 1. CHECK CACHE
        const cachedData = await checkCache(tab.url);

        if (cachedData) {
            showStatus(TRANSLATIONS[currentLang].loadingCache, "info");
            setTimeout(() => {
                loadFromCache(cachedData, tab.id);
                loader.style.display = "none";
            }, 500);
            return;
        }

        // 2. FRESH ANALYSIS
        showStatus(TRANSLATIONS[currentLang].analysis, "info");
        loader.style.display = "block";
        activateBtn.disabled = true;

        const pageData = await extractPageData(tab);

        if (!pageData.excerpt || pageData.excerpt.trim() === "") {
            throw new Error("No text found on this page to analyze.");
        }

        // Setup UI
        setupView.style.display = "none";
        resultsView.style.display = "flex";
        document.getElementById("scoreSpinner").style.display = "block";
        document.getElementById("scoreValue").style.display = "none";

        const scoreBar = document.getElementById("scoreBar");
        scoreBar.style.width = "0%";
        scoreBar.style.boxShadow = "none";
        scoreBar.style.backgroundColor = "#e5e7eb";

        const scoreLabel = document.getElementById("scoreLabel");
        scoreLabel.style.color = "#94a3b8";
        scoreLabel.classList.remove('score-final');
        scoreLabel.style.background = '';
        scoreLabel.style.webkitTextFillColor = '';
        scoreLabel.style.backgroundClip = '';
        scoreLabel.style.fontWeight = '';
        scoreLabel.style.filter = '';
        scoreLabel.style.backgroundImage = '';

        stopAnimation = startCalculatingAnimation(scoreLabel, TRANSLATIONS[currentLang].calculating);

        document.getElementById("scoreSummary").style.display = "none";

        displayPageHeader(pageData);

        const agents = getAnalysisAgents(pageData);

        window.analysisResults = {
            page: pageData,
            agents: agents,
            timestamp: new Date().toLocaleString(),
            score: 0
        };

        await runProgressiveAnalysis(agents);

        if (stopAnimation) stopAnimation();

        const finalScore = displayOverallScore(agents);
        window.analysisResults.score = finalScore;

        const summaryText = await generateFinalSummary(agents, finalScore);

        if (summaryText) {
            overallScoreBox.classList.remove('collapsed');
            overallScoreBox.classList.add('expanded');

            setTimeout(() => {
                agentGrid.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }

        window.analysisResults.summaryText = summaryText;

        // 3. SAVE TO CACHE
        saveToCache(tab.url, pageData, agents, finalScore, summaryText);

    } catch (err) {
        console.error("Analysis error:", err);

        if (stopAnimation) stopAnimation();

        showStatus(`❌ Error: ${err.message}`, "error");
        document.getElementById("activateBtn").disabled = false;
    } finally {
        const loader = document.getElementById("loader");
        if (loader.style.display === "block") {
            loader.style.display = "none";
        }
    }
}

/**
 * Injects Mozilla Readability into the active tab and extracts clean article data.
 *
 * The function runs in two scripting steps:
 *  1. Inject scripts/Readability.js as a file so its constructor is available.
 *  2. Execute an inline function that clones the document, parses it with
 *     Readability, and returns a plain serialisable object.
 *
 * Fallback behaviour: if Readability is unavailable or fails to parse, the
 * function falls back to document.body.innerText and sets author to "Unknown".
 *
 * @async
 * @param {chrome.tabs.Tab} tab - The active Chrome tab to extract content from.
 * @returns {Promise<Object>} Page data with keys: title, domain, author,
 *   bodyText, excerptStart, excerptEnd, excerpt, url.
 * @throws {Error} If the tab is a browser system page, or if scripting fails.
 */
async function extractPageData(tab) {
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
        throw new Error("Cannot analyze browser system pages.");
    }

    try {
        // 1. Inject the Readability library into the page
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/Readability.js']
        });

        // 2. Run the extraction using Readability
        const [scriptResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (typeof Readability === 'undefined') {
                    return { text: document.body.innerText, author: "Unknown" };
                }

                const documentClone = document.cloneNode(true);
                const reader = new Readability(documentClone);
                const article = reader.parse();

                if (!article) {
                    return {
                        text: document.body.innerText.replace(/\s+/g, ' ').trim(),
                        author: "Unknown"
                    };
                }

                return {
                    text: article.textContent.replace(/\s+/g, ' ').trim(),
                    title: article.title,
                    author: article.byline || "Unknown",
                    siteName: article.siteName
                };
            }
        });

        const data = scriptResult?.result || { text: "", author: "Unknown" };
        const bodyText = data.text || "";

        console.log("Extracted page text:", bodyText);
        const excerptStart = bodyText;
        const excerptEnd = bodyText.length > 1500 ? bodyText.slice(-1500) : "";

        return {
            title: data.title || tab.title,
            domain: new URL(tab.url).hostname,
            author: data.author,
            bodyText: bodyText,
            excerptStart: excerptStart,
            excerptEnd: excerptEnd,
            excerpt: excerptStart,
            url: tab.url
        };

    } catch (e) {
        console.error("Extraction Error:", e);
        throw new Error("Failed to read page content. Ensure 'scripts/Readability.js' exists.");
    }
}

/**
 * Orchestrates the two-phase agent execution pipeline and progressively
 * renders results into the side-panel UI.
 *
 * Phase A – Parallel (background + independent regular agents):
 *   Background agents call the service worker silently; their output is
 *   stored in agentResults for injection into dependent agents.
 *   Independent regular agents run simultaneously and update their cards
 *   as soon as they complete.
 *
 * Phase B – Sequential (dependent agents):
 *   Agents with a dependsOn field are run one by one after Phase A.
 *   The parent agent's explanation string is substituted into the child
 *   agent's prompt via a {INPUT_FROM_<PARENT_ID>} placeholder.
 *
 * @async
 * @param {Array<Object>} agents - Agent configurations from getAnalysisAgents().
 * @returns {Promise<void>}
 */
async function runProgressiveAnalysis(agents) {
    const agentGrid = document.getElementById("agentGrid");
    agentGrid.innerHTML = "";

    // 1. SPLIT AGENTS
    const activeAgents = agents.filter(a => a.id !== 'summary');
    const backgroundAgents = activeAgents.filter(a => a.isBackgroundAgent);
    const regularAgents = activeAgents.filter(a => !a.isBackgroundAgent);

    // 2. Initial Layout: Create Cards for Regular Agents
    const sorted = [...regularAgents].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const agent of sorted) {
        const card = createAgentCard(agent);
        agentGrid.appendChild(card);
    }

    const agentResults = {};

    // 3. Define Batches
    const independentAgents = sorted.filter(a => !a.dependsOn);
    const dependentAgents = activeAgents.filter(a => a.dependsOn);

    // --- PHASE A: Parallel Execution (Background + Independent) ---
    const parallelPromises = [
        ...backgroundAgents.map(async agent => {
            console.log(`⚙️ Running background agent: ${agent.id}`);
            try {
                const response = await chrome.runtime.sendMessage({
                    type: "CALL_GEMINI",
                    systemInstruction: agent.systemInstruction,
                    prompt: agent.prompt,
                    useSearch: agent.useSearch,
                    tokensBudget: agent.tokenBudget
                });

                if (response.error) throw new Error(response.error);

                const result = parseAgentResponse(response.result);
                agent.result = result;
                agentResults[agent.id] = result;
                console.log(`✅ Background agent complete: ${agent.id}`);
            } catch (err) {
                console.error(`❌ Background agent failed: ${agent.id}`, err);
                agentResults[agent.id] = null;
            }
        }),

        ...independentAgents.map(async agent => {
            await analyzeAgent(agent);
            if (agent.result) agentResults[agent.id] = agent.result;
        })
    ];

    await Promise.all(parallelPromises);

    // --- PHASE B: Sequential Execution (Dependent) ---
    console.log(`⏳ Running ${dependentAgents.length} dependent agents sequentially`);

    for (const agent of dependentAgents) {
        console.log(`⏳ Running dependent agent: ${agent.id} (depends on ${agent.dependsOn})`);

        if (agent.dependsOn && agentResults[agent.dependsOn]) {
            const parentResult = agentResults[agent.dependsOn];
            const placeholder = `{INPUT_FROM_${agent.dependsOn.toUpperCase().replace(/-/g, '_')}}`;
            agent.prompt = agent.prompt.replace(placeholder, parentResult.explanation);

            if (!agent.isBackgroundAgent) {
                await analyzeAgent(agent);
                if (agent.result) agentResults[agent.id] = agent.result;
            }
        } else {
            console.warn(`Skipping ${agent.id} because dependency ${agent.dependsOn} is missing.`);
        }
    }
}

/**
 * Runs a single regular agent and updates its UI card with the result.
 *
 * Steps:
 *  1. Send the agent's prompt to the background service worker.
 *  2. Parse the RATING: / EXPLANATION: response via parseAgentResponse().
 *  3. Apply a score-based CSS class to the card (score-high/good/medium/low).
 *  4. Linkify inline [[QUOTE::…::QUOTE]] and [[SOURCE::…::SOURCE]] tags.
 *  5. Trigger a dynamic sort so lower-scoring agents float to the top.
 *
 * On error, the card shows an error badge and score is set to 0.
 *
 * @async
 * @param {Object} agent - A single agent config object (mutated: .result is set).
 * @returns {Promise<void>}
 */
async function analyzeAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    const headerDiv = card.querySelector(".agent-header");
    const textWrapper = card.querySelector(".agent-text-wrapper");
    const contentDiv = card.querySelector(".agent-content");
    const loaderDiv = card.querySelector(".agent-loader");

    try {
        const response = await chrome.runtime.sendMessage({
            type: "CALL_GEMINI",
            systemInstruction: agent.systemInstruction,
            prompt: agent.prompt,
            useSearch: agent.useSearch,
            tokensBudget: agent.tokenBudget
        });

        loaderDiv.style.display = "none";

        if (response.error) throw new Error(response.error);

        const result = parseAgentResponse(response.result);
        agent.result = result;

        card.setAttribute("data-score", result.score);

        card.classList.remove("priority-high", "priority-medium", "priority-low");
        if (result.score >= 80) card.classList.add("score-high");
        else if (result.score >= 60) card.classList.add("score-good");
        else if (result.score >= 40) card.classList.add("score-medium");
        else card.classList.add("score-low");

        const badgeHtml = `<span class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</span>`;
        const chevronHtml = `<span class="toggle-icon">▼</span>`;

        textWrapper.insertAdjacentHTML('beforeend', badgeHtml);
        headerDiv.insertAdjacentHTML('beforeend', chevronHtml);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        let linkedExplanation = result.explanation;
        if (agent.id === 'bias' || agent.id === 'style') {
            linkedExplanation = parseAndLinkifyQuotes(result.explanation, tab.id);
        }

        if (agent.id === 'consensus-format' || agent.id === 'source-format') {
            linkedExplanation = parseAndLinkifySources(linkedExplanation);
        }

        contentDiv.innerHTML = `<div class="agent-explanation">${linkedExplanation}</div>`;

        setTimeout(() => attachQuoteLinkListeners(), 100);
        setTimeout(() => attachSourceLinkListeners(), 100);

        card.classList.add("completed");
        sortGridDynamic();

    } catch (err) {
        loaderDiv.style.display = "none";
        textWrapper.insertAdjacentHTML('beforeend', `<span class="rating-badge rating-error">Error</span>`);
        contentDiv.innerHTML = `<div class="agent-error">⚠️ ${escapeHtml(err.message)}</div>`;
        contentDiv.style.display = "block";

        agent.result = { rating: "ERROR", explanation: err.message, score: 0 };
        card.setAttribute("data-score", 0);
        card.classList.add("score-low");
        card.classList.add("completed");
        sortGridDynamic();
    }
}

window.startAnalysis = startAnalysis;

})();
