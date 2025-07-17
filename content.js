// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    // Extract all visible text from the page (body, paragraphs, etc.)
    const pageText = document.body.innerText || "";
    sendResponse({ text: pageText });
  }
  return true; // Keep the message channel open for async response
}); 