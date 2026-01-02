// ========================================
// IMPROVED contentHighlighter.js
// ========================================

function highlightAndScroll(searchText, index = 0) {
    console.log('🔍 Searching for quote:', searchText);
    
    // Remove previous highlights
    clearHighlights();
    
    // Try multiple search strategies
    let matches = [];
    
    // Strategy 1: Exact match
    matches = findTextInPage(searchText, false);
    
    // Strategy 2: Case-insensitive if exact fails
    if (matches.length === 0) {
        console.log('⚠️ Exact match failed, trying case-insensitive...');
        matches = findTextInPage(searchText, true);
    }
    
    // Strategy 3: Fuzzy match (remove extra whitespace)
    if (matches.length === 0) {
        console.log('⚠️ Case-insensitive failed, trying normalized text...');
        const normalized = searchText.replace(/\s+/g, ' ').trim();
        matches = findTextInPage(normalized, true);
    }
    
    // Strategy 4: Try first 10 words if quote is long
    if (matches.length === 0 && searchText.split(' ').length > 10) {
        console.log('⚠️ Trying first 10 words...');
        const shortQuote = searchText.split(' ').slice(0, 10).join(' ');
        matches = findTextInPage(shortQuote, true);
    }
    
    if (matches.length === 0) {
        console.warn('❌ Quote not found on page:', searchText);
        return false;
    }
    
    console.log(`✅ Found ${matches.length} match(es)`);
    
    // Use the specified occurrence or first one
    const targetMatch = matches[Math.min(index, matches.length - 1)];
    
    // Highlight the text
    highlightNode(targetMatch.node, targetMatch.start, targetMatch.end);
    
    // Scroll to it
    const highlightedElement = document.querySelector('.legit-highlight');
    if (highlightedElement) {
        highlightedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Add extra visual feedback
        highlightedElement.style.animation = 'pulse 1s ease-in-out 3';
    }
    
    return true;
}

function findTextInPage(searchText, caseInsensitive = false) {
    const matches = [];
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip script, style, and hidden elements
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                if (parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE' ||
                    parent.tagName === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip hidden elements
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || 
                    style.visibility === 'hidden' ||
                    style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    let node;
    while (node = walker.nextNode()) {
        const text = node.textContent;
        const searchIn = caseInsensitive ? text.toLowerCase() : text;
        const searchFor = caseInsensitive ? searchText.toLowerCase() : searchText;
        
        let index = searchIn.indexOf(searchFor);
        
        while (index !== -1) {
            matches.push({
                node: node,
                start: index,
                end: index + searchText.length
            });
            index = searchIn.indexOf(searchFor, index + 1);
        }
    }
    
    return matches;
}

function highlightNode(textNode, start, end) {
    const text = textNode.textContent;
    const before = text.substring(0, start);
    const highlighted = text.substring(start, end);
    const after = text.substring(end);
    
    // Create highlight span
    const span = document.createElement('span');
    span.className = 'legit-highlight';
    span.style.cssText = `
        background-color: #fef08a !important;
        border: 2px solid #eab308 !important;
        border-radius: 3px !important;
        padding: 2px 4px !important;
        box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.2) !important;
        transition: all 0.3s ease !important;
        display: inline !important;
        animation: pulse 1s ease-in-out 3 !important;
    `;
    span.textContent = highlighted;
    
    // Add pulse animation keyframes
    if (!document.getElementById('legit-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'legit-highlight-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { 
                    transform: scale(1); 
                    background-color: #fef08a; 
                }
                50% { 
                    transform: scale(1.05); 
                    background-color: #fde047; 
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Replace text node with fragments
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
        parent.replaceChild(document.createTextNode(text), highlight);
        parent.normalize();
    });
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'HIGHLIGHT_QUOTE') {
        console.log('📨 Received highlight request:', message.quote);
        const success = highlightAndScroll(message.quote, message.index || 0);
        sendResponse({ success });
    } else if (message.type === 'CLEAR_HIGHLIGHTS') {
        clearHighlights();
        sendResponse({ success: true });
    }
    return true;
});

console.log('✅ Legit Content Highlighter loaded');