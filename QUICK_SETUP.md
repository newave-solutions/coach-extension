# Quick Setup Checklist - Start Testing NOW

## ✅ Step-by-Step Setup (5 minutes)

---

### **STEP 1: Create Icons (2 minutes)**

**Option A - Use Any PNG** (Fastest):
1. Find any PNG image on your computer (any size)
2. Make 3 copies
3. Rename them:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
4. Move them to: `C:\Users\LSA\Coding-projects\coach-extension\icons\`

**Option B - Download Online** (Prettier):
1. Go to: https://www.favicon-generator.org/
2. Type "CO" in the text box
3. Click "Create Favicon"
4. Download the package
5. Extract and rename 3 files as above
6. Move to icons folder

✅ **Icons created?** → Move to Step 2

---

### **STEP 2: Load Extension (1 minute)**

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Enable "Developer mode" (toggle top-right)
4. Click "Load unpacked"
5. Select folder: `C:\Users\LSA\Coding-projects\coach-extension`
6. Click "Select Folder"

✅ **Extension loaded?** → You should see "Medical Interpreter Co-Pilot" in the list

**If errors appear:**
- Click "Errors" button to see details
- Most common: Missing icon files → Go back to Step 1

---

### **STEP 3: Get API Keys (2 minutes)**

**Google Cloud API Key:**
1. Go to: https://console.cloud.google.com/
2. Sign in with Google account
3. Create new project (if needed)
4. Go to: APIs & Services → Credentials
5. Click "Create Credentials" → "API Key"
6. **Copy the key** (save it somewhere)

**Enable Required APIs:**
1. Go to: APIs & Services → Library
2. Search "Speech-to-Text" → Click → Enable
3. Search "Translation" → Click → Enable

✅ **API key copied?** → Move to Step 4

---

### **STEP 4: Configure Extension (1 minute)**

1. Click the extension icon in Chrome toolbar
   - If not visible: Click puzzle icon → Find extension → Pin it
2. Popup should open
3. Paste your Google Cloud API key in first field
4. Select languages:
   - Source: English (US)
   - Target: Spanish
5. Click "Save Settings"
6. Should see: "Settings saved successfully!" ✅

✅ **Settings saved?** → Move to Step 5

---

### **STEP 5: Test Basic Functionality (1 minute)**

**Test 1: Check Background Script**
1. Go to: `chrome://extensions/`
2. Find your extension
3. Click "service worker" link
4. Console should show: "[Background] ✓ Extension initialized"

**Test 2: Test Overlay**
1. Go to any webpage (e.g., google.com)
2. Press: `Ctrl + Shift + M` (Windows) or `Cmd + Shift + M` (Mac)
3. Overlay should slide in from right side ✨

**Test 3: Test Settings Popup**
1. Click extension icon
2. Popup opens with your settings ✅

✅ **All tests passed?** → You're ready! 🎉

---

### **STEP 6: Advanced Testing (Optional)**

**Option A: Use Test Helper (Recommended)**
1. Open: `test-helper.html` in Chrome
   - Location: `C:\Users\LSA\Coding-projects\coach-extension\test-helper.html`
2. Press `Ctrl + Shift + M` to show overlay
3. Click buttons to simulate:
   - Transcriptions
   - Medical terms
   - Metrics updates
   - Errors
4. Watch overlay update in real-time

**Option B: Test on Real Call**
1. Go to: https://meet.google.com/
2. Start new meeting (instant meeting)
3. Allow camera/microphone
4. Extension should auto-detect call
5. Speak and watch transcriptions appear

---

## 🚨 Troubleshooting

### Extension won't load
- **Check**: Icon files exist in `icons/` folder
- **Check**: manifest.json has no syntax errors
- **Fix**: Review error message in chrome://extensions/

### Overlay doesn't appear
- **Check**: Content script loaded (F12 → Console)
- **Check**: Keyboard shortcut working
- **Fix**: Refresh the page and try again

### No transcriptions
- **Check**: API key is valid
- **Check**: Microphone permissions granted
- **Fix**: Test API key in popup

### Settings won't save
- **Check**: Popup doesn't show errors
- **Fix**: Clear extension storage and try again

---

## 📊 Quick Status Check

Run this checklist to verify everything:

```
[ ] Icons created (3 PNG files)
[ ] Extension loaded in Chrome
[ ] No errors on extensions page
[ ] Extension icon visible in toolbar
[ ] Popup opens when clicked
[ ] API key configured
[ ] Languages selected
[ ] Settings saved successfully
[ ] Background script initialized
[ ] Overlay appears on Ctrl+Shift+M
[ ] Test helper works (optional)
```

**All checked?** → You're fully set up! 🎉

---

## 🎯 What to Test Next

1. **Basic UI**: Click around, collapse panels, minimize overlay
2. **Simulated Data**: Use test-helper.html to send fake data
3. **Real Call**: Join Google Meet and test live
4. **Error Handling**: Try invalid inputs, network issues
5. **Performance**: Run for 10+ minutes, check memory

---

## 📁 File Locations

Quick reference for files you'll need:

```
Extension folder:
C:\Users\LSA\Coding-projects\coach-extension

Icons:
C:\Users\LSA\Coding-projects\coach-extension\icons\

Test helper:
C:\Users\LSA\Coding-projects\coach-extension\test-helper.html

Testing guide:
C:\Users\LSA\Coding-projects\coach-extension\TESTING_GUIDE.md
```

---

## ✅ YOU'RE READY!

If you completed all 5 steps, you now have:
- ✅ Working Chrome extension
- ✅ Configured API keys
- ✅ Functional overlay interface
- ✅ Settings popup
- ✅ Test tools ready

**Next**: Start testing! Use test-helper.html or join a real call.

**Questions?** Check TESTING_GUIDE.md for detailed instructions.

---

**Good luck! 🚀**
