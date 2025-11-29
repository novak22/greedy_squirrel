// Pick-Me Bonus Game implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class BonusGame {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.picks = [];
        this.totalPicks = 0;
        this.picksRemaining = 0;
        this.totalWon = 0;
        this.pickedItems = [];
    }

    /**
     * Check if bonus should trigger
     * @param {Object} bonusInfo - Bonus trigger information
     * @returns {boolean}
     */
    shouldTrigger(bonusInfo) {
        return bonusInfo.triggered;
    }

    /**
     * Start the bonus game
     * @param {number} bonusCount - Number of bonus symbols
     */
    async trigger(bonusCount) {
        this.active = true;
        this.totalWon = 0;
        this.pickedItems = [];

        // Number of picks based on bonus symbols (3-5)
        this.totalPicks = Math.min(bonusCount, FEATURES_CONFIG.bonusGame.pickGame.maxPicks);
        this.picksRemaining = this.totalPicks;

        // Generate pick items
        this.generatePicks();

        // Show transition
        await this.showTransition(bonusCount);

        // Show pick-me game UI
        this.showPickGame();
    }

    /**
     * Generate randomized pick items
     */
    generatePicks() {
        const config = FEATURES_CONFIG.bonusGame.pickGame;
        const itemCount = 12; // Total items to display
        this.picks = [];

        // Add guaranteed prizes
        for (let i = 0; i < this.totalPicks; i++) {
            const prizeType = Math.random();
            let prize;

            if (prizeType < 0.6) {
                // 60% chance for credits
                const creditPrize = config.prizes[0];
                const amount = Math.floor(
                    Math.random() * (creditPrize.max - creditPrize.min) + creditPrize.min
                );
                prize = {
                    type: 'credits',
                    value: amount,
                    display: `${amount}`,
                    icon: '💰'
                };
            } else if (prizeType < 0.9) {
                // 30% chance for multiplier
                const multPrize = config.prizes[1];
                const mult = Math.floor(
                    Math.random() * (multPrize.max - multPrize.min) + multPrize.min
                );
                prize = {
                    type: 'multiplier',
                    value: mult,
                    display: `${mult}x`,
                    icon: '✨'
                };
            } else {
                // 10% chance for extra pick
                prize = {
                    type: 'extraPick',
                    value: 1,
                    display: '+1 PICK',
                    icon: '🎁'
                };
            }

            this.picks.push(prize);
        }

        // Fill remaining slots with blank/lower prizes
        while (this.picks.length < itemCount) {
            const amount = Math.floor(Math.random() * 100 + 20);
            this.picks.push({
                type: 'credits',
                value: amount,
                display: `${amount}`,
                icon: '🌰'
            });
        }

        // Shuffle
        this.picks.sort(() => Math.random() - 0.5);
    }

    /**
     * Handle item pick
     * @param {number} index - Index of picked item
     */
    async pickItem(index) {
        if (!this.active || this.picksRemaining <= 0) return;
        if (this.pickedItems.includes(index)) return;

        const item = this.picks[index];
        this.pickedItems.push(index);

        // Reveal the item
        await this.revealItem(index, item);

        // Process the prize
        if (item.type === 'credits') {
            this.totalWon += item.value;
        } else if (item.type === 'multiplier') {
            this.totalWon *= item.value;
        } else if (item.type === 'extraPick') {
            this.totalPicks++;
            this.picksRemaining++;
        }

        this.picksRemaining--;

        // Update UI
        this.updatePickUI();

        // Check if done
        if (this.picksRemaining <= 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.end();
        }
    }

    /**
     * Reveal a picked item with animation
     * @param {number} index
     * @param {Object} item
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
     * End the bonus game
     */
    async end() {
        this.active = false;

        // Show summary
        await this.showSummary();

        // Hide UI
        this.hidePickGame();

        const wonAmount = this.totalWon;
        this.totalWon = 0;
        this.pickedItems = [];

        return wonAmount;
    }

    /**
     * Show transition into bonus game
     */
    async showTransition(bonusCount) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎁🎁🎁</div>
                <h1 class="feature-title">BONUS ROUND!</h1>
                <div class="feature-details">
                    <p class="picks-awarded">${this.totalPicks} PICKS</p>
                    <p class="bonus-info">${bonusCount} BONUS symbols landed!</p>
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
     */
    showPickGame() {
        const container = document.getElementById('bonusGameUI');
        if (!container) return;

        let html = `
            <div class="bonus-header">
                <h2>PICK YOUR PRIZES</h2>
                <div class="picks-info">
                    <span class="picks-remaining">${this.picksRemaining}</span>
                    <span class="picks-label">PICKS REMAINING</span>
                </div>
                <div class="bonus-total">Total: <span id="bonusTotalWon">${this.totalWon}</span></div>
            </div>
            <div class="pick-grid">
        `;

        for (let i = 0; i < this.picks.length; i++) {
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

        // Add click handlers
        document.querySelectorAll('.pick-item').forEach((item, index) => {
            item.addEventListener('click', () => this.pickItem(index));
        });
    }

    /**
     * Update pick game UI
     */
    updatePickUI() {
        const remaining = document.querySelector('.picks-remaining');
        const total = document.getElementById('bonusTotalWon');

        if (remaining) remaining.textContent = this.picksRemaining;
        if (total) total.textContent = this.totalWon;
    }

    /**
     * Hide pick game UI
     */
    hidePickGame() {
        const container = document.getElementById('bonusGameUI');
        if (container) {
            container.classList.remove('active');
        }
    }

    /**
     * Show bonus game summary
     */
    async showSummary() {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-summary">
                <h1 class="feature-title">BONUS COMPLETE!</h1>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Picks</span>
                        <span class="stat-value">${this.totalPicks}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Won</span>
                        <span class="stat-value highlight">${this.totalWon}</span>
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
     * Check if bonus game is active
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }
}
