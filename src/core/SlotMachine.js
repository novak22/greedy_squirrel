// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import { SYMBOLS, getAllSymbolEmojis, getPremiumSymbols } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { RNG } from '../utils/RNG.js';
import { Storage } from '../utils/Storage.js';
import { EventBus, GAME_EVENTS } from './EventBus.js';
import { StateManager, createInitialState } from './StateManager.js';
import { GameState } from './GameState.js';
import { UIFacade } from '../ui/UIFacade.js';
import { FreeSpins } from '../features/FreeSpins.js';
import { BonusGame } from '../features/BonusGame.js';
import { Cascade } from '../features/Cascade.js';
import { LevelSystem } from '../progression/LevelSystem.js';
import { Achievements } from '../progression/Achievements.js';
import { DailyChallenges } from '../progression/DailyChallenges.js';
import { Statistics } from '../progression/Statistics.js';
import { Autoplay } from '../features/Autoplay.js';
import { TurboMode } from '../features/TurboMode.js';
import { VisualEffects } from '../effects/VisualEffects.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Settings } from '../ui/Settings.js';
import { SpinHistory } from '../ui/SpinHistory.js';
import { Gamble } from '../features/Gamble.js';
import { BuyBonus } from '../features/BuyBonus.js';
import { WinAnticipation } from '../features/WinAnticipation.js';
import { TimerManager } from '../utils/TimerManager.js';
import { Logger } from '../utils/Logger.js';
import { SpinEngine } from './SpinEngine.js';
import { FeatureManager } from './FeatureManager.js';

export class SlotMachine {
    constructor() {
        // Core systems
        this.timerManager = new TimerManager();
        this.events = new EventBus();
        this.stateManager = new StateManager(createInitialState());
        this.state = new GameState(this.stateManager);

        // Game configuration
        this.reelCount = GAME_CONFIG.reelCount;
        this.rowCount = GAME_CONFIG.rowCount;
        this.symbolsPerReel = GAME_CONFIG.symbolsPerReel;
        this.betOptions = GAME_CONFIG.betOptions;

        // Reel strips (generated once with weighted symbols)
        this.reelStrips = [];
        for (let i = 0; i < this.reelCount; i++) {
            this.reelStrips.push(RNG.generateReelStrip(i, this.symbolsPerReel));
        }

        // Game state is now managed by GameState wrapper
        // Initialize state with config defaults
        this.state.setCredits(GAME_CONFIG.initialCredits);
        this.state.setCurrentBet(GAME_CONFIG.betOptions[0]);
        this.state.setCurrentBetIndex(0);
        this.state.setLastWin(0);
        this.state.setSpinning(false);
        this.state.setReelPositions([0, 0, 0, 0, 0]);

        // Initialize bonus features
        this.freeSpins = new FreeSpins(this);
        this.bonusGame = new BonusGame(this);
        this.cascade = new Cascade(this);

        // Initialize progression systems
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyChallenges = new DailyChallenges(this);
        this.statistics = new Statistics(this);

        // Initialize advanced features
        this.soundManager = new SoundManager();
        this.visualEffects = new VisualEffects(this);
        this.autoplay = new Autoplay(this, this.timerManager);
        this.turboMode = new TurboMode(this);
        this.settings = new Settings(this);

        // Gamble settings
        this.autoCollectEnabled = false;

        // Debug mode (enable with ?debug=true in URL)
        this.debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
        this.debugNextSpin = null; // Format: [['🌰','🌰','🌰'], ['🌰','🌰','🌰'], ...]

        // Track active timers to avoid overlapping animations
        this.winCounterInterval = null;

        // Initialize gamble and history features
        this.spinHistory = new SpinHistory(FEATURES_CONFIG.spinHistory.maxEntries);
        this.gamble = new Gamble(this);
        this.buyBonus = new BuyBonus(this);
        this.winAnticipation = new WinAnticipation(this);

        // DOM element cache (populated in init)
        this.dom = {};

        this.uiFacade = new UIFacade({
            stateManager: this.stateManager,
            eventBus: this.events,
            timerManager: this.timerManager,
            turboMode: this.turboMode,
            soundManager: this.soundManager,
            state: this.state,
            reelStrips: this.reelStrips,
            reelCount: this.reelCount,
            rowCount: this.rowCount,
            symbolsPerReel: this.symbolsPerReel
        });

        this.featureManager = new FeatureManager({
            freeSpins: this.freeSpins,
            bonusGame: this.bonusGame,
            statistics: this.statistics,
            levelSystem: this.levelSystem,
            dailyChallenges: this.dailyChallenges,
            soundManager: this.soundManager,
            state: this.state,
            achievements: this.achievements,
            gamble: this.gamble,
            spinHistory: this.spinHistory,
            cascade: this.cascade,
            uiFacade: this.uiFacade,
            saveGameState: () => this.saveGameState(),
            executeSpin: () => this.spin(),
            autoCollectEnabledRef: () => this.autoCollectEnabled,
            offerGamble: (winAmount) => this.offerGamble(winAmount)
        });

        this.spinEngine = new SpinEngine({
            state: this.state,
            events: this.events,
            freeSpins: this.freeSpins,
            bonusGame: this.bonusGame,
            cascade: this.cascade,
            levelSystem: this.levelSystem,
            dailyChallenges: this.dailyChallenges,
            statistics: this.statistics,
            gamble: this.gamble,
            achievements: this.achievements,
            turboMode: this.turboMode,
            visualEffects: this.visualEffects,
            winAnticipation: this.winAnticipation,
            timerManager: this.timerManager,
            soundManager: this.soundManager,
            reelStrips: this.reelStrips,
            reelCount: this.reelCount,
            rowCount: this.rowCount,
            symbolsPerReel: this.symbolsPerReel,
            uiFacade: this.uiFacade,
            featureManager: this.featureManager,
            saveGameState: () => this.saveGameState(),
            showMessage: (...args) => this.uiFacade.showMessage(...args),
            updateDisplay: () => this.uiFacade.updateDisplay(),
            cleanupTimers: (label) => this.cleanupTimers(label),
            clearWinningSymbols: () => this.uiFacade.clearWinningSymbols(),
            hidePaylines: () => this.uiFacade.hidePaylines()
        });

        // Load saved data
        this.loadGameState();

        this.init();
    }

