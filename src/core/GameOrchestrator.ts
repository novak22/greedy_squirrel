import { GAME_CONFIG } from '../config/game.js';
import { SYMBOLS, getPremiumSymbols } from '../config/symbols.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { SlotMachine, type SlotMachineDependencies } from './SlotMachine.js';
import { ErrorHandler, ERROR_TYPES } from './ErrorHandler.js';
import { UIController } from '../ui/UIController.js';
import { Logger } from '../utils/Logger.js';
import { Metrics } from '../utils/Metrics.js';
import { GAME_EVENTS } from './EventBus.js';
import { StatsRenderer } from '../ui/renderers/StatsRenderer.js';
import { DOMCache } from '../ui/DOMCache.js';
import { StatsController } from '../ui/StatsController.js';
import { GameStateLoader } from './GameStateLoader.js';
import { assertValidConfigs } from '../config/validation.js';

type WinningPositions = Set<string>;

type BonusInfo = {
    triggered: boolean;
    bonusLines: unknown[];
};

type SpinContext = {
    reelPositions: number[];
    predeterminedSymbols: string[][];
    shouldTriggerAnticipation: boolean;
    anticipationConfig: Record<string, unknown> | null;
    anticipationTriggerReel: number;
};

type WinInfo = {
    totalWin: number;
    winningPositions: WinningPositions;
    winningLines: number[];
    hasScatterWin: boolean;
    scatterCount: number;
};

type LevelReward = {
    credits: number;
    type?: string;
    value?: string;
} | null;

type OrchestratorDependencies = SlotMachineDependencies;

export class GameOrchestrator extends SlotMachine {
    paylineEvaluator: PaylineEvaluator;
    stateLoader: GameStateLoader;
    statsController!: StatsController;

    constructor(dependencies: OrchestratorDependencies) {
        super(dependencies);

        // Validate game configuration before initialization
        const configErrors = assertValidConfigs(Logger);
        if (configErrors.length > 0) {
            throw new Error(
                `Configuration validation failed:\n${configErrors.map((e) => `  - ${e}`).join('\n')}`
            );
        }

        this.paylineEvaluator = dependencies.paylineEvaluator;

        // Initialize state loader
        this.stateLoader = new GameStateLoader({
            gameState: this.state,
            levelSystem: this.levelSystem,
            achievements: this.achievements,
            statistics: this.statistics,
            dailyChallenges: this.dailyChallenges,
            soundManager: this.soundManager,
            visualEffects: this.visualEffects,
            turboMode: this.turboMode,
            autoplay: this.autoplay,
            cascade: this.cascade,
            spinHistory: this.spinHistory,
            getAutoCollectEnabled: () => this.autoCollectEnabled,
            setAutoCollectEnabled: (value: boolean) => {
                this.autoCollectEnabled = Boolean(value);
            }
        });
        this.stateLoader.load();

        this.init();
    }

    init(): void {
        // Initialize DOM cache (populate existing this.dom object to preserve references)
        new DOMCache(this.dom);

        // Initialize stats controller
        const statsRenderer = new StatsRenderer();
        this.statsController = new StatsController({
            statistics: this.statistics,
            achievements: this.achievements,
            dailyChallenges: this.dailyChallenges,
            renderer: statsRenderer,
            ui: this.uiFacade,
            stateManager: this.stateManager
        });

        // Initialize UIController (handles all UI updates via StateManager)
        const uiController = new UIController(this.stateManager, this.events, this.dom);
        this.uiFacade.bindController(uiController);
        this.ui = this.uiFacade;

        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();

        // Initialize progression UI
        this.levelSystem.updateUI();
        this.dailyChallenges.updateChallengesUI();

        // Update feature UI to reflect loaded state
        this.turboMode.updateUI();
        this.updateAutoCollectUI();
    }

    /**
     * Save game state to localStorage
     */
    saveGameState(): void {
        this.stateLoader.save();
    }

