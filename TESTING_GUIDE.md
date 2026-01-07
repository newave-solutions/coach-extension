# Testing Guide - Coach Extension
## Complete Setup and Testing Instructions

---

## 🚀 Quick Start

### Prerequisites
- ✅ Google Chrome (latest version)
- ✅ Google Cloud API Key (for Speech-to-Text & Translation)
- ✅ Anthropic API Key (optional, for deep analysis)
- ✅ Active internet connection

---

## 📦 PHASE 1: SETUP

### Step 1: Create Icon Files (Temporary Placeholders)

The extension needs icons. For testing, we'll create simple placeholders:

**Option A: Use Online Tool (Recommended)**
1. Go to: https://www.favicon-generator.org/
2. Upload any image (or use text)
3. Download and extract the favicon package
4. Copy these files to `coach-extension/icons/`:
   - Rename `favicon-16x16.png` → `icon16.png`
   - Rename `favicon-32x32.png` → `icon48.png`
   - Rename `android-chrome-192x192.png` → `icon128.png`

**Option B: Create Manually**
1. Create any 3 PNG images:
   - 16x16 pixels → `icon16.png`
   - 48x48 pixels → `icon48.png`
   - 128x128 pixels → `icon128.png`
2. Place them in `coach-extension/icons/`

**Option C: Use Placeholder (Quickest)**
Just create 3 copies of any small PNG file and rename them as above.

---

### Step 2: Verify File Structure

Your `coach-extension` folder should look like this:

```
coach-extension/
├── agents/
│   ├── transcriptionAgent.js
│   ├── medicalTerminologyAgent.js
│   ├── performanceEvaluationAgent.js
│   └── agentOrchestrator.js
├── config/
│   └── config.js
├── docs/
│   └── [5 documentation files]
├── icons/
│   ├── icon16.png  ← ADD THESE
│   ├── icon48.png  ← ADD THESE
│   └── icon128.png ← ADD THESE
├── ui/
│   ├── overlay.html
│   ├── overlay.js
│   ├── overlay.css
│   ├── popup.html
│   ├── popup.js
│   └── callTimer.js
├── utils/
│   ├── messageHandler.js
│   ├── storageManager.js
│   ├── ncihcStandards.js
│   ├── audioProcessor.js
│   └── callDetector.js
├── manifest.json
├── background.js
├── content.js
├── package.json
└── README.md
```

---

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - OR: Menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in top-right corner
   - Should turn blue/on

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to: `C:\Users\LSA\Coding-projects\coach-extension`
   - Click "Select Folder"

4. **Verify Installation**
   - Extension should appear in the list
   - You should see:
     - ✅ Name: "Medical Interpreter Co-Pilot"
     - ✅ Version: 1.0.0
     - ✅ Icon (your placeholder)
     - ✅ Status: "Enabled"

5. **Check for Errors**
   - Look for any red error messages
   - If errors appear, click "Details" to see what's wrong
   - Common issues:
     - Missing icon files → Add placeholders
     - Manifest errors → Check manifest.json syntax
     - Permission errors → Check permissions in manifest

6. **Pin Extension (Optional)**
   - Click puzzle piece icon in Chrome toolbar
   - Find "Medical Interpreter Co-Pilot"
   - Click pin icon to keep it visible

---

## 🔧 PHASE 2: INITIAL CONFIGURATION

### Step 4: Open Settings Popup

1. Click the extension icon in Chrome toolbar
2. Settings popup should open (380px wide)
3. Verify you see:
   - ✅ Header: "🎤 Coach Co-Pilot"
   - ✅ Status section
   - ✅ API configuration inputs
   - ✅ Language dropdowns
   - ✅ Save/Test buttons

**Troubleshooting**:
- If popup doesn't open → Check `ui/popup.html` exists
- If popup is blank → Check browser console (F12) for errors

---

### Step 5: Configure API Keys

1. **Get Google Cloud API Key**
   - Go to: https://console.cloud.google.com/
   - Create new project or select existing
   - Enable APIs:
     - Cloud Speech-to-Text API
     - Cloud Translation API
   - Create credentials → API Key
   - Copy the key

2. **Get Anthropic API Key (Optional)**
   - Go to: https://console.anthropic.com/
   - Create account or sign in
   - Generate new API key
   - Copy the key

3. **Enter Keys in Popup**
   - Paste Google Cloud key in first field
   - Paste Anthropic key in second field (optional)
   - Select languages:
     - Source: English (US)
     - Target: Spanish (or your preference)
   - Click "Save Settings"
   - Should see: "Settings saved successfully!" message

4. **Test API Keys**
   - Click "Test APIs" button
   - Should see: "Google Cloud API key is valid! ✓"
   - If error: Check key format and network connection

---

## 🧪 PHASE 3: BASIC FUNCTIONALITY TESTING

### Test 1: Background Service Worker

1. **Open Extension Details**
   - Go to `chrome://extensions/`
   - Find "Medical Interpreter Co-Pilot"
   - Click "Details"

