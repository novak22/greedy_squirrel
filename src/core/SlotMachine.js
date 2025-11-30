// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import { SYMBOLS, getAllSymbolEmojis, getPremiumSymbols } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { RNG } from '../utils/RNG.js';
import { Storage } from '../utils/Storage.js';
import { EventBus } from './EventBus.js';
import { StateManager, createInitialState } from './StateManager.js';
import { GameState } from './GameState.js';
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
import { ErrorHandler, ERROR_TYPES } from './ErrorHandler.js';
import { SpinEngine } from './SpinEngine.js';
import { FeatureManager } from './FeatureManager.js';
import { UIFacade } from '../ui/UIFacade.js';

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

        ErrorHandler.init({
            showMessage: (message) => this.showMessage(message)
        });

        // Track active timers to avoid overlapping animations
        this.winCounterInterval = null;

        // Initialize gamble and history features
        this.spinHistory = new SpinHistory(FEATURES_CONFIG.spinHistory.maxEntries);
        this.gamble = new Gamble(this);
        this.buyBonus = new BuyBonus(this);
        this.winAnticipation = new WinAnticipation(this);

        // DOM element cache (populated in init)
        this.dom = {};

        // Delegated subsystems
        this.uiFacade = new UIFacade(this.dom, this.timerManager, this.turboMode);
        this.spinEngine = new SpinEngine({
            reelCount: this.reelCount,
            rowCount: this.rowCount,
            symbolsPerReel: this.symbolsPerReel,
            reelStrips: this.reelStrips,
            turboMode: this.turboMode,
            timerManager: this.timerManager,
            state: this.state,
            dom: this.dom,
            soundManager: this.soundManager,
            winAnticipation: this.winAnticipation,
            events: this.events,
            cascade: this.cascade,
            freeSpins: this.freeSpins,
            statistics: this.statistics,
            dailyChallenges: this.dailyChallenges,
            levelSystem: this.levelSystem,
            visualEffects: this.visualEffects,
            ui: this.uiFacade,
            triggerScreenShake: () => this.triggerScreenShake()
        });

        this.featureManager = new FeatureManager({
            freeSpins: this.freeSpins,
            bonusGame: this.bonusGame,
            statistics: this.statistics,
            levelSystem: this.levelSystem,
            achievements: this.achievements,
            dailyChallenges: this.dailyChallenges,
            soundManager: this.soundManager,
            gamble: this.gamble,
            autoCollectEnabledRef: () => this.autoCollectEnabled,
            state: this.state,
            ui: this.uiFacade,
            spinHistory: this.spinHistory,
            cascade: this.cascade,
            gameConfig: GAME_CONFIG,
            spinExecutor: this,
            saveGameState: () => this.saveGameState?.(),
            dom: this.dom
        });

        // Maintain backward compatible UI reference
        this.ui = this.uiFacade;
        this.ui.applySymbolClasses = (symbol, text) => this.applySymbolClasses(symbol, text);

    }

    /**
     * Cache frequently accessed DOM elements for performance
     */
    cacheDOM() {
        this.dom = {
            // Display elements
            credits: document.getElementById('credits'),
            bet: document.getElementById('bet'),
            betDisplay: document.getElementById('betDisplay'),
            win: document.getElementById('win'),

            // Control elements
            spinBtn: document.getElementById('spinBtn'),
            increaseBet: document.getElementById('increaseBet'),
            decreaseBet: document.getElementById('decreaseBet'),
            maxBet: document.getElementById('maxBet'),

            // Overlay elements
            winOverlay: document.getElementById('winOverlay'),
            featureOverlay: document.getElementById('featureOverlay'),

            // Modal elements
            paytableModal: document.getElementById('paytableModal'),
            statsModal: document.getElementById('statsModal'),
            statsContentArea: document.getElementById('statsContentArea'),
            statsTabs: Array.from(document.querySelectorAll('.stats-tab')),
            paytableBtn: document.getElementById('paytableBtn'),
            closePaytable: document.getElementById('closePaytable'),
            statsBtn: document.getElementById('statsBtn'),
            closeStats: document.getElementById('closeStats'),
            historyBtn: document.getElementById('historyBtn'),
            closeHistory: document.getElementById('closeHistory'),

            // Containers
            gameContainer: document.querySelector('.game-container'),
            slotMachineContainer: document.querySelector('.slot-machine'),
            paylines: Array.from(document.querySelectorAll('.payline')),
            freeSpinsCounter: document.getElementById('freeSpinsCounter'),

            // Advanced controls
            autoplayBtn: document.getElementById('autoplayBtn'),
            turboBtn: document.getElementById('turboBtn'),
            autoCollectBtn: document.getElementById('autoCollectBtn'),
            autoplayCounter: document.getElementById('autoplayCounter'),

            // Reel containers (cache these for frequent access)
            reels: [
                document.getElementById('reel-0'),
                document.getElementById('reel-1'),
                document.getElementById('reel-2'),
                document.getElementById('reel-3'),
                document.getElementById('reel-4')
            ]
        };
    }

    createReels() {
        this.ui.createReels(
            this.reelCount,
            this.symbolsPerReel,
            this.rowCount,
            this.reelStrips,
            this.state,
            (symbol, text) => this.applySymbolClasses(symbol, text),
            RNG
        );
    }

    updateDisplay() {
        this.ui.updateDisplay(this.state.getCredits(), this.state.getCurrentBet(), this.state.getLastWin());
    }

    /**
     * Update auto collect toggle UI
     */
    updateAutoCollectUI() {
        this.ui.updateAutoCollectUI(this.autoCollectEnabled);
    }

    /**
     * Spin reels with optional anticipation effects
     * @param {Object} reelData - Data from prepareReelResults()
     * @param {number[]} reelData.reelPositions - Predetermined positions for each reel
     * @param {boolean} reelData.shouldTriggerAnticipation - Whether to apply anticipation effects
     * @param {Object} reelData.anticipationConfig - Anticipation configuration data
     * @param {number} reelData.anticipationTriggerReel - Reel where anticipation triggers
     * @returns {Promise<void>}
     */
    async executeReelSpin(reelData) {
        return this.spinEngine.executeReelSpin(reelData);
    }

    /**
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
     * Phase 5: Offer gamble feature after win
     */
    async offerGamble(winAmount) {
        return new Promise(async (resolve) => {
            if (this.autoCollectEnabled) {
                this.soundManager.playClick();
                resolve(winAmount);
                return;
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
                resolve(winAmount);
                return;
            }

            let autoCollectTimer = null;

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
            autoCollectTimer = this.timerManager.setInterval(() => {
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
            }, 1000, 'gamble-offer');

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

    /**
     * Evaluate wins without displaying (used by cascade feature)
     * @param {Array<Array<string>>} result - 2D array of reel symbols
     * @returns {Promise<Object>} Win information from PaylineEvaluator
     */
    async evaluateWinsWithoutDisplay(result) {
        return this.spinEngine.evaluateWinsWithoutDisplay(result);
    }

    updateCreditsAndStats(totalWin) {
        return this.spinEngine.updateCreditsAndStats(totalWin);
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
        return this.spinEngine.spinReel(reelIndex, duration, predeterminedPosition, predeterminedSymbols);
    }

    /**
     * Get current symbols visible on all reels
     * @returns {Array<Array<string>>} 2D array of symbols [reel][row]
     */
    getReelResult() {
        return this.spinEngine.getReelResult();
    }

    /**
     * Highlight symbols that are part of winning combinations
     * @param {Set<string>} winningPositions - Set of position strings (e.g., "0-1", "2-3")
     */
    highlightWinningSymbols(winningPositions) {
        this.ui.highlightWinningSymbols(winningPositions);
    }

    clearWinningSymbols() {
        this.ui.clearWinningSymbols();
    }

    /**
     * Phase 5: Apply special CSS classes to symbols based on their type
     */
    applySymbolClasses(symbolElement, symbolText) {
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

    showWinningPaylines(winningLines) {
        this.ui.showWinningPaylines(winningLines);
    }

    hidePaylines() {
        this.ui.hidePaylines();
    }

    showMessage(message, winAmount = 0) {
        return this.ui.showMessage(message, winAmount);
    }

    /**
     * Phase 5: Animate win counter from 0 to final amount
     */
    animateWinCounter(overlay, finalAmount, baseMessage) {
        return this.ui.animateWinCounter(overlay, finalAmount, baseMessage);
    }

    togglePaytable(show) {
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
    async showLevelUpMessage(level, reward) {
        let rewardText = '';
        if (reward) {
            rewardText = `<p class="level-reward">+${reward.credits} Credits</p>`;
            if (reward.type === 'feature') {
                rewardText += `<p class="level-unlock">✨ ${reward.value.toUpperCase()} UNLOCKED!</p>`;
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

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.animations.levelUpMessage));
        this.ui.hideFeatureOverlay();
    }

    /**
     * Phase 3: Toggle statistics dashboard
     */
    toggleStats() {
        const shouldShow = !this.state.select('ui.statsOpen');

        if (shouldShow) {
            this.currentStatsTab = 'session';
            this.updateStatsDisplay('session');
        }

        this.state.update('ui.statsOpen', shouldShow);
        this.ui.toggleStatsModal(shouldShow);
    }

    /**
     * Phase 3: Update statistics display with tabs
     */
    updateStatsDisplay(tab = 'session') {
        // Update active tab
        this.ui.setActiveStatsTab(tab);

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
                this.ui.renderStatsContent(html);
                this.dailyChallenges.updateChallengesUI();
                return;
        }

        this.ui.renderStatsContent(html);
    }

    /**
     * Phase 5: Trigger screen shake effect for mega wins
     */
    triggerScreenShake() {
        if (this.dom.gameContainer) {
            this.dom.gameContainer.classList.add('screen-shake');

            this.timerManager.setTimeout(() => {
                this.dom.gameContainer.classList.remove('screen-shake');
            }, GAME_CONFIG.animations.screenShake, 'visual-effects');
        }

        this.ui.triggerScreenShake();
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
     * Fully dispose of timer resources to prevent leaks during teardown.
     */
    dispose() {
        this.cleanupTimers();
        this.timerManager.dispose();
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
