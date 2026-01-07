// ===================================================================
// Agent 2: Medical Terminology Detection & Translation Agent
// File: agents/medicalTerminologyAgent.js
// ===================================================================

import { saveMedicalTermsCache, loadMedicalTermsCache } from '../utils/storageManager.js';

/**
 * MedicalTerminologyAgent Class
 * Detects medical terminology in transcription text and provides:
 * - Translation to target language
 * - Phonetic pronunciation in English
 * - Medical definitions
 * - Context extraction
 */
class MedicalTerminologyAgent {
  /**
   * Initialize the Medical Terminology Agent
   * @param {Object} config - Configuration object
   * @param {string} [config.targetLanguage='es'] - Target language for translations
   * @param {string} config.translationApiKey - Google Translate API key
   * @param {Function} [config.onTermDetected] - Callback when term is detected
   * @param {Function} [config.onError] - Callback for error handling
   */
  constructor(config = {}) {
    this.targetLanguage = config.targetLanguage || 'es'; // Spanish by default
    this.translationApiKey = config.translationApiKey;
    this.medicalTermsCache = new Map(); // Will load from storage
    this.processedTerms = new Set(); // Recently processed terms
    
    // Callbacks
    this.onTermDetected = config.onTermDetected || (() => {});
    this.onError = config.onError || console.error;
    
    // Medical terminology patterns (comprehensive list)
    this.medicalPatterns = [
      // Common medical terms
      /\b(diagnosis|prognosis|symptoms?|treatment|prescription|medication|therapy|surgery|procedure|examination|screening|assessment|evaluation)\b/gi,
      
      // Diseases and conditions
      /\b(hypertension|diabetes|asthma|pneumonia|bronchitis|arthritis|infection|inflammation|fracture|migraine|stroke|cancer|tumor|depression|anxiety)\b/gi,
      
      // Medications and treatments
      /\b(antibiotic|analgesic|anesthetic|vaccine|insulin|steroid|antiviral|antihistamine|antidepressant|chemotherapy|radiation|immunotherapy)\b/gi,
      
      // Body systems
      /\b(cardiovascular|respiratory|gastrointestinal|neurological|dermatological|orthopedic|endocrine|reproductive|urinary|digestive)\b/gi,
      
      // Diagnostic procedures
      /\b(CT scan|CAT scan|MRI|X-ray|ultrasound|ECG|EKG|blood test|biopsy|endoscopy|colonoscopy|mammogram|PET scan)\b/gi,
      
      // Medical descriptors
      /\b(chronic|acute|benign|malignant|congenital|hereditary|idiopathic|symptomatic|asymptomatic|terminal|progressive|degenerative)\b/gi,
      
      // Healthcare professionals
      /\b(physician|surgeon|cardiologist|radiologist|anesthesiologist|oncologist|pediatrician|psychiatrist|neurologist|dermatologist)\b/gi,
      
      // Anatomical terms
      /\b(heart|lung|liver|kidney|brain|stomach|intestine|pancreas|spleen|thyroid|artery|vein|muscle|bone|joint|nerve)\b/gi,
      
      // Medical measurements
      /\b(\d+\s*(?:mg|ml|cc|units?|mmHg|bpm|degrees?|celsius|fahrenheit))\b/gi,
      
      // Latin/Greek medical suffixes
      /\b([a-z]{3,}itis|[a-z]{3,}osis|[a-z]{3,}emia|[a-z]{3,}pathy|[a-z]{3,}ectomy|[a-z]{3,}otomy|[a-z]{3,}plasty|[a-z]{3,}scopy)\b/gi,
      
      // Medical symptoms
      /\b(pain|fever|nausea|vomiting|diarrhea|constipation|fatigue|weakness|dizziness|headache|cough|shortness of breath)\b/gi
    ];
    
    // Load cache from storage
    this.loadCache();
    
    console.log('[MedicalAgent] Initialized with target language:', this.targetLanguage);
  }

  /**
   * Load medical terms cache from Chrome storage
   */
  async loadCache() {
    try {
      this.medicalTermsCache = await loadMedicalTermsCache();
      console.log(`[MedicalAgent] Loaded ${this.medicalTermsCache.size} cached terms`);
    } catch (error) {
      console.error('[MedicalAgent] Failed to load cache:', error);
      this.medicalTermsCache = new Map();
    }
  }

