/**
 * @file callDetector.js
 * @description Automatically detects when calls start/end on various platforms
 * Supports: Google Meet, Zoom, Microsoft Teams, Twilio-based platforms, and private softphones
 * 
 * @author Newave Solutions
 * @version 1.0.0
 */

/**
 * CallDetector Class
 * Monitors DOM and WebRTC connections to automatically detect call state
 */
class CallDetector {
    /**
     * Initialize the CallDetector
     * @param {Object} config - Configuration object
     * @param {Function} [config.onCallDetected] - Callback when call starts
     * @param {Function} [config.onCallEnded] - Callback when call ends
     * @param {Function} [config.onCaptionEnabled] - Callback when captions enabled
     * @param {Function} [config.onPlatformDetected] - Callback when platform identified
     */
    constructor(config = {}) {
        this.onCallDetected = config.onCallDetected || (() => { });
        this.onCallEnded = config.onCallEnded || (() => { });
        this.onCaptionEnabled = config.onCaptionEnabled || (() => { });
        this.onPlatformDetected = config.onPlatformDetected || (() => { });

        this.isCallActive = false;
        this.detectedPlatform = 'unknown';
        this.observers = [];
        this.checkInterval = null;
        this.webrtcConnections = new Set();

        // Debounce timers
        this.debounceTimer = null;
        this.debounceDelay = 500; // ms

        console.log('[CallDetector] Initialized');
    }

    /**
     * Start monitoring for calls
     */
    start() {
        console.log('[CallDetector] Starting call detection...');

        // Detect platform
        this.detectPlatform();

        // Set up detection methods
        this.setupDOMObserver();
        this.setupWebRTCMonitoring();
        this.setupPeriodicCheck();

        console.log(`[CallDetector] Monitoring for calls on platform: ${this.detectedPlatform}`);
    }

