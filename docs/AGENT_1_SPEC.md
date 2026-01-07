# Agent 1: Real-Time Transcription Agent - Complete Specification

## Overview
Agent 1 captures live audio from Chrome tabs during medical interpretation calls and transcribes it in real-time using Google Cloud Speech-to-Text API. The transcription stream is then passed to both Agent 2 (medical terminology detection) and Agent 3 (performance evaluation).

---

## Purpose & Responsibilities

### Primary Functions
1. **Audio Capture**: Capture live audio from active Chrome tabs using tabCapture API
2. **Audio Processing**: Convert and format audio for Google Cloud Speech-to-Text
3. **Real-Time Transcription**: Stream audio chunks to Google Cloud API
4. **Result Distribution**: Pass transcription data to other agents and frontend

### Key Characteristics
- **Continuous Operation**: Runs for entire duration of call
- **Non-Blocking**: Async operations don't block UI or other agents
- **Resilient**: Handles network issues, API failures, reconnections
- **Optimized**: Medical conversation model for accuracy

---

## Class Structure

```javascript
class TranscriptionAgent {
  constructor(config = {})
  async initializeAudioCapture()
  async startStreaming()
  stopStreaming()
  async initializeWebSocket()
  sendAudioChunk(audioData)
  handleTranscriptionResponse(response)
  convertFloat32ToInt16(float32Array)
  arrayBufferToBase64(buffer)
}
```

---

## Constructor Configuration

```javascript
constructor(config = {}) {
  this.apiKey = config.apiKey;                    // Google Cloud API key
  this.language = config.language || 'en-US';     // Source language
  this.isStreaming = false;                        // Streaming status
  this.audioContext = null;                        // Web Audio API context
  this.mediaStream = null;                         // Chrome media stream
  this.processor = null;                           // Audio processor node
  this.websocket = null;                           // WebSocket connection
  this.buffer = [];                                // Audio buffer
  this.sampleRate = 16000;                         // Required by Google
  
  // Callbacks
  this.onTranscriptionReceived = config.onTranscriptionReceived || (() => {});
  this.onError = config.onError || console.error;
  this.onStatusChange = config.onStatusChange || (() => {});
}
```

---

## Method Specifications

### 1. initializeAudioCapture()

**Purpose**: Set up audio capture from the active Chrome tab

**Implementation**:
```javascript
async initializeAudioCapture() {
  try {
    this.onStatusChange('Initializing audio capture...');
    
    // Step 1: Request tab audio capture
    const stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture(
        { audio: true, video: false },
        (capturedStream) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(capturedStream);
          }
        }
      );
    });
    
    this.mediaStream = stream;
    
    // Step 2: Create audio context
    this.audioContext = new AudioContext({ 
      sampleRate: this.sampleRate 
    });
    
    // Step 3: Create media stream source
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Step 4: Create script processor for audio chunks
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    // Step 5: Connect audio nodes
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    this.onStatusChange('Audio capture initialized');
    return true;
    
  } catch (error) {
    this.onError('Audio capture failed: ' + error.message);
    return false;
  }
}
```

**Error Handling**:
- Chrome runtime errors (permission denied)
- AudioContext creation failures
- MediaStream connection issues

---

### 2. startStreaming()

**Purpose**: Begin streaming audio to Google Cloud Speech-to-Text

**Implementation**:
```javascript
async startStreaming() {
  if (this.isStreaming) {
    console.warn('[TranscriptionAgent] Already streaming');
    return;
  }

  try {
    this.onStatusChange('Starting real-time transcription...');
    this.isStreaming = true;

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
    
  } catch (error) {
    this.onError('Streaming failed: ' + error.message);
    this.stopStreaming();
  }
}
```

---

### 3. initializeWebSocket()

**Purpose**: Set up WebSocket connection to Google Cloud Speech-to-Text streaming API