    init() {
        this.uiFacade.init();
        this.dom = this.uiFacade.dom;

        this.uiFacade.updateDisplay();
        this.uiFacade.createReels();
        this.attachEventListeners();

        // Initialize progression UI
        this.levelSystem.updateUI();
        this.dailyChallenges.updateChallengesUI();
    }

    /**
     * Cache frequently accessed DOM elements for performance
     */
    cacheDOM() {
        this.uiFacade.cacheDOM();
        this.dom = this.uiFacade.dom;
    }

    /**
     * Load game state from localStorage
     */
    loadGameState() {
        const savedData = Storage.load();
        if (savedData) {
            this.state.setCredits(savedData.credits || GAME_CONFIG.initialCredits);
            this.state.setCurrentBet(savedData.currentBet || GAME_CONFIG.betOptions[0]);
            this.state.setCurrentBetIndex(savedData.currentBetIndex || 0);
            // Note: stats are now handled by Statistics class, not duplicated here

            // Load progression data
            if (savedData.progression) {
                this.levelSystem.init(savedData.progression.levelSystem);
                this.achievements.init(savedData.progression.achievements);
                this.dailyChallenges.init(savedData.progression.dailyChallenges || savedData.progression.dailyRewards);
                this.statistics.init(savedData.progression.statistics);
            }

            // Load advanced features data
            if (savedData.phase4) {
                this.soundManager.init(savedData.phase4.sound);
                this.visualEffects.init(savedData.phase4.visualEffects);
                this.turboMode.init(savedData.phase4.turboMode);
                this.autoplay.init(savedData.phase4.autoplay);
                this.cascade.init(savedData.phase4.cascade);
            }

            // Load spin history and gamble settings
            if (savedData.phase5) {
                this.spinHistory.init(savedData.phase5.spinHistory);
                this.autoCollectEnabled = savedData.phase5.autoCollectEnabled || false;
            }

            Logger.info('Game state loaded from localStorage');
        } else {
            // Initialize progression systems for new sessions
            this.dailyChallenges.init();
        }
    }

