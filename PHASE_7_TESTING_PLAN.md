# Phase 7: Integration Testing Plan
## Medical Interpreter Co-Pilot Extension - January 7, 2026

---

## 🎯 Testing Objectives

**Goal**: Verify all components work together correctly in a real Chrome environment.

**Scope**: End-to-end functionality testing from installation through session completion.

**Duration**: Estimated 2-3 hours for comprehensive testing.

---

## 📋 Pre-Testing Setup

### ✅ Prerequisites Checklist

Before starting testing:
- [ ] Chrome browser installed (version 88+)
- [ ] Google Cloud account with API key (Speech-to-Text + Translation enabled)
- [ ] Anthropic account with Claude API key (optional for deep analysis)
- [ ] Access to video call platform (Google Meet, Zoom, or Teams)
- [ ] Chrome Developer Tools knowledge (basic)

### 🔧 Extension Loading Steps

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in top-right corner

3. **Load Extension**
   - Click "Load unpacked" button
   - Navigate to: `C:\Users\LSA\Coding-projects\coach-extension`
   - Select the folder and click "Select Folder"

4. **Verify Installation**
   - Extension should appear in list
   - Icon should show in Chrome toolbar
   - Check for any load errors in red text

---

## 🧪 Testing Phases

### **Test 1: Extension Loading** ⏱️ 5 minutes

**Objective**: Verify extension loads without errors.

**Steps**:
1. [ ] Load extension following steps above
2. [ ] Click extension icon - popup should open
3. [ ] Check Chrome DevTools console:
   - Right-click extension icon → "Inspect popup"
   - Look for JavaScript errors (should be none)
4. [ ] Open background service worker:
   - Extensions page → Click "service worker" link under extension
   - Check console for errors (should be none)

**Expected Results**:
- ✅ Extension loads successfully
- ✅ No console errors
- ✅ Popup opens when icon clicked
- ✅ Extension icon shows in toolbar

**Common Issues**:
- **Manifest errors**: Check `manifest.json` syntax
- **Module import errors**: Verify all file paths in imports
- **Service worker inactive**: Click "service worker" link to activate

---

### **Test 2: Settings Configuration** ⏱️ 10 minutes

**Objective**: Configure API keys and language preferences.

**Steps**:
1. [ ] Click extension icon to open popup
2. [ ] Verify UI displays correctly:
   - [ ] Status section visible
   - [ ] API key inputs visible
   - [ ] Language selectors visible
   - [ ] Buttons visible (Save, Test, Stop)
3. [ ] Enter API keys:
   - [ ] Google Cloud API Key
   - [ ] Anthropic API Key (optional)
4. [ ] Select languages:
   - [ ] Source language: English (US)
   - [ ] Target language: Spanish
5. [ ] Click "Save Settings"
6. [ ] Verify success message appears
7. [ ] Close and reopen popup
8. [ ] Verify settings persisted (API keys masked)

**Expected Results**:
- ✅ Popup UI renders correctly
- ✅ Settings save successfully
- ✅ Success notification displays
- ✅ Settings persist across popup opens
- ✅ API keys are masked (•••••)

**API Key Setup**:
- **Google Cloud**: https://console.cloud.google.com/apis/credentials
  - Enable: Speech-to-Text API
  - Enable: Cloud Translation API
  - Create: API Key
- **Anthropic**: https://console.anthropic.com/
  - Create: API Key (Claude Sonnet recommended)

---

### **Test 3: API Connectivity** ⏱️ 10 minutes

**Objective**: Verify API keys work and services are reachable.

**Steps**:
1. [ ] Open popup
2. [ ] Click "Test APIs" button
3. [ ] Wait for test results (may take 5-10 seconds)
4. [ ] Check notifications:
   - [ ] Google Cloud API test result
   - [ ] Anthropic API test result (if configured)
5. [ ] If errors, check console logs in popup DevTools

**Expected Results**:
- ✅ Google Cloud test passes
- ✅ Anthropic test passes (if key provided)
- ✅ Success notifications show
- ✅ No error messages

**Common Issues**:
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: API not enabled in Google Cloud Console
- **Network error**: Check internet connection
- **CORS error**: Should not occur (using background service worker)

---

### **Test 4: Overlay Injection** ⏱️ 15 minutes

**Objective**: Verify overlay injects on video call pages.

