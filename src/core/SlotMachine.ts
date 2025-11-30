// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import { getSymbolsForReel } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { RNG } from '../utils/RNG.js';
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
import { ErrorHandler } from './ErrorHandler.js';
import { SpinEngine } from './SpinEngine.js';
import { FeatureManager } from './FeatureManager.js';
import { UIFacade } from '../ui/UIFacade.js';
import { Metrics } from '../utils/Metrics.js';
import type { FeaturesConfig, GameConfig } from '../types/config.js';

declare global {
    interface Window {
        __GS_METRICS_HOOK__?: (...args: unknown[]) => void;
    }
}

type ReelData = {
    reelPositions: number[];
    shouldTriggerAnticipation: boolean;
    anticipationConfig: Record<string, unknown> | null;
    anticipationTriggerReel: number;
};

type WinInfo = {
    totalWin: number;
    winningPositions: Set<string>;
    winningLines: number[];
    hasScatterWin: boolean;
    scatterCount: number;
};

type SpinEngineOptions = Record<string, any>;

type FeatureManagerOptions = Record<string, any>;

export class SlotMachine {
    timerManager: TimerManager;
    events: EventBus;
    stateManager: StateManager;
    state: GameState;
    reelCount: number;
    rowCount: number;
    symbolsPerReel: number;
    betOptions: GameConfig['betOptions'];
    rng: RNG;
    reelStrips: string[][];
    freeSpins: FreeSpins;
    bonusGame: BonusGame;
    cascade: Cascade;
    levelSystem: LevelSystem;
    achievements: Achievements;
    dailyChallenges: DailyChallenges;
    statistics: Statistics;
    soundManager: SoundManager;
    visualEffects: VisualEffects;
    autoplay: Autoplay;
    turboMode: TurboMode;
    settings: Settings;
    autoCollectEnabled: boolean;
    debugMode: boolean;
    debugNextSpin: string[][] | null;
    metrics: typeof Metrics;
    winCounterInterval: ReturnType<typeof setInterval> | null;
    spinHistory: SpinHistory;
    gamble: Gamble;
    buyBonus: BuyBonus;
    winAnticipation: WinAnticipation;
    dom: Record<string, HTMLElement | null | undefined>;
    uiFacade: UIFacade;
    ui: UIFacade & { applySymbolClasses?: (symbol: any, text: string) => void };
    spinEngine: SpinEngine;
    featureManager: FeatureManager;
    gameConfig: GameConfig;
    featuresConfig: FeaturesConfig;

    // Overridden by orchestrator implementations
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showMessage(_message: string, _winAmount?: number): unknown {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applySymbolClasses(_symbolElement: HTMLElement, _symbolText: string): void {}

    triggerScreenShake(): void {}

    saveGameState?(): void;

    constructor({
        dom = {},
        paylineEvaluator,
        cascadeRenderer,
        bonusGameRenderer,
        freeSpinsRenderer
    }: {
        dom?: Record<string, unknown>;
        paylineEvaluator: unknown;
        cascadeRenderer: unknown;
        bonusGameRenderer: unknown;
        freeSpinsRenderer: unknown;
    } = {}) {
        // Core systems
        this.timerManager = new TimerManager();
        this.events = new EventBus();
        this.stateManager = new StateManager(createInitialState());
        this.state = new GameState(this.stateManager);

        // Game configuration
        this.gameConfig = GAME_CONFIG as GameConfig;
        this.featuresConfig = FEATURES_CONFIG as FeaturesConfig;
        this.reelCount = this.gameConfig.reelCount;
        this.rowCount = this.gameConfig.rowCount;
        this.symbolsPerReel = this.gameConfig.symbolsPerReel;
        this.betOptions = this.gameConfig.betOptions;

        // Initialize RNG with symbol configuration
        this.rng = RNG.create(getSymbolsForReel);

        // Reel strips (generated once with weighted symbols)
        this.reelStrips = [];
        for (let i = 0; i < this.reelCount; i++) {
            this.reelStrips.push(this.rng.generateReelStrip(i, this.symbolsPerReel));
        }

        // DOM element cache (populated in init)
        this.dom = dom;

        if (!paylineEvaluator) {
            throw new Error('SlotMachine requires a paylineEvaluator');
        }
        if (!cascadeRenderer || !bonusGameRenderer || !freeSpinsRenderer) {
            throw new Error('SlotMachine requires feature renderers');
        }

        this.paylineEvaluator = paylineEvaluator as any;

        // Game state is now managed by GameState wrapper
        // Initialize state with config defaults
        this.state.setCredits(this.gameConfig.initialCredits);
        this.state.setCurrentBet(this.gameConfig.betOptions[0]);
        this.state.setCurrentBetIndex(0);
        this.state.setLastWin(0);
        this.state.setSpinning(false);
        this.state.setReelPositions([0, 0, 0, 0, 0]);

        // Initialize progression systems
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyChallenges = new DailyChallenges(this);
        this.statistics = new Statistics(this);

        // Initialize bonus features
        this.freeSpins = new FreeSpins({ renderer: freeSpinsRenderer });
        this.bonusGame = new BonusGame({ renderer: bonusGameRenderer });
        this.cascade = new Cascade({
            renderer: cascadeRenderer,
            rng: this.rng,
            reelStrips: this.reelStrips,
            symbolsPerReel: this.symbolsPerReel,
            paylineEvaluator: this.paylineEvaluator,
            statistics: this.statistics,
            eventBus: this.events,
            getReelResult: () => this.getReelResult(),
            evaluateWinsWithoutDisplay: (result, evaluator) =>
                this.evaluateWinsWithoutDisplay?.(result, evaluator)
        });

        // Initialize advanced features
        this.soundManager = new SoundManager();
        this.visualEffects = new VisualEffects(this);
        this.turboMode = new TurboMode({ eventBus: this.events, dom: this.dom });
        this.autoplay = new Autoplay(
            {
                timerManager: this.timerManager,
                gameState: this.state,
                eventBus: this.events,
                turboMode: this.turboMode
            },
            undefined
        );
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
            showMessage: (message: string) => this.showMessage(message)
        });

