// ===================================================================
// NCIHC Standards of Practice Reference
// File: utils/ncihcStandards.js
// National Council on Interpretation in Health Care Standards
// ===================================================================

/**
 * NCIHC Standards of Practice for Healthcare Interpreters
 * Reference: https://www.ncihc.org/
 * 
 * These standards guide the performance evaluation in Agent 3
 */

export const NCIHCStandards = {
  /**
   * Standard 3: Accuracy and Completeness
   */
  accuracy: {
    id: 'accuracy',
    title: 'Accuracy and Completeness',
    description: 'Interpreters render all messages accurately and completely, without omitting, adding to, or changing the meaning.',
    
    weight: 0.30, // 30% of overall score
    
    criteria: [
      'Convey the complete message without omissions',
      'Maintain fidelity to the original message',
      'Preserve the register and style of the speaker',
      'Avoid additions that change meaning',
      'Avoid substitutions that alter intent'
    ],
    
    violations: [
      {
        type: 'omission',
        severity: 'high',
        penalty: -5,
        description: 'Missing message units or key information'
      },
      {
        type: 'addition',
        severity: 'medium',
        penalty: -3,
        description: 'Adding information not in original message'
      },
      {
        type: 'substitution',
        severity: 'medium',
        penalty: -3,
        description: 'Replacing words that change meaning'
      }
    ],
    
    complianceThreshold: 85 // Minimum score for compliance
  },

  /**
   * Standard 5: Impartiality and Avoidance of Conflict of Interest
   */
  impartiality: {
    id: 'impartiality',
    title: 'Impartiality and Avoidance of Conflict of Interest',
    description: 'Interpreters maintain impartiality and avoid actions that create or give the appearance of a conflict of interest.',
    
    weight: 0.25, // 25% of overall score
    
    criteria: [
      'No personal opinions or editorial comments',
      'No advice-giving or advocacy',
      'Maintain professional boundaries',
      'Disclose any conflicts of interest',
      'Remain neutral at all times'
    ],
    
    violations: [
      {
        type: 'editorial_comment',
        severity: 'critical',
        penalty: -10,
        description: 'Adding personal opinions (e.g., "I think...", "You should...")'
      },
      {
        type: 'advocacy',
        severity: 'critical',
        penalty: -10,
        description: 'Taking sides or advocating for a party'
      },
      {
        type: 'advice_giving',
        severity: 'high',
        penalty: -8,
        description: 'Providing advice or recommendations'
      }
    ],
    
    complianceThreshold: 90 // Higher threshold for ethical standard
  },

  /**
   * Standard 6: Confidentiality
   */
  confidentiality: {
    id: 'confidentiality',
    title: 'Confidentiality',
    description: 'Interpreters maintain confidentiality of all patient-related information.',
    
    weight: 0.0, // Not evaluated in real-time performance
    
    criteria: [
      'Maintain patient privacy and confidentiality',
      'Follow HIPAA guidelines',
      'Do not discuss patient information outside session',
      'Secure storage and disposal of notes'
    ],
    
    note: 'This standard is evaluated through training and policy compliance, not real-time analysis'
  },

  /**
   * Standard 8: Respect for Persons
   */
  respectForPersons: {
    id: 'respectForPersons',
    title: 'Respect for Persons',
    description: 'Interpreters treat all parties with respect and demonstrate cultural sensitivity.',
    
    weight: 0.10, // 10% of overall score (Cultural Competency category)
    
    criteria: [
      'Maintain first-person interpretation ("I" not "he/she says")',
      'Respect cultural differences',
      'Non-discriminatory language and behavior',
      'Appropriate professional demeanor',
      'Cultural adaptation when necessary'
    ],
    
    violations: [
      {
        type: 'first_person_violation',
        severity: 'high',
        penalty: -5,
        description: 'Using third person instead of first person'
      },
      {
        type: 'cultural_insensitivity',
        severity: 'medium',
        penalty: -4,
        description: 'Lack of cultural adaptation or insensitive language'
      }
    ],
    
    complianceThreshold: 80
  },

  /**
   * Standard 9: Continuous Professional Development
   */
  professionalDevelopment: {
    id: 'professionalDevelopment',
    title: 'Continuous Professional Development',
    description: 'Interpreters engage in continuous professional development.',
    
    weight: 0.0, // Not evaluated in real-time
    
    criteria: [
      'Ongoing training and education',
      'Self-assessment and improvement',
      'Knowledge of medical terminology',
      'Understanding of healthcare systems',
      'Cultural competency development'
    ],
    
    note: 'Evaluated through participation in training and certification programs'
  }
};

