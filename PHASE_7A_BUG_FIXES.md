# Phase 7A: Critical Bug Fixes
## Detailed Implementation Guide
**Date**: January 7, 2026 | **Priority**: URGENT

---

## 🎯 **Bugs to Fix**

### **Bug 1: Timer Sync Issue** ⏱️
**Symptom**: Popup shows "00:00:05" but overlay shows "00:00:00"
**Cause**: Timer updates not being broadcast from background to overlay
**Impact**: HIGH - Interpreters can't track session duration

#### Root Cause Analysis:
```javascript
// background.js sends timer updates
handleTimerUpdate(duration);

// BUT overlay may not be receiving these messages
```

#### Fix Implementation:

**Step 1**: Verify message broadcasting in `agents/agentOrchestrator.js`
```javascript
// Around line 200-250
// Ensure timer updates are sent every second
sendToFrontend({
  action: 'AGENT_OUTPUT',
  payload: {
    type: 'TIMER_UPDATE',
    data: {
      seconds: elapsedSeconds,
      formatted: formatTime(elapsedSeconds)
    }
  }
});
```

**Step 2**: Fix message relay in `content.js`
```javascript
// Ensure content script forwards timer messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'AGENT_OUTPUT' && message.payload.type === 'TIMER_UPDATE') {
    // Forward to overlay iframe
    const overlay = document.querySelector('iframe[data-coach-overlay]');
    if (overlay && overlay.contentWindow) {
      overlay.contentWindow.postMessage(message, '*');
    }
  }
});
```

**Step 3**: Update overlay timer handler in `ui/overlay.js`
```javascript
// Line ~150-180
function handleTimerUpdate(data) {
  const timerElement = document.getElementById('session-timer');
  if (timerElement && data.formatted) {
    timerElement.textContent = data.formatted;
  }
}
```

**Testing**:
- [ ] Start session in popup
- [ ] Verify timer updates every second in overlay
- [ ] Verify both show same time
- [ ] Check console for message flow

---

### **Bug 2: Status Sync Issue** 🔴
**Symptom**: Popup shows "Active" but overlay shows "Ready"
**Cause**: Session state not synchronized between components
**Impact**: HIGH - Confusing UX, unclear if monitoring is active

#### Root Cause Analysis:
```javascript
// Popup correctly updates its own state
// But doesn't update overlay state indicator
```

#### Fix Implementation:

**Step 1**: Add session state broadcast in `background.js`
```javascript
// After agents start
async function handleStartAgents(config, platform) {
  // ... existing code ...
  
  if (result.success) {
    // BROADCAST session state to all listeners
    await sendSystemEvent({
      type: 'SESSION_STATE_CHANGE',
      data: {
        status: 'ACTIVE',
        sessionId: result.sessionId,
        platform: platform,
        startTime: Date.now()
      }
    });
  }
}

// After agents stop
async function handleStopAgents() {
  // ... existing code ...
  
  await sendSystemEvent({
    type: 'SESSION_STATE_CHANGE',
    data: {
      status: 'INACTIVE',
      sessionId: sessionData?.sessionId,
      stopTime: Date.now()
    }
  });
}
```

**Step 2**: Update overlay status handler in `ui/overlay.js`
```javascript
// Add new handler
function handleSessionStateChange(data) {
  const statusElement = document.getElementById('session-status');
  const statusIndicator = document.querySelector('.status-indicator');
  
  if (data.status === 'ACTIVE') {
    statusElement.textContent = 'Active';
    statusIndicator.classList.remove('status-inactive');
    statusIndicator.classList.add('status-active');
    
    // Update platform
    const platformElement = document.getElementById('platform-name');
    if (platformElement) {
      platformElement.textContent = data.platform || 'Unknown';
    }
  } else {
    statusElement.textContent = 'Inactive';
    statusIndicator.classList.remove('status-active');
    statusIndicator.classList.add('status-inactive');
  }
}

// Add to message handler
function handleMessage(event) {
  // ... existing code ...
  
  if (payload.type === 'SESSION_STATE_CHANGE') {
    handleSessionStateChange(payload.data);
  }
}
```

**Testing**:
- [ ] Start session
- [ ] Verify popup shows "Active"
- [ ] Verify overlay shows "Active"
- [ ] Stop session
- [ ] Verify both show "Inactive"

