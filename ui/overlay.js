// ===================================================================
// UI Overlay JavaScript
// File: ui/overlay.js
// Handles all UI interactions and message processing
// ===================================================================

/**
 * Global State
 */
const state = {
  isMinimized: false,
  sessionId: null,
  sessionStartTime: null,
  platform: 'unknown',
  isRunning: false,
  transcriptCount: 0,
  termsCount: 0,
  totalWords: 0,
  currentMetrics: null,
  collapsedPanels: new Set(),
  localTimerInterval: null  // Local timer for smooth UI updates
};

/**
 * DOM Elements
 */
const elements = {
  // Header
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  sessionTimer: document.getElementById('session-timer'),
  platformName: document.getElementById('platform-name'),

  // Panels
  transcriptionFeed: document.getElementById('transcription-feed'),
  medicalTermsFeed: document.getElementById('medical-terms-feed'),

  // Metrics
  overallScore: document.getElementById('overall-score'),
  overallInterpretation: document.getElementById('overall-interpretation'),
  wpmValue: document.getElementById('wpm-value'),
  fluencyScore: document.getElementById('fluency-score'),
  fluencyBar: document.getElementById('fluency-bar'),
  accuracyScore: document.getElementById('accuracy-score'),
  accuracyBar: document.getElementById('accuracy-bar'),
  grammarScore: document.getElementById('grammar-score'),
  grammarBar: document.getElementById('grammar-bar'),
  professionalScore: document.getElementById('professional-score'),
  professionalBar: document.getElementById('professional-bar'),
  issuesSummary: document.getElementById('issues-summary'),
  issuesList: document.getElementById('issues-list'),
  lastUpdate: document.getElementById('last-update'),

  // Footer
  totalWordsDisplay: document.getElementById('total-words'),
  totalTermsDisplay: document.getElementById('total-terms'),
  sessionIdDisplay: document.getElementById('session-id'),
  viewDashboardBtn: document.getElementById('view-dashboard-btn'),

  // Counts
  transcriptCount: document.getElementById('transcript-count'),
  termsCount: document.getElementById('terms-count'),

  // Controls
  minimizeBtn: document.getElementById('minimize-btn'),
  restoreBtn: document.getElementById('restore-btn'),
  collapseAllBtn: document.getElementById('collapse-all-btn'),

  // Containers
  overlayContainer: document.getElementById('coach-overlay-container'),
  minimizedIndicator: document.getElementById('minimized-indicator'),
  minimizedTimer: document.getElementById('minimized-timer'),
  loadingOverlay: document.getElementById('loading-overlay'),
  toastContainer: document.getElementById('toast-container')
};

/**
 * =================================================================
 * TIMER FUNCTIONS (Run locally to avoid Service Worker throttling)
 * =================================================================
 */

/**
 * Start local timer for smooth UI updates
 * Runs independently in the overlay to avoid Service Worker throttling issues
 */
function startLocalTimer() {
  // Clear any existing timer
  if (state.localTimerInterval) {
    clearInterval(state.localTimerInterval);
  }

  // Update timer every second
  state.localTimerInterval = setInterval(() => {
    if (!state.isRunning || !state.sessionStartTime) return;

    const elapsed = Date.now() - state.sessionStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const formatted = formatDuration(seconds);

    // Update UI directly
    elements.sessionTimer.textContent = formatted;
    elements.minimizedTimer.textContent = formatted;
  }, 1000);

  console.log('[Overlay] Local timer started');
}

/**
 * Stop local timer
 */
function stopLocalTimer() {
  if (state.localTimerInterval) {
    clearInterval(state.localTimerInterval);
    state.localTimerInterval = null;
    console.log('[Overlay] Local timer stopped');
  }
}

/**
 * Format duration in seconds to HH:MM:SS
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Initialize overlay
 */
function initialize() {
  console.log('[Overlay] Initializing...');

  // Set up event listeners
  setupEventListeners();

  // Listen for messages from background
  window.addEventListener('message', handleMessage);

  // Request current status
  requestStatus();

  console.log('[Overlay] Initialized');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Minimize/Restore
  elements.minimizeBtn?.addEventListener('click', toggleMinimize);
  elements.restoreBtn?.addEventListener('click', toggleMinimize);

  // Collapse all
  elements.collapseAllBtn?.addEventListener('click', collapseAllPanels);

  // Panel toggles
  document.querySelectorAll('.panel-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.target.closest('button').dataset.panel;
      togglePanel(panel);
    });
  });

  // Panel header clicks (also toggle)
  document.querySelectorAll('.panel-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (!e.target.closest('.panel-toggle')) {
        const panel = header.dataset.panel;
        togglePanel(panel);
      }
    });
  });

  // Dashboard button
  elements.viewDashboardBtn?.addEventListener('click', openDashboard);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboard(e) {
  // Ctrl/Cmd + Shift + M: Toggle minimize
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
    e.preventDefault();
    toggleMinimize();
  }
}

