// popup.js - Final Version: Caching, Search, 4-Tier Scoring, Export

document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");

    // Language Switcher (Fixed Top Left)
    const langSwitcher = document.querySelector(".lang-switch");
    const langEnBtn = document.getElementById("langEn");
    const langHeBtn = document.getElementById("langHe");

    const overallScoreBox = document.getElementById('overallScore');
    const scoreHeader = overallScoreBox.querySelector('.score-header');

    // Initialize as collapsed
    overallScoreBox.classList.add('collapsed');

    // Click handler for accordion
    scoreHeader.addEventListener('click', function() {
        overallScoreBox.classList.toggle('expanded');
        overallScoreBox.classList.toggle('collapsed');

        if (overallScore.classList.contains('expanded')) {
                setTimeout(() => {
                    agentGrid.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100); // Wait for expansion animation to start
            }
        
        if (overallScore.classList.contains('collapsed')) {
                setTimeout(() => {
                    resultsView.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100); // Wait for expansion animation to start
            }
    });

    // global variable for export
    let analysisResults = null;

    // Initialize: check for existing API key
    chrome.storage.local.get(["geminiApiKey"], (res) => {
        if (res.geminiApiKey) {
            activateBtn.disabled = false;
            statusMsg.textContent = TRANSLATIONS[currentLang].apiKeySaved;
            statusMsg.className = "status success";
            statusMsg.style.opacity = "1";
        }
    });

    // Save API key handler
    saveBtn.addEventListener("click", () => {
        const key = apiInput.value.trim();
        if (!key) {
            showStatus(TRANSLATIONS[currentLang].noKey, "error");
            return;
        }
        chrome.storage.local.set({ geminiApiKey: key }, () => {
            showStatus(TRANSLATIONS[currentLang].apiKeySaved, "success");
            activateBtn.disabled = false;
            apiInput.value = "";
            setTimeout(() => statusMsg.style.opacity = "0", 2000);
        });
    });

    langEnBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) removeFromCache(tab.url);
        setLanguage('en');
    });

    langHeBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) removeFromCache(tab.url);
        setLanguage('he');
    });

    // Load saved language on start
    chrome.storage.local.get(["legitLang"], (res) => {
        if (res.legitLang) {
            setLanguage(res.legitLang);
        }
    });

    // Main analysis button
    activateBtn.addEventListener("click", async () => {
        await startAnalysis();
    });

    function showStatus(message, type) {
        statusMsg.textContent = message;
        statusMsg.className = `status ${type}`;
        statusMsg.style.opacity = "1";
    }

    // --- MAIN LOGIC ---

    async function startAnalysis() {
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
            
            // Check if page extraction actually got text
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

            // RESET: Remove the final style so "Calculating..." looks normal
            scoreLabel.classList.remove('score-final'); 
            scoreLabel.style.backgroundImage = '';     
            scoreLabel.style.filter = '';

            stopAnimation = startCalculatingAnimation(scoreLabel, TRANSLATIONS[currentLang].calculating);

            const summaryDiv = document.getElementById("scoreSummary");
            summaryDiv.style.display = "none";
            
            displayPageHeader(pageData);

            const agents = getAnalysisAgents(pageData);

            // Store for export later
            analysisResults = {
                page: pageData,
                agents: agents,
                timestamp: new Date().toLocaleString(),
                score: 0
            };

            await runProgressiveAnalysis(agents);

            if (stopAnimation) stopAnimation();
            
            const finalScore = displayOverallScore(agents);
            
            // Update export score
            analysisResults.score = finalScore;

            const summaryText = await generateFinalSummary(agents, finalScore);
            
            analysisResults.summaryText = summaryText;

            // 3. SAVE TO CACHE
            saveToCache(tab.url, pageData, agents, finalScore, summaryText);

        } catch (err) {
            console.error("Analysis error:", err);
            showStatus(`❌ Error: ${err.message}`, "error");
            activateBtn.disabled = false;
        } finally {
            if (loader.style.display === "block") {
                loader.style.display = "none";
            }
        }
    }

    // Safely Extract Data using Mozilla Readability
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
                    // Check if Readability loaded correctly
                    if (typeof Readability === 'undefined') {
                        // Fallback if library failed to load
                        return { text: document.body.innerText, author: "Unknown" };
                    }

                    // Create a clone of the document to avoid modifying the actual page
                    const documentClone = document.cloneNode(true);
                    
                    // Initialize Readability
                    const reader = new Readability(documentClone);
                    const article = reader.parse();

                    // If Readability fails, fallback to body text
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
            // Slice for tokens
            const excerptStart = bodyText;
            const excerptEnd = bodyText.length > 1500 ? bodyText.slice(-1500) : "";

            return {
                title: data.title || tab.title, // Use Readability title or Tab title
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

    async function runProgressiveAnalysis(agents) {
        const agentGrid = document.getElementById("agentGrid");
        agentGrid.innerHTML = "";

        // 1. SPLIT AGENTS
        // Filter out Background agents AND the Summary agent (it runs later)
        // We use the flag 'isSummaryAgent' or check the ID explicitly
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
        const dependentAgents = activeAgents.filter(a => a.dependsOn); // Includes background dependents

        // --- PHASE A: Parallel Execution (Background + Independent) ---
        const parallelPromises = [
            // Background Agents
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
            
            // Independent Regular Agents
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
            
            // Inject Dependency
            if (agent.dependsOn && agentResults[agent.dependsOn]) {
                const parentResult = agentResults[agent.dependsOn];
                const placeholder = `{INPUT_FROM_${agent.dependsOn.toUpperCase().replace(/-/g, '_')}}`;
                agent.prompt = agent.prompt.replace(placeholder, parentResult.explanation);
                
                // If the dependent agent is a background agent, run it manually
                if (agent.isBackgroundAgent) {
                     // ... (copy background logic here if needed, or assume manual run)
                } else {
                    await analyzeAgent(agent);
                    if (agent.result) agentResults[agent.id] = agent.result;
                }
            } else {
                 console.warn(`Skipping ${agent.id} because dependency ${agent.dependsOn} is missing.`);
            }
        }
    }

    // Analyze individual agent (Updated for Dynamic Sorting)
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

            // --- IMPORTANT: Save Score to DOM for Sorting ---
            card.setAttribute("data-score", result.score);

            // Colors
            card.classList.remove("priority-high", "priority-medium", "priority-low");
            if (result.score >= 80) card.classList.add("score-high");
            else if (result.score >= 60) card.classList.add("score-good");
            else if (result.score >= 40) card.classList.add("score-medium");
            else card.classList.add("score-low");

            const badgeHtml = `<span class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</span>`;
            const chevronHtml = `<span class="toggle-icon">▼</span>`;
            
            textWrapper.insertAdjacentHTML('beforeend', badgeHtml);
            headerDiv.insertAdjacentHTML('beforeend', chevronHtml);

            //new of trying to link quotes 
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // for bias agent
            let linkedExplanation = result.explanation;
            if(agent.id === 'bias') {
                linkedExplanation = parseAndLinkifyQuotes(result.explanation, tab.id);
            }
            
            //for consensus agent
            if (agent.id === 'consensus-format') {
                linkedExplanation = parseAndLinkifySources(linkedExplanation);
            } 

            if(agent.id === 'style') {
                linkedExplanation = parseAndLinkifyQuotes(result.explanation, tab.id);
            }

            contentDiv.innerHTML = `<div class="agent-explanation">${linkedExplanation}</div>`;

            setTimeout(() => attachQuoteLinkListeners(), 100);
            setTimeout(() => attachSourceLinkListeners(), 100);


            card.classList.add("completed");

            // --- TRIGGER DYNAMIC SORT ---
            sortGridDynamic();

        } catch (err) {
            loaderDiv.style.display = "none";
            textWrapper.insertAdjacentHTML('beforeend', `<span class="rating-badge rating-error">Error</span>`);
            contentDiv.innerHTML = `<div class="agent-error">⚠️ ${escapeHtml(err.message)}</div>`;
            contentDiv.style.display = "block";

            
            agent.result = { rating: "ERROR", explanation: err.message, score: 0 };
            
            // Set error score to 0 so it bubbles to top
            card.setAttribute("data-score", 0);
            card.classList.add("score-low");
            card.classList.add("completed");
            
            // Re-sort on error too
            sortGridDynamic();
        }
    }

    document.getElementById('reanalyzeBtn')?.addEventListener('click', async () => {
        // re-set UI
        const scoreBox = document.getElementById('overallScore');
        scoreBox.classList.remove('expanded');
        
        const btn = document.getElementById('reanalyzeBtn');

        btn.disabled = true;
        btn.innerHTML = TRANSLATIONS[currentLang].reanalyzing;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url) {
                await removeFromCache(tab.url);
                await startAnalysis();
            }
        } catch (error) {
            console.error("Re-analysis failed:", error);
        } finally {
            btn.disabled = false;
            // Translate back or hardcode text
            const originalText = TRANSLATIONS && TRANSLATIONS[currentLang] 
                ? TRANSLATIONS[currentLang].reanalyzeBtn 
                : "🔄Re-Analyze Page";
            btn.innerHTML = originalText || "🔄 Re-Analyze Page";
        }
    });

    // Updated Reset Functionality with Cache Clearing
    document.getElementById("newAnalysisBtn")?.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if(tabs[0]) {
                const url = tabs[0].url;
            
                setupView.style.display = "flex";
                resultsView.style.display = "none";
                statusMsg.style.opacity = "0";
                activateBtn.disabled = false;
                analysisResults = null;
            }
        });
    });
});