2. **Inspect Service Worker**
   - Find "Inspect views" section
   - Click "service worker" link
   - DevTools console should open

3. **Check Console**
   - Should see:
     ```
     [Background] Service worker loaded
     [Background] Waiting for initialization...
     [Background] Initializing extension...
     [Background] ✓ Extension initialized
     ```
   - If errors appear → Note them for debugging

---

### Test 2: Content Script Injection

1. **Open Any Website**
   - Go to any webpage (e.g., google.com)
   
2. **Open DevTools Console**
   - Press F12
   - Go to Console tab

3. **Check for Content Script**
   - Should see: `[Content] Content script loaded` (may be filtered)
   - If nothing appears → Check manifest permissions

4. **Try Keyboard Shortcut**
   - Press `Ctrl + Shift + M` (Windows) or `Cmd + Shift + M` (Mac)
   - Overlay should appear on right side of screen
   - If nothing happens → Check content.js and overlay files

---

### Test 3: Settings Popup Functionality

**Test the popup thoroughly**:

| Test | Action | Expected Result |
|------|--------|-----------------|
| Open | Click extension icon | Popup opens, 380px wide |
| Status Display | Check status section | Shows "Ready", API status |
| API Input | Enter fake key | Input accepts text |
| Save | Click Save | "Settings saved" message |
| Test APIs | Click Test | Validation runs |
| Language Change | Select different language | Dropdown changes |
| Persistence | Close and reopen popup | Settings are remembered |

---

## 🎯 PHASE 4: OVERLAY TESTING (WITHOUT REAL CALLS)

### Test 4: Overlay Structure

1. **Inject Overlay**
   - Go to any webpage
   - Press `Ctrl + Shift + M`
   - Overlay should slide in from right

2. **Verify Structure**
   - ✅ Header with "Coach Co-Pilot"
   - ✅ Status: "Ready"
   - ✅ Timer: "00:00:00"
   - ✅ Three panels:
     1. Live Transcription
     2. Medical Terms
     3. Live Metrics
   - ✅ Footer with statistics

3. **Test Panel Interactions**
   - Click each panel header
   - Panel should collapse/expand
   - Toggle icon should rotate

4. **Test Minimize**
   - Press `Ctrl + Shift + M`
   - Overlay should minimize to small indicator
   - Press again → Should restore

5. **Test Collapse All**
   - Click "Collapse All" button in header
   - All panels should collapse
   - Icons should rotate

---

### Test 5: Simulated Messages (Developer Test)

**Option: Manual Message Testing**

1. **Open Overlay DevTools**
   - Right-click on overlay
   - Select "Inspect"
   - Go to Console tab

2. **Send Test Messages**
   Paste these commands one by one:

   ```javascript
   // Test transcription
   window.postMessage({
     action: 'AGENT_OUTPUT',
     payload: {
       type: 'TRANSCRIPTION',
       data: {
         text: 'The patient has hypertension',
         isFinal: true,
         confidence: 0.95,
         timestamp: Date.now()
       }
     }
   }, '*');

   // Test medical term
   window.postMessage({
     action: 'AGENT_OUTPUT',
     payload: {
       type: 'MEDICAL_TERM',
       data: {
         original: 'hypertension',
         translation: 'hipertensión',
         phonetics: 'hy-per-TEN-shun',
         definition: 'High blood pressure',
         context: 'The patient has hypertension',
         timestamp: Date.now()
       }
     }
   }, '*');

   // Test metrics update
   window.postMessage({
     action: 'AGENT_OUTPUT',
     payload: {
       type: 'METRICS_UPDATE',
       data: {
         metrics: {
           overallScore: 87,
           averageWPM: 92,
           fluency: { score: 85 },
           accuracy: { score: 90 },
           grammar: { score: 88 },
           professionalConduct: { score: 92 }
         },
         timestamp: Date.now()
       }
     }
   }, '*');
   ```

3. **Verify UI Updates**
   - Transcription should appear in feed
   - Medical term card should appear
   - Metrics should update with scores
   - Bars should fill to correct percentages
   - Colors should match scores

---

## 🎤 PHASE 5: REAL CALL TESTING

### Test 6: Google Meet Integration

1. **Join a Test Meeting**
   - Go to https://meet.google.com/
   - Click "New meeting" → "Start an instant meeting"
   - Allow camera/microphone permissions

2. **Start Extension**
   - Click extension icon
   - Verify popup shows status
   - Click somewhere on the page (to make it active)
   - Extension should auto-detect the call

3. **Monitor for Activity**
   - Speak into microphone
   - Check overlay for transcriptions
   - Look for medical terms (if you say medical words)
   - Watch metrics update

4. **Verify Features**
   - ✅ Timer starts counting
   - ✅ Status changes to "Active"
   - ✅ Transcriptions appear
   - ✅ Medical terms detected
   - ✅ Metrics update every 2 seconds

