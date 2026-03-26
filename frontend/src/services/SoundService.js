/**
 * SoundService.js
 * Manages game sound effects using the Web Audio API or standard Audio objects.
 */

const SOUNDS = {
  PLACE: 'https://www.soundjay.com/button/sounds/button-16.mp3',
  PASS: 'https://www.soundjay.com/button/sounds/button-50.mp3',
  WIN: 'https://www.soundjay.com/human/sounds/human-applause-1.mp3',
  LOSE: 'https://www.soundjay.com/button/sounds/error-01.mp3',
  TICK: 'https://www.soundjay.com/button/sounds/beep-07.mp3'
};

class SoundService {
  constructor() {
    this.audioCache = {};
    Object.keys(SOUNDS).forEach(key => {
      const audio = new Audio(SOUNDS[key]);
      audio.preload = 'auto';
      this.audioCache[key] = audio;
    });
  }

  play(soundKey) {
    const audio = this.audioCache[soundKey];
    if (audio) {
      // Clone to allow simultaneous plays
      const playPromise = audio.cloneNode().play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Autoplay blocked or audio error:", error);
        });
      }
    }
  }

  playPlace() { this.play('PLACE'); }
  playPass() { this.play('PASS'); }
  playWin() { this.play('WIN'); }
  playLose() { this.play('LOSE'); }
  playTick() { this.play('TICK'); }
}

export default new SoundService();
