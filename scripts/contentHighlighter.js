/**
 * @fileoverview Content script for Legit — fuzzy quote highlighting engine.
 *
 * This script is injected into the news article tab (not the side panel) and
 * provides interactive in-page highlighting. It is guarded by the
 * `window.legitHighlighterLoaded` flag so multiple injections are idempotent.
 *
 * Matching strategy (three-tier waterfall)
 * -----------------------------------------
 * 1. **Exact match**        – Case-insensitive literal regex search.
 * 2. **Flexible whitespace** – Same regex with `\s+` wildcards between tokens
 *                              to handle HTML-normalised whitespace differences.
 * 3. **Levenshtein fuzzy**  – Async sliding-window search (yields to the event
 *                              loop every 50 words). Accepts up to 35% edit distance.
 *                              Capped at 500-char quotes for performance.
 *
 * Highlight palettes
 * ------------------
 * • `default`    – yellow (bias / style quotes, auto-removed after 20 s)
 * • `supporting` – green  (supporting source citations)
 * • `contra`     – red    (contradicting source citations)
 *
 * Message protocol (chrome.runtime.onMessage)
 * -------------------------------------------
 * • `HIGHLIGHT_QUOTE` – { quote, index?, highlightType?, lang? }
 *     Finds and highlights the quote, scrolls to it, and plays a pulse animation.
 * • `CLEAR_HIGHLIGHTS` – Removes all `.legit-highlight` spans and normalises the DOM.
 */
