/**
 * @file callDetector.test.js
 * @description Unit tests for CallDetector
 */

import CallDetector from '../../utils/callDetector.js';

describe('CallDetector', () => {
    let detector;
    let callbacks;

    beforeEach(() => {
        callbacks = {
            onCallDetected: jest.fn(),
            onCallEnded: jest.fn(),
            onCaptionEnabled: jest.fn(),
            onPlatformDetected: jest.fn()
        };

        detector = new CallDetector(callbacks);

        // Reset location for tests
        delete window.location;
        window.location = { href: '', hostname: '', pathname: '' };
    });

    afterEach(() => {
        detector.stop();
    });

    describe('Constructor', () => {
        test('initializes with default values', () => {
            expect(detector.isCallActive).toBe(false);
            expect(detector.detectedPlatform).toBe('unknown');
            expect(detector.observers).toEqual([]);
            expect(detector.webrtcConnections).toBeInstanceOf(Set);
        });

        test('sets up all callbacks', () => {
            expect(detector.onCallDetected).toBe(callbacks.onCallDetected);
            expect(detector.onCallEnded).toBe(callbacks.onCallEnded);
            expect(detector.onCaptionEnabled).toBe(callbacks.onCaptionEnabled);
            expect(detector.onPlatformDetected).toBe(callbacks.onPlatformDetected);
        });
    });

    describe('Platform Detection', () => {
        test('detects Google Meet', () => {
            window.location.href = 'https://meet.google.com/abc-defg-hij';

            detector.detectPlatform();

            expect(detector.detectedPlatform).toBe('google-meet');
            expect(callbacks.onPlatformDetected).toHaveBeenCalledWith('google-meet');
        });

        test('detects Zoom', () => {
            window.location.hostname = 'zoom.us';

            detector.detectPlatform();

            expect(detector.detectedPlatform).toBe('zoom');
            expect(callbacks.onPlatformDetected).toHaveBeenCalledWith('zoom');
        });

        test('detects Microsoft Teams', () => {
            window.location.hostname = 'teams.microsoft.com';

            detector.detectPlatform();

            expect(detector.detectedPlatform).toBe('teams');
            expect(callbacks.onPlatformDetected).toHaveBeenCalledWith('teams');
        });

        test('detects Twilio when SDK is present', () => {
            window.Twilio = { Device: {} };

            detector.detectPlatform();

            expect(detector.detectedPlatform).toBe('twilio');
            expect(callbacks.onPlatformDetected).toHaveBeenCalledWith('twilio');

            delete window.Twilio;
        });

        test('sets unknown for unrecognized platforms', () => {
            window.location.href = 'https://example.com';

            detector.detectPlatform();

            expect(detector.detectedPlatform).toBe('unknown');
            expect(callbacks.onPlatformDetected).toHaveBeenCalledWith('unknown');
        });
    });

    describe('Twilio Detection', () => {
        test('detectTwilio returns true when Twilio object exists', () => {
            window.Twilio = {};

            expect(detector.detectTwilio()).toBe(true);

            delete window.Twilio;
        });

        test('detectTwilio returns true when Twilio DOM elements exist', () => {
            const div = document.createElement('div');
            div.className = 'twilio-component';
            document.body.appendChild(div);

            expect(detector.detectTwilio()).toBe(true);

            document.body.removeChild(div);
        });

        test('detectTwilio returns false when no Twilio indicators', () => {
            expect(detector.detectTwilio()).toBe(false);
        });
    });

    describe('Call State Management', () => {
        test('handleCallStart triggers callback when not already active', () => {
            detector.handleCallStart('test-method');

            expect(detector.isCallActive).toBe(true);
            expect(callbacks.onCallDetected).toHaveBeenCalledWith(
                'unknown',
                expect.objectContaining({
                    detectionMethod: 'test-method'
                })
            );
        });

        test('handleCallStart does nothing if already active', () => {
            detector.isCallActive = true;

            detector.handleCallStart('test-method');

            expect(callbacks.onCallDetected).not.toHaveBeenCalled();
        });

        test('handleCallEnd triggers callback when active', () => {
            detector.isCallActive = true;

            detector.handleCallEnd();

            expect(detector.isCallActive).toBe(false);
            expect(callbacks.onCallEnded).toHaveBeenCalled();
        });

        test('handleCallEnd does nothing if not active', () => {
            detector.handleCallEnd();

            expect(callbacks.onCallEnded).not.toHaveBeenCalled();
        });
    });

    describe('WebRTC Monitoring', () => {
        test('tracks WebRTC connections', () => {
            // This test would require mocking RTCPeerConnection
            // which is complex in Jest. Would be better as an integration test.
            expect(detector.webrtcConnections.size).toBe(0);
        });
    });

    describe('Generic Call Detection', () => {
        test('checkGeneric detects active WebRTC connections', () => {
            const mockConnection = { connectionState: 'connected' };
            detector.webrtcConnections.add(mockConnection);

            const result = detector.checkGeneric();

            expect(result).toBe(true);
        });

        test('checkGeneric detects call indicators in DOM', () => {
            const timer = document.createElement('div');
            timer.className = 'call-timer';
            document.body.appendChild(timer);

            const result = detector.checkGeneric();

            expect(result).toBe(true);

            document.body.removeChild(timer);
        });

        test('checkGeneric returns false when no indicators', () => {
            const result = detector.checkGeneric();

            expect(result).toBe(false);
        });
    });

    describe('Stop', () => {
        test('stop clears all observers', () => {
            detector.start();
            const observerCount = detector.observers.length;

            detector.stop();

            expect(detector.observers).toEqual([]);
            expect(detector.checkInterval).toBeNull();
        });
    });

    describe('getCallState', () => {
        test('returns current call state', () => {
            detector.isCallActive = true;
            detector.detectedPlatform = 'google-meet';

            const state = detector.getCallState();

            expect(state).toEqual({
                isCallActive: true,
                platform: 'google-meet',
                webrtcConnections: 0
            });
        });
    });
});
