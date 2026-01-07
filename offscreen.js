// Offscreen Document for Speech Recognition
// Runs in a hidden page with access to window/navigator APIs

let recognition = null;
let isActive = false;

console.log('[Offscreen] Document loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Offscreen] Message received:', message.action);

    switch (message.action) {
        case 'START_RECOGNITION':
            startRecognition(message.language);
            sendResponse({ success: true });
            break;

        case 'STOP_RECOGNITION':
            stopRecognition();
            sendResponse({ success: true });
            break;

        case 'GET_STATUS':
            sendResponse({ isActive });
            break;

        default:
            sendResponse({ error: 'Unknown action' });
    }

    return false;
});

/**
 * Start speech recognition
 */
function startRecognition(language = 'en-US') {
    try {
        console.log('[Offscreen] Starting recognition with language:', language);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('[Offscreen] Web Speech API not supported');
            chrome.runtime.sendMessage({
                action: 'RECOGNITION_ERROR',
                error: 'Web Speech API not supported'
            });
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const isFinal = event.results[i].isFinal;
                const confidence = event.results[i][0].confidence || 0.9;

                // Send result to background script
                chrome.runtime.sendMessage({
                    action: 'RECOGNITION_RESULT',
                    data: {
                        transcript,
                        isFinal,
                        confidence,
                        timestamp: Date.now()
                    }
                });
            }
        };

        recognition.onerror = (event) => {
            console.error('[Offscreen] Recognition error:', event.error);

            if (event.error !== 'no-speech') {
                chrome.runtime.sendMessage({
                    action: 'RECOGNITION_ERROR',
                    error: event.error
                });
            }

            // Auto-restart on certain errors
            if (isActive && (event.error === 'network' || event.error === 'audio-capture')) {
                setTimeout(() => {
                    if (isActive) {
                        recognition.start();
                    }
                }, 1000);
            }
        };

        recognition.onend = () => {
            console.log('[Offscreen] Recognition ended');
            if (isActive) {
                // Auto-restart to keep continuous
                setTimeout(() => {
                    try {
                        if (isActive) {
                            recognition.start();
                        }
                    } catch (error) {
                        console.warn('[Offscreen] Could not restart:', error);
                    }
                }, 100);
            }
        };

        recognition.start();
        isActive = true;
        console.log('[Offscreen] Recognition started');

    } catch (error) {
        console.error('[Offscreen] Failed to start recognition:', error);
        chrome.runtime.sendMessage({
            action: 'RECOGNITION_ERROR',
            error: error.message
        });
    }
}

/**
 * Stop speech recognition
 */
function stopRecognition() {
    console.log('[Offscreen] Stopping recognition');
    isActive = false;

    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.warn('[Offscreen] Recognition already stopped:', error);
        }
        recognition = null;
    }
}

// Request microphone permission on load
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
        console.log('[Offscreen] Microphone permission granted');
    })
    .catch((error) => {
        console.error('[Offscreen] Microphone permission denied:', error);
    });
