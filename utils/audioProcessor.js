// ===================================================================
// Audio Processor Utilities
// File: utils/audioProcessor.js
// ===================================================================

/**
 * Audio processing utilities for Chrome Extension
 * Provides helper functions for audio format conversion,
 * buffer management, and audio analysis.
 */

/**
 * Convert Float32Array (Web Audio API format) to Int16Array (Google Cloud format)
 * @param {Float32Array} float32Array - Input audio data
 * @returns {Int16Array} Converted audio data
 */
export function convertFloat32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] range
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    
    // Convert to 16-bit integer
    // Negative values: multiply by 0x8000 (32768)
    // Positive values: multiply by 0x7FFF (32767)
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  
  return int16Array;
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer - Input buffer
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} Decoded buffer
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Calculate RMS (Root Mean Square) of audio buffer
 * Used for volume level detection
 * @param {Float32Array} buffer - Audio buffer
 * @returns {number} RMS value (0 to 1)
 */
export function calculateRMS(buffer) {
  let sum = 0;
  
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  
  const rms = Math.sqrt(sum / buffer.length);
  return rms;
}

/**
 * Detect if audio contains speech (simple VAD - Voice Activity Detection)
 * @param {Float32Array} buffer - Audio buffer
 * @param {number} threshold - RMS threshold for speech (default: 0.01)
 * @returns {boolean} True if speech detected
 */
export function detectSpeech(buffer, threshold = 0.01) {
  const rms = calculateRMS(buffer);
  return rms > threshold;
}

/**
 * Normalize audio buffer to [-1, 1] range
 * @param {Float32Array} buffer - Audio buffer
 * @returns {Float32Array} Normalized buffer
 */
export function normalizeAudio(buffer) {
  let max = 0;
  
  // Find maximum absolute value
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > max) {
      max = abs;
    }
  }
  
  // Normalize if max > 0
  if (max > 0) {
    const normalized = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      normalized[i] = buffer[i] / max;
    }
    return normalized;
  }
  
  return buffer;
}

/**
 * Apply simple high-pass filter to remove low-frequency noise
 * @param {Float32Array} buffer - Audio buffer
 * @param {number} alpha - Filter coefficient (0-1, default: 0.95)
 * @returns {Float32Array} Filtered buffer
 */
export function highPassFilter(buffer, alpha = 0.95) {
  const filtered = new Float32Array(buffer.length);
  filtered[0] = buffer[0];
  
  for (let i = 1; i < buffer.length; i++) {
    filtered[i] = alpha * (filtered[i-1] + buffer[i] - buffer[i-1]);
  }
  
  return filtered;
}

/**
 * Resample audio buffer to target sample rate
 * Simple linear interpolation resampling
 * @param {Float32Array} buffer - Input buffer
 * @param {number} fromRate - Original sample rate
 * @param {number} toRate - Target sample rate
 * @returns {Float32Array} Resampled buffer
 */
export function resampleAudio(buffer, fromRate, toRate) {
  if (fromRate === toRate) {
    return buffer;
  }
  
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, buffer.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    // Linear interpolation
    resampled[i] = buffer[srcIndexFloor] * (1 - fraction) + 
                   buffer[srcIndexCeil] * fraction;
  }
  
  return resampled;
}

/**
 * Split stereo audio into left and right channels
 * @param {Float32Array} stereoBuffer - Stereo audio buffer
 * @returns {object} Object with left and right Float32Arrays
 */
export function splitStereo(stereoBuffer) {
  const channelLength = Math.floor(stereoBuffer.length / 2);
  const left = new Float32Array(channelLength);
  const right = new Float32Array(channelLength);
  
  for (let i = 0; i < channelLength; i++) {
    left[i] = stereoBuffer[i * 2];
    right[i] = stereoBuffer[i * 2 + 1];
  }
  
  return { left, right };
}

/**
 * Merge left and right channels into stereo buffer
 * @param {Float32Array} left - Left channel
 * @param {Float32Array} right - Right channel
 * @returns {Float32Array} Merged stereo buffer
 */
