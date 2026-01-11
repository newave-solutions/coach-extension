// ===================================================================
// InterpreCoach Overlay V2 JavaScript
// Handles all UI interactions and message passing
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
  toggleBtn: document.getElementById('session-toggle-btn'),
  minimizeBtn: document.getElementById('minimize-btn'),
  languageSelect: document.getElementById('target-language'),
  transcriptionFeed: document.getElementById('transcription-feed'),
  transcriptionCount: document.getElementById('transcription-count'),
  medicalTermsList: document.getElementById('medical-terms-list'),
  termsCount: document.getElementById('terms-count'),
  insightsList: document.getElementById('insights-list'),
  notesTextarea: document.getElementById('notes-textarea'),
  saveNotesBtn: document.getElementById('save-notes-btn'),
  paceValue: document.getElementById('pace-value'),
  paceIndicator: document.getElementById('pace-indicator'),
  toneValue: document.getElementById('tone-value'),
  toneIndicator: document.getElementById('tone-indicator'),
  deliveryChart: document.getElementById('delivery-chart'),
  interpreterOutput: document.getElementById('interpreter-output'),
  manualInput: document.getElementById('manual-input'),
  sendInputBtn: document.getElementById('send-input-btn'),
  overlay: document.getElementById('interprecoach-overlay')
};

// Initialize
function initialize() {
  console.log('[OverlayV2] Setting up event listeners...');
  
  // Session toggle
  elements.toggleBtn.addEventListener('click', handleSessionToggle);
  
  // Minimize
  elements.minimizeBtn.addEventListener('click', handleMinimize);
  
  // Save notes
  elements.saveNotesBtn.addEventListener('click', saveNotes);
  
  // Send manual input
  elements.sendInputBtn.addEventListener('click', sendManualInput);
  elements.manualInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendManualInput();
  });
  
  // Language change
  elements.languageSelect.addEventListener('change', handleLanguageChange);
  
  // Listen for messages from parent
  window.addEventListener('message', handleMessage);
  
  console.log('[OverlayV2] Initialized successfully');
}

// Handle session toggle (Start/Stop)
async function handleSessionToggle() {
  if (sessionState.isActive) {
    await stopSession();
  } else {
    await startSession();
  }
}

// Start session
async function startSession() {
  console.log('[OverlayV2] Starting session...');
  
  try {
    // Send message to parent (content script)
    window.parent.postMessage({
      source: 'interprecoach-overlay',
      action: 'START_SESSION',
      language: elements.languageSelect.value
    }, '*');
    
    // Update UI
    sessionState.isActive = true;
    elements.toggleBtn.textContent = 'Stop Session';
    elements.toggleBtn.dataset.state = 'active';
    
    // Clear existing content
    clearAllPanels();
    
    console.log('[OverlayV2] Session start requested');
  } catch (error) {
    console.error('[OverlayV2] Failed to start session:', error);
    showToast('Failed to start session', 'error');
  }
}

// Stop session
async function stopSession() {
  console.log('[OverlayV2] Stopping session...');
  
  try {
    // Send message to parent
    window.parent.postMessage({
      source: 'interprecoach-overlay',
      action: 'STOP_SESSION',
      notes: elements.notesTextarea.value
    }, '*');
    
    // Update UI
    sessionState.isActive = false;
    elements.toggleBtn.textContent = 'Start Session';
    elements.toggleBtn.dataset.state = 'inactive';
    
    console.log('[OverlayV2] Session stopped');
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
  
  console.log('[OverlayV2] Agent output:', payload.type);
  
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
    case 'KEY_INSIGHT':
      handleKeyInsight(payload.data);
      break;
    default:
      console.log('[OverlayV2] Unknown payload type:', payload.type);
  }
}

// Handle transcription
function handleTranscription(data) {
  if (!data || !data.text) return;
  
  // Remove empty state if present
  const emptyState = elements.transcriptionFeed.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  // Create transcription item
  const item = document.createElement('div');
  item.className = 'transcription-item';
  item.innerHTML = `
    <div class="transcription-speaker">${data.speaker || 'Speaker'}:</div>
    <div class="transcription-text">${escapeHtml(data.text)}</div>
    ${data.confidence ? `<div class="transcription-confidence">Confidence: ${Math.round(data.confidence * 100)}%</div>` : ''}
  `;
  
  elements.transcriptionFeed.appendChild(item);
  
  // Auto-scroll
  elements.transcriptionFeed.scrollTop = elements.transcriptionFeed.scrollHeight;
  
  // Update count
  sessionState.transcriptionCount++;
  elements.transcriptionCount.textContent = sessionState.transcriptionCount;
}

