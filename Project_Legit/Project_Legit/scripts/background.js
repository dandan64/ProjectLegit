async function getGeminiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["geminiApiKey"], (result) => {
            resolve(result.geminiApiKey);
        });
    });
}

async function callGemini(promptText) {
    const apiKey = await getGeminiKey();

    if (!apiKey) {
        throw new Error("NO_API_KEY");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },

            // ✅ FIXED BODY FORMAT (THIS WAS YOUR BUG)
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: promptText }]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 50
                }
            })
        }
    );

    const data = await response.json();

    console.log("✅ RAW GEMINI RESPONSE:", data);

    /*
      ✅ Gemini 1.5 returns in one of these:
      data.candidates[0].content.parts[0].text
      data.candidates[0].output_text
    */

    if (!data.candidates || !data.candidates.length) {
        throw new Error("EMPTY_RESPONSE");
    }

    const candidate = data.candidates[0];

    const text =
        candidate.content?.parts?.[0]?.text ||
        candidate.output_text ||
        null;

    if (!text) {
        throw new Error("NO_TEXT_IN_RESPONSE");
    }

    return text.trim();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "CALL_GEMINI") {
        callGemini(msg.prompt)
            .then(result => sendResponse({ result }))
            .catch(err => {
                console.error("❌ Gemini Error:", err.message);
                sendResponse({ error: err.message });
            });

        return true;
    }
});
