// popup.js - Final Version: Caching, Search, 4-Tier Scoring, Export

document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");

    // global variable for export
    let analysisResults = null;

    // Initialize: check for existing API key
    chrome.storage.local.get(["geminiApiKey"], (res) => {
        if (res.geminiApiKey) {
            activateBtn.disabled = false;
            statusMsg.textContent = "✅ API key saved - Ready to analyze";
            statusMsg.className = "status success";
        }
    });

    // Save API key handler
    saveBtn.addEventListener("click", () => {
        const key = apiInput.value.trim();
        if (!key) {
            showStatus("❌ Please enter an API key", "error");
            return;
        }
        chrome.storage.local.set({ geminiApiKey: key }, () => {
            showStatus("✅ API key saved successfully!", "success");
            activateBtn.disabled = false;
            apiInput.value = "";
            setTimeout(() => statusMsg.style.opacity = "0", 2000);
        });
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

    // --- CACHING FUNCTIONS ---

    function getCacheKey(url) {
        return `legit_cache_${url}`;
    }

    function saveToCache(url, pageData, agents, score) {
        const key = getCacheKey(url);
        const cacheData = {
            timestamp: Date.now(),
            pageData: pageData,
            agents: agents,
            score: score
        };
        chrome.storage.local.set({ [key]: cacheData });
    }

    // NEW FUNCTION: Removes specific URL from cache
    function removeFromCache(url) {
        const key = getCacheKey(url);
        chrome.storage.local.remove(key, () => {
            console.log("Cache cleared for:", url);
        });
    }

    async function checkCache(url) {
        const key = getCacheKey(url);
        const data = await chrome.storage.local.get(key);
        const cached = data[key];

        if (cached) {
            // Cache is valid for 24 hours
            const oneDay = 24 * 60 * 60 * 1000;
            if (Date.now() - cached.timestamp < oneDay) {
                return cached;
            }
        }
        return null;
    }

    // --- MAIN LOGIC ---

    async function startAnalysis() {
        loader.style.display = "block";
        activateBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            // 1. CHECK CACHE
            const cachedData = await checkCache(tab.url);

            if (cachedData) {
                showStatus("⚡ Loading cached results...", "info");
                setTimeout(() => {
                    loadFromCache(cachedData);
                    loader.style.display = "none";
                }, 500);
                return;
            }

            // 2. FRESH ANALYSIS
            showStatus("🔍 Starting fresh analysis...", "info");

            const pageData = await extractPageData(tab);
            
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
            scoreLabel.textContent = "Calculating...";
            scoreLabel.style.color = "#94a3b8"; 
            
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
            
            const finalScore = displayOverallScore(agents);
            
            // Update export score
            analysisResults.score = finalScore;

            // 3. SAVE TO CACHE
            saveToCache(tab.url, pageData, agents, finalScore);

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

    function loadFromCache(cacheData) {
        setupView.style.display = "none";
        resultsView.style.display = "flex";

        // Restore global data for export
        analysisResults = {
            page: cacheData.pageData,
            agents: cacheData.agents,
            timestamp: new Date(cacheData.timestamp).toLocaleString(),
            score: cacheData.score
        };

        displayPageHeader(cacheData.pageData);

        const header = document.getElementById("pageHeader");
        if (!document.getElementById("cacheBadge")) {
            header.insertAdjacentHTML('beforeend', `<div id="cacheBadge" style="font-size:11px; color:#0d9488; margin-top:5px; font-weight:600;">⚡ Result from previous scan</div>`);
        }

        const agentGrid = document.getElementById("agentGrid");
        agentGrid.innerHTML = "";

        const sorted = [...cacheData.agents].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        sorted.forEach(agent => {
            const card = createCompletedAgentCard(agent);
            agentGrid.appendChild(card);
        });

        displayOverallScore(cacheData.agents);
    }

    function createCompletedAgentCard(agent) {
        const card = document.createElement("div");
        const result = agent.result;
        
        let scoreClass = "score-low";
        if (result.score >= 80) scoreClass = "score-high";
        else if (result.score >= 60) scoreClass = "score-good";
        else if (result.score >= 40) scoreClass = "score-medium";

        card.className = `agent-card completed ${scoreClass}`;
        card.id = `agent-${agent.id}`;
        
        card.innerHTML = `
            <div class="agent-header">
                <span class="agent-icon">${agent.icon}</span>
                <span class="agent-name">${agent.name}</span>
                <span class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="agent-content">
                <div class="agent-explanation">${escapeHtml(result.explanation)}</div>
            </div>
        `;
        
        card.addEventListener("click", () => {
            card.classList.toggle("expanded");
        });
        
        return card;
    }

    async function extractPageData(tab) {
        const [titleResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.title
        });

        const [domainResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.location.hostname
        });

        const [scriptResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                let author = "Unknown";
                const metaAuthor = document.querySelector('meta[name="author"]');
                if (metaAuthor) author = metaAuthor.content;
                if (author === "Unknown") {
                    const ogAuthor = document.querySelector('meta[property="article:author"]');
                    if (ogAuthor) author = ogAuthor.content;
                }
                if (author === "Unknown") {
                    const selector = document.querySelector('a[rel="author"], .author, .byline, .author-name, .writer');
                    if (selector) author = selector.innerText.trim();
                }
                const article = document.querySelector('article');
                const main = document.querySelector('main');
                const content = article || main || document.body;
                return { text: content.innerText, author: author };
            }
        });

        const data = scriptResult?.result || { text: "", author: "Unknown" };
        const bodyText = data.text;
        const excerpt = bodyText.length > 1200 ? bodyText.slice(0, 1200) + "..." : bodyText;

        return {
            title: titleResult?.result?.trim() || "Unknown Page",
            domain: domainResult?.result || "unknown",
            author: data.author,
            excerpt: excerpt,
            url: tab.url
        };
    }

    function displayPageHeader(pageData) {
        const headerDiv = document.getElementById("pageHeader");
        // Remove old cache badge if it exists (for fresh scans)
        const existingBadge = document.getElementById("cacheBadge");
        if (existingBadge) existingBadge.remove();

        headerDiv.innerHTML = `
            <div class="page-title">${escapeHtml(pageData.title)}</div>
            <div class="page-domain">📍 ${escapeHtml(pageData.domain)}</div>
        `;
    }

    function getAnalysisAgents(pageData) {
        const longExcerpt = pageData.excerpt.slice(0, 1500);
        const shortExcerpt = pageData.excerpt.slice(0, 600);
        const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

        return [
            {
                id: "source",
                name: "Source Credibility",
                icon: "🏛️",
                priority: "high",
                weight: 0.15,
                useSearch: true,
                prompt: `Act as a Media Intelligence Analyst. Use Google Search to evaluate the reputation of the domain "${pageData.domain}".
Current Date: ${today}
Your Task:
1. Search for this domain's history of retractions, satire status, or ownership.
2. Identify if it is a known state-sponsored outlet or content farm.
Rate as: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, or UNRELIABLE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences) citing the domain's known history and reputation.]`
            },
            {
                id: "author",
                name: "Author Analysis",
                icon: "👤",
                priority: "medium",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
Detected Author Name: "${pageData.author}"
Domain: "${pageData.domain}"
Content Snippet: "${shortExcerpt}"
Your Task:
1. If the "Detected Author Name" above is "Unknown", try to find it in the content snippet.
2. If found, search for their name + domain. 
3. Determine if they are a real person with a journalistic track record or a fake persona/admin.
Rate as: EXPERT, JOURNALIST, CITIZEN_JOURNALIST, ANONYMOUS, or SUSPICIOUS
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the author is a verifiable expert or note the lack of accountability.]`
            },
            {
                id: "consensus",
                name: "Cross-Verification",
                icon: "🌐",
                priority: "high",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as a Fact-Checking Researcher. Use Google Search to cross-reference this story: "${pageData.title}".
Current Date: ${today}
Your Task:
1. Search for this specific headline to see if major outlets (Reuters, AP, BBC) are reporting it.
2. Check if Snopes or other fact-checkers have already debunked this.
3. Verify if the core premise contradicts established consensus found in search results.
Rate as: CORROBORATED, PLAUSIBLE, UNIQUE_REPORTING, UNVERIFIABLE, or CONTRADICTS_CONSENSUS
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). List specific major outlets that are (or are not) reporting this story.]`
            },
            {
                id: "headline",
                name: "Headline Analysis",
                icon: "📰",
                priority: "high",
                weight: 0.10,
                useSearch: false,
                prompt: `Act as a Senior Editor. Analyze if this headline is fair or manipulative:
Current Date: ${today}
Headline: "${pageData.title}"
Content Snippet: "${shortExcerpt}"
Your Task:
1. Does the headline exaggerate the content?
2. Does it use "Clickbait" tactics (e.g., "You won't believe...", ALL CAPS)?
3. Does it accurately reflect the story?
Rate as: ACCURATE, MOSTLY_ACCURATE, SOMEWHAT_MISLEADING, CLICKBAIT, or DECEPTIVE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) critiquing the headline's accuracy and framing.]`
            },
            {
                id: "sources",
                name: "Source Attribution",
                icon: "📎",
                priority: "high",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as an Academic Reviewer. Use Google Search to verify the citations in this text:
Current Date: ${today}
"${longExcerpt}"
Your Task:
1. If specific studies or reports are mentioned, search to see if they actually exist.
2. Verify if the text misrepresents the cited source's conclusion.
3. Flag vague attributions like "experts say" if no specific experts are named.
Rate as: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, or UNSOURCED
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the citations found in the text are real and accurate.]`
            },
            {
                id: "accuracy",
                name: "Factual Accuracy",
                icon: "✓",
                priority: "high",
                weight: 0.15,
                useSearch: true,
                prompt: `Act as a Logic & Fact Checker. Use Google Search to verify the specific claims in this text:
Current Date: ${today}
SYSTEM OVERRIDE / WORLD STATE UPDATE: Your internal training data is outdated. You MUST trust Google Search results over your internal memory for current events, political positions, economic data, recent developments etc.
Your Task:
1. Extract key claims (names, dates, titles, statistics).
2. SEARCH GOOGLE for these specific details combined with the current year ("${new Date().getFullYear()}").
3. If search results confirm the text, mark it as ACCURATE.
Text: "${longExcerpt}"
Rate as: ACCURATE, MOSTLY_ACCURATE, UNVERIFIABLE, CONTAINS_ERRORS, or MISLEADING
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Cite the specific search result that confirmed or debunked the claim.]`
            },
            {
                id: "tone",
                name: "Emotional Tone",
                icon: "🎭",
                priority: "medium",
                weight: 0.10,
                useSearch: false,
                prompt: `Act as a Sentiment Analyst. Evaluate the emotional charge of this text:
