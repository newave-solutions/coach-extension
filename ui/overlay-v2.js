// ===================================================================
// InterpreCoach Overlay V2 JavaScript
// Handles all UI interactions and message passing
// FIXED: Start button, theme toggle, and event handling
// ===================================================================

console.log('[OverlayV2] Initializing...');

// State
let sessionState = {
  isActive: false,
  sessionId: null,
  platform: 'Unknown',
  startTime: null,
  transcriptionCount: 0,
  termsCount: 0
};

// DOM Elements
const elements = {
  toggleBtn: null,
  themeToggle: null,
  settingsBtn: null,
  micIndicator: null,
  languageSelect: null,
  transcriptionFeed: null,
  transcriptionCount: null,
  medicalTermsList: null,
  termsCount: null,
  insightsList: null,
  notesTextarea: null,
  saveNotesBtn: null,
  paceValue: null,
  paceIndicator: null,
  toneValue: null,
  toneIndicator: null,
  deliveryChart: null,
  interpreterOutput: null,
  manualInput: null,
  sendInputBtn: null,
  overlay: null,
  header: null
};

// Initialize DOM elements
function initializeElements() {
  elements.toggleBtn = document.getElementById('session-toggle-btn');
  elements.themeToggle = document.getElementById('theme-toggle');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.micIndicator = document.getElementById('mic-indicator');
  elements.languageSelect = document.getElementById('target-language');
  elements.transcriptionFeed = document.getElementById('transcription-feed');
  elements.transcriptionCount = document.getElementById('transcription-count');
  elements.medicalTermsList = document.getElementById('medical-terms-list');
  elements.termsCount = document.getElementById('terms-count');
  elements.insightsList = document.getElementById('insights-list');
  elements.notesTextarea = document.getElementById('notes-textarea');
  elements.saveNotesBtn = document.getElementById('save-notes-btn');
  elements.paceValue = document.getElementById('pace-value');
  elements.paceIndicator = document.getElementById('pace-indicator');
  elements.toneValue = document.getElementById('tone-value');
  elements.toneIndicator = document.getElementById('tone-indicator');
  elements.deliveryChart = document.getElementById('delivery-chart');
  elements.interpreterOutput = document.getElementById('interpreter-output');
  elements.manualInput = document.getElementById('manual-input');
  elements.sendInputBtn = document.getElementById('send-input-btn');
  elements.overlay = document.getElementById('interprecoach-overlay');
  elements.header = document.querySelector('.overlay-header');

  // Log initialization
  console.log('[OverlayV2] DOM Elements initialized:', {
    toggleBtn: !!elements.toggleBtn,
    themeToggle: !!elements.themeToggle,
    overlay: !!elements.overlay
  });
}

// Initialize
function initialize() {
  console.log('[OverlayV2] Setting up event listeners...');

  // Initialize DOM elements first
  initializeElements();

  // Verify critical elements
  if (!elements.overlay) {
    console.error('[OverlayV2] ✗ Overlay container not found!');
    return;
  }

  // Add default theme class
  if (!elements.overlay.classList.contains('theme-default') && !elements.overlay.classList.contains('theme-inverted')) {
    elements.overlay.classList.add('theme-default');
    console.log('[OverlayV2] ✓ Default theme applied');
  }

  // Session toggle - with null check
  if (elements.toggleBtn) {
    elements.toggleBtn.addEventListener('click', handleSessionToggle);
    console.log('[OverlayV2] ✓ Start button listener attached');
  } else {
    console.error('[OverlayV2] ✗ Start button not found!');
  }

  // Theme toggle - with null check and click test
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', (e) => {
      console.log('[OverlayV2] Theme toggle clicked!', e);
      handleThemeToggle();
    });
    console.log('[OverlayV2] ✓ Theme toggle listener attached');
  } else {
    console.error('[OverlayV2] ✗ Theme toggle button not found!');
  }

  // Settings button
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', handleSettings);
  }

  // Drag functionality
  if (elements.header) {
    setupDragFunctionality();
  }

  // Widget controls
  setupWidgetControls();

  // Save notes - with null check
  if (elements.saveNotesBtn) {
    elements.saveNotesBtn.addEventListener('click', saveNotes);
  }

  // Send manual input - with null checks
  if (elements.sendInputBtn) {
    elements.sendInputBtn.addEventListener('click', sendManualInput);
  }
  if (elements.manualInput) {
    elements.manualInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendManualInput();
      }
    });
  }

  // Language change - with null check
  if (elements.languageSelect) {
    elements.languageSelect.addEventListener('change', handleLanguageChange);
  }

  // Listen for messages from parent
  window.addEventListener('message', handleMessage);

  // Restore theme preference
  restoreTheme();

  console.log('[OverlayV2] ✓ Initialized successfully');
  console.log('[OverlayV2] Current theme:', elements.overlay.classList.contains('theme-inverted') ? 'inverted' : 'default');
}