**Steps**:
1. [ ] Open a new Chrome tab
2. [ ] Navigate to one of these platforms:
   - [ ] Google Meet: `meet.google.com`
   - [ ] Zoom: `zoom.us` (join a test meeting)
   - [ ] Microsoft Teams: `teams.microsoft.com`
3. [ ] Join a meeting (can be a test meeting or your own)
4. [ ] Look for overlay in bottom-right corner
5. [ ] If overlay doesn't appear:
   - [ ] Check console (F12) for errors
   - [ ] Check if content script loaded
   - [ ] Verify popup shows "Extension: Active"

**Expected Results**:
- ✅ Overlay appears on call page
- ✅ Overlay is positioned in bottom-right
- ✅ Overlay shows "Inactive" status initially
- ✅ No console errors related to injection

**Manual Overlay Check**:
If overlay doesn't inject automatically:
1. Open DevTools (F12)
2. Go to Console tab
3. Type: `document.querySelector('iframe[data-coach-overlay]')`
4. Should return iframe element (if injected)

---

### **Test 5: Session Start** ⏱️ 10 minutes

**Objective**: Start a monitoring session and verify agents initialize.

**Steps**:
1. [ ] Ensure on a video call page (Meet/Zoom/Teams)
2. [ ] Open extension popup
3. [ ] Click "Start Monitoring" button
4. [ ] Observe overlay:
   - [ ] Status changes to "Active"
   - [ ] Timer starts (00:00:00)
   - [ ] Platform name shows (Google Meet/Zoom/Teams)
   - [ ] All panels display empty states
5. [ ] Check background service worker console:
   - [ ] Should show "Starting agents..."
   - [ ] Should show agent initialization logs
   - [ ] Should show "All agents started successfully"
6. [ ] Check popup:
   - [ ] Status shows "Active"
   - [ ] Session timer shows
   - [ ] "Stop Session" button enabled

**Expected Results**:
- ✅ Agents start successfully
- ✅ Overlay activates
- ✅ Timer starts
- ✅ Platform detected correctly
- ✅ No errors in console

**Common Issues**:
- **No audio capture**: Check Chrome tab audio capture permission
- **Agent start fails**: Check API keys are configured
- **Overlay doesn't update**: Check content script → overlay message passing

---

### **Test 6: Live Transcription** ⏱️ 15 minutes

**Objective**: Verify real-time transcription displays.

**Steps**:
1. [ ] Session should be active from Test 5
2. [ ] Ensure microphone is working in the call
3. [ ] Speak clearly into microphone
4. [ ] Watch "Live Transcription" panel in overlay:
   - [ ] Transcription items appear (may take 2-5 seconds)
   - [ ] Timestamp shows for each item
   - [ ] Confidence score displays (percentage)
   - [ ] Text is readable and accurate
5. [ ] Test with medical terminology:
   - Say: "The patient has hypertension"
   - Say: "We need to check their glucose levels"
   - Say: "Symptoms include dyspnea and tachycardia"
6. [ ] Verify auto-scroll:
   - [ ] Panel scrolls to show latest transcription
   - [ ] Older items remain accessible

**Expected Results**:
- ✅ Transcriptions appear within 2-5 seconds
- ✅ Timestamps are accurate
- ✅ Confidence scores show
- ✅ Medical terms transcribed correctly
- ✅ Auto-scroll works
- ✅ Feed is readable

**Common Issues**:
- **No transcriptions**: Check mic permissions, audio capture active
- **Delayed transcriptions**: Normal, 2-5 second lag expected
- **Poor accuracy**: Check mic quality, background noise
- **No medical terms**: Transcription working, Agent 2 issue (Test 7)

---

### **Test 7: Medical Terminology Detection** ⏱️ 15 minutes

**Objective**: Verify medical term detection, translation, and display.

**Steps**:
1. [ ] Ensure transcription is working (Test 6)
2. [ ] Speak sentences with medical terms:
   - "The patient has diabetes mellitus type 2"
   - "We administered acetaminophen for fever"
   - "Symptoms include nausea and vomiting"
   - "The CT scan showed pulmonary embolism"
3. [ ] Watch "Medical Terms" panel:
   - [ ] Term cards appear (may take 2-5 seconds after transcription)
   - [ ] English term displays
   - [ ] Spanish translation displays
   - [ ] Phonetic pronunciation displays
   - [ ] Definition displays
   - [ ] Context displays
4. [ ] Test multiple terms in one sentence
5. [ ] Verify cards are organized and readable

