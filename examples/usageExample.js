/**
 * @file usageExample.js
 * @description Complete usage example for Transcription Agent integration
 * This demonstrates how to integrate all components together
 */

import TranscriptionAgent from './agents/transcriptionAgent.js';
import CallDetector from './utils/callDetector.js';
import CallTimer from './ui/callTimer.js';

/**
 * Example: Complete integration in content script
 */
class MedicalInterpreterCoPilot {
    constructor() {
        this.agent = null;
        this.detector = null;
        this.timer = null;
        this.isActive = false;
    }

    /**
     * Initialize the extension
     */
    async initialize() {
        console.log('[Co-Pilot] Initializing...');

        // Get API key from storage
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            console.error('[Co-Pilot] No API key found');
            return;
        }

        // Create timer UI
        this.createOverlay();
        this.timer = new CallTimer({
            container: document.getElementById('copilot-timer-container'),
            onTimerClick: (duration) => {
                console.log('[Co-Pilot] Call duration:', duration.formatted);
            }
        });

        // Create transcription agent
        this.agent = new TranscriptionAgent({
            apiKey: apiKey,
            language: 'en-US',

            onTranscriptionReceived: (data) => {
                this.handleTranscription(data);
            },

            onError: (error) => {
                this.handleError(error);
            },

            onStatusChange: (status) => {
                this.updateStatus(status);
            },

            onCallStart: (data) => {
                this.handleCallStart(data);
            },

            onCallStop: (data) => {
                this.handleCallStop(data);
            },

            onTimerUpdate: (duration) => {
                if (this.timer) {
                    this.timer.update(duration);
                }
            }
        });

        // Create call detector
        this.detector = new CallDetector({
            onCallDetected: (platform, callData) => {
                this.handleCallDetected(platform, callData);
            },

            onCallEnded: () => {
                this.handleCallEnded();
            },

            onPlatformDetected: (platform) => {
                console.log('[Co-Pilot] Platform detected:', platform);
                this.updatePlatformDisplay(platform);
            },

            onCaptionEnabled: (platform) => {
                console.log('[Co-Pilot] Captions enabled on', platform);
            }
        });

        // Start monitoring for calls
        this.detector.start();

