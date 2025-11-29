// Sound Manager for game audio effects and background music
// Uses Web Audio API for sound generation (no external audio files needed)

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.musicEnabled = true;
        this.effectsEnabled = true;

        // Initialize Web Audio API
        this.audioContext = null;
        this.initAudioContext();
    }

    /**
     * Initialize audio context (must be done after user interaction)
     */
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            document.addEventListener('visibilitychange', () => this.updateAudioState());
            this.updateAudioState();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    /**
     * Resume audio context (needed for browser autoplay policies)
     */
    resumeAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'running') return;
        if (!this.enabled) return;

        this.audioContext.resume().catch(error => {
            console.warn('Failed to resume audio context:', error);
        });
    }

    /**
     * Suspend audio context when audio shouldn't play
     */
    suspendAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'suspended') return;

        this.audioContext.suspend().catch(error => {
            console.warn('Failed to suspend audio context:', error);
        });
    }

    /**
     * Update audio context state based on settings and visibility
     */
    updateAudioState() {
        if (!this.audioContext) return;

        if (!this.enabled) {
            this.suspendAudioContext();
        } else {
            this.resumeAudioContext();
        }
    }

    /**
     * Play a beep/tone at specific frequency
     */
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled || !this.effectsEnabled || !this.audioContext) return;

        this.resumeAudioContext();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play reel spin sound
     */
    playReelSpin() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Quick descending tone for reel movement
        this.playTone(800, 0.05, 'sawtooth');
    }

    /**
     * Play reel stop sound
     */
    playReelStop() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Thud sound - low frequency short burst
        this.playTone(100, 0.1, 'square');
    }

    /**
     * Play win sound
     */
    playWin(multiplier = 1) {
        if (!this.enabled || !this.effectsEnabled) return;

        if (multiplier >= 100) {
            // Mega win - triumphant ascending chord
            this.playChord([523, 659, 784, 1047], 0.8);
        } else if (multiplier >= 50) {
            // Big win - major chord
            this.playChord([523, 659, 784], 0.6);
        } else if (multiplier >= 20) {
            // Good win - two notes
            this.playTone(523, 0.2);
            setTimeout(() => this.playTone(659, 0.2), 100);
        } else {
            // Small win - single pleasant tone
            this.playTone(659, 0.15);
        }
    }

    /**
     * Play chord (multiple frequencies at once)
     */
    playChord(frequencies, duration) {
        if (!this.enabled || !this.effectsEnabled || !this.audioContext) return;

        this.resumeAudioContext();

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, duration);
            }, index * 50);
        });
    }

    /**
     * Play button click sound
     */
    playClick() {
        if (!this.enabled || !this.effectsEnabled) return;
        this.playTone(400, 0.05, 'square');
    }

    /**
     * Play scatter hit sound
     */
    playScatter() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Sparkle sound - ascending quick tones
        [800, 1000, 1200, 1400].forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine'), index * 50);
        });
    }

    /**
     * Play bonus trigger sound
     */
    playBonusTrigger() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Exciting fanfare
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, 0.15), index * 80);
        });
    }

    /**
     * Play free spins trigger sound
     */
    playFreeSpinsTrigger() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Magic sound - ethereal tones
        [1000, 1200, 1500, 2000].forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, 0.2, 'triangle'), index * 100);
        });
    }

    /**
     * Play level up sound
     */
    playLevelUp() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Victory fanfare
        const melody = [523, 659, 784, 1047];
        melody.forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, 0.3), index * 150);
        });
    }

    /**
     * Play achievement unlock sound
     */
    playAchievement() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Success sound
        this.playChord([659, 831, 988], 0.5);
    }

    /**
     * Play error/warning sound
     */
    playError() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Descending disappointed sound
        this.playTone(400, 0.1, 'square');
        setTimeout(() => this.playTone(300, 0.2, 'square'), 100);
    }

    /**
     * Play cascade win sound
     */
    playCascade() {
        if (!this.enabled || !this.effectsEnabled) return;

        // Tumbling sound - quick descending tones
        [600, 550, 500, 450].forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, 0.08, 'sawtooth'), index * 40);
        });
    }

    /**
     * Play autoplay start sound
     */
    playAutoplayStart() {
        if (!this.enabled || !this.effectsEnabled) return;
        this.playTone(700, 0.1);
        setTimeout(() => this.playTone(900, 0.1), 100);
    }

    /**
     * Play autoplay stop sound
     */
    playAutoplayStop() {
        if (!this.enabled || !this.effectsEnabled) return;
        this.playTone(900, 0.1);
        setTimeout(() => this.playTone(700, 0.1), 100);
    }

    /**
     * Set master volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Toggle sound on/off
     */
    toggleSound(enabled) {
        this.enabled = enabled;
        this.updateAudioState();
    }

    /**
     * Toggle music on/off
     */
    toggleMusic(enabled) {
        this.musicEnabled = enabled;
    }

    /**
     * Toggle effects on/off
     */
    toggleEffects(enabled) {
        this.effectsEnabled = enabled;
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            enabled: this.enabled,
            volume: this.volume,
            musicEnabled: this.musicEnabled,
            effectsEnabled: this.effectsEnabled
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.volume = data.volume !== undefined ? data.volume : 0.5;
        this.musicEnabled = data.musicEnabled !== undefined ? data.musicEnabled : true;
        this.effectsEnabled = data.effectsEnabled !== undefined ? data.effectsEnabled : true;

        this.updateAudioState();
    }
}
