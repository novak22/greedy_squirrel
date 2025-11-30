/**
 * ServiceRegistry - Centralized service registration for DI container
 *
 * Defines all game services and their dependencies in one place.
 * This makes the dependency graph explicit and maintainable.
 */

import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';
import { getSymbolsForReel, SYMBOLS, getSymbolByEmoji } from '../config/symbols.js';

import { RNG } from '../utils/RNG.js';
import { EventBus } from './EventBus.js';
import { StateManager, createInitialState } from './StateManager.js';
import { GameState } from './GameState.js';
import { PaylineEvaluator } from './PaylineEvaluator.js';

import { TimerManager } from '../utils/TimerManager.js';
import { Metrics } from '../utils/Metrics.js';
import { ErrorHandler } from './ErrorHandler.js';

import { FreeSpins } from '../features/FreeSpins.js';
import { BonusGame } from '../features/BonusGame.js';
import { Cascade } from '../features/Cascade.js';
import { Autoplay } from '../features/Autoplay.js';
import { TurboMode } from '../features/TurboMode.js';
import { Gamble } from '../features/Gamble.js';
import { BuyBonus } from '../features/BuyBonus.js';
import { WinAnticipation } from '../features/WinAnticipation.js';

import { LevelSystem } from '../progression/LevelSystem.js';
import { Achievements } from '../progression/Achievements.js';
import { DailyChallenges } from '../progression/DailyChallenges.js';
import { Statistics } from '../progression/Statistics.js';

import { SoundManager } from '../audio/SoundManager.js';
import { VisualEffects } from '../effects/VisualEffects.js';
import { Settings } from '../ui/Settings.js';
import { SpinHistory } from '../ui/SpinHistory.js';
import { CascadeRenderer } from '../ui/renderers/CascadeRenderer.js';
import { BonusGameRenderer } from '../ui/renderers/BonusGameRenderer.js';
import { FreeSpinsRenderer } from '../ui/renderers/FreeSpinsRenderer.js';

/**
 * Register all game services with the DI container
 * @param {DIContainer} container - DI container instance
 */
