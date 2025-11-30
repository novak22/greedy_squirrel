import { GAME_CONFIG } from '../config/game.js';
import { PaylineEvaluator } from './PaylineEvaluator.js';
import { SlotMachine } from './SlotMachine.js';
import { Storage } from '../utils/Storage.js';
import { formatNumber } from '../utils/formatters.js';
import { ErrorHandler, ERROR_TYPES } from './ErrorHandler.js';
import { UIController } from '../ui/UIController.js';
import { RNG } from '../utils/RNG.js';
import { Logger } from '../utils/Logger.js';
import { GAME_EVENTS } from './EventBus.js';

export class GameOrchestrator extends SlotMachine {
    constructor() {
        super();
        this.loadGameState();
        this.init();
    }

    init() {
        // Cache frequently accessed DOM elements
        this.cacheDOM();

        // Initialize UIController (handles all UI updates via StateManager)
        this.ui = new UIController(this.stateManager, this.events, this.dom);

        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();

        // Initialize progression UI
        this.levelSystem.updateUI();
        this.dailyChallenges.updateChallengesUI();
    }

    /**
     * Load game state from localStorage
     */
    loadGameState() {
        const savedData = Storage.load();
        this.state.setCredits(savedData.credits);
        this.state.setCurrentBet(savedData.currentBet);
        this.state.setCurrentBetIndex(savedData.currentBetIndex);

        this.levelSystem.init(savedData.progression.levelSystem);
        this.achievements.init(savedData.progression.achievements);
        this.dailyChallenges.init(savedData.progression.dailyChallenges);
        this.statistics.init(savedData.progression.statistics);

        this.soundManager.init(savedData.phase4.sound);
        this.visualEffects.init(savedData.phase4.visualEffects);
        this.turboMode.init(savedData.phase4.turboMode);
        this.autoplay.init(savedData.phase4.autoplay);
        this.cascade.init(savedData.phase4.cascade);

        this.spinHistory.init(savedData.phase5.spinHistory);
        this.autoCollectEnabled = savedData.phase5.autoCollectEnabled;

        Logger.info('Game state loaded from localStorage');
    }

    /**
     * Save game state to localStorage
     */
    saveGameState() {
        const payload = Storage.createSavePayload(this);
        Storage.save(payload);
    }

