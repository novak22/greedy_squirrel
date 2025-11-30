/**
 * GameFactory - Creates game instance with Dependency Injection
 *
 * This factory demonstrates how to initialize the game using the DI container.
 * It serves as a bridge between the old manual wiring and new DI approach.
 *
 * Usage:
 *   import { GameFactory } from './core/GameFactory.js';
 *   const game = GameFactory.create();
 */

import { DIContainer } from './DIContainer.js';
import { registerServices } from './ServiceRegistry.js';
import { GameOrchestrator } from './GameOrchestrator.js';

export class GameFactory {
    /**
     * Create a new game instance using DI container
     * @param {Object} options - Configuration options
     * @param {boolean} options.useDI - Whether to use DI (default: false for backward compat)
     * @returns {GameOrchestrator} Game instance
     */
    static create(options = {}) {
        const { useDI = false } = options;

        if (!useDI) {
            // Old way: manual instantiation
            return new GameOrchestrator();
        }

        // New way: DI container
        const container = new DIContainer();
        registerServices(container);

        // Create DOM cache (needed before resolving services)
        const dom = GameFactory.createDOMCache();
        container.value('dom', dom);

        // Resolve migrated services
        const turboMode = container.resolve('turboMode');
        const autoplay = container.resolve('autoplay');

        // For now, create game with old pattern but inject DI-created services
        const game = new GameOrchestrator();

        // Replace old instances with DI-created ones
        game.turboMode = turboMode;
        game.autoplay = autoplay;

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
     * @returns {DIContainer}
     */
    static createContainer() {
        const container = new DIContainer();
        registerServices(container);
        return container;
    }

    /**
     * Create game instance for testing with mocked dependencies
     * @param {Object} mocks - Mocked dependencies
     * @returns {Object} { game, container }
     */
    static createForTesting(mocks = {}) {
        const container = new DIContainer();
        registerServices(container);

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
}
