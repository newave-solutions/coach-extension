/**
 * @file transcriptionAgent.js
 * @description Agent 1: Real-Time Transcription Agent for Medical Interpreter Co-Pilot
 * Captures live audio from Chrome tabs and transcribes using Google Cloud Speech-to-Text API
 * 
 * @author Newave Solutions
 * @version 1.0.0
 */

/**
 * TranscriptionAgent Class
 * Handles real-time audio capture, streaming, and transcription with call time tracking
 */
class TranscriptionAgent {
  /**
   * Initialize the TranscriptionAgent
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Google Cloud API key
   * @param {string} [config.language='en-US'] - Source language code
   * @param {Function} [config.onTranscriptionReceived] - Callback for transcription data
   * @param {Function} [config.onError] - Callback for error handling
   * @param {Function} [config.onStatusChange] - Callback for status updates
   * @param {Function} [config.onCallStart] - Callback when call starts
   * @param {Function} [config.onCallStop] - Callback when call stops
   * @param {Function} [config.onTimerUpdate] - Callback for timer updates (every second)
   */
  constructor(config = {}) {
    // Validate API key
    if (!config.apiKey) {
      throw new Error('[TranscriptionAgent] API key is required');
    }

    // Core configuration
    this.apiKey = config.apiKey;
    this.language = config.language || 'en-US';
    this.isStreaming = false;

    // Audio processing
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.sampleRate = 16000; // Required by Google Cloud

    // WebSocket connection
    this.websocket = null;
    this.buffer = [];

    // Reconnection strategy
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.baseReconnectDelay = 1000; // 1 second
    this.maxReconnectDelay = 30000; // 30 seconds
    this.audioBuffer = []; // Buffer audio during disconnection
    this.isReconnecting = false;

    // Call tracking
    this.sessionId = null;
    this.startTime = null;
    this.stopTime = null;
    this.timerInterval = null;
    this.platform = 'unknown';

    // Storage optimization
    this.storageConfig = {
      batchSize: config.storageBatchSize || 10,
      batchInterval: config.storageBatchInterval || 5000, // 5 seconds
      maxSessions: config.maxSessions || 50,
      maxTranscriptsPerSession: config.maxTranscriptsPerSession || 500
    };

    this.pendingWrites = {
      updates: [],
      timer: null
    };

    // Voice Activity Detection
    this.silenceThreshold = config.silenceThreshold || 0.01; // -40dB
    this.silenceDetectionEnabled = config.enableSilenceDetection !== false;

    // Audio statistics
    this.audioStats = {
      chunksProcessed: 0,
      chunksSent: 0,
      silentChunksSkipped: 0,
      averageLevel: 0,
      peakLevel: 0
    };

    // Performance monitoring
    this.performanceMetrics = {
      startTime: Date.now(),
      audioChunksProcessed: 0,
      transcriptionsReceived: 0,
      averageLatency: 0,
      memorySnapshots: [],
      errors: [],
      reconnections: 0
    };

    this.enablePerformanceMonitoring = config.enablePerformanceMonitoring || false;
    this.monitoringInterval = null;

    // Callbacks
    this.onTranscriptionReceived = config.onTranscriptionReceived || (() => { });
    this.onError = config.onError || console.error;
    this.onStatusChange = config.onStatusChange || (() => { });
    this.onCallStart = config.onCallStart || (() => { });
    this.onCallStop = config.onCallStop || (() => { });
    this.onTimerUpdate = config.onTimerUpdate || (() => { });

    console.log('[TranscriptionAgent] Initialized');
  }

  /**
   * Initialize audio capture using offscreen document (Manifest V3)
   * @returns {Promise<boolean>} Success status
   */
  async initializeAudioCapture() {
    try {
      this.onStatusChange('Initializing microphone...');

      // Create offscreen document if it doesn't exist
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });

