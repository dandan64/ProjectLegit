// --- CACHING FUNCTIONS ---

function getCacheKey(url) {
    return `legit_cache_${url}`;
}

function createJumpyCalculatingText(baseText, dotCount) {
    const letters = baseText.split('');
    const dots = '.'.repeat(dotCount);
    
    return letters.map((letter, index) => {
        const delay = (index * 0.08) % 0.6; // Stagger each letter
        return `<span style="
            display: inline-block;
            animation: jump 0.6s ease-in-out infinite;
            animation-delay: ${delay}s;
        ">${letter}</span>`;
    }).join('') + dots;
}

async function saveToCache(url, pageData, agents, score, summaryText) {
    const key = getCacheKey(url);

    // 1. OPTIMIZE: Create a "slim" version of pageData
    // We DO NOT save 'bodyText' or 'excerpt' as they are huge and fill storage instantly.
    // We only need title/domain for the header when loading from cache.
    const slimPageData = {
        title: pageData.title,
        domain: pageData.domain,
        author: pageData.author,
        url: pageData.url
    };

    const cacheData = {
        timestamp: Date.now(),
        pageData: slimPageData, 
        agents: agents.filter(a => !a.isBackground && a.id !== 'summary'), // Exclude background agents
        score: score,
        summaryText: summaryText
    };

    try {
        // Try saving normally
        await chrome.storage.local.set({ [key]: cacheData });
        console.log("✅ Saved to cache:", key);
    } catch (error) {
        // 2. CATCH: If quota exceeded, clean up and retry
        if (error.message && (error.message.includes("quota exceeded") || error.message.includes("QUOTA_BYTES"))) {
            console.warn("⚠️ Storage full! Cleaning old cache items...");
            
            const freedSpace = await handleQuotaExceeded();
            
            if (freedSpace) {
                // Retry save ONE time
                try {
                    await chrome.storage.local.set({ [key]: cacheData });
                    console.log("✅ Saved to cache after cleanup:", key);
                } catch (retryError) {
                    console.error("❌ Failed to save even after cleanup:", retryError);
                }
            }
        } else {
            console.error("Storage error:", error);
        }
    }
}

