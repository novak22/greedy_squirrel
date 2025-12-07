// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import type { RNG } from '../utils/RNG.js';
import type { EventBus } from './EventBus.js';
import type { StateManager } from './StateManager.js';
import type { GameState } from './GameState.js';
import type { FreeSpins } from '../features/FreeSpins.js';
import type { BonusGame } from '../features/BonusGame.js';
import type { Cascade } from '../features/Cascade.js';
import type { LevelSystem } from '../progression/LevelSystem.js';
import type { Achievements } from '../progression/Achievements.js';
import type { DailyChallenges } from '../progression/DailyChallenges.js';
import type { Statistics } from '../progression/Statistics.js';
import type { Autoplay } from '../features/Autoplay.js';
import type { TurboMode } from '../features/TurboMode.js';
import type { VisualEffects } from '../effects/VisualEffects.js';
import type { SoundManager } from '../audio/SoundManager.js';
import type { Settings } from '../ui/Settings.js';
import type { SpinHistory } from '../ui/SpinHistory.js';
import type { Gamble } from '../features/Gamble.js';
import type { BuyBonus } from '../features/BuyBonus.js';
import type { WinAnticipation } from '../features/WinAnticipation.js';
import type { TimerManager } from '../utils/TimerManager.js';
import type { ErrorHandler } from './ErrorHandler.js';
import type { SpinEngine } from './SpinEngine.js';
import type { FeatureManager } from './FeatureManager.js';
import type { UIFacade } from '../ui/UIFacade.js';
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

export type SlotMachineDependencies = {
    core: {
        timerManager: TimerManager;
        events: EventBus;
        stateManager: StateManager;
        state: GameState;
        rng: RNG;
    };
    config: {
        gameConfig: GameConfig;
        featuresConfig: FeaturesConfig;
        metrics?: typeof Metrics;
        debugMode?: boolean;
    };
    dom?: Record<string, HTMLElement | null | undefined>;
    paylineEvaluator: unknown;
    reels: {
        reelStrips: string[][];
    };
    features: {
        freeSpins: FreeSpins;
        bonusGame: BonusGame;
        cascade: Cascade;
        levelSystem: LevelSystem;
        achievements: Achievements;
        dailyChallenges: DailyChallenges;
        statistics: Statistics;
        autoplay: Autoplay;
        turboMode: TurboMode;
        gamble: Gamble;
        buyBonus: BuyBonus;
        winAnticipation: WinAnticipation;
        spinHistory: SpinHistory;
    };
    ui: {
        uiFacade: UIFacade;
        spinEngine: SpinEngine;
        featureManager: FeatureManager;
    };
    utilities: {
        soundManager: SoundManager;
        visualEffects: VisualEffects;
        settings: Settings;
    };
    errorHandler?: ErrorHandler;
    autoCollectEnabled?: boolean;
};

export class SlotMachine {
    timerManager: TimerManager;
    events: EventBus;
    stateManager: StateManager;
    state: GameState;
    paylineEvaluator: unknown;
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
        core,
        config,
        dom = {},
        paylineEvaluator,
        reels,
        features,
        ui,
        utilities,
        errorHandler,
        autoCollectEnabled = false
    }: SlotMachineDependencies) {
        if (!paylineEvaluator) {
            throw new Error('SlotMachine requires a paylineEvaluator');
        }

        this.timerManager = core.timerManager;
        this.events = core.events;
        this.stateManager = core.stateManager;
        this.state = core.state;
        this.rng = core.rng;
        this.paylineEvaluator = paylineEvaluator;

        this.gameConfig = config.gameConfig as GameConfig;
        this.featuresConfig = config.featuresConfig as FeaturesConfig;
        this.metrics = config.metrics ?? Metrics;
        this.debugMode = Boolean(config.debugMode);

        this.reelCount = this.gameConfig.reelCount;
        this.rowCount = this.gameConfig.rowCount;
        this.symbolsPerReel = this.gameConfig.symbolsPerReel;
        this.betOptions = this.gameConfig.betOptions;
        this.reelStrips = reels.reelStrips;

        this.dom = dom as Record<string, HTMLElement | null | undefined>;

        this.freeSpins = features.freeSpins;
        this.bonusGame = features.bonusGame;
        this.cascade = features.cascade;
        this.levelSystem = features.levelSystem;
        this.achievements = features.achievements;
        this.dailyChallenges = features.dailyChallenges;
        this.statistics = features.statistics;
        this.autoplay = features.autoplay;
        this.turboMode = features.turboMode;
        this.gamble = features.gamble;
        this.buyBonus = features.buyBonus;
        this.winAnticipation = features.winAnticipation;
        this.spinHistory = features.spinHistory;

        this.soundManager = utilities.soundManager;
        this.visualEffects = utilities.visualEffects;
        this.settings = utilities.settings;

        this.uiFacade = ui.uiFacade;
        this.spinEngine = ui.spinEngine;
        this.featureManager = ui.featureManager;

        this.autoCollectEnabled = Boolean(autoCollectEnabled);
        this.debugNextSpin = null;
        this.winCounterInterval = null;

        this.initializeMetricsHook();

        errorHandler?.init?.({
            showMessage: (message: string) => this.showMessage(message)
        });

        // Maintain backward compatible UI reference
        this.ui = this.uiFacade as UIFacade & {
            applySymbolClasses?: (symbol: any, text: string) => void;
        };
        this.ui.applySymbolClasses = (symbol: any, text: string) =>
            this.applySymbolClasses(symbol, text);

        this.initializeGame();
    }

    initializeMetricsHook(): void {
        if (typeof window !== 'undefined' && typeof window.__GS_METRICS_HOOK__ === 'function') {
            this.metrics.setReporter?.(window.__GS_METRICS_HOOK__);
        }
    }

    initializeGame(): void {
        this.state.setCredits(this.gameConfig.initialCredits);
        this.state.setCurrentBet(this.gameConfig.betOptions[0]);
        this.state.setCurrentBetIndex(0);
        this.state.setLastWin(0);
        this.state.setSpinning(false);
        this.state.setReelPositions(new Array(this.reelCount).fill(0));
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
