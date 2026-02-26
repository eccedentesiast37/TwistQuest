// ─── Sound Manager (Web Audio API – no external files) ───────────────
const SoundFX = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    // Generic tone helper
    function playTone(freq, duration, type = 'sine', volume = 0.25) {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + duration);
    }

    return {
        click() {
            playTone(800, 0.08, 'square', 0.12);
        },

        success() {
            // happy ascending arpeggio
            const c = getCtx();
            [523, 659, 784, 1047].forEach((f, i) => {
                setTimeout(() => playTone(f, 0.25, 'sine', 0.2), i * 120);
            });
        },

        fail() {
            // descending buzz
            playTone(280, 0.15, 'sawtooth', 0.18);
            setTimeout(() => playTone(220, 0.3, 'sawtooth', 0.18), 150);
        },

        gameOver() {
            // sad descending tones
            [400, 350, 300, 200].forEach((f, i) => {
                setTimeout(() => playTone(f, 0.4, 'triangle', 0.2), i * 250);
            });
        },

        winner() {
            // fanfare!
            const notes = [523, 659, 784, 1047, 784, 1047, 1319];
            notes.forEach((f, i) => {
                setTimeout(() => playTone(f, 0.3, 'sine', 0.22), i * 140);
            });
        },

        listening() {
            // soft blip
            playTone(660, 0.06, 'sine', 0.08);
        },

        countdown(n) {
            playTone(n === 0 ? 880 : 440, 0.15, 'square', 0.15);
        }
    };
})();