    /**
     * Stop monitoring
     */
    stop() {
        console.log('[CallDetector] Stopping call detection...');

        // Clear observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // Clear interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    /**
     * Detect which platform is being used
     */
    detectPlatform() {
        const url = window.location.href;
        const hostname = window.location.hostname;

        // Google Meet
        if (url.includes('meet.google.com')) {
            this.detectedPlatform = 'google-meet';
        }
        // Zoom
        else if (hostname.includes('zoom.us') || hostname.includes('zoom.com')) {
            this.detectedPlatform = 'zoom';
        }
        // Microsoft Teams
        else if (hostname.includes('teams.microsoft.com')) {
            this.detectedPlatform = 'teams';
        }
        // Twilio-based platform
        else if (this.detectTwilio()) {
            this.detectedPlatform = 'twilio';
        }
        // Private/unknown platform
        else {
            this.detectedPlatform = 'unknown';
        }

        this.onPlatformDetected(this.detectedPlatform);
        console.log(`[CallDetector] Platform detected: ${this.detectedPlatform}`);
    }

    /**
     * Detect Twilio SDK presence
     * @returns {boolean} True if Twilio detected
     */
    detectTwilio() {
        // Check for Twilio global object
        if (typeof window.Twilio !== 'undefined') {
            console.log('[CallDetector] Twilio SDK detected');
            return true;
        }

        // Check for Twilio-specific DOM elements or classes
        const twilioIndicators = [
            '[class*="twilio"]',
            '[id*="twilio"]',
            '[data-twilio]'
        ];

        for (const selector of twilioIndicators) {
            if (document.querySelector(selector)) {
                console.log('[CallDetector] Twilio elements detected');
                return true;
            }
        }

        return false;
    }

    /**
     * Set up DOM mutation observer
     */
    setupDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            this.debouncedCheck();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-call-state', 'aria-label']
        });

        this.observers.push(observer);
    }

    /**
     * Set up WebRTC connection monitoring
     * Universal method that works across all platforms
     */
    setupWebRTCMonitoring() {
        // Override RTCPeerConnection to monitor connections
        const OriginalRTCPeerConnection = window.RTCPeerConnection;
        const self = this;

        window.RTCPeerConnection = function (...args) {
            const pc = new OriginalRTCPeerConnection(...args);

            // Track connection
            self.webrtcConnections.add(pc);
            console.log('[CallDetector] WebRTC connection created');

            // Monitor connection state
            pc.addEventListener('connectionstatechange', () => {
                console.log(`[CallDetector] WebRTC state: ${pc.connectionState}`);

                if (pc.connectionState === 'connected') {
                    self.handleCallStart('webrtc');
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    self.webrtcConnections.delete(pc);

                    // If no more connections, call ended
                    if (self.webrtcConnections.size === 0) {
                        self.handleCallEnd();
                    }
                }
            });

            return pc;
        };

        // Monitor for Twilio.Device events if Twilio is present
        if (typeof window.Twilio !== 'undefined' && window.Twilio.Device) {
            this.setupTwilioMonitoring();
        }
    }

    /**
     * Set up Twilio-specific event monitoring
     */
    setupTwilioMonitoring() {
        console.log('[CallDetector] Setting up Twilio event monitoring...');

        // Wait for Twilio.Device to be ready
        const checkTwilioDevice = setInterval(() => {
            // Check if device instance exists (common patterns)
            const device = window.Twilio.Device || window.device || window.twilioDevice;

            if (device) {
                clearInterval(checkTwilioDevice);

                // Monitor Twilio events
                device.on('incoming', (connection) => {
                    console.log('[CallDetector] Twilio incoming call');
                });

                device.on('connect', (connection) => {
                    console.log('[CallDetector] Twilio call connected');
                    this.handleCallStart('twilio');
                });

                device.on('disconnect', (connection) => {
                    console.log('[CallDetector] Twilio call disconnected');
                    this.handleCallEnd();
                });

                device.on('error', (error) => {
                    console.error('[CallDetector] Twilio error:', error);
                });
            }
        }, 500);

        // Stop checking after 10 seconds if device not found
        setTimeout(() => clearInterval(checkTwilioDevice), 10000);
    }

    /**
     * Set up periodic check for call indicators
     */
    setupPeriodicCheck() {
        // Check every 2 seconds as fallback
        this.checkInterval = setInterval(() => {
            this.checkCallState();
        }, 2000);
    }

    /**
     * Debounced check to avoid false positives
     */
    debouncedCheck() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.checkCallState();
        }, this.debounceDelay);
    }

    /**
     * Check current call state based on platform
     */
    checkCallState() {
        let callActive = false;
        let detectionMethod = 'unknown';

        switch (this.detectedPlatform) {
            case 'google-meet':
                callActive = this.checkGoogleMeet();
                detectionMethod = 'google-meet';
                break;
            case 'zoom':
                callActive = this.checkZoom();
                detectionMethod = 'zoom';
                break;
            case 'teams':
                callActive = this.checkTeams();
                detectionMethod = 'teams';
                break;
            case 'twilio':
                callActive = this.checkTwilio();
                detectionMethod = 'twilio';
                break;
            default:
                callActive = this.checkGeneric();
                detectionMethod = 'generic';
                break;
        }

        // Call state changed
        if (callActive && !this.isCallActive) {
            this.handleCallStart(detectionMethod);
        } else if (!callActive && this.isCallActive) {
            this.handleCallEnd();
        }
    }

    /**
     * Check Google Meet call state
     * @returns {boolean} True if call active
     */
    checkGoogleMeet() {
        // Check for call timer (reliable indicator)
        const timer = document.querySelector('[data-fps-request-screencast-cap]') ||
            document.querySelector('[jsname="rtcMTB"]');

        if (timer && timer.textContent.match(/\d+:\d+/)) {
            return true;
        }

        // Check for participant count
        const participants = document.querySelector('[data-participant-count]');
        if (participants) {
            return true;
        }

        // Check URL pattern
        if (window.location.pathname.match(/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/)) {
            return true;
        }

        // Check for captions (optional trigger)
        this.checkGoogleMeetCaptions();

        return false;
    }

    /**
     * Check if Google Meet captions are enabled
     */
    checkGoogleMeetCaptions() {
        const captionButton = document.querySelector('[aria-label*="captions" i][aria-pressed="true"]') ||
            document.querySelector('[data-is-muted="false"][aria-label*="caption" i]');

        if (captionButton) {
            console.log('[CallDetector] Google Meet captions detected');
            this.onCaptionEnabled('google-meet');
        }
    }

    /**
     * Check Zoom call state
     * @returns {boolean} True if call active
     */
    checkZoom() {
        // Check for meeting controls
        const controls = document.querySelector('.meeting-client-footer') ||
            document.querySelector('.footer-button-container');

        if (controls) {
            return true;
        }

        // Check for participant list
        const participants = document.querySelector('.participants-ul') ||
            document.querySelector('[aria-label*="Participants" i]');

        return !!participants;
    }

    /**
     * Check Microsoft Teams call state
     * @returns {boolean} True if call active
     */
    checkTeams() {
        // Check for call controls
        const controls = document.querySelector('[data-tid="callingButtons"]') ||
            document.querySelector('.ts-calling-screen');

        if (controls) {
            return true;
        }

        // Check for call timer
        const timer = document.querySelector('[data-tid="call-duration"]');

        return !!timer;
    }

    /**
     * Check Twilio call state
     * @returns {boolean} True if call active
     */
    checkTwilio() {
        // Check for active WebRTC connections
        if (this.webrtcConnections.size > 0) {
            return true;
        }

        // Check for Twilio device state
        if (typeof window.Twilio !== 'undefined') {
            const device = window.Twilio.Device || window.device || window.twilioDevice;

            if (device && device.status && device.status() === 'busy') {
                return true;
            }
        }

        // Check for Twilio UI elements
        const twilioCallUI = document.querySelector('[class*="call-active" i]') ||
            document.querySelector('[data-call-status="active"]');

        return !!twilioCallUI;
    }

    /**
     * Generic call detection for unknown platforms
     * @returns {boolean} True if call likely active
     */
    checkGeneric() {
        // Check for WebRTC connections (universal indicator)
        if (this.webrtcConnections.size > 0) {
            console.log('[CallDetector] Active WebRTC connections detected');
            return true;
        }

        // Check for common call indicators
        const indicators = [
            // Timer patterns
            document.querySelector('[class*="timer" i]:not([style*="display: none"])'),
            document.querySelector('[class*="duration" i]:not([style*="display: none"])'),

            // Call state indicators
            document.querySelector('[class*="call-active" i]'),
            document.querySelector('[class*="in-call" i]'),
            document.querySelector('[data-call-state="active"]'),
            document.querySelector('[data-call-status="active"]'),

            // VoIP/SIP indicators
            document.querySelector('[class*="voip" i]'),
            document.querySelector('[class*="sip" i]'),

            // Audio visualizers
            document.querySelector('[class*="audio-visualizer" i]'),
            document.querySelector('canvas[class*="waveform" i]')
        ].filter(Boolean);

        if (indicators.length > 0) {
            console.log(`[CallDetector] Generic call indicators found: ${indicators.length}`);
            return true;
        }

        // Check for text content indicating active call
        const bodyText = document.body.textContent.toLowerCase();
        const callKeywords = ['call in progress', 'on call', 'call duration', 'end call'];

        const hasKeyword = callKeywords.some(keyword => bodyText.includes(keyword));
        if (hasKeyword) {
            console.log('[CallDetector] Call keyword detected in page text');
            return true;
        }

        return false;
    }

    /**
     * Handle call start event
     * @param {string} detectionMethod - How the call was detected
     */
    handleCallStart(detectionMethod) {
        if (this.isCallActive) return;

        this.isCallActive = true;
        const callData = {
            platform: this.detectedPlatform,
            detectionMethod: detectionMethod,
            timestamp: Date.now(),
            url: window.location.href
        };

        console.log('[CallDetector] Call detected:', callData);
        this.onCallDetected(this.detectedPlatform, callData);
    }

    /**
     * Handle call end event
     */
    handleCallEnd() {
        if (!this.isCallActive) return;

        this.isCallActive = false;
        console.log('[CallDetector] Call ended');
        this.onCallEnded();
    }

    /**
     * Get current call state
     * @returns {Object} Call state information
     */
    getCallState() {
        return {
            isCallActive: this.isCallActive,
            platform: this.detectedPlatform,
            webrtcConnections: this.webrtcConnections.size
        };
    }
}

// Export for use in extension
export default CallDetector;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallDetector;
}
