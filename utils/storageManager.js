// ===================================================================
// Storage Manager - Chrome Storage API Wrapper
// File: utils/storageManager.js
// ===================================================================

/**
 * Storage Manager for Chrome Extension
 * Provides a clean API for chrome.storage.sync and chrome.storage.local
 * with type safety, error handling, and convenience methods.
 */

/**
 * Storage keys used in the extension
 */
export const StorageKeys = {
  // Sync storage (encrypted, synced across devices)
  GOOGLE_API_KEY: 'googleCloudApiKey',
  ANTHROPIC_API_KEY: 'anthropicApiKey',
  TARGET_LANGUAGE: 'targetLanguage',
  SOURCE_LANGUAGE: 'sourceLanguage',
  USER_PREFERENCES: 'userPreferences',

  // Local storage (not synced)
  SESSION_HISTORY: 'sessionHistory',
  PERFORMANCE_REPORTS: 'performanceReports',
  MEDICAL_TERMS_CACHE: 'medicalTermsCache',
  LAST_SESSION_ID: 'lastSessionId'
};

/**
 * Get item from chrome.storage.sync
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<object>} Retrieved data
 */
export async function getSyncStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

/**
 * Set item in chrome.storage.sync
 * @param {object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function setSyncStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get item from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<object>} Retrieved data
 */
export async function getLocalStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

/**
 * Set item in chrome.storage.local
 * @param {object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function setLocalStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Remove item from chrome.storage.sync
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function removeSyncStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Remove item from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function removeLocalStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear all chrome.storage.sync data
 * @returns {Promise<void>}
 */
export async function clearSyncStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear all chrome.storage.local data
 * @returns {Promise<void>}
 */
export async function clearLocalStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// ===================================================================
// High-Level API Methods
// ===================================================================

/**
 * Load API keys from storage
 * @returns {Promise<object>} API keys object
 */
export async function loadApiKeys() {
  const data = await getSyncStorage([
    StorageKeys.GOOGLE_API_KEY,
    StorageKeys.ANTHROPIC_API_KEY
  ]);

  return {
    googleCloud: data[StorageKeys.GOOGLE_API_KEY] || '',
    anthropic: data[StorageKeys.ANTHROPIC_API_KEY] || ''
  };
}

/**
 * Save API keys to storage
 * @param {object} keys - API keys object
 * @param {string} keys.googleCloud - Google Cloud API key
 * @param {string} keys.anthropic - Anthropic API key
 * @returns {Promise<void>}
 */
export async function saveApiKeys(keys) {
  await setSyncStorage({
    [StorageKeys.GOOGLE_API_KEY]: keys.googleCloud || '',
    [StorageKeys.ANTHROPIC_API_KEY]: keys.anthropic || ''
  });
}

/**
 * Load user preferences from storage
 * @returns {Promise<object>} User preferences
 */
export async function loadPreferences() {
  const data = await getSyncStorage([
    StorageKeys.TARGET_LANGUAGE,
    StorageKeys.SOURCE_LANGUAGE,
    StorageKeys.USER_PREFERENCES
  ]);

  return {
    targetLanguage: data[StorageKeys.TARGET_LANGUAGE] || 'es',
    sourceLanguage: data[StorageKeys.SOURCE_LANGUAGE] || 'en-US',
    preferences: data[StorageKeys.USER_PREFERENCES] || {}
  };
}

/**
 * Save user preferences to storage
 * @param {object} prefs - User preferences
 * @returns {Promise<void>}
 */
export async function savePreferences(prefs) {
  const toSave = {};

  if (prefs.targetLanguage) {
    toSave[StorageKeys.TARGET_LANGUAGE] = prefs.targetLanguage;
  }
  if (prefs.sourceLanguage) {
    toSave[StorageKeys.SOURCE_LANGUAGE] = prefs.sourceLanguage;
  }
  if (prefs.preferences) {
    toSave[StorageKeys.USER_PREFERENCES] = prefs.preferences;
  }

  await setSyncStorage(toSave);
}

/**
 * Save session to history
 * @param {object} session - Session data
 * @returns {Promise<void>}
 */
export async function saveSession(session) {
  // Get existing history
  const data = await getLocalStorage(StorageKeys.SESSION_HISTORY);
  const history = data[StorageKeys.SESSION_HISTORY] || [];

  // Add new session
  history.push({
    sessionId: session.sessionId,
    timestamp: session.timestamp || new Date().toISOString(),
    duration: session.duration || 0,
    overallScore: session.overallScore || 0,
    totalWords: session.totalWords || 0
  });

  // Keep only last 50 sessions
  const trimmedHistory = history.slice(-50);

  // Save back
  await setLocalStorage({
    [StorageKeys.SESSION_HISTORY]: trimmedHistory
  });
}

/**
 * Load session history
 * @param {number} limit - Max number of sessions to return
 * @returns {Promise<array>} Session history array
 */
export async function loadSessionHistory(limit = 50) {
  const data = await getLocalStorage(StorageKeys.SESSION_HISTORY);
  const history = data[StorageKeys.SESSION_HISTORY] || [];

  return history.slice(-limit);
}

/**
 * Save performance report
 * @param {string} sessionId - Session ID
 * @param {object} report - Performance report
 * @returns {Promise<void>}
 */