    attachEventListeners() {
        // Core game controls moved to UIController to avoid duplication
        // UIController emits events, SlotMachine subscribes to them
        this.events.on(GAME_EVENTS.SPIN_START, () => this.spin());
        this.events.on('bet:increase', () => this.changeBet(1));
        this.events.on('bet:decrease', () => this.changeBet(-1));
        this.events.on('bet:max', () => this.setMaxBet());

        // Stats modal
        this.ui.bindStatsControls(
            () => this.toggleStats(),
            (tab) => this.updateStatsDisplay(tab)
        );

        // Autoplay and advanced controls (feature-specific, not duplicated)
        if (this.dom.autoplayBtn) {
            this.dom.autoplayBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                if (this.autoplay.isActive) {
                    this.autoplay.stop();
                } else {
                    this.autoplay.start();
                }
            });
        }

        if (this.dom.turboBtn) {
            this.dom.turboBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.turboMode.toggle();
                this.ui.updateTurboMode(this.turboMode.isActive);
                this.saveGameState();
            });
        }

        if (this.dom.autoCollectBtn) {
            this.updateAutoCollectUI();
            this.dom.autoCollectBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.autoCollectEnabled = !this.autoCollectEnabled;
                this.updateAutoCollectUI();
                this.saveGameState();
            });
        }

        // Settings panel
        this.settings.attachEventListeners();

        // History panel
        if (this.dom.historyBtn) {
            this.dom.historyBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.toggle();
            });
        }

        // Buy Bonus feature
        this.buyBonus.attachEventListeners();

        if (this.dom.closeHistory) {
            this.dom.closeHistory.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.hide();
            });
        }

        // Keyboard controls - subscribe to event from UIController
        this.events.on('keyboard:space', () => {
            if (!this.state.isSpinning() && !this.autoplay.isActive) {
                this.spin();
            }
        });
    }

    changeBet(direction) {
        if (this.state.isSpinning()) return;

        this.soundManager.playClick();

        const newIndex = Math.min(
            Math.max(this.state.getCurrentBetIndex() + direction, 0),
            this.betOptions.length - 1
        );

        if (newIndex === this.state.getCurrentBetIndex()) return;

        const proposedBet = this.betOptions[newIndex];
        const increment = proposedBet - this.state.getCurrentBet();

        if (increment > 0 && increment >= this.getMaxBetIncrement()) {
            this.showMessage('BET INCREASE LIMITED TO 10% OF BALANCE');
            return;
        }

        this.state.setCurrentBetIndex(newIndex);
        this.state.setCurrentBet(proposedBet);
        this.updateDisplay();
    }

    setMaxBet() {
        if (this.state.isSpinning()) return;

        this.soundManager.playClick();

        const maxIncrement = this.getMaxBetIncrement();
        const targetIndex = this.findHighestBetWithinIncrement(maxIncrement);

        if (targetIndex === this.state.getCurrentBetIndex()) {
            this.showMessage('BET INCREASE LIMITED TO 10% OF BALANCE');
            return;
        }

        this.state.setCurrentBetIndex(targetIndex);
        this.state.setCurrentBet(this.betOptions[this.state.getCurrentBetIndex()]);
        this.updateDisplay();
    }

    getMaxBetIncrement() {
        return this.state.getCredits() * GAME_CONFIG.maxBetIncrementPercent;
    }

    findHighestBetWithinIncrement(maxIncrement) {
        for (let i = this.betOptions.length - 1; i > this.state.getCurrentBetIndex(); i--) {
            if (this.betOptions[i] - this.state.getCurrentBet() < maxIncrement) {
                return i;
            }
        }
        return this.state.getCurrentBetIndex();
    }

    /**
     * Validate if a spin can be initiated
     * @returns {boolean} True if spin can proceed, false otherwise
     */
    canSpin() {
        if (this.state.isSpinning()) return false;
        if (this.bonusGame.isActive()) return false;

        const isFreeSpin = this.freeSpins.isActive();
        if (!isFreeSpin && this.state.getCredits() < this.state.getCurrentBet()) {
            this.showMessage('INSUFFICIENT CREDITS');
            return false;
        }

        return true;
    }

    /**
     * Initialize spin state and deduct bet
     * @param {boolean} isFreeSpin - Whether this is a free spin (no bet deduction)
     */
    initializeSpin(isFreeSpin) {
        this.state.setSpinning(true);

        // Play spin sound
        this.soundManager.playReelSpin();

        // Only deduct bet if not in free spins
        if (!isFreeSpin) {
            this.state.deductCredits(this.state.getCurrentBet());
        }

        this.state.setLastWin(0);
        this.updateDisplay();

        // Statistics are now tracked via this.statistics.recordSpin()

        // Award spin XP
        this.levelSystem.awardXP('spin');
        this.dailyChallenges.updateChallengeProgress('play_spins', 1);

        if (this.dom.spinBtn) this.dom.spinBtn.disabled = true;

        this.clearWinningSymbols();
        this.hidePaylines();

        // Reset anticipation state
        this.winAnticipation.reset();
    }

    /**
     * Pre-generate reel positions and check for anticipation
     * @returns {Object} Object containing reel positions, predetermined symbols, and anticipation data
     * @returns {number[]} return.reelPositions - Random positions for each reel
     * @returns {string[][]} return.predeterminedSymbols - Predetermined symbols for each reel
     * @returns {boolean} return.shouldTriggerAnticipation - Whether to trigger anticipation effects
     * @returns {Object|null} return.anticipationConfig - Configuration for anticipation effects
     * @returns {number} return.anticipationTriggerReel - Reel index where anticipation triggers
     */
    prepareReelResults() {
        // Debug mode: use forced symbols if set
        if (this.debugMode && this.debugNextSpin) {
            Logger.debug('Using forced spin:', this.debugNextSpin);
            const predeterminedSymbols = this.debugNextSpin;
            this.debugNextSpin = null; // Clear after use

            return {
                reelPositions: [0, 0, 0, 0, 0],
                predeterminedSymbols,
                shouldTriggerAnticipation: false,
                anticipationConfig: null,
                anticipationTriggerReel: -1
            };
        }

        // Pre-generate all reel positions for anticipation peeking
        const reelPositions = [];
        for (let i = 0; i < this.reelCount; i++) {
            reelPositions.push(RNG.getRandomPosition(this.symbolsPerReel));
        }

        // Calculate predetermined symbols for anticipation system to analyze
        const predeterminedSymbols = reelPositions.map((pos, reelIndex) => {
            return RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], pos, this.rowCount);
        });

        // Pre-check if we should trigger anticipation effects (before spinning any reels)
        let shouldTriggerAnticipation = false;
        let anticipationConfig = null;
        let anticipationTriggerReel = -1;

        // Quick check: will anticipation trigger on any reel?
        for (let reelIndex = 2; reelIndex < this.reelCount - 1 && !shouldTriggerAnticipation; reelIndex++) {
            const stoppedReelsSymbols = predeterminedSymbols.slice(0, reelIndex);
            const anticipationCheck = this.winAnticipation.checkAnticipation(reelIndex, stoppedReelsSymbols, predeterminedSymbols);
            if (anticipationCheck) {
                shouldTriggerAnticipation = true;
                anticipationTriggerReel = reelIndex;
                anticipationConfig = anticipationCheck;
                break;
            }
        }

        return {
            reelPositions,
            predeterminedSymbols,
            shouldTriggerAnticipation,
            anticipationConfig,
            anticipationTriggerReel
        };
    }

    /**
     * Main spin method - orchestrates the entire spin process
     */
    async spin() {
        if (!this.canSpin()) return;

        const isFreeSpin = this.freeSpins.isActive();

        // Create checkpoint for error recovery using GameState
        const checkpoint = this.state.createCheckpoint();

        try {
            this.initializeSpin(isFreeSpin);

            // Emit spin start event
            this.events.emit(GAME_EVENTS.SPIN_START, {
                bet: this.state.getCurrentBet(),
                credits: this.state.getCredits(),
                isFreeSpin
            });

            const reelData = this.prepareReelResults();
            await this.executeReelSpin(reelData);

            const result = this.getReelResult();

            Logger.debug('Reel result:', result);

            let winInfo = PaylineEvaluator.evaluateWins(result, this.state.getCurrentBet());
            const bonusInfo = PaylineEvaluator.checkBonusTrigger(result);

            Logger.debug('Win info:', winInfo);
            Logger.debug('Scatter count:', winInfo.scatterCount);

            let totalWin = await this.processWins(winInfo, isFreeSpin);

            this.updateCreditsAndStats(totalWin);

            const shouldExecuteFreeSpins = await this.handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin);

            await this.finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin);

            // Execute free spins AFTER the triggering spin completes
            if (shouldExecuteFreeSpins) {
                await this.executeFreeSpins();
            }

            // Emit spin end event
            this.events.emit(GAME_EVENTS.SPIN_END, {
                bet: this.state.getCurrentBet(),
                win: totalWin,
                credits: this.state.getCredits(),
                winInfo,
                isFreeSpin
            });

        } catch (error) {
            await ErrorHandler.handle(error, {
                context: 'Spin',
                type: ERROR_TYPES.SPIN,
                userMessage: 'ERROR: SPIN FAILED\nBET REFUNDED',
                fallback: async () => {
                    this.state.restoreCheckpoint(checkpoint);
                    if (this.dom.spinBtn) this.dom.spinBtn.disabled = false;
                    this.cleanupTimers();
                    this.clearWinningSymbols();
                    this.hidePaylines();
                    this.updateDisplay();
                    this.saveGameState();
                }
            });
        }
    }

    /**
     * Execute all free spins
     */
    async executeFreeSpins() {
        // Disable manual spinning during free spins
        const originalText = this.dom.spinBtn ? this.dom.spinBtn.textContent : '';

        Logger.debug('executeFreeSpins started - remaining:', this.freeSpins.remainingSpins);

        try {
            while (this.freeSpins.isActive() && this.freeSpins.remainingSpins > 0) {
                Logger.debug('Free spin loop - remaining:', this.freeSpins.remainingSpins, 'isActive:', this.freeSpins.isActive());

                // Update button text to show auto-spinning
                if (this.dom.spinBtn) {
                    this.dom.spinBtn.textContent = 'AUTO SPIN';
                    this.dom.spinBtn.disabled = true;
                }

                // Track remaining spins before the spin to detect stuck state
                const remainingBefore = this.freeSpins.remainingSpins;

                await this.spin();

                Logger.debug('After spin - remaining:', this.freeSpins.remainingSpins);

                // Safety: if spin didn't decrement remaining spins, break to avoid infinite loop
                if (this.freeSpins.remainingSpins === remainingBefore) {
                    Logger.warn('Free spins stuck, breaking loop');
                    break;
                }
            }
        } finally {
            // Restore manual controls
            if (this.dom.spinBtn) {
                this.dom.spinBtn.textContent = originalText;
                this.dom.spinBtn.disabled = false;
            }
        }
    }

    /**
     * Update credits and statistics after win
     * @param {number} totalWin - Total win amount to add to credits
     */
    updateCreditsAndStats(totalWin) {
        if (totalWin > 0) {
            this.state.addCredits(totalWin);
            this.state.setLastWin(totalWin);

            // Award win XP and track stats
            this.levelSystem.awardXP('win', totalWin);
            this.statistics.recordSpin(this.state.getCurrentBet(), totalWin, true);
            this.dailyChallenges.updateChallengeProgress('win_amount', totalWin);

            // Check for big win
            const winMultiplier = totalWin / this.state.getCurrentBet();
            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.levelSystem.awardXP('bigWin');
            }

            // Update daily challenges
            this.dailyChallenges.updateChallengeProgress('big_win', winMultiplier >= GAME_CONFIG.winThresholds.big ? 1 : 0);

            this.updateDisplay();
        } else {
            // Track loss
            this.statistics.recordSpin(this.state.getCurrentBet(), 0, false);
        }
    }

    /**
     * Handle feature triggers (free spins, bonus)
     * @param {Object} winInfo - Win information with scatter data
     * @param {Object} bonusInfo - Bonus trigger information
     * @param {boolean} bonusInfo.triggered - Whether bonus was triggered
     * @param {Array} bonusInfo.bonusLines - Array of bonus line data
     * @param {boolean} isFreeSpin - Whether this is a free spin
     * @returns {Promise<void>}
     */
    async handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin) {
        let shouldExecuteFreeSpins = false;

        // Check for Free Spins trigger
        if (winInfo.hasScatterWin && this.freeSpins.shouldTrigger(winInfo.scatterCount)) {
            if (isFreeSpin) {
                // Re-trigger during free spins
                await this.freeSpins.retrigger(winInfo.scatterCount);
            } else {
                // Initial trigger
                // Track free spins trigger
                this.statistics.recordFeatureTrigger('freeSpins');
                this.levelSystem.awardXP('freeSpins');
                this.dailyChallenges.updateChallengeProgress('trigger_freespins', 1);

                // Free spins trigger sound
                this.soundManager.playFreeSpinsTrigger();

                await this.freeSpins.trigger(winInfo.scatterCount);

                // Signal to execute free spins after this spin completes
                shouldExecuteFreeSpins = true;
            }
        }

        // Check for Bonus trigger
        if (bonusInfo.triggered && !isFreeSpin) {
            // Track bonus trigger
            this.statistics.recordFeatureTrigger('bonus');
            this.levelSystem.awardXP('bonus');
            this.dailyChallenges.updateChallengeProgress('trigger_bonus', 1);

            // Bonus trigger sound
            this.soundManager.playBonusTrigger();

            const bonusCount = bonusInfo.bonusLines[0].count;
            await this.bonusGame.trigger(bonusCount);

            const bonusWin = await this.bonusGame.end();
            if (bonusWin > 0) {
                this.state.addCredits(bonusWin);
                this.state.setLastWin(this.state.getLastWin() + bonusWin);
                // Bonus wins tracked via Statistics class

                this.updateDisplay();
                await this.showMessage(`BONUS WIN: ${formatNumber(bonusWin)}`);
            }
        }

        return shouldExecuteFreeSpins;
    }

    /**
     * Finalize spin and cleanup
     * @param {number} totalWin - Total win amount from this spin
     * @param {Object} winInfo - Win information
     * @param {Object} bonusInfo - Bonus trigger information
     * @param {boolean} isFreeSpin - Whether this was a free spin
     * @returns {Promise<void>}
     */
    async finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin) {
        Logger.debug('finalizeSpin - isFreeSpin:', isFreeSpin, 'remaining before:', this.freeSpins.remainingSpins);

        // Handle free spins countdown
        if (isFreeSpin) {
            const hasMoreSpins = await this.freeSpins.executeSpin();
            Logger.debug('After executeSpin - hasMoreSpins:', hasMoreSpins, 'remaining:', this.freeSpins.remainingSpins);
            if (!hasMoreSpins) {
                await this.freeSpins.end();
            }
        }

        // Check achievements
        this.achievements.checkAchievements(
            this.statistics.allTime,
            this.state.getLastWin(),
            this.state.getCurrentBet(),
            this.state.getCredits()
        );

        // Offer gamble on regular wins (not during free spins/bonus)
        if (
            totalWin > 0 &&
            !isFreeSpin &&
            !bonusInfo.triggered &&
            this.gamble.canGamble(totalWin) &&
            !this.autoCollectEnabled
        ) {
            // Remove the win from credits before gamble (already added in updateCreditsAndStats)
            const currentCredits = this.state.getCredits();
            this.state.setCredits(currentCredits - totalWin);
            this.updateDisplay();

            // Offer gamble
            const gambleResult = await this.offerGamble(totalWin);

            // Add gamble result back
            this.state.setCredits(this.state.getCredits() + gambleResult);
            totalWin = gambleResult;
            this.state.setLastWin(gambleResult);
            this.updateDisplay();

            // Track gamble in statistics if they won more
            if (gambleResult > 0) {
                this.statistics.recordSpin(this.state.getCurrentBet(), gambleResult, true);
            }
        }

        // Record spin in history
        const features = [];
        if (this.freeSpins.isActive()) features.push('freeSpins');
        if (winInfo.hasScatterWin) features.push('scatter');
        if (bonusInfo.triggered) features.push('bonus');
        if (this.cascade.enabled && totalWin > winInfo.totalWin) features.push('cascade');

        this.spinHistory.recordSpin(this.state.getCurrentBet(), totalWin, features);

        // Save game state after each spin
        this.saveGameState();

        this.state.setSpinning(false);
        if (this.dom.spinBtn) this.dom.spinBtn.disabled = false;

        if (this.state.getCredits() === 0 && !isFreeSpin) {
            await this.showMessage('GAME OVER\nResetting to 1000 credits');
            this.state.setCredits(GAME_CONFIG.initialCredits);
            this.updateDisplay();
            this.saveGameState();
        }
    }
}
