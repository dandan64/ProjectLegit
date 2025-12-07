// contentScript.js

// Find the main headline on the page (assuming it's the first <h1> element)
const headlineElement = document.querySelector('h1');
if (headlineElement) {
  const headlineText = headlineElement.innerText || headlineElement.textContent || "";
  console.log("Headline found:", headlineText);

  // Send the headline text to the background script for analysis
  chrome.runtime.sendMessage(
    { action: 'checkHeadline', text: headlineText },
    function(response) {
      if (!response) {
        console.error("No response from background script");
        return;
      }
      if (response.error) {
        console.error("Error from background:", response.error);
        // If there's an error (e.g., API failed), we could optionally indicate it somehow.
        return;
      }
      const isDramatic = response.dramatic;
      if (isDramatic) {
        // If the headline is dramatic, highlight it in red
        headlineElement.style.color = 'red';
      } else {
        // If not dramatic, highlight it in green
        headlineElement.style.color = 'green';
      }
      console.log("Headline colored", isDramatic ? 'red (dramatic)' : 'green (not dramatic)');
    }
  );
} else {
  console.warn("No <h1> headline found on this page.");
}
