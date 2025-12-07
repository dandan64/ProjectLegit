
chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "AC_SHOW_RESULTS") {
        console.log("[AC] Results:", msg.payload);
    }
});