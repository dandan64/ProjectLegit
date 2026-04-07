# 🚀 Transitioning to Gemini OAuth2 (Google Account)

This document outlines the step-by-step implementation required to move from the manual **API Key** method to a **Google Account (OAuth2)** authentication flow for the Legit extension.

## 1. External Setup (Google Cloud Console)
Before modifying the code, you must register the extension as an OAuth client.
1.  **Create a Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Enable API:** Search for and enable the **Generative Language API**.
3.  **Configure Consent Screen:** Set up the "OAuth consent screen" (Internal or External).
4.  **Create Credentials:** 
    *   Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
    *   Select **Application type**: "Chrome extension".
    *   **Item ID**: Paste your extension's ID (found in `chrome://extensions`).
    *   Copy the generated **Client ID**.

---

## 2. Update `manifest.json`
Add the `identity` permission and the `oauth2` configuration block.

```json
{
  "permissions": [
    "identity",
    "storage", 
    "sidePanel",
    "activeTab",
    "scripting"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/generative-language"]
  }
}
```

---

## 3. Modify `scripts/background.js`
Replace the API key retrieval logic with Google OAuth token retrieval.

### A. New Token Function
Replace `getGeminiKey()` with a token-based function:
```javascript
async function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(new Error("AUTH_FAILED: " + chrome.runtime.lastError.message));
            } else {
                resolve(token);
            }
        });
    });
}
```

### B. Update `callGemini` Fetch Call
Remove the `?key=` parameter from the URL and use the `Authorization` header instead.
```javascript
const token = await getAuthToken(); // Get OAuth token instead of API key

const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(requestBody)
    }
);
```

---

## 4. UI Adjustments

### A. Update `Legit.html`
*   **Remove:** The `<div class="input-card">` containing the `apiKeyInput` and `saveKeyBtn`.
*   **Add:** (Optional) A "Sign in with Google" button if you want manual control, or simply allow the `interactive: true` flag in `getAuthToken` to handle it when the user clicks "Analyze".

### B. Update `scripts/popup.js`
*   **Remove:** The logic that checks for `res.geminiApiKey` on startup.
*   **Remove:** The `saveKeyBtn` click listener.
*   **Update:** The `toggleApiKeyView` function to show "Account Connected" status based on whether a valid token is retrieved from `chrome.identity`.

---

## 5. Security & Testing
1.  **Removal:** After confirming OAuth works, remove all references to `geminiApiKey` from `chrome.storage.local`.
2.  **Testing:** Use the **"Inspect"** tool on the background worker to ensure tokens are being retrieved and that the 401/403 errors are handled if a token expires.
