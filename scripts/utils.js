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

// Removes specific URL from cache
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

// --- Render cached results instantly ---

function loadFromCache(cacheData) {
    setupView.style.display = "none";
    resultsView.style.display = "flex";

    displayPageHeader(cacheData.pageData);

    const header = document.getElementById("pageHeader");
    if (!document.getElementById("cacheBadge")) {
        header.insertAdjacentHTML('beforeend', `<div id="cacheBadge" style="font-size:11px; color:#0d9488; margin-top:5px; font-weight:600;">⚡ Result from previous scan</div>`);
    }

    const agentGrid = document.getElementById("agentGrid");
    agentGrid.innerHTML = "";

    // Sort agents by SCORE (Ascending: Worst -> Best)
    const sorted = [...cacheData.agents].sort((a, b) => {
        const scoreA = a.result ? a.result.score : 100;
        const scoreB = b.result ? b.result.score : 100;
        return scoreA - scoreB;
    });

    // Render cards
    sorted.forEach(agent => {
        const card = createCompletedAgentCard(agent);
        agentGrid.appendChild(card);
    });

    displayOverallScore(cacheData.agents);
}

// -- Helper: Re-sorts the grid based on current scores --

function sortGridDynamic() {
    const agentGrid = document.getElementById("agentGrid");
    const cards = Array.from(agentGrid.children);

    cards.sort((cardA, cardB) => {
        // Check if cards are finished (have the 'completed' class)
        const isDoneA = cardA.classList.contains("completed");
        const isDoneB = cardB.classList.contains("completed");

        // 1. Move Completed cards to the TOP
        if (isDoneA && !isDoneB) return -1;
        if (!isDoneA && isDoneB) return 1;

        // 2. If both are completed, sort by Score (Ascending: Worst first)
        if (isDoneA && isDoneB) {
            const scoreA = parseInt(cardA.getAttribute("data-score")) || 100;
            const scoreB = parseInt(cardB.getAttribute("data-score")) || 100;
            return scoreA - scoreB;
        }

        // 3. If neither are done, keep original Priority order
        return 0;
    });

    // Re-append in new order
    cards.forEach(card => agentGrid.appendChild(card));
}

function parseAgentResponse(text) {
    // Look for the rating
    const ratingMatch = text.match(/RATING:\s*([A-Z_]+)/i);
    
    // Look for the explanation
    const explanationMatch = text.match(/EXPLANATION:\s*(.+?)(?=\n\n|$)/is);

    let rating = ratingMatch ? ratingMatch[1].trim() : "UNKNOWN";
    let explanation = explanationMatch ? explanationMatch[1].trim() : text;

    // --- CLEANUP STEP ---
    // Remove markdown asterisks from rating (e.g. **CREDIBLE** -> CREDIBLE)
    rating = rating.replace(/\*/g, '');
    
    // Convert to score
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
        ADEQUATE: 70, CITIZEN_JOURNALIST: 70, 
        SLIGHT_BIAS: 70, PARTIALLY_SOURCED: 60, UNIQUE_REPORTING: 60, DATED: 60,

        // --- 🟠 ORANGE (40-59) ---
        UNVERIFIED: 50, UNVERIFIABLE: 50, UNKNOWN: 50, ERROR: 50,
        QUESTIONABLE: 40, MODERATE_BIAS: 40,

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
    // 1. Clean up rating string (remove * and spaces)
    const cleanKey = rating.replace(/\*/g, '').trim().toUpperCase();
    
    // 2. Check translation table
    if (TRANSLATIONS[currentLang][cleanKey]) {
        return TRANSLATIONS[currentLang][cleanKey];
    }
    
    // 3. Fallback to English formatting
    return rating.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

    let color, labelKey, emoji;
    if (overallScore >= 80) { color = "#10b981"; labelKey = "HIGHLY_CREDIBLE"; emoji = "✅"; } 
    else if (overallScore >= 60) { color = "#e0d212ff"; labelKey = "CREDIBLE"; emoji = "⭐"; } 
    else if (overallScore >= 40) { color = "#f59e0b"; labelKey = "QUESTIONABLE"; emoji = "⚠️"; } 
    else { color = "#ef4444"; labelKey = "UNRELIABLE"; emoji = "🚨"; }

    scoreValue.textContent = overallScore;
    scoreValue.style.color = color;
    
    setTimeout(() => {
        scoreBar.style.width = `${overallScore}%`;
        scoreBar.style.backgroundColor = color;
    }, 100);

    // TRANSLATED LABEL
    const translatedLabel = TRANSLATIONS[currentLang][labelKey] || labelKey;
    scoreLabel.textContent = `${emoji} ${translatedLabel}`;
    
    scoreLabel.style.color = color;
    scoreDisplay.style.display = "block";

    return overallScore;
}

// Utility function to escape HTML and clean Markdown
function escapeHtml(text) {
    if (!text) return "";

    // 1. Remove Markdown bolding (**) and italics (*)
    let cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');

    // 2. Escape HTML characters to prevent security issues
    const div = document.createElement('div');
    div.textContent = cleanText;
    return div.innerHTML;
}

function exportResultsToMarkdown(analysisResults) {
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
}

function displayPageHeader(pageData) {
    const headerDiv = document.getElementById("pageHeader");
    const existingBadge = document.getElementById("cacheBadge");
    if (existingBadge) existingBadge.remove();

    headerDiv.innerHTML = `
        <div class="page-title">${escapeHtml(pageData.title)}</div>
        <div class="page-domain">📍 ${escapeHtml(pageData.domain)}</div>
    `;
}

// Helper to create a card that is ALREADY done (for cache loading)
function createCompletedAgentCard(agent) {
    const card = document.createElement("div");
    const result = agent.result;
    
    // Color Logic
    let scoreClass = "score-low";
    if (result.score >= 80) scoreClass = "score-high";
    else if (result.score >= 60) scoreClass = "score-good";
    else if (result.score >= 40) scoreClass = "score-medium";

    card.className = `agent-card completed ${scoreClass}`;
    card.id = `agent-${agent.id}`;
    card.setAttribute("data-score", result.score);
    
    // Translate Agent Name
    const translatedName = TRANSLATIONS[currentLang][agent.id] || agent.name;

    card.innerHTML = `
        <div class="agent-header">
            <span class="agent-icon">${agent.icon}</span>
            <div class="agent-text-wrapper">
                <span class="agent-name">${translatedName}</span>
                <span class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</span>
            </div>
            <span class="toggle-icon">▼</span>
        </div>
        <div class="agent-content">
            <div class="agent-explanation">${escapeHtml(result.explanation)}</div>
        </div>
    `;
    
    card.addEventListener("click", () => card.classList.toggle("expanded"));
    return card;
}

function createAgentCard(agent) {
    const card = document.createElement("div");
    card.className = `agent-card priority-${agent.priority}`;
    card.id = `agent-${agent.id}`;
    
    const translatedName = TRANSLATIONS[currentLang][agent.id] || agent.name;

    card.innerHTML = `
        <div class="agent-header">
            <span class="agent-icon">${agent.icon}</span>
            <div class="agent-text-wrapper">
                <span class="agent-name">${translatedName}</span>
            </div>
            <div class="agent-loader"></div>
        </div>
        <div class="agent-content">
            <div class="agent-loading">${TRANSLATIONS[currentLang].analyzing}</div>
        </div>
    `;
    return card;
}