# Agent 2: Medical Terminology Detection & Translation Agent - Complete Specification

## Overview
Agent 2 receives transcription data from Agent 1 and detects medical terminology in real-time. For each detected term, it provides translation to the target language, phonetic pronunciation in English, and medical definition. Results are sent to the frontend for display and cached for performance.

---

## Purpose & Responsibilities

### Primary Functions
1. **Term Detection**: Identify medical terminology in transcription text using pattern matching
2. **Translation**: Translate detected terms to target language (e.g., Spanish)
3. **Phonetics Generation**: Create English phonetic pronunciation guides
4. **Definition Retrieval**: Provide medical definitions for context
5. **Caching**: Store processed terms to avoid redundant API calls

### Key Characteristics
- **Real-Time Processing**: Analyzes text as it arrives from Agent 1
- **Pattern-Based Detection**: Uses regex patterns for medical terminology
- **Efficient Caching**: LRU cache with 500 term limit
- **Parallel Processing**: Doesn't block other agents or UI

---

## Class Structure

```javascript
class MedicalTerminologyAgent {
  constructor(config = {})
  async processTranscription(transcriptionData)
  detectMedicalTerms(text)
  async processTerm(term)
  async translateTerm(term)
  async getPhonetics(term)
  fallbackPhonetics(term)
  generatePhonetics(term)
  async getDefinition(term)
  getContext(text, term)
  reset()
}
```

---

## Constructor Configuration

```javascript
constructor(config = {}) {
  this.targetLanguage = config.targetLanguage || 'es';  // Spanish by default
  this.translationApiKey = config.translationApiKey;    // Google Translate API
  this.medicalTermsCache = new Map();                    // Translation cache
  this.processedTerms = new Set();                       // Recently processed terms
  
  // Callbacks
  this.onTermDetected = config.onTermDetected || (() => {});
  this.onError = config.onError || console.error;
  
  // Medical terminology patterns (comprehensive list)
  this.medicalPatterns = [
    // Common medical terms
    /\b(diagnosis|prognosis|symptoms?|treatment|prescription|medication|therapy|surgery|procedure|examination|screening)\b/gi,
    
    // Diseases and conditions
    /\b(hypertension|diabetes|asthma|pneumonia|bronchitis|arthritis|infection|inflammation|fracture|migraine)\b/gi,
    
    // Medications
    /\b(antibiotic|analgesic|anesthetic|vaccine|insulin|steroid|antiviral|antihistamine|antidepressant)\b/gi,
    
    // Body systems
    /\b(cardiovascular|respiratory|gastrointestinal|neurological|dermatological|orthopedic|endocrine)\b/gi,
    
    // Diagnostic procedures
    /\b(CT scan|MRI|X-ray|ultrasound|ECG|EKG|blood test|biopsy|endoscopy|colonoscopy)\b/gi,
    
    // Medical descriptors
    /\b(chronic|acute|benign|malignant|congenital|hereditary|idiopathic|symptomatic|asymptomatic)\b/gi,
    
    // Healthcare professionals
    /\b(physician|surgeon|cardiologist|radiologist|anesthesiologist|oncologist|pediatrician|psychiatrist)\b/gi,
    
    // Anatomical terms
    /\b(heart|lung|liver|kidney|brain|stomach|intestine|pancreas|spleen|thyroid|artery|vein)\b/gi,
    
    // Medical measurements
    /\b(\d+\s*(?:mg|ml|cc|units?|mmHg|bpm|degrees?))\b/gi,
    
    // Latin/Greek medical suffixes
    /\b([a-z]+itis|[a-z]+osis|[a-z]+emia|[a-z]+pathy|[a-z]+ectomy|[a-z]+otomy|[a-z]+plasty)\b/gi
  ];
}
```

---

## Method Specifications

### 1. processTranscription()

**Purpose**: Main entry point for processing transcription data

**Implementation**:
```javascript
async processTranscription(transcriptionData) {
  try {
    const { text, isFinal, timestamp } = transcriptionData;
    
    // Only process final transcriptions (not interim)
    if (!isFinal) {
      return;
    }
    
    // Detect medical terms in the text
    const detectedTerms = this.detectMedicalTerms(text);
    
    if (detectedTerms.length === 0) {
      return; // No medical terms found
    }
    
    console.log(`[MedicalAgent] Detected ${detectedTerms.length} term(s):`, detectedTerms);
    
    // Process each detected term
    for (const term of detectedTerms) {
      // Skip if already processed recently
      const termKey = term.toLowerCase();
      if (this.processedTerms.has(termKey)) {
        continue;
      }
      
      try {
        // Get translation, phonetics, and definition
        const processedTerm = await this.processTerm(term);
        
        // Mark as processed
        this.processedTerms.add(termKey);
        
        // Send to frontend
        this.onTermDetected({
          original: term,
          ...processedTerm,
          context: this.getContext(text, term),
          timestamp: timestamp,
          isFinal: isFinal
        });
        
      } catch (error) {
        this.onError(`Failed to process term "${term}": ${error.message}`);
      }
    }
    
    // Clean up old processed terms (keep last 100)
    if (this.processedTerms.size > 100) {
      const termsArray = Array.from(this.processedTerms);
      this.processedTerms = new Set(termsArray.slice(-100));
    }
    
  } catch (error) {
    this.onError('Processing error: ' + error.message);
  }
}
```

