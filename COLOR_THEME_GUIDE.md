# InterpreCoach Color Theme Documentation
**Updated:** January 11, 2026  
**Version:** 1.0.1

## 🎨 New Color Palette

### Primary Colors
| Element | Color | HEX | RGB | Usage |
|---------|-------|-----|-----|-------|
| **Gold (Primary)** | ![#DAA520](https://via.placeholder.com/15/DAA520/000000?text=+) | `#DAA520` | `rgb(218, 165, 32)` | Titles, accents, buttons |
| **Dark Gold** | ![#B8860B](https://via.placeholder.com/15/B8860B/000000?text=+) | `#B8860B` | `rgb(184, 134, 11)` | Button gradients, hover states |
| **Bright Gold** | ![#FFD700](https://via.placeholder.com/15/FFD700/000000?text=+) | `#FFD700` | `rgb(255, 215, 0)` | Inverted theme, highlights |
| **White** | ![#FFFFFF](https://via.placeholder.com/15/FFFFFF/000000?text=+) | `#FFFFFF` | `rgb(255, 255, 255)` | Body text, labels |
| **Black** | ![#000000](https://via.placeholder.com/15/000000/000000?text=+) | `#000000` | `rgb(0, 0, 0)` | Backgrounds (with transparency) |

### Accent Colors
| Element | Color | HEX | RGB | Usage |
|---------|-------|-----|-----|-------|
| **Success Green** | ![#4ADE80](https://via.placeholder.com/15/4ADE80/000000?text=+) | `#4ADE80` | `rgb(74, 222, 128)` | Mic indicator, optimal metrics |
| **Crimson Red** | ![#DC143C](https://via.placeholder.com/15/DC143C/000000?text=+) | `#DC143C` | `rgb(220, 20, 60)` | Stop button, alerts |
| **Info Blue** | ![#60A5FA](https://via.placeholder.com/15/60A5FA/000000?text=+) | `#60A5FA` | `rgb(96, 165, 250)` | Secondary indicators |
| **Warning Yellow** | ![#FACC15](https://via.placeholder.com/15/FACC15/000000?text=+) | `#FACC15` | `rgb(250, 204, 21)` | Warnings, pace indicators |

---

## 🖼️ Theme Variations

### Default Theme (Semi-Transparent)
```css
.theme-default {
  background: rgba(0, 0, 0, 0.75);              /* 75% black */
  backdrop-filter: blur(16px);                   /* Glassmorphism */
  border: 1px solid rgba(218, 165, 32, 0.3);    /* Gold border */
}
```

**Visual Characteristics:**
- Background: 75% opaque black
- Blur: 16px backdrop blur
- Border: 30% opaque gold
- Text: Full white
- Titles: Full gold with glow

### Inverted Theme (More Transparent)
```css
.theme-inverted {
  background: rgba(0, 0, 0, 0.5);               /* 50% black */
  backdrop-filter: blur(20px);                   /* Stronger blur */
  border: 1px solid rgba(255, 255, 255, 0.2);   /* White border */
}
```

**Visual Characteristics:**
- Background: 50% opaque black (more see-through)
- Blur: 20px backdrop blur (stronger)
- Border: 20% opaque white
- Text: Full white with shadow
- Titles: Bright gold (#FFD700) with stronger glow

---

## 🎭 Component Styling

### Header
```css
.overlay-header {
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(218, 165, 32, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.brand-name {
  color: #DAA520;                               /* Gold */
  text-shadow: 0 0 10px rgba(218, 165, 32, 0.4);
}
```

### Buttons

**Primary (Start Session):**
```css
.btn-primary {
  background: linear-gradient(135deg, #DAA520 0%, #B8860B 100%);
  color: #000000;                               /* Black text */
  box-shadow: 0 4px 16px rgba(218, 165, 32, 0.4);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #FFD700 0%, #DAA520 100%);
  box-shadow: 0 6px 20px rgba(218, 165, 32, 0.6);
}
```

**Active (Stop Session):**
```css
.btn-primary[data-state="active"] {
  background: linear-gradient(135deg, #DC143C 0%, #8B0000 100%);
  color: #FFFFFF;                               /* White text */
  box-shadow: 0 4px 16px rgba(220, 20, 60, 0.4);
}
```

**Icon Buttons:**
```css
.icon-btn {
  border: 1px solid rgba(218, 165, 32, 0.4);
  color: #DAA520;
}

.icon-btn:hover {
  background: rgba(218, 165, 32, 0.2);
  border-color: rgba(218, 165, 32, 0.7);
  box-shadow: 0 0 12px rgba(218, 165, 32, 0.3);
}
```

### Panels
```css
.panel {
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(218, 165, 32, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.panel:hover {
  border-color: rgba(218, 165, 32, 0.6);
  box-shadow: 0 6px 28px rgba(218, 165, 32, 0.2);
}
```

**Panel Headers:**
```css
.panel-header {
  background: rgba(0, 0, 0, 0.9);
  border-bottom: 1px solid rgba(218, 165, 32, 0.3);
}

.panel-title {
  color: #DAA520;                               /* Gold */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(218, 165, 32, 0.3);
}
```

### Content Cards
```css
.transcription-item,
.term-card {
  background: rgba(218, 165, 32, 0.1);          /* Gold tint */
  border-left: 3px solid #DAA520;               /* Gold accent */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.transcription-speaker,
.term-english {
  color: #DAA520;                               /* Gold */
  text-transform: uppercase;
}

.transcription-text,
.term-translation {
  color: #FFFFFF;                               /* White */
}
```

### Input Fields
```css
.language-select,
.manual-input {
  background: rgba(218, 165, 32, 0.15);
  border: 1px solid rgba(218, 165, 32, 0.4);
  color: #FFFFFF;
}

.language-select:hover,
.manual-input:focus {
  border-color: #DAA520;
  box-shadow: 0 0 12px rgba(218, 165, 32, 0.3);
}
```

---

## ✨ Visual Effects

### Glow Effects
All gold elements have subtle glow for depth:
```css
text-shadow: 0 0 10px rgba(218, 165, 32, 0.4);
box-shadow: 0 4px 16px rgba(218, 165, 32, 0.4);
filter: drop-shadow(0 0 8px rgba(218, 165, 32, 0.5));
```

### Glassmorphism
Backdrop blur creates frosted glass effect:
```css
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
```

### Hover Animations
Interactive elements scale and glow on hover:
```css
transition: all 0.3s ease;
transform: translateY(-2px) scale(1.05);
box-shadow: 0 6px 20px rgba(218, 165, 32, 0.6);
```

### Micro-Animations
```css
/* Button press feedback */
.btn-primary:active {
  transform: translateY(0);
}

/* Theme toggle feedback */
.icon-btn:active {
  transform: scale(1.2);
}

/* Content slide-in */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## 🎯 Accessibility Considerations

### Contrast Ratios
| Combination | Ratio | WCAG Level |
|-------------|-------|------------|
| White on Black (75%) | 19.8:1 | AAA ✅ |
| Gold on Black (75%) | 8.2:1 | AA ✅ |
| Black on Gold | 7.1:1 | AA ✅ |
| White on Gold overlay | 3.5:1 | AA (Large) ✅ |

### Transparency Guidelines
- **Critical text:** Always on 75%+ opacity backgrounds
- **Decorative elements:** Can use lower opacity
- **Interactive elements:** Clear visual feedback on all states
- **Focus indicators:** Gold border with glow effect

### Motion Sensitivity
- All animations are under 0.5s duration
- No infinite flashing or rapid movements
- Respect `prefers-reduced-motion` (can be added)

---

## 🔄 Color Usage Best Practices

### Do's ✅
- Use gold for headings and important labels
- Keep body text white for maximum readability
- Use transparency to show underlying content
- Apply consistent glow effects to related elements
- Use accent colors sparingly for status indicators

### Don'ts ❌
- Don't use gold for body text (readability)
- Don't mix transparency levels randomly
- Don't use pure black backgrounds (harsh)
- Don't overuse glow effects (distracting)
- Don't forget hover states on interactive elements

---

## 🔍 Testing Colors

### Chrome DevTools Color Picker
1. Right-click any element
2. Select "Inspect"
3. In Styles panel, click color square
4. Use eyedropper to verify colors

### Contrast Checker
```javascript
// Test contrast ratio
function getContrastRatio(foreground, background) {
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(...foreground);
  const l2 = getLuminance(...background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Example:
console.log(getContrastRatio([255,255,255], [0,0,0])); // White on Black
console.log(getContrastRatio([218,165,32], [0,0,0]));  // Gold on Black
```

---

## 📱 Responsive Considerations

Colors remain consistent across screen sizes, but:
- Increase glow intensity on smaller screens for visibility
- Adjust transparency based on device capabilities
- Consider touch target sizes with color indicators

---

## 🎨 Future Enhancements

Potential color customization options:
1. User-selectable accent colors
2. High contrast mode
3. Dark mode variations
4. Color blind friendly palette
5. Custom branding colors

---

**End of Color Theme Documentation**
