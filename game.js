// Main entry point for Greedy Squirrel slot machine
// Features: Free Spins, Bonus Game, Cascading Wins, Progression System
import { SlotMachine } from './src/core/SlotMachine.js';
import { GAME_EVENTS } from './src/core/EventBus.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new SlotMachine();

    // Expose to window for debugging (optional)
    window.game = game;

    const cleanupTimers = () => game.cleanupTimers();

    window.addEventListener('beforeunload', () => {
        cleanupTimers();
    });

    // Example: Subscribe to game events for debugging/analytics
    if (window.location.search.includes('debug')) {
        game.events.on(GAME_EVENTS.WIN, (data) => {
            console.log('🎰 WIN:', data.amount, `(${data.multiplier.toFixed(1)}x)`);
        });

        game.events.on(GAME_EVENTS.BIG_WIN, (data) => {
            console.log('💰 BIG WIN!', data.amount, `(${data.multiplier.toFixed(1)}x)`);
        });

        game.events.on(GAME_EVENTS.MEGA_WIN, (data) => {
            console.log('🔥 MEGA WIN!!!', data.amount, `(${data.multiplier.toFixed(1)}x)`);
        });
    }

    console.log('🐿️ Greedy Squirrel - Game Loaded');
    console.log('Features: FREE SPINS (3+ scatters), BONUS GAME (3+ bonus symbols), Cascading Wins (optional)');
    console.log('Core: WILD symbols, SCATTER pays, Weighted RNG, Auto-save');
    console.log('');
    console.log('💡 Tips:');
    console.log('- Hit 3+ ⭐ SCATTER for Free Spins with multipliers!');
    console.log('- Hit 3+ 🎁 BONUS on payline for Pick-Me game!');
    console.log('- Enable cascades: window.game.cascade.setEnabled(true)');
    console.log('- Check stats: window.game.stats');
    console.log('- Enable debug mode: Add ?debug=true to URL');
    console.log('- Access EventBus: window.game.events');

    if (game.debugMode) {
        console.log('\n🔧 DEBUG MODE ENABLED');
        console.log('Force next spin result with:');
        console.log('  game.debugNextSpin = [[\'⭐\',\'⭐\',\'⭐\'], [\'⭐\',\'⭐\',\'⭐\'], [\'⭐\',\'⭐\',\'⭐\'], [\'🌰\',\'🌰\',\'🌰\'], [\'🌰\',\'🌰\',\'🌰\']]');
        console.log('\nSymbols: 🃏 (wild), ⭐ (scatter), 🎁 (bonus), 👑, 💎, 🌰, 🥜, 🌻, 🍄, 🌲, 🍂');
    }
});