5. **Stop Session**
   - Open popup
   - Click "Stop Session"
   - Verify dashboard button appears

---

### Test 7: Zoom Testing (if available)

Same process as Google Meet, but use Zoom web client:
- Go to https://zoom.us/
- Join or start a meeting
- Test same features

---

## 🐛 PHASE 6: ERROR TESTING

### Test 8: Error Scenarios

| Scenario | How to Test | Expected Behavior |
|----------|-------------|-------------------|
| No API Key | Clear keys, start session | Error toast: "API keys not configured" |
| Invalid API Key | Enter "test123" | Error during testing |
| Network Offline | Disable internet | Connection error toast |
| No Microphone | Deny mic permission | Permission error |
| Long Session | Run for 30+ minutes | Should continue working |
| Multiple Tabs | Open in multiple tabs | Each tab independent |

---

## 📊 PHASE 7: PERFORMANCE TESTING

### Test 9: Performance Checks

1. **Memory Usage**
   - Open Task Manager (Ctrl + Shift + Esc)
   - Find Chrome processes
   - Note memory usage during:
     - Idle: ~25-50 MB
     - Active: ~50-100 MB
     - Should not increase continuously

2. **CPU Usage**
   - Should be <10% during active session
   - Spikes during transcription are normal

3. **Console Errors**
   - Keep DevTools open
   - Monitor for:
     - Red errors (bad)
     - Yellow warnings (may be okay)
     - Blue info (normal)

---

## ✅ TESTING CHECKLIST

### Core Functionality
- [ ] Extension loads without errors
- [ ] Service worker initializes
- [ ] Content script injects
- [ ] Overlay appears on keyboard shortcut
- [ ] Popup opens on icon click
- [ ] Settings save successfully
- [ ] API keys are encrypted in storage

### UI/UX
- [ ] All panels collapse/expand
- [ ] Minimize/restore works
- [ ] Keyboard shortcuts work
- [ ] Toast notifications appear
- [ ] Animations are smooth
- [ ] Scrolling works properly
- [ ] Timer updates every second
- [ ] Status indicators show correct state

### Agent Integration
- [ ] Transcriptions display in real-time
- [ ] Medical terms detected and translated
- [ ] Metrics update every 2 seconds
- [ ] Scores calculate correctly
- [ ] Issues summary shows problems
- [ ] Session data saves to storage

### Error Handling
- [ ] Invalid API keys show error
- [ ] Network failures handled gracefully
- [ ] Permission denials show clear message
- [ ] Extension doesn't crash on errors

### Performance
- [ ] Memory usage stays reasonable
- [ ] CPU usage stays low
- [ ] No memory leaks during long sessions
- [ ] UI remains responsive

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue: Extension won't load
**Solutions**:
- Check for syntax errors in manifest.json
- Verify all required files exist
- Check icon files are present
- Look at error message in chrome://extensions/

### Issue: Overlay doesn't appear
**Solutions**:
- Check content script permissions in manifest
- Verify content.js is loading (check console)
- Try refreshing the page
- Check for JavaScript errors in console

### Issue: No transcriptions appear
**Solutions**:
- Verify API key is correct
- Check microphone permissions
- Ensure you're on a supported platform
- Check background service worker console for errors

### Issue: "Cannot read property of undefined" errors
**Solutions**:
- Check that all files are properly linked
- Verify import/export statements
- Check for typos in file paths
- Reload extension

### Issue: Settings don't save
**Solutions**:
- Check Chrome storage permissions in manifest
- Verify storage.sync is available
- Check popup.js console for errors
- Try clearing extension storage

---

## 📝 TEST LOG TEMPLATE

Use this to track your testing:

```
Date: ___________
Tester: ___________

SETUP:
[ ] Icons created
[ ] Extension loaded
[ ] API keys configured
[ ] Language set

BASIC TESTS:
[ ] Service worker: ___________
[ ] Content script: ___________
[ ] Popup: ___________
[ ] Overlay: ___________

FUNCTIONALITY:
[ ] Transcription: ___________
[ ] Medical terms: ___________
[ ] Metrics: ___________
[ ] Session control: ___________

ISSUES FOUND:
1. ___________
2. ___________
3. ___________

NOTES:
___________
___________
```

---

## 🎯 NEXT STEPS AFTER TESTING

1. **Fix Any Bugs Found**
   - Document all issues
   - Prioritize critical bugs
   - Fix one at a time
   - Re-test after fixes

2. **Optimize Performance**
   - Reduce memory usage if needed
   - Optimize animations
   - Reduce API calls

3. **Polish UI**
   - Adjust colors/spacing
   - Improve error messages
   - Add more helpful hints

4. **Prepare for Deployment**
   - Create real icons
   - Write final documentation
   - Prepare store listing

---

## 📞 SUPPORT

**If you encounter issues**:
- Check browser console for errors
- Review this testing guide
- Check documentation in `docs/` folder
- Review `SESSION_SUMMARY` files for implementation details

---

**Good luck with testing! 🚀**