export function mergeStereo(left, right) {
  const length = Math.min(left.length, right.length);
  const stereo = new Float32Array(length * 2);
  
  for (let i = 0; i < length; i++) {
    stereo[i * 2] = left[i];
    stereo[i * 2 + 1] = right[i];
  }
  
  return stereo;
}

/**
 * Convert stereo to mono by averaging channels
 * @param {Float32Array} stereoBuffer - Stereo audio buffer
 * @returns {Float32Array} Mono audio buffer
 */
export function stereoToMono(stereoBuffer) {
  const { left, right } = splitStereo(stereoBuffer);
  const mono = new Float32Array(left.length);
  
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  
  return mono;
}

/**
 * Create circular buffer for audio streaming
 * @param {number} size - Buffer size in samples
 * @returns {object} Circular buffer object with push/read methods
 */
export function createCircularBuffer(size) {
  const buffer = new Float32Array(size);
  let writeIndex = 0;
  let availableSamples = 0;
  
  return {
    /**
     * Push samples into buffer
     * @param {Float32Array} samples - Samples to push
     */
    push(samples) {
      for (let i = 0; i < samples.length; i++) {
        buffer[writeIndex] = samples[i];
        writeIndex = (writeIndex + 1) % size;
        availableSamples = Math.min(availableSamples + 1, size);
      }
    },
    
    /**
     * Read samples from buffer
     * @param {number} count - Number of samples to read
     * @returns {Float32Array} Read samples
     */
    read(count) {
      count = Math.min(count, availableSamples);
      const result = new Float32Array(count);
      let readIndex = (writeIndex - availableSamples + size) % size;
      
      for (let i = 0; i < count; i++) {
        result[i] = buffer[readIndex];
        readIndex = (readIndex + 1) % size;
      }
      
      availableSamples -= count;
      return result;
    },
    
    /**
     * Get number of available samples
     * @returns {number} Available samples
     */
    available() {
      return availableSamples;
    },
    
    /**
     * Clear buffer
     */
    clear() {
      writeIndex = 0;
      availableSamples = 0;
      buffer.fill(0);
    }
  };
}

/**
 * Calculate audio duration from buffer
 * @param {number} sampleCount - Number of samples
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Duration in seconds
 */
export function calculateDuration(sampleCount, sampleRate) {
  return sampleCount / sampleRate;
}

/**
 * Format audio duration as MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Audio format information
 */
export const AudioFormats = {
  LINEAR16: {
    encoding: 'LINEAR16',
    bitDepth: 16,
    sampleRate: 16000,
    channels: 1,
    description: '16-bit PCM, 16kHz mono (Google Cloud standard)'
  },
  FLOAT32: {
    encoding: 'FLOAT32',
    bitDepth: 32,
    sampleRate: 48000,
    channels: 1,
    description: '32-bit float, 48kHz mono (Web Audio API standard)'
  }
};

/**
 * Validate audio format compatibility
 * @param {object} format - Audio format object
 * @returns {boolean} True if compatible
 */
export function validateAudioFormat(format) {
  const requiredFields = ['encoding', 'sampleRate', 'channels'];
  
  for (const field of requiredFields) {
    if (!(field in format)) {
      return false;
    }
  }
  
  // Check if sample rate is reasonable
  if (format.sampleRate < 8000 || format.sampleRate > 48000) {
    return false;
  }
  
  // Check if channels is 1 or 2
  if (format.channels !== 1 && format.channels !== 2) {
    return false;
  }
  
  return true;
}

/**
 * Get optimal buffer size for given sample rate
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Optimal buffer size (power of 2)
 */
export function getOptimalBufferSize(sampleRate) {
  // Target ~100ms of audio
  const targetMs = 100;
  const targetSamples = (sampleRate * targetMs) / 1000;
  
  // Round up to nearest power of 2
  return Math.pow(2, Math.ceil(Math.log2(targetSamples)));
}

// Export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    convertFloat32ToInt16,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    calculateRMS,
    detectSpeech,
    normalizeAudio,
    highPassFilter,
    resampleAudio,
    splitStereo,
    mergeStereo,
    stereoToMono,
    createCircularBuffer,
    calculateDuration,
    formatDuration,
    AudioFormats,
    validateAudioFormat,
    getOptimalBufferSize
  };
}