// Helper: Deletes oldest 30% of cached items to free space
async function handleQuotaExceeded() {
    try {
        const allData = await chrome.storage.local.get(null);
        const cacheKeys = Object.keys(allData).filter(k => k.startsWith('legit_cache_'));

        if (cacheKeys.length === 0) return false;

        // Sort by timestamp (Oldest first)
        const sortedItems = cacheKeys.map(key => ({
            key: key,
            timestamp: allData[key].timestamp || 0
        })).sort((a, b) => a.timestamp - b.timestamp);

        // Calculate how many to delete (e.g., remove oldest 30%)
        const countToDelete = Math.max(1, Math.floor(sortedItems.length * 0.3));
        const keysToDelete = sortedItems.slice(0, countToDelete).map(item => item.key);

        console.log(`🧹 Deleting ${keysToDelete.length} old cache items to free space.`);
        
        await chrome.storage.local.remove(keysToDelete);
        return true;
    } catch (e) {
        console.error("Error during cache cleanup:", e);
        return false;
    }
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

function loadFromCache(cacheData, currentTabId) {
    console.log("🔍 Loading from cache:", cacheData); // Debug log
    console.log("📊 Cached score:", cacheData.score); // Debug log
    console.log("📋 Cached agents:", cacheData.agents); // Debug log
    setupView.style.display = "none";
    resultsView.style.display = "flex";

    displayPageHeader(cacheData.pageData);

    const header = document.getElementById("pageHeader");
    if (!document.getElementById("cacheBadge")) {
        header.insertAdjacentHTML('beforeend', `<div id="cacheBadge" style="font-size:11px; color:#0d9488; margin-top:5px; font-weight:600;">♻️Result from previous scan</div>`);
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
        if(!agent.isBackgroundAgent && agent.result) {
            const card = createCompletedAgentCard(agent, currentTabId);
            agentGrid.appendChild(card);
        }
    });

    const scoreDisplay = document.getElementById("overallScore");
    const scoreSpinner = document.getElementById("scoreSpinner");
    const scoreValue = document.getElementById("scoreValue");
    const scoreBar = document.getElementById("scoreBar");
    
    // Hide spinner, show value
    scoreSpinner.style.display = "none";
    scoreValue.style.display = "block";
    
    // Make sure the overall score box is visible
    scoreDisplay.style.display = "block";

    const overallScore = displayOverallScore(cacheData.agents);

    attachQuoteLinkListeners();
    attachSourceLinkListeners();

    if(cacheData.summaryText) {
        const summaryDiv = document.getElementById('scoreSummary');
        if(summaryDiv) {
            if (overallScore >= 80) summaryDiv.classList.add('safe');
            else if (overallScore >= 60) summaryDiv.classList.add('caution');
            else if (overallScore >= 50) summaryDiv.classList.add('warning');
            else summaryDiv.classList.add('critical');

            summaryDiv.style.display = "block";
            summaryDiv.innerHTML = `
                <div class="summary-body">
                    <h3 class="summary-title">📝Analysis Summary</h3>
                    <div class="summary-content" id="summaryText">
                        <span>${cacheData.summaryText}</span>
                    </div>
                </div>`;
        }
    }
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
    console.log('📋 Parsing response:', text.substring(0, 200) + '...');
    
    // Look for the rating - more flexible regex
    const ratingMatch = text.match(/RATING:\s*\*?\*?([A-Z_]+)\*?\*?/i);
    
    // Look for the explanation
    const explanationMatch = text.match(/EXPLANATION:\s*([\s\S]*)/i);

    let rating = ratingMatch ? ratingMatch[1].trim() : "UNKNOWN";
    let explanation = explanationMatch ? explanationMatch[1].trim() : text;

    // --- CLEANUP STEP ---
    // Remove markdown asterisks and formatting from rating
    rating = rating.replace(/[\*\-\s]/g, '').toUpperCase();
    
    // Clean up explanation - remove markdown formatting
    explanation = explanation
        .replace(/\*\*/g, '')  // Remove bold
        .replace(/\*/g, '')    // Remove italics
        .trim();
    
    console.log('✅ Parsed rating:', rating);
    
    // Convert to score
    const score = ratingToScore(rating);
    
    if (score === 50 && rating !== "UNKNOWN" && rating !== "ERROR" && rating !== "UNVERIFIED" && rating !== "UNVERIFIABLE") {
        console.warn('⚠️ Unknown rating detected:', rating, '- using default score 50');
    }

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
        SENSATIONAL: 75, SOMEWHAT_MISLEADING:70,

        // --- 🟠 ORANGE (40-59) ---
        UNVERIFIED: 50, UNVERIFIABLE: 50, UNKNOWN: 50, ERROR: 50,
        QUESTIONABLE: 40, MODERATE_BIAS: 40, CLICKBAIT: 50,

        // --- 🔴 RED (0-39) ---
        SENSATIONALIST: 35, ANONYMOUS: 35,
        POORLY_SOURCED: 30, POOR_QUALITY: 30, RECYCLED: 30, CONTAINS_ERRORS: 20,
        STRONG_BIAS: 20, UNSOURCED: 15, UNRELIABLE: 10,
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

    // Stop Animation
    if (scoreLabel.dataset.animationInterval) {
        if (scoreLabel.dataset.stopAnimation === 'false') {
             scoreLabel.dataset.stopAnimation = 'true';
        }
        clearInterval(parseInt(scoreLabel.dataset.animationInterval));
        delete scoreLabel.dataset.animationInterval;
    }

    // --- DESIGN LOGIC ---
    let color, gradient, labelKey, emoji;

    if (overallScore >= 80) { 
        color = "#10b981"; 
        // Vibrant Emerald Gradient
        gradient = "linear-gradient(135deg, #34d399 0%, #047857 100%)";
        labelKey = "HIGHLY CREDIBLE"; 
        emoji = "✓"; 
    } 
    else if (overallScore >= 60) { 
        color = "#d9bc00"; 
        // Rich Gold Gradient
        gradient = "linear-gradient(135deg, #fdfd02 0%, #d8b400 100%)";
        labelKey = "CREDIBLE"; 
        emoji = "⭐"; 
    } 
    else if (overallScore >= 40) { 
        color = "#f97316"; 
        // Burnt Orange Gradient
        gradient = "linear-gradient(135deg, #fb923c 0%, #9a3412 100%)";
        labelKey = "QUESTIONABLE"; 
        emoji = "⚠"; 
    } 
    else { 
        color = "#ef4444"; 
        // Deep Red Gradient
        gradient = "linear-gradient(135deg, #f87171 0%, #991b1b 100%)";
        labelKey = "UNRELIABLE"; 
        emoji = "☠"; 
    }

    styleScoreLabel(scoreLabel, scoreValue, scoreBar, overallScore, color, gradient, labelKey, emoji);

    scoreDisplay.style.display = "block";

    return overallScore;
}