/**
 * Handle messages from background script
 * @param {MessageEvent} event - Message event
 */
function handleMessage(event) {
  try {
    const message = event.data;

    if (!message || !message.action) return;

    console.log('[Overlay] Message received:', message.action);

    switch (message.action) {
      case 'AGENT_OUTPUT':
        handleAgentOutput(message.payload);
        break;
      case 'STATUS_UPDATE':
        updateStatus(message.payload);
        break;
      default:
        console.log('[Overlay] Unknown message action:', message.action);
    }
  } catch (error) {
    console.error('[Overlay] Error handling message:', error);
    showToast('Failed to process update', 'error');
  }
}

/**
 * Handle agent output
 * @param {Object} payload - Agent output payload
 */
function handleAgentOutput(payload) {
  try {
    const { type, data } = payload;

    switch (type) {
      case 'TRANSCRIPTION':
        handleTranscription(data);
        break;
      case 'MEDICAL_TERM':
        handleMedicalTerm(data);
        break;
      case 'METRICS_UPDATE':
        handleMetricsUpdate(data);
        break;
      case 'TIMER_UPDATE':
        handleTimerUpdate(data);
        break;
      case 'CALL_START':
        handleCallStart(data);
        break;
      case 'SESSION_COMPLETE':
        handleSessionComplete(data);
        break;
      case 'ERROR':
        handleError(data);
        break;
      default:
        console.log('[Overlay] Unknown agent output type:', type);
    }
  } catch (error) {
    console.error('[Overlay] Error handling agent output:', error);
    showToast(`Failed to display ${payload.type}`, 'error');
  }
}

/**
 * Handle transcription update
 * @param {Object} data - Transcription data
 */
function handleTranscription(data) {
  try {
    const { text, isFinal, confidence, timestamp } = data;

    // Only display final transcriptions
    if (!isFinal) return;

    // Remove empty state if first transcript
    if (state.transcriptCount === 0) {
      elements.transcriptionFeed.innerHTML = '';
    }

    // Create transcript item
    const item = document.createElement('div');
    item.className = 'transcript-item';
    item.innerHTML = `
      <div class="transcript-time">${formatTime(timestamp)}</div>
      <div class="transcript-text">${escapeHtml(text)}</div>
      <div class="transcript-meta">
        <span class="confidence" data-confidence="${confidence}">
          ${(confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
    `;

    // Add to feed
    elements.transcriptionFeed.appendChild(item);

    // Auto-scroll to bottom
    elements.transcriptionFeed.scrollTop = elements.transcriptionFeed.scrollHeight;

    // Update count
    state.transcriptCount++;
    elements.transcriptCount.textContent = `${state.transcriptCount} lines`;

    // Update total words estimate
    state.totalWords += text.split(/\s+/).length;
    elements.totalWordsDisplay.textContent = state.totalWords;
  } catch (error) {
    console.error('[Overlay] Error displaying transcription:', error);
    // Don't show toast for every transcription error (too frequent)
  }
}

/**
 * Handle medical term detection
 * @param {Object} data - Medical term data
 */
function handleMedicalTerm(data) {
  try {
    const { original, translation, phonetics, definition, context, timestamp } = data;

    // Remove empty state if first term
    if (state.termsCount === 0) {
      elements.medicalTermsFeed.innerHTML = '';
    }

    // Create term card
    const card = document.createElement('div');
    card.className = 'term-card';
    card.innerHTML = `
      <div class="term-header">
        <div class="term-original">${escapeHtml(original)}</div>
        <div class="term-time">${formatTime(timestamp)}</div>
      </div>
      <div class="term-translation">
        <span class="term-label">Translation:</span>
        <span class="term-value">${escapeHtml(translation)}</span>
      </div>
      <div class="term-phonetics">
        <span class="term-label">Pronunciation:</span>
        <span class="term-value phonetic">${escapeHtml(phonetics)}</span>
      </div>
      ${definition ? `
        <div class="term-definition">
          <span class="term-label">Definition:</span>
          <span class="term-value">${escapeHtml(definition)}</span>
        </div>
      ` : ''}
      ${context ? `
        <div class="term-context">
          <span class="term-label">Context:</span>
          <span class="term-value">"${escapeHtml(context)}"</span>
        </div>
      ` : ''}
    `;

    // Add to feed (prepend so newest is at top)
    elements.medicalTermsFeed.insertBefore(card, elements.medicalTermsFeed.firstChild);

    // Update count
    state.termsCount++;
    elements.termsCount.textContent = `${state.termsCount} terms`;
    elements.totalTermsDisplay.textContent = state.termsCount;

    // Show notification
    showToast(`Medical term detected: ${original}`, 'info');
  } catch (error) {
    console.error('[Overlay] Error displaying medical term:', error);
    showToast('Failed to display medical term', 'error');
  }
}

