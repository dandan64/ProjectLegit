chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "HIGHLIGHT_SENTENCE") {
        highlightSentence(msg.sentence, msg.color);
        sendResponse({status: "ok"});
    }
});

function highlightSentence(sentence, color) {
    if (!sentence) return;

    // Escape special regex characters
    const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSentence, "g");

    // Walk through all text nodes
    const walker = document.createTreeWalker(
        document.body, 
        NodeFilter.SHOW_TEXT, 
        {
            acceptNode: function(node) {
                const parent = node.parentNode;
                // Skip script, style, noscript, and already highlighted spans
                const skipTags = ["SCRIPT", "STYLE", "NOSCRIPT"];
                if (skipTags.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                if (parent.tagName === "SPAN" && parent.style.backgroundColor) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    const nodesToProcess = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (regex.test(node.nodeValue)) {
            nodesToProcess.push(node);
        }
    }

    nodesToProcess.forEach((textNode) => {
        const parent = textNode.parentNode;
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(textNode.nodeValue)) !== null) {
            // Text before match
            if (match.index > lastIndex) {
                frag.appendChild(document.createTextNode(textNode.nodeValue.slice(lastIndex, match.index)));
            }

            // Highlighted match
            const span = document.createElement("span");
            span.style.backgroundColor = color;
            span.textContent = match[0];
            frag.appendChild(span);

            lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < textNode.nodeValue.length) {
            frag.appendChild(document.createTextNode(textNode.nodeValue.slice(lastIndex)));
        }

        parent.replaceChild(frag, textNode);
    });
}
