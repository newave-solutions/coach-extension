# Complete System Integration Guide

## System Overview

The Medical Interpreter Co-Pilot consists of 3 agents coordinated by an orchestrator, with a multi-panel UI overlay. This guide explains how all components connect and communicate.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Background Service Worker                     │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │         Agent Orchestrator                       │  │  │
│  │  │  • Initializes all 3 agents                      │  │  │
│  │  │  • Routes data between agents                    │  │  │
│  │  │  • Manages lifecycle                             │  │  │
│  │  └────────┬─────────────┬────────────┬──────────────┘  │  │
│  │           │             │            │                  │  │
│  │     ┌─────▼──────┐ ┌───▼────────┐ ┌▼────────────┐    │  │
│  │     │  Agent 1   │ │  Agent 2   │ │  Agent 3    │    │  │
│  │     │  Transcr.  │ │  Medical   │ │  Perform.   │    │  │
│  │     └─────┬──────┘ └───┬────────┘ └┬────────────┘    │  │
│  │           │             │            │                  │  │
│  └───────────┼─────────────┼────────────┼──────────────────┘  │
│              │             │            │                     │
│              └──────┬──────┴────────┬───┘                     │
│                     │               │                         │
│         chrome.runtime.sendMessage  │                         │
│                     │               │                         │
│              ┌──────▼───────────────▼────────┐                │
│              │    Message Bus                 │                │
│              └──────┬────────────────────────┘                │
│                     │                                          │
└─────────────────────┼──────────────────────────────────────────┘
                      │
          ┌───────────▼──────────────┐
          │   Content Script         │
          │   (Injects UI Overlay)   │
          └───────────┬──────────────┘
                      │
          ┌───────────▼──────────────┐
          │   Multi-Panel Overlay    │
          │   • Transcription Panel  │
          │   • Medical Terms Panel  │
          │   • Live Metrics Panel   │
          │   • Dashboard (post-call)│
          └──────────────────────────┘
```

---

## Component Integration

### 1. Agent Orchestrator

**File**: `agents/agentOrchestrator.js`

**Purpose**: Central coordinator for all three agents

**Key Methods**:
```javascript
class AgentOrchestrator {
  constructor(config)
  async start()              // Initialize and start all agents
  async stop()               // Stop agents and generate final report
  handleTranscription(data)  // Route from Agent 1 to Agents 2 & 3
  handleMedicalTerm(data)    // Route from Agent 2 to frontend
  handleMetricsUpdate(data)  // Route from Agent 3 to frontend (throttled)
  sendToFrontend(message)    // Send to UI via chrome.runtime
}
```

**Initialization Flow**:
```javascript
const orchestrator = new AgentOrchestrator({
  googleCloudApiKey: '...',
  anthropicApiKey: '...',
  targetLanguage: 'es',
  sourceLanguage: 'en-US'
});

// Creates all 3 agents internally
// Sets up callbacks for data routing
```

**Data Routing Logic**:
```javascript
handleTranscription(data) {
  // Send to frontend immediately
  this.sendToFrontend({ type: 'TRANSCRIPTION', data });
  
  // Pass to Agent 2 (async, non-blocking)
  this.medicalAgent.processTranscription(data);
  
  // Pass to Agent 3 (async, non-blocking)
  this.performanceAgent.processTranscription(data);
}
```

---

### 2. Background Service Worker

**File**: `background.js`

**Purpose**: Hosts orchestrator, handles extension lifecycle

**Structure**:
```javascript
import AgentOrchestrator from './agents/agentOrchestrator.js';

let orchestrator = null;

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'START_AGENTS':
      startAgents(message.config);
      break;
    case 'STOP_AGENTS':
      stopAgents();
      break;
    case 'GET_STATUS':
      sendResponse({ isRunning: orchestrator?.isRunning });
      break;
    case 'AGENT_OUTPUT':
      forwardToContentScripts(message);
      break;
  }
  return true; // Keep channel open for async
});

async function startAgents(config) {
  orchestrator = new AgentOrchestrator(config);
  await orchestrator.start();
}