if (!window.legitHighlighterLoaded) {
    window.legitHighlighterLoaded = true;

    // 1. GLOBAL PALETTES
    const PALETTES = {
        supporting: { bg: '#86efac', border: '#16a34a', shadow: 'rgba(22, 163, 74, 0.8)' },
        contra:     { bg: '#fca5a5', border: '#dc2626', shadow: 'rgba(220, 38, 38, 0.8)' },
        default:    { bg: '#fde047', border: '#ca8a04', shadow: 'rgba(234, 179, 8, 0.8)' }
    };

    const scheduler = () => new Promise(resolve => setTimeout(resolve, 0));

    let highlightTimeoutId = null;
    let visibilityListener = null;

    // --- MAIN ENTRY POINT ---
    /**
     * Main entry point: locates a quote in the article and highlights it.
     *
     * Executes the three-tier match waterfall (exact → flexible → Levenshtein).
     * On a fuzzy match, shows a warning toast. On total failure, shows an error toast.
     *
     * After a successful match:
     *  1. Wraps matching DOM text nodes in `.legit-highlight` spans.
     *  2. Scrolls the first fragment into view (`block: center`).
     *  3. Plays a three-iteration pulse animation on every fragment.
     *  4. Schedules auto-removal via `handleAutoRemove()`.
     *
     * @async
     * @param {string}  searchText - The quote text to find (may be AI-paraphrased).
     * @param {number}  [index=0]  - Which occurrence to highlight if multiple found.
     * @param {string}  [type='default'] - Palette key: "default" | "supporting" | "contra".
     * @returns {Promise<boolean>} `true` if highlighting succeeded, `false` otherwise.
     */
    async function highlightAndScroll(searchText, index = 0, type = 'default') {
        console.log('🔍 Searching for quote:', searchText);
        
        clearHighlights();
        
        const cleanSearch = searchText.trim();
        if (!cleanSearch) return false;

        // 1. Gather all text nodes and the full page text
        const { textNodes, fullText, nodeMap } = getAllTextNodes();
        
        let matches = [];
        let matchType = 'exact';

        // --- STRATEGY 1: EXACT MATCH (Best) ---
        matches = findGlobalMatches(fullText, cleanSearch, { mode: 'exact' });
        
        // --- STRATEGY 2: FLEXIBLE WHITESPACE (Good) ---
        if (matches.length === 0) {
            console.log('Exact match failed, trying flexible whitespace...');
            matches = findGlobalMatches(fullText, cleanSearch, { mode: 'whitespace' });
            matchType = 'flexible';
        }
        
        // --- STRATEGY 3: LEVENSHTEIN FUZZY MATCH (Fallback) ---
        if (matches.length === 0 && cleanSearch.length < 500) { // Safety cap
        console.log('Whitespace match failed, running Async Levenshtein...');
        // Await the new async function
        const fuzzyMatch = await findLevenshteinMatchAsync(fullText, cleanSearch);
            if (fuzzyMatch) {
                matches = [fuzzyMatch];
                matchType = 'fuzzy';
            }
        }

        // --- FAILURE HANDLER ---
        if (matches.length === 0) {
            // This works even if localization.js fails to load
            showToast(getTranslation('quoteMatchError'), 'error'); 
            return false;
        }

        console.log(`✅ Found ${matches.length} match(es) via ${matchType}`);
        
        if (matchType === 'fuzzy') {
            showToast(getTranslation('quoteMatchWarning'), 'warning');
        }

        // 3. Select the target match and map it back to DOM Nodes
        const bestMatch = matches[Math.min(index, matches.length - 1)];
        const rangeData = mapGlobalRangeToNodes(bestMatch.start, bestMatch.end, nodeMap);
        
        if (!rangeData) {
            showToast('❌ Error mapping location.', 'error');
            return false;
        }

        // 4. Highlight the range
        highlightRange(rangeData, type);
        
        // 5. Scroll to view & Animate ALL fragments (FIXED)
        const allHighlights = document.querySelectorAll('.legit-highlight');
        
        if (allHighlights.length > 0) {
            // Scroll to the very first fragment so the user sees the start
            allHighlights[0].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

            // Get the theme color
            const theme = PALETTES[type] || PALETTES.default;

            // Iterate over ALL highlighted fragments and animate them
            allHighlights.forEach(highlight => {
                highlight.animate([
                    { 
                        backgroundColor: theme.bg, 
                        boxShadow: `0 0 0 0px ${theme.shadow}`,
                        transform: 'scale(1)',
                        offset: 0
                    },
                    { 
                        backgroundColor: theme.bg, // Keep your original color
                        // Multiple shadows create a "neon" or "glow" effect
                        boxShadow: `0 0 5px 2px ${theme.shadow}, 0 0 10px 4px ${theme.shadow}`, 
                        transform: 'scale(1.05)', // Adds "pop"
                        offset: 0.5 
                    },
                    { 
                        backgroundColor: theme.bg, 
                        boxShadow: `0 0 0 0px ${theme.shadow}`,
                        transform: 'scale(1)',
                        offset: 1 
                    }
                ], {
                    duration: 700,
                    iterations: 3,
                    easing: 'ease-in-out'
                });
            });
        }

        handleAutoRemove(type);
        return true;
    }

    // --- HELPER: Gather Text Nodes ---
    /**
     * Traverses the live DOM and builds a flat, searchable representation of
     * all visible text content.
     *
     * Uses a `TreeWalker` to visit every `TEXT_NODE`. Non-visual nodes
     * (script, style, hidden elements) are rejected. To handle block-element
     * boundaries (e.g. paragraph breaks) without losing position tracking, a
     * single space is injected into `fullText` whenever the walker crosses into
     * a new block-level parent element.
     *
     * Returns three parallel data structures:
     * - `textNodes`  – raw DOM Text node references (used for wrapping).
     * - `nodeMap`    – `{ node, start, end }` entries mapping each text node to
     *                  its character range within `fullText`.
     * - `fullText`   – the concatenated string searched by the match strategies.
     *
     * @returns {{ textNodes: Text[], fullText: string, nodeMap: Array<Object> }}
     */
    function getAllTextNodes() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    const tag = parent.tagName;
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (parent.offsetParent === null) return NodeFilter.FILTER_REJECT;
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        const nodeMap = []; 
        let fullText = "";
        let currentIndex = 0;
        
        const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER']);
        
        let lastParent = null;
        let node;

        while (node = walker.nextNode()) {
            const content = node.textContent;
            
            if (content.trim().length > 0) {
                const parent = node.parentElement;
                
                if (lastParent && parent !== lastParent && blockTags.has(parent.tagName)) {
                    fullText += ' '; 
                    currentIndex += 1;
                }

                textNodes.push(node);
                
                nodeMap.push({
                    node: node,
                    start: currentIndex,
                    end: currentIndex + content.length
                });
                
                fullText += content;
                currentIndex += content.length;
                
                lastParent = parent;
            }
        }
        
        return { textNodes, fullText, nodeMap };
    }

    // --- HELPER: Standard Search ---
    /**
     * Finds all occurrences of `query` within `fullText` using a compiled regex.
     *
     * Two modes are supported:
     *  - `'exact'`      – Literal match (special regex chars escaped).
     *  - `'whitespace'` – Each run of whitespace in the query is replaced with
     *                     `\s+` to tolerate HTML-normalised whitespace differences.
     *
     * Both modes are case-insensitive (`gi` flags).
     *
     * @param {string} fullText         - Concatenated page text from `getAllTextNodes()`.
     * @param {string} query            - The search string.
     * @param {{ mode: 'exact'|'whitespace' }} options
     * @returns {Array<{ start: number, end: number }>} Array of character-index ranges.
     */
    function findGlobalMatches(fullText, query, options) {
        let regex;
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        try {
            if (options.mode === 'exact') {
                regex = new RegExp(escapedQuery, 'gi');
            } else if (options.mode === 'whitespace') {
                const pattern = escapedQuery.replace(/\s+/g, '\\s+');
                regex = new RegExp(pattern, 'gi');
            }
        } catch (e) {
            return [];
        }

        const matches = [];
        let match;
        while ((match = regex.exec(fullText)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }
        return matches;
    }

    // --- HELPER: Levenshtein Distance Calculation ---
    /**
     * Computes the Levenshtein (edit) distance between two strings using the
     * optimised two-row dynamic programming algorithm.
     *
     * Optimisations applied:
     *  1. **Length swap** – ensures `a` is always the shorter string, minimising
     *     inner-loop iterations.
     *  2. **Row reuse**   – only two rows are kept in memory (O(min(|a|,|b|)) space)
     *     rather than a full |a|×|b| matrix.
     *  3. **Early exit**  – if the minimum value in the current row already exceeds
     *     `threshold`, returns `Infinity` immediately to prune the sliding window
     *     in `findLevenshteinMatchAsync`.
     *
     * @param {string} a             - First string.
     * @param {string} b             - Second string.
     * @param {number} [threshold]   - Early-exit threshold; skip computation once
     *                                 the distance exceeds this value.
     * @returns {number} Edit distance, or `Infinity` if threshold was exceeded.
     */
    function getLevenshteinDistance(a, b, threshold = Infinity) {
        if (a === b) return 0;
        if (a.length > b.length) [a, b] = [b, a]; // Ensure 'a' is shorter

        let prevRow = new Array(a.length + 1);
        let currentRow = new Array(a.length + 1);

        for (let i = 0; i <= a.length; i++) prevRow[i] = i;

        for (let i = 1; i <= b.length; i++) {
            currentRow[0] = i;
            let minRowDist = currentRow[0];

            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                currentRow[j] = Math.min(
                    currentRow[j - 1] + 1,    // Insertion
                    prevRow[j] + 1,           // Deletion
                    prevRow[j - 1] + cost     // Substitution
                );
                minRowDist = Math.min(minRowDist, currentRow[j]);
            }

            // Optimization 3: Early Exit
            if (minRowDist > threshold) return Infinity;

            // Swap arrays for next iteration (avoid allocation)
            [prevRow, currentRow] = [currentRow, prevRow];
        }

        return prevRow[a.length];
    }


    // --- HELPER: Async Fuzzy Levenshtein Matcher ---
    /**
     * Searches `fullText` for the window of words most similar to `query`
     * using a sliding-window Levenshtein approach.
     *
     * Algorithm:
     *  1. Tokenise `fullText` into word-boundary positions via `/\S+/g`.
     *  2. Determine a window size range (90%–110% of `query`'s word count).
     *  3. For each starting word `i`, test windows of each size:
     *     a. Extract the raw substring and normalise (lowercase, strip non-alphanumeric).
     *     b. Skip windows whose normalised length differs from the target by > 30%
     *        (cheap pre-filter before the expensive Levenshtein call).
     *     c. Compute `dist / max(|candidate|, |target|)` as a normalised error score.
     *  4. Track the global best-score window.
     *  5. Every 50 words, `await scheduler()` to yield to the browser event loop
     *     and prevent "Script taking too long" warnings on large articles.
     *
     * Accepts matches with a normalised error ≤ 0.35 (35% tolerance).
     *
     * @async
     * @param {string} fullText - Concatenated page text from `getAllTextNodes()`.
     * @param {string} query    - Quote text to find (typically AI output, may differ).
     * @returns {Promise<{ start: number, end: number }|null>} Best-match character range,
     *   or `null` if nothing within tolerance was found.
     */
    async function findLevenshteinMatchAsync(fullText, query) {
        if (!query || query.length < 5) return null;

        const normalize = (str) => str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); 
        
        // 1. Tokenize full text
        const wordMatches = [];
        const wordRegex = /\S+/g; 
        let match;
        while ((match = wordRegex.exec(fullText)) !== null) {
            wordMatches.push({ start: match.index, end: match.index + match[0].length });
        }

        const targetNorm = normalize(query);
        const queryWordCount = query.trim().split(/\s+/).length;
        
        // 2. Window Settings (0.9x to 1.1x length)
        const minWindow = Math.max(1, Math.floor(queryWordCount * 0.9)); 
        const maxWindow = Math.ceil(queryWordCount * 1.1);

        let bestDistance = Infinity;
        let bestLocation = null;
        
        // 3. Sliding Window Loop
        for (let i = 0; i < wordMatches.length; i++) {
            
            // Yield to browser every 50 words to prevent freezing
            if (i % 50 === 0) await scheduler();

            for (let windowSize = minWindow; windowSize <= maxWindow; windowSize++) {
                if (i + windowSize > wordMatches.length) break;

                const startNode = wordMatches[i];
                const endNode = wordMatches[i + windowSize - 1];
                
                const candidateRaw = fullText.substring(startNode.start, endNode.end);
                const candidateNorm = normalize(candidateRaw);

                // Optimization: Skip if lengths differ by more than 30%
                if (Math.abs(candidateNorm.length - targetNorm.length) > targetNorm.length * 0.3) continue;

                const dist = getLevenshteinDistance(targetNorm, candidateNorm);
                const score = dist / Math.max(targetNorm.length, candidateNorm.length);

                if (score < bestDistance) {
                    bestDistance = score;
                    bestLocation = { start: startNode.start, end: endNode.end };
                }
            }
        }

        // Threshold: Allow 35% error
        if (bestLocation && bestDistance < 0.35) {
            console.log(`🎯 Fuzzy Match Found! Score: ${bestDistance.toFixed(2)}`);
            return bestLocation;
        }
        return null;
    }

    // --- HELPER: Map Global Indices to DOM Nodes ---
    /**
     * Translates a character-index range in `fullText` back to specific DOM text
     * nodes and intra-node character offsets.
     *
     * Iterates the `nodeMap` produced by `getAllTextNodes()` until both the start
     * and end nodes are located. Offsets are computed relative to the start of
     * each node's text content.
     *
     * @param {number}          globalStart - Start index in the concatenated `fullText`.
     * @param {number}          globalEnd   - End index in the concatenated `fullText`.
     * @param {Array<Object>}   nodeMap     - Node map from `getAllTextNodes()`.
     * @returns {{ startNode, startOffset, endNode, endOffset, nodeMap,
     *             globalStart, globalEnd }|null} Range data object, or `null` if
     *   the range could not be mapped to any node.
     */
    function mapGlobalRangeToNodes(globalStart, globalEnd, nodeMap) {
        let startNodeInfo = null;
        let endNodeInfo = null;
        
        for (const item of nodeMap) {
            if (!startNodeInfo && globalStart >= item.start && globalStart < item.end) {
                startNodeInfo = { 
                    node: item.node, 
                    offset: globalStart - item.start 
                };
            }
            if (!endNodeInfo && globalEnd > item.start && globalEnd <= item.end) {
                endNodeInfo = { 
                    node: item.node, 
                    offset: globalEnd - item.start 
                };
            }
            if (startNodeInfo && endNodeInfo) break;
        }
        
        if (!startNodeInfo || !endNodeInfo) return null;

        return {
            startNode: startNodeInfo.node,
            startOffset: startNodeInfo.offset,
            endNode: endNodeInfo.node,
            endOffset: endNodeInfo.offset,
            nodeMap: nodeMap,
            globalStart: globalStart,
            globalEnd: globalEnd
        };
    }

    // --- HELPER: Highlight Range ---
    /**
     * Applies highlights to all DOM text nodes that overlap the given character range.
     *
     * Filters `nodeMap` to nodes that intersect `[globalStart, globalEnd)`, then
     * calls `wrapTextNode()` for each, passing the clipped local start/end offsets.
     *
     * @param {{ nodeMap, globalStart, globalEnd }} rangeData - Output of `mapGlobalRangeToNodes()`.
     * @param {string} type - Palette key ("default" | "supporting" | "contra").
     */
    function highlightRange(rangeData, type) {
        const { nodeMap, globalStart, globalEnd } = rangeData;
        const theme = PALETTES[type] || PALETTES.default;

        const nodesToHighlight = nodeMap.filter(item => 
            (item.end > globalStart && item.start < globalEnd)
        );

        nodesToHighlight.forEach(item => {
            const node = item.node;
            let localStart = 0;
            let localEnd = node.textContent.length;

            if (item.start < globalStart) localStart = globalStart - item.start;
            if (item.end > globalEnd) localEnd = globalEnd - item.start;

            wrapTextNode(node, localStart, localEnd, theme);
        });
    }

    /**
     * Wraps a substring of a DOM text node in a styled `<span class="legit-highlight">`.
     *
     * Splits the text node into up to three sibling nodes:
     *   [text before] + [<span>highlighted text</span>] + [text after]
     *
     * The original text node is removed after the siblings are inserted.
     * `parent.normalize()` is intentionally NOT called here to avoid merging
     * adjacent text nodes prematurely, which would break the `nodeMap` indices
     * held by other nodes in the same highlight range.
     *
     * @param {Text}   textNode - The DOM text node to partially wrap.
     * @param {number} start    - Start offset within the node's text content.
     * @param {number} end      - End offset within the node's text content.
     * @param {{ bg, border, shadow }} theme - Colour palette from `PALETTES`.
     */
    function wrapTextNode(textNode, start, end, theme) {
        if (start < 0 || end > textNode.textContent.length || start >= end) return;

        const text = textNode.textContent;
        const before = text.substring(0, start);
        const highlighted = text.substring(start, end);
        const after = text.substring(end);

        const span = document.createElement('span');
        span.className = 'legit-highlight';
        span.textContent = highlighted;
        
        span.style.cssText = `
            background-color: ${theme.bg};
            color: #000;
            border: 2px solid ${theme.border};
            border-radius: 2px;
            box-shadow: 0 0 5px ${theme.shadow};
            display: inline;
            transition: background-color 0.2s;
        `;

        const parent = textNode.parentNode;
        if(parent) {
            parent.insertBefore(document.createTextNode(before), textNode);
            parent.insertBefore(span, textNode);
            parent.insertBefore(document.createTextNode(after), textNode);
            parent.removeChild(textNode);
        }
    }

    // --- HELPER: Toast Notification ---
    /**
     * Displays a transient toast notification in the top-right corner of the page.
     *
     * Removes any existing toast before creating a new one to prevent stacking.
     * The toast slides in via a CSS transition on `opacity` and `transform`, stays
     * for 4 seconds, then slides back out and removes itself from the DOM.
     *
     * RTL (Hebrew) mode: adds `direction: rtl` to the inline style automatically.
     *
     * @param {string} message                    - Notification text to display.
     * @param {'info'|'warning'|'error'} [type='info'] - Determines background colour.
     */
    function showToast(message, type = 'info') {
        const existing = document.getElementById('legit-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'legit-toast';
        toast.textContent = message;
        
        const bgColors = {
            info: '#3b82f6',
            warning: '#0ad063',
            error: '#ef4444'
        };

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${bgColors[type] || bgColors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;

        if (currentLang === 'he') toast.style.cssText += `\n
        direction: rtl;`

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Schedules automatic removal of `default`-type highlights after 20 seconds.
     *
     * For `default` type only (bias / style quotes):
     *  - Any existing auto-remove timeout is cancelled first to reset the clock.
     *  - A new `setTimeout` is set for 20 seconds.
     *  - A `visibilitychange` listener is attached so highlights are cleared
     *    immediately if the user switches away from the tab.
     *
     * Source-type highlights (`supporting` / `contra`) are permanent until the
     * next call to `clearHighlights()` or page navigation.
     *
     * @param {string} type - The highlight palette type that was just applied.
     */
    function handleAutoRemove(type) {
        if (highlightTimeoutId) {
            clearTimeout(highlightTimeoutId);
            highlightTimeoutId = null;
        }

        if (type === 'default') {
            highlightTimeoutId = setTimeout(() => {
                clearHighlights();
                highlightTimeoutId = null;
            }, 20000);
            
            if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
            
            visibilityListener = () => {
                if (document.hidden) {
                    clearHighlights();
                    if (highlightTimeoutId) clearTimeout(highlightTimeoutId);
                }
            };
            document.addEventListener('visibilitychange', visibilityListener);
        }
    }

    /**
     * Removes all `.legit-highlight` spans from the DOM and normalises text nodes.
     *
     * For each highlight span:
     *  1. Replaces it with a plain text node containing the span's text content.
     *  2. Calls `parent.normalize()` to merge adjacent text siblings created by
     *     `wrapTextNode()` back into single nodes, restoring the original DOM state.
     *
     * Also removes the `visibilitychange` listener registered by `handleAutoRemove`.
     */
    function clearHighlights() {
        document.querySelectorAll('.legit-highlight').forEach(highlight => {
            const text = highlight.textContent;
            const parent = highlight.parentNode;
            if(parent) {
                parent.replaceChild(document.createTextNode(text), highlight);
                parent.normalize(); 
            }
        });
        if (visibilityListener) {
            document.removeEventListener('visibilitychange', visibilityListener);
            visibilityListener = null;
        }
    }

    // --- MESSAGE LISTENER (Fixed) ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            if (message.type === 'HIGHLIGHT_QUOTE') {
                currentLang = message.lang || 'en';
                
                // Call async function but don't await it (send immediate response to keep connection alive)
                highlightAndScroll(
                    message.quote, 
                    message.index || 0, 
                    message.highlightType || 'default'
                ).then(success => {
                    console.log("Async Highlight Complete:", success);
                });

                // Send immediate success so popup doesn't timeout
                sendResponse({ success: true, status: "processing" });
                
            } else if (message.type === 'CLEAR_HIGHLIGHTS') {
                clearHighlights();
                sendResponse({ success: true });
            }
        } catch (error) {
            console.error("Critical Highlight Error:", error);
            // Ensure we still send a response so the port doesn't close unexpectedly
            sendResponse({ success: false, error: error.message });
        }
        
        // IMPORTANT: Return false (or nothing) to indicate we are responding SYNCHRONOUSLY.
        // We only use 'return true' if we are doing something async like a fetch() inside here.
        return false; 
    });

    // --- HELPER: Safe Translation ---
    /**
     * Safely retrieves a UI string from the global `TRANSLATIONS` object.
     *
     * Provides hardcoded English fallbacks for the two keys used by this script
     * (`quoteMatchError`, `quoteMatchWarning`) so highlighting still works
     * even if `localization.js` failed to load or `currentLang` is undefined.
     *
     * @param {string} key - Translation key to look up.
     * @returns {string} The translated string, or the key itself as a last resort.
     */
    function getTranslation(key) {
        // Try to access the global variable safely
        if (typeof TRANSLATIONS !== 'undefined' && typeof currentLang !== 'undefined') {
            return TRANSLATIONS[currentLang][key];
        }
        // Fallbacks if localization.js is missing
        if (key === 'quoteMatchError') return "Quote not found. Please try searching manually.";
        if (key === 'quoteMatchWarning') return "Exact quote match not found. Showing closest match.";
        return key;
    }
}