/**
 * Handle metrics update
 * @param {Object} data - Metrics data
 */
function handleMetricsUpdate(data) {
  try {
    const { metrics, timestamp } = data;

    state.currentMetrics = metrics;

    // Update overall score
    if (metrics.overallScore !== undefined) {
      elements.overallScore.textContent = Math.round(metrics.overallScore);
      elements.overallInterpretation.textContent = interpretScore(metrics.overallScore);
      elements.overallInterpretation.className = `metric-interpretation ${getScoreClass(metrics.overallScore)}`;
    }

    // Update WPM
    if (metrics.averageWPM !== undefined) {
      elements.wpmValue.textContent = Math.round(metrics.averageWPM);
    }

    // Update category scores
    updateCategoryScore('fluency', metrics.fluency?.score);
    updateCategoryScore('accuracy', metrics.accuracy?.score);
    updateCategoryScore('grammar', metrics.grammar?.score);
    updateCategoryScore('professional', metrics.professionalConduct?.score);

    // Update issues summary
    updateIssuesSummary(metrics);

    // Update last update time
    elements.lastUpdate.textContent = formatTime(timestamp);
  } catch (error) {
    console.error('[Overlay] Error updating metrics:', error);
    showToast('Failed to update metrics', 'error');
  }
}

/**
 * Update category score and bar
 * @param {string} category - Category name
 * @param {number} score - Score value
 */
function updateCategoryScore(category, score) {
  if (score === undefined) return;

  const scoreElement = elements[`${category}Score`];
  const barElement = elements[`${category}Bar`];

  if (scoreElement) {
    scoreElement.textContent = Math.round(score);
  }

  if (barElement) {
    barElement.style.width = `${score}%`;
    barElement.className = `metric-bar-fill ${getScoreClass(score)}`;
  }
}

/**
 * Update issues summary
 * @param {Object} metrics - Metrics object
 */
function updateIssuesSummary(metrics) {
  const issues = [];

  // Check for critical issues
  if (metrics.professionalConduct?.firstPersonViolations?.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'Professional Conduct',
      count: metrics.professionalConduct.firstPersonViolations.length,
      message: 'First-person violations detected'
    });
  }

  // Check for high-priority issues
  if (metrics.fluency?.fillerWords?.length > 10) {
    issues.push({
      severity: 'high',
      category: 'Fluency',
      count: metrics.fluency.fillerWords.length,
      message: 'Excessive filler words'
    });
  }

  if (metrics.grammar?.errors?.length > 5) {
    issues.push({
      severity: 'high',
      category: 'Grammar',
      count: metrics.grammar.errors.length,
      message: 'Multiple grammar errors'
    });
  }

  // Show or hide issues summary
  if (issues.length > 0) {
    elements.issuesSummary.style.display = 'block';
    elements.issuesList.innerHTML = issues.map(issue => `
      <div class="issue-item severity-${issue.severity}">
        <div class="issue-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="issue-content">
          <div class="issue-header">
            <span class="issue-category">${issue.category}</span>
            <span class="issue-count">${issue.count}</span>
          </div>
          <div class="issue-message">${issue.message}</div>
        </div>
      </div>
    `).join('');
  } else {
    elements.issuesSummary.style.display = 'none';
  }
}

/**
 * Handle timer update
 * @param {Object} data - Timer data
 */
function handleTimerUpdate(data) {
  const { duration } = data;

  if (duration && duration.formatted) {
    elements.sessionTimer.textContent = duration.formatted;
    elements.minimizedTimer.textContent = duration.formatted;
  }
}

/**
 * Handle call start
 * @param {Object} data - Call start data
 */
function handleCallStart(data) {
  state.isRunning = true;
  state.sessionId = data.sessionId;
  state.sessionStartTime = data.timestamp;
  state.platform = data.platform || 'unknown';

  // Update UI
  elements.statusIndicator.className = 'status-indicator status-active';
  elements.statusText.textContent = 'Active';
  elements.platformName.textContent = formatPlatformName(state.platform);
  elements.sessionIdDisplay.textContent = formatSessionId(state.sessionId);

  // Start local timer for smooth second-by-second updates
  startLocalTimer();

  showToast('Session started', 'success');
}

/**
 * Handle session complete
 * @param {Object} data - Session complete data
 */
