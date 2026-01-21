// ========================================
// SMART FUZZY HIGHLIGHTER (Multi-Node Support)
// ========================================

if (!window.legitHighlighterLoaded) {
    window.legitHighlighterLoaded = true;
    
    let highlightTimeoutId = null;
    let visibilityListener = null;

    // --- MAIN ENTRY POINT ---
    function highlightAndScroll(searchText, index = 0, type = 'default') {
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
        
        // --- STRATEGY 3: FUZZY SIMILARITY (Fallback) ---
        if (matches.length === 0) {
            console.log('⚠️ Whitespace match failed, trying fuzzy similarity...');
            const fuzzyMatch = findFuzzyMatch(fullText, cleanSearch);
            if (fuzzyMatch) {
                matches = [fuzzyMatch];
                matchType = 'fuzzy';
            }
        }

        // --- FAILURE HANDLER ---
        if (matches.length === 0) {
            console.warn('❌ Quote not found on page:', cleanSearch);
            showToast('Exact quote not found. Please try searching manually.', 'error');
            return false;
        }

        console.log(`✅ Found ${matches.length} match(es) via ${matchType}`);
        
        // Notify user if we had to degrade to fuzzy match
        if (matchType === 'fuzzy') {
            showToast('Exact match not found. Showing closest match.', 'warning');
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
        
        // 5. Scroll to the first highlighted element
        const firstHighlight = document.querySelector('.legit-highlight');
        if (firstHighlight) {
            firstHighlight.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            firstHighlight.style.animation = 'pulse 1s ease-in-out 3';
        }

        // Auto-remove logic
        handleAutoRemove(type);
        
        return true;
    }

    // --- HELPER: Gather Text Nodes ---
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
        
        let node;
        while (node = walker.nextNode()) {
            const content = node.textContent;
            if (content.length > 0) {
                textNodes.push(node);
                nodeMap.push({
                    node: node,
                    start: currentIndex,
                    end: currentIndex + content.length
                });
                fullText += content;
                currentIndex += content.length;
            }
        }
        
        return { textNodes, fullText, nodeMap };
    }

    // --- HELPER: Standard Search Strategies ---
    function findGlobalMatches(fullText, query, options) {
        let regex;
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        try {
            if (options.mode === 'exact') {
                regex = new RegExp(escapedQuery, 'gi');
            } else if (options.mode === 'whitespace') {
                // Collapse multiple spaces into one regex \s+
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

    // --- HELPER: Advanced Fuzzy Matcher ---
    // Finds the substring in fullText that shares the most unique 4-char sequences (grams) with query
    function findFuzzyMatch(fullText, query) {
        // 1. Sanity check: if query is too short, fuzzy matching is dangerous
        if (query.length < 15) return null;

        const normalize = (str) => str.toLowerCase().replace(/[^\w]/g, '');
        const target = normalize(query);
        
        // Sliding window parameters
        const windowSize = query.length + 20; // Allow for some extra words/chars
        const step = Math.floor(query.length / 4); 
        
        let bestScore = 0;
        let bestLocation = null;

        // Iterate through text in chunks
        for (let i = 0; i < fullText.length; i += step) {
            const chunk = fullText.substring(i, i + windowSize);
            const normChunk = normalize(chunk);
            
            // Simple similarity: Overlapping character count
            // (For production, Levenshtein distance is better but slower)
            let score = 0;
            // Check for shared trigrams
            for(let j=0; j < target.length - 3; j++) {
                if(normChunk.includes(target.substring(j, j+3))) {
                    score++;
                }
            }

            // Threshold: Needs substantial overlap
            if (score > bestScore && score > (target.length * 0.4)) { // 40% match minimum
                bestScore = score;
                bestLocation = { start: i, end: i + chunk.length };
            }
        }

        if (bestLocation) {
            // Refine the boundaries (simple trim to improve visual)
            return bestLocation;
        }
        return null;
    }

    // --- HELPER: Map Global Indices to DOM Nodes ---
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
    function highlightRange(rangeData, type) {
        const { startNode, startOffset, endNode, endOffset, nodeMap, globalStart, globalEnd } = rangeData;
        
        const palettes = {
            supporting: { bg: '#86efac', border: '#16a34a', shadow: 'rgba(22, 163, 74, 0.4)' },
            contra:     { bg: '#fca5a5', border: '#dc2626', shadow: 'rgba(220, 38, 38, 0.4)' },
            default:    { bg: '#fde047', border: '#ca8a04', shadow: 'rgba(234, 179, 8, 0.4)' }
        };
        const theme = palettes[type] || palettes.default;

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

        injectHighlightStyles(theme);
    }

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
            cursor: pointer;
            display: inline;
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
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existing = document.getElementById('legit-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'legit-toast';
        toast.textContent = message;
        
        const bgColors = {
            info: '#3b82f6',
            warning: '#40bb02',
            error: '#d10f0f'
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

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function injectHighlightStyles(theme) {
        if (!document.getElementById('legit-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'legit-highlight-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { background-color: ${theme.bg}; transform: scale(1); }
                    50% { background-color: ${theme.bg}; transform: scale(1.05); }
                    100% { background-color: ${theme.bg}; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function handleAutoRemove(type) {
        if (type === 'default') {
            highlightTimeoutId = setTimeout(() => {
                clearHighlights();
                highlightTimeoutId = null;
            }, 10000); 
            
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'HIGHLIGHT_QUOTE') {
            const success = highlightAndScroll(message.quote, message.index || 0, message.highlightType || 'default');
            sendResponse({ success });
        } else if (message.type === 'CLEAR_HIGHLIGHTS') {
            clearHighlights();
            sendResponse({ success: true });
        }
        return true; 
    });
}