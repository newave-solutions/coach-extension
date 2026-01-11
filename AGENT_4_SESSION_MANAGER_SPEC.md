# Agent 4: Session Manager Agent
## Specification & Backend Integration
**Date**: January 7, 2026

---

## 🎯 **Purpose**

Agent 4 centralizes all session management, timing, platform detection, and backend synchronization with InterpreLab's Supabase database.

---

## 📋 **Responsibilities**

### **Core Functions**:
1. **Platform Detection** - Identify Google Meet, Zoom, Teams
2. **Session Lifecycle** - Start, track, stop calls
3. **Timer Management** - Accurate millisecond-level timing
4. **Audio Coordination** - Work with transcription agent
5. **Backend Sync** - Log to InterpreLab database
6. **State Management** - Synchronize all components

---

## 🏗️ **Architecture**

```
┌──────────────────────────────────────┐
│     Agent 4: Session Manager         │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Platform Detector              │ │
│  │  • Detect call platform         │ │
│  │  • Extract meeting details      │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Timer Manager                  │ │
│  │  • Start/stop/pause timer       │ │
│  │  • Broadcast updates            │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Backend Sync Manager           │ │
│  │  • Connect to Supabase          │ │
│  │  • Log session data             │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  State Manager                  │ │
│  │  • Track session state          │ │
│  │  • Broadcast to all components  │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
         │
         ├─→ To Other Agents
         ├─→ To Popup UI
         └─→ To Overlay UI
```

---

## 🔌 **Backend Integration**

### **Supabase Connection**

**Endpoint**: `https://[project-id].supabase.co`
**Table**: `call_logs`

**Schema**:
```typescript
interface CallLog {
  id: string;                          // UUID (auto-generated)
  user_id: string;                     // From auth
  start_time: string;                  // ISO 8601
  end_time: string | null;             // ISO 8601
  duration_seconds: number;            // Actual duration
  rounded_duration_seconds: number;    // LSP-style rounding
  earnings: number;                    // Calculated
  rounded_earnings: number;            // LSP-style earnings
  currency: string;                    // 'USD', 'EUR', etc.
  call_type: 'VRI' | 'OPI';           // Video or phone
  platform_name: string;               // 'Google Meet', 'Zoom', 'Teams'
  notes: string | null;                // Optional notes
  is_imported: boolean;                // false for coach
  import_source: string | null;        // 'interprecoach'
}
```

### **API Methods**

**Session Start**:
```javascript
async function logSessionStart(sessionData) {
  const { data, error } = await supabase
    .from('call_logs')
    .insert({
      user_id: sessionData.userId,
      start_time: new Date().toISOString(),
      platform_name: sessionData.platform,
      call_type: sessionData.callType || 'VRI',
      currency: 'USD',
      is_imported: false,
      import_source: 'interprecoach'
    })
    .select()
    .single();
    
  return { id: data.id, error };
}
```

**Session Update** (during call):
```javascript
async function updateSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('call_logs')
    .update({
      duration_seconds: updates.durationSeconds,
      earnings: updates.earnings,
      // ... other fields
    })
    .eq('id', sessionId);
    
  return { data, error };
}
```

**Session End**:
```javascript
async function logSessionEnd(sessionId, finalData) {
  const { data, error } = await supabase
    .from('call_logs')
    .update({
      end_time: new Date().toISOString(),
      duration_seconds: finalData.durationSeconds,
      rounded_duration_seconds: finalData.roundedSeconds,
      earnings: finalData.earnings,
      rounded_earnings: finalData.roundedEarnings,
      notes: finalData.notes
    })
    .eq('id', sessionId);
    
  return { data, error };
}
```

---

## 📁 **File Structure**

### **Main File**: `agents/sessionManagerAgent.js` (~800 lines)

```javascript
/**
 * Agent 4: Session Manager Agent
 * Handles session lifecycle, timing, and backend sync
 */
class SessionManagerAgent {
  constructor(config) {
    // Supabase config
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.userId = config.userId;
    
    // Session state
    this.sessionId = null;
    this.isActive = false;
    this.startTime = null;
    this.platform = 'Unknown';
    this.callType = 'VRI';
    
    // Timer
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    
    // Callbacks
    this.onStateChange = config.onStateChange || (() => {});
    this.onTimerUpdate = config.onTimerUpdate || (() => {});
    this.onError = config.onError || console.error;
  }
  
  // ... methods below
}
```

