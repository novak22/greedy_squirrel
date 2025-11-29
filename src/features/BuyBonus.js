// Buy Bonus feature - Purchase direct entry to bonus game

export class BuyBonus {
    constructor(slotMachine) {
        this.game = slotMachine;
        this.costMultiplier = 100; // Cost is bet × 100
        this.minBet = 10;
        this.enabled = true;
    }

    /**
     * Get cost to buy bonus at current bet
     */
    getCost() {
        return this.game.state.getCurrentBet() * this.costMultiplier;
    }

    /**
     * Check if player can afford to buy bonus
     */
    canBuy() {
        return this.enabled && this.game.state.getCredits() >= this.getCost();
    }

    /**
     * Show buy bonus UI
     */
    show() {
        const modal = document.getElementById('buyBonusModal');
        if (!modal) return;

        const cost = this.getCost();
        const canAfford = this.canBuy();

        const content = modal.querySelector('.buy-bonus-content');
        if (!content) return;

        content.innerHTML = `
            <h2>🎁 BUY BONUS FEATURE</h2>

            <div class="buy-bonus-info">
                <p>Purchase direct entry to the Bonus Round!</p>
                <p class="buy-bonus-details">
                    You will receive a guaranteed bonus game with 3-5 picks,
                    each revealing instant prizes from your current bet.
                </p>
            </div>

            <div class="buy-bonus-cost">
                <div class="cost-label">Cost:</div>
                <div class="cost-amount ${canAfford ? '' : 'insufficient'}">${cost}</div>
                <div class="cost-formula">(Bet × ${this.costMultiplier})</div>
            </div>

            <div class="buy-bonus-balance">
                <div class="balance-label">Your Credits:</div>
                <div class="balance-amount ${canAfford ? 'sufficient' : 'insufficient'}">${this.game.state.getCredits()}</div>
            </div>

            ${!canAfford ? `
                <div class="buy-bonus-warning">
                    ⚠️ Insufficient credits to buy bonus!
                </div>
            ` : ''}

            <div class="buy-bonus-buttons">
                <button class="btn-buy-bonus ${canAfford ? '' : 'disabled'}" id="confirmBuyBonus" ${!canAfford ? 'disabled' : ''}>
                    💰 BUY BONUS
                </button>
                <button class="btn-cancel-buy" id="cancelBuyBonus">
                    ❌ CANCEL
                </button>
            </div>
        `;

        modal.classList.add('active');

        // Attach event listeners
        const confirmBtn = document.getElementById('confirmBuyBonus');
        const cancelBtn = document.getElementById('cancelBuyBonus');

        if (confirmBtn && canAfford) {
            confirmBtn.addEventListener('click', () => {
                this.executePurchase();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    /**
     * Hide buy bonus UI
     */
    hide() {
        const modal = document.getElementById('buyBonusModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.game.soundManager.playClick();
    }

    /**
     * Execute the bonus purchase
     */
    async executePurchase() {
        if (!this.canBuy()) return;

        const cost = this.getCost();

        // Deduct cost using GameState
        this.game.state.deductCredits(cost);
        this.game.updateDisplay();
        this.game.saveGameState();

        this.hide();

        // Play purchase sound
        this.game.soundManager.playClick();

        // Track statistics
        this.game.statistics.recordFeatureTrigger('buyBonus', { cost });

        // Small delay for effect
        await new Promise(resolve => setTimeout(resolve, 500));

        // Trigger bonus game with random count (3-5)
        const bonusCount = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
        await this.game.bonusGame.trigger(bonusCount);

        const bonusWin = await this.game.bonusGame.end();

        if (bonusWin > 0) {
            this.game.state.addCredits(bonusWin);
            this.game.state.setLastWin(bonusWin);

            // Stats are now tracked via statistics class
            this.game.statistics.recordSpin(this.game.state.getCurrentBet(), bonusWin, true);

            // Award XP for bonus
            this.game.levelSystem.awardXP('bonus');

            this.game.updateDisplay();
            await this.game.showMessage(`BONUS WIN: ${bonusWin}`);
        }

        this.game.saveGameState();
    }

    /**
     * Attach event listeners for buy bonus button
     */
    attachEventListeners() {
        const buyBonusBtn = document.getElementById('buyBonusBtn');
        if (buyBonusBtn) {
            buyBonusBtn.addEventListener('click', () => {
                if (!this.game.state.isSpinning()) {
                    this.show();
                }
            });
        }
    }

    /**
     * Toggle buy bonus feature
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
