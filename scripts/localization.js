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
            newScanBtn: "✨ New Analysis",
            exportBtn: "📥 Export Results",
            reanalyzeBtn: "🔄 Re-Analyze Page",
            reanalyzing: "🔄 Re-analyzing...",

            // Status & Errors
            calculating: "Calculating...",
            readyMsg: "New tab detected. Ready to analyze.",
            analyzing: "Analyzing...",
            loadingCache: "♻️ Loading cached results...",
            apiKeySaved: "✅ API key saved successfully!",
            noTextError: "No text found on this page to analyze.",
            errorPrefix: "Error: ",
            cacheBadge: "♻️ Result from previous scan",
            Summarizing: "✨ Summarizing...",
            quoteMatchWarning: "Exact quote match not found. Showing closest match.",
            quoteMatchError: "Quote not found. Please try searching manually.",
            
            // Agent Names
            source: "Source Credibility",
            author: "Author Analysis",
            summary: "Executive Summary",
            consensus: "Cross-Verification",
            headline: "Headline Analysis",
            sources: "Source Attribution",
            accuracy: "Factual Accuracy",
            bias: "Bias Detection",
            style: "Writing Quality",
            freshness: "Content Freshness",
            summaryTitle: "Analysis Summary", 

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
            newScanBtn: "✨ ניתוח חדש",
            exportBtn: "📥 ייצוא תוצאות",
            reanalyzeBtn: "🔄 נתח שוב",
            reanalyzing: "🔄 מנתח מחדש...",
            
            // Status & Errors
            calculating: "מחשב...",
            readyMsg: "זוהה טאב חדש. מוכן לניתוח.",
            analyzing: "מנתח...",
            loadingCache: "♻️ טוען תוצאות מהזכרון...",
            apiKeySaved: "✅ המפתח נשמר בהצלחה!",
            noTextError: "לא נמצא טקסט לניתוח בעמוד זה.",
            errorPrefix: "שגיאה: ",
            cacheBadge: "♻️ תוצאה מסריקה קודמת",
            summarizing: "✨ מסכם...",
            quoteMatchWarning: "לא נמצא ציטוט מדויק. מוצג הציטוט הקרוב ביותר.",
            quoteMatchError: "לא נמצא ציטוט. אנא נסה לחפש ידנית.",

            // Agent Names
            source: "אמינות המקור",
            author: "ניתוח המחבר",
            summary: "סיכום ניהולי",
            consensus: "הצלבת מקורות",
            headline: "ניתוח כותרת",
            bias: "זיהוי הטיה",
            style: "איכות כתיבה",
            summaryTitle: "סיכום הניתוח",

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

    function setLanguage(lang) {
        currentLang = lang;
        
        // Toggle UI Classes
        document.body.classList.toggle('rtl', lang === 'he');
        
        // --- LANGUAGE HANDLERS ---
        const langEnBtn = document.getElementById("langEn");
        const langHeBtn = document.getElementById("langHe");
        
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
        // We use getElementById here to ensure we grab the element even if it's not in global scope
        const statusMsg = document.getElementById("statusMsg");
        
        if (statusMsg && statusMsg.style.opacity === "1") {
             const text = statusMsg.textContent;

             // 1. Handle "Ready" Message
             if (text.includes("New tab") || text.includes("זוהה טאב")) {
                 statusMsg.textContent = TRANSLATIONS[lang].readyMsg;
             }
             // 2. Handle "API Key Saved" Message (THIS WAS MISSING)
             else if (text.includes("API key") || text.includes("המפתח")) {
                 statusMsg.textContent = TRANSLATIONS[lang].apiKeySaved;
             }
             // 3. Handle "No Key" Message
             else if (text.includes("Don't have") || text.includes("אין לך")) {
                 statusMsg.textContent = TRANSLATIONS[lang].noKey;
             }
        }

        // Save preference
        chrome.storage.local.set({ legitLang: lang });
    }