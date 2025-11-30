/**
 * BonusGameRenderer - Handles all DOM manipulation for BonusGame feature
 *
 * Separates bonus game UI logic from bonus game business logic.
 * BonusGame.js should only contain game logic, this handles the visual representation.
 */

import { FEATURES_CONFIG } from '../../config/features.js';
import { formatNumber } from '../../utils/formatters.js';

export class BonusGameRenderer {
    constructor() {
        this.eventListeners = []; // Track listeners for cleanup
    }

    /**
     * Show transition into bonus game
     * @param {number} bonusCount - Number of bonus symbols
     * @param {number} totalPicks - Total picks awarded
     * @returns {Promise<void>}
     */
    async showTransition(bonusCount, totalPicks) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎁🎁🎁</div>
                <h1 class="feature-title">BONUS ROUND!</h1>
                <div class="feature-details">
                    <p class="picks-awarded">${formatNumber(totalPicks)} PICKS</p>
                    <p class="bonus-info">${formatNumber(bonusCount)} BONUS symbols landed!</p>
                </div>
                <p class="feature-start">Pick your prizes...</p>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.bonusGame.transitionDuration)
        );

        overlay.classList.remove('show');
    }

    /**
     * Show pick-me game UI
     * @param {Array} picks - Array of pick items
     * @param {number} picksRemaining - Picks remaining
     * @param {number} totalWon - Total won so far
     * @param {Function} onPickItem - Callback when item is picked (index)
     */
    showPickGame(picks, picksRemaining, totalWon, onPickItem) {
        const container = document.getElementById('bonusGameUI');
        if (!container) return;

        let html = `
            <div class="bonus-header">
                <h2>PICK YOUR PRIZES</h2>
                <div class="picks-info">
                    <span class="picks-remaining">${formatNumber(picksRemaining)}</span>
                    <span class="picks-label">PICKS REMAINING</span>
                </div>
                <div class="bonus-total">Total: <span id="bonusTotalWon">${formatNumber(totalWon)}</span></div>
            </div>
            <div class="pick-grid">
        `;

        for (let i = 0; i < picks.length; i++) {
            html += `
                <div class="pick-item" data-index="${i}">
                    <div class="pick-cover">?</div>
                </div>
            `;
        }

        html += `
            </div>
        `;

        container.innerHTML = html;
        container.classList.add('active');

        // Add click handlers and track them
        this.cleanup(); // Clear old listeners first
        document.querySelectorAll('.pick-item').forEach((item, index) => {
            const handler = () => onPickItem(index);
            item.addEventListener('click', handler);
            this.eventListeners.push({ element: item, event: 'click', handler });
        });
    }

    /**
     * Update pick game UI
     * @param {number} picksRemaining - Picks remaining
     * @param {number} totalWon - Total won
     */
    updatePickUI(picksRemaining, totalWon) {
        const remaining = document.querySelector('.picks-remaining');
        const total = document.getElementById('bonusTotalWon');

        if (remaining) remaining.textContent = formatNumber(picksRemaining);
        if (total) total.textContent = formatNumber(totalWon);
    }

    /**
     * Reveal a picked item with animation
     * @param {number} index - Index of item
     * @param {Object} item - Item data {icon, display}
     * @returns {Promise<void>}
     */
    async revealItem(index, item) {
        const itemEl = document.querySelector(`.pick-item[data-index="${index}"]`);
        if (!itemEl) return;

        itemEl.classList.add('picked');
        itemEl.innerHTML = `
            <div class="pick-icon">${item.icon}</div>
            <div class="pick-value">${item.display}</div>
        `;

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.bonusGame.revealDelay)
        );
    }

    /**
     * Hide pick game UI
     */
    hidePickGame() {
        const container = document.getElementById('bonusGameUI');
        if (container) {
            container.classList.remove('active');
        }
        this.cleanup();
    }

    /**
     * Show bonus game summary
     * @param {number} totalPicks - Total picks made
     * @param {number} totalWon - Total won
     * @returns {Promise<void>}
     */
    async showSummary(totalPicks, totalWon) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-summary">
                <h1 class="feature-title">BONUS COMPLETE!</h1>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Picks</span>
                        <span class="stat-value">${formatNumber(totalPicks)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won</span>
                        <span class="stat-value highlight">${formatNumber(totalWon)}</span>
                    </div>
                </div>
                <p class="feature-end">Returning to normal game...</p>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve =>
            setTimeout(resolve, FEATURES_CONFIG.bonusGame.transitionDuration)
        );

        overlay.classList.remove('show');
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}
