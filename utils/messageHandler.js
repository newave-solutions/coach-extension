// ===================================================================
// Message Handler - Chrome Extension Message Passing Utility
// File: utils/messageHandler.js
// ===================================================================

/**
 * Message Handler for Chrome Extension
 * Provides a clean API for sending and receiving messages between
 * background service worker, content scripts, and UI components.
 */

/**
 * Message types used throughout the extension
 */
export const MessageTypes = {
  // System control
  START_AGENTS: 'START_AGENTS',
  STOP_AGENTS: 'STOP_AGENTS',
  GET_STATUS: 'GET_STATUS',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  
  // Agent outputs
  AGENT_OUTPUT: 'AGENT_OUTPUT',
  
  // System events
  SYSTEM_EVENT: 'SYSTEM_EVENT',
  
  // Error handling
  ERROR: 'ERROR'
};

/**
 * Output types from agents
 */
export const OutputTypes = {
  TRANSCRIPTION: 'TRANSCRIPTION',
  MEDICAL_TERM: 'MEDICAL_TERM',
  METRICS_UPDATE: 'METRICS_UPDATE',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
  STATUS_UPDATE: 'STATUS_UPDATE',
  CRITICAL_ALERT: 'CRITICAL_ALERT',
  ERROR: 'ERROR'
};

/**
 * Send message to background service worker
 * @param {string} action - Message action type
 * @param {object} payload - Message payload
 * @returns {Promise<any>} Response from background
 */
export async function sendToBackground(action, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action, ...payload },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Send message to specific tab
 * @param {number} tabId - Target tab ID
 * @param {object} message - Message to send
 * @returns {Promise<any>} Response from tab
 */
export async function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      message,
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Send message to all tabs
 * @param {object} message - Message to send
 * @returns {Promise<void>}
 */
export async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  
  const promises = tabs.map(tab => 
    sendToTab(tab.id, message).catch(() => {
      // Ignore errors for tabs without content script
    })
  );
  
  await Promise.all(promises);
}

/**
 * Send agent output to frontend
 * @param {string} type - Output type (from OutputTypes)
 * @param {object} data - Output data
 * @returns {Promise<void>}
 */
export async function sendAgentOutput(type, data) {
  await broadcastToAllTabs({
    action: MessageTypes.AGENT_OUTPUT,
    payload: {
      type,
      data,
      timestamp: Date.now()
    }
  });
}

/**
 * Send system event notification
 * @param {string} eventType - Event type
 * @param {object} eventData - Event data
 * @returns {Promise<void>}
 */
export async function sendSystemEvent(eventType, eventData = {}) {
  await broadcastToAllTabs({
    action: MessageTypes.SYSTEM_EVENT,
    payload: {
      type: eventType,
      ...eventData,
      timestamp: Date.now()
    }
  });
}

/**
 * Send error notification
 * @param {string} source - Error source (agent name, component, etc.)
 * @param {string} message - Error message
 * @param {boolean} recoverable - Whether error is recoverable
 * @returns {Promise<void>}
 */
export async function sendError(source, message, recoverable = true) {
  await broadcastToAllTabs({
    action: MessageTypes.AGENT_OUTPUT,
    payload: {
      type: OutputTypes.ERROR,
      source,
      message,
      recoverable,
      timestamp: Date.now()
    }
  });
}

/**
 * Create a message listener with automatic action routing
 * @param {object} handlers - Map of action types to handler functions
 * @returns {function} Message listener function
 */
export function createMessageListener(handlers) {
  return (message, sender, sendResponse) => {
    const handler = handlers[message.action];
    
    if (!handler) {
      console.warn(`[MessageHandler] No handler for action: ${message.action}`);
      sendResponse({ error: 'Unknown action' });
      return false;
    }
    
    // Handle async handlers
    const result = handler(message, sender);
    
    if (result instanceof Promise) {
      result
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async
    } else {
      sendResponse(result);
      return false;
    }
  };
}

/**
 * Start agents command
 * @param {object} config - Agent configuration
 * @returns {Promise<object>} Start response
 */
export async function startAgents(config) {
  return sendToBackground(MessageTypes.START_AGENTS, { config });
}

/**
 * Stop agents command
 * @returns {Promise<object>} Stop response with performance report
 */
export async function stopAgents() {
  return sendToBackground(MessageTypes.STOP_AGENTS);
}

/**
 * Get current status
 * @returns {Promise<object>} Status object
 */
export async function getStatus() {
  return sendToBackground(MessageTypes.GET_STATUS);
}

/**
 * Update configuration
 * @param {object} config - New configuration
 * @returns {Promise<object>} Update response
 */
export async function updateConfig(config) {
  return sendToBackground(MessageTypes.UPDATE_CONFIG, { config });
}

/**
 * Message validator - checks if message has required structure
 * @param {object} message - Message to validate
 * @param {string[]} requiredFields - Required field names
 * @returns {boolean} True if valid
 */
export function validateMessage(message, requiredFields = []) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  if (!message.action) {
    return false;
  }
  
  for (const field of requiredFields) {
    if (!(field in message)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a debounced message sender (useful for frequent updates)
 * @param {function} sendFunction - Function to send messages
 * @param {number} delay - Debounce delay in ms
 * @returns {function} Debounced send function
 */
export function createDebouncedSender(sendFunction, delay = 2000) {
  let timeoutId = null;
  let lastMessage = null;
  
  return function(type, data) {
    lastMessage = { type, data };
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      sendFunction(lastMessage.type, lastMessage.data);
      timeoutId = null;
      lastMessage = null;
    }, delay);
  };
}

/**
 * Log message for debugging (can be disabled in production)
 * @param {string} direction - 'SENT' or 'RECEIVED'
 * @param {object} message - Message object
 * @param {string} context - Context (e.g., 'Background', 'Content')
 */
export function logMessage(direction, message, context = '') {
  if (process.env.NODE_ENV === 'development') {
    const prefix = context ? `[${context}]` : '';
    const icon = direction === 'SENT' ? '→' : '←';
    console.log(`${prefix} ${icon} ${message.action}:`, message);
  }
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MessageTypes,
    OutputTypes,
    sendToBackground,
    sendToTab,
    broadcastToAllTabs,
    sendAgentOutput,
    sendSystemEvent,
    sendError,
    createMessageListener,
    startAgents,
    stopAgents,
    getStatus,
    updateConfig,
    validateMessage,
    createDebouncedSender,
    logMessage
  };
}
