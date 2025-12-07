chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if(msg?.type == "AC_ANALYZE_TAB"){
        analyzeTab(msg.tabId || sender?.tab?.id);
        sendResponse({ok: true});
    }
    return true;
});


async function analyzeTab(tabId) {
    const tab = await chrome.tabs.get(tabId);
    // for now just echo the url
    await chrome.tabs.sendMessage(tabId, {type: "AC_SHOW_RESULTS", payload: {url: tab.url} });
}

// // Relay results from the content script to any extension page (e.g., the popup).
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//     if (msg?.type === "AC_ANALYZE_TAB") {
//       // Kick off analysis for the given tabId
//       handleAnalyzeTab(msg.tabId || sender?.tab?.id).then(
//         () => sendResponse({ ok: true }),
//         (err) => sendResponse({ ok: false, error: String(err) })
//       );
//       // Keep the message channel open for the async sendResponse above
//       return true;
//     }
  
//     if (msg?.type === "AC_RESULTS_FROM_CONTENT") {
//       // Optionally store the last result for the tab (handy if popup opens later)
//       chrome.storage.session.set({ ["ac:last:" + msg.tabId]: msg.payload }).catch(() => {});
//       // Broadcast to all extension pages (popup can listen)
//       chrome.runtime.sendMessage({ type: "AC_RESULTS", tabId: msg.tabId, payload: msg.payload });
//       sendResponse?.({ ok: true });
//       return; // no need to keep channel open
//     }
//   });
  
//   // Ensure content script is present; if not, inject it, then ask it to collect data.
//   async function handleAnalyzeTab(tabId) {
//     if (!tabId) throw new Error("No tabId");
  
//     // First try to ping the content script.
//     try {
//       await chrome.tabs.sendMessage(tabId, { type: "AC_COLLECT" });
//       return;
//     } catch (e) {
//       // Probably no content script (PDF, special page, timing). Try to inject.
//     }
  
//     // Try to inject content.js; may fail on restricted schemes (chrome://, WebStore, etc.)
//     try {
//       await chrome.scripting.executeScript({
//         target: { tabId, allFrames: false },
//         files: ["src/content.js"]
//       });
//     } catch (e) {
//       console.warn("[AC] Could not inject content script:", e);
//       throw new Error("Cannot analyze this page (restricted or unsupported).");
//     }
  
//     // Ask (again) the freshly-injected content script to collect data.
//     await chrome.tabs.sendMessage(tabId, { type: "AC_COLLECT" });
//   }
  