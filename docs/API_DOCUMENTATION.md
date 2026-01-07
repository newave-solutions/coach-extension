# API Documentation

Complete API reference for all components of the Medical Interpreter Co-Pilot extension.

---

## Table of Contents

1. [Agent 1: Transcription Agent API](#agent-1-transcription-agent)
2. [Agent 2: Medical Terminology Agent API](#agent-2-medical-terminology-agent)
3. [Agent 3: Performance Evaluation Agent API](#agent-3-performance-evaluation-agent)
4. [Agent Orchestrator API](#agent-orchestrator)
5. [Message Protocol](#message-protocol)
6. [Chrome Storage Schema](#chrome-storage-schema)
7. [Configuration API](#configuration-api)

---

## Agent 1: Transcription Agent

### Constructor

```javascript
new TranscriptionAgent(config)
```

**Parameters**:
- `config.apiKey` (string, required): Google Cloud API key
- `config.language` (string, optional): Source language code (default: 'en-US')
- `config.onTranscriptionReceived` (function, required): Callback for transcription data
- `config.onError` (function, optional): Error handler
- `config.onStatusChange` (function, optional): Status update handler

**Example**:
```javascript
const agent = new TranscriptionAgent({
  apiKey: 'YOUR_API_KEY',
  language: 'en-US',
  onTranscriptionReceived: (data) => console.log(data),
  onError: (error) => console.error(error),
  onStatusChange: (status) => console.log(status)
});
```

### Methods

#### initializeAudioCapture()

Initialize audio capture from Chrome tab.

```javascript
async initializeAudioCapture(): Promise<boolean>
```

**Returns**: `true` if successful, `false` otherwise

**Example**:
```javascript
const success = await agent.initializeAudioCapture();
if (success) {
  console.log('Audio capture ready');
}
```

#### startStreaming()

Start streaming audio to Google Cloud Speech-to-Text.

```javascript
async startStreaming(): Promise<void>
```

**Example**:
```javascript
await agent.startStreaming();
```

#### stopStreaming()

Stop streaming and clean up resources.

```javascript
stopStreaming(): void
```

**Example**:
```javascript
agent.stopStreaming();
```

### Callbacks

#### onTranscriptionReceived(data)

Called when transcription data is received.

**Parameters**:
```javascript
{
  text: string,           // Transcribed text
  isFinal: boolean,       // true = final result
  confidence: number,     // 0.0 to 1.0
  timestamp: number,      // Unix ms
  language: string        // Language code
}
```

---

## Agent 2: Medical Terminology Agent

### Constructor

```javascript
new MedicalTerminologyAgent(config)
```

**Parameters**:
- `config.targetLanguage` (string, optional): Target language (default: 'es')
- `config.translationApiKey` (string, required): Google Translate API key
- `config.onTermDetected` (function, required): Callback for detected terms
- `config.onError` (function, optional): Error handler

**Example**:
```javascript
const agent = new MedicalTerminologyAgent({
  targetLanguage: 'es',
  translationApiKey: 'YOUR_API_KEY',
  onTermDetected: (termData) => console.log(termData),
  onError: (error) => console.error(error)
});
```

### Methods

#### processTranscription(transcriptionData)

Process transcription text for medical terminology.

```javascript
async processTranscription(transcriptionData): Promise<void>
```

**Parameters**:
```javascript
{
  text: string,
  isFinal: boolean,
  timestamp: number
}
```

**Example**:
```javascript
await agent.processTranscription({
  text: 'The patient has hypertension',
  isFinal: true,
  timestamp: Date.now()
});
```

#### detectMedicalTerms(text)

Detect medical terms in text.

```javascript
detectMedicalTerms(text: string): string[]
```

**Returns**: Array of detected medical terms

**Example**:
```javascript
const terms = agent.detectMedicalTerms('Patient has diabetes and asthma');
// Returns: ['diabetes', 'asthma']
```

#### reset()

Clear all caches and processed terms.

```javascript
reset(): void
```

### Callbacks

#### onTermDetected(termData)

Called when a medical term is detected and processed.

**Parameters**:
```javascript
{
  original: string,         // Original English term
  translation: string,      // Translated term
  phonetics: string,        // Pronunciation guide
  definition: string,       // Medical definition
  context: string,          // Sentence context
  timestamp: number,        // When detected
  isFinal: boolean         // From transcription
}
```

---

## Agent 3: Performance Evaluation Agent

### Constructor

```javascript
new PerformanceEvaluationAgent(config)
```

**Parameters**:
- `config.anthropicApiKey` (string, optional): Anthropic API key for deep analysis
- `config.onMetricsUpdate` (function, optional): Callback for metrics updates
- `config.onSuggestionGenerated` (function, optional): Callback for suggestions
- `config.onError` (function, optional): Error handler

**Example**:
```javascript
const agent = new PerformanceEvaluationAgent({
  anthropicApiKey: 'YOUR_API_KEY',
  onMetricsUpdate: (metrics) => console.log(metrics),
  onSuggestionGenerated: (suggestion) => console.log(suggestion),
  onError: (error) => console.error(error)
});
```

### Methods

#### start()

Start performance monitoring session.

```javascript
start(): void
```

#### stop()

Stop monitoring and generate final report.

```javascript
async stop(): Promise<PerformanceReport>
```

**Returns**: Comprehensive performance report object

**Example**:
```javascript
const report = await agent.stop();
console.log('Overall Score:', report.overallScore);
console.log('Category Scores:', report.categoryScores);
```

#### processTranscription(transcriptionData)

Analyze transcription for performance issues.

```javascript
async processTranscription(transcriptionData): Promise<void>
```

**Parameters**:
```javascript
{
  text: string,
  isFinal: boolean,
  timestamp: number,
  speaker?: string
}
```

#### reset()

Reset all metrics to initial state.

```javascript
reset(): void
```

### Callbacks

#### onMetricsUpdate(metrics)

Called periodically with updated metrics (throttled).

**Parameters**:
```javascript
{
  totalWords: number,
  totalTime: number,
  averageWPM: number,
  targetWPM: number,
  
  accuracy: { score: number, issues: [...] },
  fluency: { score: number, falseStarts: [...], stutters: [...], fillerWords: [...] },
  grammar: { score: number, errors: [...] },
  sentenceStructure: { score: number, fragments: [...], runOns: [...] },
  professionalConduct: { score: number, firstPersonViolations: [...], editorialComments: [...] },
  culturalCompetency: { score: number, culturalAdaptations: [...] },
  completeness: { score: number, completionRate: number },
  consistency: { terminologyConsistency: number, styleConsistency: number },
  cognitiveLoad: { complexityScore: number }
}
```

#### onSuggestionGenerated(suggestion)

Called when a performance suggestion is generated.

**Parameters**:
```javascript
{
  priority: 'critical' | 'high' | 'medium' | 'low',
  category: string,
  issue: string,
  recommendations: string[]
}
```

### Performance Report Format

```javascript
{
  metadata: {
    sessionDuration: number,    // seconds
    totalWords: number,
    averageWPM: number,
    targetWPM: number,
    timestamp: string          // ISO 8601
  },
  
  overallScore: number,        // 0-100
  
  categoryScores: {
    accuracy: number,
    fluency: number,
    grammar: number,
    sentenceStructure: number,
    professionalConduct: number,
    culturalCompetency: number
  },
  
  detailedFindings: {
    // Complete metrics object with all detected issues
  },
  
  topSuggestions: [
    {
      priority: string,
      category: string,
      issue: string,
      recommendations: string[]
    }
  ],
  
  strengths: [
    {
      category: string,
      score: number,
      comment: string
    }
  ],
  
  areasForImprovement: [
    {
      category: string,
      score: number,
      issueCount: number,
      priority: string
    }
  ],
  
  ncihcCompliance: {
    accuracy: 'compliant' | 'needs improvement',
    impartiality: 'compliant' | 'non-compliant',
    completeness: 'compliant' | 'needs improvement',
    culturalSensitivity: 'compliant' | 'needs improvement'
  }
}
```

---

## Agent Orchestrator

### Constructor

```javascript
new AgentOrchestrator(config)
```

**Parameters**:
```javascript
{
  googleCloudApiKey: string,
  anthropicApiKey: string,
  targetLanguage: string,
  sourceLanguage: string
}
```

### Methods

#### start()

Initialize and start all agents.

```javascript
async start(): Promise<void>
```

**Example**:
```javascript
await orchestrator.start();
```

#### stop()

Stop all agents and get final report.

```javascript
async stop(): Promise<PerformanceReport>
```

**Returns**: Performance report from Agent 3

**Example**:
```javascript
const report = await orchestrator.stop();
```

#### getSessionMetrics()

Get current session metrics.

```javascript
getSessionMetrics(): object
```

**Returns**:
```javascript
{
  sessionId: string,
  isRunning: boolean,
  transcriptionAgent: { isStreaming: boolean },
  performanceMetrics: object,
  metricsHistory: array
}
```

---

## Message Protocol

### From UI to Background

#### START_AGENTS

```javascript
{
  action: 'START_AGENTS',
  config: {
    googleCloudApiKey: string,
    anthropicApiKey: string,
    targetLanguage: string,
    sourceLanguage: string
  }
}
```

#### STOP_AGENTS

```javascript
{
  action: 'STOP_AGENTS'
}
```

#### GET_STATUS

```javascript
{
  action: 'GET_STATUS'
}
```

**Response**:
```javascript
{
  isRunning: boolean,
  sessionMetrics: object | null
}
```

### From Background to UI

#### AGENT_OUTPUT

##### Transcription Update

```javascript
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
```

##### Medical Term Detected

```javascript
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
```

##### Metrics Update

```javascript
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'METRICS_UPDATE',
    data: {
      metrics: object,
      isLive: boolean
    }
  }
}
```

##### Session Complete

```javascript
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'SESSION_COMPLETE',
    sessionId: string,
    performanceReport: object,
    timestamp: number
  }
}
```

##### Error

```javascript
{
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'ERROR',
    source: string,
    message: string,
    recoverable: boolean
  }
}
```

---

## Chrome Storage Schema

### chrome.storage.sync (Encrypted, Synced)

```javascript
{
  // API Keys
  googleCloudApiKey: string,
  anthropicApiKey: string,
  
  // User Preferences
  targetLanguage: string,        // e.g., 'es', 'fr', 'zh'
  sourceLanguage: string,        // e.g., 'en-US'
  
  // UI Preferences
  userPreferences: {
    theme: 'light' | 'dark',
    overlayPosition: 'left' | 'right',
    metricsUpdateInterval: number
  }
}
```

### chrome.storage.local (Not Synced)

```javascript
{
  // Session History (last 50 sessions)
  sessionHistory: [
    {
      sessionId: string,
      timestamp: string,
      duration: number,
      overallScore: number
    }
  ],
  
  // Performance Reports
  performanceReports: {
    [sessionId]: {
      metadata: object,
      report: object
    }
  },
  
  // Medical Terms Cache
  medicalTermsCache: {
    [term_language]: {
      translation: string,
      phonetics: string,
      definition: string,
      cachedAt: number
    }
  }
}
```

---

## Configuration API

### Import

```javascript
import { CONFIG, getConfig, loadApiKeys, saveApiKeys, loadPreferences, savePreferences } from './config/config.js';
```

### getConfig(path, defaultValue)

Get configuration value by dot notation path.

```javascript
getConfig(path: string, defaultValue: any): any
```

**Example**:
```javascript
const wpmTarget = getConfig('agents.performanceEvaluation.wpmTarget', 90);
// Returns: 90
```

### loadApiKeys()

Load API keys from Chrome storage.

```javascript
async loadApiKeys(): Promise<{
  googleCloud: string,
  anthropic: string
}>
```

**Example**:
```javascript
const keys = await loadApiKeys();
console.log('Google Cloud Key:', keys.googleCloud);
```

### saveApiKeys(keys)

Save API keys to Chrome storage.

```javascript
async saveApiKeys(keys: {
  googleCloud: string,
  anthropic: string
}): Promise<boolean>
```

**Example**:
```javascript
await saveApiKeys({
  googleCloud: 'YOUR_KEY',
  anthropic: 'YOUR_KEY'
});
```

### loadPreferences()

Load user preferences from Chrome storage.

```javascript
async loadPreferences(): Promise<{
  targetLanguage: string,
  sourceLanguage: string,
  preferences: object
}>
```

### savePreferences(preferences)

Save user preferences to Chrome storage.

```javascript
async savePreferences(preferences: object): Promise<boolean>
```

**Example**:
```javascript
await savePreferences({
  targetLanguage: 'fr',
  sourceLanguage: 'en-US'
});
```

---

## External API References

### Google Cloud Speech-to-Text API

**Endpoint**: `wss://speech.googleapis.com/v1/speech:streamingRecognize?key={API_KEY}`

**Documentation**: https://cloud.google.com/speech-to-text/docs

### Google Cloud Translation API

**Endpoint**: `https://translation.googleapis.com/language/translate/v2?key={API_KEY}`

**Documentation**: https://cloud.google.com/translate/docs

### Anthropic Claude API

**Endpoint**: `https://api.anthropic.com/v1/messages`

**Documentation**: https://docs.anthropic.com/claude/reference/messages_post

---

## Error Codes

### Agent Errors

| Code | Description | Recovery |
|------|-------------|----------|
| `AUDIO_CAPTURE_FAILED` | Failed to capture tab audio | Check permissions |
| `API_KEY_INVALID` | Invalid API key | Update in settings |
| `NETWORK_ERROR` | Network connection lost | Retry automatically |
| `RATE_LIMIT_EXCEEDED` | API rate limit hit | Wait and retry |
| `WEBSOCKET_CLOSED` | WebSocket connection closed | Reconnect automatically |

### System Errors

| Code | Description | Recovery |
|------|-------------|----------|
| `AGENT_INIT_FAILED` | Agent failed to initialize | Check configuration |
| `STORAGE_ERROR` | Chrome storage access failed | Check permissions |
| `ORCHESTRATOR_ERROR` | Orchestrator coordination failed | Restart system |

---

## Rate Limits

### Google Cloud Speech-to-Text
- **Streaming**: 10,000 requests/day (free tier)
- **Data**: 60 minutes/month (free tier)

### Google Cloud Translation
- **Requests**: 500,000 characters/month (free tier)
- **Rate**: 1000 requests/100 seconds

### Anthropic Claude
- **Tokens**: Varies by plan
- **Rate**: 40 requests/minute (tier 1)

---

## Type Definitions (TypeScript-style)

```typescript
// Transcription Data
interface TranscriptionData {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
  language: string;
}

// Medical Term Data
interface MedicalTermData {
  original: string;
  translation: string;
  phonetics: string;
  definition: string;
  context: string;
  timestamp: number;
  isFinal: boolean;
}

// Performance Metrics
interface PerformanceMetrics {
  totalWords: number;
  totalTime: number;
  averageWPM: number;
  targetWPM: number;
  accuracy: CategoryMetrics;
  fluency: CategoryMetrics;
  grammar: CategoryMetrics;
  sentenceStructure: CategoryMetrics;
  professionalConduct: CategoryMetrics;
  culturalCompetency: CategoryMetrics;
  completeness: CategoryMetrics;
  consistency: object;
  cognitiveLoad: object;
}

interface CategoryMetrics {
  score: number;
  issues: Issue[];
}

interface Issue {
  text: string;
  context: string;
  timestamp: number;
  suggestion: string;
}
```

---

This API documentation provides complete reference for all public interfaces in the extension. Use it when implementing or integrating components.
