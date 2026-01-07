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
   * Initialize audio capture from Chrome tab
   * IMPORTANT: This captures tab audio output (non-intrusive), NOT user microphone
   * @returns {Promise<boolean>} Success status
   */
  async initializeAudioCapture() {
    try {
      this.onStatusChange('Initializing audio capture...');

      // Step 1: Request tab audio capture (NON-INTRUSIVE - captures tab output only)
      const stream = await new Promise((resolve, reject) => {
        chrome.tabCapture.capture(
          { audio: true, video: false },
          (capturedStream) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (!capturedStream) {
              reject(new Error('Failed to capture tab audio stream'));
            } else {
              resolve(capturedStream);
            }
          }
        );
      });

      this.mediaStream = stream;

      // Step 2: Create audio context with required sample rate
      this.audioContext = new AudioContext({
        sampleRate: this.sampleRate
      });

      // Step 3: Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Step 4: Create script processor for audio chunks
      // Buffer size: 4096 samples (balance between latency and efficiency)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Step 5: Connect audio nodes
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

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
        recovery: 'Ensure you are on a tab with audio content and have granted permissions'
      });

      return false;
    }
  }

  /**
   * Start streaming audio to Google Cloud Speech-to-Text
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

      // Initialize WebSocket connection
      await this.initializeWebSocket();

      // Process audio chunks as they arrive
      this.processor.onaudioprocess = (event) => {
        if (!this.isStreaming) return;

        const audioData = event.inputBuffer.getChannelData(0);
        const int16Array = this.convertFloat32ToInt16(audioData);

        // Send to Google Cloud
        this.sendAudioChunk(int16Array);
      };

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
        recovery: 'Check API key and network connection'
      });

      this.stopStreaming();
    }
  }

  /**
   * Initialize WebSocket connection to Google Cloud Speech-to-Text
   * @returns {Promise<void>}
   */
  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      const url = `wss://speech.googleapis.com/v1/speech:streamingRecognize?key=${this.apiKey}`;

      this.websocket = new WebSocket(url);

      // Handle connection open
      this.websocket.onopen = () => {
        console.log('[TranscriptionAgent] WebSocket connected');

        // Reset reconnection counter on successful connection
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        // Send initial configuration
        const config = {
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: this.sampleRate,
            languageCode: this.language,
            enableAutomaticPunctuation: true,
            interimResults: true,
            model: 'medical_conversation', // Optimized for medical terminology
            useEnhanced: true
          }
        };

        this.websocket.send(JSON.stringify(config));

        // Send buffered audio chunks if any
        if (this.audioBuffer.length > 0) {
          console.log(`[TranscriptionAgent] Sending ${this.audioBuffer.length} buffered chunks`);
          this.audioBuffer.forEach(chunk => {
            this.websocket.send(JSON.stringify(chunk));
          });
          this.audioBuffer = [];
        }

        resolve();
      };

      // Handle incoming messages
      this.websocket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          this.handleTranscriptionResponse(response);
        } catch (error) {
          console.error('[TranscriptionAgent] Failed to parse response:', error);
        }
      };

      // Handle errors
      this.websocket.onerror = (error) => {
        console.error('[TranscriptionAgent] WebSocket error:', error);

        this.onError({
          source: 'TranscriptionAgent',
          method: 'initializeWebSocket',
          message: 'WebSocket connection error',
          timestamp: Date.now(),
          recovery: 'Check API key and network connection. Retrying...'
        });

        reject(error);
      };

      // Handle connection close with exponential backoff
      this.websocket.onclose = (event) => {
        console.log('[TranscriptionAgent] WebSocket closed', event.code, event.reason);

        if (!this.isStreaming || this.isReconnecting) {
          return;
        }

        // Attempt reconnection with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.isReconnecting = true;
          this.reconnectAttempts++;

          // Calculate delay: min(baseDelay * 2^attempts, maxDelay) + jitter
          const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
          );

          // Add random jitter (±20%) to prevent thundering herd
          const jitter = delay * 0.2 * (Math.random() - 0.5);
          const finalDelay = delay + jitter;

          console.log(
            `[TranscriptionAgent] Reconnecting in ${Math.round(finalDelay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );

          this.onStatusChange(`Reconnecting... (attempt ${this.reconnectAttempts})`);

          setTimeout(() => {
            this.initializeWebSocket().catch(err => {
              console.error('[TranscriptionAgent] Reconnection failed:', err);
              this.isReconnecting = false;
            });
          }, finalDelay);

        } else {
          // Max retries exceeded
          console.error('[TranscriptionAgent] Max reconnection attempts exceeded');
          this.onError({
            source: 'TranscriptionAgent',
            method: 'initializeWebSocket',
            message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
            timestamp: Date.now(),
            recovery: 'Please check your network connection and restart the session'
          });
          this.stopStreaming();
        }
      };
    });
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

      // Close WebSocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Disconnect audio processor
      if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
        this.processor = null;
      }

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Stop media stream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Clear buffers
      this.buffer = [];
      this.audioBuffer = [];

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
}

// Export for use in extension
export default TranscriptionAgent;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptionAgent;
}
