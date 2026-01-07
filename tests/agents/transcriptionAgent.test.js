/**
 * @file transcriptionAgent.test.js
 * @description Unit tests for TranscriptionAgent
 */

import TranscriptionAgent from '../../agents/transcriptionAgent.js';

describe('TranscriptionAgent', () => {
    describe('Constructor', () => {
        test('initializes with valid config', () => {
            const agent = new TranscriptionAgent({
                apiKey: 'test-api-key',
                language: 'en-US'
            });

            expect(agent.apiKey).toBe('test-api-key');
            expect(agent.language).toBe('en-US');
            expect(agent.isStreaming).toBe(false);
            expect(agent.sampleRate).toBe(16000);
        });

        test('throws error when API key is missing', () => {
            expect(() => {
                new TranscriptionAgent({});
            }).toThrow('[TranscriptionAgent] API key is required');
        });

        test('uses default language when not specified', () => {
            const agent = new TranscriptionAgent({
                apiKey: 'test-api-key'
            });

            expect(agent.language).toBe('en-US');
        });

        test('sets up all necessary properties', () => {
            const agent = new TranscriptionAgent({
                apiKey: 'test-api-key'
            });

            expect(agent.audioContext).toBeNull();
            expect(agent.mediaStream).toBeNull();
            expect(agent.processor).toBeNull();
            expect(agent.websocket).toBeNull();
            expect(agent.sessionId).toBeNull();
            expect(agent.startTime).toBeNull();
            expect(agent.stopTime).toBeNull();
        });
    });

    describe('Audio Conversion', () => {
        let agent;

        beforeEach(() => {
            agent = new TranscriptionAgent({
                apiKey: 'test-api-key'
            });
        });

        test('convertFloat32ToInt16 converts correctly', () => {
            const input = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
            const output = agent.convertFloat32ToInt16(input);

            expect(output).toBeInstanceOf(Int16Array);
            expect(output.length).toBe(input.length);
            expect(output[0]).toBe(0);
            expect(output[3]).toBe(32767); // Max positive
            expect(output[4]).toBe(-32768); // Max negative
        });

        test('convertFloat32ToInt16 clamps out-of-range values', () => {
            const input = new Float32Array([2.0, -2.0]);
            const output = agent.convertFloat32ToInt16(input);

            expect(output[0]).toBe(32767); // Clamped to max
            expect(output[1]).toBe(-32768); // Clamped to min
        });

        test('arrayBufferToBase64 encodes correctly', () => {
            const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
            const base64 = agent.arrayBufferToBase64(buffer);

            expect(typeof base64).toBe('string');
            expect(base64).toBe('SGVsbG8=');
        });
    });

    describe('Call Time Tracking', () => {
        let agent;

        beforeEach(() => {
            agent = new TranscriptionAgent({
                apiKey: 'test-api-key'
            });
        });

        test('generateSessionId creates unique IDs', () => {
            const id1 = agent.generateSessionId();
            const id2 = agent.generateSessionId();

            expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        test('formatDuration formats correctly', () => {
            expect(agent.formatDuration(0)).toBe('00:00:00');
            expect(agent.formatDuration(61)).toBe('00:01:01');
            expect(agent.formatDuration(3661)).toBe('01:01:01');
            expect(agent.formatDuration(90061)).toBe('25:01:01');
        });

        test('getCallDuration returns zero when not started', () => {
            const duration = agent.getCallDuration();

            expect(duration.seconds).toBe(0);
            expect(duration.formatted).toBe('00:00:00');
        });

        test('logCallStart initializes session data', () => {
            const onCallStart = jest.fn();
            agent.onCallStart = onCallStart;

            agent.logCallStart();

            expect(agent.sessionId).toBeTruthy();
            expect(agent.startTime).toBeTruthy();
            expect(agent.timerInterval).toBeTruthy();
            expect(onCallStart).toHaveBeenCalled();
        });

        test('logCallStop clears timer interval', () => {
            agent.logCallStart();
            const intervalId = agent.timerInterval;

            agent.logCallStop();

            expect(agent.timerInterval).toBeNull();
            expect(agent.stopTime).toBeTruthy();
        });
    });

    describe('Transcription Response Handling', () => {
        let agent;
        let onTranscriptionReceived;

        beforeEach(() => {
            onTranscriptionReceived = jest.fn();
            agent = new TranscriptionAgent({
                apiKey: 'test-api-key',
                onTranscriptionReceived
            });
            agent.sessionId = 'test-session';
        });

        test('handleTranscriptionResponse processes valid response', () => {
            const response = {
                results: [
                    {
                        alternatives: [
                            {
                                transcript: 'test transcript',
                                confidence: 0.95
                            }
                        ],
                        isFinal: true
                    }
                ]
            };

            agent.handleTranscriptionResponse(response);

            expect(onTranscriptionReceived).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: 'test transcript',
                    isFinal: true,
                    confidence: 0.95,
                    language: 'en-US',
                    sessionId: 'test-session'
                })
            );
        });

        test('handleTranscriptionResponse ignores empty results', () => {
            const response = { results: [] };

            agent.handleTranscriptionResponse(response);

            expect(onTranscriptionReceived).not.toHaveBeenCalled();
        });

        test('handleTranscriptionResponse ignores missing alternatives', () => {
            const response = {
                results: [{ alternatives: [] }]
            };

            agent.handleTranscriptionResponse(response);

            expect(onTranscriptionReceived).not.toHaveBeenCalled();
        });
    });

    describe('Resource Cleanup', () => {
        let agent;

        beforeEach(() => {
            agent = new TranscriptionAgent({
                apiKey: 'test-api-key'
            });
        });

        test('stopStreaming sets isStreaming to false', () => {
            agent.isStreaming = true;

            agent.stopStreaming();

            expect(agent.isStreaming).toBe(false);
        });

        test('stopStreaming clears all resources', () => {
            agent.websocket = { close: jest.fn() };
            agent.processor = { disconnect: jest.fn() };
            agent.audioContext = { close: jest.fn() };
            agent.mediaStream = {
                getTracks: () => [{ stop: jest.fn() }]
            };
            agent.buffer = [1, 2, 3];

            agent.stopStreaming();

            expect(agent.websocket).toBeNull();
            expect(agent.processor).toBeNull();
            expect(agent.audioContext).toBeNull();
            expect(agent.mediaStream).toBeNull();
            expect(agent.buffer).toEqual([]);
        });

        test('stopStreaming calls logCallStop', () => {
            agent.logCallStart();
            const sessionId = agent.sessionId;

            agent.stopStreaming();

            expect(agent.stopTime).toBeTruthy();
        });
    });
});
