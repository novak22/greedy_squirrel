// Turbo mode for faster spin animations
import { GAME_EVENTS } from '../../SlotMachineEngine/src/core/EventBus.js';

export class TurboMode {
    /**
     * Create TurboMode with dependency injection
     * @param {Object} deps - Dependencies (optional for backward compatibility)
     * @param {EventBus} deps.eventBus - Event bus for communication
     * @param {Object} deps.dom - DOM element cache
     */
    constructor(deps) {
        // Support both old API (game instance) and new API (deps object)
        if (deps && (deps.eventBus || deps.dom)) {
            // New DI pattern
            this.eventBus = deps.eventBus;
            this.dom = deps.dom;
            this.game = null; // No game reference needed
        } else {
            // Old pattern (backward compatible)
            this.game = deps;
            this.eventBus = null;
            this.dom = null;
        }

        this.isActive = false;
        this.unlocked = true; // Unlocked from start

        // Turbo speeds (in milliseconds)
        this.normalReelSpinTime = 2000; // Base time for first reel
        this.turboReelSpinTime = 800; // Turbo time for first reel

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

        if (this.eventBus) {
            this.eventBus.emit('message:show', '🚀 TURBO MODE UNLOCKED!');
        } else if (this.game) {
            this.game.showMessage('🚀 TURBO MODE UNLOCKED!');
        }
    }

    /**
     * Toggle turbo mode on/off
     */
    toggle() {
        this.isActive = !this.isActive;
        this.updateUI();

        const message = this.isActive ? '🚀 Turbo mode activated' : 'Turbo mode deactivated';

        if (this.eventBus) {
            this.eventBus.emit('message:show', message);
            this.eventBus.emit(GAME_EVENTS.TURBO_TOGGLE, { isActive: this.isActive });
        } else if (this.game) {
            this.game.showMessage(message);
        }
    }

    /**
     * Get reel spin time based on turbo mode and reel index
     */
    getReelSpinTime(reelIndex) {
        const baseTime = this.isActive ? this.turboReelSpinTime : this.normalReelSpinTime;
        return baseTime + reelIndex * (this.isActive ? 100 : 200);
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
        // Get DOM reference from either DI or game instance
        const dom = this.dom || this.game?.dom;
        const turboBtn = dom?.turboBtn;
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

        // Emit event for UI updates (new pattern)
        if (this.eventBus) {
            this.eventBus.emit('ui:turboModeChanged', { isActive: this.isActive });
        } else if (this.game?.ui) {
            // Fallback to old pattern
            this.game.ui.updateTurboMode(this.isActive);
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
