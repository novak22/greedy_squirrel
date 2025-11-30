# SlotMachineEngine

Reusable slot machine game engine extracted from Greedy Squirrel.

## Features

- **StateManager** - Observable state management with subscriptions
- **GameState** - Validated state wrapper for game properties (credits, bets, etc.)
- **EventBus** - Decoupled event system for game features
- **PaylineEvaluator** - Configurable win calculation with wild/scatter support
- **RNG** - Weighted random number generator for symbol distribution

## Usage

```javascript
import {
    StateManager,
    createInitialState,
    GameState,
    EventBus,
    PaylineEvaluator,
    RNG
} from './SlotMachineEngine/src/index.js';

// Initialize state management
const stateManager = new StateManager(createInitialState());
const gameState = new GameState(stateManager);

// Initialize event bus
const events = new EventBus();

// Initialize RNG with your symbol configuration
const rng = RNG.create((reelIndex) => {
    // Return available symbols for this reel
    return yourSymbolConfig.filter((s) => s.allowedReels.includes(reelIndex));
});

// Initialize payline evaluator
const paylineEvaluator = new PaylineEvaluator({
    symbols: yourSymbols,
    symbolHelpers: { getSymbolByEmoji: yourHelper },
    paylines: yourPaylines,
    reelCount: 5,
    metrics: optionalMetricsInstance
});

// Use the engine
gameState.setCredits(1000);
gameState.setCurrentBet(10);

const reelStrip = rng.generateReelStrip(0, 20);
const winInfo = paylineEvaluator.evaluateWins(reelResult, bet);
```

## Architecture

### StateManager

Observable state container with:

- Immutable updates
- Subscription system
- Batch updates
- Versioning

### GameState

Type-safe wrapper providing:

- Validated getters/setters
- Credits management
- Bet management
- Reel positions
- Checkpoint/restore

### EventBus

Pub/sub pattern for:

- Feature triggers
- Win events
- Game lifecycle events

### PaylineEvaluator

Configurable win logic:

- Wild substitution
- Scatter pays
- Bonus triggers
- Customizable via config

### RNG

Weighted random generation:

- Per-reel symbol configuration
- Reel strip generation
- Position selection

## Integration

This engine is **game-agnostic**. To use it:

1. Define your symbol configuration
2. Define your payline patterns
3. Implement UI/features on top of the core engine
4. Subscribe to state changes for UI updates

See `src/` in Greedy Squirrel for a complete implementation example.
