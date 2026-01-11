// ===================================================================
// Agent Orchestrator - Central Coordination System
// File: agents/agentOrchestrator.js
// ===================================================================

import TranscriptionAgent from './transcriptionAgent.js';
import MedicalTerminologyAgent from './medicalTerminologyAgent.js';
import PerformanceEvaluationAgent from './performanceEvaluationAgent.js';
import { sendMessage, MessageTypes } from '../utils/messageHandler.js';
import { saveSessionData } from '../utils/storageManager.js';

/**
 * AgentOrchestrator Class
 * Central coordinator for all three agents
 * Manages lifecycle, data routing, and frontend communication
 */
class AgentOrchestrator {
  /**
   * Initialize the orchestrator
   * @param {Object} config - Configuration object
   * @param {string} config.googleCloudApiKey - Google Cloud API key
   * @param {string} [config.anthropicApiKey] - Anthropic API key (optional)
   * @param {string} [config.targetLanguage='es'] - Target language for translation
   * @param {string} [config.sourceLanguage='en-US'] - Source language
   * @param {Function} [config.onError] - Error callback
   */
  constructor(config = {}) {
    // Configuration
    this.googleCloudApiKey = config.googleCloudApiKey;
    this.anthropicApiKey = config.anthropicApiKey;
    this.targetLanguage = config.targetLanguage || 'es';
    this.sourceLanguage = config.sourceLanguage || 'en-US';
    
    // State
    this.isRunning = false;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.platform = 'unknown';
    
    // Throttling for metrics updates
    this.lastMetricsUpdate = 0;
    this.metricsUpdateInterval = 2000; // 2 seconds
    
    // Agents (initialized in start())
    this.transcriptionAgent = null;
    this.medicalTerminologyAgent = null;
    this.performanceEvaluationAgent = null;
    
    // Error handler
    this.onError = config.onError || console.error;
    
    console.log('[Orchestrator] Initialized');
  }

