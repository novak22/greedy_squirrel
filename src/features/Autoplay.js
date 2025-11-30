// Autoplay system with configurable settings and stop conditions
import { GAME_CONFIG } from '../config/game.js';

export class Autoplay {
    /**
     * Create Autoplay with dependency injection
     * @param {Object} deps - Dependencies (can be game instance for backward compat or deps object)
     * @param {TimerManager} deps.timerManager - Timer manager (when using DI)
     * @param {GameState} deps.gameState - Game state (when using DI)
     * @param {EventBus} deps.eventBus - Event bus (when using DI)
     * @param {TurboMode} deps.turboMode - Turbo mode reference (when using DI)
     */
    constructor(deps, timerManagerLegacy) {
        // Support both old API and new DI API
        // Check if second param exists - that means old API: new Autoplay(game, timerManager)
        // Or check if deps has gameState (only DI pattern has this)
        const isNewDI = !timerManagerLegacy && deps && deps.gameState;

        if (isNewDI) {
            // New DI pattern: new Autoplay({ timerManager, gameState, eventBus, turboMode })
            this.timerManager = deps.timerManager;
            this.gameState = deps.gameState;
            this.eventBus = deps.eventBus;
            this.turboMode = deps.turboMode;
            this.game = null;
        } else {
            // Old pattern: new Autoplay(game, timerManager)
            this.game = deps;
            this.timerManager = timerManagerLegacy || deps?.timerManager;
            this.gameState = null;
            this.eventBus = null;
            this.turboMode = null;
        }

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
        const state = this.gameState || this.game.state;
        this.startingBalance = state.getCredits();
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

        if (this.game) {
            this.game.cleanupTimers('autoplay');
        } else {
            this.timerManager.clearByLabel('autoplay');
        }

        this.clearNextSpinTimeout();
        this.updateUI();

        if (reason) {
            if (this.eventBus) {
                this.eventBus.emit('message:show', `Autoplay stopped: ${reason}`);
            } else if (this.game) {
                this.game.showMessage(`Autoplay stopped: ${reason}`);
            }
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

        const state = this.gameState || this.game.state;

        // Check if can afford spin
        if (state.getCredits() < state.getCurrentBet()) {
            this.stop('Insufficient credits');
            return;
        }

        this.updateUI();

        // Execute spin - emit event or call game method
        if (this.eventBus) {
            this.eventBus.emit('spin:request');
        } else if (this.game) {
            await this.game.spin();
        }

        // Check if free spins were triggered (active flag is set after transition)
        const freeSpinsActive = this.game?.freeSpins?.active || false;
        if (this.settings.stopOnFeature && freeSpinsActive) {
            this.stop('Free spins triggered');
            return;
        }

        // Check stop conditions after spin (based on current spin results)
        if (this.checkStopConditions()) {
            return;
        }

        // Continue to next spin if still active
        if (this.isActive) {
            // Delay before next spin (reduced in turbo mode)
            const turbo = this.turboMode || this.game.turboMode;
            const delay = turbo.isActive
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
        if (this.settings.stopOnWin && this.game.state.getLastWin() > 0) {
            this.stop('Win detected');
            return true;
        }

        // Stop on big win
        const lastWin = this.game.state.getLastWin();
        const currentBet = this.game.state.getCurrentBet();
        if (this.settings.stopOnBigWin && lastWin >= currentBet * this.settings.bigWinMultiplier) {
            this.stop(`Big win (${Math.floor(lastWin / currentBet)}x)`);
            return true;
        }

        // Stop on balance increase
        if (this.settings.stopOnBalance) {
            const balanceChange = this.game.state.getCredits() - this.startingBalance;
            if (balanceChange >= this.settings.balanceIncrease) {
                this.stop(`Balance increased by ${balanceChange}`);
                return true;
            }
        }

        // Stop on low balance
        if (
            this.settings.stopOnBalanceLow &&
            this.game.state.getCredits() < this.settings.balanceLowLimit
        ) {
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
