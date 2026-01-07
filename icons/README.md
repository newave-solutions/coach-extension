# Icon Files for Coach Extension

## Quick Setup (For Testing)

You need 3 PNG icon files for the extension to load:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

---

## 🚀 FASTEST METHOD: Use Favicon Generator

1. **Go to**: https://www.favicon-generator.org/
2. **Upload** any image or use text "CO" (for Coach)
3. **Generate** and download the package
4. **Extract** and copy these files here:
   - `favicon-16x16.png` → rename to `icon16.png`
   - `favicon-32x32.png` → rename to `icon48.png`
   - `android-chrome-192x192.png` → rename to `icon128.png`

---

## 🎨 ALTERNATIVE: Create in Paint/Photoshop

1. Create 3 new images:
   - 16x16 px (small)
   - 48x48 px (medium)
   - 128x128 px (large)

2. Add simple design:
   - Microphone icon
   - Medical cross
   - "CO" text
   - Purple gradient background

3. Save as PNG files with correct names

---

## ⚡ QUICK WORKAROUND (Testing Only)

If you just need to test the extension NOW:

1. Find ANY small PNG image on your computer
2. Make 3 copies
3. Rename them:
   - Copy 1 → `icon16.png`
   - Copy 2 → `icon48.png`
   - Copy 3 → `icon128.png`
4. Place them in this `icons/` folder

The extension will load and work fine with any placeholder images.

---

## 📐 Design Specifications

### Recommended Design:
- **Background**: Purple gradient (#667eea → #764ba2)
- **Icon**: White microphone with medical cross
- **Style**: Modern, flat, minimal
- **Format**: PNG with transparency

### Size Requirements:
- **16x16**: Used in extension toolbar (small)
- **48x48**: Used in extension management page
- **128x128**: Used in Chrome Web Store

---

## 🔍 Current Status

After creating icons, verify:
```
icons/
├── icon16.png   ← 16x16 pixels
├── icon48.png   ← 48x48 pixels
└── icon128.png  ← 128x128 pixels
```

Then reload extension in `chrome://extensions/`

---

## 💡 Pro Tip

For the final version, consider using:
- **Figma**: https://figma.com (free)
- **Canva**: https://canva.com (free templates)
- **IconFinder**: https://iconfinder.com (pre-made icons)

But for testing, any 3 PNG files will work!
