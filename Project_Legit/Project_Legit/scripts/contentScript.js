chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_PAGE_TITLE") {
        sendResponse({ title: document.title || "" });
    }
});