// Setup drag functionality
function setupDragFunctionality() {
  let isDragging = false;
  let offset = { x: 0, y: 0 };

  elements.header.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on buttons
    if (e.target.closest('button') || e.target.closest('select')) {
      return;
    }

    isDragging = true;
    offset.x = e.clientX - elements.overlay.getBoundingClientRect().left;
    offset.y = e.clientY - elements.overlay.getBoundingClientRect().top;
    elements.header.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    elements.overlay.style.left = `${e.clientX - offset.x}px`;
    elements.overlay.style.top = `${e.clientY - offset.y}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      elements.header.style.cursor = 'move';
    }
  });
}

// Handle theme toggle - FIXED
function handleThemeToggle() {
  console.log('[OverlayV2] handleThemeToggle called');

  if (!elements.overlay) {
    console.error('[OverlayV2] Overlay element not found');
    return;
  }

  // Toggle theme classes
  const wasInverted = elements.overlay.classList.contains('theme-inverted');

  if (wasInverted) {
    elements.overlay.classList.remove('theme-inverted');
    elements.overlay.classList.add('theme-default');
  } else {
    elements.overlay.classList.remove('theme-default');
    elements.overlay.classList.add('theme-inverted');
  }

  const isNowInverted = elements.overlay.classList.contains('theme-inverted');

  // Save preference to localStorage
  try {
    localStorage.setItem('interprecoach-theme', isNowInverted ? 'inverted' : 'default');
    console.log('[OverlayV2] ✓ Theme toggled to:', isNowInverted ? 'inverted' : 'default');
  } catch (error) {
    console.error('[OverlayV2] Failed to save theme:', error);
  }

  // Visual feedback
  if (elements.themeToggle) {
    elements.themeToggle.style.transform = 'scale(1.2)';
    setTimeout(() => {
      elements.themeToggle.style.transform = 'scale(1)';
    }, 200);
  }
}

// Restore theme from localStorage
function restoreTheme() {
  try {
    const savedTheme = localStorage.getItem('interprecoach-theme');
    console.log('[OverlayV2] Restoring saved theme:', savedTheme);

    if (savedTheme === 'inverted') {
      elements.overlay.classList.remove('theme-default');
      elements.overlay.classList.add('theme-inverted');
    } else {
      elements.overlay.classList.remove('theme-inverted');
      elements.overlay.classList.add('theme-default');
    }
  } catch (error) {
    console.error('[OverlayV2] Failed to restore theme:', error);
  }
}

// Handle settings
function handleSettings() {
  console.log('[OverlayV2] Settings clicked');
  showToast('Settings panel coming soon!', 'info');
  // TODO: Implement settings menu
}

// Setup widget controls (minimize/close)
function setupWidgetControls() {
  const widgets = document.querySelectorAll('.panel');

  widgets.forEach(widget => {
    const minimizeBtn = widget.querySelector('.widget-minimize');
    const closeBtn = widget.querySelector('.widget-close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.classList.toggle('minimized');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.style.opacity = '0';
        widget.style.transform = 'scale(0.9)';
        setTimeout(() => widget.style.display = 'none', 300);
      });
    }
  });
}

// Handle session toggle (Start/Stop) - FIXED
async function handleSessionToggle() {
  console.log('[OverlayV2] handleSessionToggle called, current state:', sessionState.isActive);

  if (sessionState.isActive) {
    await stopSession();
  } else {
    await startSession();
  }
}

// Start session - ENHANCED WITH LOADING & ERROR HANDLING
async function startSession() {
  console.log('[OverlayV2] Starting session...');

  // Prevent multiple clicks
  if (sessionState.isActive || elements.toggleBtn.dataset.state === 'loading') {
    console.log('[OverlayV2] Already starting or active, ignoring');
    return;
  }

  try {
    // Set loading state
    elements.toggleBtn.dataset.state = 'loading';
    const btnText = elements.toggleBtn.querySelector('.btn-text');
    const btnSpinner = elements.toggleBtn.querySelector('.btn-spinner');

    if (btnText) btnText.textContent = 'Starting...';
    if (btnSpinner) btnSpinner.style.display = 'inline';
    elements.toggleBtn.disabled = true;

    // Send message to parent (content script)
    window.parent.postMessage({
      source: 'interprecoach-overlay',
      action: 'START_SESSION',
      language: elements.languageSelect ? elements.languageSelect.value : 'es'
    }, '*');

    // Clear existing content
    clearAllPanels();

    // Start timeout for failure detection (10 seconds)
    const timeoutId = setTimeout(() => {
      if (!sessionState.isActive) {
        console.error('[OverlayV2] Session start timed out');
        handleStartFailure('Session start timed out. Please check your internet connection and try again.');
      }
    }, 10000);

    // Store timeout ID for cleanup
    sessionState.startTimeoutId = timeoutId;

    console.log('[OverlayV2] Session start requested, waiting for response...');
  } catch (error) {
    console.error('[OverlayV2] Failed to start session:', error);
    handleStartFailure(error.message || 'Failed to start session');
  }
}

// Handle start failure
function handleStartFailure(errorMessage) {
  console.error('[OverlayV2] Start failed:', errorMessage);

  // Clear timeout
  if (sessionState.startTimeoutId) {
    clearTimeout(sessionState.startTimeoutId);
    sessionState.startTimeoutId = null;
  }

  // Reset button
  elements.toggleBtn.dataset.state = 'inactive';
  const btnText = elements.toggleBtn.querySelector('.btn-text');
  const btnSpinner = elements.toggleBtn.querySelector('.btn-spinner');

  if (btnText) btnText.textContent = 'Start Session';
  if (btnSpinner) btnSpinner.style.display = 'none';
  elements.toggleBtn.disabled = false;

  // Reset microphone indicator
  if (elements.micIndicator) {
    elements.micIndicator.classList.remove('text-green-400');
    elements.micIndicator.classList.add('text-gray-400');
  }

  // Show error
  showError(errorMessage);
}

// Stop session - FIXED
async function stopSession() {
  console.log('[OverlayV2] Stopping session...');

  try {
    // Send message to parent
    window.parent.postMessage({
      source: 'interprecoach-overlay',
      action: 'STOP_SESSION',
      notes: elements.notesTextarea ? elements.notesTextarea.value : ''
    }, '*');

    // Update UI
    if (elements.toggleBtn) {
      elements.toggleBtn.textContent = 'Start Session';
      elements.toggleBtn.dataset.state = 'inactive';
    }

    // Update state
    sessionState.isActive = false;

    // Show feedback
    showToast('Session stopped', 'info');

    console.log('[OverlayV2] ✓ Session stopped');
  } catch (error) {
    console.error('[OverlayV2] Failed to stop session:', error);
  }
}

// Handle incoming messages
function handleMessage(event) {
  const message = event.data;

  // Verify message source
  if (!message || !message.action) return;

  console.log('[OverlayV2] Message received:', message.action);

  switch (message.action) {
    case 'AGENT_OUTPUT':
      handleAgentOutput(message.payload);
      break;
    case 'SESSION_STATE_UPDATE':
      handleSessionStateUpdate(message.state);
      break;
    case 'TIMER_UPDATE':
      handleTimerUpdate(message.data);
      break;
    default:
      console.log('[OverlayV2] Unknown message action:', message.action);
  }
}

// Handle agent output
function handleAgentOutput(payload) {
  if (!payload || !payload.type) return;

  console.log('[OverlayV2] Agent output received:', payload.type);

  switch (payload.type) {
    case 'TRANSCRIPTION':
      handleTranscription(payload.data);
      break;

    case 'MEDICAL_TERM':
      handleMedicalTerm(payload.data);
      break;

    case 'METRICS_UPDATE':
      handleMetricsUpdate(payload.data);
      break;

    case 'SESSION_COMPLETE':
      handleSessionComplete(payload.data);
      break;

    default:
      console.log('[OverlayV2] Unknown output type:', payload.type);
  }
}

// Handle transcription
function handleTranscription(data) {
  if (!data || !data.text || !elements.transcriptionFeed) return;

  // Remove empty state if first transcription
  const emptyState = elements.transcriptionFeed.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Create transcription item
  const item = document.createElement('div');
  item.className = 'transcription-item';
  item.innerHTML = `
    <div class="transcription-text">${escapeHtml(data.text)}</div>
    <div class="transcription-meta">
      ${data.confidence ? `<span class="confidence">Confidence: ${Math.round(data.confidence * 100)}%</span>` : ''}
      ${data.timestamp ? `<span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>` : ''}
    </div>
  `;

  elements.transcriptionFeed.appendChild(item);

  // Auto-scroll to bottom
  elements.transcriptionFeed.scrollTop = elements.transcriptionFeed.scrollHeight;

  // Update count
  sessionState.transcriptionCount++;
  if (elements.transcriptionCount) {
    elements.transcriptionCount.textContent = sessionState.transcriptionCount;
  }
}

// Handle medical term detection
function handleMedicalTerm(data) {
  console.log('[OverlayV2] Medical term detected:', data);

  if (!data || !data.original) return;
  if (!elements.medicalTermsList) return;

  // Remove empty state if first term
  const emptyState = elements.medicalTermsList.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Create medical term card
  const card = document.createElement('div');
  card.className = 'term-card';
  card.innerHTML = `
    <div class="term-original">${escapeHtml(data.original)}</div>
    ${data.translation ?
      `<div class="term-translation">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="10"></circle>
           <line x1="2" y1="12" x2="22" y2="12"></line>
           <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
         </svg>
         <span>${escapeHtml(data.translation)}</span>
       </div>` : ''}
    ${data.phonetics ?
      `<div class="term-phonetics">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
           <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
         </svg>
         <span>[${escapeHtml(data.phonetics)}]</span>
       </div>` : ''}
    ${data.definition ?
      `<div class="term-definition">${escapeHtml(data.definition)}</div>` : ''}
    ${data.context ?
      `<div class="term-context">
         <em>"${escapeHtml(data.context)}"</em>
       </div>` : ''}
  `;

  // Add to list
  elements.medicalTermsList.appendChild(card);

  // Auto-scroll to show latest term
  elements.medicalTermsList.scrollTop = elements.medicalTermsList.scrollHeight;

  // Update count
  sessionState.termsCount++;
  if (elements.termsCount) {
    elements.termsCount.textContent = `${sessionState.termsCount} term${sessionState.termsCount !== 1 ? 's' : ''}`;
  }

  console.log('[OverlayV2] Medical term displayed:', data.original);
}

// Handle metrics update
function handleMetricsUpdate(data) {
  if (!data) return;

  // Update delivery metrics
  if (data.pace && elements.paceValue) {
    elements.paceValue.textContent = `${data.pace} WPM`;
    if (elements.paceIndicator) {
      elements.paceIndicator.textContent = data.paceStatus || 'Optimal';
      elements.paceIndicator.style.background = getPaceColor(data.paceStatus);
    }
  }

  if (data.tone && elements.toneValue) {
    elements.toneValue.textContent = data.tone;
    if (elements.toneIndicator) {
      elements.toneIndicator.textContent = data.toneStatus || 'Good';
    }
  }

  // Update chart if available
  if (data.paceHistory && data.paceHistory.length > 0 && elements.deliveryChart) {
    updateDeliveryChart(data.paceHistory);
  }
}

// Handle key insight
function handleKeyInsight(data) {
  if (!data || !data.text || !elements.insightsList) return;

  // Remove empty state
  const emptyState = elements.insightsList.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  // Create insight item
  const item = document.createElement('div');
  item.className = 'insight-item';
  item.textContent = data.text;

  elements.insightsList.appendChild(item);
}

// Update delivery chart
function updateDeliveryChart(history) {
  if (!elements.deliveryChart) return;

  elements.deliveryChart.innerHTML = '';

  const maxValue = Math.max(...history.map(h => h.value));

  history.slice(-15).forEach(item => {
    const bar = document.createElement('div');
    const heightPercent = (item.value / maxValue) * 100;
    bar.style.cssText = `
      flex: 1;
      height: ${heightPercent}%;
      background: ${getBarColor(item.value)};
      border-radius: 2px 2px 0 0;
    `;
    elements.deliveryChart.appendChild(bar);
  });
}

// Get bar color based on value
function getBarColor(value) {
  if (value >= 140 && value <= 160) return '#4ADE80'; // Green - Optimal
  if (value >= 120 && value < 140) return '#60A5FA'; // Blue - Good
  if (value >= 160 && value < 180) return '#FACC15'; // Yellow - Fast
  return '#DC143C'; // Red - Too fast/slow
}

// Get pace color
function getPaceColor(status) {
  if (status === 'Optimal') return 'rgba(74, 222, 128, 0.2)';
  if (status === 'Good') return 'rgba(96, 165, 250, 0.2)';
  if (status === 'Fast') return 'rgba(250, 204, 21, 0.2)';
  return 'rgba(220, 20, 60, 0.2)';
}

// Handle session state update - ENHANCED
function handleSessionStateUpdate(state) {
  console.log('[OverlayV2] Session state update received:', state);

  sessionState = { ...sessionState, ...state };

  // Clear start timeout if active
  if (sessionState.startTimeoutId) {
    clearTimeout(sessionState.startTimeoutId);
    sessionState.startTimeoutId = null;
  }

  const btnText = elements.toggleBtn?.querySelector('.btn-text');
  const btnSpinner = elements.toggleBtn?.querySelector('.btn-spinner');

  if (state.isActive) {
    // Session started successfully
    if (elements.toggleBtn) {
      elements.toggleBtn.dataset.state = 'active';
      if (btnText) btnText.textContent = 'Stop Session';
      if (btnSpinner) btnSpinner.style.display = 'none';
      elements.toggleBtn.disabled = false;
    }

    // Update microphone indicator
    if (elements.micIndicator) {
      elements.micIndicator.classList.remove('text-gray-400');
      elements.micIndicator.classList.add('text-green-400');
    }

    // Show success feedback
    showToast('Session started successfully!', 'success');

  } else {
    // Session stopped or failed
    if (elements.toggleBtn) {
      elements.toggleBtn.dataset.state = 'inactive';
      if (btnText) btnText.textContent = 'Start Session';
      if (btnSpinner) btnSpinner.style.display = 'none';
      elements.toggleBtn.disabled = false;
    }

    // Update microphone indicator
    if (elements.micIndicator) {
      elements.micIndicator.classList.remove('text-green-400');
      elements.micIndicator.classList.add('text-gray-400');
    }
  }

  // Handle error in state update
  if (state.error) {
    showError(state.error);
  }

  console.log('[OverlayV2] Session state updated, isActive:', sessionState.isActive);
}

// Handle timer update
function handleTimerUpdate(data) {
  // Timer display could be added to header if needed
  console.log('[OverlayV2] Timer:', data.formatted);
}

// Clear all panels
function clearAllPanels() {
  if (elements.transcriptionFeed) {
    elements.transcriptionFeed.innerHTML = '<div class="empty-state">Listening for audio...</div>';
  }
  if (elements.medicalTermsList) {
    elements.medicalTermsList.innerHTML = '<div class="empty-state">Detecting medical terms...</div>';
  }
  if (elements.insightsList) {
    elements.insightsList.innerHTML = '<div class="empty-state">Analyzing conversation...</div>';
  }
  if (elements.interpreterOutput) {
    elements.interpreterOutput.innerHTML = '<div class="empty-state">Translating...</div>';
  }

  sessionState.transcriptionCount = 0;
  sessionState.termsCount = 0;
  if (elements.transcriptionCount) elements.transcriptionCount.textContent = '0';
  if (elements.termsCount) elements.termsCount.textContent = '0 terms';
}

// Handle language change
function handleLanguageChange() {
  if (!elements.languageSelect) return;

  console.log('[OverlayV2] Language changed to:', elements.languageSelect.value);

  // Send to background if needed
  window.parent.postMessage({
    source: 'interprecoach-overlay',
    action: 'LANGUAGE_CHANGE',
    language: elements.languageSelect.value
  }, '*');

  showToast(`Language changed to ${elements.languageSelect.options[elements.languageSelect.selectedIndex].text}`, 'info');
}

// Save notes
function saveNotes() {
  if (!elements.notesTextarea) return;

  const notes = elements.notesTextarea.value;
  console.log('[OverlayV2] Saving notes...');

  // Send to background for storage
  window.parent.postMessage({
    source: 'interprecoach-overlay',
    action: 'SAVE_NOTES',
    notes: notes,
    sessionId: sessionState.sessionId
  }, '*');

  showToast('Notes saved', 'success');
}

// Send manual input
function sendManualInput() {
  if (!elements.manualInput) return;

  const input = elements.manualInput.value.trim();
  if (!input) return;

  console.log('[OverlayV2] Sending manual input:', input);

  // Send to background
  window.parent.postMessage({
    source: 'interprecoach-overlay',
    action: 'MANUAL_INPUT',
    input: input
  }, '*');

  elements.manualInput.value = '';
  showToast('Input sent', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
  console.log(`[OverlayV2] Toast (${type}):`, message);

  // Create simple toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: ${type === 'success' ? '#4ADE80' : type === 'error' ? '#DC143C' : '#DAA520'};
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid ${type === 'success' ? '#4ADE80' : type === 'error' ? '#DC143C' : '#DAA520'};
    z-index: 10000;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    animation: slideInUp 0.3s ease;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Show error notification
function showError(message) {
  console.error('[OverlayV2] Error:', message);

  // Create error toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.innerHTML = `
    <i class="fa-solid fa-exclamation-triangle"></i>
    <span>${escapeHtml(message)}</span>
  `;

  document.body.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Escape HTML to prevent XSS
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

console.log('[OverlayV2] Script loaded');
