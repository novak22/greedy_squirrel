// Turbo mode for faster spin animations

export class TurboMode {
    constructor(slotMachine) {
        this.game = slotMachine;
        this.isActive = false;
        this.unlocked = true; // Unlocked from start

        // Turbo speeds (in milliseconds)
        this.normalReelSpinTime = 2000;  // Base time for first reel
        this.turboReelSpinTime = 800;    // Turbo time for first reel

        this.normalMessageDelay = 2000;
        this.turboMessageDelay = 800;

        this.normalAnimationDelay = 1500;
        this.turboAnimationDelay = 500;
    }

    /**
     * Unlock turbo mode (called when player reaches level 10)
     */
    unlock() {
        if (this.unlocked) return;

        this.unlocked = true;
        this.updateUI();
        this.game.showMessage('🚀 TURBO MODE UNLOCKED!');
    }

    /**
     * Toggle turbo mode on/off
     */
    toggle() {
        this.isActive = !this.isActive;
        this.updateUI();

        if (this.isActive) {
            this.game.showMessage('🚀 Turbo mode activated');
        } else {
            this.game.showMessage('Turbo mode deactivated');
        }
    }

    /**
     * Get reel spin time based on turbo mode and reel index
     */
    getReelSpinTime(reelIndex) {
        const baseTime = this.isActive ? this.turboReelSpinTime : this.normalReelSpinTime;
        return baseTime + (reelIndex * (this.isActive ? 100 : 200));
    }

    /**
     * Get message display duration
     */
    getMessageDelay() {
        return this.isActive ? this.turboMessageDelay : this.normalMessageDelay;
    }

    /**
     * Get animation delay
     */
    getAnimationDelay() {
        return this.isActive ? this.turboAnimationDelay : this.normalAnimationDelay;
    }

    /**
     * Update turbo mode UI
     */
    updateUI() {
        const turboBtn = document.getElementById('turboBtn');
        if (!turboBtn) return;

        if (!this.unlocked) {
            turboBtn.style.opacity = '0.5';
            turboBtn.style.cursor = 'not-allowed';
            turboBtn.textContent = '🔒 TURBO';
        } else {
            turboBtn.style.opacity = '1';
            turboBtn.style.cursor = 'pointer';
            turboBtn.textContent = '🚀 TURBO';
            turboBtn.classList.toggle('active', this.isActive);
        }
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            isActive: this.isActive,
            unlocked: this.unlocked
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        this.unlocked = data.unlocked || false;
        this.isActive = data.isActive || false;
        this.updateUI();
    }
}
