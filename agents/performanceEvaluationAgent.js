// ===================================================================
// Agent 3: Performance Evaluation Agent with NLP
// File: agents/performanceEvaluationAgent.js
// Based on NCIHC Standards of Practice for Healthcare Interpreters
// ===================================================================

import {
  NCIHCStandards,
  PerformanceCategories,
  interpretScore,
  checkCompliance,
  calculateOverallScore,
  generateComplianceReport,
  WPMGuidelines
} from '../utils/ncihcStandards.js';

/**
 * PerformanceEvaluationAgent Class
 * Analyzes interpreter performance in real-time based on NCIHC standards
 * Provides comprehensive post-call reports with actionable feedback
 */
class PerformanceEvaluationAgent {
  /**
   * Initialize the Performance Evaluation Agent
   * @param {Object} config - Configuration object
   * @param {string} [config.anthropicApiKey] - Anthropic API key for deep analysis
   * @param {Function} [config.onMetricsUpdate] - Callback for metrics updates (throttled)
   * @param {Function} [config.onSuggestionGenerated] - Callback for suggestions
   * @param {Function} [config.onError] - Callback for error handling
   */
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
      targetWPM: WPMGuidelines.target,

      // NCIHC Standards-based categories
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

    // Filler words dictionary (multi-language support)
    this.fillerWords = {
      en: ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally',
        'kind of', 'sort of', 'i mean', 'well', 'so', 'right'],
      es: ['eh', 'este', 'pues', 'bueno', 'o sea', 'como', 'verdad', 'entonces']
    };

    // Transcript buffer for context analysis
    this.transcriptBuffer = [];
    this.contextWindow = 10; // Keep last 10 utterances for context

    // Real-time suggestions queue (not shown until end)
    this.suggestions = [];

    // AI analysis cache
    this.aiAnalysisCache = new Map();

    // Callbacks
    this.onMetricsUpdate = config.onMetricsUpdate || (() => { });
    this.onSuggestionGenerated = config.onSuggestionGenerated || (() => { });
    this.onError = config.onError || console.error;

    console.log('[PerformanceAgent] Initialized');
  }

  /**
   * Start performance monitoring session
   */
  start() {
    this.isAnalyzing = true;
    this.sessionStartTime = Date.now();
    this.resetMetrics();
    console.log('[PerformanceAgent] Started monitoring');
  }

  /**
   * Stop monitoring and generate final report
   * @returns {Promise<Object>} Comprehensive performance report
   */
  async stop() {
    this.isAnalyzing = false;
    this.metrics.totalTime = (Date.now() - this.sessionStartTime) / 1000; // seconds

    // Calculate final metrics
    this.calculateFinalScores();

    // Generate comprehensive AI analysis
    const report = await this.generateFinalReport();

    console.log('[PerformanceAgent] Session complete');
    return report;
  }

  /**
   * Process incoming transcription for real-time analysis
   * Main entry point - called by orchestrator with transcription data
   * @param {Object} transcriptionData - Transcription from Agent 1
   */
  async processTranscription(transcriptionData) {
    if (!this.isAnalyzing) return;

    const { text, isFinal, timestamp, speaker } = transcriptionData;

    // Only analyze interpreter's speech (not patient/provider)
    // In real implementation, would use speaker diarization
    // For now, analyze all final transcriptions
    if (!isFinal) {
      return;
    }

    // Add to buffer
    this.transcriptBuffer.push({
      text,
      timestamp,
      wordCount: this.countWords(text)
    });

    // Update word count and WPM
    this.metrics.totalWords += this.countWords(text);
    this.updateWPM();

    try {
      // Run multiple analysis passes (all async, parallel)
      await Promise.all([
        this.analyzeFluency(text, timestamp),
        this.analyzeGrammar(text, timestamp),
        this.analyzeSentenceStructure(text, timestamp),
        this.analyzeProfessionalConduct(text, timestamp),
        this.analyzeCompleteness(text, timestamp)
      ]);

      // Periodic deep AI analysis (every 10 utterances)
      if (this.transcriptBuffer.length % 10 === 0 && this.anthropicApiKey) {
        await this.runDeepAIAnalysis();
      }

      // Trim buffer
      if (this.transcriptBuffer.length > this.contextWindow) {
        this.transcriptBuffer.shift();
      }

      // Update metrics (callback will be throttled externally by orchestrator)
      this.onMetricsUpdate(this.metrics);

    } catch (error) {
      this.onError({
        source: 'PerformanceAgent',
        method: 'processTranscription',
        message: `Analysis error: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  // ============================================
  // FLUENCY ANALYSIS
  // ============================================

  /**
   * Analyze fluency issues in text
   * @param {string} text - Text to analyze
   * @param {number} timestamp - Timestamp
   */
  async analyzeFluency(text, timestamp) {
    // Detect false starts
    const falseStarts = this.detectFalseStarts(text);
    if (falseStarts.length > 0) {
      falseStarts.forEach(fs => {
        this.metrics.fluency.falseStarts.push({
          text: fs,
          context: text,
          timestamp,
          suggestion: 'Practice pausing to gather thoughts before speaking'
        });
      });
      this.adjustScore('fluency', -2 * falseStarts.length);
    }

    // Detect stutters
    const stutters = this.detectStutters(text);
    if (stutters.length > 0) {
      stutters.forEach(stutter => {
        this.metrics.fluency.stutters.push({
          text: stutter,
          context: text,
          timestamp,
          suggestion: 'Take a breath and slow down delivery'
        });
      });
      this.adjustScore('fluency', -1 * stutters.length);
    }

    // Detect filler words
    const fillers = this.detectFillerWords(text);
    if (fillers.length > 0) {
      fillers.forEach(filler => {
        this.metrics.fluency.fillerWords.push({
          word: filler.word,
          context: text,
          timestamp,
          frequency: filler.count
        });
      });
      this.adjustScore('fluency', -0.5 * fillers.reduce((sum, f) => sum + f.count, 0));
    }

    // Detect unnatural pauses
    const pauses = this.detectUnnaturalPauses(text);
    if (pauses.length > 0) {
      this.metrics.fluency.unnaturalPauses.push(...pauses.map(p => ({
        ...p,
        timestamp,
        suggestion: 'Maintain steady flow; pause only at natural breaks'
      })));
      this.adjustScore('fluency', -1 * pauses.length);
    }
  }

  /**
   * Detect false starts (e.g., "The patient- I mean, the patient has...")
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of false starts
   */
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

  /**
   * Detect stutters (e.g., "I-I-I think")
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of stutters
   */
  detectStutters(text) {
    const stutterPattern = /\b(\w+)-\1(?:-\1)*/gi;
    return text.match(stutterPattern) || [];
  }

  /**
   * Detect filler words
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of filler word objects
   */
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

  /**
   * Detect unnatural pauses
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of pause indicators
   */
  detectUnnaturalPauses(text) {
    const ellipsisPattern = /\.{3,}|\s{3,}/g;
    const matches = text.match(ellipsisPattern);
    return matches ? matches.map(m => ({ pause: m, severity: 'minor' })) : [];
  }

  // ============================================
  // GRAMMAR ANALYSIS
  // ============================================

  /**
   * Analyze grammar errors
   * @param {string} text - Text to analyze
   * @param {number} timestamp - Timestamp
   */
  async analyzeGrammar(text, timestamp) {
    // Subject-verb agreement
    const svErrors = this.detectSubjectVerbAgreement(text);
    if (svErrors.length > 0) {
      this.metrics.grammar.subjectVerbAgreement.push(...svErrors.map(e => ({
        ...e,
        timestamp,
        context: text
      })));
      this.adjustScore('grammar', -3 * svErrors.length);
    }

    // Tense errors
    const tenseErrors = this.detectTenseErrors(text);
    if (tenseErrors.length > 0) {
      this.metrics.grammar.tenseErrors.push(...tenseErrors.map(e => ({
        ...e,
        timestamp,
        context: text
      })));
      this.adjustScore('grammar', -2 * tenseErrors.length);
    }

    // Pronoun errors
    const pronounErrors = this.detectPronounErrors(text);
    if (pronounErrors.length > 0) {
      this.metrics.grammar.pronounErrors.push(...pronounErrors.map(e => ({
        ...e,
        timestamp,
        context: text
      })));
      this.adjustScore('grammar', -2 * pronounErrors.length);
    }
  }

  /**
   * Detect subject-verb agreement issues
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of errors
   */
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

  /**
   * Detect tense consistency errors
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of errors
   */
  detectTenseErrors(text) {
    const errors = [];
    const tenseShiftPattern = /\b(had|has|have)\s+\w+ed\s+and\s+\w+s\b/gi;
    const matches = text.match(tenseShiftPattern);

    if (matches) {
      matches.forEach(match => {
        errors.push({
          error: match,
          type: 'tense inconsistency',
          suggestion: 'Maintain consistent tense throughout'
        });
      });
    }

    return errors;
  }

  /**
   * Detect pronoun errors
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of errors
   */
  detectPronounErrors(text) {
    const errors = [];

    const patterns = [
      { pattern: /\b(me and \w+)\s+(is|was|are)/gi, correct: '[person] and I' },
      { pattern: /\bbetween you and I\b/gi, correct: 'between you and me' }
    ];

    patterns.forEach(({ pattern, correct }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          errors.push({
            error: match,
            correction: correct,
            type: 'pronoun case'
          });
        });
      }
    });

    return errors;
  }

  // ============================================
  // SENTENCE STRUCTURE ANALYSIS
  // ============================================

  /**
   * Analyze sentence structure
   * @param {string} text - Text to analyze
   * @param {number} timestamp - Timestamp
   */
  async analyzeSentenceStructure(text, timestamp) {
    // Detect sentence fragments
    const fragments = this.detectFragments(text);
    if (fragments.length > 0) {
      this.metrics.sentenceStructure.fragmentedSentences.push(...fragments.map(f => ({
        fragment: f,
        context: text,
        timestamp,
        suggestion: 'Complete the thought with a full sentence'
      })));
      this.adjustScore('sentenceStructure', -2 * fragments.length);
    }

    // Detect run-on sentences
    const runOns = this.detectRunOnSentences(text);
    if (runOns.length > 0) {
      this.metrics.sentenceStructure.runOnSentences.push(...runOns.map(r => ({
        sentence: r,
        timestamp,
        suggestion: 'Break into shorter, clearer sentences'
      })));
      this.adjustScore('sentenceStructure', -2 * runOns.length);
    }

    // Detect awkward phrasing
    const awkward = this.detectAwkwardPhrasing(text);
    if (awkward.length > 0) {
      this.metrics.sentenceStructure.awkwardPhrasing.push(...awkward.map(a => ({
        phrase: a.phrase,
        betterAlternative: a.suggestion,
        timestamp,
        context: text
      })));
      this.adjustScore('sentenceStructure', -1 * awkward.length);
    }
  }

  /**
   * Detect sentence fragments
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of fragments
   */
  detectFragments(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const fragments = sentences.filter(s => {
      const words = s.trim().split(/\s+/);
      return words.length < 3 || !this.hasVerb(s);
    });
    return fragments;
  }

  /**
   * Detect run-on sentences
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of run-on sentences
   */
  detectRunOnSentences(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    return sentences.filter(s => {
      const words = s.split(/\s+/);
      const hasMultipleIndependentClauses =
        (s.match(/,\s*(?:and|but|or|so)\s+/g) || []).length > 2;
      return words.length > 30 || hasMultipleIndependentClauses;
    });
  }

  /**
   * Detect awkward phrasing
   * @param {string} text - Text to analyze
   * @returns {Object[]} Array of awkward phrases with suggestions
   */
  detectAwkwardPhrasing(text) {
    const awkwardPatterns = [
      {
        pattern: /\bin regards to\b/gi,
        suggestion: 'regarding or with regard to'
      },
      {
        pattern: /\bcould of\b|\bshould of\b|\bwould of\b/gi,
        suggestion: 'could have/should have/would have'
      },
      {
        pattern: /\bfor free\b/gi,
        suggestion: 'free or at no cost'
      }
    ];

    const awkward = [];
    awkwardPatterns.forEach(({ pattern, suggestion }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          awkward.push({ phrase: match, suggestion });
        });
      }
    });

    return awkward;
  }

  /**
   * Check if sentence has a verb
   * @param {string} sentence - Sentence to check
   * @returns {boolean} True if verb present
   */
  hasVerb(sentence) {
    const commonVerbs = /\b(is|are|was|were|be|been|has|have|had|do|does|did|can|could|will|would|should|may|might)\b/i;
    return commonVerbs.test(sentence);
  }

  // ============================================
  // PROFESSIONAL CONDUCT ANALYSIS (NCIHC)
  // ============================================

  /**
   * Analyze professional conduct (NCIHC standards)
   * @param {string} text - Text to analyze
   * @param {number} timestamp - Timestamp
   */
  async analyzeProfessionalConduct(text, timestamp) {
    // Detect first-person violations (CRITICAL)
    const firstPersonViolations = this.detectFirstPersonViolations(text);
    if (firstPersonViolations.length > 0) {
      this.metrics.professionalConduct.firstPersonViolations.push(...firstPersonViolations.map(v => ({
        violation: v,
        context: text,
        timestamp,
        ncihcStandard: 'Standard 8: Respect for Persons',
        suggestion: 'Interpret as "I" not "he/she says"'
      })));
      this.adjustScore('professionalConduct', -5 * firstPersonViolations.length);
    }

    // Detect editorial comments (CRITICAL)
    const editorialComments = this.detectEditorialComments(text);
    if (editorialComments.length > 0) {
      this.metrics.professionalConduct.editorialComments.push(...editorialComments.map(c => ({
        comment: c,
        timestamp,
        ncihcStandard: 'Standard 5: Impartiality',
        suggestion: 'Remove interpreter commentary; interpret only'
      })));
      this.adjustScore('professionalConduct', -10 * editorialComments.length);
    }
  }

  /**
   * Detect first-person violations
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of violations
   */
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

  /**
   * Detect editorial comments
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of editorial comments
   */
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

  // ============================================
  // COMPLETENESS ANALYSIS
  // ============================================

  /**
   * Analyze message completeness
   * @param {string} text - Text to analyze
   * @param {number} timestamp - Timestamp
   */
  async analyzeCompleteness(text, timestamp) {
    // Track message units
    this.metrics.completeness.messageUnits++;
    this.metrics.completeness.interpretedUnits++;

    // Calculate completion rate
    this.metrics.completeness.completionRate =
      (this.metrics.completeness.interpretedUnits / this.metrics.completeness.messageUnits) * 100;
  }

  // ============================================
  // DEEP AI ANALYSIS (Anthropic Claude)
  // ============================================

  /**
   * Run deep AI analysis using Anthropic Claude
   * Analyzes patterns that require sophisticated NLP
   */
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
          system: `You are a clinical medical interpretation evaluator. You analyze interpreter performance and provide ONLY structured JSON output.

CRITICAL INSTRUCTIONS:
- Output ONLY valid JSON. No explanations, no commentary, no markdown formatting.
- Do not include any text before or after the JSON object.
- Do not use code blocks or markdown formatting.
- Provide scores as integers from 0-100.
- Include specific examples as strings in arrays.
- Be concise and factual in all assessments.`,
          messages: [{
            role: 'user',
            content: `Analyze the following medical interpretation transcript for quality metrics. Return ONLY a JSON object with this exact structure:

{
  "terminologyConsistency": <0-100 score>,
  "styleConsistency": <0-100 score>,
  "culturalAdaptations": [<array of strings describing cultural adaptations observed>],
  "registerAppropriate": <true/false>,
  "accuracyIssues": [<array of strings describing accuracy problems>],
  "cognitiveLoad": <0-100 score>,
  "inconsistencies": [<array of strings describing terminology or style inconsistencies>]
}

Transcript:
${recentTranscript}

Remember: Return ONLY the JSON object, nothing else.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned ${response.status}`);
      }

      const data = await response.json();
      const analysis = this.parseAIResponse(data.content[0].text);

      // Update consistency metrics
      if (analysis.terminologyConsistency) {
        this.metrics.consistency.terminologyConsistency = analysis.terminologyConsistency;
        this.metrics.consistency.inconsistencies.push(...(analysis.inconsistencies || []));
      }

      // Update cultural competency
      if (analysis.culturalAdaptations) {
        this.metrics.culturalCompetency.culturalAdaptations.push(...analysis.culturalAdaptations);
      }

    } catch (error) {
      this.onError({
        source: 'PerformanceAgent',
        method: 'runDeepAIAnalysis',
        message: `AI analysis error: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Parse AI response (extract JSON)
   * @param {string} text - AI response text
   * @returns {Object} Parsed analysis
   */
  parseAIResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return {};
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Count words in text
   * @param {string} text - Text to count
   * @returns {number} Word count
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Update average WPM
   */
  updateWPM() {
    const elapsedMinutes = (Date.now() - this.sessionStartTime) / 60000;
    this.metrics.averageWPM = Math.round(this.metrics.totalWords / elapsedMinutes);
  }

  /**
   * Adjust score for a category
   * @param {string} category - Category name
   * @param {number} adjustment - Score adjustment (negative for penalties)
   */
  adjustScore(category, adjustment) {
    this.metrics[category].score = Math.max(0, Math.min(100,
      this.metrics[category].score + adjustment
    ));
  }

  /**
   * Calculate final scores
   */
  calculateFinalScores() {
    // Calculate weighted overall score
    const categoryScores = {
      accuracy: this.metrics.accuracy.score,
      fluency: this.metrics.fluency.score,
      grammar: this.metrics.grammar.score,
      sentenceStructure: this.metrics.sentenceStructure.score,
      professionalConduct: this.metrics.professionalConduct.score,
      culturalCompetency: this.metrics.culturalCompetency.score
    };

    this.metrics.overallScore = calculateOverallScore(categoryScores);
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    // Reset all scores to 100
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].score !== undefined) {
        this.metrics[key].score = 100;
      }
      if (Array.isArray(this.metrics[key])) {
        this.metrics[key] = [];
      }
    });

    // Reset counters
    this.metrics.totalWords = 0;
    this.metrics.totalTime = 0;
    this.metrics.averageWPM = 0;
    this.metrics.completeness.messageUnits = 0;
    this.metrics.completeness.interpretedUnits = 0;
    this.metrics.completeness.completionRate = 100;
  }

  // ============================================
  // FINAL REPORT GENERATION
  // ============================================

  /**
   * Generate comprehensive final report
   * @returns {Promise<Object>} Performance report
   */
  async generateFinalReport() {
    const categoryScores = {
      accuracy: this.metrics.accuracy.score,
      fluency: this.metrics.fluency.score,
      grammar: this.metrics.grammar.score,
      sentenceStructure: this.metrics.sentenceStructure.score,
      professionalConduct: this.metrics.professionalConduct.score,
      culturalCompetency: this.metrics.culturalCompetency.score
    };

    const report = {
      metadata: {
        sessionDuration: this.metrics.totalTime,
        totalWords: this.metrics.totalWords,
        averageWPM: this.metrics.averageWPM,
        targetWPM: this.metrics.targetWPM,
        timestamp: new Date().toISOString()
      },

      overallScore: this.metrics.overallScore,
      scoreInterpretation: interpretScore(this.metrics.overallScore),

      categoryScores: categoryScores,

      detailedFindings: this.metrics,

      topSuggestions: await this.generateTopSuggestions(),

      strengths: this.identifyStrengths(),

      areasForImprovement: this.identifyImprovementAreas(),

      ncihcCompliance: generateComplianceReport(categoryScores)
    };

    return report;
  }

  /**
   * Generate top prioritized suggestions
   * @returns {Promise<Object[]>} Array of suggestions
   */
  async generateTopSuggestions() {
    const suggestions = [];

    // Critical issues first (professional conduct)
    if (this.metrics.professionalConduct.score < 80) {
      suggestions.push({
        priority: 'critical',
        category: 'Professional Conduct',
        issue: 'NCIHC standards violations detected',
        recommendations: this.metrics.professionalConduct.firstPersonViolations
          .map(v => v.suggestion)
          .slice(0, 3)
      });
    }

    // High priority (accuracy)
    if (this.metrics.accuracy.score < 85) {
      suggestions.push({
        priority: 'high',
        category: 'Accuracy',
        issue: 'Message completeness concerns',
        recommendations: ['Review note-taking techniques', 'Practice memory retention exercises']
      });
    }

    // Medium priority (fluency)
    if (this.metrics.fluency.fillerWords.length > 10) {
      suggestions.push({
        priority: 'medium',
        category: 'Fluency',
        issue: `Excessive filler words (${this.metrics.fluency.fillerWords.length} instances)`,
        recommendations: ['Practice pausing instead of using fillers', 'Record and review your interpretations']
      });
    }

    return suggestions;
  }

  /**
   * Identify strengths
   * @returns {Object[]} Array of strengths
   */
  identifyStrengths() {
    const strengths = [];

    Object.entries(this.metrics).forEach(([category, data]) => {
      if (data.score && data.score >= 90) {
        strengths.push({
          category,
          score: data.score,
          comment: `Excellent ${category} demonstrated`
        });
      }
    });

    return strengths;
  }

  /**
   * Identify improvement areas
   * @returns {Object[]} Array of improvement areas
   */
  identifyImprovementAreas() {
    const areas = [];

    Object.entries(this.metrics).forEach(([category, data]) => {
      if (data.score && data.score < 80) {
        areas.push({
          category,
          score: data.score,
          issueCount: this.countIssues(data),
          priority: data.score < 70 ? 'high' : 'medium'
        });
      }
    });

    return areas.sort((a, b) => a.score - b.score);
  }

  /**
   * Count issues in category data
   * @param {Object} categoryData - Category data object
   * @returns {number} Issue count
   */
  countIssues(categoryData) {
    let count = 0;
    Object.values(categoryData).forEach(value => {
      if (Array.isArray(value)) count += value.length;
    });
    return count;
  }
}

// Export for use in extension
export default PerformanceEvaluationAgent;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceEvaluationAgent;
}