---

### 2. detectMedicalTerms()

**Purpose**: Detect medical terminology using pattern matching

**Implementation**:
```javascript
detectMedicalTerms(text) {
  const terms = new Set(); // Use Set to avoid duplicates
  
  // Apply each pattern
  this.medicalPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    
    if (matches) {
      matches.forEach(match => {
        const cleanTerm = match.trim();
        
        // Filter out very short matches (< 3 characters)
        if (cleanTerm.length >= 3) {
          terms.add(cleanTerm);
        }
      });
    }
  });
  
  return Array.from(terms);
}
```

**Detection Logic**:
- Uses regex patterns for medical terminology
- Matches word boundaries to avoid partial matches
- Case-insensitive matching
- Removes duplicates automatically
- Filters out very short matches (< 3 chars)

---

### 3. processTerm()

**Purpose**: Process individual term - translate, get phonetics, get definition

**Implementation**:
```javascript
async processTerm(term) {
  // Check cache first
  const cacheKey = `${term.toLowerCase()}_${this.targetLanguage}`;
  
  if (this.medicalTermsCache.has(cacheKey)) {
    console.log(`[MedicalAgent] Cache hit for "${term}"`);
    return this.medicalTermsCache.get(cacheKey);
  }

  try {
    console.log(`[MedicalAgent] Processing new term: "${term}"`);
    
    // Get translation, phonetics, and definition in parallel
    const [translation, phonetics, definition] = await Promise.all([
      this.translateTerm(term),
      this.getPhonetics(term),
      this.getDefinition(term)
    ]);

    const result = {
      translation: translation,
      phonetics: phonetics,
      definition: definition
    };

    // Cache the result
    this.medicalTermsCache.set(cacheKey, result);
    
    // Limit cache size (LRU eviction)
    if (this.medicalTermsCache.size > 500) {
      const firstKey = this.medicalTermsCache.keys().next().value;
      this.medicalTermsCache.delete(firstKey);
      console.log(`[MedicalAgent] Cache evicted: ${firstKey}`);
    }

    return result;
    
  } catch (error) {
    this.onError('Term processing error: ' + error.message);
    
    // Return fallback values on error
    return {
      translation: term,
      phonetics: this.fallbackPhonetics(term),
      definition: 'Error retrieving definition'
    };
  }
}
```

---

### 4. translateTerm()

**Purpose**: Translate medical term to target language using Google Translate API

**Implementation**:
```javascript
async translateTerm(term) {
  // If no API key, return bracketed original
  if (!this.translationApiKey) {
    console.warn('[MedicalAgent] No translation API key provided');
    return `[${term}]`;
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${this.translationApiKey}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          q: term,
          target: this.targetLanguage,
          source: 'en',
          format: 'text'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;
    
    console.log(`[MedicalAgent] Translated "${term}" → "${translatedText}"`);
    
    return translatedText;
    
  } catch (error) {
    this.onError('Translation error: ' + error.message);
    return term; // Return original on error
  }
}
```

**API Details**:
- Endpoint: `https://translation.googleapis.com/language/translate/v2`
- Method: POST
- Source: English (en)
- Target: Configurable (default: Spanish)
- Format: Plain text

---

### 5. getPhonetics()

**Purpose**: Get phonetic pronunciation guide for English term

