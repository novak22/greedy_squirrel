// Cascading Wins (Tumble) feature implementation
import { FEATURES_CONFIG } from '../config/features.js';
import { RNG } from '../utils/RNG.js';

export class Cascade {
    constructor(game) {
        this.game = game;
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
     * @returns {number} - Total cascade wins
     */
    async executeCascade(winningPositions) {
        if (!this.enabled || winningPositions.size === 0) {
            return 0;
        }

        this.reset();
        let totalWins = 0;
        let currentWinningPositions = winningPositions;

        while (currentWinningPositions.size > 0) {
            // Show current multiplier
            this.updateMultiplierUI();

            // Remove winning symbols
            await this.removeSymbols(currentWinningPositions);

            // Drop symbols down
            await this.dropSymbols(currentWinningPositions);

            // Fill empty spaces with new symbols
            await this.fillEmptySpaces(currentWinningPositions);

            // Check for new wins
            const result = this.game.getReelResult();
            const winInfo = await this.game.evaluateWinsWithoutDisplay(result);

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

        // Hide multiplier UI
        this.hideMultiplierUI();

        return totalWins;
    }

    /**
     * Remove winning symbols with animation
     * @param {Set} winningPositions
     */
    async removeSymbols(winningPositions) {
        // Add removal animation class
        winningPositions.forEach(pos => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = document.getElementById(`reel-${reel}`);
            const symbols = reelEl.querySelectorAll('.symbol');
            if (symbols[row]) {
                symbols[row].classList.add('removing');
            }
        });

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.cascade.removeDelay)
        );

        // Actually remove symbols (set to empty)
        winningPositions.forEach(pos => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = document.getElementById(`reel-${reel}`);
            const symbols = reelEl.querySelectorAll('.symbol');
            if (symbols[row]) {
                symbols[row].textContent = '';
                symbols[row].classList.remove('removing', 'winning');
                symbols[row].classList.add('empty');
            }
        });
    }

    /**
     * Drop symbols down to fill gaps
     * @param {Set} winningPositions
     */
    async dropSymbols(winningPositions) {
        // For each reel, drop symbols down
        const reelsToProcess = new Set();
        winningPositions.forEach(pos => {
            const [reel] = pos.split('-').map(Number);
            reelsToProcess.add(reel);
        });

        reelsToProcess.forEach(reelIndex => {
            const reelEl = document.getElementById(`reel-${reelIndex}`);
            const symbols = Array.from(reelEl.querySelectorAll('.symbol'));

            // Create new array representing the reel
            const symbolTexts = symbols.map(s => s.textContent);

            // Remove empty symbols and shift down
            const nonEmpty = symbolTexts.filter(text => text !== '');
            const emptyCount = symbolTexts.length - nonEmpty.length;

            // Add empty spaces at the top
            const newOrder = new Array(emptyCount).fill('').concat(nonEmpty);

            // Update DOM
            symbols.forEach((symbol, index) => {
                symbol.textContent = newOrder[index];
                if (newOrder[index] === '') {
                    symbol.classList.add('empty');
                } else {
                    symbol.classList.remove('empty');
                    symbol.classList.add('dropping');
                }
            });
        });

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.cascade.dropDelay)
        );

        // Remove dropping class
        document.querySelectorAll('.symbol.dropping').forEach(s =>
            s.classList.remove('dropping')
        );
    }

    /**
     * Fill empty spaces with new symbols
     * @param {Set} winningPositions
     */
    async fillEmptySpaces(winningPositions) {
        const reelsToProcess = new Set();
        winningPositions.forEach(pos => {
            const [reel] = pos.split('-').map(Number);
            reelsToProcess.add(reel);
        });

        reelsToProcess.forEach(reelIndex => {
            const reelEl = document.getElementById(`reel-${reelIndex}`);
            const symbols = reelEl.querySelectorAll('.symbol');

            symbols.forEach((symbol, row) => {
                if (symbol.textContent === '') {
                    // Get new symbol from reel strip
                    const position = RNG.getRandomPosition(this.game.symbolsPerReel);
                    const newSymbols = RNG.getSymbolsAtPosition(
                        this.game.reelStrips[reelIndex],
                        position,
                        1
                    );

                    symbol.textContent = newSymbols[0];
                    symbol.classList.remove('empty');
                    symbol.classList.add('filling');
                }
            });
        });

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.cascade.fillDelay)
        );

        // Remove filling class
        document.querySelectorAll('.symbol.filling').forEach(s =>
            s.classList.remove('filling')
        );

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.cascade.evaluationDelay)
        );
    }

    /**
     * Show cascade win message
     */
    async showCascadeWin(winAmount, multiplier) {
        await this.game.showMessage(
            `CASCADE WIN!\n${winAmount}\n${multiplier}x MULTIPLIER`
        );
    }

    /**
     * Update multiplier UI
     */
    updateMultiplierUI() {
        const container = document.getElementById('cascadeMultiplier');
        if (!container) return;

        container.innerHTML = `
            <div class="cascade-mult-display">
                <span class="cascade-label">CASCADE</span>
                <span class="cascade-value">${this.currentMultiplier}x</span>
                <span class="cascade-count">${this.cascadeCount}</span>
            </div>
        `;
        container.classList.add('active');
    }

    /**
     * Hide multiplier UI
     */
    hideMultiplierUI() {
        const container = document.getElementById('cascadeMultiplier');
        if (container) {
            container.classList.remove('active');
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