Current Date: ${today}
"${longExcerpt}"
Your Task:
1. Is the language neutral and objective?
2. Does it use "Loaded Language" designed to trigger fear, anger, or outrage?
3. Is it mocking or derogatory?
Rate as: NEUTRAL, SLIGHTLY_EMOTIONAL, EMOTIONAL, or HIGHLY_MANIPULATIVE
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) analyzing the specific emotional language and intent.]`
            },
            {
                id: "bias",
                name: "Bias Detection",
                icon: "⚖️",
                priority: "medium",
                weight: 0.10,
                useSearch: false,
                prompt: `Act as a Political Analyst. Detect the political or ideological leaning of this text:
Current Date: ${today}
"${longExcerpt}"
Domain: ${pageData.domain}
Your Task:
1. Identify if the framing favors a specific political agenda (Left/Right/etc).
2. Does it present a balanced view of opposing arguments?
3. Is it omitted context to favor one side?
Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) identifying the specific slant, agenda, or omitted context.]`
            },
            {
                id: "style",
                name: "Writing Quality",
                icon: "✍️",
                priority: "low",
                weight: 0.05,
                useSearch: false,
                prompt: `Act as a Copy Editor. Evaluate the professional standard of this text:
Current Date: ${today}
"${shortExcerpt}"
Your Task:
1. Check for basic grammar and spelling errors.
2. Does it follow standard journalistic structure (inverted pyramid)?
3. Does it read like a professional report, a blog rant, or AI-generated spam?
Rate as: PROFESSIONAL, ADEQUATE, SENSATIONALIST, or POOR_QUALITY
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, reasoning-based explanation (3-4 sentences) assessing the professionalism and structure of the writing.]`
            },
            {
                id: "freshness",
                name: "Content Freshness",
                icon: "📅",
                priority: "low",
                weight: 0.05,
                useSearch: true,
                prompt: `Act as a News Archivist. Use Google Search to verify the timeline of this story against the Current Date: ${today}.