export async function savePerformanceReport(sessionId, report) {
  const data = await getLocalStorage(StorageKeys.PERFORMANCE_REPORTS);
  const reports = data[StorageKeys.PERFORMANCE_REPORTS] || {};

  reports[sessionId] = {
    report,
    savedAt: new Date().toISOString()
  };

  await setLocalStorage({
    [StorageKeys.PERFORMANCE_REPORTS]: reports
  });
}

/**
 * Load performance report
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Performance report or null if not found
 */
export async function loadPerformanceReport(sessionId) {
  const data = await getLocalStorage(StorageKeys.PERFORMANCE_REPORTS);
  const reports = data[StorageKeys.PERFORMANCE_REPORTS] || {};

  return reports[sessionId]?.report || null;
}

/**
 * Save medical terms cache
 * @param {Map} cache - Medical terms cache Map
 * @returns {Promise<void>}
 */
export async function saveMedicalTermsCache(cache) {
  // Convert Map to object for storage
  const cacheObject = {};
  cache.forEach((value, key) => {
    cacheObject[key] = value;
  });

  await setLocalStorage({
    [StorageKeys.MEDICAL_TERMS_CACHE]: cacheObject
  });
}

/**
 * Load medical terms cache
 * @returns {Promise<Map>} Medical terms cache Map
 */
export async function loadMedicalTermsCache() {
  const data = await getLocalStorage(StorageKeys.MEDICAL_TERMS_CACHE);
  const cacheObject = data[StorageKeys.MEDICAL_TERMS_CACHE] || {};

  // Convert object back to Map
  const cache = new Map();
  Object.entries(cacheObject).forEach(([key, value]) => {
    cache.set(key, value);
  });

  return cache;
}

/**
 * Get storage usage statistics
 * @returns {Promise<object>} Storage usage info
 */
export async function getStorageUsage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve({
          bytesUsed: bytes,
          maxBytes: chrome.storage.local.QUOTA_BYTES || 10485760, // 10MB default
          percentUsed: (bytes / (chrome.storage.local.QUOTA_BYTES || 10485760)) * 100
        });
      }
    });
  });
}

/**
 * Clean up old data (sessions older than 30 days, reports older than 90 days)
 * @returns {Promise<void>}
 */
export async function cleanupOldData() {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  // Clean session history
  const historyData = await getLocalStorage(StorageKeys.SESSION_HISTORY);
  const history = historyData[StorageKeys.SESSION_HISTORY] || [];
  const recentSessions = history.filter(session => {
    const sessionTime = new Date(session.timestamp).getTime();
    return (now - sessionTime) < thirtyDays;
  });

  // Clean performance reports
  const reportsData = await getLocalStorage(StorageKeys.PERFORMANCE_REPORTS);
  const reports = reportsData[StorageKeys.PERFORMANCE_REPORTS] || {};
  const recentReports = {};
  Object.entries(reports).forEach(([sessionId, data]) => {
    const reportTime = new Date(data.savedAt).getTime();
    if ((now - reportTime) < ninetyDays) {
      recentReports[sessionId] = data;
    }
  });

  // Save cleaned data
  await setLocalStorage({
    [StorageKeys.SESSION_HISTORY]: recentSessions,
    [StorageKeys.PERFORMANCE_REPORTS]: recentReports
  });

  console.log('[StorageManager] Cleaned up old data');
}

/**
 * Listen for storage changes
 * @param {function} callback - Callback function (changes, areaName) => void
 */
export function onStorageChanged(callback) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    callback(changes, areaName);
  });
}

/**
 * Save complete session data
 * @param {string} sessionId - Session ID
 * @param {object} sessionData - Complete session data
 * @returns {Promise<void>}
 */
export async function saveSessionData(sessionId, sessionData) {
  // Get existing call sessions
  const data = await getLocalStorage('callSessions');
  const sessions = data.callSessions || {};

  // Add/update this session
  sessions[sessionId] = {
    ...sessionData,
    savedAt: new Date().toISOString()
  };

  // Save back to storage
  await setLocalStorage({
    callSessions: sessions
  });

  console.log(`[StorageManager] Session data saved: ${sessionId}`);
}

/**
 * Load session data
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session data or null if not found
 */
export async function loadSessionData(sessionId) {
  const data = await getLocalStorage('callSessions');
  const sessions = data.callSessions || {};

  return sessions[sessionId] || null;
}

/**
 * Check if API keys are configured
 * @returns {Promise<boolean>} True if both API keys are set
 */
export async function hasApiKeys() {
  const keys = await loadApiKeys();
  return !!(keys.googleCloud && keys.anthropic);
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StorageKeys,
    getSyncStorage,
    setSyncStorage,
    getLocalStorage,
    setLocalStorage,
    removeSyncStorage,
    removeLocalStorage,
    clearSyncStorage,
    clearLocalStorage,
    loadApiKeys,
    saveApiKeys,
    loadPreferences,
    savePreferences,
    saveSession,
    loadSessionHistory,
    savePerformanceReport,
    loadPerformanceReport,
    saveMedicalTermsCache,
    loadMedicalTermsCache,
    saveSessionData,
    loadSessionData,
    getStorageUsage,
    cleanupOldData,
    onStorageChanged,
    hasApiKeys
  };
}
