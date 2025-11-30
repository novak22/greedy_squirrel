/**
 * SlotMachineEngine - Reusable Slot Machine Game Engine
 *
 * A lightweight, configurable slot machine engine that provides:
 * - State management with observers
 * - Event bus for decoupled communication
 * - Payline evaluation with wild/scatter support
 * - Weighted RNG for symbol generation
 */

export { StateManager, createInitialState } from './core/StateManager.js';
export { GameState } from './core/GameState.js';
export { EventBus, GAME_EVENTS } from './core/EventBus.js';
export { PaylineEvaluator } from './core/PaylineEvaluator.js';
export { RNG } from './utils/RNG.js';