// Handle medical term
function handleMedicalTerm(data) {
  if (!data || !data.term) return;
  
  // Remove empty state
  const emptyState = elements.medicalTermsList.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  // Create term card
  const card = document.createElement('div');
  card.className = 'term-card';
  card.innerHTML = `
    <div class="term-english">${escapeHtml(data.term)}</div>
    ${data.translation ? `<div class="term-translation">${escapeHtml(data.translation)}</div>` : ''}
    ${data.phonetic ? `<div class="term-phonetic">[${escapeHtml(data.phonetic)}]</div>` : ''}
  `;
  
  elements.medicalTermsList.appendChild(card);
  
  // Update count
  sessionState.termsCount++;
  elements.termsCount.textContent = `${sessionState.termsCount} terms`;
}

// Handle metrics update
function handleMetricsUpdate(data) {
  if (!data) return;
  
  // Update delivery metrics
  if (data.pace) {
    elements.paceValue.textContent = `${data.pace} WPM`;
    elements.paceIndicator.textContent = data.paceStatus || 'Optimal';
    elements.paceIndicator.style.background = getPaceColor(data.paceStatus);
  }
  
  if (data.tone) {
    elements.toneValue.textContent = data.tone;
    elements.toneIndicator.textContent = data.toneStatus || 'Good';
  }
  
  // Update chart if available
  if (data.paceHistory && data.paceHistory.length > 0) {
    updateDeliveryChart(data.paceHistory);
  }
}

// Handle key insight
function handleKeyInsight(data) {
  if (!data || !data.text) return;
  
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
  if (value >= 140 && value <= 160) return 'rgb(34, 197, 94)'; // Green - Optimal
  if (value >= 120 && value < 140) return 'rgb(59, 130, 246)'; // Blue - Good
  if (value >= 160 && value < 180) return 'rgb(249, 115, 22)'; // Orange - Fast
  return 'rgb(239, 68, 68)'; // Red - Too fast/slow
}

// Get pace color
function getPaceColor(status) {
  if (status === 'Optimal') return 'rgba(34, 197, 94, 0.2)';
  if (status === 'Good') return 'rgba(59, 130, 246, 0.2)';
  if (status === 'Fast') return 'rgba(249, 115, 22, 0.2)';
  return 'rgba(239, 68, 68, 0.2)';
}

// Handle session state update
function handleSessionStateUpdate(state) {
  sessionState = { ...sessionState, ...state };
  
  if (state.isActive) {
    elements.toggleBtn.textContent = 'Stop Session';
    elements.toggleBtn.dataset.state = 'active';
  } else {
    elements.toggleBtn.textContent = 'Start Session';
    elements.toggleBtn.dataset.state = 'inactive';
  }
}

// Handle timer update
function handleTimerUpdate(data) {
  // Timer display could be added to header if needed
  console.log('[OverlayV2] Timer:', data.formatted);
}

// Clear all panels
function clearAllPanels() {
  elements.transcriptionFeed.innerHTML = '<div class="empty-state">Listening for audio...</div>';
  elements.medicalTermsList.innerHTML = '<div class="empty-state">Detecting medical terms...</div>';
  elements.insightsList.innerHTML = '<div class="empty-state">Analyzing conversation...</div>';
  elements.interpreterOutput.innerHTML = '<div class="empty-state">Translating...</div>';
  
  sessionState.transcriptionCount = 0;
  sessionState.termsCount = 0;
  elements.transcriptionCount.textContent = '0';
  elements.termsCount.textContent = '0 terms';
}

// Handle minimize
function handleMinimize() {
  elements.overlay.classList.toggle('minimized');
}

// Handle language change
function handleLanguageChange() {
  console.log('[OverlayV2] Language changed to:', elements.languageSelect.value);
  
  // Send to background if needed
  window.parent.postMessage({
    source: 'interprecoach-overlay',
    action: 'LANGUAGE_CHANGE',
    language: elements.languageSelect.value
  }, '*');
}

// Save notes
function saveNotes() {
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
}

// Show toast notification
function showToast(message, type = 'info') {
  console.log(`[OverlayV2] Toast (${type}):`, message);
  // TODO: Implement toast UI if needed
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