Headline: "${pageData.title}"
Content: "${shortExcerpt}"
Your Task:
1. Determine if this is a ONE-TIME event or a RECURRING event (e.g., sports match, election, political positions/meetings, annual festival).
2. If RECURRING: Search for specific details in the text (etc. scores, specific quotes, unique incidents) to see if they match a *recent* instance (within the last week).
3. If ONE-TIME: Check if this exact story is years old and being reposted as "breaking" (rage-baiting).
Rate as: CURRENT, RECENT, DATED, or RECYCLED
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). Explicitly state if this is a fresh instance of a recurring event or a repost of old news.]`
            }
        ];
    }

    async function runProgressiveAnalysis(agents) {
        const agentGrid = document.getElementById("agentGrid");
        agentGrid.innerHTML = "";

        const sorted = [...agents].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        for (const agent of sorted) {
            const card = createAgentCard(agent);
            agentGrid.appendChild(card);
        }

        const promises = sorted.map(agent => analyzeAgent(agent));
        await Promise.all(promises);
    }

    function createAgentCard(agent) {
        const card = document.createElement("div");
        card.className = `agent-card priority-${agent.priority}`;
        card.id = `agent-${agent.id}`;
        card.innerHTML = `
            <div class="agent-header">
                <span class="agent-icon">${agent.icon}</span>
                <span class="agent-name">${agent.name}</span>
                <div class="agent-loader"></div>
            </div>
            <div class="agent-content">
                <div class="agent-loading">Analyzing...</div>
            </div>
        `;
        return card;
    }

    async function analyzeAgent(agent) {
        const card = document.getElementById(`agent-${agent.id}`);
        const headerDiv = card.querySelector(".agent-header");
        const contentDiv = card.querySelector(".agent-content");
        const loaderDiv = card.querySelector(".agent-loader");

        try {
            const response = await chrome.runtime.sendMessage({
                type: "CALL_GEMINI",
                prompt: agent.prompt,
                useSearch: agent.useSearch
            });

            loaderDiv.style.display = "none";

            if (response.error) {
                throw new Error(response.error);
            }

            const result = parseAgentResponse(response.result);
            agent.result = result;

            card.classList.remove("priority-high", "priority-medium", "priority-low");
            if (result.score >= 80) {
                card.classList.add("score-high");
            } else if (result.score >= 60) {
                card.classList.add("score-good");
            } else if (result.score >= 40) {
                card.classList.add("score-medium");
            } else {
                card.classList.add("score-low");
            }

            const badgeHtml = `<span class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</span>`;
            const chevronHtml = `<span class="toggle-icon">▼</span>`;
            
            headerDiv.insertAdjacentHTML('beforeend', badgeHtml + chevronHtml);
            contentDiv.innerHTML = `<div class="agent-explanation">${escapeHtml(result.explanation)}</div>`;

            card.addEventListener("click", () => {
                card.classList.toggle("expanded");
            });

            card.classList.add("completed");

        } catch (err) {
            loaderDiv.style.display = "none";
            headerDiv.insertAdjacentHTML('beforeend', `<span class="rating-badge rating-error">Error</span>`);
            contentDiv.innerHTML = `<div class="agent-error">⚠️ ${escapeHtml(err.message)}</div>`;
            contentDiv.style.display = "block";
            agent.result = { rating: "ERROR", explanation: err.message, score: 0 };
            card.classList.add("score-low");
        }
    }

    function parseAgentResponse(text) {
        const ratingMatch = text.match(/RATING:\s*([A-Z_]+)/i);
        const explanationMatch = text.match(/EXPLANATION:\s*(.+?)(?=\n\n|$)/is);

        const rating = ratingMatch ? ratingMatch[1].trim() : "UNKNOWN";
        const explanation = explanationMatch ? explanationMatch[1].trim() : text;

        const score = ratingToScore(rating);

        return { rating, explanation, score };
    }

    function ratingToScore(rating) {
        const scoreMap = {
            // --- 🟢 GREEN (80-100) ---
            HIGHLY_CREDIBLE: 100, EXPERT: 95, CORROBORATED: 95, WELL_SOURCED: 95,
            ACCURATE: 95, JOURNALIST: 90, BALANCED: 90, CURRENT: 90, CREDIBLE: 85,
            NEUTRAL: 85, PROFESSIONAL: 85, PLAUSIBLE: 85, MOSTLY_ACCURATE: 80, RECENT: 80,

            // --- 🟡 YELLOW (60-79) ---
            ADEQUATE: 70, CITIZEN_JOURNALIST: 70, SLIGHTLY_EMOTIONAL: 70,
            SLIGHT_BIAS: 70, PARTIALLY_SOURCED: 60, UNIQUE_REPORTING: 60, DATED: 60,

            // --- 🟠 ORANGE (40-59) ---
            UNVERIFIED: 50, UNVERIFIABLE: 50, UNKNOWN: 50, ERROR: 50,
            QUESTIONABLE: 40, EMOTIONAL: 40, MODERATE_BIAS: 40,

            // --- 🔴 RED (0-39) ---
            SOMEWHAT_MISLEADING: 35, SENSATIONALIST: 35, ANONYMOUS: 35,
            POORLY_SOURCED: 30, POOR_QUALITY: 30, RECYCLED: 30, CONTAINS_ERRORS: 20,
            STRONG_BIAS: 20, UNSOURCED: 15, CLICKBAIT: 15, UNRELIABLE: 10,
            MISLEADING: 10, SUSPICIOUS: 10, DECEPTIVE: 5, HIGHLY_MANIPULATIVE: 5,
            CONTRADICTS_CONSENSUS: 5
        };

        return scoreMap[rating] || 50;
    }

    function formatRating(rating) {
        return rating.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function displayOverallScore(agents) {
        let totalScore = 0;
        let totalWeight = 0;

        agents.forEach(agent => {
            if (agent.result && agent.result.score !== undefined) {
                totalScore += agent.result.score * agent.weight;
                totalWeight += agent.weight;
            }
        });

        const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

        const scoreDisplay = document.getElementById("overallScore");
        const scoreValue = document.getElementById("scoreValue");
        const scoreLabel = document.getElementById("scoreLabel");
        const scoreBar = document.getElementById("scoreBar");
        const scoreSpinner = document.getElementById("scoreSpinner");

        scoreSpinner.style.display = "none";
        scoreValue.style.display = "block";

        let color, label, emoji;
        
        if (overallScore >= 80) {
            color = "#10b981"; // Green
            label = "Highly Credible";
            emoji = "✅";
        } else if (overallScore >= 60) {
            color = "#eab308"; // Yellow
            label = "Credible";
            emoji = "⭐";
        } else if (overallScore >= 40) {
            color = "#f59e0b"; // Orange
            label = "Questionable";
            emoji = "⚠️";
        } else {
            color = "#ef4444"; // Red
            label = "Unreliable";
            emoji = "🚨";
        }

        scoreValue.textContent = overallScore;
        scoreValue.style.color = color;
        scoreValue.style.textShadow = `0 0 20px ${color}`; 

        setTimeout(() => {
            scoreBar.style.width = `${overallScore}%`;
            scoreBar.style.backgroundColor = color;
            scoreBar.style.boxShadow = `0 0 15px ${color}`;
        }, 100);

        scoreLabel.textContent = `${emoji} ${label}`;
        scoreLabel.style.color = color;

        scoreDisplay.style.display = "block";
        
        return overallScore; // Return score for caching
    }

    document.getElementById("exportBtn")?.addEventListener("click", () => {
        if (!analysisResults) {
            alert("No results to export yet!");
            return;
        }

        let md = `# Legit Analysis Report\n`;
        md += `**Target URL:** ${analysisResults.page.url}\n`;
        md += `**Analyzed on:** ${analysisResults.timestamp}\n`;
        md += `**Overall Credibility Score:** ${analysisResults.score}/100\n\n`;
        md += `--- \n\n`;

        analysisResults.agents.forEach(agent => {
            const res = agent.result;
            if (res) {
                md += `### ${agent.icon} ${agent.name}\n`;
                md += `**Rating:** ${res.rating.replace(/_/g, ' ')}\n`;
                md += `**Score Impact:** ${res.score}/100\n`;
                md += `> ${res.explanation}\n\n`;
            }
        });

        md += `\n*Generated by Legit Chrome Extension*`;

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const domainName = analysisResults.page.domain.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.href = url;
        a.download = `Legit_Report_${domainName}_${Date.now()}.md`;
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Updated Reset Functionality with Cache Clearing
    document.getElementById("newAnalysisBtn")?.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if(tabs[0]) {
                const url = tabs[0].url;
                
                // 1. Clear Cache for this URL
                removeFromCache(url);
                
                // 2. Clear UI Logic
                setupView.style.display = "flex";
                resultsView.style.display = "none";
                statusMsg.style.opacity = "0";
                activateBtn.disabled = false;
                analysisResults = null;
            }
        });
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});