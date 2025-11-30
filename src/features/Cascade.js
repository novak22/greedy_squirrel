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
    constructor(deps) {
        // Backward compatibility: support both new DI pattern and old game instance pattern
        const isNewDI = deps && (deps.renderer !== undefined || deps.rng !== undefined);

        if (isNewDI) {
            // New DI pattern: { renderer, rng, reelStrips, ... }
            this.renderer = deps.renderer;
            this.rng = deps.rng;
            this.reelStrips = deps.reelStrips;
            this.symbolsPerReel = deps.symbolsPerReel;
            this.paylineEvaluator = deps.paylineEvaluator;
            this.statistics = deps.statistics;
            this.eventBus = deps.eventBus;
            // Still need game reference for board state methods
            this.game = null;
        } else {
            // Old pattern: Cascade(game) - dependencies will be set later or accessed via game
            this.game = deps;
            this.renderer = null;
            this.rng = null;
            this.reelStrips = null;
            this.symbolsPerReel = null;
            this.paylineEvaluator = null;
            this.statistics = null;
            this.eventBus = null;
        }

        this.enabled = FEATURES_CONFIG.cascade.enabled;
        this.currentMultiplier = 1;
        this.cascadeCount = 0;
        this.totalCascadeWins = 0;
    }

    /**
     * Set renderer (backward compatibility method)
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
                    const statistics = this.statistics || this.game?.statistics;
                    if (statistics) {
                        statistics.recordFeatureTrigger('cascade');
                    }

                    // Highlight new wins
                    if (this.eventBus) {
                        this.eventBus.emit('ui:highlightWinningSymbols', winInfo.winningPositions);
                        this.eventBus.emit('ui:showWinningPaylines', winInfo.winningLines);
                    } else if (this.game) {
                        this.game.highlightWinningSymbols(winInfo.winningPositions);
                        this.game.showWinningPaylines(winInfo.winningLines);
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
        // Support both DI and legacy patterns
        const rng = this.rng || this.game.rng;
        const symbolsPerReel = this.symbolsPerReel || this.game.symbolsPerReel;
        const reelStrips = this.reelStrips || this.game.reelStrips;

        const position = rng.getRandomPosition(symbolsPerReel);
        const newSymbols = rng.getSymbolsAtPosition(
            reelStrips[reelIndex],
            position,
            1
        );
        return newSymbols[0];
    }

    /**
     * Show cascade win message
     */
    async showCascadeWin(winAmount, multiplier) {
        // Support both DI and legacy patterns
        if (this.eventBus) {
            this.eventBus.emit('message:show', `CASCADE WIN!\n${winAmount}\n${multiplier}x MULTIPLIER`);
        } else if (this.game) {
            await this.game.showMessage(`CASCADE WIN!\n${winAmount}\n${multiplier}x MULTIPLIER`);
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
