// ========================================
// ADVANCED contentHighlighter.js
// ========================================

if (!window.legitHighlighterLoaded) {
    window.legitHighlighterLoaded = true;
    
    let highlightTimeoutId = null;
    let visibilityListener = null;

    function highlightAndScroll(searchText, index = 0, type = 'default') {
        console.log('🔍 Searching for quote:', searchText);
        
        // Remove previous highlights
        clearHighlights();
        
        // Clean up the search text once
        const cleanSearch = searchText.trim();
        if (!cleanSearch) return false;

        let matches = [];
        
        // --- STRATEGY 1: Exact Match (Fastest) ---
        // Finds exact string: "Hello World"
        matches = findTextInPage(cleanSearch, { mode: 'exact' });
        
        // --- STRATEGY 2: Flexible Whitespace (Common) ---
        // Finds: "Hello\nWorld", "Hello   World", "Hello&nbsp;World"
        if (matches.length === 0) {
            console.log('⚠️ Exact match failed, trying flexible whitespace...');
            matches = findTextInPage(cleanSearch, { mode: 'whitespace' });
        }
        
        // --- STRATEGY 3: Punctuation Agnostic (Smart) ---
        // Finds: "It's true" matches "Its true", "Hello 'World'" matches "Hello World"
        if (matches.length === 0) {
            console.log('⚠️ Whitespace match failed, trying fuzzy punctuation...');
            matches = findTextInPage(cleanSearch, { mode: 'fuzzy' });
        }
        
        // --- STRATEGY 4: First 8 Words (Fallback) ---
        // If the quote is huge, maybe the end got cut off. Try the start.
        if (matches.length === 0 && cleanSearch.split(/\s+/).length > 8) {
            console.log('⚠️ Trying shortened quote...');
            const shortQuote = cleanSearch.split(/\s+/).slice(0, 8).join(' ');
            matches = findTextInPage(shortQuote, { mode: 'whitespace' });
        }
        
        if (matches.length === 0) {
            console.warn('❌ Quote not found on page:', cleanSearch);
            return false;
        }
        
        console.log(`✅ Found ${matches.length} match(es)`);
        
        // Select the best match (default to first)
        const targetMatch = matches[Math.min(index, matches.length - 1)];
        
        // Highlight and Scroll
        highlightNode(targetMatch.node, targetMatch.start, targetMatch.end, type);
        
        const highlightedElement = document.querySelector('.legit-highlight');
        if (highlightedElement) {
            highlightedElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            // Visual Pulse
            highlightedElement.style.animation = 'pulse 1s ease-in-out 3';
        }

        // --- AUTO-REMOVE DEFAULT HIGHLIGHT AFTER 20 SECONDS ---
        if (type === 'default') {
            highlightTimeoutId = setTimeout(() => {
                console.log('⏱️ Auto-removing default highlight after 10s');
                clearHighlights();
                highlightTimeoutId = null;
            }, 10000); // 10 seconds
            
            // Listen for tab visibility changes
            if (visibilityListener) {
                document.removeEventListener('visibilitychange', visibilityListener);
            }
            
            visibilityListener = () => {
                if (document.hidden) {
                    clearHighlights();
                    if (highlightTimeoutId) {
                        clearTimeout(highlightTimeoutId);
                        highlightTimeoutId = null;
                    }
                }
            };
            
            document.addEventListener('visibilitychange', visibilityListener);
        }
        
        return true;
    }

    // --- CORE SEARCH FUNCTION ---
    function findTextInPage(query, options = { mode: 'exact' }) {
        const matches = [];
        let regex;

        // Build the Regex based on mode
        try {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars

            if (options.mode === 'exact') {
                // Simple case-insensitive exact string
                // We use regex here just to keep the logic consistent
                regex = new RegExp(escapedQuery, 'gi');
            } 
            else if (options.mode === 'whitespace') {
                // Replace spaces with \s+ (matches space, tab, newline, nbsp)
                const pattern = escapedQuery.replace(/\s+/g, '\\s+');
                regex = new RegExp(pattern, 'gi');
            } 
            else if (options.mode === 'fuzzy') {
                // Split by non-word characters and join with "ignore junk" pattern
                // "It's true" -> "It", "s", "true" -> /It[\W_]*s[\W_]*true/gi
                const words = query.split(/[\W_]+/); // Split by punctuation/space
                const pattern = words.filter(w => w.length > 0).join('[\\W_]+');
                regex = new RegExp(pattern, 'gi');
            }
        } catch (e) {
            console.error("Regex build error", e);
            return [];
        }

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip hidden/script tags
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    const tag = parent.tagName;
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Check visibility
                    if (parent.offsetParent === null) { 
                        // Simple check for visibility (works for display:none)
                        return NodeFilter.FILTER_REJECT; 
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent;
            // Skip empty nodes to save performance
            if (!text.trim()) continue;

            // Reset regex state for each node
            regex.lastIndex = 0; 

            let match;
            // Exec loop to find ALL matches in this node (in case it appears twice)
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    node: node,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        }
        
        return matches;
    }

    function highlightNode(textNode, start, end, type = 'default') {
        // Safety check: ensure the indices are valid for this node
        if (start < 0 || end > textNode.textContent.length || start >= end) return;

        // Color definitions
        const palettes = {
            supporting: { bg: '#86efac', border: '#16a34a', shadow: 'rgba(22, 163, 74, 0.4)' }, // Green
            contra:     { bg: '#fca5a5', border: '#dc2626', shadow: 'rgba(220, 38, 38, 0.4)' }, // Red
            default:    { bg: '#fde047', border: '#ca8a04', shadow: 'rgba(234, 179, 8, 0.4)' }  // Yellow
        };

        const theme = palettes[type] || palettes.default;

        const text = textNode.textContent;
        const before = text.substring(0, start);
        const highlighted = text.substring(start, end);
        const after = text.substring(end);
        
        const span = document.createElement('span');
        span.className = 'legit-highlight';
        // Inline styles ensure it works even if external CSS fails
        span.style.cssText = `
            background-color: ${theme.bg};
            color: #000;
            border: 2px solid ${theme.border};
            border-radius: 2px;
            box-shadow: 0 0 5px ${theme.shadow};
            transition: all 0.5s ease;
            cursor: pointer;
            display: inline;
        `;
        span.textContent = highlighted;
        
        // Inject Styles for Animation
        if (!document.getElementById('legit-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'legit-highlight-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { background-color: ${theme.bg}; transform: scale(1); }
                    50% { background-color: ${theme.bg}; transform: scale(1.1); }
                    100% { background-color: ${theme.bg}; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const parent = textNode.parentNode;
        parent.insertBefore(document.createTextNode(before), textNode);
        parent.insertBefore(span, textNode);
        parent.insertBefore(document.createTextNode(after), textNode);
        parent.removeChild(textNode);
    }

    function clearHighlights() {
        document.querySelectorAll('.legit-highlight').forEach(highlight => {
            const text = highlight.textContent;
            const parent = highlight.parentNode;
            if(parent) {
                parent.replaceChild(document.createTextNode(text), highlight);
                parent.normalize(); // Merges adjacent text nodes back together
            }
        });

        // Clean up listener
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
            if (highlightTimeoutId) {
                clearTimeout(highlightTimeoutId);
                highlightTimeoutId = null;
            }
            sendResponse({ success: true });
        }
        return true; // Keep channel open
    });
}