  /**
   * Start all agents and begin monitoring
   * @param {string} [platform='unknown'] - Platform name (google-meet, zoom, etc.)
   * @returns {Promise<Object>} Status object
   */
  async start(platform = 'unknown') {
    if (this.isRunning) {
      console.warn('[Orchestrator] Already running');
      return { success: false, message: 'Already running' };
    }
    
    try {
      // Generate session ID
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = Date.now();
      this.platform = platform;
      
      console.log(`[Orchestrator] Starting session: ${this.sessionId}`);
      
      // Initialize Agent 1: Transcription
      this.transcriptionAgent = new TranscriptionAgent({
        apiKey: this.googleCloudApiKey,
        language: this.sourceLanguage,
        
        // Callback: Handle transcriptions
        onTranscriptionReceived: (data) => {
          this.handleTranscription(data);
        },
        
        // Callback: Timer updates
        onTimerUpdate: (duration) => {
          this.handleTimerUpdate(duration);
        },
        
        // Callback: Call lifecycle
        onCallStart: (data) => {
          this.sendToFrontend({
            type: MessageTypes.EVENTS.CALL_START,
            data: {
              sessionId: this.sessionId,
              platform: this.platform,
              ...data
            }
          });
        },
        
        onCallStop: (data) => {
          // Handled in stop() method
        },
        
        // Callback: Errors
        onError: (error) => {
          this.handleError('TranscriptionAgent', error);
        }
      });
      
      // Initialize Agent 2: Medical Terminology
      this.medicalTerminologyAgent = new MedicalTerminologyAgent({
        targetLanguage: this.targetLanguage,
        translationApiKey: this.googleCloudApiKey,
        
        // Callback: Medical term detected
        onTermDetected: (data) => {
          this.handleMedicalTerm(data);
        },
        
        // Callback: Errors
        onError: (error) => {
          this.handleError('MedicalTerminologyAgent', error);
        }
      });
      
      // Initialize Agent 3: Performance Evaluation
      this.performanceEvaluationAgent = new PerformanceEvaluationAgent({
        anthropicApiKey: this.anthropicApiKey,
        
        // Callback: Metrics update (throttled)
        onMetricsUpdate: (metrics) => {
          this.handleMetricsUpdate(metrics);
        },
        
        // Callback: Suggestion generated
        onSuggestionGenerated: (suggestion) => {
          // Stored internally, displayed at end
          console.log('[Orchestrator] Suggestion generated:', suggestion.category);
        },
        
        // Callback: Errors
        onError: (error) => {
          this.handleError('PerformanceEvaluationAgent', error);
        }
      });
      
      // Start Agent 1 (transcription)
      await this.transcriptionAgent.initializeAudioCapture();
      await this.transcriptionAgent.startStreaming(platform);
      
      // Start Agent 3 (performance monitoring)
      this.performanceEvaluationAgent.start();
      
      // Note: Agent 2 doesn't need explicit start, it processes on-demand
      
      this.isRunning = true;
      
      // Notify frontend
      this.sendToFrontend({
        type: MessageTypes.EVENTS.AGENTS_STARTED,
        data: {
          sessionId: this.sessionId,
          platform: this.platform,
          timestamp: this.sessionStartTime,
          agents: {
            transcription: true,
            medicalTerminology: true,
            performanceEvaluation: true
          }
        }
      });
      
      console.log('[Orchestrator] All agents started successfully');
      
      return {
        success: true,
        sessionId: this.sessionId,
        timestamp: this.sessionStartTime
      };
      
    } catch (error) {
      console.error('[Orchestrator] Failed to start:', error);
      this.handleError('Orchestrator', error);
      
      // Cleanup on failure
      await this.cleanup();
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Stop all agents and generate final report
   * @returns {Promise<Object>} Final performance report
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('[Orchestrator] Not running');
      return null;
    }
    
    console.log('[Orchestrator] Stopping agents...');
    
    try {
      // Stop Agent 1 (transcription)
      if (this.transcriptionAgent) {
        this.transcriptionAgent.stopStreaming();
      }
      
      // Stop Agent 3 and get final report
      let performanceReport = null;
      if (this.performanceEvaluationAgent) {
        performanceReport = await this.performanceEvaluationAgent.stop();
      }
      
      // Calculate session duration
      const sessionDuration = Date.now() - this.sessionStartTime;
      
      // Prepare complete session data
      const sessionData = {
        sessionId: this.sessionId,
        platform: this.platform,
        startTime: {
          iso8601: new Date(this.sessionStartTime).toISOString(),
          epoch: this.sessionStartTime
        },
        endTime: {
          iso8601: new Date().toISOString(),
          epoch: Date.now()
        },
        duration: {
          milliseconds: sessionDuration,
          seconds: Math.floor(sessionDuration / 1000),
          formatted: this.formatDuration(sessionDuration)
        },
        performanceReport: performanceReport,
        agents: {
          transcription: {
            status: 'completed',
            callDuration: this.transcriptionAgent?.getCallDuration()
          },
          medicalTerminology: {
            status: 'completed',
            termsDetected: this.medicalTerminologyAgent?.processedTerms.size || 0
          },
          performanceEvaluation: {
            status: 'completed',
            overallScore: performanceReport?.overallScore
          }
        }
      };
      
      // Save session to storage
      await saveSessionData(this.sessionId, sessionData);
      
      // Send session complete message to frontend
      this.sendToFrontend({
        type: MessageTypes.EVENTS.SESSION_COMPLETE,
        data: {
          sessionId: this.sessionId,
          sessionData: sessionData
        }
      });
      
      console.log('[Orchestrator] Session complete:', this.sessionId);
      
      // Cleanup
      await this.cleanup();
      
      return sessionData;
      
    } catch (error) {
      console.error('[Orchestrator] Error during stop:', error);
      this.handleError('Orchestrator', error);
      await this.cleanup();
      return null;
    }
  }

  /**
   * Handle transcription from Agent 1
   * Routes to Agent 2, Agent 3, and frontend
   * @param {Object} data - Transcription data
   */
  handleTranscription(data) {
    if (!this.isRunning) return;
    
    try {
      // Add session ID to data
      const enrichedData = {
        ...data,
        sessionId: this.sessionId,
        timestamp: data.timestamp || Date.now()
      };
      
      // 1. Send to frontend immediately (for live display)
      this.sendToFrontend({
        type: MessageTypes.AGENT_OUTPUTS.TRANSCRIPTION,
        data: enrichedData
      });
      
      // Only process final transcriptions for other agents
      if (!data.isFinal) return;
      
      // 2. Pass to Agent 2 (Medical Terminology) - async, non-blocking
      if (this.medicalTerminologyAgent) {
        this.medicalTerminologyAgent.processTranscription(enrichedData)
          .catch(error => {
            this.handleError('MedicalTerminologyAgent', error);
          });
      }
      
      // 3. Pass to Agent 3 (Performance Evaluation) - async, non-blocking
      if (this.performanceEvaluationAgent) {
        this.performanceEvaluationAgent.processTranscription(enrichedData)
          .catch(error => {
            this.handleError('PerformanceEvaluationAgent', error);
          });
      }
      
    } catch (error) {
      this.handleError('Orchestrator', error);
    }
  }

  /**
   * Handle medical term detection from Agent 2
   * Routes to frontend
   * @param {Object} data - Medical term data
   */
  handleMedicalTerm(data) {
    if (!this.isRunning) return;
    
    try {
      // Add session ID
      const enrichedData = {
        ...data,
        sessionId: this.sessionId,
        timestamp: data.timestamp || Date.now()
      };
      
      // Send to frontend
      this.sendToFrontend({
        type: MessageTypes.AGENT_OUTPUTS.MEDICAL_TERM,
        data: enrichedData
      });
      
    } catch (error) {
      this.handleError('Orchestrator', error);
    }
  }