    attachEventListeners(): void {
        // Core game controls moved to UIController to avoid duplication
        // UIController emits events, SlotMachine subscribes to them
        this.events.on(GAME_EVENTS.SPIN_START, () => this.spin());
        this.events.on('bet:increase', () => this.changeBet(1));
        this.events.on('bet:decrease', () => this.changeBet(-1));
        this.events.on('bet:max', () => this.setMaxBet());

        // Stats modal
        this.ui.bindStatsControls(
            () => this.statsController.toggle(),
            (tab: string) => this.statsController.updateDisplay(tab)
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

    createReels(): void {
        this.ui.createReels(
            this.reelCount,
            this.symbolsPerReel,
            this.rowCount,
            this.reelStrips,
            this.state,
            (symbol: HTMLElement, text: string) => this.applySymbolClasses(symbol, text),
            this.rng
        );
    }

    updateDisplay(): void {
        this.ui.updateDisplay(
            this.state.getCredits(),
            this.state.getCurrentBet(),
            this.state.getLastWin()
        );
    }

    /**
     * Update auto collect toggle UI
     */
    updateAutoCollectUI(): void {
        this.ui.updateAutoCollectUI(this.autoCollectEnabled);
    }

    /**
     * Highlight symbols that are part of winning combinations
     * @param {Set<string>} winningPositions - Set of position strings (e.g., "0-1", "2-3")
     */
    highlightWinningSymbols(winningPositions: WinningPositions): void {
        this.ui.highlightWinningSymbols(winningPositions);
    }

    clearWinningSymbols() {
        this.ui.clearWinningSymbols();
    }

    /**
     * Phase 5: Apply special CSS classes to symbols based on their type
     */
    applySymbolClasses(symbolElement: HTMLElement, symbolText: string): void {
        // Remove existing special classes
        symbolElement.classList.remove('premium', 'scatter');

        // Premium symbols (high-value symbols)
        const premiumSymbols = getPremiumSymbols();
        if (premiumSymbols.includes(symbolText)) {
            symbolElement.classList.add('premium');
        }

        // Scatter symbol
        if (symbolText === SYMBOLS.SCATTER.emoji) {
            symbolElement.classList.add('scatter');
        }
    }

    showWinningPaylines(winningLines: number[]): void {
        this.ui.showWinningPaylines(winningLines);
    }

    hidePaylines(): void {
        this.ui.hidePaylines();
    }

    showMessage(message: string, winAmount = 0) {
        return this.ui.showMessage(message, winAmount);
    }

    /**
     * Phase 5: Animate win counter from 0 to final amount
     */
    animateWinCounter(
        overlay: HTMLElement | null,
        finalAmount: number,
        baseMessage: string
    ): unknown {
        return this.ui.animateWinCounter(overlay, finalAmount, baseMessage);
    }

    togglePaytable(show: boolean): void {
        if (!this.dom.paytableModal) return;

        if (show) {
            this.dom.paytableModal.classList.add('show');
        } else {
            this.dom.paytableModal.classList.remove('show');
        }
    }

    /**
     * Phase 3: Show level up message
     */
    async showLevelUpMessage(level: number, reward: LevelReward): Promise<void> {
        let rewardText = '';
        if (reward) {
            rewardText = `<p class="level-reward">+${reward.credits} Credits</p>`;
            if (reward.type === 'feature') {
                const rewardLabel = reward.value?.toUpperCase() ?? '';
                rewardText += `<p class="level-unlock">✨ ${rewardLabel} UNLOCKED!</p>`;
            }
        }

        const overlay = this.ui.showFeatureOverlay(`
            <div class="feature-transition">
                <div class="feature-icon">🎉</div>
                <h1 class="feature-title">LEVEL UP!</h1>
                <div class="feature-details">
                    <p class="level-number-big">LEVEL ${level}</p>
                    ${rewardText}
                </div>
            </div>
        `);
        if (!overlay) return;

        // Level up sound and visual effects
        this.soundManager.playLevelUp();
        this.visualEffects.showLevelUpEffect();

        // Unlock turbo mode at level 10
        if (level === 10 && reward?.type === 'feature' && reward?.value === 'turbo') {
            this.turboMode.unlock();
        }

        await new Promise((resolve) => setTimeout(resolve, GAME_CONFIG.animations.levelUpMessage));
        this.ui.hideFeatureOverlay();
    }

    /**
     * Phase 5: Trigger screen shake effect for mega wins
     */
    triggerScreenShake(): void {
        if (this.dom.gameContainer) {
            this.dom.gameContainer.classList.add('screen-shake');

            this.timerManager.setTimeout(
                () => {
                    this.dom.gameContainer?.classList.remove('screen-shake');
                },
                GAME_CONFIG.animations.screenShake,
                'visual-effects'
            );
        }

        this.ui.triggerScreenShake();
    }

    getSpinButton(): HTMLButtonElement | null {
        return (this.dom.spinBtn as HTMLButtonElement | null) ?? null;
    }

    /**
     * Clear tracked timers either by label or entirely.
     */
    cleanupTimers(label: string | null = null): void {
        if (label) {
            this.timerManager.clearByLabel(label);
        } else {
            this.timerManager.clearAll();
        }

        if (!label || label === 'win-counter') {
            this.winCounterInterval = null;
        }

        if (!label) {
            this.autoplay.isActive = false;
            this.autoplay.updateUI();
            this.state.setSpinning(false);

            const spinButton = this.getSpinButton();
            if (spinButton) {
                spinButton.disabled = false;
            }
        }
    }

    /**
     * Fully dispose of timer resources to prevent leaks during teardown.
     */
    dispose(): void {
        this.cleanupTimers();
        this.timerManager.dispose();
    }

    /**
     * Reset all game data
     */
    resetAllData(): void {
        // Clear localStorage via stateLoader
        this.stateLoader.clear();

        // Reload the page to fully reset (simplest approach)
        window.location.reload();
    }

    /**
     * Phase 5: Offer gamble feature after win
     */
    async offerGamble(winAmount: number): Promise<number> {
        if (this.autoCollectEnabled) {
            this.soundManager.playClick();
            return winAmount;
        }

        const overlay = this.ui.showFeatureOverlay(`
            <div class="gamble-container">
                <h2 class="gamble-title">🎴 DOUBLE UP</h2>

                <div class="gamble-current-win">
                    <div class="gamble-label">You Won:</div>
                    <div class="gamble-amount">${winAmount}</div>
                </div>

                <div class="gamble-message">
                    Try to double your win?<br>
                    Guess the card color!
                </div>

                <div class="gamble-timer">Auto-collect in: <span class="timer-value" id="gambleOfferTimer">5</span>s</div>

                <div class="gamble-buttons">
                    <button class="btn btn-small" id="gambleAccept">
                        🎲 DOUBLE UP
                    </button>
                    <button class="btn btn-small" id="gambleDecline">
                        💰 COLLECT
                    </button>
                </div>
            </div>
        `);
        if (!overlay) {
            return winAmount;
        }

        return new Promise((resolve) => {
            let autoCollectTimer: ReturnType<typeof setInterval> | null = null;

            const clearAutoCollect = () => {
                if (autoCollectTimer) {
                    this.timerManager.clearInterval(autoCollectTimer);
                    autoCollectTimer = null;
                }
                this.cleanupTimers('gamble-offer');
            };

            // Start auto-collect countdown
            const timerDisplay = overlay.querySelector('#gambleOfferTimer');
            let timeLeft = FEATURES_CONFIG.gamble.offerTimeout;
            autoCollectTimer = this.timerManager.setInterval(
                () => {
                    timeLeft -= 1;
                    if (timerDisplay) {
                        timerDisplay.textContent = timeLeft;
                    }

                    if (timeLeft <= 0) {
                        clearAutoCollect();
                        this.ui.hideFeatureOverlay();
                        this.soundManager.playClick();
                        resolve(winAmount);
                    }
                },
                1000,
                'gamble-offer'
            );

            overlay.querySelector('#gambleAccept')?.addEventListener('click', async () => {
                clearAutoCollect();
                this.ui.hideFeatureOverlay();
                // start() now returns a promise that resolves with the final win amount
                const finalAmount = await this.gamble.start(winAmount);
                resolve(finalAmount);
            });

            overlay.querySelector('#gambleDecline')?.addEventListener('click', () => {
                clearAutoCollect();
                this.ui.hideFeatureOverlay();
                this.soundManager.playClick();
                resolve(winAmount);
            });
        });
    }

    changeBet(direction: number): void {
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

    setMaxBet(): void {
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

    getMaxBetIncrement(): number {
        return this.state.getCredits() * GAME_CONFIG.maxBetIncrementPercent;
    }

    findHighestBetWithinIncrement(maxIncrement: number): number {
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
    canSpin(): boolean {
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
    initializeSpin(isFreeSpin: boolean): void {
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

        const spinButton = this.getSpinButton();
        if (spinButton) spinButton.disabled = true;

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
    prepareReelResults(): SpinContext {
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
            reelPositions.push(this.rng.getRandomPosition(this.symbolsPerReel));
        }

        // Calculate predetermined symbols for anticipation system to analyze
        const predeterminedSymbols = reelPositions.map((pos, reelIndex) => {
            return this.rng.getSymbolsAtPosition(this.reelStrips[reelIndex], pos, this.rowCount);
        });

        // Pre-check if we should trigger anticipation effects (before spinning any reels)
        let shouldTriggerAnticipation = false;
        let anticipationConfig = null;
        let anticipationTriggerReel = -1;

        // Quick check: will anticipation trigger on any reel?
        for (
            let reelIndex = 2;
            reelIndex < this.reelCount - 1 && !shouldTriggerAnticipation;
            reelIndex++
        ) {
            const stoppedReelsSymbols = predeterminedSymbols.slice(0, reelIndex);
            const anticipationCheck = this.winAnticipation.checkAnticipation(
                reelIndex,
                stoppedReelsSymbols,
                predeterminedSymbols
            );
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
    async spin(): Promise<void> {
        if (!this.canSpin()) return;

        const isFreeSpin = this.freeSpins.isActive();
        const spinTimer = Metrics.startTimer('spin.total', {
            isFreeSpin,
            bet: this.state.getCurrentBet(),
            creditsBefore: this.state.getCredits()
        });

        // Create checkpoint for error recovery using GameState
        const checkpoint = this.state.createCheckpoint();
        let totalWin = 0;
        let spinError = null;

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

            const winInfo = this.paylineEvaluator.evaluateWins(
                result,
                this.state.getCurrentBet()
            ) as WinInfo;
            const bonusInfo = this.paylineEvaluator.checkBonusTrigger(result) as BonusInfo;

            Logger.debug('Win info:', winInfo);
            Logger.debug('Scatter count:', winInfo.scatterCount);

            totalWin = await this.processWins(winInfo, isFreeSpin);

            this.updateCreditsAndStats(totalWin);

            const shouldExecuteFreeSpins = await this.handleFeatureTriggers(
                winInfo,
                bonusInfo,
                isFreeSpin
            );

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
            spinError = error;
            await ErrorHandler.handle(error, {
                context: 'Spin',
                type: ERROR_TYPES.SPIN,
                userMessage: 'ERROR: SPIN FAILED\nBET REFUNDED',
                fallback: async () => {
                    this.state.restoreCheckpoint(checkpoint);
                    const spinButton = this.getSpinButton();
                    if (spinButton) spinButton.disabled = false;
                    this.cleanupTimers();
                    this.clearWinningSymbols();
                    this.hidePaylines();
                    this.updateDisplay();
                    this.saveGameState();
                }
            });
        } finally {
            spinTimer?.end({
                totalWin,
                creditsAfter: this.state.getCredits(),
                error: spinError instanceof Error ? spinError.message : null
            });
        }
    }

    /**
     * Execute all free spins
     */
    async executeFreeSpins(): Promise<void> {
        // Disable manual spinning during free spins
        const spinButton = this.getSpinButton();
        const originalText = spinButton ? spinButton.textContent : '';

        Logger.debug('executeFreeSpins started - remaining:', this.freeSpins.remainingSpins);

        try {
            while (this.freeSpins.isActive() && this.freeSpins.remainingSpins > 0) {
                Logger.debug(
                    'Free spin loop - remaining:',
                    this.freeSpins.remainingSpins,
                    'isActive:',
                    this.freeSpins.isActive()
                );

                // Update button text to show auto-spinning
                if (spinButton) {
                    spinButton.textContent = 'AUTO SPIN';
                    spinButton.disabled = true;
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
            if (spinButton) {
                spinButton.textContent = originalText;
                spinButton.disabled = false;
            }
        }
    }

    /**
     * Update credits and statistics after win
     * @param {number} totalWin - Total win amount to add to credits
     */
    updateCreditsAndStats(totalWin: number) {
        return super.updateCreditsAndStats(totalWin);
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
    async handleFeatureTriggers(
        winInfo: WinInfo,
        bonusInfo: BonusInfo,
        isFreeSpin: boolean
    ): Promise<boolean> {
        return this.featureManager.handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin);
    }

    /**
     * Finalize spin and cleanup
     * @param {number} totalWin - Total win amount from this spin
     * @param {Object} winInfo - Win information
     * @param {Object} bonusInfo - Bonus trigger information
     * @param {boolean} isFreeSpin - Whether this was a free spin
     * @returns {Promise<void>}
     */
    async finalizeSpin(
        totalWin: number,
        winInfo: WinInfo,
        bonusInfo: BonusInfo,
        isFreeSpin: boolean
    ): Promise<void> {
        return this.featureManager.finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin);
    }
}