async function stopAgents() {
  const report = await orchestrator.stop();
  // Send report to UI
}
```

---

### 3. Content Script

**File**: `content.js`

**Purpose**: Inject UI overlay into page, forward messages

**Implementation**:
```javascript
// Inject overlay iframe
function injectOverlay() {
  if (document.getElementById('coach-overlay')) return;
  
  const iframe = document.createElement('iframe');
  iframe.id = 'coach-overlay';
  iframe.src = chrome.runtime.getURL('ui/overlay.html');
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    border: none;
    z-index: 999999;
  `;
  
  document.body.appendChild(iframe);
}

// Forward messages to overlay
chrome.runtime.onMessage.addListener((message) => {
  const overlay = document.getElementById('coach-overlay');
  if (overlay && overlay.contentWindow) {
    overlay.contentWindow.postMessage(message, '*');
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOverlay);
} else {
  injectOverlay();
}
```

---

### 4. UI Overlay

**Files**: `ui/overlay.html`, `ui/overlay.js`, `ui/overlay.css`

**Message Handling**:
```javascript
// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'AGENT_OUTPUT') {
    handleAgentOutput(message.payload);
  }
});

function handleAgentOutput(payload) {
  switch (payload.type) {
    case 'TRANSCRIPTION':
      updateTranscriptionPanel(payload.data);
      break;
    case 'MEDICAL_TERM':
      updateMedicalTermsPanel(payload.data);
      break;
    case 'METRICS_UPDATE':
      updateLiveMetricsPanel(payload.data);
      break;
    case 'SESSION_COMPLETE':
      showDashboard(payload.performanceReport);
      break;
  }
}
```

---

## Message Protocol

### Message Types

#### 1. System Messages
```javascript
// Start agents
{
  action: 'START_AGENTS',
  config: {
    googleCloudApiKey: string,
    anthropicApiKey: string,
    targetLanguage: string,
    sourceLanguage: string
  }
}

// Stop agents
{
  action: 'STOP_AGENTS'
}

// Get status
{
  action: 'GET_STATUS'
}
```

#### 2. Data Messages
```javascript
// Transcription update
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'TRANSCRIPTION',
    data: {
      text: string,
      isFinal: boolean,
      confidence: number,
      timestamp: number
    }
  }
}

// Medical term detected
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'MEDICAL_TERM',
    data: {
      original: string,
      translation: string,
      phonetics: string,
      definition: string,
      context: string,
      timestamp: number
    }
  }
}

// Metrics update
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'METRICS_UPDATE',
    data: {
      metrics: {...},
      isLive: boolean
    }
  }
}

// Session complete
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'SESSION_COMPLETE',
    sessionId: string,
    performanceReport: {...}
  }
}
```

---

## Data Flow Examples

### Example 1: Transcription Flow

```
1. User starts call and clicks "Start"
   ↓
2. UI sends START_AGENTS to background
   ↓
3. Background creates orchestrator and starts Agent 1
   ↓
4. Agent 1 captures audio and sends to Google Cloud
   ↓
5. Google Cloud returns transcription
   ↓
6. Agent 1 calls onTranscriptionReceived callback
   ↓
7. Orchestrator handles transcription:
   - Sends to frontend (immediate display)
   - Passes to Agent 2 (medical terms)
   - Passes to Agent 3 (performance)
   ↓
8. Frontend receives TRANSCRIPTION message
   ↓
9. overlay.js updates transcription panel
```

### Example 2: Medical Term Flow

```
1. Agent 2 receives transcription: "The patient has hypertension"
   ↓
2. Detects term: "hypertension"
   ↓
3. Checks cache (miss)
   ↓
4. Parallel API calls:
   - Translate to Spanish
   - Get phonetics
   - Get definition
   ↓
5. Combines results and caches
   ↓
6. Calls onTermDetected callback
   ↓
7. Orchestrator forwards to frontend
   ↓
8. overlay.js displays in medical terms panel:
   - Original: "hypertension"
   - Translation: "hipertensión"
   - Phonetics: "hy-per-TEN-shun"
   - Definition: "High blood pressure"
```

### Example 3: Performance Evaluation Flow

```
1. Agent 3 receives transcription: "Um, the patient, uh, has hypertension"
   ↓
2. Analyzes text:
   - Detects 2 filler words ("um", "uh")
   - Adjusts fluency score: -1 point
   - Records context for each
   ↓
3. Updates metrics object
   ↓
4. Calls onMetricsUpdate (throttled)
   ↓
5. Orchestrator sends to frontend (max every 2s)
   ↓
6. overlay.js updates live metrics panel:
   - Fluency score: 98 → 97
   - Filler word count: 10 → 12
```

---

## Configuration Management

### Loading Configuration

```javascript
// From chrome.storage.sync
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'googleCloudApiKey',
      'anthropicApiKey',
      'targetLanguage',
      'sourceLanguage'
    ], (items) => {
      resolve({
        googleCloudApiKey: items.googleCloudApiKey || '',
        anthropicApiKey: items.anthropicApiKey || '',
        targetLanguage: items.targetLanguage || 'es',
        sourceLanguage: items.sourceLanguage || 'en-US'
      });
    });
  });
}
```

### Saving Configuration

```javascript
async function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(config, () => {
      resolve(true);
    });
  });
}
```

---

## Error Handling Strategy

### Agent-Level Errors

Each agent handles its own errors and reports via callback:

```javascript
try {
  // Agent operation
} catch (error) {
  this.onError({
    source: 'AgentName',
    message: error.message,
    timestamp: Date.now(),
    context: '...'
  });
}
```

### Orchestrator-Level Errors

Orchestrator aggregates errors and reports to frontend:

```javascript
handleError(source, error) {
  console.error(`[${source}]`, error);
  
  this.sendToFrontend({
    type: 'ERROR',
    source: source,
    message: error.toString(),
    recoverable: this.determineRecoverability(error)
  });
}
```

### UI-Level Error Display

```javascript
function showError(errorData) {
  const { source, message, recoverable } = errorData;
  
  // Display error banner
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.innerHTML = `
    <strong>${source} Error:</strong> ${message}
    ${recoverable ? '<button>Retry</button>' : ''}
  `;
  
  document.body.prepend(banner);
}
```

---

## Performance Optimization

### 1. Throttling

**Metrics Updates**:
```javascript
// In orchestrator
let lastMetricsUpdate = 0;

handleMetricsUpdate(metrics) {
  const now = Date.now();
  
  if (now - lastMetricsUpdate < 2000) {
    return; // Skip update
  }
  
  lastMetricsUpdate = now;
  this.sendToFrontend({ type: 'METRICS_UPDATE', data: metrics });
}
```

### 2. Caching

**Medical Terms**:
- Cache size: 500 terms (LRU eviction)
- Hit rate: ~60% after initial warm-up
- Reduces API calls significantly

**Processed Terms**:
- Recent terms Set (100 items)
- Prevents duplicate processing in short window

### 3. Parallel Processing

All agents run independently:
```javascript
// In orchestrator
await Promise.all([
  agent2.processTranscription(data),  // Medical terms
  agent3.processTranscription(data)   // Performance
]);
// Don't wait for completion before continuing
```

---

## Testing Integration

### Integration Test Example

```javascript
describe('Full System Integration', () => {
  let orchestrator;
  
  beforeEach(() => {
    orchestrator = new AgentOrchestrator(testConfig);
  });
  
  test('transcription flows to all components', async () => {
    const mockData = {
      text: 'The patient has hypertension',
      isFinal: true,
      timestamp: Date.now()
    };
    
    // Spy on callbacks
    const transcriptionCallback = jest.fn();
    const medicalTermCallback = jest.fn();
    const metricsCallback = jest.fn();
    
    // Should trigger all callbacks
    await orchestrator.handleTranscription(mockData);
    
    expect(transcriptionCallback).toHaveBeenCalled();
    expect(medicalTermCallback).toHaveBeenCalled();
    expect(metricsCallback).toHaveBeenCalled();
  });
});
```

---

## Deployment Checklist

- [ ] All agents implemented and tested
- [ ] Orchestrator properly routes data
- [ ] Background service worker handles lifecycle
- [ ] Content script injects UI correctly
- [ ] Message protocol fully implemented
- [ ] Error handling comprehensive
- [ ] Performance optimizations in place
- [ ] Chrome storage configured
- [ ] API keys never hardcoded
- [ ] All callbacks connected
- [ ] UI updates correctly for all message types
- [ ] Dashboard displays on session end
- [ ] Extension loads in Chrome without errors

---

## Troubleshooting

### Agent Not Starting
- Check API keys in chrome.storage
- Verify permissions in manifest.json
- Check console for initialization errors

### No Transcription Appearing
- Verify audio capture permission granted
- Check Agent 1 WebSocket connection
- Verify content script injected

### Medical Terms Not Translating
- Check Google Translate API key
- Verify network connectivity
- Check cache isn't blocking updates

### Performance Metrics Not Updating
- Verify Agent 3 is receiving transcriptions
- Check throttling isn't too aggressive
- Ensure callbacks are connected

---

This integration guide provides the complete picture of how all components work together. Use it as a reference when implementing each component.
