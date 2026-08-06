/**
 * SoundService.js
 * Gera efeitos sonoros do jogo usando a Web Audio API (sem dependências externas).
 * Evita problemas de CORS e restrições de autoplay do navegador com áudios CDN.
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
    // Retoma o contexto se o navegador tiver suspendido (comum após carregar a página sem interação prévia)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  /**
   * Cria e reproduz um som sintetizado simples.
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
      // Ignora silenciosamente caso a Web Audio API não esteja disponível
    }
  }

  /** Som de clique ao posicionar uma peça */
  playPlace() {
    this._synth({ type: 'triangle', frequency: 520, duration: 0.12, volume: 0.35 });
    setTimeout(() => this._synth({ type: 'triangle', frequency: 380, duration: 0.08, volume: 0.2 }), 60);
  }

  /** Som de passagem de turno */
  playPass() {
    this._synth({ type: 'sawtooth', frequency: 200, duration: 0.2, volume: 0.2, decay: 0.15 });
  }

  /** Fanfarra de vitória */
  playWin() {
    [0, 100, 200, 350].forEach((delay, i) => {
      const notes = [523, 659, 784, 1047]; // Dó5 Mi5 Sol5 Dó6
      setTimeout(() => this._synth({ type: 'sine', frequency: notes[i], duration: 0.25, volume: 0.4 }), delay);
    });
  }

  /** Som grave de derrota */
  playLose() {
    this._synth({ type: 'sawtooth', frequency: 180, duration: 0.4, volume: 0.3, decay: 0.3 });
    setTimeout(() => this._synth({ type: 'sawtooth', frequency: 130, duration: 0.5, volume: 0.2, decay: 0.4 }), 200);
  }

  /** Som de contagem regressiva */
  playTick() {
    this._synth({ type: 'square', frequency: 880, duration: 0.05, volume: 0.15 });
  }
}

export default new SoundService();
