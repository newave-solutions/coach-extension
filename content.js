// ===================================================================
// Content Script
// File: content.js
// Injected into web pages to provide overlay UI
// ===================================================================

/**
 * Content Script for Medical Interpreter Co-Pilot
 * 
 * Responsibilities:
 * - Inject overlay UI into page
 * - Forward messages between background and overlay
 * - Manage overlay lifecycle
 */

/**
 * Global state
 */
let overlayInjected = false;
let overlayIframe = null;

/**
 * Inject overlay UI into page
 */
function injectOverlay() {
  // Check if already injected
  if (overlayInjected || document.getElementById('coach-extension-overlay')) {
    console.log('[Content] Overlay already injected');
    return;
  }

  try {
    console.log('[Content] Injecting overlay...');

    // Create iframe for overlay
    overlayIframe = document.createElement('iframe');
    overlayIframe.id = 'coach-extension-overlay';
    overlayIframe.src = chrome.runtime.getURL('ui/overlay.html');

    // Style iframe
    overlayIframe.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      border: none;
      z-index: 2147483647;
      pointer-events: auto;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      display: none;
    `;

    // Add to page
    document.body.appendChild(overlayIframe);

    overlayInjected = true;
    console.log('[Content] ✓ Overlay injected');

  } catch (error) {
    console.error('[Content] Failed to inject overlay:', error);
  }
}

/**
 * Show overlay
 */
function showOverlay() {
  if (overlayIframe) {
    overlayIframe.style.display = 'block';
    console.log('[Content] Overlay shown');
  }
}

/**
 * Hide overlay
 */
function hideOverlay() {
  if (overlayIframe) {
    overlayIframe.style.display = 'none';
    console.log('[Content] Overlay hidden');
  }
}

/**
 * Toggle overlay visibility
 */
function toggleOverlay() {
  if (overlayIframe) {
    const isVisible = overlayIframe.style.display !== 'none';
    if (isVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }
}

/**
 * Remove overlay from page
 */
function removeOverlay() {
  if (overlayIframe) {
    overlayIframe.remove();
    overlayIframe = null;
    overlayInjected = false;
    console.log('[Content] Overlay removed');
  }
}

/**
 * Forward message to overlay iframe
 * @param {object} message - Message to forward
 */
function forwardToOverlay(message) {
  if (overlayIframe && overlayIframe.contentWindow) {
    try {
      overlayIframe.contentWindow.postMessage(message, '*');
    } catch (error) {
      console.error('[Content] Failed to forward message to overlay:', error);
    }
  }
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content] Message received:', message.action);

  switch (message.action) {
    case 'INJECT_OVERLAY':
      injectOverlay();
      sendResponse({ success: true });
      break;

    case 'SHOW_OVERLAY':
      showOverlay();
      sendResponse({ success: true });
      break;

    case 'HIDE_OVERLAY':
      hideOverlay();
      sendResponse({ success: true });
      break;

    case 'TOGGLE_OVERLAY':
      toggleOverlay();
      sendResponse({ success: true });
      break;

    case 'REMOVE_OVERLAY':
      removeOverlay();
      sendResponse({ success: true });
      break;

    case 'AGENT_OUTPUT':
    case 'SYSTEM_EVENT':
      // Forward to overlay
      forwardToOverlay(message);
      sendResponse({ received: true });
      break;

    default:
      // Forward all other messages to overlay
      forwardToOverlay(message);
      sendResponse({ received: true });
  }

  return false; // Synchronous response
});

/**
 * Listen for messages from overlay iframe
 */
window.addEventListener('message', (event) => {
  // Verify message is from our overlay
  if (event.source !== overlayIframe?.contentWindow) {
    return;
  }

  const message = event.data;

  // Handle overlay control messages
  if (message.source === 'coach-overlay') {
    if (message.action === 'HIDE_OVERLAY') {
      hideOverlay();
      return;
    }
    if (message.action === 'SHOW_OVERLAY') {
      showOverlay();
      return;
    }
  }

  // Forward to background
  if (message.action) {
    chrome.runtime.sendMessage(message, (response) => {
      // Send response back to overlay
      if (response) {
        forwardToOverlay({
          action: 'RESPONSE',
          originalAction: message.action,
          response: response
        });
      }
    });
  }
});

/**
 * Initialize on page load
 */
function initialize() {
  console.log('[Content] Content script loaded');
  console.log('[Content] Page:', window.location.href);

  // Inject overlay automatically
  // (can be controlled by settings later)
  injectOverlay();

  // Show overlay if there's an active session
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response && response.isRunning) {
      showOverlay();
    }
  });
}

/**
 * Wait for DOM to be ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded
  initialize();
}

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('[Content] Page hidden');
  } else {
    console.log('[Content] Page visible');
    // Re-sync with background on visibility
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (response && response.isRunning && overlayIframe) {
        showOverlay();
      }
    });
  }
});

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + Shift + M = Toggle overlay
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
    event.preventDefault();
    toggleOverlay();
  }
});

/**
 * Clean up on page unload
 */
window.addEventListener('beforeunload', () => {
  console.log('[Content] Page unloading, cleaning up...');
  // Cleanup handled automatically
});

console.log('[Content] ✓ Content script initialized');