function styleScoreLabel(scoreLabelElement, scoreValueElement, scoreBarElement, overallScore, color, gradient, emoji, labelKey) {
    // Apply styles to score value
    scoreValueElement.textContent = overallScore;
    scoreValueElement.style.color = color;
    scoreValueElement.className = '';
    scoreValueElement.classList.add('score-value-final');
    scoreValueElement.style.backgroundImage = gradient;
    scoreValueElement.style.filter = `drop-shadow(0 4px 6px ${color}33)`; // 33 = 20% opacity
    scoreValueElement.style.filter = `drop-shadow(0 4px 6px ${color}33) drop-shadow(0 0 20px ${color}66)`;
    scoreValueElement.style.display = "block";

    // Apply styles to score bar
    setTimeout(() => {
        scoreBarElement.style.width = `${overallScore}%`;
        scoreBarElement.style.backgroundImage = gradient; // Apply the gradient background
        scoreBarElement.style.boxShadow = `0 0 10px ${color}40`;
        scoreBarElement.style.filter = `drop-shadow(0 2px 4px ${color}33)`;

        // Ensure it is visible
        scoreBarElement.style.display = "block";
    }, 100);

    // Apply styles to score label
    const translatedLabel = TRANSLATIONS[currentLang][labelKey] || labelKey;
    
    // 1. Reset Content & Apply Class
    scoreLabelElement.textContent = `${emoji} ${translatedLabel}`;
    scoreLabelElement.className = ''; // Clear "jumping-letter" classes
    scoreLabelElement.classList.add('score-final'); // Add our new design class

    // 2. Apply Dynamic Gradient
    scoreLabelElement.style.backgroundImage = gradient;
    
    // 3. Add a colored glow using drop-shadow filter
    // (We use the main color variable for the shadow color)
    scoreLabelElement.style.filter = `drop-shadow(0 4px 6px ${color}33) drop-shadow(0 0 20px ${color}66)`; // 33 = 20% opacity

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
function createCompletedAgentCard(agent, tabId) {
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
            <div class="agent-explanation">${getRelevantCachedResult(agent, tabId)}</div>
    `;
    
    card.addEventListener("click", (e) => {
        // Only toggle if clicking the header, not on links or other interactive elements
        if (!e.target.closest('a') && !e.target.closest('.quote-link')) {
            card.classList.toggle("expanded");
        }

        if (card.classList.contains('expanded')) {
                setTimeout(() => {
                    card.scrollIntoView({ 
                        behavior: 'smooth', 
                        block:'start'
                    });
                }, 100); // Wait for expansion animation to start
            }
    });
    
    return card;
}

function getRelevantCachedResult(agent, tabId) {
    const result = agent.result;
    if(agent.id === 'bias') {
        return parseAndLinkifyQuotes(result.explanation, tabId);
    } 
    else if(agent.id === 'style') {
        return parseAndLinkifyQuotes(result.explanation, tabId);
    }
    else if(agent.id === 'consensus-format') {
        return parseAndLinkifySources(escapeHtml(result.explanation));
    } else {
        return escapeHtml(result.explanation);
    }
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

    card.addEventListener("click", (e) => {
        // Only toggle if clicking the header, not on links or other interactive elements
        if (!e.target.closest('a') && !e.target.closest('.quote-link')) {
            card.classList.toggle("expanded");
        }
    });

    return card;
}

function parseAndLinkifyQuotes(rawExplanation, tabId) {
    // 1. Make the text HTML-safe first
    let safeExplanation = escapeHtml(rawExplanation);
    
    const quoteRegex = /\[\[QUOTE::(?:&quot;|["'"])?(.+?)(?:&quot;|["'"])?::QUOTE\]\]/g;
    
    let quoteIndex = 0;
    let linkedExplanation = safeExplanation;
    const baseTimestamp = Date.now();
    // Track all quotes for debugging
    const foundQuotes = [];
    
    linkedExplanation = linkedExplanation.replace(quoteRegex, (match, quoteContent) => {
        // Clean up the quote content
        const cleanQuote = quoteContent
            .trim()
            .replace(/&quot;/g, '"')  // Convert HTML entities back
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
        
        foundQuotes.push(cleanQuote);
        
        const uniqueId = `quote-${baseTimestamp}-${quoteIndex++}`;
        
        // Re-escape for safe HTML attribute storage
        const safeQuoteForAttribute = cleanQuote
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        return `<span class="quote-link" 
                    data-quote="${safeQuoteForAttribute}" 
                    data-tab-id="${tabId}" 
                    data-quote-id="${uniqueId}" 
                    title="Click to locate in article: ${cleanQuote.substring(0, 50)}..."
                    style="color: #0f766e; text-decoration: underline; cursor: pointer; font-weight: 600; background-color: rgba(15, 118, 110, 0.05); border-radius: 3px; padding: 2px 4px; transition: all 0.2s ease;">
                    "${quoteContent.trim()}"
                </span>`;
    });
    
    // Debug logging
    console.log('📝 Found quotes:', foundQuotes);
    
    return linkedExplanation;
}

// ========================================
// IMPROVED attachQuoteLinkListeners
// ========================================

function attachQuoteLinkListeners() {
    document.querySelectorAll('.quote-link').forEach(link => {
        // Remove existing listeners to prevent duplicates
        link.replaceWith(link.cloneNode(true));
    });
    
    // Re-select after cloning
    document.querySelectorAll('.quote-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card toggle
            
            // Get the quote and clean it
            let quote = link.getAttribute('data-quote');
            
            const tabId = parseInt(link.getAttribute('data-tab-id'));
            
            console.log('🔍 Searching for quote:', JSON.stringify(quote));
            console.log('Length:', quote.length);
            console.log('Bytes:', new TextEncoder().encode(quote).length);
            
            // Visual feedback
            link.style.backgroundColor = '#d1fae5';
            link.style.transform = 'scale(1.02)';
            
            try {
                // Ensure content script is injected
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['scripts/contentHighlighter.js']
                }).catch(() => {
                    console.log('Content script already injected');
                });
                
                // Send message to content script
                const response = await chrome.tabs.sendMessage(tabId, {
                    type: 'HIGHLIGHT_QUOTE',
                    quote: quote
                });
                
                if (response && response.success) {
                    link.style.backgroundColor = '#86efac';
                    console.log('✅ Quote highlighted successfully');
                } else {
                    link.style.backgroundColor = '#fecaca';
                    console.warn('❌ Quote not found on page');
                    
                    // Show user-friendly error
                    // const errorMsg = document.createElement('div');
                    // errorMsg.textContent = 'Quote not found on current page';
                    // errorMsg.style.cssText = `
                    //     position: fixed;
                    //     top: 20px;
                    //     right: 20px;
                    //     background: #fee2e2;
                    //     color: #991b1b;
                    //     padding: 12px 16px;
                    //     border-radius: 8px;
                    //     border: 1px solid #f87171;
                    //     z-index: 10000;
                    //     font-size: 13px;
                    //     font-weight: 600;
                    //     box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    // `;
                    // document.body.appendChild(errorMsg);
                    // setTimeout(() => errorMsg.remove(), 3000);
                }
            } catch (error) {
                console.error('Error highlighting quote:', error);
                link.style.backgroundColor = '#fecaca';
                
                alert("Unable to highlight quote. Make sure you're viewing the same page that was analyzed.");
            }
            
            setTimeout(() => {
                link.style.backgroundColor = '';
                link.style.transform = '';
            }, 2000);
        });
    });
}

