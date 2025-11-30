// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import { getSymbolsForReel } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { RNG } from '../../SlotMachineEngine/src/utils/RNG.js';
import { EventBus } from '../../SlotMachineEngine/src/core/EventBus.js';
import { StateManager, createInitialState } from '../../SlotMachineEngine/src/core/StateManager.js';
import { GameState } from '../../SlotMachineEngine/src/core/GameState.js';
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
import { ErrorHandler } from './ErrorHandler.js';
import { SpinEngine } from './SpinEngine.js';
import { FeatureManager } from './FeatureManager.js';
import { UIFacade } from '../ui/UIFacade.js';
import { Metrics } from '../utils/Metrics.js';

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

        // Initialize RNG with symbol configuration
        this.rng = RNG.create(getSymbolsForReel);

        // Reel strips (generated once with weighted symbols)
        this.reelStrips = [];
        for (let i = 0; i < this.reelCount; i++) {
            this.reelStrips.push(this.rng.generateReelStrip(i, this.symbolsPerReel));
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

        // Metrics instrumentation (optional dashboard hook via window.__GS_METRICS_HOOK__)
        this.metrics = Metrics;
        if (typeof window !== 'undefined' && typeof window.__GS_METRICS_HOOK__ === 'function') {
            Metrics.setReporter(window.__GS_METRICS_HOOK__);
        }

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
            triggerScreenShake: () => this.triggerScreenShake(),
            metrics: this.metrics,
            rng: this.rng
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
     * Evaluate wins without displaying (used by cascade feature)
     * @param {Array<Array<string>>} result - 2D array of reel symbols
     * @param {PaylineEvaluator} paylineEvaluator - PaylineEvaluator instance
     * @returns {Promise<Object>} Win information from PaylineEvaluator
     */
    async evaluateWinsWithoutDisplay(result, paylineEvaluator) {
        return this.spinEngine.evaluateWinsWithoutDisplay(result, paylineEvaluator);
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
        return this.spinEngine.spinReel(
            reelIndex,
            duration,
            predeterminedPosition,
            predeterminedSymbols
        );
    }

    /**
     * Get current symbols visible on all reels
     * @returns {Array<Array<string>>} 2D array of symbols [reel][row]
     */
    getReelResult() {
        return this.spinEngine.getReelResult();
    }
}
