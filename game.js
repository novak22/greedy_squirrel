// Main entry point for Greedy Squirrel slot machine
// Phase 1: Enhanced with special symbols, weighted RNG, and persistence
import { SlotMachine } from './src/core/SlotMachine.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new SlotMachine();

    // Expose to window for debugging (optional)
    window.game = game;

    console.log('🐿️ Greedy Squirrel - Phase 1 Loaded');
    console.log('Features: WILD symbols, SCATTER pays, BONUS symbols, Weighted RNG, Auto-save');
});
