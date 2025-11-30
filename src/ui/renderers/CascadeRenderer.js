/**
 * CascadeRenderer - Handles all DOM manipulation for Cascade feature
 *
 * Separates cascade UI logic from cascade business logic.
 * Cascade.js should only contain game logic, this handles the visual representation.
 */

import { FEATURES_CONFIG } from '../../config/features.js';
import { formatNumber } from '../../utils/formatters.js';

export class CascadeRenderer {
    /**
     * Create CascadeRenderer
     * @param {Object} dom - DOM cache object with reel references
     */
    constructor(dom) {
        this.dom = dom;
    }

    /**
     * Remove winning symbols with animation
     * @param {Set<string>} winningPositions - Set of position strings "reel-row"
     * @returns {Promise<void>}
     */
    async removeSymbols(winningPositions) {
        // Add removal animation class
        winningPositions.forEach((pos) => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = this.dom.reels[reel];
            if (!reelEl) return;

            const symbols = reelEl.querySelectorAll('.symbol');
            if (symbols[row]) {
                symbols[row].classList.add('removing');
            }
        });

        await new Promise((resolve) => setTimeout(resolve, FEATURES_CONFIG.cascade.removeDelay));

        // Actually remove symbols (set to empty)
        winningPositions.forEach((pos) => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = this.dom.reels[reel];
            if (!reelEl) return;

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
     * @param {Set<string>} winningPositions - Positions that were removed
     * @returns {Promise<void>}
     */
    async dropSymbols(winningPositions) {
        // Determine which reels need processing
        const reelsToProcess = new Set();
        winningPositions.forEach((pos) => {
            const [reel] = pos.split('-').map(Number);
            reelsToProcess.add(reel);
        });

        reelsToProcess.forEach((reelIndex) => {
            const reelEl = this.dom.reels[reelIndex];
            if (!reelEl) return;

            const symbols = Array.from(reelEl.querySelectorAll('.symbol'));

            // Create new array representing the reel
            const symbolTexts = symbols.map((s) => s.textContent);

            // Remove empty symbols and shift down
            const nonEmpty = symbolTexts.filter((text) => text !== '');
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

        await new Promise((resolve) => setTimeout(resolve, FEATURES_CONFIG.cascade.dropDelay));

        // Remove dropping class
        this.dom.reels.forEach((reel) => {
            if (!reel) return;
            reel.querySelectorAll('.symbol.dropping').forEach((s) =>
                s.classList.remove('dropping')
            );
        });
    }

    /**
     * Fill empty spaces with new symbols
     * @param {Set<string>} winningPositions - Positions that need filling
     * @param {Function} getNewSymbol - Function(reelIndex, row) => symbol emoji
     * @returns {Promise<void>}
     */
    async fillEmptySpaces(winningPositions, getNewSymbol) {
        const reelsToProcess = new Set();
        winningPositions.forEach((pos) => {
            const [reel] = pos.split('-').map(Number);
            reelsToProcess.add(reel);
        });

        reelsToProcess.forEach((reelIndex) => {
            const reelEl = this.dom.reels[reelIndex];
            if (!reelEl) return;

            const symbols = reelEl.querySelectorAll('.symbol');

            symbols.forEach((symbol, row) => {
                if (symbol.textContent === '') {
                    // Get new symbol from game logic
                    const newSymbol = getNewSymbol(reelIndex, row);

                    symbol.textContent = newSymbol;
                    symbol.classList.remove('empty');
                    symbol.classList.add('filling');
                }
            });
        });

        await new Promise((resolve) => setTimeout(resolve, FEATURES_CONFIG.cascade.fillDelay));

        // Remove filling class
        this.dom.reels.forEach((reel) => {
            if (!reel) return;
            reel.querySelectorAll('.symbol.filling').forEach((s) => s.classList.remove('filling'));
        });

        await new Promise((resolve) =>
            setTimeout(resolve, FEATURES_CONFIG.cascade.evaluationDelay)
        );
    }

    /**
     * Update multiplier UI
     * @param {number} multiplier - Current cascade multiplier
     * @param {number} count - Cascade iteration count
     */
    updateMultiplierUI(multiplier, count) {
        const container = document.getElementById('cascadeMultiplier');
        if (!container) return;

        container.innerHTML = `
            <div class="cascade-mult-display">
                <span class="cascade-label">CASCADE</span>
                <span class="cascade-value">${formatNumber(multiplier)}x</span>
                <span class="cascade-count">${formatNumber(count)}</span>
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
}
