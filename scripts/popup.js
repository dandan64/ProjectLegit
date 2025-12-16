// popup.js - Final Version: Caching, Search, 4-Tier Scoring, Export

document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");

    // Reset view when switching tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        setupView.style.display = "flex";
        resultsView.style.display = "none";
        statusMsg.textContent = TRANSLATIONS[currentLang].readyMsg;
        statusMsg.className = "status info";
        statusMsg.style.opacity = "1";
        activateBtn.disabled = false;
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

    // --- LOCALIZATION CONFIG ---
    let currentLang = 'en'; // Default

    const TRANSLATIONS = {
        en: {
            // UI Elements
            appName: "Legit",
            tagline: "AI-powered fake news detection",
            apiKeyLabel: "🔑 Gemini API Key",
            apiKeyPlaceholder: "Enter your API key...",
            saveKeyBtn: "💾 Save API Key",
            analyzeBtn: "🔍 Analyze This Page",
            noKey: "Don't have an API key?",
            getKey: "Get one free",
            analysis: "🔍 Starting analysis...",
            overallScoreTitle: "Overall Legitimacy Score",
            newScanBtn: "🔄 New Analysis",
            exportBtn: "📥 Export Results",
            
            // Status & Errors
            calculating: "Calculating...",
            readyMsg: "New tab detected. Ready to analyze.",
            analyzing: "Analyzing...",
            loadingCache: "♻️ Loading cached results...",
            apiKeySaved: "✅ API key saved successfully!",
            noTextError: "No text found on this page to analyze.",
            errorPrefix: "Error: ",
            
            // Agent Names
            source: "Source Credibility",
            author: "Author Analysis",
            consensus: "Cross-Verification",
            headline: "Headline Analysis",
            sources: "Source Attribution",
            accuracy: "Factual Accuracy",
            bias: "Bias Detection",
            style: "Writing Quality",
            freshness: "Content Freshness",

            // --- RATINGS (GRADES) ---
            // General / Source
            HIGHLY_CREDIBLE: "Highly Credible", CREDIBLE: "Credible", NEUTRAL: "Neutral", 
            QUESTIONABLE: "Questionable", UNRELIABLE: "Unreliable",
            
            // Author
            EXPERT: "Expert", JOURNALIST: "Journalist", CITIZEN_JOURNALIST: "Citizen Journalist", 
            ANONYMOUS: "Anonymous", SUSPICIOUS: "Suspicious",
            
            // Consensus
            CORROBORATED: "Corroborated", PLAUSIBLE: "Plausible", UNIQUE_REPORTING: "Unique Reporting", 
            UNVERIFIABLE: "Unverifiable", CONTRADICTS_CONSENSUS: "Contradicts Consensus",
            
            // Sources
            WELL_SOURCED: "Well Sourced", PARTIALLY_SOURCED: "Partially Sourced", 
            POORLY_SOURCED: "Poorly Sourced", UNSOURCED: "Unsourced",
            
            // Headline / Accuracy
            ACCURATE: "Accurate", MOSTLY_ACCURATE: "Mostly Accurate", 
            SOMEWHAT_MISLEADING: "Somewhat Misleading", CLICKBAIT: "Clickbait", DECEPTIVE: "Deceptive",
            CONTAINS_ERRORS: "Contains Errors", MISLEADING: "Misleading",
            
            // Bias
            BALANCED: "Balanced", SLIGHT_BIAS: "Slight Bias", 
            MODERATE_BIAS: "Moderate Bias", STRONG_BIAS: "Strong Bias",
            
            // Style
            PROFESSIONAL: "Professional", ADEQUATE: "Adequate", 
            SENSATIONALIST: "Sensationalist", POOR_QUALITY: "Poor Quality",
            
            // Freshness
            CURRENT: "Current", RECENT: "Recent", DATED: "Dated", RECYCLED: "Recycled"
        },
        he: {
            // UI Elements
            appName: "Legit",
            tagline: "בדיקת אמינות חדשות מבוססת AI",
            apiKeyLabel: "🔑 מפתח API של ג'מיני",
            apiKeyPlaceholder: "הכנס את המפתח כאן...",
            saveKeyBtn: "💾 שמור מפתח",
            analyzeBtn: "🔍 נתח כתבה זו",
            noKey: "אין לך מפתח?",
            getKey: "השג אחד בחינם",
            analysis: "🔍 מתחיל ניתוח...",
            overallScoreTitle: "ציון אמינות כללי",
            newScanBtn: "🔄 ניתוח חדש",
            exportBtn: "📥 ייצוא תוצאות",
            
            // Status & Errors
            calculating: "מחשב...",
            readyMsg: "זוהה טאב חדש. מוכן לניתוח.",
            analyzing: "מנתח...",
            loadingCache: "♻️ טוען תוצאות מהזכרון...",
            apiKeySaved: "✅ המפתח נשמר בהצלחה!",
            noTextError: "לא נמצא טקסט לניתוח בעמוד זה.",
            errorPrefix: "שגיאה: ",

            // Agent Names
            source: "אמינות המקור",
            author: "ניתוח המחבר",
            consensus: "הצלבת מקורות",
            headline: "ניתוח כותרת",
            sources: "בדיקת ציטוטים",
            accuracy: "דיוק עובדתי",
            bias: "זיהוי הטיה",
            style: "איכות כתיבה",
            freshness: "רעננות התוכן",

            // --- RATINGS (GRADES) ---
            // General / Source
            HIGHLY_CREDIBLE: "אמין מאוד", CREDIBLE: "אמין", NEUTRAL: "ניטרלי", 
            QUESTIONABLE: "מוטל בספק", UNRELIABLE: "לא אמין",
            
            // Author
            EXPERT: "מומחה", JOURNALIST: "עיתונאי", CITIZEN_JOURNALIST: "עיתונאי אזרחי", 
            ANONYMOUS: "אנונימי", SUSPICIOUS: "חשוד",
            
            // Consensus
            CORROBORATED: "מאומת", PLAUSIBLE: "מתקבל על הדעת", UNIQUE_REPORTING: "דיווח ייחודי", 
            UNVERIFIABLE: "לא ניתן לאימות", CONTRADICTS_CONSENSUS: "סותר את הקונצנזוס",
            
            // Sources
            WELL_SOURCED: "מגובה במקורות", PARTIALLY_SOURCED: "מגובה חלקית", 
            POORLY_SOURCED: "מקורות דלים", UNSOURCED: "ללא מקורות",
            
            // Headline / Accuracy
            ACCURATE: "מדויק", MOSTLY_ACCURATE: "מדויק לרוב", 
            SOMEWHAT_MISLEADING: "מטעה מעט", CLICKBAIT: "קליקבייט", DECEPTIVE: "מטעה",
            CONTAINS_ERRORS: "מכיל שגיאות", MISLEADING: "מטעה",
            
            // Bias
            BALANCED: "מאוזן", SLIGHT_BIAS: "הטיה קלה", 
            MODERATE_BIAS: "הטיה בינונית", STRONG_BIAS: "הטיה חזקה",
            
            // Style
            PROFESSIONAL: "מקצועי", ADEQUATE: "סביר", 
            SENSATIONALIST: "סנסציוני", POOR_QUALITY: "איכות נמוכה",
            
            // Freshness
            CURRENT: "עדכני", RECENT: "מהזמן האחרון", DATED: "מיושן", RECYCLED: "ממוחזר"
        }
    };

    // --- LANGUAGE HANDLERS ---
    const langEnBtn = document.getElementById("langEn");
    const langHeBtn = document.getElementById("langHe");

    langEnBtn.addEventListener("click", () => setLanguage('en'));
    langHeBtn.addEventListener("click", () => setLanguage('he'));

    function setLanguage(lang) {
        currentLang = lang;
        
        // Toggle UI Classes
        document.body.classList.toggle('rtl', lang === 'he');
        
        if(langEnBtn) langEnBtn.classList.toggle('active', lang === 'en');
        if(langHeBtn) langHeBtn.classList.toggle('active', lang === 'he');

        // Apply Text Translations
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[lang][key]) {
                el.textContent = TRANSLATIONS[lang][key];
            }
        });

        // Apply Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (TRANSLATIONS[lang][key]) {
                el.placeholder = TRANSLATIONS[lang][key];
            }
        });

        // Update dynamic text if visible (like status message)
        if (statusMsg.style.opacity === "1") {
             // Re-set default ready message if it's the default state
             if (statusMsg.textContent.includes("New tab") || statusMsg.textContent.includes("זוהה טאב")) {
                 statusMsg.textContent = TRANSLATIONS[lang].readyMsg;
             }
        }

        // Save preference
        chrome.storage.local.set({ legitLang: lang });
    }

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

    // --- MAIN LOGIC ---

    async function startAnalysis() {
        showStatus(TRANSLATIONS[currentLang].analysis, "info");
        loader.style.display = "block";
        activateBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            // 1. CHECK CACHE
            const cachedData = await checkCache(tab.url);

            if (cachedData) {
                showStatus(TRANSLATIONS[currentLang].loadingCache, "info");
                setTimeout(() => {
                    loadFromCache(cachedData);
                    loader.style.display = "none";
                }, 500);
                return;
            }

            // 2. FRESH ANALYSIS
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
            scoreLabel.textContent = TRANSLATIONS[currentLang].calculating;
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

    // Function to render cached results instantly
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

    // Helper: Re-sorts the grid based on current scores
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
            const excerptStart = bodyText.slice(0, 1500);
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

    function displayPageHeader(pageData) {
        const headerDiv = document.getElementById("pageHeader");
        const existingBadge = document.getElementById("cacheBadge");
        if (existingBadge) existingBadge.remove();

        headerDiv.innerHTML = `
            <div class="page-title">${escapeHtml(pageData.title)}</div>
            <div class="page-domain">📍 ${escapeHtml(pageData.domain)}</div>
        `;
    }

    function getAnalysisAgents(pageData) {
        const startText = pageData.excerptStart || "";
        const endText = pageData.excerptEnd || "";
        
        const longExcerpt = startText.slice(0, 1500);
        const shortExcerpt = startText.slice(0, 600);
        const excerptEnd = endText || startText.slice(-500);
        
        const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

        // --- LANGUAGE INSTRUCTION ---
        // If Hebrew is selected, we tell Gemini to explain in Hebrew.
        const LANG_INSTRUCTION = currentLang === 'he' 
            ? `OUTPUT REQUIREMENT: You MUST write the 'EXPLANATION' content ONLY in Hebrew (עברית). However, the keys 'RATING:' and 'EXPLANATION:' and the rating values (e.g. 'HIGHLY_CREDIBLE') MUST remain in English for parsing.` 
            : ``;

        return [
            {
                id: "source",
                name: TRANSLATIONS[currentLang].source,
                icon: "🏛️",
                priority: "high",
                weight: 0.15,
                useSearch: true,
                prompt: `Act as a Media Intelligence Analyst. Use Google Search to evaluate the reputation of the domain "${pageData.domain}".
                ${LANG_INSTRUCTION}
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
                name: TRANSLATIONS[currentLang].author,
                icon: "👤",
                priority: "medium",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as an Investigative Journalist. Use Google Search to investigate the author of this text.
                ${LANG_INSTRUCTION}
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
                name: TRANSLATIONS[currentLang].consensus,
                icon: "🌐",
                priority: "high",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as a Fact-Checking Researcher. Conduct a rigorous cross-verification of the following story.
                ${LANG_INSTRUCTION}
TITLE: "${pageData.title}"
CONTENT: "${pageData.text}"
Current Date: ${today}
If the date is the same as today, treat this as "Breaking News".

--- EXECUTION PROTOCOL ---

1. CLAIM ATOMIZATION:
   - Do not search for the entire headline as one string.
   - Break the story down into "Atomic Facts" (e.g., "Person X did Action Y", "Event Z occurred at Time T").
   - Search for these specific atomic components independently.

2. SEMANTIC MATCHING:
   - Do not rely on exact keyword matches (Lexical Overlap).
   - Look for "Embedding Similarity" (matching meaning). For example, if a source says "The bill cost $50M" and another says "The legislation price tag was $50 million", treat this as CONFIRMED.

3. SOURCE GENEALOGY (Circular Reporting Check):
   - Check if the search results are truly independent or if they all cite a single root source (e.g., "According to AP...").
   - If 10 articles all cite the same "base" report, count that as ONE source, not ten.

4. TEMPORAL CONTEXT (Breaking News Check):
   - Check the timestamps. If the story is less than 24 hours old (eg. , "Breaking News"), a lack of consensus is normal. Do not penalize heavily.
   - If the story is old but has NO corroboration, flag it as suspicious.

--- SCORING CRITERIA ---
- CORROBORATED: Multiple independent Tier-1 outlets report the same Atomic Facts.
- PLAUSIBLE: Reported by secondary sources, but no "Circular Reporting" found.
- UNIQUE_REPORTING: True "Breaking News" (fresh timestamp) or exclusive investigation.
- CONTRADICTS_CONSENSUS: Major outlets explicitly debunk this specific claim.
- UNVERIFIABLE: No independent matches found after 24+ hours.

Rate as: CORROBORATED, PLAUSIBLE, UNIQUE_REPORTING, UNVERIFIABLE, or CONTRADICTS_CONSENSUS

Format: RATING: [your rating]
EXPLANATION: [Provide a 3-4 sentence analysis in ${currentLang}. explicitly state in ${currentLang}: "Found X independent sources matching the atomic claims." or "Detected circular reporting tracing back to..." or "Story is too new for consensus."]`
            },
            {
                id: "headline",
                name: TRANSLATIONS[currentLang].headline,
                icon: "📰",
                priority: "high",
                weight: 0.10,
                useSearch: false,
                prompt: `Act as a Senior Editor. Analyze if this headline is fair or manipulative.
                ${LANG_INSTRUCTION}
Headline: "${pageData.title}"

Content Snippet: "${shortExcerpt}"

Current Date: ${today}

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
                name: TRANSLATIONS[currentLang].sources,
                icon: "📎",
                priority: "high",
                weight: 0.10,
                useSearch: true,
                prompt: `Act as an Academic Reviewer. Use Google Search to verify the citations in the following text.
                ${LANG_INSTRUCTION}
Current Date: ${today}
"${longExcerpt}"

Your Task:
1. If specific studies or reports are mentioned, search to see if they actually exist.
2. Verify if the text misrepresents the cited source's conclusion.
3. Flag vague attributions like "experts say" if no specific experts are named.
4. Identify any missing citations for significant claims.
Rate as: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, or UNSOURCED
Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based explanation (3-4 sentences). State if the citations found in the text are real and accurate. If the text does not cite sources, rate accordingly.]`
            },
            {
                id: "accuracy",
                name: TRANSLATIONS[currentLang].accuracy,
                icon: "✓",
                priority: "high",
                weight: 0.15,
                useSearch: true,
                prompt: `Act as a Logic & Fact Checker. Use Google Search to verify the specific claims in the following text.
Current Date: ${today}
${LANG_INSTRUCTION}

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
                id: "bias",
                name: TRANSLATIONS[currentLang].bias,
                icon: "⚖️",
                priority: "high",
                weight: 0.20,
                useSearch: true,
                prompt: `Act as a Lead Media Forensic Analyst managing a panel of 11 specialized experts.
Your goal is to conduct a "Multi-Axis Bias Audit" on the text below (without looking at the advertisements).

${LANG_INSTRUCTION}

Current Date: ${today}
Text Start: "${longExcerpt}"
Text End: "${excerptEnd}"

--- THE PANEL OF EXPERTS ---


[Standard Categories]
1. Political Analyst: Checks for partisan slant/policy favoring.
2. Gender Expert: Checks for stereotyping or focus on appearance vs merit.
3. Corporate Auditor (Entity): Checks for unfair praise/criticism of companies.
4. Sociologist (Racial/Ethnic): Checks for stereotypes or negative generalizations.
5. Theologian (Religious): Checks for unfair portrayal of faiths.
6. Geopolitical Analyst (Regional): Checks for geographic bias/xenophobia.
7. Media Critic (Sensationalism): Checks for emotional manipulation/clickbait.


[Advanced Computational Metrics]
8. Structural Analyst: Compare the Start vs. the End. Does the article start neutral to gain trust, then switch to a strong opinion in the conclusion? (The "Trojan Horse" pattern).
9. Pattern Recognition: Checks if the sequence of sentences builds a manipulative narrative arc.
10. Lexical Linguist: Scans for specific word categories:
    - High density of "Anger/Affect" words (e.g., "shame", "fear") -> Indicates Political Bias.
    - High density of "Focus Present" words (e.g., "admit", "deny") -> Indicates Unfair Framing.
11. Gatekeeper: Use Google Search to check what is MISSING. Are key stakeholders or perspectives mentioned in other reports but omitted here?


--- YOUR TASK ---
1. Consult all 11 agents internally.
2. Determine if ANY significant bias exists.
3. Synthesize the findings into ONE final verdict without mentioning any of the individual agents.
4. If multiple biases are found, the rating must reflect the severity.


Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS


Format: RATING: [your rating]
EXPLANATION: [Provide a clear, evidence-based summary (3-4 sentences). Explicitly name the strongest bias found (e.g., "Detected Structural Bias," "Found Gatekeeping Bias") and provide the specific evidence/reasoning.]`
            },
            {
                id: "style",
                name: TRANSLATIONS[currentLang].style,
                icon: "✍️",
                priority: "low",
                weight: 0.05,
                useSearch: false,
                prompt: `Act as a Copy Editor. Evaluate the professional standard of the following text.
                ${LANG_INSTRUCTION}
Current Date: ${today}
Text: "${shortExcerpt}"

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
                name: TRANSLATIONS[currentLang].freshness,
                icon: "📅",
                priority: "low",
                weight: 0.05,
                useSearch: true,
                prompt: `Act as a News Archivist. Use Google Search to verify the timeline of this story against the Current Date: ${today}.
                ${LANG_INSTRUCTION}
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

        // Initial Layout: Priority Order
        const sorted = [...agents].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        for (const agent of sorted) {
            const card = createAgentCard(agent);
            agentGrid.appendChild(card);
        }

        // Run in parallel - The cards will jump to their correct spots as they finish!
        const promises = sorted.map(agent => analyzeAgent(agent));
        await Promise.all(promises);
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
                prompt: agent.prompt,
                useSearch: agent.useSearch
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
            contentDiv.innerHTML = `<div class="agent-explanation">${escapeHtml(result.explanation)}</div>`;

            card.addEventListener("click", () => card.classList.toggle("expanded"));
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

    // Parse agent response
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
});