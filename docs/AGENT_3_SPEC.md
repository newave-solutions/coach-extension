# Agent 3: Performance Evaluation Agent - Complete Specification

## Overview
Agent 3 analyzes interpreter performance in real-time based on NCIHC (National Council on Interpretation in Health Care) standards. It detects fluency issues, grammar errors, professional conduct violations, and generates comprehensive post-call reports with actionable feedback.

---

## Purpose & Responsibilities

### Primary Functions
1. **Real-Time Analysis**: Evaluate each transcription for quality issues
2. **NCIHC Standards Compliance**: Check adherence to professional standards
3. **Metrics Collection**: Track performance across multiple categories
4. **AI-Powered Insights**: Use Anthropic Claude for deep analysis
5. **Report Generation**: Create comprehensive post-call performance reports

### Key Characteristics
- **Non-Intrusive**: Runs silently in background
- **Deferred Feedback**: Stores suggestions until call ends
- **Evidence-Based**: Captures exact context for every issue
- **Weighted Scoring**: Based on NCIHC importance levels

---

## Class Structure

```javascript
class PerformanceEvaluationAgent {
  constructor(config)
  start()
  async stop()
  async processTranscription(transcriptionData)
  async analyzeFluency(text, timestamp)
  async analyzeGrammar(text, timestamp)
  async analyzeSentenceStructure(text, timestamp)
  async analyzeProfessionalConduct(text, timestamp)
  async analyzeCompleteness(text, timestamp)
  async runDeepAIAnalysis()
  detectFalseStarts(text)
  detectStutters(text)
  detectFillerWords(text)
  detectUnnaturalPauses(text)
  detect[continued...]
  async generateFinalReport()
  calculateFinalScores()
  adjustScore(category, adjustment)
  reset()
}
```

---

## Constructor & Metrics Structure

```javascript
constructor(config = {}) {
  this.anthropicApiKey = config.anthropicApiKey;
  this.isAnalyzing = false;
  this.sessionStartTime = null;
  
  // Performance metrics storage
  this.metrics = {
    // Basic metrics
    totalWords: 0,
    totalTime: 0,
    averageWPM: 0,
    targetWPM: 90,
    
    // NCIHC categories (each has score 0-100)
    accuracy: {
      score: 100,
      issues: [],
      omissions: [],
      additions: [],
      substitutions: []
    },
    
    fluency: {
      score: 100,
      falseStarts: [],      // "The patient- I mean..."
      stutters: [],         // "I-I-I think"
      fillerWords: [],      // um, uh, like
      unnaturalPauses: [],
      hesitations: []
    },
    
    grammar: {
      score: 100,
      errors: [],
      subjectVerbAgreement: [],  // "they was"
      tenseErrors: [],            // inconsistent tenses
      pronounErrors: [],          // "me and him went"
      articleErrors: []           // a/an/the mistakes
    },
    
    sentenceStructure: {
      score: 100,
      fragmentedSentences: [],    // Incomplete sentences
      runOnSentences: [],         // Too long/complex
      awkwardPhrasing: [],        // "could of"
      wordOrder: []               // Unnatural syntax
    },
    
    professionalConduct: {
      score: 100,
      toneIssues: [],
      firstPersonViolations: [],  // Using "he says" instead of "I"
      editorialComments: [],      // Personal opinions
      advocacyViolations: []
    },
    
    culturalCompetency: {
      score: 100,
      culturalAdaptations: [],
      registerShifts: [],
      idiomHandling: []
    },
    
    completeness: {
      score: 100,
      messageUnits: 0,
      interpretedUnits: 0,
      completionRate: 100
    },
    
    // Advanced AI-detected patterns
    consistency: {
      terminologyConsistency: 100,
      styleConsistency: 100,
      inconsistencies: []
    },
    
    cognitiveLoad: {
      complexityScore: 0,
      multitaskingInstances: [],
      memoryLapses: []
    }
  };
  
  // Filler words dictionary
  this.fillerWords = {
    en: ['um', 'uh', 'like', 'you know', 'actually', 'basically', 
         'literally', 'kind of', 'sort of', 'i mean', 'well', 'so', 'right'],
    es: ['eh', 'este', 'pues', 'bueno', 'o sea', 'como', 'verdad', 'entonces']
  };
  
  // Transcript buffer
  this.transcriptBuffer = [];
  this.contextWindow = 10;
  
  // Suggestions queue
  this.suggestions = [];
  
  // Callbacks
  this.onMetricsUpdate = config.onMetricsUpdate || (() => {});
  this.onSuggestionGenerated = config.onSuggestionGenerated || (() => {});
  this.onError = config.onError || console.error;
}
```

---

## Core Methods

### 1. start() & stop()

