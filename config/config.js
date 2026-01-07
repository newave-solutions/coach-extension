// ===================================================================
// Configuration Template
// File: config/config.js
// ===================================================================

/**
 * Application Configuration
 * 
 * IMPORTANT: API keys should NEVER be hardcoded here.
 * They should be stored in Chrome's encrypted storage (chrome.storage.sync)
 * and configured through the extension's settings UI.
 * 
 * This file contains default settings and configuration structure only.
 */

export const CONFIG = {
  // Application Info
  app: {
    name: 'Medical Interpreter Co-Pilot',
    version: '1.0.0',
    author: 'Newave Solutions'
  },

  // API Configuration (keys stored in chrome.storage.sync)
  apis: {
    googleCloud: {
      speechToText: {
        endpoint: 'https://speech.googleapis.com/v1/speech:streamingRecognize',
        model: 'medical_conversation',
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US', // Default source language
        enableAutomaticPunctuation: true,
        interimResults: true
      },
      translation: {
        endpoint: 'https://translation.googleapis.com/language/translate/v2',
        defaultTargetLanguage: 'es', // Spanish
        format: 'text'
      }
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-20250514',
      version: '2023-06-01',
      maxTokens: 2000
    }
  },

  // Audio Processing Settings
  audio: {
    sampleRate: 16000,
    channels: 1,
    bufferSize: 4096,
    format: 'LINEAR16'
  },

  // Agent Settings
  agents: {
    transcription: {
      enabled: true,
      retryAttempts: 3,
      retryDelay: 1000, // ms
      reconnectDelay: 1000 // ms
    },
    medicalTerminology: {
      enabled: true,
      cacheSize: 500,
      processedTermsLimit: 100,
      targetLanguage: 'es'
    },
    performanceEvaluation: {
      enabled: true,
      updateInterval: 2000, // ms (throttled metrics updates)
      deepAnalysisInterval: 10, // Every 10 utterances
      wpmTarget: 90,
      wpmMin: 85,
      wpmMax: 95
    }
  },

  // Performance Scoring Weights (must sum to 1.0)
  scoring: {
    weights: {
      accuracy: 0.30,
      professionalConduct: 0.25,
      fluency: 0.15,
      grammar: 0.10,
      sentenceStructure: 0.10,
      culturalCompetency: 0.10
    },
    thresholds: {
      excellent: 90,  // >= 90
      proficient: 80, // >= 80
      developing: 70, // >= 70
      needsImprovement: 0 // < 70
    }
  },

  // UI Settings
  ui: {
    overlay: {
      position: 'right', // 'left' or 'right'
      width: 420, // pixels
      maxHeight: '80vh'
    },
    theme: {
      primary: '#4f46e5', // Indigo
      success: '#10b981', // Green
      warning: '#f59e0b', // Amber
      error: '#ef4444',   // Red
      info: '#3b82f6'     // Blue
    },
    animations: {
      enabled: true,
      duration: 200 // ms
    }
  },

  // Storage Settings
  storage: {
    sync: {
      // Stored in chrome.storage.sync (encrypted, synced across devices)
      keys: [
        'googleCloudApiKey',
        'anthropicApiKey',
        'targetLanguage',
        'sourceLanguage',
        'userPreferences'
      ]
    },
    local: {
      // Stored in chrome.storage.local (not synced)
      keys: [
        'sessionHistory',
        'performanceReports',
        'medicalTermsCache'
      ],
      maxSessions: 50, // Keep last 50 sessions
      cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    }
  },

  // Feature Flags
  features: {
    realTimeMetrics: true,
    postCallDashboard: true,
    sessionExport: true,
    medicalTermsCache: true,
    aiDeepAnalysis: true,
    criticalAlerts: true,
    voiceAnalysis: false, // Future feature
    teamDashboard: false  // Future feature
  },

  // Development Settings
  dev: {
    debug: false, // Set to true for detailed console logging
    mockData: false, // Set to true to use mock data instead of real APIs
    skipApiValidation: false // Set to true to skip API key validation
  },

  // NCIHC Standards Reference
  ncihc: {
    standards: [
      'accuracy',
      'impartiality',
      'confidentiality',
      'respectForPersons',
      'professionalDevelopment'
    ],
    complianceThreshold: 85 // Minimum score for compliance
  }
};

/**
 * Get configuration value by path
 * @param {string} path - Dot notation path (e.g., 'agents.transcription.enabled')
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Configuration value
 */
export function getConfig(path, defaultValue = null) {
  return path.split('.').reduce((obj, key) => 
    obj && obj[key] !== undefined ? obj[key] : defaultValue, CONFIG);
}

/**
 * Load API keys from Chrome storage
 * @returns {Promise<Object>} API keys object
 */
export async function loadApiKeys() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'googleCloudApiKey',
      'anthropicApiKey'
    ], (items) => {
      resolve({
        googleCloud: items.googleCloudApiKey || '',
        anthropic: items.anthropicApiKey || ''
      });
    });
  });
}

/**
 * Save API keys to Chrome storage
 * @param {Object} keys - API keys object
 * @returns {Promise<boolean>} Success status
 */
export async function saveApiKeys(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      googleCloudApiKey: keys.googleCloud || '',
      anthropicApiKey: keys.anthropic || ''
    }, () => {
      resolve(true);
    });
  });
}

/**
 * Load user preferences from Chrome storage
 * @returns {Promise<Object>} User preferences
 */
export async function loadPreferences() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'targetLanguage',
      'sourceLanguage',
      'userPreferences'
    ], (items) => {
      resolve({
        targetLanguage: items.targetLanguage || CONFIG.agents.medicalTerminology.targetLanguage,
        sourceLanguage: items.sourceLanguage || CONFIG.apis.googleCloud.speechToText.languageCode,
        preferences: items.userPreferences || {}
      });
    });
  });
}

/**
 * Save user preferences to Chrome storage
 * @param {Object} preferences - User preferences
 * @returns {Promise<boolean>} Success status
 */
export async function savePreferences(preferences) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(preferences, () => {
      resolve(true);
    });
  });
}

// Export default config
export default CONFIG;
