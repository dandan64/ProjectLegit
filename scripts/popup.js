/**
 * @fileoverview Entry point for the Legit Chrome Extension side panel.
 *
 * Wires DOM elements to their event handlers and initialises the UI state
 * on load. All heavy lifting is delegated to:
 *  - orchestrator.js  – analysis pipeline (startAnalysis, extractPageData, …)
 *  - ui.js            – shared presentation helpers (showStatus, toggleApiKeyView)
 *  - utils.js         – utility functions exposed on window
 *  - agents.js        – agent configuration (getAnalysisAgents)
 *  - localization.js  – translations and setLanguage
 */

(() => {

document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");
    const langEnBtn = document.getElementById("langEn");
    const langHeBtn = document.getElementById("langHe");

    const overallScoreBox = document.getElementById('overallScore');
    const scoreHeader = overallScoreBox.querySelector('.score-header');
    const agentGrid = document.getElementById("agentGrid");

    overallScoreBox.classList.add('expanded');

    // Accordion toggle
    scoreHeader.addEventListener('click', function() {
        overallScoreBox.classList.toggle('expanded');
        overallScoreBox.classList.toggle('collapsed');

        if (overallScoreBox.classList.contains('expanded')) {
            setTimeout(() => {
                agentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        if (overallScoreBox.classList.contains('collapsed')) {
            setTimeout(() => {
                resultsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    });

    // Initialize: check for existing API key
    chrome.storage.local.get(["geminiApiKey"], (res) => {
        if (res.geminiApiKey) {
            activateBtn.disabled = false;
            toggleApiKeyView(true);
            showStatus(TRANSLATIONS[currentLang].readyMsg, "success");
        }
    });

    // Save API key
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
            toggleApiKeyView(true);
            setTimeout(() => statusMsg.style.opacity = "0", 2000);
        });
    });

    // Language switchers (clear cache so results re-render in new language)
    langEnBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) await removeFromCache(tab.url);
        setLanguage('en');
    });

    langHeBtn.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) await removeFromCache(tab.url);
        setLanguage('he');
    });

    // Load saved language on start
    chrome.storage.local.get(["legitLang"], (res) => {
        if (res.legitLang) setLanguage(res.legitLang);
    });

    // Main analysis button
    activateBtn.addEventListener("click", async () => {
        await startAnalysis();
    });

    // Re-analyze (clears cache then runs fresh)
    document.getElementById('reanalyzeBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('reanalyzeBtn');
        btn.disabled = true;
        btn.innerHTML = TRANSLATIONS[currentLang].reanalyzing;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                await removeFromCache(tab.url);
                await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
                await startAnalysis();
            }
        } catch (error) {
            console.error("Re-analysis failed:", error);
        } finally {
            btn.disabled = false;
            btn.innerHTML = TRANSLATIONS?.[currentLang]?.reanalyzeBtn ?? "🔄 Re-Analyze Page";
        }
    });

    // New analysis (reset UI back to setup view)
    document.getElementById("newAnalysisBtn")?.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                setupView.style.display = "flex";
                resultsView.style.display = "none";
                statusMsg.style.opacity = "0";
                activateBtn.disabled = false;
                window.analysisResults = null;

                chrome.storage.local.get(["geminiApiKey"], (res) => {
                    if (res.geminiApiKey) {
                        toggleApiKeyView(true);
                        showStatus(TRANSLATIONS[currentLang].readyMsg, "success");
                    } else {
                        toggleApiKeyView(false);
                    }
                });
            }
        });
    });
});

})();