```javascript
start() {
  this.isAnalyzing = true;
  this.sessionStartTime = Date.now();
  this.resetMetrics();
  console.log('[Performance Agent] Started monitoring');
}

async stop() {
  this.isAnalyzing = false;
  this.metrics.totalTime = (Date.now() - this.sessionStartTime) / 1000;
  
  this.calculateFinalScores();
  const report = await this.generateFinalReport();
  
  console.log('[Performance Agent] Session complete');
  return report;
}
```

### 2. processTranscription()

```javascript
async processTranscription(transcriptionData) {
  if (!this.isAnalyzing) return;
  
  const { text, isFinal, timestamp, speaker } = transcriptionData;
  
  // Only analyze interpreter's speech
  if (!isFinal || speaker !== 'interpreter') {
    return;
  }
  
  // Add to buffer
  this.transcriptBuffer.push({
    text,
    timestamp,
    wordCount: this.countWords(text)
  });
  
  // Update metrics
  this.metrics.totalWords += this.countWords(text);
  this.updateWPM();
  
  // Run analysis passes (all async, parallel)
  await Promise.all([
    this.analyzeFluency(text, timestamp),
    this.analyzeGrammar(text, timestamp),
    this.analyzeSentenceStructure(text, timestamp),
    this.analyzeProfessionalConduct(text, timestamp),
    this.analyzeCompleteness(text, timestamp)
  ]);
  
  // Periodic AI analysis (every 10 utterances)
  if (this.transcriptBuffer.length % 10 === 0) {
    await this.runDeepAIAnalysis();
  }
  
  // Trim buffer
  if (this.transcriptBuffer.length > this.contextWindow) {
    this.transcriptBuffer.shift();
  }
  
  // Update frontend (throttled externally)
  this.onMetricsUpdate(this.metrics);
}
```

---

## Fluency Analysis

### detectFalseStarts()

```javascript
detectFalseStarts(text) {
  const patterns = [
    /\b(\w+)\s*-\s*(?:I mean|sorry|actually)\s*,?\s*\1/gi,
    /\b(\w+(?:\s+\w+)?)\s*-\s*(\w+)/gi
  ];
  
  const falseStarts = [];
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) falseStarts.push(...matches);
  });
  
  return falseStarts;
}
```

### detectStutters()

```javascript
detectStutters(text) {
  const stutterPattern = /\b(\w+)-\1(?:-\1)*/gi;
  return text.match(stutterPattern) || [];
}
```

### detectFillerWords()

```javascript
detectFillerWords(text) {
  const lowerText = text.toLowerCase();
  const fillers = [];
  
  Object.values(this.fillerWords).flat().forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      fillers.push({
        word: filler,
        count: matches.length
      });
    }
  });
  
  return fillers;
}
```

---

## Grammar Analysis

### detectSubjectVerbAgreement()

```javascript
detectSubjectVerbAgreement(text) {
  const errors = [];
  
  const patterns = [
    { pattern: /\b(he|she|it)\s+don't\b/gi, correct: "doesn't" },
    { pattern: /\b(they|we)\s+was\b/gi, correct: 'were' },
    { pattern: /\b(he|she|it)\s+were\b/gi, correct: 'was' },
    { pattern: /\b(I|you|we|they)\s+is\b/gi, correct: 'are/am' }
  ];
  
  patterns.forEach(({ pattern, correct }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        errors.push({
          error: match,
          correction: correct,
          type: 'subject-verb agreement'
        });
      });
    }
  });
  
  return errors;
}
```

### detectTenseErrors()

```javascript
detectTenseErrors(text) {
  const errors = [];
  const tenseShiftPattern = /\b(had|has|have)\s+\w+ed\s+and\s+\w+s\b/gi;
  const matches = text.match(tenseShiftPattern);
  
  if (matches) {
    matches.forEach(match => {
      errors.push({
        error: match,
        type: 'tense inconsistency',
        suggestion: 'Maintain consistent tense'
      });
    });
  }
  
  return errors;
}
```

---

## Professional Conduct Analysis (NCIHC Critical)

### detectFirstPersonViolations()

```javascript
detectFirstPersonViolations(text) {
  const violations = [];
  const patterns = [
    /\b(?:he|she|the patient|the doctor)\s+(?:says|said|is saying|wants to know)\b/gi,
    /\bI'm interpreting that\b/gi,
    /\bthe patient is asking\b/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) violations.push(...matches);
  });
  
  return violations;
}
```

**NCIHC Standard**: Interpreters must use first person ("I want" not "The doctor says she wants")

### detectEditorialComments()

