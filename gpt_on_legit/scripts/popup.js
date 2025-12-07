// popup.js - Enhanced version with improved UX and features

document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");
    const setupView = document.getElementById("setupView");
    const resultsView = document.getElementById("resultsView");

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
            // Auto-hide success message after 2s
            setTimeout(() => statusMsg.style.opacity = "0", 2000);
        });
    });

    // Main analysis button
    activateBtn.addEventListener("click", async () => {
        await startAnalysis();
    });

    // Helper function for status messages
    function showStatus(message, type) {
        statusMsg.textContent = message;
        statusMsg.className = `status ${type}`;
        statusMsg.style.opacity = "1";
    }

    // Main analysis function
    async function startAnalysis() {
        showStatus("🔍 Starting analysis...", "info");
        loader.style.display = "block";
        activateBtn.disabled = true;

        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            // Extract page data
            const pageData = await extractPageData(tab);
            
            // Switch to results view
            setupView.style.display = "none";
            resultsView.style.display = "flex";
            
            // Show page info header
            displayPageHeader(pageData);

            // Define analysis agents
            const agents = getAnalysisAgents(pageData);

            // Start progressive analysis
            await runProgressiveAnalysis(agents);

            // Calculate and display overall score
            displayOverallScore();

        } catch (err) {
            console.error("Analysis error:", err);
            showStatus(`❌ Error: ${err.message}`, "error");
            activateBtn.disabled = false;
        } finally {
            loader.style.display = "none";
        }
    }

    // Extract page data from active tab
    async function extractPageData(tab) {
        const [titleResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.title
        });

        const [domainResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.location.hostname
        });

        const [contentResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const article = document.querySelector('article');
                const main = document.querySelector('main');
                const content = article || main || document.body;
                return content.innerText;
            }
        });

        const bodyText = contentResult?.result || "";
        const excerpt = bodyText.length > 1200 ? bodyText.slice(0, 1200) + "..." : bodyText;

        return {
            title: titleResult?.result?.trim() || "Unknown Page",
            domain: domainResult?.result || "unknown",
            excerpt: excerpt,
            url: tab.url
        };
    }

    // Display page information header
    function displayPageHeader(pageData) {
        const headerDiv = document.getElementById("pageHeader");
        headerDiv.innerHTML = `
            <div class="page-title">${escapeHtml(pageData.title)}</div>
            <div class="page-domain">📍 ${escapeHtml(pageData.domain)}</div>
        `;
    }

    // Define all analysis agents with improved prompts
    function getAnalysisAgents(pageData) {
        return [
            {
                id: "source",
                name: "Source Credibility",
                icon: "🏛️",
                priority: "high",
                weight: 0.2,
                prompt: `Analyze the credibility of this news source:
Domain: ${pageData.domain}

Rate the source as: HIGHLY_CREDIBLE, CREDIBLE, NEUTRAL, QUESTIONABLE, or UNRELIABLE
Then provide a 2-3 sentence explanation mentioning:
- Whether it's a recognized news organization
- Any known bias or issues
- General reputation

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "headline",
                name: "Headline Analysis",
                icon: "📰",
                priority: "high",
                weight: 0.15,
                prompt: `Analyze if this headline matches the content:
Headline: ${pageData.title}
Content preview: ${pageData.excerpt.slice(0, 400)}

Rate as: ACCURATE, MOSTLY_ACCURATE, SOMEWHAT_MISLEADING, CLICKBAIT, or DECEPTIVE
Provide 2 sentences explaining your rating.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "sources",
                name: "Source Attribution",
                icon: "📎",
                priority: "high",
                weight: 0.15,
                prompt: `Check if claims are properly sourced:
Content: ${pageData.excerpt.slice(0, 500)}

Rate as: WELL_SOURCED, PARTIALLY_SOURCED, POORLY_SOURCED, or UNSOURCED
List 2-3 examples of how sources are (or aren't) cited.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "accuracy",
                name: "Factual Accuracy",
                icon: "✓",
                priority: "high",
                weight: 0.2,
                prompt: `Check for factual accuracy:
Content: ${pageData.excerpt.slice(0, 600)}

Rate as: ACCURATE, MOSTLY_ACCURATE, UNVERIFIABLE, CONTAINS_ERRORS, or MISLEADING
Note any specific claims that seem questionable (or confirm accuracy).

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "tone",
                name: "Emotional Tone",
                icon: "🎭",
                priority: "medium",
                weight: 0.1,
                prompt: `Analyze emotional manipulation:
Content: ${pageData.excerpt.slice(0, 400)}

Rate as: NEUTRAL, SLIGHTLY_EMOTIONAL, EMOTIONAL, or HIGHLY_MANIPULATIVE
Explain what language choices suggest this.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "bias",
                name: "Bias Detection",
                icon: "⚖️",
                priority: "medium",
                weight: 0.1,
                prompt: `Detect potential bias:
Domain: ${pageData.domain}
Content: ${pageData.excerpt.slice(0, 400)}

Rate as: BALANCED, SLIGHT_BIAS, MODERATE_BIAS, or STRONG_BIAS
Specify political leaning (left/center/right) if applicable and explain.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "style",
                name: "Writing Quality",
                icon: "✍️",
                priority: "low",
                weight: 0.05,
                prompt: `Evaluate writing style:
Content: ${pageData.excerpt.slice(0, 400)}

Rate as: PROFESSIONAL, ADEQUATE, SENSATIONALIST, or POOR_QUALITY
Note if it's journalistic, opinion-based, or propagandistic.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            },
            {
                id: "freshness",
                name: "Content Freshness",
                icon: "📅",
                priority: "low",
                weight: 0.05,
                prompt: `Check if content is current:
Title: ${pageData.title}
Content: ${pageData.excerpt.slice(0, 300)}

Rate as: CURRENT, RECENT, DATED, or RECYCLED
Note any date references or signs of old news presented as new.

Format: RATING: [your rating]
EXPLANATION: [your explanation]`
            }
        ];
    }

    // Run analysis with progressive display
    async function runProgressiveAnalysis(agents) {
        const agentGrid = document.getElementById("agentGrid");
        agentGrid.innerHTML = "";

        // Sort by priority
        const sorted = [...agents].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        // Create agent cards with loading state
        for (const agent of sorted) {
            const card = createAgentCard(agent);
            agentGrid.appendChild(card);
        }

        // Analyze agents in parallel (but display progressively)
        const promises = sorted.map(agent => analyzeAgent(agent));
        await Promise.all(promises);
    }

    // Create agent card UI
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

    // Analyze individual agent
    async function analyzeAgent(agent) {
        const card = document.getElementById(`agent-${agent.id}`);
        const contentDiv = card.querySelector(".agent-content");
        const loaderDiv = card.querySelector(".agent-loader");

        try {
            const response = await chrome.runtime.sendMessage({
                type: "CALL_GEMINI",
                prompt: agent.prompt
            });

            loaderDiv.style.display = "none";

            if (response.error) {
                throw new Error(response.error);
            }

            const result = parseAgentResponse(response.result);
            
            // Store result for scoring
            agent.result = result;

            // Display result
            contentDiv.innerHTML = `
                <div class="rating-badge rating-${result.rating.toLowerCase()}">${formatRating(result.rating)}</div>
                <div class="agent-explanation">${escapeHtml(result.explanation)}</div>
            `;

            // Animate card
            card.classList.add("completed");

        } catch (err) {
            loaderDiv.style.display = "none";
            contentDiv.innerHTML = `<div class="agent-error">⚠️ Analysis failed: ${escapeHtml(err.message)}</div>`;
            agent.result = { rating: "ERROR", explanation: err.message, score: 0 };
        }
    }

    // Parse agent response
    function parseAgentResponse(text) {
        const ratingMatch = text.match(/RATING:\s*([A-Z_]+)/i);
        const explanationMatch = text.match(/EXPLANATION:\s*(.+?)(?=\n\n|$)/is);

        const rating = ratingMatch ? ratingMatch[1].trim() : "UNKNOWN";
        const explanation = explanationMatch ? explanationMatch[1].trim() : text;

        // Convert rating to score (0-100)
        const score = ratingToScore(rating);

        return { rating, explanation, score };
    }

    // Convert rating to numerical score
    function ratingToScore(rating) {
        const scoreMap = {
            // Positive ratings
            HIGHLY_CREDIBLE: 100,
            CREDIBLE: 85,
            WELL_SOURCED: 95,
            ACCURATE: 95,
            MOSTLY_ACCURATE: 80,
            NEUTRAL: 85,
            BALANCED: 90,
            PROFESSIONAL: 85,
            CURRENT: 90,
            RECENT: 80,
            ADEQUATE: 70,
            
            // Neutral/Uncertain
            PARTIALLY_SOURCED: 60,
            UNVERIFIABLE: 50,
            SLIGHTLY_EMOTIONAL: 70,
            SLIGHT_BIAS: 70,
            DATED: 60,
            
            // Negative ratings
            QUESTIONABLE: 40,
            SOMEWHAT_MISLEADING: 35,
            POORLY_SOURCED: 30,
            EMOTIONAL: 40,
            MODERATE_BIAS: 40,
            SENSATIONALIST: 35,
            POOR_QUALITY: 30,
            RECYCLED: 30,
            
            // Very negative
            UNRELIABLE: 10,
            CLICKBAIT: 15,
            DECEPTIVE: 5,
            UNSOURCED: 15,
            CONTAINS_ERRORS: 20,
            MISLEADING: 10,
            HIGHLY_MANIPULATIVE: 5,
            STRONG_BIAS: 20,
            
            // Default
            UNKNOWN: 50,
            ERROR: 50
        };

        return scoreMap[rating] || 50;
    }

    // Format rating for display
    function formatRating(rating) {
        return rating.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Calculate and display overall legitimacy score
    function displayOverallScore() {
        const agents = getAnalysisAgents({}).map(a => {
            const card = document.getElementById(`agent-${a.id}`);
            if (!card) return null;
            // Retrieve stored result
            return a;
        }).filter(Boolean);

        let totalScore = 0;
        let totalWeight = 0;

        agents.forEach(agent => {
            if (agent.result && agent.result.score !== undefined) {
                totalScore += agent.result.score * agent.weight;
                totalWeight += agent.weight;
            }
        });

        const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

        const scoreDisplay = document.getElementById("overallScore");
        const scoreValue = document.getElementById("scoreValue");
        const scoreLabel = document.getElementById("scoreLabel");
        const scoreBar = document.getElementById("scoreBar");

        scoreValue.textContent = overallScore;
        scoreBar.style.width = `${overallScore}%`;

        // Set color and label based on score
        let color, label, emoji;
        if (overallScore >= 80) {
            color = "#10b981";
            label = "Highly Credible";
            emoji = "✅";
        } else if (overallScore >= 60) {
            color = "#f59e0b";
            label = "Moderately Credible";
            emoji = "⚠️";
        } else if (overallScore >= 40) {
            color = "#ef4444";
            label = "Questionable";
            emoji = "❌";
        } else {
            color = "#991b1b";
            label = "Highly Questionable";
            emoji = "🚨";
        }

        scoreBar.style.backgroundColor = color;
        scoreLabel.textContent = `${emoji} ${label}`;
        scoreLabel.style.color = color;

        scoreDisplay.style.display = "block";
    }

    // Export results functionality
    document.getElementById("exportBtn")?.addEventListener("click", () => {
        // Implementation for exporting results
        alert("Export feature - would save analysis as PDF/JSON");
    });

    // New analysis button
    document.getElementById("newAnalysisBtn")?.addEventListener("click", () => {
        setupView.style.display = "flex";
        resultsView.style.display = "none";
        statusMsg.style.opacity = "0";
        activateBtn.disabled = false;
    });

    // Utility function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});