// Cascading Wins (Tumble) feature implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class Cascade {
    /**
     * Create Cascade feature with dependency injection
     * @param {Object} deps - Dependencies (or legacy game instance)
     * @param {Object} deps.renderer - CascadeRenderer instance for UI
     * @param {RNG} deps.rng - RNG for generating new symbols
     * @param {Array} deps.reelStrips - Reel strip data
     * @param {number} deps.symbolsPerReel - Symbols per reel
     * @param {Object} deps.paylineEvaluator - For evaluating wins
     * @param {Statistics} deps.statistics - For tracking cascades
     * @param {EventBus} deps.eventBus - For UI updates and messages
     */
    constructor({
        renderer,
        rng,
        reelStrips,
        symbolsPerReel,
        paylineEvaluator,
        statistics,
        eventBus,
        getReelResult,
        evaluateWinsWithoutDisplay
    }) {
        if (!renderer) {
            throw new Error('Cascade requires a renderer instance');
        }
        if (!paylineEvaluator) {
            throw new Error('Cascade requires a paylineEvaluator instance');
        }
        if (typeof getReelResult !== 'function') {
            throw new Error('Cascade requires a getReelResult function');
        }
        if (typeof evaluateWinsWithoutDisplay !== 'function') {
            throw new Error('Cascade requires an evaluateWinsWithoutDisplay function');
        }

        this.renderer = renderer;
        this.rng = rng;
        this.reelStrips = reelStrips;
        this.symbolsPerReel = symbolsPerReel;
        this.paylineEvaluator = paylineEvaluator;
        this.statistics = statistics;
        this.eventBus = eventBus;
        this.getReelResult = getReelResult;
        this.evaluateWinsWithoutDisplay = evaluateWinsWithoutDisplay;

        this.enabled = FEATURES_CONFIG.cascade.enabled;
        this.currentMultiplier = 1;
        this.cascadeCount = 0;
        this.totalCascadeWins = 0;
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
                const result = this.getReelResult();
                const winInfo = await this.evaluateWinsWithoutDisplay(
                    result,
                    this.paylineEvaluator
                );

                if (winInfo.totalWin > 0) {
                    this.cascadeCount++;
                    this.currentMultiplier = this.getMultiplier();

                    // Apply cascade multiplier
                    const cascadeWin = winInfo.totalWin * this.currentMultiplier;
                    totalWins += cascadeWin;
                    this.totalCascadeWins += cascadeWin;

                    // Track cascade in statistics
                    this.statistics?.recordFeatureTrigger('cascade');

                    // Highlight new wins
                    if (this.eventBus) {
                        this.eventBus.emit('ui:highlightWinningSymbols', winInfo.winningPositions);
                        this.eventBus.emit('ui:showWinningPaylines', winInfo.winningLines);
                    }

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
            this.renderer?.hideMultiplierUI();
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
        const position = this.rng.getRandomPosition(this.symbolsPerReel);
        const newSymbols = this.rng.getSymbolsAtPosition(
            this.reelStrips[reelIndex],
            position,
            1
        );
        return newSymbols[0];
    }

    /**
     * Show cascade win message
     */
    async showCascadeWin(winAmount, multiplier) {
        if (this.eventBus) {
            this.eventBus.emit('message:show', `CASCADE WIN!\n${winAmount}\n${multiplier}x MULTIPLIER`);
        }
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
