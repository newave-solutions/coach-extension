/**
 * @file callTimer.js
 * @description Visual timer component for the overlay
 * Displays real-time call duration
 * 
 * @author Newave Solutions
 * @version 1.0.0
 */

/**
 * CallTimer Class
 * Creates and manages a visual timer display in the overlay
 */
class CallTimer {
    /**
     * Initialize the CallTimer
     * @param {Object} config - Configuration object
     * @param {HTMLElement} config.container - Container element for the timer
     * @param {Function} [config.onTimerClick] - Callback when timer is clicked
     */
    constructor(config = {}) {
        this.container = config.container;
        this.onTimerClick = config.onTimerClick || (() => { });

        this.timerElement = null;
        this.isRunning = false;
        this.currentDuration = { seconds: 0, formatted: '00:00:00' };

        this.createTimerElement();
    }

    /**
     * Create the timer UI element
     */
    createTimerElement() {
        // Create timer container
        this.timerElement = document.createElement('div');
        this.timerElement.className = 'call-timer';
        this.timerElement.innerHTML = `
      <div class="timer-icon">🕒</div>
      <div class="timer-display">00:00:00</div>
      <div class="timer-status">Inactive</div>
    `;

        // Add click handler
        this.timerElement.addEventListener('click', () => {
            this.onTimerClick(this.currentDuration);
        });

        // Append to container
        if (this.container) {
            this.container.appendChild(this.timerElement);
        }
    }

    /**
     * Start the timer
     */
    start() {
        this.isRunning = true;
        this.updateStatus('Active');
        this.timerElement.classList.add('active');
        console.log('[CallTimer] Timer started');
    }

    /**
     * Stop the timer
     */
    stop() {
        this.isRunning = false;
        this.updateStatus('Stopped');
        this.timerElement.classList.remove('active');
        console.log('[CallTimer] Timer stopped');
    }

    /**
     * Reset the timer
     */
    reset() {
        this.currentDuration = { seconds: 0, formatted: '00:00:00' };
        this.updateDisplay('00:00:00');
        this.updateStatus('Inactive');
        this.timerElement.classList.remove('active');
    }

    /**
     * Update the timer display
     * @param {Object} duration - Duration object
     */
    update(duration) {
        this.currentDuration = duration;
        this.updateDisplay(duration.formatted);
    }

    /**
     * Update the display with formatted time
     * @param {string} formattedTime - Time in HH:MM:SS format
     */
    updateDisplay(formattedTime) {
        const displayElement = this.timerElement.querySelector('.timer-display');
        if (displayElement) {
            displayElement.textContent = formattedTime;
        }
    }

    /**
     * Update the status text
     * @param {string} status - Status text
     */
    updateStatus(status) {
        const statusElement = this.timerElement.querySelector('.timer-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Show the timer
     */
    show() {
        if (this.timerElement) {
            this.timerElement.style.display = 'block';
        }
    }

    /**
     * Hide the timer
     */
    hide() {
        if (this.timerElement) {
            this.timerElement.style.display = 'none';
        }
    }

    /**
     * Remove the timer from DOM
     */
    destroy() {
        if (this.timerElement && this.timerElement.parentNode) {
            this.timerElement.parentNode.removeChild(this.timerElement);
        }
    }
}

// Export for use in extension
export default CallTimer;

// For CommonJS environments (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallTimer;
}
