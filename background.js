// ===================================================================
// Background Service Worker (Manifest V3)
// File: background.js
// Main entry point for Chrome extension backend
// ===================================================================

import {
  MessageTypes,
  createMessageListener,
  sendAgentOutput,
  sendSystemEvent,
  sendError
} from './utils/messageHandler.js';

import {
  loadApiKeys,
  loadPreferences,
  hasApiKeys
} from './utils/storageManager.js';

// Agent Orchestrator
import AgentOrchestrator from './agents/agentOrchestrator.js';

/**
 * Global state
 */
let orchestrator = null;
let currentConfig = null;
let isInitialized = false;
let offscreenDocumentCreated = false;

/**
 * Create offscreen document for speech recognition
 * Offscreen documents have access to window APIs that service workers don't
 */
async function ensureOffscreenDocument() {
  // Check if offscreen document already exists
  if (offscreenDocumentCreated) {
    return true;
  }

  try {
    // Check if offscreen document is already created
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      console.log('[Background] Offscreen document already exists');
      offscreenDocumentCreated = true;
      return true;
    }

    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'], // Note: Using AUDIO_PLAYBACK as a workaround for speech recognition
      justification: 'Speech recognition for real-time transcription of medical calls'
    });

    offscreenDocumentCreated = true;
    console.log('[Background] ✓ Offscreen document created');
    return true;

  } catch (error) {
    console.error('[Background] Failed to create offscreen document:', error);
    offscreenDocumentCreated = false;
    return false;
  }
}

/**
 * Extension installation handler
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // First-time installation
    console.log('[Background] First-time installation');
    await initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('[Background] Extension updated');
    // Handle any migration if needed
  }
});

/**
 * Extension startup handler
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension startup');
  await initializeExtension();
});

/**
 * Initialize extension
 */
async function initializeExtension() {
  try {
    console.log('[Background] Initializing extension...');

    // Load configuration
    const [apiKeys, preferences] = await Promise.all([
      loadApiKeys(),
      loadPreferences()
    ]);

    currentConfig = {
      googleCloudApiKey: apiKeys.googleCloud,
      anthropicApiKey: apiKeys.anthropic,
      targetLanguage: preferences.targetLanguage,
      sourceLanguage: preferences.sourceLanguage
    };

    // Check if API keys are configured
    const keysConfigured = await hasApiKeys();
    if (!keysConfigured) {
      console.warn('[Background] API keys not configured');
    }

    isInitialized = true;
    console.log('[Background] ✓ Extension initialized');

  } catch (error) {
    console.error('[Background] Initialization failed:', error);
  }
}

/**
 * Start agents
 * @param {object} config - Agent configuration
 * @param {string} [platform='unknown'] - Platform name
 * @returns {Promise<object>} Start response
 */
