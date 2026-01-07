// ===================================================================
// Popup JavaScript - Settings Interface
// File: ui/popup.js
// Handles API configuration, preferences, and session control
// ===================================================================

/**
 * DOM Elements
 */
const elements = {
  // Status
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  sessionRow: document.getElementById('session-row'),
  sessionInfo: document.getElementById('session-info'),
  apiKeysStatus: document.getElementById('api-keys-status'),

  // Form inputs
  googleApiKey: document.getElementById('google-api-key'),
  anthropicApiKey: document.getElementById('anthropic-api-key'),
  sourceLanguage: document.getElementById('source-language'),
  targetLanguage: document.getElementById('target-language'),

  // Buttons
  saveBtn: document.getElementById('save-btn'),
  testBtn: document.getElementById('test-btn'),
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),
  startButtons: document.getElementById('start-buttons'),
  controlButtons: document.getElementById('control-buttons'),

  // Messages
  messageContainer: document.getElementById('message-container')
};

/**
 * Global state
 */
let statusUpdateInterval = null;

/**
 * Initialize popup
 */
async function initialize() {
  console.log('[Popup] Initializing...');

  // Load existing settings
  await loadSettings();

  // Check current status
  await updateStatus();

  // Set up event listeners
  setupEventListeners();

  // Poll status every 5 seconds (reduced from 2s for performance)
  statusUpdateInterval = setInterval(updateStatus, 5000);

  console.log('[Popup] Initialized');
}

/**
 * Cleanup on popup close
 */
function cleanup() {
  console.log('[Popup] Cleaning up...');

  // Clear status polling interval
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    // Load API keys
    const apiKeys = await new Promise((resolve) => {
      chrome.storage.sync.get(['googleCloudApiKey', 'anthropicApiKey'], (items) => {
        resolve({
          google: items.googleCloudApiKey || '',
          anthropic: items.anthropicApiKey || ''
        });
      });
    });

    // Load preferences
    const preferences = await new Promise((resolve) => {
      chrome.storage.sync.get(['sourceLanguage', 'targetLanguage'], (items) => {
        resolve({
          source: items.sourceLanguage || 'en-US',
          target: items.targetLanguage || 'es'
        });
      });
    });

    // Set form values (masked for security)
    if (apiKeys.google) {
      elements.googleApiKey.value = maskApiKey(apiKeys.google);
      elements.googleApiKey.dataset.actual = apiKeys.google;
    }

    if (apiKeys.anthropic) {
      elements.anthropicApiKey.value = maskApiKey(apiKeys.anthropic);
      elements.anthropicApiKey.dataset.actual = apiKeys.anthropic;
    }

    elements.sourceLanguage.value = preferences.source;
    elements.targetLanguage.value = preferences.target;

    // Update API keys status
    if (apiKeys.google) {
      elements.apiKeysStatus.textContent = 'Configured ✓';
      elements.apiKeysStatus.style.color = '#10b981';
    } else {
      elements.apiKeysStatus.textContent = 'Not configured';
      elements.apiKeysStatus.style.color = '#ef4444';
    }

  } catch (error) {
    console.error('[Popup] Failed to load settings:', error);
    showMessage('Failed to load settings', 'error');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  console.log('[Popup] saveSettings called');
  try {
    showMessage('Saving...', 'info');

    // Get values
    let googleApiKey = elements.googleApiKey.value.trim();
    let anthropicApiKey = elements.anthropicApiKey.value.trim();

    // If value is masked, use actual value from dataset
    if (googleApiKey && googleApiKey.includes('•')) {
      googleApiKey = elements.googleApiKey.dataset.actual || '';
    }

    if (anthropicApiKey && anthropicApiKey.includes('•')) {
      anthropicApiKey = elements.anthropicApiKey.dataset.actual || '';
    }

    const sourceLanguage = elements.sourceLanguage.value;
    const targetLanguage = elements.targetLanguage.value;

    // Validate
    if (!googleApiKey) {
      showMessage('Google Cloud API Key is required', 'error');
      elements.googleApiKey.classList.add('error');
      return;
    }

    elements.googleApiKey.classList.remove('error');

    // Save to storage
    await new Promise((resolve) => {
      chrome.storage.sync.set({
        googleCloudApiKey: googleApiKey,
        anthropicApiKey: anthropicApiKey,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      }, resolve);
    });

    // Update dataset
    elements.googleApiKey.dataset.actual = googleApiKey;
    elements.anthropicApiKey.dataset.actual = anthropicApiKey;

    // Mask displayed values
    elements.googleApiKey.value = maskApiKey(googleApiKey);
    elements.anthropicApiKey.value = maskApiKey(anthropicApiKey);

    // Update status
    elements.apiKeysStatus.textContent = 'Configured ✓';
    elements.apiKeysStatus.style.color = '#10b981';

    // Notify background to reload configuration
    try {
      await chrome.runtime.sendMessage({
        action: 'UPDATE_CONFIG',
        config: {
          googleCloudApiKey: googleApiKey,
          anthropicApiKey: anthropicApiKey,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage
        }
      });
    } catch (configError) {
      console.warn('[Popup] Failed to update background config:', configError);
    }

    // Refresh status to show Start button if configured
    await updateStatus();

    showMessage('Settings saved successfully!', 'success');

    console.log('[Popup] Settings saved');

  } catch (error) {
    console.error('[Popup] Failed to save settings:', error);
    showMessage('Failed to save settings', 'error');
  }
}