**Expected Results**:
- ✅ Medical terms detected accurately
- ✅ Translations are correct
- ✅ Phonetics are helpful
- ✅ Definitions are clear
- ✅ Context makes sense
- ✅ Cards animate in smoothly
- ✅ Multiple terms handled correctly

**Common Issues**:
- **Terms not detected**: Check Google Translation API enabled
- **Wrong translations**: Verify target language setting
- **Duplicate cards**: Normal if term repeated
- **Missing phonetics**: May not be available for all terms

---

### **Test 8: Live Metrics Dashboard** ⏱️ 15 minutes

**Objective**: Verify performance metrics update in real-time.

**Steps**:
1. [ ] Ensure session active with transcription
2. [ ] Watch "Live Metrics" panel
3. [ ] Verify metric cards display:
   - [ ] Overall Score (0-100)
   - [ ] Fluency (0-100)
   - [ ] Accuracy (0-100)
   - [ ] Grammar (0-100)
   - [ ] Professionalism (0-100)
   - [ ] Medical Knowledge (0-100)
   - [ ] Cultural Sensitivity (0-100)
4. [ ] Observe updates:
   - [ ] Scores update every 2 seconds (throttled)
   - [ ] Progress bars match scores
   - [ ] Colors reflect score quality:
     - Green: Excellent (90-100)
     - Blue: Proficient (75-89)
     - Orange: Developing (60-74)
     - Red: Needs Improvement (<60)
5. [ ] Check "Issues Detected":
   - [ ] Count displays
   - [ ] Issues listed with severity
6. [ ] Speak to test metric changes:
   - Use filler words: "um", "uh", "like"
   - Pause for long periods
   - Speak too quickly
   - Use informal language
7. [ ] Verify metrics reflect performance

**Expected Results**:
- ✅ All metric cards display
- ✅ Scores update regularly (every 2s)
- ✅ Bars and colors match scores
- ✅ Issues are detected and listed
- ✅ Changes reflect speaking behavior
- ✅ Layout is clean and readable

**Common Issues**:
- **Metrics don't update**: Check Anthropic API key configured
- **All zeros**: Agents may still be initializing (wait 10-15 seconds)
- **Incorrect scores**: AI analysis, some variance expected
- **No issues detected**: Good performance! Or insufficient data

---

### **Test 9: UI Interactions** ⏱️ 10 minutes

**Objective**: Test all UI controls and interactions.

**Steps**:
1. [ ] Test panel collapse/expand:
   - [ ] Click "Live Transcription" header → panel collapses
   - [ ] Click again → panel expands
   - [ ] Repeat for "Medical Terms" panel
   - [ ] Repeat for "Live Metrics" panel
2. [ ] Test minimize/restore:
   - [ ] Press `Ctrl+Shift+M` → overlay minimizes to corner
   - [ ] Click minimized indicator → overlay restores
   - [ ] Press `Ctrl+Shift+M` again → minimizes
3. [ ] Test scrolling:
   - [ ] Scroll in transcription panel
   - [ ] Auto-scroll should resume on new items
4. [ ] Test empty states:
   - [ ] Start fresh session
   - [ ] Verify all panels show "No data yet" messages
5. [ ] Test toast notifications:
   - [ ] Should see notifications for:
     - Session started
     - Errors (if any)
     - Session stopped

**Expected Results**:
- ✅ Panels collapse/expand smoothly
- ✅ Minimize/restore works with keyboard and click
- ✅ Scrolling is smooth
- ✅ Empty states display before data arrives
- ✅ Toast notifications appear and auto-dismiss
- ✅ Animations are smooth (no lag)

---

### **Test 10: Session Stop & Data Persistence** ⏱️ 10 minutes

**Objective**: Stop session gracefully and verify data saved.

**Steps**:
1. [ ] Ensure session has been running for at least 2-3 minutes
2. [ ] Have some transcriptions and medical terms detected
3. [ ] Open extension popup
4. [ ] Click "Stop Session" button
5. [ ] Observe overlay:
   - [ ] Status changes to "Inactive"
   - [ ] Timer stops
   - [ ] Toast notification: "Session ended"
   - [ ] Data remains visible
6. [ ] Check background service worker console:
   - [ ] Should show "Stopping agents..."
   - [ ] Should show "Generating final report..."
   - [ ] Should show "Session data saved"
7. [ ] Verify Chrome Storage:
   - In DevTools, go to: Application → Storage → Chrome Storage
   - Check for saved session data
