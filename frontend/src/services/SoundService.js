/**
 * SoundService.js
 * Generates game sounds using the Web Audio API (no external dependencies).
 * This avoids CORS issues and browser autoplay restrictions for CDN audio.
 */

class SoundService {
  constructor() {
    this._muted = localStorage.getItem('domino_muted') === 'true';
    this._ctx = null;
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    localStorage.setItem('domino_muted', this._muted);
    return this._muted;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if browser suspended it (common after page load with no interaction yet)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  /**
   * Creates and plays a simple synthesized sound.
   * @param {Object} opts - { type, frequency, duration, volume, decay }
   */
  _synth({ type = 'sine', frequency = 440, duration = 0.15, volume = 0.4, decay = 0.1 } = {}) {
    if (this._muted) return;
    try {
      const ctx = this._getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration + decay);
    } catch (e) {
      // Silently fail if Web Audio API not available
    }
  }

  /** Pleasant "clack" when placing a piece */
  playPlace() {
    this._synth({ type: 'triangle', frequency: 520, duration: 0.12, volume: 0.35 });
    setTimeout(() => this._synth({ type: 'triangle', frequency: 380, duration: 0.08, volume: 0.2 }), 60);
  }

  /** Short "whoosh" when passing turn */
  playPass() {
    this._synth({ type: 'sawtooth', frequency: 200, duration: 0.2, volume: 0.2, decay: 0.15 });
  }

  /** Fanfare for winning */
  playWin() {
    [0, 100, 200, 350].forEach((delay, i) => {
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      setTimeout(() => this._synth({ type: 'sine', frequency: notes[i], duration: 0.25, volume: 0.4 }), delay);
    });
  }

  /** Low "thud" for losing */
  playLose() {
    this._synth({ type: 'sawtooth', frequency: 180, duration: 0.4, volume: 0.3, decay: 0.3 });
    setTimeout(() => this._synth({ type: 'sawtooth', frequency: 130, duration: 0.5, volume: 0.2, decay: 0.4 }), 200);
  }

  /** Short tick for countdown */
  playTick() {
    this._synth({ type: 'square', frequency: 880, duration: 0.05, volume: 0.15 });
  }
}

export default new SoundService();
