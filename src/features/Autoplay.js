// Autoplay system with configurable settings and stop conditions
import { GAME_CONFIG } from '../config/game.js';
import { GAME_EVENTS } from '../core/EventBus.js';

export class Autoplay {
    /**
     * Create Autoplay with dependency injection
     * @param {Object} deps - Dependencies
     * @param {TimerManager} deps.timerManager - Timer manager
     * @param {GameState} deps.gameState - Game state
     * @param {EventBus} deps.eventBus - Event bus
     * @param {TurboMode} deps.turboMode - Turbo mode reference
     * @param {FreeSpins} deps.freeSpins - Free spins feature (to check if active)
     */
    constructor({ timerManager, gameState, eventBus, turboMode, freeSpins }) {
        this.timerManager = timerManager;
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.turboMode = turboMode;
        this.freeSpins = freeSpins;

        this.isActive = false;

        // Autoplay settings
        this.settings = {
            stopOnWin: false, // Stop if any win occurs
            stopOnBigWin: true, // Stop if win > X * bet
            bigWinMultiplier: 50, // What counts as a big win
            stopOnFeature: false, // Stop on free spins/bonus
            stopOnBalance: false, // Stop if balance increases by X
            balanceIncrease: 1000, // Target balance increase
            stopOnBalanceLow: true, // Stop if balance < X
            balanceLowLimit: 100 // Minimum balance to continue
        };

        this.startingBalance = 0;
        this.nextSpinTimeout = null;

        // Register for timer clear notifications
        this.timerManager.onClear('autoplay', () => {
            this.nextSpinTimeout = null;
        });
    }

    /**
     * Start autoplay with current settings
     */
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.startingBalance = this.gameState.getCredits();
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
        this.timerManager.clearByLabel('autoplay');
        this.clearNextSpinTimeout();
        this.updateUI();

        if (reason) {
            this.eventBus.emit('message:show', `Autoplay stopped: ${reason}`);
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

        // Check if can afford spin
        if (this.gameState.getCredits() < this.gameState.getCurrentBet()) {
            this.stop('Insufficient credits');
            return;
        }

        this.updateUI();

        // Execute spin via event
        this.eventBus.emit(GAME_EVENTS.SPIN_START);

        // Check if free spins were triggered
        if (this.settings.stopOnFeature && this.freeSpins.active) {
            this.stop('Free spins triggered');
            return;
        }

        // Check stop conditions after spin
        if (this.checkStopConditions()) {
            return;
        }

        // Continue to next spin if still active
        if (this.isActive) {
            // Delay before next spin (reduced in turbo mode)
            const delay = this.turboMode.isActive
                ? GAME_CONFIG.autoplay.turboDelay
                : GAME_CONFIG.autoplay.normalDelay;
            this.clearNextSpinTimeout();
            this.nextSpinTimeout = this.timerManager.setTimeout(
                () => {
                    this.nextSpinTimeout = null;
                    this.executeNextSpin();
                },
                delay,
                'autoplay'
            );
        } else {
            this.stop();
        }
    }

    /**
     * Clear any scheduled spin timeout
     */
    clearNextSpinTimeout() {
        if (this.nextSpinTimeout) {
            this.timerManager.clearTimeout(this.nextSpinTimeout);
            this.nextSpinTimeout = null;
        }
    }

    /**
     * Check if any stop conditions are met
     */
    checkStopConditions() {
        // Stop on any win
        if (this.settings.stopOnWin && this.gameState.getLastWin() > 0) {
            this.stop('Win detected');
            return true;
        }

        // Stop on big win
        const lastWin = this.gameState.getLastWin();
        const currentBet = this.gameState.getCurrentBet();
        if (this.settings.stopOnBigWin && lastWin >= currentBet * this.settings.bigWinMultiplier) {
            this.stop(`Big win (${Math.floor(lastWin / currentBet)}x)`);
            return true;
        }

        // Stop on balance increase
        if (this.settings.stopOnBalance) {
            const balanceChange = this.gameState.getCredits() - this.startingBalance;
            if (balanceChange >= this.settings.balanceIncrease) {
                this.stop(`Balance increased by ${balanceChange}`);
                return true;
            }
        }

        // Stop on low balance
        if (this.settings.stopOnBalanceLow && this.gameState.getCredits() < this.settings.balanceLowLimit) {
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
            autoplayBtn.textContent = 'PLAY';
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