8. [ ] Close and reopen popup:
   - [ ] Status shows "Inactive"
   - [ ] Timer reset
   - [ ] "Start Monitoring" button enabled

**Expected Results**:
- ✅ Session stops cleanly
- ✅ No errors in console
- ✅ Final report generated
- ✅ Data saved to Chrome storage
- ✅ UI resets properly
- ✅ Extension ready for next session

**Data to Verify in Storage**:
- Session ID
- Start/end timestamps
- Duration
- Platform name
- Transcriptions count
- Medical terms count
- Performance scores
- Final report

---

### **Test 11: Error Scenarios** ⏱️ 15 minutes

**Objective**: Test error handling and recovery.

**Steps**:
1. [ ] **Test invalid API key**:
   - Open popup
   - Enter invalid Google Cloud API key
   - Save and start session
   - Verify error notification appears
   - Verify session doesn't start

2. [ ] **Test network failure**:
   - Start session normally
   - Disable network (airplane mode or disconnect WiFi)
   - Wait 10 seconds
   - Re-enable network
   - Verify extension recovers or shows appropriate error

3. [ ] **Test missing permissions**:
   - Revoke microphone permission for Chrome
   - Start session
   - Verify error notification

4. [ ] **Test long session**:
   - Start session
   - Let run for 30+ minutes
   - Monitor for memory leaks
   - Check performance in Task Manager

5. [ ] **Test rapid start/stop**:
   - Start session
   - Stop immediately
   - Start again
   - Stop again
   - Verify no crashes or errors

**Expected Results**:
- ✅ Invalid API keys rejected gracefully
- ✅ Network errors show user-friendly messages
- ✅ Permission errors detected and reported
- ✅ Long sessions remain stable
- ✅ Rapid start/stop doesn't break extension
- ✅ No memory leaks
- ✅ Extension remains responsive

---

## 📊 Testing Checklist Summary

### Core Functionality
- [ ] Extension loads without errors
- [ ] Settings save and persist
- [ ] API connectivity verified
- [ ] Overlay injects on call pages
- [ ] Session starts successfully
- [ ] Live transcription works
- [ ] Medical terms detected and translated
- [ ] Metrics update in real-time
- [ ] UI interactions smooth
- [ ] Session stops cleanly
- [ ] Data persists in storage

### Error Handling
- [ ] Invalid API keys rejected
- [ ] Network failures handled
- [ ] Permission errors detected
- [ ] Long sessions stable
- [ ] Rapid start/stop works

### Performance
- [ ] No memory leaks
- [ ] Responsive UI
- [ ] Smooth animations
- [ ] Efficient updates

---

## 🐛 Bug Tracking

### Issues Found

| # | Description | Severity | Status | Notes |
|---|-------------|----------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels**:
- 🔴 Critical: Blocks core functionality
- 🟠 High: Major feature broken
- 🟡 Medium: Minor feature issue
- 🟢 Low: Cosmetic/enhancement

---

## ✅ Success Criteria

### Phase 7 Complete When:
- [ ] All 11 test scenarios pass
- [ ] No critical bugs found
- [ ] Extension stable for 30+ minute session
- [ ] Data persistence verified
- [ ] Error handling confirmed working
- [ ] UI/UX smooth and responsive

---

## 🚀 Next Steps After Phase 7

Once all tests pass:
1. **Phase 8**: Documentation Finalization
   - Update README with setup instructions
   - Create user guide
   - API documentation review
   - Architecture diagrams

2. **Phase 9**: Deployment Preparation
   - Create production build
   - Prepare Chrome Web Store listing
   - Create promotional materials
   - Set up user feedback system

---

## 📝 Testing Log

### Session 1: [Date/Time]
**Tester**: [Name]  
**Tests Completed**: [List]  
**Issues Found**: [Count]  
**Notes**: 

---

## 💡 Testing Tips

1. **Use DevTools extensively**: Check console, network, storage
2. **Test incrementally**: Don't try all tests at once
3. **Document everything**: Note exact steps that cause issues
4. **Take screenshots**: Visual bugs need visual documentation
5. **Test on different platforms**: Google Meet, Zoom, Teams all behave differently
6. **Use real calls**: Test with actual medical terminology
7. **Check performance**: Monitor memory and CPU usage
8. **Be patient**: Some operations take a few seconds

---

**Testing Plan Created**: January 7, 2026  
**Status**: Ready to begin  
**Estimated Duration**: 2-3 hours for full testing cycle  
**Next Action**: Load extension in Chrome and start Test 1
