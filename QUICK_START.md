# Quick Start - Testing InterpreCoach Extension

## ⚡ 3-Minute Setup

### 1. Load Extension (1 min)
```bash
1. Open Chrome browser
2. Go to: chrome://extensions/
3. Toggle "Developer mode" ON (top-right)
4. Click "Load unpacked"
5. Navigate to: C:\Users\LSA\Coding-projects\coach-extension
6. Click "Select Folder"
```

**Expected Result:** Extension appears in list with gold icon ✅

---

### 2. Test on Google Meets (1 min)
```bash
1. Open new tab
2. Go to: https://meet.google.com
3. Start or join a meeting
4. Wait 2-3 seconds
```

**Expected Result:** Black/gold overlay appears in top-left ✅

---

### 3. Test Core Features (1 min)

#### A. Start Button
```bash
1. Click "START SESSION" button
```
✅ Button turns red and says "STOP SESSION"
✅ Empty panels show "Listening..." messages
✅ Toast notification appears

#### B. Theme Toggle  
```bash
1. Click half-circle icon (theme toggle)
```
✅ Overlay becomes more transparent
✅ Gold colors get brighter
✅ Button scales briefly (visual feedback)

#### C. Drag Overlay
```bash
1. Click and hold header bar
2. Drag to new position
```
✅ Overlay moves smoothly

---

## 🎯 Visual Checklist

When you see the overlay, verify:

- [ ] Background is black and semi-transparent
- [ ] "InterpreCoach" title is GOLD
- [ ] All panel titles are GOLD and uppercase
- [ ] Body text is WHITE
- [ ] Borders have gold glow
- [ ] Buttons have gold gradient
- [ ] Microphone icon is green and pulsing

---

## 🐛 Troubleshooting (30 seconds each)

### Problem: Overlay doesn't appear
```javascript
// Open console (F12), run:
chrome.runtime.sendMessage({action: 'INJECT_OVERLAY'})
```

### Problem: Buttons don't work
```javascript
// Check iframe console (F12 > top > select iframe):
console.log(elements.toggleBtn)
// Should not be null
```

### Problem: Wrong colors
```javascript
// Force reload extension:
1. Go to chrome://extensions/
2. Click reload icon on extension card
3. Refresh Google Meet page
```

---

## ✨ Expected Behavior

### Start Button States
| State | Text | Color | Action |
|-------|------|-------|--------|
| Inactive | "Start Session" | Gold gradient | Starts session |
| Active | "Stop Session" | Red gradient | Stops session |

### Theme Toggle States
| State | Background | Titles | Effect |
|-------|-----------|--------|---------|
| Default | 75% black | Standard gold | Semi-transparent |
| Inverted | 50% black | Bright gold | Very transparent |

---

## 📊 Success Metrics

After 3 minutes, you should have:
- ✅ Extension loaded
- ✅ Overlay visible on Google Meets
- ✅ Start button working
- ✅ Theme toggle working
- ✅ Correct colors (black/gold/white)
- ✅ All interactive elements responding

---

## 🎬 Demo Flow

**Perfect 30-second demo:**
```
1. Open Google Meet (3s)
2. Overlay appears (2s)
3. Click Start Session (2s)
   → Button turns red ✅
4. Click Theme Toggle (2s)
   → Overlay becomes more transparent ✅
5. Drag overlay to new position (3s)
   → Moves smoothly ✅
6. Type in notes panel (3s)
   → Text appears in white ✅
7. Click language dropdown (3s)
   → Shows Spanish, Chinese, etc. ✅
8. Type in bottom input bar + Enter (3s)
   → Toast shows "Input sent" ✅
9. Click Stop Session (2s)
   → Button turns gold again ✅
10. Refresh page (4s)
    → Theme preference persists ✅
```

**Total: 30 seconds of interactive proof**

---

## 🎉 You're Done!

If all checks pass, the extension is working perfectly!

**Next Steps:**
- Read `BUG_FIXES_TESTING_GUIDE.md` for detailed testing
- Review `COLOR_THEME_GUIDE.md` for design details
- Check `SESSION_HANDOFF_DOCUMENT.md` for architecture

---

## 🆘 Still Having Issues?

1. **Check console for errors:** Press F12
2. **Verify file paths:** Ensure all files saved
3. **Clear cache:** Ctrl+Shift+Delete
4. **Reload extension:** chrome://extensions/ → reload
5. **Test in Incognito:** Ctrl+Shift+N

**Last resort:** Unload and reload extension completely

---

**Happy Testing! 🚀**