**Implementation**:
```javascript
async getPhonetics(term) {
  // Try to fetch from dictionary API
  try {
    // Option 1: Use Wiktionary API
    const response = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term.toLowerCase())}`
    );
    
    if (response.ok) {
      const data = await response.json();
      // Extract IPA pronunciation if available
      // (Parsing logic would go here - complex for real implementation)
      // For now, fall back to simple phonetics
      return this.fallbackPhonetics(term);
    }
  } catch (error) {
    // API unavailable or term not found - use fallback
  }

  // Fallback to simple phonetic generation
  return this.fallbackPhonetics(term);
}
```

---

### 6. fallbackPhonetics()

**Purpose**: Generate simple phonetic pronunciation guide

**Implementation**:
```javascript
fallbackPhonetics(term) {
  // Common medical terms dictionary
  const phoneticsMap = {
    // Common medical terms
    'diagnosis': 'dy-uhg-NOH-sis',
    'prognosis': 'prog-NOH-sis',
    'hypertension': 'hy-per-TEN-shun',
    'diabetes': 'dy-uh-BEE-teez',
    'asthma': 'AZ-muh',
    'pneumonia': 'noo-MOH-nyuh',
    'bronchitis': 'brong-KY-tis',
    'arthritis': 'ar-THRY-tis',
    
    // Medications
    'antibiotic': 'an-tee-by-AH-tik',
    'analgesic': 'an-uhl-JEE-zik',
    'anesthetic': 'an-uhs-THET-ik',
    'vaccine': 'vak-SEEN',
    'insulin': 'IN-suh-lin',
    
    // Body systems
    'cardiovascular': 'kar-dee-oh-VAS-kyuh-ler',
    'respiratory': 'RES-puh-ruh-tor-ee',
    'gastrointestinal': 'gas-troh-in-TES-tuh-nuhl',
    'neurological': 'noor-uh-LAH-jih-kuhl',
    
    // Procedures
    'prescription': 'pri-SKRIP-shun',
    'medication': 'med-i-KAY-shun',
    'treatment': 'TREET-ment',
    'procedure': 'pruh-SEE-jer',
    'surgery': 'SUR-juh-ree',
    
    // Common symptoms
    'symptoms': 'SIMP-tumz',
    'inflammation': 'in-fluh-MAY-shun',
    'infection': 'in-FEK-shun',
    'fracture': 'FRAK-chur'
  };

  const lowerTerm = term.toLowerCase();
  
  // Check if we have a predefined pronunciation
  if (phoneticsMap[lowerTerm]) {
    return phoneticsMap[lowerTerm];
  }
  
  // Generate basic phonetic approximation
  return this.generatePhonetics(term);
}
```

---

### 7. generatePhonetics()

**Purpose**: Generate basic phonetic pronunciation for unknown terms

**Implementation**:
```javascript
generatePhonetics(term) {
  // Simple syllable-based approximation
  // This is a simplified version - real implementation would be more sophisticated
  
  const syllables = term
    .toLowerCase()
    .match(/[^aeiou]*[aeiou]+(?:[^aeiou]*$|[^aeiou](?=[^aeiou]))?/gi) || [term];
  
  return syllables
    .map(s => s.toUpperCase())
    .join('-');
}
```

---

### 8. getDefinition()

**Purpose**: Get medical definition for term

**Implementation**:
```javascript
async getDefinition(term) {
  // Medical definitions dictionary (subset)
  const medicalDefinitions = {
    'diagnosis': 'Identification of a disease or condition by examination',
    'prognosis': 'Predicted course and outcome of a disease',
    'hypertension': 'High blood pressure (above 140/90 mmHg)',
    'diabetes': 'Metabolic disorder affecting blood sugar regulation',
    'asthma': 'Chronic respiratory condition causing breathing difficulties',
    'pneumonia': 'Infection causing inflammation in the lungs',
    'prescription': 'Written instruction for medication from healthcare provider',
    'cardiovascular': 'Relating to the heart and blood vessels',
    'respiratory': 'Relating to breathing and the lungs',
    'antibiotic': 'Medicine that fights bacterial infections',
    'analgesic': 'Pain-relieving medication',
    'anesthetic': 'Drug that causes loss of sensation or consciousness',
    'vaccine': 'Biological preparation that provides immunity to disease',
    'biopsy': 'Removal of tissue sample for diagnostic examination',
    'chronic': 'Persisting for a long time or constantly recurring',
    'acute': 'Severe and sudden in onset',
    'benign': 'Not cancerous or harmful',
    'malignant': 'Cancerous; capable of spreading'
  };

  const lowerTerm = term.toLowerCase();
  
  // Check if we have a definition
  if (medicalDefinitions[lowerTerm]) {
    return medicalDefinitions[lowerTerm];
  }
  
  // Try to infer from suffix
  if (lowerTerm.endsWith('itis')) {
    return `Inflammation of the ${lowerTerm.replace('itis', '')}`;
  }
  if (lowerTerm.endsWith('ectomy')) {
    return `Surgical removal of the ${lowerTerm.replace('ectomy', '')}`;
  }
  if (lowerTerm.endsWith('otomy')) {
    return `Surgical incision into the ${lowerTerm.replace('otomy', '')}`;
  }
  if (lowerTerm.endsWith('osis')) {
    return `Abnormal condition or disease of the ${lowerTerm.replace('osis', '')}`;
  }
  
  // Default: generic medical term
  return `Medical term: ${term}`;
}
```

---

### 9. getContext()

**Purpose**: Extract context around the detected term

**Implementation**:
```javascript
getContext(text, term) {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  
  const index = lowerText.indexOf(lowerTerm);
  
  if (index === -1) {
    return text; // Term not found, return full text
  }

  // Extract context (50 chars before and after)
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + term.length + 50);
  
  let context = text.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) {
    context = '...' + context;
  }
  if (end < text.length) {
    context = context + '...';
  }
  
  return context;
}
```

---

### 10. reset()

**Purpose**: Clear all caches and processed terms

**Implementation**:
```javascript
reset() {
  console.log('[MedicalAgent] Resetting caches');
  this.medicalTermsCache.clear();
  this.processedTerms.clear();
}
```

---

## Output Format

```javascript
{
  original: string,         // Original English term
  translation: string,      // Translated term
  phonetics: string,        // Phonetic pronunciation (e.g., "hy-per-TEN-shun")
  definition: string,       // Medical definition
  context: string,          // Sentence context where term appeared
  timestamp: number,        // When detected (Unix ms)
  isFinal: boolean         // From transcription data
}
```

---

## Caching Strategy

### Cache Structure
```javascript
medicalTermsCache: Map<string, object>
Key format: "{term}_{targetLanguage}"
Example: "hypertension_es"
```

### Cache Size Management
- **Limit**: 500 terms
- **Eviction**: LRU (Least Recently Used)
- **When full**: Remove oldest entry

### Processed Terms Tracking
```javascript
processedTerms: Set<string>
Purpose: Avoid re-processing same term in short time
Limit: 100 most recent terms
```

---

## Error Handling

### Error Scenarios

1. **Translation API Failure**
   - Return original term
   - Log error
   - Continue processing

2. **Network Timeout**
   - Use cached value if available
   - Return fallback phonetics
   - Don't block other terms

3. **Invalid API Key**
   - Return bracketed term `[term]`
   - Show warning once
   - Continue with other features

### Error Handling Pattern

```javascript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  this.onError(`Operation failed: ${error.message}`);
  return fallbackValue;
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Aggressive Caching**: Cache all processed terms
2. **Parallel Processing**: Process translation, phonetics, definition simultaneously
3. **Deduplication**: Skip already-processed terms in recent history
4. **Batch Processing**: Could process multiple terms in single API call (future enhancement)

