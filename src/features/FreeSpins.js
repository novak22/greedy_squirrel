// Free Spins feature implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class FreeSpins {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.remainingSpins = 0;
        this.totalSpins = 0;
        this.totalWon = 0;
        this.multiplier = 1;
        this.retriggered = 0;
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

        // Show transition UI
        await this.showTransition(scatterCount, spinsAwarded);

        // Update UI
        this.updateUI();
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

            await this.game.showMessage(
                `🎉 RETRIGGERED!\n+${additionalSpins} FREE SPINS\n${this.remainingSpins} SPINS REMAINING`
            );

            this.updateUI();
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
        this.updateUI();

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

        // Show summary
        await this.showSummary();

        // Reset counters
        this.remainingSpins = 0;
        this.totalSpins = 0;
        this.retriggered = 0;
        this.multiplier = 1;

        const wonAmount = this.totalWon;
        this.totalWon = 0;

        // Hide UI
        this.hideUI();

        return wonAmount;
    }

    /**
     * Show transition into free spins
     */
    async showTransition(scatterCount, spinsAwarded) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">⭐⭐⭐</div>
                <h1 class="feature-title">FREE SPINS!</h1>
                <div class="feature-details">
                    <p class="spins-awarded">${spinsAwarded} FREE SPINS</p>
                    <p class="multiplier-info">All wins × ${this.multiplier}</p>
                    <p class="scatter-info">${scatterCount} SCATTERS landed!</p>
                </div>
                <p class="feature-start">Get ready...</p>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.freeSpins.transitionDuration)
        );

        overlay.classList.remove('show');
    }

    /**
     * Show free spins summary
     */
    async showSummary() {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-summary">
                <h1 class="feature-title">FREE SPINS COMPLETE!</h1>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Spins</span>
                        <span class="stat-value">${this.totalSpins}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won</span>
                        <span class="stat-value highlight">${this.totalWon}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Multiplier</span>
                        <span class="stat-value">${this.multiplier}x</span>
                    </div>
                    ${this.retriggered > 0 ? `
                        <div class="stat-item">
                            <span class="stat-label">Retriggered</span>
                            <span class="stat-value">${this.retriggered} times</span>
                        </div>
                    ` : ''}
                </div>
                <p class="feature-end">Returning to normal game...</p>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.freeSpins.celebrationDuration)
        );

        overlay.classList.remove('show');
    }

    /**
     * Update free spins UI counter
     */
    updateUI() {
        const container = document.getElementById('freeSpinsUI');
        if (!container) return;

        if (this.active) {
            container.innerHTML = `
                <div class="free-spins-banner">
                    <div class="fs-icon">⭐</div>
                    <div class="fs-info">
                        <div class="fs-label">FREE SPINS</div>
                        <div class="fs-count">${this.remainingSpins} / ${this.totalSpins}</div>
                    </div>
                    <div class="fs-multiplier">${this.multiplier}x</div>
                </div>
            `;
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    }

    /**
     * Hide free spins UI
     */
    hideUI() {
        const container = document.getElementById('freeSpinsUI');
        if (container) {
            container.classList.remove('active');
        }
    }

    /**
     * Check if currently in free spins mode
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }
}
