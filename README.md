# Medical Interpreter Co-Pilot Chrome Extension

> Real-time AI assistance for medical interpreters with live transcription, terminology translation, and performance evaluation based on NCIHC standards.

## 🎯 Overview

This Chrome extension provides medical interpreters with a sophisticated AI co-pilot system featuring three specialized agents working in real-time during medical interpretation sessions.

### Core Features

- **🎤 Real-Time Transcription** - Live audio capture and transcription using Google Cloud Speech-to-Text
- **🏥 Medical Terminology Detection** - Automatic detection, translation, and phonetic pronunciation of medical terms
- **📊 Performance Evaluation** - AI-powered analysis based on NCIHC (National Council on Interpretation in Health Care) standards
- **📈 Advanced Dashboard** - Post-call comprehensive performance metrics and improvement suggestions

## 🏗️ Architecture

### 3-Agent System

```
┌─────────────────────────────────────────────┐
│           Live Medical Call                 │
└───────────────┬─────────────────────────────┘
                ↓
┌───────────────────────────────────────────────┐
│  AGENT 1: Transcription Agent                 │
│  • Captures audio from Chrome tab             │
│  • Real-time speech-to-text                   │
│  • Medical conversation model                 │
└───────────────┬───────────────────────────────┘
                ↓
        [Transcription Stream]
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
┌─────────────┐    ┌──────────────────┐
│  AGENT 2:   │    │    AGENT 3:      │
│  Medical    │    │    Performance   │
│  Terms      │    │    Evaluation    │
│             │    │                  │
│  • Detect   │    │  • NLP Analysis  │
│  • Translate│    │  • NCIHC Stds    │
│  • Phonetics│    │  • Metrics       │
└─────────────┘    └──────────────────┘
```

### Technology Stack

- **Frontend**: Vanilla JavaScript, React (dashboard), Tailwind CSS
- **Extension**: Chrome Manifest V3, ES6 Modules
- **APIs**: 
  - Google Cloud Speech-to-Text
  - Google Cloud Translation
  - Anthropic Claude (NLP analysis)
- **Storage**: Chrome Storage API (sync & local)

## 📦 Installation

### For Development

1. **Clone the repository**
   ```bash
   cd C:\Users\LSA\Coding-projects\coach-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Keys**
   - Open the extension settings (click extension icon)
   - Add your API keys:
     - Google Cloud API Key (Speech + Translation)
     - Anthropic API Key (Claude)

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `coach-extension` folder
   - Extension icon should appear in Chrome toolbar

### For Users

*(Distribution via Chrome Web Store - coming soon)*

## 🚀 Quick Start

1. **Join a medical interpretation call** (Zoom, Google Meet, Teams, etc.)
2. **Click the extension icon** in Chrome toolbar
3. **Click "Start Monitoring"** in the popup
4. **View real-time data** in the overlay:
   - Live transcription
   - Detected medical terms with translations
   - Live performance metrics
5. **Click "Stop"** when call ends
6. **Review comprehensive dashboard** with:
   - Overall performance score
   - Category breakdowns
   - Detailed findings with context
   - Prioritized suggestions

## 📊 Performance Evaluation

Based on **NCIHC Standards of Practice**, the extension evaluates:

### Core Categories (Weighted Scoring)

1. **Accuracy (30%)** - Message completeness and fidelity
2. **Professional Conduct (25%)** - NCIHC standards adherence
3. **Fluency (15%)** - Speech naturalness and flow
4. **Grammar (10%)** - Grammatical correctness
5. **Sentence Structure (10%)** - Clarity and organization
6. **Cultural Competency (10%)** - Cultural adaptation skills

### Detected Issues

- ❌ False starts and self-corrections
- ❌ Stuttering and hesitations
- ❌ Filler words (um, uh, like, you know)
- ❌ Grammar errors (subject-verb agreement, tense, etc.)
- ❌ First-person violations (interpreters should use "I", not "he/she says")
- ❌ Editorial comments or personal opinions
- ❌ WPM deviations (target: 85-95 WPM for medical interpretation)

## 🗂️ Project Structure

```
coach-extension/
├── manifest.json              # Chrome extension manifest
├── background.js              # Service worker
├── content.js                 # Content script
├── agents/
│   ├── transcriptionAgent.js        # Agent 1: Audio → Text
│   ├── medicalTerminologyAgent.js   # Agent 2: Terms → Translation
│   ├── performanceEvaluationAgent.js # Agent 3: Analysis → Metrics
│   └── agentOrchestrator.js         # Coordinates all agents
├── ui/
│   ├── overlay.html          # Multi-panel overlay
│   ├── overlay.css           # Styles
│   ├── overlay.js            # Overlay logic
│   ├── popup.html            # Settings popup
│   ├── popup.js              # Popup logic
│   └── dashboard.jsx         # Performance dashboard
├── utils/
│   ├── messageHandler.js     # Message passing
│   ├── storageManager.js     # Storage wrapper
│   ├── ncihcStandards.js     # NCIHC reference
│   └── audioProcessor.js     # Audio utilities
└── tests/                    # Test files
```

## 🔧 Configuration

### API Keys

API keys are stored securely in Chrome's encrypted storage (chrome.storage.sync).

**Required APIs:**

1. **Google Cloud Speech-to-Text**
   - Enable at: https://console.cloud.google.com/apis/library/speech.googleapis.com
   - Create API key with Speech-to-Text API enabled

2. **Google Cloud Translation**
   - Enable at: https://console.cloud.google.com/apis/library/translate.googleapis.com
   - Use same API key as above

3. **Anthropic Claude**
   - Get API key at: https://console.anthropic.com/
   - Requires Claude Sonnet 4 access

### Settings

Configure in extension popup:
- **Source Language**: Default English (en-US)
- **Target Language**: Default Spanish (es) - configurable
- **WPM Target**: 85-95 (medical interpretation standard)
- **Metrics Update Frequency**: 2 seconds (throttled)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test transcriptionAgent.test.js
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🆘 Support

For issues, questions, or feature requests:
- GitHub Issues: [Link to be added]
- Email: support@newave-solutions.com

## 🎓 NCIHC Standards Reference

This extension is designed to support interpreters in meeting the National Council on Interpretation in Health Care (NCIHC) Standards of Practice:
- Standard 3: Accuracy and Completeness
- Standard 5: Impartiality and Avoidance of Conflict of Interest
- Standard 8: Respect for Persons
- Standard 9: Professional Development

Learn more at: https://www.ncihc.org/

## 📈 Roadmap

- [ ] Phase 1: Core agent implementation (Q1 2025)
- [ ] Phase 2: UI and dashboard development (Q1 2025)
- [ ] Phase 3: Testing and refinement (Q2 2025)
- [ ] Phase 4: Beta release (Q2 2025)
- [ ] Phase 5: Chrome Web Store submission (Q3 2025)
- [ ] Phase 6: Multi-language support expansion (Q3 2025)
- [ ] Phase 7: Team dashboard and analytics (Q4 2025)

---

**Built with ❤️ by Newave Solutions**