```javascript
detectEditorialComments(text) {
  const editorialPatterns = [
    /\bI think\b/gi,
    /\bin my opinion\b/gi,
    /\byou should\b/gi,
    /\bif I were you\b/gi,
    /\bthat's good\/bad\b/gi
  ];
  
  const comments = [];
  editorialPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) comments.push(...matches);
  });
  
  return comments;
}
```

---

## Sentence Structure Analysis

### detectFragments()

```javascript
detectFragments(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const fragments = sentences.filter(s => {
    const words = s.trim().split(/\s+/);
    return words.length < 3 || !this.hasVerb(s);
  });
  return fragments;
}

hasVerb(sentence) {
  const commonVerbs = /\b(is|are|was|were|be|been|has|have|had|do|does|did|can|could|will|would|should|may|might)\b/i;
  return commonVerbs.test(sentence);
}
```

### detectRunOnSentences()

```javascript
detectRunOnSentences(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  return sentences.filter(s => {
    const words = s.split(/\s+/);
    const multipleClause = (s.match(/,\s*(?:and|but|or|so)\s+/g) || []).length > 2;
    return words.length > 30 || multipleClause;
  });
}
```

---

## Deep AI Analysis (Anthropic Claude)

```javascript
async runDeepAIAnalysis() {
  if (!this.anthropicApiKey) return;
  
  try {
    const recentTranscript = this.transcriptBuffer
      .slice(-10)
      .map(t => t.text)
      .join('\n');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze this medical interpretation for:
1. Terminology consistency
2. Style consistency
3. Cultural adaptation
4. Register appropriateness
5. Subtle accuracy issues
6. Cognitive load indicators

Transcript:
${recentTranscript}

Provide JSON with scores and examples.`
        }]
      })
    });
    
    const data = await response.json();
    const analysis = this.parseAIResponse(data.content[0].text);
    
    // Update metrics
    if (analysis.terminologyConsistency) {
      this.metrics.consistency.terminologyConsistency = analysis.terminologyConsistency;
    }
    
  } catch (error) {
    this.onError('AI analysis error: ' + error.message);
  }
}
```

---

## Scoring System

### Score Adjustments

```javascript
adjustScore(category, adjustment) {
  this.metrics[category].score = Math.max(0, Math.min(100, 
    this.metrics[category].score + adjustment
  ));
}
```

### Severity Levels

- **False Starts**: -2 points each
- **Stutters**: -1 point each  
- **Filler Words**: -0.5 points each
- **Grammar Errors**: -2 to -3 points each
- **First Person Violations**: -5 points each
- **Editorial Comments**: -10 points each (critical)

### Final Score Calculation

```javascript
calculateFinalScores() {
  const weights = {
    accuracy: 0.30,
    professionalConduct: 0.25,
    fluency: 0.15,
    grammar: 0.10,
    sentenceStructure: 0.10,
    culturalCompetency: 0.10
  };
  
  let overallScore = 0;
  Object.entries(weights).forEach(([category, weight]) => {
    overallScore += this.metrics[category].score * weight;
  });
  
  this.metrics.overallScore = Math.round(overallScore);
}
```

---

## Report Generation

```javascript
async generateFinalReport() {
  return {
    metadata: {
      sessionDuration: this.metrics.totalTime,
      totalWords: this.metrics.totalWords,
      averageWPM: this.metrics.averageWPM,
      targetWPM: this.metrics.targetWPM,
      timestamp: new Date().toISOString()
    },
    
    overallScore: this.metrics.overallScore,
    
    categoryScores: {
      accuracy: this.metrics.accuracy.score,
      fluency: this.metrics.fluency.score,
      grammar: this.metrics.grammar.score,
      sentenceStructure: this.metrics.sentenceStructure.score,
      professionalConduct: this.metrics.professionalConduct.score,
      culturalCompetency: this.metrics.culturalCompetency.score
    },
    
    detailedFindings: this.metrics,
    topSuggestions: await this.generateTopSuggestions(),
    strengths: this.identifyStrengths(),
    areasForImprovement: this.identifyImprovementAreas(),
    ncihcCompliance: this.assessNCIHCCompliance()
  };
}
```

---

## Testing Requirements

```javascript
describe('PerformanceEvaluationAgent', () => {
  test('detects false starts', () => {});
  test('detects stutters', () => {});
  test('counts filler words', () => {});
  test('detects grammar errors', () => {});
  test('detects first-person violations', () => {});
  test('calculates WPM correctly', () => {});
  test('applies score adjustments', () => {});
  test('generates final report', () => {});
  test('handles AI analysis failure', () => {});
});
```

---

## GitHub Copilot Prompt

```
Create agents/performanceEvaluationAgent.js for Medical Interpreter Chrome Extension.

This is Agent 3: real-time performance evaluation based on NCIHC standards.

[Paste full specification]

Generate complete implementation with all detection methods, scoring, and AI integration.
```