      if (existingContexts.length === 0) {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['USER_MEDIA'],
          justification: 'Speech recognition for real-time transcription'
        });
        console.log('[TranscriptionAgent] Offscreen document created');
      }

      // Note: Audio will be handled by offscreen document
      // We don't need AudioContext here anymore
      this.onStatusChange('Audio capture initialized');
      console.log('[TranscriptionAgent] Audio capture initialized successfully');

      return true;

    } catch (error) {
      const errorMessage = `Audio capture failed: ${error.message}`;
      console.error('[TranscriptionAgent]', errorMessage);

      this.onError({
        source: 'TranscriptionAgent',
        method: 'initializeAudioCapture',
        message: errorMessage,
        timestamp: Date.now(),
        recovery: 'Ensure microphone permissions are granted'
      });

      return false;
    }
  }


  /**
   * Start streaming audio to speech recognition (via offscreen document)
   * @param {string} [platform='unknown'] - Platform name for tracking
   * @returns {Promise<void>}
   */
  async startStreaming(platform = 'unknown') {
    if (this.isStreaming) {
      console.warn('[TranscriptionAgent] Already streaming');
      return;
    }

    try {
      this.onStatusChange('Starting real-time transcription...');
      this.isStreaming = true;
      this.platform = platform;

      // Log call start and start timer
      this.logCallStart();

      // Initialize speech recognition via offscreen document
      await this.initializeWebSocket();

      // Note: Audio processing happens in offscreen document
      // Results come back via RECOGNITION_RESULT messages handled in background.js

      this.onStatusChange('Streaming active');
      console.log('[TranscriptionAgent] Streaming started successfully');

    } catch (error) {
      const errorMessage = `Streaming failed: ${error.message}`;
      console.error('[TranscriptionAgent]', errorMessage);

      this.onError({
        source: 'TranscriptionAgent',
        method: 'startStreaming',
        message: errorMessage,
        timestamp: Date.now(),
        recovery: 'Check microphone permissions and try again'
      });

      this.stopStreaming();
    }
  }

  /**
   * Initialize speech recognition via offscreen document
   * Service workers don't have access to window, so we delegate to offscreen document
   * @returns {Promise<void>}
   */
  async initializeWebSocket() {
    try {
      console.log('[TranscriptionAgent] Starting speech recognition via offscreen document');

      // Send message to offscreen document to start recognition
      const response = await chrome.runtime.sendMessage({
        action: 'START_RECOGNITION',
        language: this.language || 'en-US'
      });

      if (response && response.success) {
        console.log('[TranscriptionAgent] Speech recognition started in offscreen document');
        this.onStatusChange('Speech recognition active');
      } else {
        throw new Error('Failed to start speech recognition in offscreen document');
      }

    } catch (error) {
      console.error('[TranscriptionAgent] Failed to initialize speech recognition:', error);
      throw new Error(`Speech recognition initialization failed: ${error.message}`);
    }
  }

  /**
   * Handle transcription response from Google Cloud API
  * @param {Object} response - API response object
  */
  handleTranscriptionResponse(response) {
    // Check if response has results
    if (!response.results || response.results.length === 0) {
      return;
    }

    const result = response.results[0];
    if (!result.alternatives || result.alternatives.length === 0) {
      return;
    }

    const transcript = result.alternatives[0].transcript;
    const isFinal = result.isFinal || false;
    const confidence = result.alternatives[0].confidence || 0;

    // Track transcription performance
    this.performanceMetrics.transcriptionsReceived++;

    // Create transcription data package
    const transcriptionData = {
      text: transcript,
      isFinal: isFinal,
      confidence: confidence,
      timestamp: Date.now(),
      language: this.language,
      sessionId: this.sessionId
    };

    // Log for debugging
    const logType = isFinal ? 'FINAL' : 'INTERIM';
    const confidencePercent = Math.round(confidence * 100);
    console.log(
      `[TranscriptionAgent] ${logType}: "${transcript}" (${confidencePercent}%)`
    );

    // Pass to orchestrator (which routes to Agent 2 & Agent 3)
    this.onTranscriptionReceived(transcriptionData);

    // Save final transcripts to session data
    if (isFinal) {
      this.saveTranscriptToSession(transcriptionData);
    }
  }

  /**
   * Send audio chunk to Google Cloud via WebSocket
   * @param {Int16Array} audioData - Audio data in Int16 format
   */
  sendAudioChunk(audioData) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      // Buffer audio chunks during disconnection (limit to 100 chunks)
      if (this.isReconnecting && this.audioBuffer.length < 100) {
        console.log('[TranscriptionAgent] Buffering audio chunk during reconnection');
        const base64Audio = this.arrayBufferToBase64(audioData.buffer);
        this.audioBuffer.push({ audio_content: base64Audio });
      }
      return;
    }

    try {
      // Convert to base64
      const base64Audio = this.arrayBufferToBase64(audioData.buffer);

      // Create message
      const message = {
        audio_content: base64Audio
      };

      // Send to Google Cloud
      this.websocket.send(JSON.stringify(message));

    } catch (error) {
      console.error('[TranscriptionAgent] Failed to send audio chunk:', error);

      this.onError({
        source: 'TranscriptionAgent',
        method: 'sendAudioChunk',
        message: `Failed to send audio chunk: ${error.message}`,
        timestamp: Date.now(),
        recovery: 'Audio streaming may be interrupted'
      });
    }
  }

  /**
   * Stop streaming and clean up all resources
   */
  stopStreaming() {
    console.log('[TranscriptionAgent] Stopping streaming...');

    this.isStreaming = false;

    // Force save pending writes before cleanup
    this.forceSave().then(() => {
      // Log call stop and save final data
      this.logCallStop();

      // Stop offscreen recognition
      chrome.runtime.sendMessage({
        action: 'STOP_RECOGNITION'
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[TranscriptionAgent] Could not stop offscreen recognition:', chrome.runtime.lastError);
        }
      });

      // Close WebSocket (kept for future Google Cloud integration)
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Clear buffers
      this.buffer = [];
      this.audioBuffer = [];

      // Stop performance monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // Generate final performance report
      this.generatePerformanceReport();

      this.onStatusChange('Streaming stopped');
      console.log('[TranscriptionAgent] Cleanup complete');
    }).catch(err => {
      console.error('[TranscriptionAgent] Error during cleanup:', err);
    });
  }

  /**
   * Log call start and begin timer
   */
  logCallStart() {
    // Generate unique session ID
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.stopTime = null;

    // Start timer interval (update every second)
    this.timerInterval = setInterval(() => {
      const duration = this.getCallDuration();
      this.onTimerUpdate(duration);
    }, 1000);

    // Create session data
    const sessionData = {
      sessionId: this.sessionId,
      platform: this.platform,
      startTime: {
        iso8601: new Date(this.startTime).toISOString(),
        epoch: this.startTime
      },
      stopTime: null,
      duration: null,
      transcripts: [],
      metadata: {
        language: this.language,
        apiVersion: 'v1',
        model: 'medical_conversation'
      }
    };

    // Save to Chrome storage
    this.saveSessionData(sessionData);

    // Trigger callback
    this.onCallStart({
      sessionId: this.sessionId,
      startTime: this.startTime,
      platform: this.platform
    });

    // Start performance monitoring
    this.startPerformanceMonitoring();

    console.log(`[TranscriptionAgent] Call started - Session ID: ${this.sessionId}`);
  }

  /**
   * Log call stop and calculate duration
   */
  logCallStop() {
    if (!this.sessionId || !this.startTime) {
      return;
    }

    this.stopTime = Date.now();

    // Stop timer interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Calculate final duration
    const duration = this.getCallDuration();

    // Update session data
    chrome.storage.local.get(['callSessions'], (result) => {
      const sessions = result.callSessions || {};
      const session = sessions[this.sessionId];

      if (session) {
        session.stopTime = {
          iso8601: new Date(this.stopTime).toISOString(),
          epoch: this.stopTime
        };
        session.duration = duration;

        // Save updated session
        sessions[this.sessionId] = session;
        chrome.storage.local.set({ callSessions: sessions });
      }
    });

    // Trigger callback
    this.onCallStop({
      sessionId: this.sessionId,
      startTime: this.startTime,
      stopTime: this.stopTime,
      duration: duration,
      platform: this.platform
    });

    console.log(`[TranscriptionAgent] Call stopped - Duration: ${duration.formatted}`);
  }

  /**
   * Get current or final call duration
   * @returns {Object} Duration data
   */
  getCallDuration() {
    if (!this.startTime) {
      return { seconds: 0, formatted: '00:00:00' };
    }

    const endTime = this.stopTime || Date.now();
    const durationMs = endTime - this.startTime;
    const durationSeconds = Math.floor(durationMs / 1000);

    return {
      seconds: durationSeconds,
      formatted: this.formatDuration(durationSeconds)
    };
  }

  /**
   * Format duration in seconds to HH:MM:SS
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    // Use timestamp + random string for uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Save session data to Chrome storage
   * @param {Object} sessionData - Session data object
   */
  saveSessionData(sessionData) {
    chrome.storage.local.get(['callSessions'], (result) => {
      const sessions = result.callSessions || {};
      sessions[sessionData.sessionId] = sessionData;

      chrome.storage.local.set({ callSessions: sessions }, () => {
        console.log(`[TranscriptionAgent] Session data saved: ${sessionData.sessionId}`);
      });
    });
  }

  /**
   * Save transcript with batching
   * @param {Object} transcriptData - Transcript data
   */
  saveTranscriptToSession(transcriptData) {
    if (!this.sessionId) return;

    this.pendingWrites.updates.push({
      type: 'transcript',
      sessionId: this.sessionId,
      data: transcriptData
    });

    this.scheduleBatchWrite();
  }

  /**
   * Convert Float32Array to Int16Array
   * @param {Float32Array} float32Array - Input audio data
   * @returns {Int16Array} Converted audio data
   */
  convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range
      const s = Math.max(-1, Math.min(1, float32Array[i]));

      // Convert to 16-bit integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array;
  }

  /**
   * Convert ArrayBuffer to base64 string
   * @param {ArrayBuffer} buffer - Input buffer
   * @returns {string} Base64 encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  /**
   * Schedule batch write operation
   */
  scheduleBatchWrite() {
    // Clear existing timer
    if (this.pendingWrites.timer) {
      clearTimeout(this.pendingWrites.timer);
    }

    // Write immediately if batch size reached
    if (this.pendingWrites.updates.length >= this.storageConfig.batchSize) {
      this.flushPendingWrites();
      return;
    }

    // Otherwise schedule write
    this.pendingWrites.timer = setTimeout(() => {
      this.flushPendingWrites();
    }, this.storageConfig.batchInterval);
  }

  /**
   * Flush all pending writes to storage
   */
  async flushPendingWrites() {
    if (this.pendingWrites.updates.length === 0) return;

    const updates = [...this.pendingWrites.updates];
    this.pendingWrites.updates = [];
    this.pendingWrites.timer = null;

    try {
      const result = await chrome.storage.local.get(['callSessions']);
      let sessions = result.callSessions || {};

      // Apply all updates
      for (const update of updates) {
        if (update.type === 'session') {
          sessions[update.data.sessionId] = update.data;
        } else if (update.type === 'transcript') {
          const session = sessions[update.sessionId];
          if (session) {
            session.transcripts = session.transcripts || [];

            // Limit transcript array size
            if (session.transcripts.length >= this.storageConfig.maxTranscriptsPerSession) {
              session.transcripts = session.transcripts.slice(-this.storageConfig.maxTranscriptsPerSession + 1);
            }

            session.transcripts.push(update.data);
          }
        }
      }

      // Clean up old sessions if limit exceeded
      const sessionIds = Object.keys(sessions);
      if (sessionIds.length > this.storageConfig.maxSessions) {
        const sorted = sessionIds
          .map(id => ({ id, time: sessions[id].startTime.epoch }))
          .sort((a, b) => b.time - a.time)
          .slice(0, this.storageConfig.maxSessions);

        const newSessions = {};
        sorted.forEach(({ id }) => {
          newSessions[id] = sessions[id];
        });
        sessions = newSessions;

        console.log(`[TranscriptionAgent] Cleaned up ${sessionIds.length - this.storageConfig.maxSessions} old sessions`);
      }

      // Single write operation
      await chrome.storage.local.set({ callSessions: sessions });

      console.log(`[TranscriptionAgent] Batch write completed: ${updates.length} updates`);

    } catch (error) {
      console.error('[TranscriptionAgent] Batch write failed:', error);
      this.onError({
        source: 'TranscriptionAgent',
        method: 'flushPendingWrites',
        message: `Storage write failed: ${error.message}`,
        timestamp: Date.now(),
        recovery: 'Session data may not be persisted'
      });
    }
  }

  /**
   * Force flush pending writes (call before stopStreaming)
   */
  async forceSave() {
    if (this.pendingWrites.timer) {
      clearTimeout(this.pendingWrites.timer);
    }
    await this.flushPendingWrites();
  }

  /**
   * Calculate RMS (Root Mean Square) level of audio data
   * @param {Float32Array} samples - Audio samples
   * @returns {number} RMS level (0-1)
   */
  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Get audio processing statistics
   * @returns {Object} Audio stats with compression ratio
   */
  getAudioStats() {
    const compressionRatio = this.audioStats.chunksProcessed > 0
      ? (this.audioStats.silentChunksSkipped / this.audioStats.chunksProcessed * 100).toFixed(1)
      : 0;

    return {
      ...this.audioStats,
      compressionRatio: compressionRatio + '%',
      effectiveBandwidthSavings: compressionRatio + '%'
    };
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    if (!this.enablePerformanceMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect performance metrics including memory usage
   */
  collectPerformanceMetrics() {
    const metrics = {
      timestamp: Date.now(),
      uptime: Date.now() - this.performanceMetrics.startTime,
      audioChunksProcessed: this.performanceMetrics.audioChunksProcessed,
      transcriptionsReceived: this.performanceMetrics.transcriptionsReceived,
      reconnections: this.performanceMetrics.reconnections,
      audioStats: this.getAudioStats()
    };

    // Check memory usage if available
    if (performance.memory) {
      metrics.memoryUsage = {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };

      // Warn if memory usage is high
      const usagePercent = (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.limit) * 100;
      if (usagePercent > 80) {
        console.warn(`[TranscriptionAgent] High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    }

    console.log('[TranscriptionAgent] Performance metrics:', metrics);

    // Store snapshot
    this.performanceMetrics.memorySnapshots.push(metrics);

    // Keep only last 50 snapshots
    if (this.performanceMetrics.memorySnapshots.length > 50) {
      this.performanceMetrics.memorySnapshots.shift();
    }
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generatePerformanceReport() {
    const uptime = Date.now() - this.performanceMetrics.startTime;
    const audioStats = this.getAudioStats();

    const report = {
      sessionId: this.sessionId,
      duration: uptime,
      durationFormatted: this.formatDuration(Math.floor(uptime / 1000)),
      metrics: {
        audioChunksProcessed: this.performanceMetrics.audioChunksProcessed,
        transcriptionsReceived: this.performanceMetrics.transcriptionsReceived,
        reconnections: this.performanceMetrics.reconnections,
        errors: this.performanceMetrics.errors.length
      },
      audioStats: audioStats,
      efficiency: {
        bandwidthSaved: audioStats.compressionRatio,
        chunksSkipped: this.audioStats.silentChunksSkipped,
        chunksSent: this.audioStats.chunksSent
      }
    };

    console.log('[TranscriptionAgent] Performance Report:', report);
    return report;
  }

  /**
   * Get current performance state
   * @returns {Object} Current performance state
   */
  getPerformanceState() {
    return {
      isStreaming: this.isStreaming,
      sessionId: this.sessionId,
      uptime: Date.now() - this.performanceMetrics.startTime,
      metrics: this.performanceMetrics,
      audioStats: this.getAudioStats(),
      reconnectionState: {
        attempts: this.reconnectAttempts,
        isReconnecting: this.isReconnecting
      }
    };
  }
}

// Export for use in extension
export default TranscriptionAgent;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptionAgent;
}
