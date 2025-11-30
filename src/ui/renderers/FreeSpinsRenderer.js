/**
 * FreeSpinsRenderer - Handles all DOM manipulation for FreeSpins feature
 *
 * Separates free spins UI logic from free spins business logic.
 * FreeSpins.js should only contain game logic, this handles the visual representation.
 */

import { FEATURES_CONFIG } from '../../config/features.js';
import { formatNumber } from '../../utils/formatters.js';

export class FreeSpinsRenderer {
    constructor() {}

    /**
     * Show transition into free spins
     * @param {number} scatterCount - Number of scatters
     * @param {number} spinsAwarded - Spins awarded
     * @param {number} multiplier - Win multiplier
     * @returns {Promise<void>}
     */
    async showTransition(scatterCount, spinsAwarded, multiplier) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">⭐⭐⭐</div>
                <h1 class="feature-title">FREE SPINS!</h1>
                <div class="feature-details">
                    <p class="spins-awarded">${formatNumber(spinsAwarded)} FREE SPINS</p>
                    <p class="multiplier-info">All wins × ${formatNumber(multiplier)}</p>
                    <p class="scatter-info">${formatNumber(scatterCount)} SCATTERS landed!</p>
                </div>
                <p class="feature-start">Click to continue...</p>
            </div>
        `;
        overlay.classList.add('show');

        // Wait for user click
        await new Promise(resolve => {
            const clickHandler = () => {
                overlay.removeEventListener('click', clickHandler);
                resolve();
            };
            overlay.addEventListener('click', clickHandler);
        });

        overlay.classList.remove('show');
    }

    /**
     * Show retrigger message
     * @param {number} additionalSpins - Additional spins awarded
     * @param {number} remainingSpins - Total remaining spins
     * @returns {Promise<void>}
     */
    async showRetrigger(additionalSpins, remainingSpins) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎉</div>
                <h1 class="feature-title">RETRIGGERED!</h1>
                <div class="feature-details">
                    <p class="spins-awarded">+${formatNumber(additionalSpins)} FREE SPINS</p>
                    <p class="multiplier-info">${formatNumber(remainingSpins)} SPINS REMAINING</p>
                </div>
                <p class="feature-start">Click to continue...</p>
            </div>
        `;
        overlay.classList.add('show');

        // Wait for user click
        await new Promise(resolve => {
            const clickHandler = () => {
                overlay.removeEventListener('click', clickHandler);
                resolve();
            };
            overlay.addEventListener('click', clickHandler);
        });

        overlay.classList.remove('show');
    }

    /**
     * Show free spins summary
     * @param {number} totalSpins - Total spins executed
     * @param {number} totalWon - Total won
     * @param {number} multiplier - Multiplier used
     * @param {number} retriggered - Times retriggered
     * @returns {Promise<void>}
     */
    async showSummary(totalSpins, totalWon, multiplier, retriggered) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-summary">
                <h1 class="feature-title">FREE SPINS COMPLETE!</h1>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Spins</span>
                        <span class="stat-value">${formatNumber(totalSpins)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won</span>
                        <span class="stat-value highlight">${formatNumber(totalWon)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Multiplier</span>
                        <span class="stat-value">${formatNumber(multiplier)}x</span>
                    </div>
                    ${retriggered > 0 ? `
                        <div class="stat-item">
                            <span class="stat-label">Retriggered</span>
                            <span class="stat-value">${formatNumber(retriggered)} times</span>
                        </div>
                    ` : ''}
                </div>
                <p class="feature-end">Click to continue...</p>
            </div>
        `;
        overlay.classList.add('show');

        // Wait for user click
        await new Promise(resolve => {
            const clickHandler = () => {
                overlay.removeEventListener('click', clickHandler);
                resolve();
            };
            overlay.addEventListener('click', clickHandler);
        });

        overlay.classList.remove('show');
    }

    /**
     * Update free spins UI counter
     * @param {boolean} active - Is free spins active
     * @param {number} remainingSpins - Remaining spins
     * @param {number} totalSpins - Total spins
     * @param {number} multiplier - Multiplier
     */
    updateUI(active, remainingSpins, totalSpins, multiplier) {
        const container = document.getElementById('freeSpinsUI');
        if (!container) return;

        if (active) {
            container.innerHTML = `
                <div class="free-spins-banner">
                    <div class="fs-icon">⭐</div>
                    <div class="fs-info">
                        <div class="fs-label">FREE SPINS</div>
                        <div class="fs-count">${formatNumber(remainingSpins)} / ${formatNumber(totalSpins)}</div>
                    </div>
                    <div class="fs-multiplier">${formatNumber(multiplier)}x</div>
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
}