---

### **Bug 3: Platform Detection** 🌐
**Symptom**: Platform shows "Unknown" instead of "Google Meet"
**Cause**: Platform parameter not being passed correctly
**Impact**: MEDIUM - Less useful logging data

#### Fix Implementation:

**Step 1**: Detect platform in `content.js`
```javascript
// Add platform detection function
function detectPlatform() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  if (hostname.includes('meet.google.com')) {
    return 'Google Meet';
  } else if (hostname.includes('zoom.us')) {
    return 'Zoom';
  } else if (hostname.includes('teams.microsoft.com')) {
    return 'Microsoft Teams';
  }
  
  return 'Unknown';
}

// Pass platform when starting session
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_MONITORING') {
    const platform = detectPlatform();
    
    chrome.runtime.sendMessage({
      action: 'START_AGENTS',
      platform: platform
    });
  }
});
```

**Step 2**: Update popup to pass platform in `ui/popup.js`
```javascript
// When start button clicked
async function startMonitoring() {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Detect platform from URL
  const platform = detectPlatformFromUrl(tab.url);
  
  // Send to background with platform
  const response = await chrome.runtime.sendMessage({
    action: 'START_AGENTS',
    platform: platform
  });
}

function detectPlatformFromUrl(url) {
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
  return 'Unknown';
}
```

**Testing**:
- [ ] Join Google Meet
- [ ] Start session
- [ ] Verify platform shows "Google Meet"
- [ ] Test on Zoom (if available)
- [ ] Verify platform detection

---

### **Bug 4: Audio Capture Not Starting** 🎤
**Symptom**: No transcription happening after session starts
**Cause**: Offscreen document created but not receiving start command
**Impact**: CRITICAL - Core functionality broken

#### Fix Already Applied ✅
This was fixed earlier when we:
1. Added `ensureOffscreenDocument()` to background.js
2. Updated `transcriptionAgent.js` to use message passing
3. Modified `startStreaming()` to communicate with offscreen

#### Verification Steps:

**Step 1**: Check offscreen document creation
```javascript
// In Chrome DevTools console (background service worker):
// Should see:
[Background] ✓ Offscreen document created
[Background] Starting agents...
```

**Step 2**: Check message flow
```javascript
// In offscreen.js console (if accessible):
[Offscreen] Message received: START_RECOGNITION
[Offscreen] Starting recognition with language: en-US
[Offscreen] Recognition started
```

**Step 3**: Verify transcription results
```javascript
// Should see in background console:
[Background] RECOGNITION_RESULT received
[TranscriptionAgent] FINAL: "test transcription" (95%)
```

**Testing**:
- [ ] Start session
- [ ] Speak into microphone
- [ ] Verify transcription appears in overlay
- [ ] Check background console for recognition messages
- [ ] Verify no errors

**If Still Not Working**:
```javascript
// Debug by adding logs to offscreen.js:
console.log('[Offscreen] Starting recognition...');
console.log('[Offscreen] SpeechRecognition:', window.SpeechRecognition);
console.log('[Offscreen] Microphone permission:', await navigator.permissions.query({name: 'microphone'}));
```

---

### **Bug 5: Session State Management** 🔄
**Symptom**: State inconsistencies between components
**Cause**: No central state management
**Impact**: MEDIUM - Can cause confusing UI states

#### Fix Implementation:

**Step 1**: Create state management in `background.js`
```javascript
// Global state object
const sessionState = {
  isActive: false,
  sessionId: null,
  platform: 'Unknown',
  startTime: null,
  elapsedSeconds: 0
};

// State getter
function getSessionState() {
  return { ...sessionState };
}

// State updater (broadcasts changes)
function updateSessionState(updates) {
  Object.assign(sessionState, updates);
  
  // Broadcast to all listeners
  chrome.runtime.sendMessage({
    action: 'SESSION_STATE_UPDATE',
    state: getSessionState()
  });
}

// Use in handleStartAgents
async function handleStartAgents(config, platform) {
  // ... start agents ...
  
  updateSessionState({
    isActive: true,
    sessionId: result.sessionId,
    platform: platform,
    startTime: Date.now()
  });
}

// Use in handleStopAgents
async function handleStopAgents() {
  // ... stop agents ...
  
  updateSessionState({
    isActive: false,
    sessionId: null,
    elapsedSeconds: 0
  });
}
```

