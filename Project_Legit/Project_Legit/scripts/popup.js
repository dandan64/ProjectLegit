document.addEventListener("DOMContentLoaded", () => {
    const apiInput = document.getElementById("apiKeyInput");
    const saveBtn = document.getElementById("saveKeyBtn");
    const activateBtn = document.getElementById("activateBtn");
    const statusMsg = document.getElementById("statusMsg");
    const loader = document.getElementById("loader");

    /* ---------- INIT ---------- */
    chrome.storage.local.get(["geminiApiKey"], (res) => {
        if (res.geminiApiKey) {
            activateBtn.disabled = false;
            statusMsg.textContent = "✅ API key already saved";
            statusMsg.className = "status success";
        }
    });

    /* ---------- SAVE KEY ---------- */
    saveBtn.addEventListener("click", () => {
        const key = apiInput.value.trim();
        if (!key) {
            statusMsg.textContent = "❌ API key is empty";
            statusMsg.className = "status error";
            return;
        }

        chrome.storage.local.set({ geminiApiKey: key }, () => {
            statusMsg.textContent = "✅ API key saved!";
            statusMsg.className = "status success";
            activateBtn.disabled = false;
            apiInput.value = "";
        });
    });

    /* ---------- ACTIVATE / CLASSIFY ---------- */
    activateBtn.addEventListener("click", async () => {
        statusMsg.textContent = "";
        loader.style.display = "block";
        activateBtn.disabled = true;

        try {
            // 1️⃣ Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            // 2️⃣ Get page title
            const [titleResult] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.title
            });
            const pageTitle = titleResult?.result?.trim();
            console.log("Page title:", pageTitle);
            if (!pageTitle) throw new Error("Could not get page title");

            // 3️⃣ Get API key
            const apiKey = await new Promise((resolve) =>
                chrome.storage.local.get(["geminiApiKey"], (res) => resolve(res.geminiApiKey))
            );
            if (!apiKey) throw new Error("No API key saved");

            // 4️⃣ Call Gemini 2.5-flash API
                const apiRequestBody = {
        contents: [
            {
            parts: [
                {text: 
                    `Classify the main subject of this website title in 1-3 words only. Respond with just the words: ${pageTitle} `,
                    },
                ],
            }
        ],
    };

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(apiRequestBody),
                }
            );

            const data = await response.json();
            console.log("Gemini raw response:", data);

            // 5️⃣ Parse Gemini response safely
            let result = "";
            result = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            console.log("Parsed result:", result);
            if (!result) throw new Error("No valid response from Gemini");

            // 6️⃣ Display result
            statusMsg.textContent = `✅ Subject: ${result}`;
            statusMsg.className = "status success";

        } catch (err) {
            console.error(err);
            statusMsg.textContent = `❌ ${err.message}`;
            statusMsg.className = "status error";
        } finally {
            loader.style.display = "none";
            activateBtn.disabled = false;
        }
    });
});
