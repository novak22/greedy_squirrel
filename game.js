// Main entry point for Greedy Squirrel slot machine
// Features: Free Spins, Bonus Game, Cascading Wins, Progression System
import { GameOrchestrator } from './src/core/GameOrchestrator.js';
import { GAME_EVENTS } from './src/core/EventBus.js';
import { Logger } from './src/utils/Logger.js';
import { assertValidConfigs } from './src/config/validation.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize logger based on URL parameter
    const debugMode = window.location.search.includes('debug');
    Logger.init(debugMode);

    const configErrors = assertValidConfigs(Logger);
    if (configErrors.length) {
        const errorMessage =
            'Game configuration validation failed. Please contact support or refresh after fixing configuration issues.';
        Logger.error('Critical configuration errors prevent the game from starting.');

        const errorBanner = document.createElement('div');
        errorBanner.className = 'game-error-banner';
        errorBanner.setAttribute('role', 'alert');
        errorBanner.textContent = errorMessage;

        const mountPoint = document.querySelector('.game-container') || document.body;
        mountPoint.prepend(errorBanner);
        return;
    }

    const game = new GameOrchestrator();

    // Expose to window for debugging
    window.game = game;

    const disposeGame = () => {
        if (typeof game.dispose === 'function') {
            game.dispose();
        }
    };

    window.addEventListener('beforeunload', disposeGame);
    window.addEventListener('pagehide', disposeGame);

    // Subscribe to game events for debugging/analytics
    game.events.on(GAME_EVENTS.WIN, (data) => {
        Logger.debug('WIN:', data.amount, `(${data.multiplier.toFixed(1)}x)`);
    });

    game.events.on(GAME_EVENTS.BIG_WIN, (data) => {
        Logger.info('BIG WIN!', data.amount, `(${data.multiplier.toFixed(1)}x)`);
    });

    game.events.on(GAME_EVENTS.MEGA_WIN, (data) => {
        Logger.info('MEGA WIN!!!', data.amount, `(${data.multiplier.toFixed(1)}x)`);
    });

    // Welcome message (always shown)
    console.log('🐿️ Greedy Squirrel - Game Loaded');
    console.log(
        'Features: FREE SPINS (3+ scatters), BONUS GAME (3+ bonus symbols), Cascading Wins (optional)'
    );
    console.log('Core: WILD symbols, SCATTER pays, Weighted RNG, Auto-save');
    console.log('');
    console.log('💡 Tips:');
    console.log('- Hit 3+ ⭐ SCATTER for Free Spins with multipliers!');
    console.log('- Hit 3+ 🎁 BONUS on payline for Pick-Me game!');
    console.log('- Enable cascades: window.game.cascade.setEnabled(true)');
    console.log('- Check stats: window.game.statistics');
    console.log('- Enable debug mode: Add ?debug=true to URL');
    console.log('- Access EventBus: window.game.events');

    if (debugMode) {
        Logger.info('DEBUG MODE ENABLED');
        Logger.debug('Force next spin result with:');
        Logger.debug(
            "  game.debugNextSpin = [['⭐','⭐','⭐'], ['⭐','⭐','⭐'], ['⭐','⭐','⭐'], ['🌰','🌰','🌰'], ['🌰','🌰','🌰']]"
        );
        Logger.debug(
            'Symbols: 🃏 (wild), ⭐ (scatter), 🎁 (bonus), 👑, 💎, 🌰, 🥜, 🌻, 🍄, 🌲, 🍂'
        );
    }
});