    /**
     * Save game state to localStorage
     */
    saveGameState() {
        Storage.save({
            credits: this.state.getCredits(),
            currentBet: this.state.getCurrentBet(),
            currentBetIndex: this.state.getCurrentBetIndex(),
            // Note: stats are now saved via progression.statistics
            // Save progression data
            progression: {
                levelSystem: this.levelSystem.getSaveData(),
                achievements: this.achievements.getSaveData(),
                dailyChallenges: this.dailyChallenges.getSaveData(),
                statistics: this.statistics.getSaveData()
            },
            // Save advanced features data
            phase4: {
                sound: this.soundManager.getSaveData(),
                visualEffects: this.visualEffects.getSaveData(),
                turboMode: this.turboMode.getSaveData(),
                autoplay: this.autoplay.getSaveData(),
                cascade: this.cascade.getSaveData()
            },
            // Save spin history and gamble settings
            phase5: {
                spinHistory: this.spinHistory.getSaveData(),
                autoCollectEnabled: this.autoCollectEnabled
            }
        });
    }

    createReels() {
        this.uiFacade.createReels();
    }

    attachEventListeners() {
        // Core game controls moved to UIController to avoid duplication
        // UIController emits events, SlotMachine subscribes to them
        this.events.on(GAME_EVENTS.SPIN_START, () => this.spin());
        this.events.on('bet:increase', () => this.changeBet(1));
        this.events.on('bet:decrease', () => this.changeBet(-1));
        this.events.on('bet:max', () => this.setMaxBet());

        // Stats modal (unique to SlotMachine, not in UIController)
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.toggleStats());
        }

        const closeStats = document.getElementById('closeStats');
        if (closeStats) {
            closeStats.addEventListener('click', () => this.toggleStats());
        }

        // Stats tabs
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.updateStatsDisplay(tab.dataset.tab);
            });
        });

        // Autoplay and advanced controls (feature-specific, not duplicated)
        const autoplayBtn = document.getElementById('autoplayBtn');
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                if (this.autoplay.isActive) {
                    this.autoplay.stop();
                } else {
                    this.autoplay.start();
                }
            });
        }

        const turboBtn = document.getElementById('turboBtn');
        if (turboBtn) {
            turboBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.turboMode.toggle();
                this.updateTurboUI();
            });
        }

        const autoCollectBtn = document.getElementById('autoCollectBtn');
        if (autoCollectBtn) {
            this.updateAutoCollectUI();
            autoCollectBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.autoCollectEnabled = !this.autoCollectEnabled;
                this.updateAutoCollectUI();
                this.saveGameState();
            });
        }

        // Settings panel
        this.settings.attachEventListeners();

        // History panel
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.toggle();
            });
        }

        // Buy Bonus feature
        this.buyBonus.attachEventListeners();

        const closeHistory = document.getElementById('closeHistory');
        if (closeHistory) {
            closeHistory.addEventListener('click', () => {
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

    updateDisplay() {
        this.uiFacade.updateDisplay();
    }

    /**
     * Update auto collect toggle UI
     */
    updateAutoCollectUI() {
        this.uiFacade.updateAutoCollectUI(this.autoCollectEnabled);
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
        return this.spinEngine.canSpin();
    }

    /**
     * Initialize spin state and deduct bet
     * @param {boolean} isFreeSpin - Whether this is a free spin (no bet deduction)
     */
    initializeSpin(isFreeSpin) {
        this.spinEngine.initializeSpin(isFreeSpin);
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
        return this.spinEngine.prepareReelResults();
    }

    /**
     * Process wins and apply effects    /**
     * Process wins and apply effects
     * @param {Object} winInfo - Win information from PaylineEvaluator
     * @param {number} winInfo.totalWin - Total win amount
     * @param {Set} winInfo.winningPositions - Set of winning symbol positions
     * @param {number[]} winInfo.winningLines - Array of winning payline indices
     * @param {boolean} winInfo.hasScatterWin - Whether scatter symbols won
     * @param {number} winInfo.scatterCount - Number of scatter symbols
     * @param {boolean} isFreeSpin - Whether this is a free spin
     * @returns {Promise<number>} Total win amount including cascades
     */
    async processWins(winInfo, isFreeSpin) {
        return this.spinEngine.processWins(winInfo, isFreeSpin);
    }

    /**
     * Update credits and statistics after win
     * @param {number} totalWin - Total win amount to add to credits
     */
    updateCreditsAndStats(totalWin) {
        return this.spinEngine.updateCreditsAndStats(totalWin);
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
    async finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin) {
        return this.featureManager.finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin);
    }

    /**
     * Main spin method - orchestrates the entire spin process
     */
    async spin() {
        return this.spinEngine.spin();
    }

    /**
     * Execute all free spins
     */
    async executeFreeSpins() {
        return this.featureManager.executeFreeSpins();
    }

    /**
     * Phase 5: Offer gamble feature after win
     */
    async offerGamble(winAmount) {
        return new Promise(async (resolve) => {
            if (this.autoCollectEnabled) {
                this.soundManager.playClick();
                resolve(winAmount);
                return;
            }

            const overlay = document.getElementById('featureOverlay');
            if (!overlay) {
                resolve(winAmount);
                return;
            }

            let autoCollectTimer = null;

            overlay.innerHTML = `
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
            `;

            overlay.classList.add('show');

            const clearAutoCollect = () => {
                if (autoCollectTimer) {
                    this.timerManager.clearInterval(autoCollectTimer);
                    autoCollectTimer = null;
                }
                this.cleanupTimers('gamble-offer');
            };

            // Start auto-collect countdown
            const timerDisplay = document.getElementById('gambleOfferTimer');
            let timeLeft = FEATURES_CONFIG.gamble.offerTimeout;
            autoCollectTimer = this.timerManager.setInterval(() => {
                timeLeft -= 1;
                if (timerDisplay) {
                    timerDisplay.textContent = timeLeft;
                }

                if (timeLeft <= 0) {
                    clearAutoCollect();
                    overlay.classList.remove('show');
                    this.soundManager.playClick();
                    resolve(winAmount);
                }
            }, 1000, 'gamble-offer');

            document.getElementById('gambleAccept').addEventListener('click', async () => {
                clearAutoCollect();
                overlay.classList.remove('show');
                // start() now returns a promise that resolves with the final win amount
                const finalAmount = await this.gamble.start(winAmount);
                resolve(finalAmount);
            });

            document.getElementById('gambleDecline').addEventListener('click', () => {
                clearAutoCollect();
                overlay.classList.remove('show');
                this.soundManager.playClick();
                resolve(winAmount);
            });
        });
    }

    /**
     * Evaluate wins without displaying (used by cascade feature)
     * @param {Array<Array<string>>} result - 2D array of reel symbols
     * @returns {Promise<Object>} Win information from PaylineEvaluator
     */
    async evaluateWinsWithoutDisplay(result) {
        return this.spinEngine.evaluateWinsWithoutDisplay(result);
    }

    /**
     * Spin a single reel with CSS animation
     * OPTIMIZED: Uses CSS animations instead of DOM manipulation every 100ms
     * Much more performant - GPU accelerated, no layout thrashing
     *
     * @param {number} reelIndex - Index of the reel to spin (0-4)
     * @param {number} duration - How long the reel should spin in milliseconds
     * @param {number|null} predeterminedPosition - Final position (null = random)
     * @param {Array<string>|null} predeterminedSymbols - Forced symbols for debug mode
     * @returns {Promise<void>} Resolves when reel stops spinning
     */
    spinReel(reelIndex, duration, predeterminedPosition = null, predeterminedSymbols = null) {
        return this.uiFacade.spinReel(reelIndex, duration, predeterminedPosition, predeterminedSymbols);
    }

    /**
     * Get current symbols visible on all reels
     * @returns {Array<Array<string>>} 2D array of symbols [reel][row]
     */
    getReelResult() {
        return this.uiFacade.getReelResult();
    }

    /**
     * Highlight symbols that are part of winning combinations
     * @param {Set<string>} winningPositions - Set of position strings (e.g., "0-1", "2-3")
     */
    highlightWinningSymbols(winningPositions) {
        this.uiFacade.highlightWinningSymbols(winningPositions);
    }

    clearWinningSymbols() {
        this.uiFacade.clearWinningSymbols();
    }

    /**
     * Phase 5: Apply special CSS classes to symbols based on their type
     */
    applySymbolClasses(symbolElement, symbolText) {
        this.uiFacade.applySymbolClasses(symbolElement, symbolText);
    }

    showWinningPaylines(winningLines) {
        this.uiFacade.showWinningPaylines(winningLines);
    }

    hidePaylines() {
        this.uiFacade.hidePaylines();
    }

    showMessage(message, winAmount = 0) {
        return this.uiFacade.showMessage(message, winAmount);
    }

    /**
     * Phase 5: Animate win counter from 0 to final amount
     */
    animateWinCounter(overlay, finalAmount, baseMessage) {
        this.uiFacade.animateWinCounter(overlay, finalAmount, baseMessage);
    }

    togglePaytable(show) {
        this.uiFacade.togglePaytable(show);
    }

    /**
     * Phase 3: Show level up message
     */
    async showLevelUpMessage(level, reward) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        // Level up sound and visual effects
        this.soundManager.playLevelUp();
        this.visualEffects.showLevelUpEffect();

        // Unlock turbo mode at level 10
        if (level === 10 && reward?.type === 'feature' && reward?.value === 'turbo') {
            this.turboMode.unlock();
        }

        let rewardText = '';
        if (reward) {
            rewardText = `<p class="level-reward">+${reward.credits} Credits</p>`;
            if (reward.type === 'feature') {
                rewardText += `<p class="level-unlock">✨ ${reward.value.toUpperCase()} UNLOCKED!</p>`;
            }
        }

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎉</div>
                <h1 class="feature-title">LEVEL UP!</h1>
                <div class="feature-details">
                    <p class="level-number-big">LEVEL ${level}</p>
                    ${rewardText}
                </div>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.animations.levelUpMessage));
        overlay.classList.remove('show');
    }

    /**
     * Phase 3: Toggle statistics dashboard
     */
    toggleStats() {
        const modal = document.getElementById('statsModal');
        if (!modal) return;

        if (!modal.classList.contains('active')) {
            this.currentStatsTab = 'session';
            this.updateStatsDisplay('session');
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }

    /**
     * Phase 3: Update statistics display with tabs
     */
    updateStatsDisplay(tab = 'session') {
        const container = document.getElementById('statsContentArea');
        if (!container) return;

        // Update active tab
        document.querySelectorAll('.stats-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        const sessionStats = this.statistics.getSessionStats();
        const allTimeStats = this.statistics.getAllTimeStats();
        const achievementStats = this.achievements.getStats();

        let html = '';

        switch(tab) {
            case 'session':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">🎮 Current Session</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Spins</div>
                            <div class="stat-value">${sessionStats.spins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Wagered</div>
                            <div class="stat-value">${sessionStats.wagered}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Won</div>
                            <div class="stat-value">${sessionStats.won}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit</div>
                            <div class="stat-value ${sessionStats.netProfit >= 0 ? 'positive' : 'negative'}">${sessionStats.netProfit >= 0 ? '+' : ''}${sessionStats.netProfit}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Win Rate</div>
                            <div class="stat-value neutral">${sessionStats.winRate}%</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Biggest Win</div>
                            <div class="stat-value">${sessionStats.biggestWin}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Best Streak</div>
                            <div class="stat-value">${sessionStats.bestStreak}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Play Time</div>
                            <div class="stat-value">${Statistics.formatTime(sessionStats.sessionTime)}</div>
                        </div>
                    </div>
                `;
                break;

            case 'alltime':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">🏆 All-Time Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Spins</div>
                            <div class="stat-value">${allTimeStats.totalSpins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Wagered</div>
                            <div class="stat-value">${allTimeStats.totalWagered}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Won</div>
                            <div class="stat-value">${allTimeStats.totalWon}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit</div>
                            <div class="stat-value ${allTimeStats.netProfit >= 0 ? 'positive' : 'negative'}">${allTimeStats.netProfit >= 0 ? '+' : ''}${allTimeStats.netProfit}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">RTP</div>
                            <div class="stat-value neutral">${allTimeStats.rtp}%</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Biggest Win</div>
                            <div class="stat-value">${allTimeStats.biggestWin}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Win Multiplier</div>
                            <div class="stat-value">${allTimeStats.biggestWinMultiplier}x</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Best Streak</div>
                            <div class="stat-value">${allTimeStats.bestWinStreak}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Free Spins</div>
                            <div class="stat-value">${allTimeStats.freeSpinsTriggers}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Bonus Rounds</div>
                            <div class="stat-value">${allTimeStats.bonusHits}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Cascade Wins</div>
                            <div class="stat-value">${allTimeStats.cascadeWins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Play Time</div>
                            <div class="stat-value">${Statistics.formatTime(allTimeStats.totalPlayTime + sessionStats.sessionTime)}</div>
                        </div>
                    </div>
                `;
                break;

            case 'achievements':
                const unlocked = this.achievements.getUnlocked();
                const locked = this.achievements.getLocked();

                html = `
                    <h3 style="color: #ffd700; margin-bottom: 10px;">🏅 Achievements (${achievementStats.unlocked}/${achievementStats.total})</h3>
                    <p style="text-align: center; color: #b0bec5; margin-bottom: 20px;">Completion: ${achievementStats.completion}%</p>
                    <div class="achievements-grid">
                        ${unlocked.map(a => `
                            <div class="achievement-item unlocked">
                                <div class="achievement-item-icon">${a.icon}</div>
                                <div class="achievement-item-name">${a.name}</div>
                                <div class="achievement-item-desc">${a.description}</div>
                                <div class="achievement-item-reward">+${a.reward} Credits</div>
                                <div class="achievement-item-date">Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}</div>
                            </div>
                        `).join('')}
                        ${locked.map(a => `
                            <div class="achievement-item locked">
                                <div class="achievement-item-icon">${a.icon}</div>
                                <div class="achievement-item-name">???</div>
                                <div class="achievement-item-desc">${a.description}</div>
                                <div class="achievement-item-reward">+${a.reward} Credits</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'challenges':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">📅 Daily Challenges</h3>
                    <div id="challengesListArea" style="margin-top: 30px;"></div>
                `;
                container.innerHTML = html;
                this.dailyChallenges.updateChallengesUI();
                return;
        }

        container.innerHTML = html;
    }

    /**
     * Phase 4: Update turbo mode UI
     */
    updateTurboUI() {
        this.uiFacade.updateTurboUI(this.turboMode.isActive);
        this.saveGameState();
    }

    /**
     * Phase 5: Trigger screen shake effect for mega wins
     */
    triggerScreenShake() {
        this.uiFacade.triggerScreenShake();
    }

    /**
     * Clear tracked timers either by label or entirely.
     */
    cleanupTimers(label = null) {
        if (label) {
            this.timerManager.clearByLabel(label);
        } else {
            this.timerManager.clearAll();
        }

        if (!label || label === 'win-counter') {
            this.winCounterInterval = null;
            this.uiFacade.winCounterInterval = null;
        }

        // Timer cleanup notifications now handled by TimerManager.onClear() pattern
        // No need to manually call onTimersCleared()

        if (!label) {
            this.autoplay.isActive = false;
            this.autoplay.updateUI();
            this.state.setSpinning(false);

            if (this.dom.spinBtn) {
                this.dom.spinBtn.disabled = false;
            }
        }
    }

    /**
     * Phase 5: Reset all game data
     */
    resetAllData() {
        // Clear localStorage
        Storage.clear();

        // Reset all game state using GameState
        this.state.setCredits(GAME_CONFIG.initialCredits);
        this.state.setCurrentBet(GAME_CONFIG.betOptions[0]);
        this.state.setCurrentBetIndex(0);
        this.state.setLastWin(0);

        // Clear all subsystems (stats are managed by Statistics class)
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyChallenges = new DailyChallenges(this);
        this.statistics = new Statistics(this);
        this.spinHistory.clear();

        this.updateDisplay();
    }
}