**Implementation**:
```javascript
async initializeWebSocket() {
  const url = `wss://speech.googleapis.com/v1/speech:streamingRecognize?key=${this.apiKey}`;
  
  this.websocket = new WebSocket(url);

  // Handle connection open
  this.websocket.onopen = () => {
    console.log('[TranscriptionAgent] WebSocket connected');
    
    // Send initial configuration
    const config = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: this.sampleRate,
        languageCode: this.language,
        enableAutomaticPunctuation: true,
        interimResults: true,
        model: 'medical_conversation' // Optimized for medical terminology
      }
    };
    
    this.websocket.send(JSON.stringify(config));
  };

  // Handle incoming messages
  this.websocket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    this.handleTranscriptionResponse(response);
  };

  // Handle errors
  this.websocket.onerror = (error) => {
    this.onError('WebSocket error: ' + error);
  };

  // Handle connection close
  this.websocket.onclose = () => {
    console.log('[TranscriptionAgent] WebSocket closed');
    
    // Attempt to reconnect if still streaming
    if (this.isStreaming) {
      console.log('[TranscriptionAgent] Attempting to reconnect...');
      setTimeout(() => this.initializeWebSocket(), 1000);
    }
  };
}
```

**Configuration Details**:
- **Encoding**: LINEAR16 (16-bit PCM)
- **Sample Rate**: 16000 Hz (required for LINEAR16)
- **Language**: Configurable (default: en-US)
- **Model**: medical_conversation (optimized for medical terminology)
- **Interim Results**: true (show partial transcriptions)
- **Automatic Punctuation**: true (add periods, commas, etc.)

---

### 4. handleTranscriptionResponse()

**Purpose**: Process transcription results from Google Cloud API

**Implementation**:
```javascript
handleTranscriptionResponse(response) {
  // Check if response has results
  if (!response.results || response.results.length === 0) {
    return;
  }

  const result = response.results[0];
  const transcript = result.alternatives[0].transcript;
  const isFinal = result.isFinal || false;
  const confidence = result.alternatives[0].confidence || 0;

  // Create transcription data package
  const transcriptionData = {
    text: transcript,
    isFinal: isFinal,
    confidence: confidence,
    timestamp: Date.now(),
    language: this.language
  };

  // Log for debugging
  console.log(
    `[TranscriptionAgent] ${isFinal ? 'FINAL' : 'INTERIM'}: "${transcript}" (${Math.round(confidence * 100)}%)`
  );

  // Pass to orchestrator (which routes to Agent 2 & Agent 3)
  this.onTranscriptionReceived(transcriptionData);
}
```

**Output Format**:
```javascript
{
  text: string,           // Transcribed text
  isFinal: boolean,       // true = final result, false = interim
  confidence: number,     // 0.0 to 1.0
  timestamp: number,      // Unix timestamp (ms)
  language: string        // Language code (e.g., 'en-US')
}
```

---

### 5. sendAudioChunk()

**Purpose**: Send audio data to Google Cloud via WebSocket

**Implementation**:
```javascript
sendAudioChunk(audioData) {
  if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
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
    this.onError('Failed to send audio chunk: ' + error.message);
  }
}
```

---

### 6. stopStreaming()

**Purpose**: Clean up all resources and stop audio capture

**Implementation**:
```javascript
stopStreaming() {
  console.log('[TranscriptionAgent] Stopping streaming...');
  
  this.isStreaming = false;
  
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
  
  // Clear buffer
  this.buffer = [];
  
  this.onStatusChange('Streaming stopped');
  console.log('[TranscriptionAgent] Cleanup complete');
}
```

---

## Utility Methods

### convertFloat32ToInt16()

**Purpose**: Convert Float32Array (Web Audio API format) to Int16Array (Google Cloud format)

**Implementation**:
```javascript
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
```

### arrayBufferToBase64()

**Purpose**: Convert ArrayBuffer to base64 string for API transmission

**Implementation**:
```javascript
arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}
```

---

## Error Handling

### Error Types to Handle

1. **Permission Errors**
   - User denies microphone/tab capture permission
   - Solution: Show user-friendly message, guide to settings

2. **API Errors**
   - Invalid API key
   - Rate limiting
   - Network timeouts
   - Solution: Retry with exponential backoff, show error message

3. **Audio Processing Errors**
   - AudioContext creation fails
   - MediaStream unavailable
   - Solution: Fallback to REST API, show troubleshooting tips

4. **WebSocket Errors**
   - Connection lost
   - Timeout
   - Solution: Auto-reconnect with retry limit

### Error Handling Pattern

```javascript
try {
  // Operation
} catch (error) {
  console.error('[TranscriptionAgent]', error);
  this.onError({
    source: 'TranscriptionAgent',
    message: error.message,
    timestamp: Date.now(),
    recovery: 'suggested recovery action'
  });
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Audio Buffering**: Use 4096 sample buffer size for balance between latency and efficiency
2. **WebSocket Keep-Alive**: Send periodic pings to maintain connection
3. **Memory Management**: Clear buffers regularly, limit buffer size
4. **Throttling**: Limit audio chunk send rate if needed
5. **Early Termination**: Stop immediately when call ends

### Performance Metrics

- **Latency**: Aim for < 500ms from speech to transcription
- **Accuracy**: > 90% with medical_conversation model
- **Resource Usage**: < 50MB memory, < 10% CPU
- **Network**: ~ 12-15 kbps audio stream

---

## Testing Requirements

### Unit Tests

```javascript
describe('TranscriptionAgent', () => {
  test('initializes with valid config', () => {});
  test('handles missing API key', () => {});
  test('captures audio from Chrome tab', () => {});
  test('converts Float32 to Int16 correctly', () => {});
  test('handles WebSocket connection', () => {});
  test('processes transcription responses', () => {});
  test('cleans up resources on stop', () => {});
  test('handles API errors gracefully', () => {});
  test('reconnects on connection loss', () => {});
});
```

### Integration Tests

- Test with real Chrome tab audio
- Test with Google Cloud API (using test account)
- Test network failure scenarios
- Test long-duration streaming (30+ minutes)

---

## API Reference

### Google Cloud Speech-to-Text Streaming

**Endpoint**: `wss://speech.googleapis.com/v1/speech:streamingRecognize`

**Configuration Message**:
```json
{
  "config": {
    "encoding": "LINEAR16",
    "sampleRateHertz": 16000,
    "languageCode": "en-US",
    "enableAutomaticPunctuation": true,
    "interimResults": true,
    "model": "medical_conversation"
  }
}
```

**Audio Message**:
```json
{
  "audio_content": "base64_encoded_audio_data"
}
```

**Response Format**:
```json
{
  "results": [
    {
      "alternatives": [
        {
          "transcript": "the patient has hypertension",
          "confidence": 0.95
        }
      ],
      "isFinal": true
    }
  ]
}
```

---

## Dependencies

### Chrome APIs
- `chrome.tabCapture` - Audio capture from tabs
- `chrome.runtime` - Extension messaging

### Web APIs
- `AudioContext` - Web Audio API
- `WebSocket` - Streaming connection
- `MediaStream` - Audio stream handling

### External APIs
- Google Cloud Speech-to-Text API v1

---

## Export Pattern

```javascript
// Export for use in extension
export default TranscriptionAgent;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptionAgent;
}
```

---

## Usage Example

```javascript
import TranscriptionAgent from './transcriptionAgent.js';

// Create agent
const agent = new TranscriptionAgent({
  apiKey: 'YOUR_GOOGLE_CLOUD_API_KEY',
  language: 'en-US',
  
  onTranscriptionReceived: (data) => {
    console.log('Transcription:', data.text);
    // Pass to other agents
  },
  
  onError: (error) => {
    console.error('Error:', error);
  },
  
  onStatusChange: (status) => {
    console.log('Status:', status);
  }
});

// Start capturing and transcribing
await agent.initializeAudioCapture();
await agent.startStreaming();

// Stop when done
agent.stopStreaming();
```

---

## GitHub Copilot Implementation Prompt

**Use this prompt in GitHub Copilot Chat:**

```
Create agents/transcriptionAgent.js for the Medical Interpreter Chrome Extension.

This is Agent 1 of a 3-agent system that captures live audio from Chrome tabs and transcribes it using Google Cloud Speech-to-Text API.

Requirements:
[Paste the entire specification above]

Technical constraints:
- ES6 class syntax with export default
- Chrome Manifest V3 compatible
- WebSocket streaming for real-time transcription
- Handle audio format conversion (Float32 → Int16)
- Automatic reconnection on connection loss
- Comprehensive error handling
- JSDoc comments for all methods
- No localStorage usage

Generate the complete implementation with all methods specified above.
```