/**
 * Performance evaluation categories mapped to NCIHC standards
 */
export const PerformanceCategories = {
  accuracy: {
    ncihcStandard: 'accuracy',
    weight: 0.30,
    description: 'Message completeness and fidelity',
    metrics: ['omissions', 'additions', 'substitutions', 'completionRate']
  },
  
  professionalConduct: {
    ncihcStandard: 'impartiality',
    weight: 0.25,
    description: 'NCIHC standards adherence',
    metrics: ['editorialComments', 'firstPersonViolations', 'advocacy']
  },
  
  fluency: {
    ncihcStandard: null, // Quality metric, not direct NCIHC standard
    weight: 0.15,
    description: 'Speech naturalness and flow',
    metrics: ['falseStarts', 'stutters', 'fillerWords', 'pauses']
  },
  
  grammar: {
    ncihcStandard: null,
    weight: 0.10,
    description: 'Grammatical correctness',
    metrics: ['subjectVerbAgreement', 'tenseErrors', 'pronounErrors']
  },
  
  sentenceStructure: {
    ncihcStandard: null,
    weight: 0.10,
    description: 'Clarity and organization',
    metrics: ['fragments', 'runOns', 'awkwardPhrasing']
  },
  
  culturalCompetency: {
    ncihcStandard: 'respectForPersons',
    weight: 0.10,
    description: 'Cultural adaptation skills',
    metrics: ['culturalAdaptations', 'registerShifts', 'idiomHandling']
  }
};

/**
 * Score interpretation guidelines
 */
export const ScoreInterpretation = {
  excellent: {
    range: [90, 100],
    label: 'Excellent',
    description: 'Exceptional performance, meets or exceeds all NCIHC standards',
    color: 'green'
  },
  proficient: {
    range: [80, 89],
    label: 'Proficient',
    description: 'Competent performance, meets NCIHC standards with minor areas for improvement',
    color: 'blue'
  },
  developing: {
    range: [70, 79],
    label: 'Developing',
    description: 'Adequate performance, some NCIHC standards need attention',
    color: 'yellow'
  },
  needsImprovement: {
    range: [0, 69],
    label: 'Needs Improvement',
    description: 'Performance below NCIHC standards, significant improvement needed',
    color: 'red'
  }
};

/**
 * Get score interpretation for a given score
 * @param {number} score - Score (0-100)
 * @returns {object} Score interpretation
 */
export function interpretScore(score) {
  for (const [key, interpretation] of Object.entries(ScoreInterpretation)) {
    const [min, max] = interpretation.range;
    if (score >= min && score <= max) {
      return interpretation;
    }
  }
  return ScoreInterpretation.needsImprovement;
}

/**
 * Check NCIHC compliance for a category
 * @param {string} categoryId - Category ID
 * @param {number} score - Category score
 * @returns {object} Compliance status
 */
export function checkCompliance(categoryId, score) {
  const standard = NCIHCStandards[categoryId];
  
  if (!standard || standard.weight === 0) {
    return {
      applicable: false,
      status: 'not_applicable'
    };
  }
  
  const threshold = standard.complianceThreshold;
  const isCompliant = score >= threshold;
  
  return {
    applicable: true,
    status: isCompliant ? 'compliant' : 'needs_improvement',
    score: score,
    threshold: threshold,
    gap: threshold - score
  };
}

