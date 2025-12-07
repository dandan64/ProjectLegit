// background.js (Chrome extension service worker)

chrome.action.onClicked.addListener((tab) => {
  // Inject the content script into the current page when the extension icon is clicked
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"],
    });
  }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkHeadline") {
    const headlineText = message.text || "";
    console.log("Received headline:", headlineText);

    // === Gemini configuration ===
    const GEMINI_API_KEY = "AIzaSyAbj91VUMAgMTjNM3AAldkNgySpIBxow1Y"; // use a rotated key
    const GEMINI_MODEL = "gemini-2.5-flash";

    // Put the key in the query string (simplest)
    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // Gemini request body
    const apiRequestBody = {
      contents: [
        {
          parts: [
            {
              text:
                `You are a classifier. Given a news headline, answer ONLY with ` +
                `"YES" if it is about politics, or "NO" if it is not.\n\n` +
                `Headline: "${headlineText}"`,
            },
          ],
        },
      ],
    };

    // Make the fetch request to the LLM API
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiRequestBody),
    })
      .then(async (response) => {
        const data = await response.json();
        console.log("LLM API response:", data);

        if (!response.ok) {
          console.error("Gemini error:", data);
          sendResponse({ dramatic: false, error: "API request failed" });
          return;
        }

        let isDramatic = false;
        try {
          // Gemini response parsing
          const rawText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const reply = rawText.trim().toUpperCase();
          console.log("Parsed reply:", reply);

          if (reply.startsWith("YES")) {
            isDramatic = true;
          } else {
            isDramatic = false;
          }
        } catch (e) {
          console.error("Error parsing LLM response:", e);
        }

        // Send the result back to the content script
        sendResponse({ dramatic: isDramatic });
      })
      .catch((error) => {
        console.error("LLM API request failed:", error);
        // Send an error flag back (so the content script can handle it if needed)
        sendResponse({ dramatic: false, error: "API request failed" });
      });

    // Return true to indicate we'll respond asynchronously (after the fetch completes)
    return true;
  }
});