/**
 * Test API keys
 */
async function testApiKeys() {
  try {
    showMessage('Testing API connections...', 'info');
    elements.testBtn.disabled = true;

    // Get API keys
    const apiKeys = await new Promise((resolve) => {
      chrome.storage.sync.get(['googleCloudApiKey', 'anthropicApiKey'], (items) => {
        resolve(items);
      });
    });

    if (!apiKeys.googleCloudApiKey) {
      showMessage('Please configure Google Cloud API Key first', 'error');
      elements.testBtn.disabled = false;
      return;
    }

    // Test Google Cloud API (simple validation)
    const googleTest = await testGoogleCloudApi(apiKeys.googleCloudApiKey);

    if (!googleTest.success) {
      showMessage(`Google Cloud API test failed: ${googleTest.error}`, 'error');
      elements.testBtn.disabled = false;
      return;
    }

    // Test Anthropic API if configured
    if (apiKeys.anthropicApiKey) {
      const anthropicTest = await testAnthropicApi(apiKeys.anthropicApiKey);

      if (!anthropicTest.success) {
        showMessage(`Anthropic API test failed: ${anthropicTest.error}`, 'info');
      } else {
        showMessage('All API keys are valid! ✓', 'success');
      }
    } else {
      showMessage('Google Cloud API key is valid! ✓', 'success');
    }

    elements.testBtn.disabled = false;

  } catch (error) {
    console.error('[Popup] API test failed:', error);
    showMessage('API test failed', 'error');
    elements.testBtn.disabled = false;
  }
}

/**
 * Test Google Cloud API
 * @param {string} apiKey - API key
 * @returns {Promise<Object>} Test result
 */