function extractRealUrl(rawUrl) {
    if (!rawUrl) return "";
    let url = rawUrl.trim();

    if (url.includes("/url?q=")) {
        try {
            // 1. Get everything after 'q='
            const queryString = url.split("/url?q=")[1];
            
            // 2. Stop at the next '&' (which usually starts Google's tracking params)
            const encodedUrl = queryString.split("&")[0];
            
            // 3. Decode the result (converts 'https%3A%2F%2F' back to 'https://')
            return decodeURIComponent(encodedUrl);
        } catch (e) {
            console.warn("Failed to clean URL:", url);
            return url; // Fallback to original if parsing fails
        }
    }

    return url;
}

function parseAndLinkifySources(rawExplanation) {
    if (!rawExplanation) return "";

    let safeText = escapeHtml(rawExplanation);

    // Link Parsing (Supporting)
    const sourceRegex = /\[\[SOURCE::(.*?)::(.*?)::(.*?)::SOURCE\]\]/g;
    safeText = safeText.replace(sourceRegex, (match, title, url, quote) => {
        const finalUrl = extractRealUrl(url);

        console.log('Creating supporting source FINAL URL:', finalUrl);
        const cleanTitle = title.trim();
        const cleanQuote = quote.trim().replace(/^["'"]+|["'"]+$/g, '');

        return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" data-quote="${escapeHtml(cleanQuote)}" class="source-link source-supporting" title="Click to open: ${escapeHtml(cleanTitle)}">
                <span class="source-icon">✓</span> ${escapeHtml(cleanTitle)}
            </a>`;
    });

    // Link Parsing (Contradicting)
    const contraRegex = /\[\[CONTRA::(.*?)::(.*?)::(.*?)::CONTRA\]\]/g;
    safeText = safeText.replace(contraRegex, (match, title, url, quote) => {
        const finalUrl = extractRealUrl(url);
        const cleanTitle = title.trim();
        const cleanQuote = quote.trim().replace(/^["'"]+|["'"]+$/g, '');

        return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" data-quote="${escapeHtml(cleanQuote)}" class="source-link source-contra" title="Click to open: ${escapeHtml(cleanTitle)}">
                <span class="source-icon">✗</span> ${escapeHtml(cleanTitle)}
            </a>`;
    });

    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/\n/g, '<br>');

    return safeText;
}

