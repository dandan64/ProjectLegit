const GREEN_COLOR = "rgba(0, 255, 0, 0.6)";
const YELLOW_COLOR = "rgba(251, 255, 0, 0.6)";
const RED_COLOR = "rgba(255, 0, 0, 0.6)";

document.getElementById("ActivateBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script dynamically
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/contentScript.js']
    });

    // Send message after injection
    chrome.tabs.sendMessage(tab.id, {
        type: "HIGHLIGHT_SENTENCE",
        sentence: "A missed shot is greeted by gritted teeth, an eye-roll, a choice word towards her coaching team.",
        color: YELLOW_COLOR
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Message failed:", chrome.runtime.lastError.message);
        } else {
            console.log("Message delivered:", response);
        }
    });
});