export function registerServices(container) {
    // ============================================
    // Configuration & Constants
    // ============================================
    container.value('gameConfig', GAME_CONFIG);
    container.value('featuresConfig', FEATURES_CONFIG);

    // Debug mode (check if window exists for Node.js compatibility)
    const debugMode =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('debug') === 'true'
            : false;
    container.value('debugMode', debugMode);

    // ============================================
    // Core Engine
    // ============================================
    container.singleton('timerManager', TimerManager);
    container.singleton('eventBus', EventBus);

    container.factory('stateManager', () => {
        return new StateManager(createInitialState());
    });

    container.singleton('gameState', GameState, ['stateManager']);

    container.factory('rng', () => {
        return RNG.create(getSymbolsForReel);
    });

    // ============================================
    // Game State & Configuration
    // ============================================
    container.factory('reelStrips', (c) => {
        const rng = c.resolve('rng');
        const { reelCount, symbolsPerReel } = c.resolve('gameConfig');
        const strips = [];
        for (let i = 0; i < reelCount; i++) {
            strips.push(rng.generateReelStrip(i, symbolsPerReel));
        }
        return strips;
    });

    container.factory('paylineEvaluator', (c) => {
        return new PaylineEvaluator({
            symbols: SYMBOLS,
            symbolHelpers: { getSymbolByEmoji },
            paylines: c.resolve('gameConfig').paylines,
            reelCount: c.resolve('gameConfig').reelCount,
            metrics: c.resolve('metrics')
        });
    });

    // ============================================
    // Features
    // ============================================
    // FreeSpins with DI - needs renderer
    container.factory('freeSpins', (c) => {
        return new FreeSpins({
            renderer: c.resolve('freeSpinsRenderer')
        });
    });

    // BonusGame with DI - needs renderer
    container.factory('bonusGame', (c) => {
        return new BonusGame({
            renderer: c.resolve('bonusGameRenderer')
        });
    });

    // Cascade with DI - needs renderer, rng, reelStrips, symbolsPerReel, paylineEvaluator, statistics, eventBus
    container.factory('cascade', (c) => {
        const paylineEvaluator = c.resolve('paylineEvaluator');
        const gameState = c.resolve('gameState');
        const gameConfig = c.resolve('gameConfig');
        const getReelResult = () => {
            const dom = c.resolve('dom');
            const reels = dom.reels || [];
            const result = [];

            for (let i = 0; i < gameConfig.reelCount; i++) {
                const reel = reels[i];
                const symbols = reel?.querySelectorAll ? reel.querySelectorAll('.symbol') : [];
                const reelSymbols = [];

                for (let j = 0; j < gameConfig.rowCount; j++) {
                    reelSymbols.push(symbols[j]?.textContent ?? '');
                }

                result.push(reelSymbols);
            }

            return result;
        };

        return new Cascade({
            renderer: c.resolve('cascadeRenderer'),
            rng: c.resolve('rng'),
            reelStrips: c.resolve('reelStrips'),
            symbolsPerReel: gameConfig.symbolsPerReel,
            paylineEvaluator,
            statistics: c.resolve('statistics'),
            eventBus: c.resolve('eventBus'),
            getReelResult,
            evaluateWinsWithoutDisplay: (result, evaluator) =>
                evaluator.evaluateWins(result, gameState.getCurrentBet())
        });
    });

    // Gamble with DI - needs soundManager
    container.factory('gamble', (c) => {
        return new Gamble({
            soundManager: c.resolve('soundManager')
        });
    });

    // WinAnticipation with DI - needs timerManager, soundManager
    container.factory('winAnticipation', (c) => {
        return new WinAnticipation({
            timerManager: c.resolve('timerManager'),
            soundManager: c.resolve('soundManager')
        });
    });

    // Autoplay with DI - needs timerManager, gameState, eventBus, turboMode, freeSpins
    container.factory('autoplay', (c) => {
        return new Autoplay({
            timerManager: c.resolve('timerManager'),
            gameState: c.resolve('gameState'),
            eventBus: c.resolve('eventBus'),
            turboMode: c.resolve('turboMode'),
            freeSpins: c.resolve('freeSpins')
        });
    });

    // TurboMode with DI - needs eventBus and dom
    container.factory('turboMode', (c) => {
        return new TurboMode({
            eventBus: c.resolve('eventBus'),
            dom: c.resolve('dom')
        });
    });

    // BuyBonus with DI - needs gameState, soundManager, statistics, bonusGame, levelSystem, eventBus
    container.factory('buyBonus', (c) => {
        return new BuyBonus({
            gameState: c.resolve('gameState'),
            soundManager: c.resolve('soundManager'),
            statistics: c.resolve('statistics'),
            bonusGame: c.resolve('bonusGame'),
            levelSystem: c.resolve('levelSystem'),
            eventBus: c.resolve('eventBus')
        });
    });

    // ============================================
    // Progression Systems
    // ============================================
    container.factory('levelSystem', () => {
        return new LevelSystem(null); // Will be injected later
    });

    container.factory('achievements', () => {
        return new Achievements(null); // Will be injected later
    });

    container.factory('dailyChallenges', () => {
        return new DailyChallenges(null); // Will be injected later
    });

    container.factory('statistics', () => {
        return new Statistics(null); // Will be injected later
    });

    // ============================================
    // UI & Presentation
    // ============================================
    container.singleton('soundManager', SoundManager);

    container.factory('visualEffects', () => {
        return new VisualEffects(null); // Will be injected later
    });

    container.factory('settings', () => {
        return new Settings(null); // Will be injected later
    });

    container.factory('cascadeRenderer', (c) => {
        return new CascadeRenderer(c.resolve('dom'));
    });

    container.factory('bonusGameRenderer', () => {
        return new BonusGameRenderer();
    });

    container.factory('freeSpinsRenderer', () => {
        return new FreeSpinsRenderer();
    });

    container.factory('spinHistory', (c) => {
        const { spinHistory } = c.resolve('featuresConfig');
        return new SpinHistory(spinHistory.maxEntries);
    });

    // ============================================
    // Utilities & Helpers
    // ============================================
    container.value('metrics', Metrics);

    container.factory('errorHandler', () => {
        // ErrorHandler is static, but we can initialize it
        return ErrorHandler;
    });

    // ============================================
    // Subsystems (will be implemented after refactor)
    // ============================================
    // These require the full game context, so we'll refactor them
    // to accept individual dependencies instead of 'this'

    container.value('dom', {}); // DOM cache, populated during init

    // UIFacade will be registered after DOM is ready
    // SpinEngine will be registered after dependencies are ready
    // FeatureManager will be registered after dependencies are ready
    // UIController will be registered after dependencies are ready
}

/**
 * Create configured DI container for the game
 * @returns {DIContainer}
 */
export async function createConfiguredContainer() {
    const { DIContainer } = await import('./DIContainer.js');
    const container = new DIContainer();
    registerServices(container);
    return container;
}
