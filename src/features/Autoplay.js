// Autoplay system with configurable settings and stop conditions

export class Autoplay {
    constructor(slotMachine, timerManager) {
        this.game = slotMachine;
        this.isActive = false;
        this.timerManager = timerManager;

        // Autoplay settings
        this.settings = {
            spins: 10,                    // Legacy: preferred spin count (autoplay now runs until stopped)
            stopOnWin: false,             // Stop if any win occurs
            stopOnBigWin: true,           // Stop if win > X * bet
            bigWinMultiplier: 50,         // What counts as a big win
            stopOnFeature: false,         // Stop on free spins/bonus
            stopOnBalance: false,         // Stop if balance increases by X
            balanceIncrease: 1000,        // Target balance increase
            stopOnBalanceLow: true,       // Stop if balance < X
            balanceLowLimit: 100          // Minimum balance to continue
        };

        this.startingBalance = 0;
        this.nextSpinTimeout = null;
    }

    /**
     * Start autoplay with current settings
     */
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.startingBalance = this.game.credits;
        this.clearNextSpinTimeout();

        this.updateUI();
        this.executeNextSpin();
    }

    /**
     * Stop autoplay
     */
    stop(reason = '') {
        if (!this.isActive && !this.nextSpinTimeout) return;

        this.isActive = false;
        this.game.cleanupTimers('autoplay');
        this.clearNextSpinTimeout();
        this.updateUI();

        if (reason) {
            this.game.showMessage(`Autoplay stopped: ${reason}`);
        }
    }

    /**
     * Execute next spin in autoplay sequence
     */
    async executeNextSpin() {
        if (!this.isActive) {
            this.stop();
            return;
        }

        // Check stop conditions before spin
        if (this.checkStopConditions()) {
            return;
        }

        // Check if can afford spin
        if (this.game.credits < this.game.currentBet) {
            this.stop('Insufficient credits');
            return;
        }

        this.updateUI();

        // Execute spin
        await this.game.spin();

        // Check stop conditions after spin
        if (this.checkStopConditions()) {
            return;
        }

        // Continue to next spin if still active
        if (this.isActive) {
            // Delay before next spin (reduced in turbo mode)
            const delay = this.game.turboMode.isActive ? 500 : 1000;
            this.clearNextSpinTimeout();
            this.nextSpinTimeout = this.timerManager
                ? this.timerManager.setTimeout(() => {
                    this.nextSpinTimeout = null;
                    this.executeNextSpin();
                }, delay, 'autoplay')
                : setTimeout(() => {
                    this.nextSpinTimeout = null;
                    this.executeNextSpin();
                }, delay);
        } else {
            this.stop();
        }
    }

    /**
     * Clear any scheduled spin timeout
     */
    clearNextSpinTimeout() {
        if (this.nextSpinTimeout) {
            if (this.timerManager) {
                this.timerManager.clearTimeout(this.nextSpinTimeout);
            } else {
                clearTimeout(this.nextSpinTimeout);
            }
            this.nextSpinTimeout = null;
        }
    }

    /**
     * Reset cached timer handles when a global cleanup occurs.
     */
    onTimersCleared() {
        this.nextSpinTimeout = null;
    }

    /**
     * Check if any stop conditions are met
     */
    checkStopConditions() {
        // Stop on any win
        if (this.settings.stopOnWin && this.game.lastWin > 0) {
            this.stop('Win detected');
            return true;
        }

        // Stop on big win
        if (this.settings.stopOnBigWin && this.game.lastWin >= this.game.currentBet * this.settings.bigWinMultiplier) {
            this.stop(`Big win (${Math.floor(this.game.lastWin / this.game.currentBet)}x)`);
            return true;
        }

        // Stop on feature trigger
        if (this.settings.stopOnFeature && this.game.freeSpins.isActive) {
            this.stop('Free spins triggered');
            return true;
        }

        // Stop on balance increase
        if (this.settings.stopOnBalance) {
            const balanceChange = this.game.credits - this.startingBalance;
            if (balanceChange >= this.settings.balanceIncrease) {
                this.stop(`Balance increased by ${balanceChange}`);
                return true;
            }
        }

        // Stop on low balance
        if (this.settings.stopOnBalanceLow && this.game.credits < this.settings.balanceLowLimit) {
            this.stop('Balance too low');
            return true;
        }

        return false;
    }

    /**
     * Update autoplay UI
     */
    updateUI() {
        const autoplayBtn = document.getElementById('autoplayBtn');
        const autoplayCounter = document.getElementById('autoplayCounter');

        if (autoplayBtn) {
            autoplayBtn.textContent = this.isActive ? 'STOP AUTO' : 'AUTOPLAY';
            autoplayBtn.classList.toggle('active', this.isActive);
        }

        if (autoplayCounter) {
            if (this.isActive) {
                autoplayCounter.textContent = 'Auto: ∞';
                autoplayCounter.style.display = 'block';
            } else {
                autoplayCounter.style.display = 'none';
            }
        }
    }

    /**
     * Update autoplay settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get save data for persistence
     */
    getSaveData() {
        return {
            settings: { ...this.settings }
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
        }
    }
}