### **Supporting Files**:

**`utils/platformDetector.js`** (~200 lines)
- Detect platform from URL
- Extract meeting details
- Validate platform support

**`utils/backendSync.js`** (~300 lines)
- Supabase client wrapper
- API call handling
- Error retry logic
- Offline queue

---

## 🔧 **Key Methods**

### **1. Start Session**
```javascript
async startSession(platform, callType = 'VRI') {
  try {
    // Set state
    this.isActive = true;
    this.platform = platform;
    this.callType = callType;
    this.startTime = Date.now();
    this.elapsedSeconds = 0;
    
    // Log to backend
    const { id, error } = await this.logSessionStart({
      userId: this.userId,
      platform: platform,
      callType: callType
    });
    
    if (error) throw error;
    this.sessionId = id;
    
    // Start timer
    this.startTimer();
    
    // Broadcast state
    this.broadcastState();
    
    return { success: true, sessionId: id };
  } catch (error) {
    this.onError({
      source: 'SessionManager',
      message: `Failed to start session: ${error.message}`
    });
    return { success: false, error };
  }
}
```

### **2. Update Session**
```javascript
async updateSession() {
  if (!this.isActive || !this.sessionId) return;
  
  try {
    // Calculate current data
    const duration = this.elapsedSeconds;
    const earnings = this.calculateEarnings(duration);
    
    // Update backend (throttled - every 30 seconds)
    if (duration % 30 === 0) {
      await this.updateBackend({
        duration_seconds: duration,
        earnings: earnings
      });
    }
  } catch (error) {
    console.warn('Session update failed:', error);
    // Don't throw - will retry next update
  }
}
```

### **3. Stop Session**
```javascript
async stopSession(notes = '') {
  try {
    // Stop timer
    this.stopTimer();
    
    // Calculate final data
    const finalData = {
      durationSeconds: this.elapsedSeconds,
      roundedSeconds: this.calculateRounded(this.elapsedSeconds),
      earnings: this.calculateEarnings(this.elapsedSeconds),
      roundedEarnings: this.calculateEarnings(
        this.calculateRounded(this.elapsedSeconds)
      ),
      notes: notes
    };
    
    // Log to backend
    await this.logSessionEnd(this.sessionId, finalData);
    
    // Reset state
    this.isActive = false;
    this.sessionId = null;
    this.elapsedSeconds = 0;
    
    // Broadcast state
    this.broadcastState();
    
    return { success: true, data: finalData };
  } catch (error) {
    this.onError({
      source: 'SessionManager',
      message: `Failed to stop session: ${error.message}`
    });
    return { success: false, error };
  }
}
```

### **4. Timer Management**
```javascript
startTimer() {
  if (this.timerInterval) return;
  
  this.timerInterval = setInterval(() => {
    this.elapsedSeconds++;
    
    // Broadcast timer update
    this.onTimerUpdate({
      seconds: this.elapsedSeconds,
      formatted: this.formatTime(this.elapsedSeconds)
    });
    
    // Update session in backend (throttled)
    this.updateSession();
  }, 1000);
}

stopTimer() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
}
```

---

## 📊 **Configuration**

### **Required Config**:
```javascript
const agent4Config = {
  // Backend
  supabaseUrl: 'https://[project].supabase.co',
  supabaseKey: '[anon-key]',
  userId: '[user-id-from-auth]',
  
  // Callbacks
  onStateChange: (state) => { /* broadcast */ },
  onTimerUpdate: (data) => { /* broadcast */ },
  onError: (error) => { /* handle */ },
  
  // Optional
  updateInterval: 30, // seconds between backend updates
  payRate: 25,        // USD per hour
  currency: 'USD'
};
```

---

## 🧪 **Testing Plan**

### **Unit Tests**:
- [ ] Start/stop session
- [ ] Timer accuracy
- [ ] Platform detection
- [ ] Backend sync
- [ ] Error handling

### **Integration Tests**:
- [ ] Full session workflow
- [ ] Network failures
- [ ] Multiple sessions
- [ ] Offline mode

---

## ✅ **Success Criteria**

- ✅ Sessions log to InterpreLab dashboard
- ✅ Timer accurate to within 1 second
- ✅ Platform detected 100% correctly
- ✅ Graceful error handling
- ✅ No data loss on network failure

---

**Status**: Specification Complete  
**Ready for**: Implementation in Phase 7B  
**Dependencies**: Supabase credentials from InterpreLab