        console.log('[Co-Pilot] Initialization complete');
    }

    /**
     * Handle call detected event
     */
    async handleCallDetected(platform, callData) {
        console.log('[Co-Pilot] Call detected:', platform);

        if (this.isActive) {
            console.log('[Co-Pilot] Already active, ignoring');
            return;
        }

        this.isActive = true;

        // Show overlay
        document.getElementById('copilot-overlay').style.display = 'block';

        // Initialize audio capture
        const success = await this.agent.initializeAudioCapture();
        if (!success) {
            console.error('[Co-Pilot] Failed to initialize audio capture');
            this.showError('Failed to capture audio. Please reload and try again.');
            return;
        }

        // Start streaming
        await this.agent.startStreaming(platform);

        // Start timer
        if (this.timer) {
            this.timer.start();
        }

        // Update UI
        this.updateStatus('Active - Monitoring call');
        this.showNotification(`Call monitoring started on ${platform}`);
    }

    /**
     * Handle call ended event
     */
    handleCallEnded() {
        console.log('[Co-Pilot] Call ended');

        if (!this.isActive) {
            console.log('[Co-Pilot] Not active, ignoring');
            return;
        }

        // Stop agent
        this.agent.stopStreaming();

        // Stop timer
        if (this.timer) {
            this.timer.stop();
        }

        // Update UI
        this.updateStatus('Inactive');
        this.showNotification('Call monitoring stopped');

        this.isActive = false;

        // Optionally hide overlay after a delay
        setTimeout(() => {
            document.getElementById('copilot-overlay').style.display = 'none';
        }, 3000);
    }

    /**
     * Handle call start (from agent)
     */
    handleCallStart(data) {
        console.log('[Co-Pilot] Call started:', data);

        // Display session info
        this.displaySessionInfo(data);

        // Send to background script for logging
        chrome.runtime.sendMessage({
            type: 'CALL_STARTED',
            data: data
        });
    }

    /**
     * Handle call stop (from agent)
     */
    handleCallStop(data) {
        console.log('[Co-Pilot] Call stopped:', data);

        // Display final stats
        this.displayCallSummary(data);

        // Send to background script for logging
        chrome.runtime.sendMessage({
            type: 'CALL_STOPPED',
            data: data
        });
    }

    /**
     * Handle transcription data
     */
    handleTranscription(data) {
        console.log('[Co-Pilot] Transcription:', data.text);

        // Add to UI
        this.addTranscriptToUI(data);

        // Send to Agent 2 (Medical Terminology) if integrated
        // this.medicalTerminologyAgent.processTranscript(data);

        // Send to Agent 3 (Performance Evaluation) if integrated
        // this.performanceAgent.analyzeTranscript(data);
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('[Co-Pilot] Error:', error);
        this.showError(error.message);
    }

    /**
     * Update status display
     */
    updateStatus(status) {
        const statusElement = document.getElementById('copilot-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Create overlay UI
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'copilot-overlay';
        overlay.className = 'coach-overlay';
        overlay.innerHTML = `
      <div class="overlay-header">
        <h2 class="overlay-title">Medical Interpreter Co-Pilot</h2>
        <div class="overlay-controls">
          <button id="copilot-minimize">−</button>
          <button id="copilot-close">×</button>
        </div>
      </div>
      <div class="overlay-content">
        <div id="copilot-timer-container"></div>
        
        <div class="session-info">
          <span class="status-indicator inactive"></span>
          <span id="copilot-status">Inactive</span>
        </div>

        <div id="copilot-platform" class="platform-info"></div>
        
        <div class="transcription-panel">
          <h3>Live Transcription</h3>
          <div id="copilot-transcripts"></div>
        </div>
        
        <div class="medical-terms-panel">
          <h3>Medical Terms</h3>
          <div id="copilot-terms"></div>
        </div>
        
        <div class="metrics-panel">
          <h3>Performance</h3>
          <div id="copilot-metrics"></div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        // Add event listeners
        document.getElementById('copilot-minimize').addEventListener('click', () => {
            overlay.classList.toggle('collapsed');
        });

        document.getElementById('copilot-close').addEventListener('click', () => {
            overlay.style.display = 'none';
        });
    }

    /**
     * Add transcript to UI
     */
    addTranscriptToUI(data) {
        const container = document.getElementById('copilot-transcripts');
        if (!container) return;

        // Create transcript element
        const item = document.createElement('div');
        item.className = `transcript-item ${data.isFinal ? 'final' : 'interim'}`;
        item.innerHTML = `
      ${data.text}
      <span class="transcript-confidence">
        ${Math.round(data.confidence * 100)}%
      </span>
    `;

        // Add to container
        if (data.isFinal) {
            container.appendChild(item);
        } else {
            // Replace previous interim result
            const interim = container.querySelector('.transcript-item.interim');
            if (interim) {
                interim.replaceWith(item);
            } else {
                container.appendChild(item);
            }
        }

        // Auto-scroll
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Display session info
     */
    displaySessionInfo(data) {
        const container = document.getElementById('copilot-platform');
        if (!container) return;

        container.innerHTML = `
      <strong>Platform:</strong> ${data.platform}<br>
      <strong>Session:</strong> ${data.sessionId.substring(0, 20)}...
    `;
    }

    /**
     * Display call summary
     */
    displayCallSummary(data) {
        this.showNotification(`
      Call Summary:
      Duration: ${data.duration.formatted}
      Platform: ${data.platform}
    `);
    }

    /**
     * Update platform display
     */
    updatePlatformDisplay(platform) {
        const container = document.getElementById('copilot-platform');
        if (container) {
            container.innerHTML = `<strong>Platform:</strong> ${platform}`;
        }
    }

    /**
     * Show notification
     */
    showNotification(message) {
        // Simple notification (can be enhanced)
        console.log('[Co-Pilot] Notification:', message);

        // Could use Chrome notifications API
        // chrome.notifications.create({ ... });
    }

    /**
     * Show error
     */
    showError(message) {
        // Simple error display (can be enhanced)
        console.error('[Co-Pilot] Error:', message);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'copilot-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 999999;
    `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * Get API key from storage
     */
    async getApiKey() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['googleCloudApiKey'], (result) => {
                resolve(result.googleCloudApiKey || null);
            });
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.detector) {
            this.detector.stop();
        }

        if (this.agent) {
            this.agent.stopStreaming();
        }

        if (this.timer) {
            this.timer.destroy();
        }

        const overlay = document.getElementById('copilot-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Initialize when page loads
let copilot = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        copilot = new MedicalInterpreterCoPilot();
        copilot.initialize();
    });
} else {
    copilot = new MedicalInterpreterCoPilot();
    copilot.initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (copilot) {
        copilot.destroy();
    }
});

// Export for testing
export default MedicalInterpreterCoPilot;