function handleSessionComplete(data) {
  state.isRunning = false;

  // Stop local timer
  stopLocalTimer();

  // Update UI
  elements.statusIndicator.className = 'status-indicator status-stopped';
  elements.statusText.textContent = 'Stopped';

  // Show dashboard button
  elements.viewDashboardBtn.style.display = 'block';

  showToast('Session complete. View your performance report!', 'success');
}

/**
 * Handle error
 * @param {Object} data - Error data
 */
function handleError(data) {
  const { source, message, recoverable } = data;

  console.error('[Overlay] Error from', source, ':', message);

  const severity = recoverable ? 'warning' : 'error';
  showToast(`${source}: ${message}`, severity);
}

/**
 * Update status from background
 * @param {Object} status - Status object
 */
function updateStatus(status) {
  if (status.isRunning) {
    state.isRunning = true;
    elements.statusIndicator.className = 'status-indicator status-active';
    elements.statusText.textContent = 'Active';
  } else {
    state.isRunning = false;
    elements.statusIndicator.className = 'status-indicator status-stopped';
    elements.statusText.textContent = 'Ready';
  }
}

/**
 * Toggle minimize state
 */
function toggleMinimize() {
  state.isMinimized = !state.isMinimized;

  if (state.isMinimized) {
    // Hide the overlay UI
    elements.overlayContainer.style.display = 'none';
    elements.minimizedIndicator.style.display = 'flex';

    // Send message to content script to hide iframe
    window.parent.postMessage({
      action: 'HIDE_OVERLAY',
      source: 'coach-overlay'
    }, '*');
  } else {
    // Show the overlay UI
    elements.overlayContainer.style.display = 'flex';
    elements.minimizedIndicator.style.display = 'none';

    // Send message to content script to show iframe
    window.parent.postMessage({
      action: 'SHOW_OVERLAY',
      source: 'coach-overlay'
    }, '*');
  }
}

/**
 * Toggle panel collapsed state
 * @param {string} panelName - Panel name
 */
function togglePanel(panelName) {
  const panel = document.getElementById(`${panelName}-panel`);
  const content = document.getElementById(`${panelName}-content`);
  const toggle = panel.querySelector('.panel-toggle');

  if (state.collapsedPanels.has(panelName)) {
    // Expand
    state.collapsedPanels.delete(panelName);
    content.style.display = 'block';
    panel.classList.remove('collapsed');
    toggle.style.transform = 'rotate(0deg)';
  } else {
    // Collapse
    state.collapsedPanels.add(panelName);
    content.style.display = 'none';
    panel.classList.add('collapsed');
    toggle.style.transform = 'rotate(-90deg)';
  }
}

/**
 * Collapse all panels
 */
function collapseAllPanels() {
  const panels = ['transcription', 'medical-terms', 'metrics'];

  panels.forEach(panel => {
    if (!state.collapsedPanels.has(panel)) {
      togglePanel(panel);
    }
  });
}

/**
 * Open dashboard
 */
function openDashboard() {
  // TODO: Open dashboard.html in new tab
  console.log('[Overlay] Opening dashboard...');
  showToast('Dashboard coming soon!', 'info');
}

/**
 * Request status from background
 */
function requestStatus() {
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response) {
      updateStatus(response);
    }
  });
}

/**
 * Show toast notification
 * @param {string} message - Message text
 * @param {string} type - Type: success, error, warning, info
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Utility: Format timestamp
 * @param {number} timestamp - Timestamp in ms
 * @returns {string} Formatted time
 */
function formatTime(timestamp) {
  if (!timestamp) return '--:--';

  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Utility: Format platform name
 * @param {string} platform - Platform identifier
 * @returns {string} Formatted name
 */
function formatPlatformName(platform) {
  const names = {
    'google-meet': 'Google Meet',
    'zoom': 'Zoom',
    'microsoft-teams': 'Microsoft Teams',
    'twilio': 'Twilio',
    'unknown': 'Unknown'
  };

  return names[platform] || platform;
}

/**
 * Utility: Format session ID
 * @param {string} sessionId - Full session ID
 * @returns {string} Short session ID
 */
function formatSessionId(sessionId) {
  if (!sessionId) return 'N/A';
  return sessionId.split('_').pop().substring(0, 8);
}

/**
 * Utility: Interpret score
 * @param {number} score - Score value
 * @returns {string} Interpretation
 */
function interpretScore(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Proficient';
  if (score >= 70) return 'Developing';
  return 'Needs Improvement';
}

/**
 * Utility: Get score class for styling
 * @param {number} score - Score value
 * @returns {string} CSS class
 */
function getScoreClass(score) {
  if (score >= 90) return 'score-excellent';
  if (score >= 80) return 'score-proficient';
  if (score >= 70) return 'score-developing';
  return 'score-needs-improvement';
}

/**
 * Utility: Escape HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