        // Track active timers to avoid overlapping animations
        this.winCounterInterval = null;

        // Initialize gamble and history features
        this.spinHistory = new SpinHistory(this.featuresConfig.spinHistory.maxEntries);
        this.gamble = new Gamble(this);
        this.buyBonus = new BuyBonus(this);
        this.winAnticipation = new WinAnticipation(this);

        // Delegated subsystems
        this.uiFacade = new UIFacade(this.dom, this.timerManager, this.turboMode);
        const spinEngineOptions: SpinEngineOptions = {
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
        };

        this.spinEngine = new SpinEngine(spinEngineOptions as any);

        const featureManagerOptions: FeatureManagerOptions = {
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
            gameConfig: this.gameConfig,
            spinExecutor: this,
            saveGameState: () => this.saveGameState?.(),
            dom: this.dom
        };

        this.featureManager = new FeatureManager(featureManagerOptions as any);

        // Maintain backward compatible UI reference
        this.ui = this.uiFacade as UIFacade & {
            applySymbolClasses?: (symbol: any, text: string) => void;
        };
        this.ui.applySymbolClasses = (symbol: any, text: string) =>
            this.applySymbolClasses(symbol, text);
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
    async executeReelSpin(reelData: ReelData): Promise<void> {
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
    async processWins(winInfo: WinInfo, isFreeSpin: boolean): Promise<number> {
        return this.spinEngine.processWins(winInfo, isFreeSpin);
    }

    /**
     * Evaluate wins without displaying (used by cascade feature)
     * @param {Array<Array<string>>} result - 2D array of reel symbols
     * @param {PaylineEvaluator} paylineEvaluator - PaylineEvaluator instance
     * @returns {Promise<Object>} Win information from PaylineEvaluator
     */
    async evaluateWinsWithoutDisplay(result: string[][], paylineEvaluator: unknown): Promise<any> {
        return this.spinEngine.evaluateWinsWithoutDisplay(result, paylineEvaluator);
    }

    updateCreditsAndStats(totalWin: number) {
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
    spinReel(
        reelIndex: number,
        duration: number,
        predeterminedPosition: number | null = null,
        predeterminedSymbols: string[] | null = null
    ) {
        return this.spinEngine.spinReel(
            reelIndex,
            duration,
            predeterminedPosition as any,
            predeterminedSymbols as any
        );
    }

    /**
     * Get current symbols visible on all reels
     * @returns {Array<Array<string>>} 2D array of symbols [reel][row]
     */
    getReelResult(): string[][] {
        return this.spinEngine.getReelResult();
    }
}
