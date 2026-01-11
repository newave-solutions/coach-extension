# Frontend Integration Master Specification
## Medical Interpreter Co-Pilot Chrome Extension
**Based on Image 2 Mockup Design** | **Date**: January 7, 2026

---

## 🎨 **Design Reference**

**Target Design**: Floating overlay with compact tab-based panels (Image 2)
- Dark theme with teal/cyan accents (#00CED1 range)
- Compact header with branding and controls
- Tab-based navigation for panels
- Minimizable/expandable interface
- Search functionality integrated
- Clean, professional medical aesthetic

---

## 📋 **Complete Feature Inventory**

### **✅ Currently Implemented (Phase 6)**
1. Live Transcription Panel - Real-time speech-to-text feed
2. Medical Terminology Panel - Term cards with translations
3. Live Metrics Panel - Performance scoring dashboard

### **❌ Missing from Mockup (To Implement)**
4. Scratchpad/Notes Panel - Quick note-taking during calls
5. Audio Input Panel - Waveform visualization
6. QA Tips Panel - Real-time interpreter reminders
7. My Dictionary Panel - Personal terminology storage
8. Delivery Analysis Panel - Pace/tone chart visualization
9. Interpreter Output Panel - Translated output preview
10. Search Bar - Quick terminology search functionality

---

## 🚀 **Implementation Roadmap**

### **Phase 7A: Critical Bug Fixes** (CURRENT - This Session)
**Goal**: Fix existing functionality before adding new features
**Duration**: 1-2 hours

#### Bugs to Fix:
- [ ] Timer sync between popup and overlay
- [ ] Status sync (Active vs Ready mismatch)
- [ ] Platform detection (Unknown → Google Meet)
- [ ] Audio capture not starting
- [ ] Session state management

**Files to Modify**:
- `background.js` - Session state broadcasting
- `content.js` - Message relay fixes
- `ui/overlay.js` - State update handlers
- `ui/popup.js` - Status display logic

**Success Criteria**:
- ✅ Popup and overlay show same timer
- ✅ Status displays correctly everywhere
- ✅ Platform name detected and shown
- ✅ Transcription starts automatically
- ✅ No console errors

---

### **Phase 7B: Agent 4 - Session Manager** (Next Session)
**Goal**: Create comprehensive session management agent
**Duration**: 2-3 hours

#### Agent 4 Responsibilities:
- [ ] Platform detection (Google Meet, Zoom, Teams)
- [ ] Call start/stop detection (auto or manual)
- [ ] Timer management (accurate to millisecond)
- [ ] Audio capture coordination
- [ ] Session logging to InterpreLab backend
- [ ] State synchronization (popup ↔ overlay)

**Files to Create**:
- `agents/sessionManagerAgent.js` (~800 lines)
- `utils/platformDetector.js` (~200 lines)
- `utils/backendSync.js` (~300 lines)

**Backend Integration**:
```javascript
// POST to InterpreLab Supabase
await supabase
  .from('call_logs')
  .insert({
    user_id: userId,
    start_time: startTime,
    platform_name: 'Google Meet',
    call_type: 'VRI' // or 'OPI'
  });
```

**Success Criteria**:
- ✅ Sessions auto-log to InterpreLab dashboard
- ✅ Timer accurate and synchronized
- ✅ Platform correctly detected
- ✅ Call start/stop events captured

---

### **Phase 7C: Frontend Redesign - Part 1** (Session 3)
**Goal**: Implement Image 2 tab-based layout
**Duration**: 3-4 hours

#### UI Structure Changes:
- [ ] Convert panels to tab-based system
- [ ] Add compact header with logo
- [ ] Implement panel switching
- [ ] Add minimize/maximize states
- [ ] Implement search bar

**New Files**:
- `ui/tabManager.js` (~300 lines)
- `ui/searchBar.js` (~200 lines)
- `ui/overlay-v2.html` (redesigned structure)
- `ui/overlay-v2.css` (new styling)

**Tab Configuration**:
```javascript
const tabs = [
  { id: 'transcription', icon: '🎤', label: 'Live' },
  { id: 'terminology', icon: '📚', label: 'Terms' },
  { id: 'scratchpad', icon: '📝', label: 'Notes' },
  { id: 'audio', icon: '🎵', label: 'Audio' },
  { id: 'qa-tips', icon: '💡', label: 'Tips' },
  { id: 'dictionary', icon: '📖', label: 'Dictionary' }
];
```

**Success Criteria**:
- ✅ Tabs switch smoothly
- ✅ Only one panel visible at a time
- ✅ Search bar functional
- ✅ Layout matches Image 2

---

### **Phase 7D: Frontend Redesign - Part 2** (Session 4)
**Goal**: Implement missing panels
**Duration**: 3-4 hours

#### New Panels to Create:

**1. Scratchpad/Notes Panel**
- [ ] Rich text area for notes
- [ ] Auto-save every 30 seconds
- [ ] Timestamp integration
- [ ] Export to clipboard

**2. Audio Input Panel**
- [ ] Real-time waveform visualization
- [ ] Audio level meter
- [ ] Mic status indicator
- [ ] Volume control

**3. QA Tips Panel**
- [ ] Context-aware tips
- [ ] NCIHC standard reminders
- [ ] Performance-based suggestions
- [ ] Dismissible tips

**4. My Dictionary Panel**
- [ ] Personal term storage
- [ ] Add/edit/delete functionality
- [ ] Import/export terms
- [ ] Search within dictionary

**5. Delivery Analysis Panel**
- [ ] Pace chart (WPM over time)
- [ ] Tone analysis visualization
- [ ] Pause detection graph
- [ ] Clarity score

**6. Interpreter Output Panel**
- [ ] Display translated text
- [ ] Copy to clipboard
- [ ] Edit before copying
- [ ] Language toggle

**Files to Create**:
- `ui/panels/scratchpad.js` (~250 lines)
- `ui/panels/audioInput.js` (~300 lines)
- `ui/panels/qaTips.js` (~200 lines)
- `ui/panels/dictionary.js` (~400 lines)
- `ui/panels/deliveryAnalysis.js` (~300 lines)
- `ui/panels/interpreterOutput.js` (~250 lines)

**Success Criteria**:
- ✅ All 6 new panels functional
- ✅ Data persists across sessions
- ✅ Smooth animations
- ✅ No performance degradation

---

### **Phase 7E: Performance Optimization** (Session 5)
**Goal**: Minimize call quality impact
**Duration**: 2-3 hours

#### Optimizations:
- [ ] Lazy load panels (only active panel loaded)
- [ ] Throttle UI updates (max 10 FPS)
- [ ] Reduce content script size
- [ ] Minimize DOM manipulations
- [ ] Compress assets

**Performance Targets**:
- CPU usage: <5% during call
- Memory: <50MB total
- Network: <100KB/min overhead
- No frame drops in video

**Files to Modify**:
- All agent files (optimization pass)
- `ui/overlay.js` (rendering optimization)
- `content.js` (injection optimization)

**Success Criteria**:
- ✅ No "call quality" warning from Google Meet
- ✅ Video remains smooth (60 FPS)
- ✅ Audio has zero latency impact
- ✅ Extension feels lightweight

---

### **Phase 7F: Polish & Testing** (Session 6)
**Goal**: Final refinement and bug fixes
**Duration**: 2-3 hours

#### Polish Tasks:
- [ ] Animation refinement
- [ ] Color scheme consistency
- [ ] Icon replacements (SVG → professional)
- [ ] Loading states
- [ ] Error messaging
- [ ] Tooltip additions
- [ ] Keyboard shortcuts

#### Testing Checklist:
- [ ] 1-hour call stress test
- [ ] Multiple platform testing (Meet, Zoom, Teams)
- [ ] Edge cases (network drop, permission denied)
- [ ] Mobile responsive (if applicable)
- [ ] Dark mode verification
- [ ] Accessibility audit

**Success Criteria**:
- ✅ Zero bugs in 1-hour test
- ✅ Works on all 3 platforms
- ✅ Graceful error handling
- ✅ Professional polish

---

## 🎯 **Overall Success Metrics**

### **Functionality**
- ✅ 10/10 panels implemented and working
- ✅ Backend integration to InterpreLab
- ✅ Session data logging accurate
- ✅ Real-time updates smooth

### **Performance**
- ✅ <5% CPU usage during calls
- ✅ <50MB memory footprint
- ✅ Zero video/audio degradation
- ✅ No "call quality" warnings

### **User Experience**
- ✅ Design matches Image 2 mockup
- ✅ Intuitive tab navigation
- ✅ Fast, responsive interface
- ✅ Professional appearance

### **Quality**
- ✅ Zero console errors
- ✅ All error cases handled
- ✅ Comprehensive documentation
- ✅ Clean, maintainable code

---

## 📊 **Progress Tracking**

| Phase | Status | Completion | Duration | Date |
|-------|--------|------------|----------|------|
| 7A: Bug Fixes | 🟡 In Progress | 20% | 1-2h | Jan 7 |
| 7B: Agent 4 | ⏳ Pending | 0% | 2-3h | TBD |
| 7C: Redesign P1 | ⏳ Pending | 0% | 3-4h | TBD |
| 7D: Redesign P2 | ⏳ Pending | 0% | 3-4h | TBD |
| 7E: Optimization | ⏳ Pending | 0% | 2-3h | TBD |
| 7F: Polish | ⏳ Pending | 0% | 2-3h | TBD |

**Total Estimated**: 13-18 hours across 6 sessions

---

## 🔄 **Session Handoff Protocol**

### **Starting a New Session:**
1. Read `project-setup-progress.md` for overall status
2. Read this `FRONTEND_INTEGRATION_MASTER_SPEC.md` for phase details
3. Read `SESSION_HANDOFF_DOCUMENT.md` for latest progress
4. Continue with next uncompleted phase

### **Ending a Session:**
1. Update `project-setup-progress.md` with phase completion
2. Update this spec's Progress Tracking table
3. Create/update `SESSION_HANDOFF_DOCUMENT.md` with:
   - What was completed
   - What's next
   - Any blockers or issues
   - Code snippets or important notes

---

## 📝 **Technical Notes**

### **Architecture Decisions**

**Why Tab-Based Instead of Stacked Panels?**
- Reduces visual clutter
- Better performance (only render active panel)
- Matches Image 2 mockup design
- Easier to add more panels later

**Why Agent 4 (Session Manager)?**
- Centralizes session logic
- Simplifies state management
- Easier backend integration
- Better error handling

**Why Lazy Loading?**
- Improves initial load time
- Reduces memory usage
- Better performance during calls
- Smoother experience

### **Backend Integration**

**Supabase Connection**:
```javascript
// Extension will need Supabase credentials
const SUPABASE_URL = 'https://[project].supabase.co';
const SUPABASE_ANON_KEY = '[anon-key]';

// User authentication via OAuth or API key
// Sessions auto-logged to InterpreLab dashboard
```

**API Calls**:
- Session Start: `POST /call_logs`
- Session Update: `PATCH /call_logs/:id`
- Session End: `PATCH /call_logs/:id` (with final data)

**Data Synced**:
- Start/end timestamps
- Duration (seconds)
- Platform name
- Call type (VRI/OPI)
- Earnings (calculated)
- Performance scores
- Transcription count
- Medical terms detected

---

## ✅ **Definition of Done**

A phase is considered complete when:

1. **All checkboxes marked** ✅
2. **No console errors** in production
3. **All files committed** to git
4. **Progress docs updated**
5. **Tested in real call** (minimum 5 minutes)
6. **Handoff doc created** for next session

---

**Last Updated**: January 7, 2026  
**Document Version**: 1.0  
**Status**: Living Document (update as needed)