  /**
   * Save medical terms cache to Chrome storage
   */
  async saveCache() {
    try {
      await saveMedicalTermsCache(this.medicalTermsCache);
      console.log(`[MedicalAgent] Saved ${this.medicalTermsCache.size} terms to cache`);
    } catch (error) {
      console.error('[MedicalAgent] Failed to save cache:', error);
    }
  }

  /**
   * Process transcription text for medical terminology
   * Main entry point - called by orchestrator with transcription data
   * @param {Object} transcriptionData - Transcription data from Agent 1
   */
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
          
          // Send to frontend via orchestrator
          this.onTermDetected({
            original: term,
            ...processedTerm,
            context: this.getContext(text, term),
            timestamp: timestamp,
            isFinal: isFinal
          });
          
        } catch (error) {
          this.onError({
            source: 'MedicalAgent',
            method: 'processTranscription',
            message: `Failed to process term "${term}": ${error.message}`,
            timestamp: Date.now()
          });
        }
      }
      
      // Clean up old processed terms (keep last 100)
      if (this.processedTerms.size > 100) {
        const termsArray = Array.from(this.processedTerms);
        this.processedTerms = new Set(termsArray.slice(-100));
      }
      
      // Save cache periodically (every 10 terms)
      if (detectedTerms.length > 0 && this.medicalTermsCache.size % 10 === 0) {
        await this.saveCache();
      }
      
    } catch (error) {
      this.onError({
        source: 'MedicalAgent',
        method: 'processTranscription',
        message: `Processing error: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Detect medical terminology using pattern matching
   * @param {string} text - Text to analyze
   * @returns {string[]} Array of detected medical terms
   */
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

  /**
   * Process individual term - translate, get phonetics, get definition
   * @param {string} term - Medical term to process
   * @returns {Object} Processed term data
   */
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
      console.error('[MedicalAgent] Term processing error:', error);
      
      // Return fallback values on error
      return {
        translation: term,
        phonetics: this.fallbackPhonetics(term),
        definition: 'Error retrieving definition'
      };
    }
  }

  /**
   * Translate medical term to target language using Google Translate API
   * @param {string} term - Term to translate
   * @returns {Promise<string>} Translated term
   */
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
      console.error('[MedicalAgent] Translation error:', error);
      return term; // Return original on error
    }
  }

  /**
   * Get phonetic pronunciation guide for English term
   * @param {string} term - Term to get phonetics for
   * @returns {Promise<string>} Phonetic pronunciation
   */
  async getPhonetics(term) {
    // Try to fetch from dictionary API (simplified for now)
    // In production, could use Wiktionary API or other pronunciation APIs
    
    // For now, use fallback phonetics
    return this.fallbackPhonetics(term);
  }

  /**
   * Generate simple phonetic pronunciation guide
   * @param {string} term - Term to generate phonetics for
   * @returns {string} Phonetic pronunciation
   */
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
      'migraine': 'MY-grayn',
      'stroke': 'STROHK',
      'cancer': 'KAN-ser',
      'tumor': 'TOO-mer',
      
      // Medications
      'antibiotic': 'an-tee-by-AH-tik',
      'analgesic': 'an-uhl-JEE-zik',
      'anesthetic': 'an-uhs-THET-ik',
      'vaccine': 'vak-SEEN',
      'insulin': 'IN-suh-lin',
      'steroid': 'STEHR-oyd',
      'chemotherapy': 'kee-moh-THER-uh-pee',
      
      // Body systems
      'cardiovascular': 'kar-dee-oh-VAS-kyuh-ler',
      'respiratory': 'RES-puh-ruh-tor-ee',
      'gastrointestinal': 'gas-troh-in-TES-tuh-nuhl',
      'neurological': 'noor-uh-LAH-jih-kuhl',
      'endocrine': 'EN-doh-krin',
      
      // Procedures
      'prescription': 'pri-SKRIP-shun',
      'medication': 'med-i-KAY-shun',
      'treatment': 'TREET-ment',
      'procedure': 'pruh-SEE-jer',
      'surgery': 'SUR-juh-ree',
      'biopsy': 'BY-op-see',
      'endoscopy': 'en-DAHS-kuh-pee',
      'colonoscopy': 'koh-luh-NAHS-kuh-pee',
      'mammogram': 'MAM-uh-gram',
      
      // Common symptoms
      'symptoms': 'SIMP-tumz',
      'inflammation': 'in-fluh-MAY-shun',
      'infection': 'in-FEK-shun',
      'fracture': 'FRAK-chur',
      'nausea': 'NAW-zee-uh',
      'dizziness': 'DIZ-ee-nes',
      'fatigue': 'fuh-TEEG'
    };

    const lowerTerm = term.toLowerCase();
    
    // Check if we have a predefined pronunciation
    if (phoneticsMap[lowerTerm]) {
      return phoneticsMap[lowerTerm];
    }
    
    // Generate basic phonetic approximation
    return this.generatePhonetics(term);
  }

  /**
   * Generate basic phonetic pronunciation for unknown terms
   * @param {string} term - Term to generate phonetics for
   * @returns {string} Generated phonetics
   */
  generatePhonetics(term) {
    // Simple syllable-based approximation
    const syllables = term
      .toLowerCase()
      .match(/[^aeiou]*[aeiou]+(?:[^aeiou]*$|[^aeiou](?=[^aeiou]))?/gi) || [term];
    
    return syllables
      .map(s => s.toUpperCase())
      .join('-');
  }

  /**
   * Get medical definition for term
   * @param {string} term - Term to define
   * @returns {Promise<string>} Medical definition
   */
  async getDefinition(term) {
    // Medical definitions dictionary (subset)
    const medicalDefinitions = {
      'diagnosis': 'Identification of a disease or condition by examination',
      'prognosis': 'Predicted course and outcome of a disease',
      'hypertension': 'High blood pressure (above 140/90 mmHg)',
      'diabetes': 'Metabolic disorder affecting blood sugar regulation',
      'asthma': 'Chronic respiratory condition causing breathing difficulties',
      'pneumonia': 'Infection causing inflammation in the lungs',
      'bronchitis': 'Inflammation of the bronchial tubes',
      'arthritis': 'Inflammation of one or more joints',
      'migraine': 'Severe recurring headache often with nausea',
      'stroke': 'Interruption of blood supply to the brain',
      'cancer': 'Disease caused by uncontrolled cell growth',
      'tumor': 'Abnormal growth of tissue',
      'prescription': 'Written instruction for medication from healthcare provider',
      'cardiovascular': 'Relating to the heart and blood vessels',
      'respiratory': 'Relating to breathing and the lungs',
      'gastrointestinal': 'Relating to the stomach and intestines',
      'neurological': 'Relating to the nervous system',
      'antibiotic': 'Medicine that fights bacterial infections',
      'analgesic': 'Pain-relieving medication',
      'anesthetic': 'Drug that causes loss of sensation or consciousness',
      'vaccine': 'Biological preparation that provides immunity to disease',
      'insulin': 'Hormone that regulates blood sugar levels',
      'biopsy': 'Removal of tissue sample for diagnostic examination',
      'endoscopy': 'Procedure using camera to examine internal organs',
      'colonoscopy': 'Examination of the colon using a camera',
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
    if (lowerTerm.endsWith('pathy')) {
      return `Disease of the ${lowerTerm.replace('pathy', '')}`;
    }
    if (lowerTerm.endsWith('plasty')) {
      return `Surgical repair of the ${lowerTerm.replace('plasty', '')}`;
    }
    if (lowerTerm.endsWith('scopy')) {
      return `Visual examination of the ${lowerTerm.replace('scopy', '')}`;
    }
    
    // Default: generic medical term
    return `Medical term: ${term}`;
  }

  /**
   * Extract context around the detected term
   * @param {string} text - Full text
   * @param {string} term - Term to find context for
   * @returns {string} Context string with ellipsis
   */
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

  /**
   * Reset agent state
   * Clear all caches and processed terms
   */
  reset() {
    console.log('[MedicalAgent] Resetting caches');
    this.medicalTermsCache.clear();
    this.processedTerms.clear();
  }
}

// Export for use in extension
export default MedicalTerminologyAgent;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MedicalTerminologyAgent;
}
