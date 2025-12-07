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
        const paylineEvaluator = container.resolve('paylineEvaluator');
        const cascadeRenderer = container.resolve('cascadeRenderer');
        const bonusGameRenderer = container.resolve('bonusGameRenderer');
        const freeSpinsRenderer = container.resolve('freeSpinsRenderer');

        const orchestratorModule =
            (await GameFactory.safeImport('./GameOrchestrator.js')) ||
            (await GameFactory.safeImport('./GameOrchestrator.ts'));

        if (!orchestratorModule?.GameOrchestrator) {
            throw new Error('GameOrchestrator module could not be loaded.');
        }

        const game = new orchestratorModule.GameOrchestrator({
            dom,
            paylineEvaluator,
            cascadeRenderer,
            bonusGameRenderer,
            freeSpinsRenderer
        });

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
