// ========================================
// SMART LEVENSHTEIN HIGHLIGHTER (Multi-Node Support)
// ========================================

if (!window.legitHighlighterLoaded) {
    window.legitHighlighterLoaded = true;
    
    // 1. GLOBAL PALETTES
    const PALETTES = {
        supporting: { bg: '#86efac', border: '#16a34a', shadow: 'rgba(22, 163, 74, 0.8)' },
        contra:     { bg: '#fca5a5', border: '#dc2626', shadow: 'rgba(220, 38, 38, 0.8)' },
        default:    { bg: '#fde047', border: '#ca8a04', shadow: 'rgba(234, 179, 8, 0.8)' }
    };

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
        
        // --- STRATEGY 3: LEVENSHTEIN FUZZY MATCH (Fallback) ---
        if (matches.length === 0) {
            console.log('Whitespace match failed, running Levenshtein...');
            const fuzzyMatch = findLevenshteinMatch(fullText, cleanSearch);
            if (fuzzyMatch) {
                matches = [fuzzyMatch];
                matchType = 'fuzzy';
            }
        }

        // --- FAILURE HANDLER ---
        if (matches.length === 0) {
            showToast(TRANSLATIONS[currentLang].quoteMatchError, 'error');
            return false;
        }

        console.log(`✅ Found ${matches.length} match(es) via ${matchType}`);
        
        if (matchType === 'fuzzy') {
            showToast(TRANSLATIONS[currentLang].quoteMatchWarning, 'warning');
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
    function getLevenshteinDistance(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    // --- HELPER: Fuzzy Levenshtein Matcher ---
    function findLevenshteinMatch(fullText, query) {
        if (!query || query.length < 10) return null;

        const wordMatches = [];
        const wordRegex = /\S+/g; 
        let match;
        while ((match = wordRegex.exec(fullText)) !== null) {
            wordMatches.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }

        const queryWords = query.trim().split(/\s+/);
        const queryWordCount = queryWords.length;
        const target = query.toLowerCase().replace(/\s+/g, ' ').trim();

        let bestDistance = Infinity;
        let bestLocation = null;
        
        const step = 1; 

        for (let i = 0; i <= wordMatches.length - queryWordCount; i += step) {
            const startWord = wordMatches[i];
            const endWord = wordMatches[i + queryWordCount - 1];
            
            const candidateText = fullText.substring(startWord.start, endWord.end);
            
            if (Math.abs(candidateText.length - target.length) > target.length * 0.5) {
                continue;
            }

            const normCandidate = candidateText.toLowerCase().replace(/\s+/g, ' ').trim();
            const distance = getLevenshteinDistance(target, normCandidate);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestLocation = {
                    start: startWord.start,
                    end: endWord.end,
                    text: candidateText
                };
            }
        }

        const threshold = target.length * 0.4; 

        if (bestLocation && bestDistance <= threshold) {
            console.log(`🎯 Fuzzy Match Found! Score: ${bestDistance}`);
            return {
                start: bestLocation.start,
                end: bestLocation.end
            };
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

    function handleAutoRemove(type) {
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
                // Run the highlighter
                currentLang = message.lang || 'en';
                const success = highlightAndScroll(
                    message.quote, 
                    message.index || 0, 
                    message.highlightType || 'default'
                );
                // Send response immediately
                sendResponse({ success });
                
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
}