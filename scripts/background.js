// background.js - Enhanced version with caching and rate limiting

// Open Side Panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
  
// Simple in-memory cache (cleared on extension reload)
const responseCache = new Map();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const MAX_CACHE_SIZE = 50;

// Rate limiting
const requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 30;

/**
 * Retrieves the stored Gemini API key from Chrome storage
 */
async function getGeminiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["geminiApiKey"], (result) => {
            resolve(result.geminiApiKey);
        });
    });
}

/**
 * Check if we're within rate limits
 */
function checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps
    while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
        requestTimestamps.shift();
    }
    
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    
    requestTimestamps.push(now);
    return true;
}

/**
 * Generate cache key from prompt
 */
function getCacheKey(promptText) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < promptText.length; i++) {
        const char = promptText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `cache_${hash}`;
}

/**
 * Check cache for existing response
 */
function getCachedResponse(promptText) {
    const key = getCacheKey(promptText);
    const cached = responseCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.response;
    }
    
    return null;
}

/**
 * Store response in cache
 */
function cacheResponse(promptText, response) {
    const key = getCacheKey(promptText);
    
    // Implement simple LRU by removing oldest if cache is full
    if (responseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    
    responseCache.set(key, {
        response: response,
        timestamp: Date.now()
    });
}

/**
 * Calls the Gemini API with a given prompt text and returns the trimmed response text
 */
async function callGemini(promptText, options = {}) {
    const { skipCache = false, retries = 2, useSearch = false } = options;
    
    // Check cache first (unless skipped)
    if (!skipCache) {
        const cached = getCachedResponse(promptText);
        if (cached) return cached;
    }
    
    // Check rate limit
    if (!checkRateLimit()) {
        throw new Error("RATE_LIMIT_EXCEEDED - Please wait a moment before analyzing again");
    }
    
    // Get API key
    const apiKey = await getGeminiKey();
    if (!apiKey) {
        throw new Error("NO_API_KEY - Please enter your Gemini API key");
    }
    
    // Attempt API call with retries
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const requestBody = {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: promptText }]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 2048,
                    topK: 40,
                    topP: 0.95
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
                ]
            };

            if (useSearch) {
                requestBody.tools = [
                    { google_search: {} } 
                ];
            }
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `API_ERROR (${response.status})`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMsg = errorData.error?.message || errorMsg;
                } catch (e) {
                    // If can't parse, use status text
                    errorMsg = `${errorMsg}: ${response.statusText}`;
                }
                
                throw new Error(errorMsg);
            }
            
            const data = await response.json();
            console.log("✅ RAW GEMINI RESPONSE:", data);
            
            // Check for blocked content
            if (data.promptFeedback?.blockReason) {
                throw new Error(`CONTENT_BLOCKED: ${data.promptFeedback.blockReason}`);
            }
            
            if (!data.candidates || !data.candidates.length) {
                throw new Error("EMPTY_RESPONSE - No response from AI");
            }
            
            const candidate = data.candidates[0];
            
            // Check for finish reason issues
            if (candidate.finishReason && candidate.finishReason !== "STOP") {
                console.warn("⚠️ Unusual finish reason:", candidate.finishReason);
            }
            
            // Extract text from response
            const text =
                candidate.content?.parts?.[0]?.text ||
                candidate.output_text ||
                null;
            
            if (!text) {
                throw new Error("NO_TEXT_IN_RESPONSE - AI returned empty response");
            }
            
            const trimmedText = text.trim();
            
            // Cache successful response
            cacheResponse(promptText, trimmedText);
            
            return trimmedText;
            
        } catch (err) {
            lastError = err;
            
            // Don't retry on certain errors
            if (err.message.includes("NO_API_KEY") || 
                err.message.includes("RATE_LIMIT") ||
                err.message.includes("CONTENT_BLOCKED")) {
                throw err;
            }
            
            // Wait before retrying (exponential backoff)
            if (attempt < retries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Retry attempt ${attempt + 1} after ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // If all retries failed, throw the last error
    throw lastError;
}

/**
 * Listen for messages from the popup; specifically the CALL_GEMINI action
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "CALL_GEMINI") {
        callGemini(msg.prompt, msg.options || {})
            .then(result => {
                sendResponse({ result });
            })
            .catch(err => {
                console.error("❌ Gemini Error:", err.message);
                sendResponse({ error: err.message });
            });
        
        // Return true to indicate async response
        return true;
    }
    
    // Handle cache clearing request
    if (msg.type === "CLEAR_CACHE") {
        responseCache.clear();
        sendResponse({ success: true });
        return true;
    }
    
    // Handle stats request
    if (msg.type === "GET_STATS") {
        sendResponse({
            cacheSize: responseCache.size,
            requestsLastMinute: requestTimestamps.length
        });
        return true;
    }
});

// Clear old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            responseCache.delete(key);
        }
    }
}, 1000 * 60 * 10); // Every 10 minutes

console.log("🚀 Legit Extension Background Service Worker Started");