/**
 * Get all applicable NCIHC standards
 * @returns {object[]} Array of applicable standards
 */
export function getApplicableStandards() {
  return Object.entries(NCIHCStandards)
    .filter(([_, standard]) => standard.weight > 0)
    .map(([id, standard]) => ({
      id,
      title: standard.title,
      weight: standard.weight,
      complianceThreshold: standard.complianceThreshold
    }));
}

/**
 * Calculate weighted overall score
 * @param {object} categoryScores - Map of category ID to score
 * @returns {number} Overall weighted score
 */
export function calculateOverallScore(categoryScores) {
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(PerformanceCategories).forEach(([categoryId, category]) => {
    const score = categoryScores[categoryId] || 0;
    weightedSum += score * category.weight;
    totalWeight += category.weight;
  });
  
  return Math.round(weightedSum / totalWeight);
}

/**
 * Generate compliance report for all categories
 * @param {object} categoryScores - Map of category ID to score
 * @returns {object} Compliance report
 */
export function generateComplianceReport(categoryScores) {
  const report = {};
  
  Object.entries(PerformanceCategories).forEach(([categoryId, category]) => {
    if (category.ncihcStandard) {
      const score = categoryScores[categoryId] || 0;
      const compliance = checkCompliance(category.ncihcStandard, score);
      
      report[category.ncihcStandard] = {
        category: categoryId,
        ...compliance
      };
    }
  });
  
  return report;
}

/**
 * Medical interpretation WPM (Words Per Minute) guidelines
 */
export const WPMGuidelines = {
  target: 90,
  min: 85,
  max: 95,
  conversational: 150, // For comparison (normal conversation speed)
  note: 'Medical interpretation is slower than conversational speech due to processing time and technical terminology'
};

/**
 * Common interpreter challenges and suggestions
 */
export const CommonChallenges = {
  falseStarts: {
    description: 'Starting a sentence, stopping, and restarting',
    impact: 'Reduces fluency and may indicate processing difficulties',
    suggestions: [
      'Practice pausing to gather thoughts before speaking',
      'Improve note-taking to reduce cognitive load',
      'Work on simultaneous interpretation techniques'
    ]
  },
  
  fillerWords: {
    description: 'Using "um", "uh", "like", etc.',
    impact: 'Reduces perceived professionalism and clarity',
    suggestions: [
      'Record and review your interpretations',
      'Practice pausing instead of using fillers',
      'Count fillers in practice sessions to raise awareness'
    ]
  },
  
  firstPersonViolation: {
    description: 'Using third person ("he says") instead of first person ("I")',
    impact: 'CRITICAL - Violates NCIHC Standard 8',
    suggestions: [
      'Always interpret as "I", not "he/she says"',
      'Practice maintaining first person consistently',
      'Review NCIHC Standard 8: Respect for Persons'
    ]
  },
  
  editorialComments: {
    description: 'Adding personal opinions or advice',
    impact: 'CRITICAL - Violates NCIHC Standard 5',
    suggestions: [
      'Interpret only what is said',
      'No personal opinions or advice',
      'Review NCIHC Standard 5: Impartiality'
    ]
  }
};

/**
 * Get suggestions for an issue type
 * @param {string} issueType - Type of issue
 * @returns {string[]} Array of suggestions
 */
export function getSuggestions(issueType) {
  const challenge = CommonChallenges[issueType];
  return challenge ? challenge.suggestions : [];
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NCIHCStandards,
    PerformanceCategories,
    ScoreInterpretation,
    WPMGuidelines,
    CommonChallenges,
    interpretScore,
    checkCompliance,
    getApplicableStandards,
    calculateOverallScore,
    generateComplianceReport,
    getSuggestions
  };
}
