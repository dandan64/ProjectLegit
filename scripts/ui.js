/**
 * @fileoverview UI helper functions for the Legit Chrome Extension side panel.
 *
 * Contains small, reusable presentation functions that are shared between
 * popup.js (event wiring) and orchestrator.js (analysis pipeline).
 * Extracted from the original popup.js DOMContentLoaded monolith.
 */

(() => {

/**
 * Displays a transient status message below the action button.
 *
 * @param {string} message - Text to display (plain text, not HTML).
 * @param {"success"|"error"|"info"} type - Controls the CSS colour class applied.
 */
function showStatus(message, type) {
    const statusMsg = document.getElementById("statusMsg");
    statusMsg.textContent = message;
    statusMsg.className = `status ${type}`;
    statusMsg.style.opacity = "1";
}

/**
 * Toggles the API-key input area between two modes:
 *  - `isSaved = true`  → hides the input form, shows the "System Ready" dashboard.
 *  - `isSaved = false` → shows the input form so the user can enter a new key.
 *
 * The dashboard element is created lazily on first call and reused thereafter.
 *
 * @param {boolean} isSaved - Whether a valid API key is currently stored.
 */
function toggleApiKeyView(isSaved) {
    const inputCard = document.querySelector('.input-card');
    const inputGroup = inputCard.querySelector('.input-group');
    const helpText = inputCard.querySelector('.api-help');
    const saveBtn = document.getElementById("saveKeyBtn");

    // Check/Create Dashboard Container
    let dashboard = document.getElementById('apiStatusDashboard');
    if (!dashboard) {
        dashboard = document.createElement('div');
        dashboard.id = 'apiStatusDashboard';
        dashboard.className = 'api-status-dashboard';
        dashboard.innerHTML = `
            <div class="status-icon-large">🔑✅</div>
            <h3 class="status-title-large" data-i18n="systemReady">${TRANSLATIONS[currentLang].systemReady}</h3>
            <p class="status-subtitle" data-i18n="apiKeyActive">${TRANSLATIONS[currentLang].apiKeyActive}</p>
            <div class="change-key-wrapper">
                <a id="changeKeyLink" data-i18n="changeKey">${TRANSLATIONS[currentLang].changeKey}</a>
            </div>
        `;
        inputCard.appendChild(dashboard);

        dashboard.querySelector('#changeKeyLink').addEventListener('click', (e) => {
            e.preventDefault();
            toggleApiKeyView(false);
        });
    }

    if (isSaved) {
        if (inputCard) inputCard.classList.add('dashboard-mode');
        if (inputGroup) inputGroup.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (helpText) helpText.style.display = 'none';
        dashboard.style.display = 'flex';
    } else {
        if (inputCard) inputCard.classList.remove('dashboard-mode');
        if (inputGroup) inputGroup.style.display = 'flex';
        if (saveBtn) saveBtn.style.display = 'block';
        if (helpText) helpText.style.display = 'block';
        dashboard.style.display = 'none';
    }
}

window.showStatus = showStatus;
window.toggleApiKeyView = toggleApiKeyView;

})();
