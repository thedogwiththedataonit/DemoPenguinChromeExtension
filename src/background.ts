let isHighlighting = false;
let selectedElements: string[] = [];

const allowedUrls = ["https://github.com/"];

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.id) {
    const url = new URL(tab.url);
    const isAllowed = allowedUrls.some(allowedUrl => url.href.startsWith(allowedUrl));

    if (isAllowed) {
      chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const isAllowed = allowedUrls.some(allowedUrl => url.href.startsWith(allowedUrl));

    
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getState") {
    sendResponse({ isHighlighting, selectedElements });
  } else if (request.action === "setHighlightState") {
    isHighlighting = request.isHighlighting;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleHighlight", isHighlighting });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === "addSelectedElement") {
    selectedElements.push(request.element);
    isHighlighting = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleHighlight", isHighlighting });
        //chrome.tabs.sendMessage(tabs[0].id, { action: "updateSelectedElements", selectedElements });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === "getAuthToken") {
      chrome.storage.local.get('authToken', (result) => {
        sendResponse({ token: result.authToken });
      });
      return true;
    }
});

chrome.runtime.onMessageExternal.addListener(
  function(message, sender, sendResponse) {
    if (message.type === 'LOGIN_SUCCESS' && message.userId) {
      // Store the token in chrome.storage.local
      chrome.storage.local.set({ userId: message.userId }).then(() => {
        // Notify the popup about successful login
        chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS', userId: message.userId });
        console.log('LOGIN_SUCCESS', message.userId);
        sendResponse({ success: true });
      });
    }
    window.close();
    return true; // Required for async response
  }
);

export {};