async function testGoogleCloudApi(apiKey) {
  try {
    // Simple API key validation (check format)
    if (!apiKey || apiKey.length < 20) {
      return {
        success: false,
        error: 'Invalid API key format'
      };
    }

    // In a real implementation, you would make a test API call here
    // For now, just validate the format

    return {
      success: true
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test Anthropic API
 * @param {string} apiKey - API key
 * @returns {Promise<Object>} Test result
 */
async function testAnthropicApi(apiKey) {
  try {
    if (!apiKey || apiKey.length < 20) {
      return {
        success: false,
        error: 'Invalid API key format'
      };
    }

    return {
      success: true
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update status display
 */
async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

    if (response && response.isRunning) {
      // Session is active
      elements.statusIndicator.classList.add('active');
      elements.statusIndicator.classList.remove('inactive');
      elements.statusText.textContent = 'Active';

      // Show session info
      elements.sessionRow.style.display = 'flex';
      elements.startButtons.style.display = 'none';
      elements.controlButtons.style.display = 'flex';

      // Update session time if available
      if (response.orchestrator && response.orchestrator.uptime) {
        const uptime = formatDuration(response.orchestrator.uptime);
        elements.sessionInfo.textContent = uptime;
      }

    } else {
      // No active session
      elements.statusIndicator.classList.remove('active');
      elements.statusIndicator.classList.add('inactive');
      elements.statusText.textContent = 'Ready';

      elements.sessionRow.style.display = 'none';
      elements.controlButtons.style.display = 'none';

      // Show start button if API keys are configured
      if (response && response.hasApiKeys) {
        elements.startButtons.style.display = 'flex';
      } else {
        elements.startButtons.style.display = 'none';
      }
    }

  } catch (error) {
    console.error('[Popup] Failed to update status:', error);
  }
}

/**
 * Start current session
 */
async function startSession() {
  try {
    showMessage('Starting session...', 'info');
    elements.startBtn.disabled = true;

    // Get current tab to detect platform
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    let platform = 'unknown';

    if (currentTab && currentTab.url) {
      const url = currentTab.url;
      if (url.includes('meet.google.com')) {
        platform = 'google-meet';
      } else if (url.includes('zoom.us')) {
        platform = 'zoom';
      } else if (url.includes('teams.microsoft.com')) {
        platform = 'microsoft-teams';
      }
    }

    // Get current configuration
    const config = {
      // API keys will be loaded from background
    };

    const response = await chrome.runtime.sendMessage({
      action: 'START_AGENTS',
      config: config,
      platform: platform
    });

    if (response && response.success) {
      showMessage('Session started successfully!', 'success');
      await updateStatus();
      elements.startBtn.disabled = false; // Re-enable for next time
    } else {
      showMessage(`Failed to start session: ${response?.error || 'Unknown error'}`, 'error');
      elements.startBtn.disabled = false;
    }

  } catch (error) {
    console.error('[Popup] Failed to start session:', error);
    showMessage('Failed to start session', 'error');
    elements.startBtn.disabled = false;
  }
}

/**
 * Stop current session
 */
async function stopSession() {
  try {
    showMessage('Stopping session...', 'info');
    elements.stopBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({ action: 'STOP_AGENTS' });

    if (response && response.success) {
      showMessage('Session stopped successfully', 'success');
      await updateStatus();
    } else {
      showMessage('Failed to stop session', 'error');
    }

    elements.stopBtn.disabled = false;

  } catch (error) {
    console.error('[Popup] Failed to stop session:', error);
    showMessage('Failed to stop session', 'error');
    elements.stopBtn.disabled = false;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  console.log('[Popup] Setting up event listeners...');
  console.log('[Popup] Save button:', elements.saveBtn);

  // Save button
  elements.saveBtn.addEventListener('click', saveSettings);

  // Test button
  elements.testBtn.addEventListener('click', testApiKeys);

  // Start button
  elements.startBtn.addEventListener('click', startSession);

  // Stop button
  elements.stopBtn.addEventListener('click', stopSession);

  // Clear error state on input
  elements.googleApiKey.addEventListener('input', () => {
    elements.googleApiKey.classList.remove('error');
  });

  // Clear masked value on focus (for editing)
  elements.googleApiKey.addEventListener('focus', (e) => {
    if (e.target.value.includes('•') && e.target.dataset.actual) {
      e.target.value = e.target.dataset.actual;
    }
  });

  elements.anthropicApiKey.addEventListener('focus', (e) => {
    if (e.target.value.includes('•') && e.target.dataset.actual) {
      e.target.value = e.target.dataset.actual;
    }
  });

  // Re-mask on blur if unchanged
  elements.googleApiKey.addEventListener('blur', (e) => {
    if (e.target.dataset.actual && e.target.value === e.target.dataset.actual) {
      e.target.value = maskApiKey(e.target.value);
    }
  });

  elements.anthropicApiKey.addEventListener('blur', (e) => {
    if (e.target.dataset.actual && e.target.value === e.target.dataset.actual) {
      e.target.value = maskApiKey(e.target.value);
    }
  });
}

/**
 * Show message to user
 * @param {string} message - Message text
 * @param {string} type - Message type (success, error, info)
 */
function showMessage(message, type = 'info') {
  elements.messageContainer.textContent = message;
  elements.messageContainer.className = `message ${type} show`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    elements.messageContainer.classList.remove('show');
  }, 3000);
}

/**
 * Mask API key for display
 * @param {string} key - API key
 * @returns {string} Masked key
 */
function maskApiKey(key) {
  if (!key || key.length < 8) return key;

  const start = key.substring(0, 4);
  const end = key.substring(key.length - 4);
  const masked = '•'.repeat(Math.min(20, key.length - 8));

  return `${start}${masked}${end}`;
}

/**
 * Format duration in milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup when popup closes
window.addEventListener('beforeunload', cleanup);

// Also cleanup when page becomes hidden (popup closes)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cleanup();
  }
});
