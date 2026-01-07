/**
 * @file setup.js
 * @description Jest setup file for test environment
 */

// Mock Chrome APIs
global.chrome = {
    tabCapture: {
        capture: jest.fn()
    },
    runtime: {
        lastError: null,
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    },
    storage: {
        sync: {
            get: jest.fn((keys, callback) => callback({})),
            set: jest.fn((data, callback) => callback && callback())
        },
        local: {
            get: jest.fn((keys, callback) => callback({})),
            set: jest.fn((data, callback) => callback && callback())
        }
    }
};

// Mock WebSocket
global.WebSocket = class WebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 0);
    }

    send(data) {
        // Mock send
    }

    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }

    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
};

// Mock AudioContext
global.AudioContext = class AudioContext {
    constructor(options) {
        this.sampleRate = options?.sampleRate || 48000;
    }

    createMediaStreamSource(stream) {
        return {
            connect: jest.fn()
        };
    }

    createScriptProcessor(bufferSize, inputChannels, outputChannels) {
        return {
            connect: jest.fn(),
            disconnect: jest.fn(),
            onaudioprocess: null
        };
    }

    close() {
        return Promise.resolve();
    }
};

// Mock btoa (base64 encode)
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

// Mock atob (base64 decode)
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
    constructor(callback) {
        this.callback = callback;
    }

    observe() { }
    disconnect() { }
};

// Mock RTCPeerConnection
global.RTCPeerConnection = class RTCPeerConnection {
    constructor(config) {
        this.connectionState = 'new';
    }

    addEventListener(event, handler) { }
    removeEventListener(event, handler) { }
};

console.log('[Setup] Test environment configured');
