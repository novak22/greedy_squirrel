// Pick-Me Bonus Game implementation
import { FEATURES_CONFIG } from '../config/features.js';

export class BonusGame {
    /**
     * Create BonusGame feature with dependency injection
     * @param {Object} deps - Dependencies (or legacy game instance)
     * @param {Object} deps.renderer - BonusGameRenderer instance for UI
     */
    constructor(deps) {
        // Backward compatibility: support both new DI pattern and old game instance pattern
        const isNewDI = deps && deps.renderer !== undefined;

        if (isNewDI) {
            // New DI pattern: { renderer }
            this.renderer = deps.renderer;
        } else {
            // Old pattern: BonusGame(game) - renderer will be set later
            this.game = deps; // Store game reference temporarily
            this.renderer = null;
        }

        this.active = false;
        this.picks = [];
        this.totalPicks = 0;
        this.picksRemaining = 0;
        this.totalWon = 0;
        this.pickedItems = [];
    }

    /**
     * Set renderer (backward compatibility method)
     * @param {Object} renderer - BonusGameRenderer instance
     */
    setRenderer(renderer) {
        this.renderer = renderer;
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
        if (typeof bonusCount !== 'number' || bonusCount < 3) {
            console.error('BonusGame: Invalid bonusCount:', bonusCount);
            return;
        }

        try {
            this.active = true;
            this.totalWon = 0;
            this.pickedItems = [];

            // Number of picks based on bonus symbols (3-5)
            this.totalPicks = Math.min(bonusCount, FEATURES_CONFIG.bonusGame.pickGame.maxPicks);
            this.picksRemaining = this.totalPicks;

            // Generate pick items
            this.generatePicks();

            // Show transition (delegate to renderer)
            if (this.renderer) {
                await this.renderer.showTransition(bonusCount, this.totalPicks);
            }

            // Show pick-me game UI (delegate to renderer)
            if (this.renderer) {
                this.renderer.showPickGame(
                    this.picks,
                    this.picksRemaining,
                    this.totalWon,
                    (index) => this.pickItem(index)
                );
            }
        } catch (error) {
            console.error('BonusGame trigger failed:', error);
            this.active = false;
            this.hideUI();
        }
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

        // Reveal the item (delegate to renderer)
        if (this.renderer) {
            await this.renderer.revealItem(index, item);
        }

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

        // Update UI (delegate to renderer)
        if (this.renderer) {
            this.renderer.updatePickUI(this.picksRemaining, this.totalWon);
        }

        // Check if done
        if (this.picksRemaining <= 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
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

        await new Promise((resolve) => setTimeout(resolve, FEATURES_CONFIG.bonusGame.revealDelay));
    }

    /**
     * End the bonus game
     */
    async end() {
        this.active = false;

        // Show summary (delegate to renderer)
        if (this.renderer) {
            await this.renderer.showSummary(this.totalPicks, this.totalWon);
        }

        // Hide UI (delegate to renderer)
        if (this.renderer) {
            this.renderer.hidePickGame();
        }

        const wonAmount = this.totalWon;
        this.totalWon = 0;
        this.pickedItems = [];

        return wonAmount;
    }

    /**
     * Hide UI (fallback for error cases)
     */
    hideUI() {
        if (this.renderer) {
            this.renderer.hidePickGame();
        }
    }

    /**
     * Check if bonus game is active
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }
}