  /**
   * Handle metrics update from Agent 3
   * Throttled to prevent overwhelming frontend
   * @param {Object} metrics - Performance metrics
   */
  handleMetricsUpdate(metrics) {
    if (!this.isRunning) return;
    
    const now = Date.now();
    
    // Throttle updates (max every 2 seconds)
    if (now - this.lastMetricsUpdate < this.metricsUpdateInterval) {
      return; // Skip this update
    }
    
    this.lastMetricsUpdate = now;
    
    try {
      // Send to frontend
      this.sendToFrontend({
        type: MessageTypes.AGENT_OUTPUTS.METRICS_UPDATE,
        data: {
          sessionId: this.sessionId,
          metrics: metrics,
          timestamp: now,
          isLive: true
        }
      });
      
    } catch (error) {
      this.handleError('Orchestrator', error);
    }
  }

  /**
   * Handle timer updates from Agent 1
   * @param {Object} duration - Duration object
   */
  handleTimerUpdate(duration) {
    if (!this.isRunning) return;
    
    try {
      this.sendToFrontend({
        type: MessageTypes.EVENTS.TIMER_UPDATE,
        data: {
          sessionId: this.sessionId,
          duration: duration,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      // Don't log timer errors (too frequent)
    }
  }

  /**
   * Handle errors from any agent
   * @param {string|Object} sourceOrError - Error source string OR complete error object
   * @param {Error|Object} [error] - Error object (optional if first param is object)
   */
  handleError(sourceOrError, error) {
    let errorData;
    
    // Handle both calling conventions:
    // 1. handleError(source, error) - old format
    // 2. handleError({source, message, ...}) - new format
    if (typeof sourceOrError === 'object' && sourceOrError.source) {
      // New format: single object parameter
      errorData = {
        source: sourceOrError.source,
        message: sourceOrError.message || 'Unknown error',
        timestamp: sourceOrError.timestamp || Date.now(),
        sessionId: sourceOrError.sessionId || this.sessionId,
        recoverable: sourceOrError.recoverable !== undefined ? sourceOrError.recoverable : true
      };
    } else {
      // Old format: two parameters
      const source = sourceOrError;
      errorData = {
        source: source,
        message: error?.message || error?.toString() || 'Unknown error',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        recoverable: this.determineRecoverability(error)
      };
    }
    
    console.error(`[Orchestrator] Error from ${errorData.source}:`, errorData);
    
    // Call error callback
    if (this.onError) {
      this.onError(errorData);
    }
    
    // Send to frontend for user notification
    this.sendToFrontend({
      type: MessageTypes.EVENTS.ERROR,
      data: errorData
    });
  }

  /**
   * Determine if error is recoverable
   * @param {Error|Object} error - Error object
   * @returns {boolean} True if recoverable
   */
  determineRecoverability(error) {
    const errorMessage = error.message || error.toString();
    
    // Non-recoverable errors
    const fatalPatterns = [
      'API key',
      'authentication',
      'permission denied',
      'quota exceeded'
    ];
    
    return !fatalPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Send message to frontend (content script → overlay)
   * @param {Object} message - Message object
   */
  sendToFrontend(message) {
    try {
      sendMessage({
        action: 'AGENT_OUTPUT',
        payload: message
      });
    } catch (error) {
      console.error('[Orchestrator] Failed to send to frontend:', error);
    }
  }

  /**
   * Get current status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      platform: this.platform,
      sessionStartTime: this.sessionStartTime,
      uptime: this.isRunning ? Date.now() - this.sessionStartTime : 0,
      agents: {
        transcription: this.transcriptionAgent !== null,
        medicalTerminology: this.medicalTerminologyAgent !== null,
        performanceEvaluation: this.performanceEvaluationAgent !== null
      }
    };
  }

  /**
   * Format duration in milliseconds to HH:MM:SS
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('[Orchestrator] Cleaning up...');
    
    this.isRunning = false;
    
    // Clear agent references
    this.transcriptionAgent = null;
    this.medicalTerminologyAgent = null;
    this.performanceEvaluationAgent = null;
    
    // Reset state
    this.sessionId = null;
    this.sessionStartTime = null;
    this.platform = 'unknown';
    this.lastMetricsUpdate = 0;
  }

  /**
   * Emergency stop (force terminate all agents)
   */
  async emergencyStop() {
    console.warn('[Orchestrator] EMERGENCY STOP');
    
    try {
      if (this.transcriptionAgent) {
        this.transcriptionAgent.stopStreaming();
      }
      
      if (this.performanceEvaluationAgent) {
        await this.performanceEvaluationAgent.stop();
      }
      
    } catch (error) {
      console.error('[Orchestrator] Error during emergency stop:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in extension
export default AgentOrchestrator;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentOrchestrator;
}