async function handleStartAgents(config, platform = 'unknown') {
  try {
    console.log('[Background] Starting agents...');
    console.log('[Background] Platform:', platform);
    console.log('[Background] Config:', config);

    // Create offscreen document for speech recognition
    const offscreenReady = await ensureOffscreenDocument();
    if (!offscreenReady) {
      return {
        success: false,
        error: 'Failed to initialize speech recognition. Please check microphone permissions and try again.'
      };
    }

    if (orchestrator && orchestrator.isRunning) {
      return {
        success: false,
        error: 'Session already active. Please stop the current session before starting a new one.'
      };
    }

    // Merge with current config
    const agentConfig = {
      ...currentConfig,
      ...config,
      onError: (error) => {
        console.error('[Background] Agent error:', error);
        sendError(error.source, error.message, error.recoverable);
      }
    };

    // Validate API keys
    if (!agentConfig.googleCloudApiKey) {
      return {
        success: false,
        error: 'API keys not configured. Please click the extension icon to open settings and configure your API keys.'
      };
    }

    console.log('[Background] Creating orchestrator...');
    // Create orchestrator
    orchestrator = new AgentOrchestrator(agentConfig);

    console.log('[Background] Starting orchestrator for platform:', platform);
    // Start agents
    const result = await orchestrator.start(platform);

    if (result.success) {
      console.log('[Background] ✓ Agents started successfully');
      console.log('[Background] Session ID:', result.sessionId);

      // Store session state in session storage
      try {
        await chrome.storage.session.set({
          sessionActive: true,
          sessionId: result.sessionId,
          platform: platform,
          startTime: Date.now()
        });
        console.log('[Background] Session state saved');
      } catch (storageError) {
        console.error('[Background] Failed to save session state:', storageError);
      }
    } else {
      console.error('[Background] Failed to start agents:', result.message);
      orchestrator = null;

      return {
        success: false,
        error: result.message || 'Failed to start agents. Please try again.'
      };
    }

    return result;

  } catch (error) {
    console.error('[Background] Failed to start agents:', error);
    await sendError('Background', error.message, false);

    orchestrator = null;

    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Stop agents
 * @returns {Promise<object>} Stop response with performance report
 */
async function handleStopAgents() {
  try {
    console.log('[Background] Stopping agents...');

    if (!orchestrator || !orchestrator.isRunning) {
      return {
        success: true,
        message: 'No active session'
      };
    }

    // Stop orchestrator and get final report
    const sessionData = await orchestrator.stop();

    console.log('[Background] ✓ Agents stopped successfully');
    console.log('[Background] Session data:', sessionData?.sessionId);

    // Clear orchestrator reference
    orchestrator = null;

    return {
      success: true,
      sessionData: sessionData,
      performanceReport: sessionData?.performanceReport
    };

  } catch (error) {
    console.error('[Background] Failed to stop agents:', error);
    await sendError('Background', error.message, true);

    // Force cleanup on error
    if (orchestrator) {
      try {
        await orchestrator.emergencyStop();
      } catch (cleanupError) {
        console.error('[Background] Emergency stop failed:', cleanupError);
      }
      orchestrator = null;
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current status
 * @returns {object} Status object
 */
function handleGetStatus() {
  const orchestratorStatus = orchestrator?.getStatus();

  return {
    isInitialized,
    isRunning: orchestrator?.isRunning || false,
    hasApiKeys: !!(currentConfig?.googleCloudApiKey),
    orchestrator: orchestratorStatus || null,
    config: {
      targetLanguage: currentConfig?.targetLanguage || 'es',
      sourceLanguage: currentConfig?.sourceLanguage || 'en-US',
      hasAnthropicKey: !!currentConfig?.anthropicApiKey
    }
  };
}

/**
 * Update configuration
 * @param {object} config - New configuration
 * @returns {Promise<object>} Update response
 */
async function handleUpdateConfig(config) {
  try {
    // Update current config
    currentConfig = {
      ...currentConfig,
      ...config
    };

    console.log('[Background] Configuration updated');

    // If agents are running, notify about config change
    if (orchestrator && orchestrator.isRunning) {
      console.warn('[Background] Config changed while agents running - restart required');
    }

    return {
      success: true,
      message: 'Configuration updated. Restart agents to apply changes.'
    };

  } catch (error) {
    console.error('[Background] Failed to update config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Forward agent output to content scripts
 * @param {object} message - Agent output message
 */
function handleAgentOutput(message) {
  // Message is already formatted by orchestrator
  // Forward to all tabs with content script
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors for tabs without content script
      });
    });
  });
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener(
  createMessageListener({
    [MessageTypes.START_AGENTS]: async (message) => {
      return await handleStartAgents(message.config, message.platform);
    },

    [MessageTypes.STOP_AGENTS]: async () => {
      return await handleStopAgents();
    },

    [MessageTypes.GET_STATUS]: () => {
      return handleGetStatus();
    },

    [MessageTypes.UPDATE_CONFIG]: async (message) => {
      return await handleUpdateConfig(message.config);
    },

    [MessageTypes.AGENT_OUTPUT]: (message) => {
      handleAgentOutput(message);
      return { received: true };
    },

    // Offscreen document recognition results
    'RECOGNITION_RESULT': (message) => {
      if (orchestrator && orchestrator.agents && orchestrator.agents.transcription) {
        // Forward to transcription agent
        orchestrator.agents.transcription.handleTranscriptionResponse({
          results: [{
            alternatives: [{
              transcript: message.data.transcript,
              confidence: message.data.confidence
            }],
            isFinal: message.data.isFinal
          }]
        });
      }
      return { received: true };
    },

    'RECOGNITION_ERROR': (message) => {
      console.error('[Background] Recognition error from offscreen:', message.error);
      if (orchestrator) {
        orchestrator.handleError({
          source: 'SpeechRecognition',
          message: message.error,
          timestamp: Date.now(),
          recoverable: true
        });
      }
      return { received: true };
    }
  })
);

/**
 * Extension suspend handler (cleanup)
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Extension suspending, cleaning up...');

  if (orchestrator && orchestrator.isRunning) {
    orchestrator.emergencyStop().catch(console.error);
  }
});

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Extension icon clicked');

  // Check if on a supported page
  const url = tab.url || '';
  let platform = 'unknown';

  if (url.includes('meet.google.com')) {
    platform = 'google-meet';
  } else if (url.includes('zoom.us')) {
    platform = 'zoom';
  } else if (url.includes('teams.microsoft.com')) {
    platform = 'microsoft-teams';
  }

  // Toggle agents on/off
  if (orchestrator && orchestrator.isRunning) {
    await handleStopAgents();
  } else {
    await handleStartAgents(currentConfig, platform);
  }
});

/**
 * Log service worker status
 */
console.log('[Background] Service worker loaded');
console.log('[Background] Waiting for initialization...');