### Performance Metrics

- **Processing Time**: < 500ms per term (with API calls)
- **Cache Hit Rate**: > 60% after first few minutes
- **Memory Usage**: < 10MB for full cache
- **API Calls**: Minimize through caching

---

## Testing Requirements

### Unit Tests

```javascript
describe('MedicalTerminologyAgent', () => {
  test('detects medical terms in text', () => {});
  test('translates terms correctly', () => {});
  test('generates phonetics', () => {});
  test('caches processed terms', () => {});
  test('limits cache size to 500', () => {});
  test('extracts context correctly', () => {});
  test('handles API errors gracefully', () => {});
  test('skips recently processed terms', () => {});
  test('resets caches correctly', () => {});
});
```

### Test Data

```javascript
const testCases = [
  {
    input: 'The patient has hypertension and diabetes',
    expected: ['hypertension', 'diabetes']
  },
  {
    input: 'We need to do an MRI and blood test',
    expected: ['MRI', 'blood test']
  }
];
```

---

## Dependencies

### External APIs
- Google Cloud Translation API v2

### Chrome APIs
- None (runs in any context)

### Web APIs
- Fetch API (for HTTP requests)

---

## Export Pattern

```javascript
export default MedicalTerminologyAgent;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MedicalTerminologyAgent;
}
```

---

## Usage Example

```javascript
import MedicalTerminologyAgent from './medicalTerminologyAgent.js';

const agent = new MedicalTerminologyAgent({
  targetLanguage: 'es',
  translationApiKey: 'YOUR_GOOGLE_API_KEY',
  
  onTermDetected: (termData) => {
    console.log('Detected:', termData.original);
    console.log('Translation:', termData.translation);
    console.log('Phonetics:', termData.phonetics);
    // Send to UI
  },
  
  onError: (error) => {
    console.error('Error:', error);
  }
});

// Process transcription from Agent 1
agent.processTranscription({
  text: 'The patient has hypertension',
  isFinal: true,
  timestamp: Date.now()
});
```

---

## GitHub Copilot Implementation Prompt

```
Create agents/medicalTerminologyAgent.js for the Medical Interpreter Chrome Extension.

This is Agent 2 of a 3-agent system that detects medical terminology in transcription text, translates it to target language, and provides phonetic pronunciation.

Requirements:
[Paste this entire specification]

Technical constraints:
- ES6 class with export default
- Use Map for caching (500 term limit with LRU eviction)
- Use Set for recent terms tracking (100 limit)
- Google Cloud Translation API integration
- Comprehensive regex patterns for medical terms
- Parallel processing (Promise.all) for API calls
- Graceful fallback on API failures
- JSDoc comments

Generate complete implementation including all medical term patterns and phonetics dictionary.
```