function attachSourceLinkListeners() {
    document.querySelectorAll('.source-link').forEach(link => {
        link.replaceWith(link.cloneNode(true));
    });
    
    document.querySelectorAll('.source-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const quote = link.getAttribute('data-quote');
            const sourceType = link.classList.contains('source-supporting') ? 'supporting' : 'contra';
            const href = link.getAttribute('href');
            
            console.log('🔗 Source link clicked:', href);
            console.log('📝 Quote to highlight:', quote);
            
            try {
                // Open the new tab FIRST
                const newTab = await chrome.tabs.create({ 
                    url: href,
                    active: true 
                });
                
                console.log('📂 New tab opened:', newTab.id);
                
                if (!quote || quote.length < 2) {
                    console.log('No quote to highlight');
                    return;
                }
                
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: newTab.id },
                        args: [quote],
                        func: (textToFind) => {
                            return new Promise((resolve) => {
                                // A. Helper to check if text exists yet
                                const hasText = () => document.body && document.body.innerText.includes(textToFind);

                                if (hasText()) return resolve();

                                // B. If not, watch for changes
                                const observer = new MutationObserver(() => {
                                    if (hasText()) {
                                        observer.disconnect();
                                        resolve();
                                    }
                                });

                                // C. Start watching the document root
                                observer.observe(document.documentElement, {
                                    childList: true,
                                    subtree: true,
                                    characterData: true
                                });
                            });
                        }
                    });
                } catch (err) {
                    console.error('Error waiting for text:', err);
                }
                
                // Inject content script on new tab
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: newTab.id },
                        files: ['scripts/contentHighlighter.js']
                    });
                    console.log('✅ Content script injected');
                } catch (err) {
                    console.error('Failed to inject script:', err);
                    return;
                }
                
                // Send highlight message to NEW tab
                chrome.tabs.sendMessage(newTab.id, {
                    type: 'HIGHLIGHT_QUOTE',
                    quote: quote,
                    highlightType: sourceType
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Highlight failed:', chrome.runtime.lastError.message);
                    } else if (response?.success) {
                        console.log('✅ Quote highlighted on source page');
                    } else {
                        console.warn('⚠️ Quote not found on source page');
                    }
                });
                
            } catch (error) {
                console.error('Error with source link:', error);
            }
        });
    });
}

