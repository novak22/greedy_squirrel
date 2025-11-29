// Main entry point for Greedy Squirrel slot machine
// Phase 2: Bonus Features (Free Spins, Bonus Game, Cascading Wins)
import { SlotMachine } from './src/core/SlotMachine.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new SlotMachine();

    // Expose to window for debugging (optional)
    window.game = game;

    console.log('🐿️ Greedy Squirrel - Phase 2 Loaded');
    console.log('Features: FREE SPINS (3+ scatters), BONUS GAME (3+ bonus symbols), Cascading Wins (optional)');
    console.log('Phase 1: WILD symbols, SCATTER pays, Weighted RNG, Auto-save');
    console.log('');
    console.log('💡 Tips:');
    console.log('- Hit 3+ ⭐ SCATTER for Free Spins with multipliers!');
    console.log('- Hit 3+ 🎁 BONUS on payline for Pick-Me game!');
    console.log('- Enable cascades: window.game.cascade.setEnabled(true)');
    console.log('- Check stats: window.game.stats');
});
