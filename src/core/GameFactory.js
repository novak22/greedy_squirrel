/**
 * GameFactory - Creates game instance with Dependency Injection
 *
 * This factory demonstrates how to initialize the game using the DI container.
 * It serves as a bridge between the old manual wiring and new DI approach.
 *
 * Usage:
 *   import { GameFactory } from './core/GameFactory.js';
 *   const game = await GameFactory.create();
 */

import { createConfiguredContainer } from './ServiceRegistry.js';
import { UIFacade } from '../ui/UIFacade.js';
import { SpinEngine } from './SpinEngine.js';
import { FeatureManager } from './FeatureManager.js';

export class GameFactory {
    /**
     * Create a new game instance using DI container
     * @returns {Promise<GameOrchestrator>} Game instance
     */
    static async create() {
        const container = await createConfiguredContainer();

        // Create DOM cache (needed before resolving services)
        const dom = GameFactory.createDOMCache();
        container.value('dom', dom);

        // Resolve dependencies from the configured container
        const gameConfig = container.resolve('gameConfig');
        const featuresConfig = container.resolve('featuresConfig');
        const timerManager = container.resolve('timerManager');
        const events = container.resolve('eventBus');
        const stateManager = container.resolve('stateManager');
        const state = container.resolve('gameState');
        const rng = container.resolve('rng');
        const paylineEvaluator = container.resolve('paylineEvaluator');
        const reelStrips = container.resolve('reelStrips');
        const metrics = container.resolve('metrics');
        const debugMode = container.resolve('debugMode');
        const errorHandler = container.resolve('errorHandler');
        const autoCollectState = container.resolve('autoCollectState');

        const freeSpins = container.resolve('freeSpins');
        const bonusGame = container.resolve('bonusGame');
        const cascade = container.resolve('cascade');
        const levelSystem = container.resolve('levelSystem');
        const achievements = container.resolve('achievements');
        const dailyChallenges = container.resolve('dailyChallenges');
        const statistics = container.resolve('statistics');
        const turboMode = container.resolve('turboMode');
        const winAnticipation = container.resolve('winAnticipation');
        const autoplay = container.resolve('autoplay');
        const gamble = container.resolve('gamble');
        const buyBonus = container.resolve('buyBonus');
        const spinHistory = container.resolve('spinHistory');

        const soundManager = container.resolve('soundManager');
        const visualEffects = container.resolve('visualEffects');
        const settings = container.resolve('settings');

        const uiFacade = new UIFacade(dom, timerManager, turboMode);

        let gameInstance = null;

        const spinEngine = new SpinEngine({
            reelCount: gameConfig.reelCount,
            rowCount: gameConfig.rowCount,
            symbolsPerReel: gameConfig.symbolsPerReel,
            reelStrips,
            turboMode,
            timerManager,
            state,
            dom,
            soundManager,
            winAnticipation,
            events,
            cascade,
            freeSpins,
            statistics,
            dailyChallenges,
            levelSystem,
            visualEffects,
            ui: uiFacade,
            triggerScreenShake: () => gameInstance?.triggerScreenShake?.(),
            metrics,
            rng
        });

        const featureManager = new FeatureManager({
            freeSpins,
            bonusGame,
            statistics,
            levelSystem,
            achievements,
            dailyChallenges,
            soundManager,
            gamble,
            autoCollectEnabledRef: () => gameInstance?.autoCollectEnabled ?? autoCollectState.enabled,
            state,
            ui: uiFacade,
            spinHistory,
            cascade,
            gameConfig,
            spinExecutor: {
                offerGamble: (amount) => gameInstance?.offerGamble(amount) ?? amount
            },
            saveGameState: () => gameInstance?.saveGameState?.(),
            dom
        });

        const orchestratorModule =
            (await GameFactory.safeImport('./GameOrchestrator.js')) ||
            (await GameFactory.safeImport('./GameOrchestrator.ts'));

        if (!orchestratorModule?.GameOrchestrator) {
            throw new Error('GameOrchestrator module could not be loaded.');
        }

        const game = new orchestratorModule.GameOrchestrator({
            core: { timerManager, events, stateManager, state, rng },
            config: { gameConfig, featuresConfig, metrics, debugMode },
            dom,
            paylineEvaluator,
            reels: { reelStrips },
            features: {
                freeSpins,
                bonusGame,
                cascade,
                levelSystem,
                achievements,
                dailyChallenges,
                statistics,
                autoplay,
                turboMode,
                gamble,
                buyBonus,
                winAnticipation,
                spinHistory
            },
            ui: { uiFacade, spinEngine, featureManager },
            utilities: { soundManager, visualEffects, settings },
            errorHandler,
            autoCollectEnabled: autoCollectState.enabled
        });

        gameInstance = game;

        return game;
    }

    /**
     * Create DOM element cache
     * @returns {Object} DOM element references
     */
    static createDOMCache() {
        return {
            spinBtn: document.getElementById('spin-btn'),
            betUpBtn: document.getElementById('bet-up'),
            betDownBtn: document.getElementById('bet-down'),
            maxBetBtn: document.getElementById('max-bet'),
            credits: document.getElementById('credits'),
            currentBet: document.getElementById('current-bet'),
            lastWin: document.getElementById('last-win'),
            winMessage: document.getElementById('win-message'),
            messageContainer: document.getElementById('message-container'),
            reels: document.querySelectorAll('.reel'),
            paytableBtn: document.getElementById('paytable-btn'),
            paytableModal: document.getElementById('paytable-modal'),
            closePaytable: document.getElementById('close-paytable'),
            autoplayBtn: document.getElementById('autoplay-btn'),
            turboBtn: document.getElementById('turbo-btn'),
            autoCollectBtn: document.getElementById('auto-collect-btn'),
            historyBtn: document.getElementById('history-btn'),
            closeHistory: document.getElementById('close-history'),
            settingsBtn: document.getElementById('settings-btn')
        };
    }

    /**
     * Create DI container with all services registered
     * Useful for testing
     * @returns {Promise<DIContainer>}
     */
    static async createContainer() {
        return createConfiguredContainer();
    }

    /**
     * Create game instance for testing with mocked dependencies
     * @param {Object} mocks - Mocked dependencies
     * @returns {Promise<{ container: DIContainer }>}
     */
    static async createForTesting(mocks = {}) {
        const container = await createConfiguredContainer();

        // Override with mocks
        Object.entries(mocks).forEach(([name, mock]) => {
            container.value(name, mock);
        });

        // Ensure DOM exists
        if (!container.has('dom') || !mocks.dom) {
            container.value('dom', mocks.dom || {});
        }

        return { container };
    }

    static async safeImport(specifier) {
        try {
            return await import(specifier);
        } catch (error) {
            console.warn(`Optional import failed for ${specifier}:`, error?.message ?? error);
            return null;
        }
    }
}