async function generateFinalSummary(agents, finalScore) {

    const summaryBox = document.getElementById('scoreSummary');

    // Reset classes
    summaryBox.className = 'summary-container'; 

    // Add dynamic class
    if (finalScore >= 80) summaryBox.classList.add('safe');
    else if (finalScore >= 60) summaryBox.classList.add('caution');
    else if (finalScore >= 40) summaryBox.classList.add('warning');
    else summaryBox.classList.add('critical');
    
    // 1. Show loading state in the UI
    if(summaryBox) {
        summaryBox.style.display = "block";
        summaryBox.innerHTML = `<span style="color:#9ca3af; font-style:italic;">✨ Summarizing...</span>`;
    }

    // 2. Find the Summary Agent Config (Safe Mode)
    // We check 'a && a.id' to skip any empty slots in the array
    const summaryAgentConfig = agents.find(a => a && a.id === 'summary');
    
    if (!summaryAgentConfig) {
        console.error("Summary agent not found in configuration");
        if(summaryBox) summaryBox.style.display = 'none';
        return null;
    }

    // 3. Compile findings from the ALREADY COMPLETED agents
    let findings = "";
    agents.forEach(a => {
        // Only include valid, completed agents (exclude summary and background)
        if (a && a.id !== 'summary' && !a.isBackgroundAgent && a.result) {
            findings += `- ${a.name} | ${a.result.rating} | ${a.result.explanation}\n`;
        }
    });

    if (!findings) {
        console.warn("No findings available for summary generation");
        return null;
    }

    // 4. Inject findings into the prompt template
    const prompt = summaryAgentConfig.prompt.replace('{INPUT_FROM_ALL_AGENTS}', findings);

    try {
        // 5. Call Gemini
        const response = await chrome.runtime.sendMessage({
            type: "CALL_GEMINI",
            prompt: prompt,
            useSearch: false
        });

        if (response.result) {
            let finalSummary = response.result;
            console.log("Raw summary response:", finalSummary);

            // ✅ FIX: specific check to handle if Gemini returns an Object instead of String
            if (typeof finalSummary === 'object') {
                console.warn("Summary returned as Object, extracting text...", finalSummary);
                // Try to find the text path, or fallback to stringify
                finalSummary = finalSummary.candidates?.[0]?.content?.parts?.[0]?.text 
                            || finalSummary.text 
                            || JSON.stringify(finalSummary);
            }

            finalSummary = finalSummary.replace(/^(Summary|Verdict|Analysis):/i, '').trim();

            // Cleanup: Remove common prefixes like "Summary:" or "Verdict:"
            summaryBox.innerHTML = `
                <div class="summary-body">
                    <h3 class="summary-title">Analysis Summary</h3>
                    <div class="summary-content" id="summaryText">
                        <span>${finalSummary}</span>
                    </div>
                </div>`;

            return finalSummary;
            
        }
    } catch (e) {
        console.error("Summary generation failed", e);
        if(summaryBox) summaryBox.textContent = "Error generating summary.";
    }
    return null;
}

function startCalculatingAnimation(container, text) {
    // 1. Setup HTML structure
    const letters = text.split('');
    const html = letters.map((letter) => {
        const content = letter === ' ' ? '&nbsp;' : letter;
        return `<span class="jumping-letter">${content}</span>`;
    }).join('');

    container.innerHTML = html;
    container.style.color = "#94a3b8"; // Reset color to gray

    const letterSpans = container.querySelectorAll('.jumping-letter');
    let currentIndex = 0;

    // Helper: Clean up CSS classes automatically
    letterSpans.forEach(span => {
        span.addEventListener('animationend', () => {
            span.classList.remove('active');
        });
    });

    // Reset Flags
    container.dataset.stopAnimation = 'false';
    if (container.dataset.animationTimeout) {
        clearTimeout(parseInt(container.dataset.animationTimeout));
    }

    // 2. The Recursive Loop
    function triggerNextLetter() {
        // Check stop flag or if element was removed
        if (!document.body.contains(container) || container.dataset.stopAnimation === 'true') return;

        // Reset index at end of word
        if (currentIndex >= letterSpans.length) {
            currentIndex = 0;
            container.dataset.animationTimeout = setTimeout(triggerNextLetter, 1000); // Pause before restarting
            return;
        }

        // Trigger Animation
        const span = letterSpans[currentIndex];
        span.classList.remove('active');
        void span.offsetWidth; // Force reflow
        span.classList.add('active');

        // Calculate Delay (Wave Effect)
        let delayToNext = 150; // Standard speed
        if (currentIndex >= letterSpans.length - 3) {
            delayToNext = 300; // Slow down at end
        }

        currentIndex++;
        container.dataset.animationTimeout = setTimeout(triggerNextLetter, delayToNext);
    }

    // Start!
    triggerNextLetter();

    // 3. Return a clean "Stop" function
    return function stop() {
        container.dataset.stopAnimation = 'true';
        if (container.dataset.animationTimeout) {
            clearTimeout(parseInt(container.dataset.animationTimeout));
        }
    };
}