// Tiny WebAudio synth: every sound is a few oscillators, no audio files.
// The context is created on the first user gesture (browsers demand one),
// and every call is a no-op until then, so headless screenshots stay silent.
export function createAudio() {
  let context = null;
  let muted = false;

  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
    } catch {
      context = null;
    }
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!context || muted) return;
    try {
      const start = context.currentTime + when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Audio is decoration; a failure never stops the game.
    }
  }

  return {
    unlock,
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    bounce() {
      tone(220, 0.07, 'square', 0.05);
    },
    wall() {
      tone(160, 0.05, 'square', 0.04);
    },
    paddle() {
      tone(330, 0.06, 'square', 0.05, 0, 440);
    },
    // A short rising arpeggio when a prism breaks; higher when it matches.
    breakBlock(matched) {
      tone(matched ? 660 : 520, 0.09, 'triangle', 0.09, 0, matched ? 990 : 660);
      tone(matched ? 880 : 700, 0.1, 'triangle', 0.06, 0.05, matched ? 1320 : 880);
    },
    power() {
      tone(440, 0.09, 'sine', 0.08, 0, 660);
      tone(660, 0.09, 'sine', 0.08, 0.08, 880);
      tone(880, 0.12, 'sine', 0.08, 0.16, 1174);
    },
    loseLife() {
      tone(392, 0.16, 'sawtooth', 0.06, 0, 196);
      tone(262, 0.22, 'sawtooth', 0.06, 0.14, 131);
    },
    levelClear() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.14, 'triangle', 0.08, i * 0.09));
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((freq, i) => tone(freq, 0.18, 'triangle', 0.09, i * 0.11));
    },
  };
}
