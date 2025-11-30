// Cascading Wins (Tumble) feature implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class Cascade {
    /**
     * Create Cascade feature
     * @param {Object} game - Game instance
     * @param {Object} renderer - CascadeRenderer instance for UI
     */
    constructor(game, renderer = null) {
        this.game = game;
        this.renderer = renderer;
        this.enabled = FEATURES_CONFIG.cascade.enabled;
        this.currentMultiplier = 1;
        this.cascadeCount = 0;
        this.totalCascadeWins = 0;
    }

    /**
     * Set the renderer (for dependency injection)
     * @param {Object} renderer - CascadeRenderer instance
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }

    /**
     * Enable or disable cascade feature
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Reset cascade state
     */
    reset() {
        this.currentMultiplier = 1;
        this.cascadeCount = 0;
        this.totalCascadeWins = 0;
    }

    /**
     * Get current multiplier for cascade level
     * @returns {number}
     */
    getMultiplier() {
        const multipliers = FEATURES_CONFIG.cascade.multipliers;
        const index = Math.min(this.cascadeCount, multipliers.length - 1);
        return multipliers[index];
    }

    /**
     * Execute cascade sequence after a win
     * @param {Set} winningPositions - Positions of winning symbols
     * @returns {Promise<number>} Total cascade wins
     */
    async executeCascade(winningPositions) {
        if (!this.enabled || !winningPositions || winningPositions.size === 0) {
            return 0;
        }

        try {
            this.reset();
            let totalWins = 0;
            let currentWinningPositions = winningPositions;
            let cascadeIterations = 0;
            const MAX_CASCADE_ITERATIONS = FEATURES_CONFIG.cascade.maxIterations;

            while (currentWinningPositions.size > 0) {
                // Safety check to prevent infinite cascade loops
                if (cascadeIterations >= MAX_CASCADE_ITERATIONS) {
                    console.error('Cascade: Maximum iteration limit reached, stopping cascade');
                    break;
                }
                cascadeIterations++;

                // Show current multiplier (delegate to renderer)
                if (this.renderer) {
                    this.renderer.updateMultiplierUI(this.currentMultiplier, this.cascadeCount);
                }

                // Remove winning symbols (delegate to renderer)
                if (this.renderer) {
                    await this.renderer.removeSymbols(currentWinningPositions);
                }

                // Drop symbols down (delegate to renderer)
                if (this.renderer) {
                    await this.renderer.dropSymbols(currentWinningPositions);
                }

                // Fill empty spaces with new symbols (delegate to renderer)
                if (this.renderer) {
                    await this.renderer.fillEmptySpaces(currentWinningPositions, (reelIndex) =>
                        this.getNewSymbol(reelIndex)
                    );
                }

                // Check for new wins
                const result = this.game.getReelResult();
                const winInfo = await this.game.evaluateWinsWithoutDisplay(
                    result,
                    this.game.paylineEvaluator
                );

                if (winInfo.totalWin > 0) {
                    this.cascadeCount++;
                    this.currentMultiplier = this.getMultiplier();

                    // Apply cascade multiplier
                    const cascadeWin = winInfo.totalWin * this.currentMultiplier;
                    totalWins += cascadeWin;
                    this.totalCascadeWins += cascadeWin;

                    // Track cascade in statistics
                    this.game.statistics.recordFeatureTrigger('cascade');

                    // Highlight new wins
                    this.game.highlightWinningSymbols(winInfo.winningPositions);
                    this.game.showWinningPaylines(winInfo.winningLines);

                    // Show cascade win
                    await this.showCascadeWin(cascadeWin, this.currentMultiplier);

                    currentWinningPositions = winInfo.winningPositions;
                } else {
                    // No more wins, end cascade
                    currentWinningPositions = new Set();
                }
            }

            // Hide multiplier UI (delegate to renderer)
            if (this.renderer) {
                this.renderer.hideMultiplierUI();
            }

            return totalWins;
        } catch (error) {
            console.error('Cascade execution failed:', error);
            this.hideMultiplierUI();
            this.reset();
            return 0;
        }
    }

    /**
     * Get a new random symbol for a reel
     * @param {number} reelIndex - Index of the reel
     * @returns {string} Symbol emoji
     */
    getNewSymbol(reelIndex) {
        const position = this.game.rng.getRandomPosition(this.game.symbolsPerReel);
        const newSymbols = this.game.rng.getSymbolsAtPosition(
            this.game.reelStrips[reelIndex],
            position,
            1
        );
        return newSymbols[0];
    }

    /**
     * Show cascade win message
     */
    async showCascadeWin(winAmount, multiplier) {
        await this.game.showMessage(`CASCADE WIN!\n${winAmount}\n${multiplier}x MULTIPLIER`);
    }

    /**
     * Get save data for persistence
     */
    getSaveData() {
        return {
            enabled: this.enabled
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        if (typeof data.enabled !== 'undefined') {
            this.enabled = data.enabled;
        }
    }
}
