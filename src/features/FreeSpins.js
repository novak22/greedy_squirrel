// Free Spins feature implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class FreeSpins {
    /**
     * Create FreeSpins feature
     * @param {Object} game - Game instance
     * @param {Object} renderer - FreeSpinsRenderer instance for UI
     */
    constructor(game, renderer = null) {
        this.game = game;
        this.renderer = renderer;
        this.active = false;
        this.remainingSpins = 0;
        this.totalSpins = 0;
        this.totalWon = 0;
        this.multiplier = 1;
        this.retriggered = 0;
    }

    /**
     * Set the renderer (for dependency injection)
     * @param {Object} renderer - FreeSpinsRenderer instance
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }

    /**
     * Check if free spins should trigger based on scatter count
     * @param {number} scatterCount - Number of scatters landed
     * @returns {boolean}
     */
    shouldTrigger(scatterCount) {
        const config = FEATURES_CONFIG.freeSpins.trigger;
        return scatterCount >= config.minScatters;
    }

    /**
     * Trigger free spins
     * @param {number} scatterCount - Number of scatters that triggered
     */
    async trigger(scatterCount) {
        const config = FEATURES_CONFIG.freeSpins.trigger;
        // Cap at 5 for lookup, use max spins for 6+
        const countKey = Math.min(scatterCount, 5);
        const spinsAwarded = config.scatterCounts[countKey];

        this.remainingSpins = spinsAwarded;
        this.totalSpins = spinsAwarded;
        this.totalWon = 0;
        this.active = true;

        // Random multiplier for this free spins session
        const multipliers = FEATURES_CONFIG.freeSpins.multipliers;
        this.multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];

        // Show transition UI (delegate to renderer)
        if (this.renderer) {
            await this.renderer.showTransition(scatterCount, spinsAwarded, this.multiplier);
        }

        // Update UI (delegate to renderer)
        if (this.renderer) {
            this.renderer.updateUI(
                this.active,
                this.remainingSpins,
                this.totalSpins,
                this.multiplier
            );
        }
    }

    /**
     * Re-trigger free spins during free spins mode
     * @param {number} scatterCount
     */
    async retrigger(scatterCount) {
        if (!FEATURES_CONFIG.freeSpins.canRetrigger) return;

        const config = FEATURES_CONFIG.freeSpins.trigger;
        const additionalSpins = config.scatterCounts[scatterCount];

        if (additionalSpins) {
            this.remainingSpins += additionalSpins;
            this.totalSpins += additionalSpins;
            this.retriggered++;

            // Show retrigger popup (delegate to renderer)
            if (this.renderer) {
                await this.renderer.showRetrigger(additionalSpins, this.remainingSpins);
            }

            // Update UI (delegate to renderer)
            if (this.renderer) {
                this.renderer.updateUI(
                    this.active,
                    this.remainingSpins,
                    this.totalSpins,
                    this.multiplier
                );
            }
        }
    }

    /**
     * Execute one free spin
     * @returns {boolean} - True if more spins remain
     */
    async executeSpin() {
        if (!this.active || this.remainingSpins <= 0) {
            return false;
        }

        this.remainingSpins--;

        // Update UI (delegate to renderer)
        if (this.renderer) {
            this.renderer.updateUI(
                this.active,
                this.remainingSpins,
                this.totalSpins,
                this.multiplier
            );
        }

        return this.remainingSpins > 0;
    }

    /**
     * Apply multiplier to win amount
     * @param {number} winAmount
     * @returns {number}
     */
    applyMultiplier(winAmount) {
        if (!this.active) return winAmount;
        return winAmount * this.multiplier;
    }

    /**
     * Add to total won during free spins
     * @param {number} amount
     */
    addWin(amount) {
        this.totalWon += amount;
    }

    /**
     * End free spins mode
     */
    async end() {
        this.active = false;

        // Show summary (delegate to renderer)
        if (this.renderer) {
            await this.renderer.showSummary(
                this.totalSpins,
                this.totalWon,
                this.multiplier,
                this.retriggered
            );
        }

        // Reset counters
        const wonAmount = this.totalWon;
        this.remainingSpins = 0;
        this.totalSpins = 0;
        this.retriggered = 0;
        this.multiplier = 1;
        this.totalWon = 0;

        // Hide UI (delegate to renderer)
        if (this.renderer) {
            this.renderer.hideUI();
        }

        return wonAmount;
    }

    /**
     * Check if currently in free spins mode
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }
}