**Step 2**: Listen for state updates in `ui/popup.js`
```javascript
// Listen for state changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SESSION_STATE_UPDATE') {
    updateUIFromState(message.state);
  }
});

function updateUIFromState(state) {
  // Update all UI elements based on state
  document.getElementById('status').textContent = state.isActive ? 'Active' : 'Inactive';
  document.getElementById('platform').textContent = state.platform;
  // ... update other elements ...
}
```

**Step 3**: Listen for state updates in `ui/overlay.js`
```javascript
// Same pattern as popup
window.addEventListener('message', (event) => {
  if (event.data.action === 'SESSION_STATE_UPDATE') {
    updateOverlayFromState(event.data.state);
  }
});
```

**Testing**:
- [ ] Start session
- [ ] Verify all components show "Active"
- [ ] Verify platform displays correctly
- [ ] Stop session
- [ ] Verify all components show "Inactive"
- [ ] Reload popup - state should persist

---

## 🧪 **Complete Testing Checklist**

### **Phase 7A Testing Protocol**

**Prerequisites**:
- [ ] Extension loaded in Chrome
- [ ] API keys configured
- [ ] Google Meet accessible
- [ ] Microphone working

**Test 1: Fresh Start**
1. [ ] Reload extension
2. [ ] Open popup
3. [ ] Verify status: "Inactive"
4. [ ] Timer shows: "00:00:00"
5. [ ] No console errors

**Test 2: Session Start**
1. [ ] Join Google Meet call
2. [ ] Click "Start Monitoring"
3. [ ] Popup shows "Active" within 2 seconds
4. [ ] Overlay shows "Active" within 2 seconds
5. [ ] Platform shows "Google Meet"
6. [ ] Timer starts counting in BOTH popup and overlay
7. [ ] Timers synchronized (within 1 second)

**Test 3: During Session**
1. [ ] Speak into microphone
2. [ ] Transcription appears in overlay
3. [ ] Timer continues counting
4. [ ] Status remains "Active"
5. [ ] No console errors

**Test 4: Session Stop**
1. [ ] Click "Stop Session"
2. [ ] Popup shows "Inactive" immediately
3. [ ] Overlay shows "Inactive" immediately
4. [ ] Timer stops
5. [ ] Final data saved (check console)

**Test 5: Edge Cases**
1. [ ] Start/stop rapidly (3 times)
2. [ ] Reload extension during session
3. [ ] Close/reopen popup during session
4. [ ] Switch tabs during session
5. [ ] All cases handle gracefully

---

## 📊 **Success Criteria**

### **Must Pass All**:
- ✅ Timers synchronized (popup ↔ overlay)
- ✅ Status displays match
- ✅ Platform detected correctly
- ✅ Transcription works
- ✅ No console errors
- ✅ State persists across popup opens
- ✅ Clean session start/stop

### **Performance**:
- Response time < 2 seconds for state changes
- No memory leaks over 10-minute session
- Timer accuracy within 1 second

---

## 🔄 **Implementation Order**

1. **First**: Bug 4 verification (audio capture)
2. **Second**: Bug 3 (platform detection)
3. **Third**: Bug 2 (status sync)
4. **Fourth**: Bug 1 (timer sync)
5. **Fifth**: Bug 5 (state management)
6. **Finally**: Complete testing checklist

---

## 📝 **Files to Modify Summary**

| File | Changes | Lines Changed | Priority |
|------|---------|---------------|----------|
| `background.js` | Add state management | ~50 | HIGH |
| `content.js` | Platform detection | ~30 | HIGH |
| `ui/overlay.js` | State/timer handlers | ~40 | HIGH |
| `ui/popup.js` | State updates | ~30 | MEDIUM |
| `agents/agentOrchestrator.js` | Timer broadcast | ~20 | HIGH |

**Total**: ~170 lines of code changes

---

**Status**: Ready to implement  
**Estimated Time**: 1-2 hours  
**Next After Completion**: Phase 7B (Agent 4 Creation)