# Dependency Injection Implementation

## Overview

Implemented a lightweight DI container to manage dependencies and improve testability.

**Status:** ✅ Infrastructure complete, ready for gradual migration

## What Was Built

### 1. DIContainer (`src/core/DIContainer.js`)
Lightweight container with:
- Singleton/transient lifecycles
- Auto-resolution of constructor dependencies
- Factory functions for complex initialization
- Circular dependency detection
- Scoped containers for testing

### 2. ServiceRegistry (`src/core/ServiceRegistry.js`)
Centralized registration of all game services:
- Core engine (StateManager, EventBus, GameState, RNG)
- Features (FreeSpins, BonusGame, Cascade, etc.)
- Progression (LevelSystem, Achievements, etc.)
- UI (UIController, SoundManager, etc.)

### 3. Example Refactored Feature
`TurboMode.refactored.js` shows the pattern:
- Before: Receives entire game instance
- After: Receives only `{ eventBus, dom }`

## Benefits

### Before DI
```javascript
class TurboMode {
    constructor(slotMachine) {
        this.game = slotMachine;  // Everything!
    }

    toggle() {
        this.game.showMessage('...');  // Tight coupling
    }
}

// Hard to test
const turboMode = new TurboMode(entireGameInstance);
```

**Problems:**
- Can't test without full game
- Unclear dependencies
- Circular reference risk
- Hard to mock

### After DI
```javascript
class TurboMode {
    constructor({ eventBus, dom }) {
        this.eventBus = eventBus;  // Only what it needs
        this.dom = dom;
    }

    toggle() {
        this.eventBus.emit('message:show', '...');  // Loose coupling
    }
}

// Easy to test
const turboMode = new TurboMode({
    eventBus: mockEventBus,
    dom: mockDom
});
```

**Benefits:**
- ✅ Testable in isolation
- ✅ Clear dependencies
- ✅ No circular references
- ✅ Easy mocking

## Usage

### Registering Services

```javascript
import { DIContainer } from './core/DIContainer.js';

const container = new DIContainer();

// Register singleton (created once)
container.singleton('eventBus', EventBus);

// Register with dependencies
container.singleton('gameState', GameState, ['stateManager']);

// Register factory
container.factory('rng', (c) => {
    return RNG.create(getSymbolsForReel);
});

// Register value directly
container.value('config', GAME_CONFIG);
```

### Resolving Services

```javascript
// Resolve service
const eventBus = container.resolve('eventBus');

// Auto-resolves dependencies
const gameState = container.resolve('gameState');
// gameState receives stateManager automatically
```

### Testing with DI

```javascript
// Create test container
const testContainer = new DIContainer();

// Register mocks
testContainer.value('eventBus', mockEventBus);
testContainer.value('dom', mockDom);

// Register service under test
testContainer.singleton('turboMode', TurboMode, ['eventBus', 'dom']);

// Resolve and test
const turboMode = testContainer.resolve('turboMode');
turboMode.toggle();

expect(mockEventBus.emit).toHaveBeenCalledWith('message:show', '...');
```

## Migration Strategy

### Phase 1: Infrastructure (✅ Complete)
- [x] DIContainer implementation
- [x] ServiceRegistry setup
- [x] Example refactored feature (TurboMode)

### Phase 2: Gradual Feature Migration
Refactor features one at a time:

1. **Simple features first:**
   - TurboMode ✅ (example done)
   - SoundManager
   - SpinHistory

2. **Medium complexity:**
   - Autoplay
   - Gamble
   - VisualEffects

3. **Complex features:**
   - FreeSpins
   - BonusGame
   - Cascade

### Phase 3: Core Refactor
After features are migrated:
- SlotMachine uses container
- GameOrchestrator uses container
- Remove manual dependency wiring

## Refactoring Pattern

### Step 1: Identify Dependencies
```javascript
// OLD: What does this class actually use?
class MyFeature {
    constructor(game) {
        this.game = game;
        // Uses: game.state, game.events, game.soundManager
    }
}
```

### Step 2: Extract to Constructor Params
```javascript
// NEW: Explicit dependencies
class MyFeature {
    constructor({ gameState, eventBus, soundManager }) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.soundManager = soundManager;
    }
}
```

### Step 3: Replace Direct Calls with Events
```javascript
// OLD: Direct coupling
this.game.showMessage('Win!');

// NEW: Event-based
this.eventBus.emit('message:show', 'Win!');
```

### Step 4: Register in ServiceRegistry
```javascript
container.singleton('myFeature', MyFeature, [
    'gameState',
    'eventBus',
    'soundManager'
]);
```

## API Reference

### DIContainer Methods

#### `singleton(name, factory, deps = [])`
Register service created once and reused.

```javascript
container.singleton('eventBus', EventBus);
container.singleton('gameState', GameState, ['stateManager']);
```

#### `transient(name, factory, deps = [])`
Register service created fresh each time.

```javascript
container.transient('randomGen', RandomGenerator);
```

#### `value(name, value)`
Register value directly (no factory).

```javascript
container.value('config', GAME_CONFIG);
container.value('debug', true);
```

#### `factory(name, factoryFn)`
Register custom factory function.

```javascript
container.factory('rng', (c) => {
    const config = c.resolve('config');
    return RNG.create(config.symbolGetter);
});
```

#### `resolve(name)`
Get service instance (auto-resolves dependencies).

```javascript
const eventBus = container.resolve('eventBus');
```

#### `has(name)`
Check if service is registered.

```javascript
if (container.has('myService')) { ... }
```

#### `createScope()`
Create child container (inherits registrations, separate instances).

```javascript
const testScope = container.createScope();
// Override services for testing
testScope.value('eventBus', mockEventBus);
```

## Testing Examples

### Unit Test with Mocks
```javascript
import { DIContainer } from '../src/core/DIContainer.js';
import { TurboMode } from '../src/features/TurboMode.refactored.js';

describe('TurboMode', () => {
    let container;
    let mockEventBus;
    let mockDom;

    beforeEach(() => {
        container = new DIContainer();

        mockEventBus = {
            emit: jest.fn()
        };

        mockDom = {
            turboBtn: document.createElement('button')
        };

        container.value('eventBus', mockEventBus);
        container.value('dom', mockDom);
        container.singleton('turboMode', TurboMode, ['eventBus', 'dom']);
    });

    it('should emit message when toggled', () => {
        const turboMode = container.resolve('turboMode');
        turboMode.toggle();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            'message:show',
            expect.stringContaining('Turbo')
        );
    });
});
```

### Integration Test with Real Services
```javascript
describe('Feature Integration', () => {
    let container;

    beforeEach(() => {
        container = new DIContainer();
        registerServices(container); // Use real registrations
    });

    it('should integrate multiple services', () => {
        const turboMode = container.resolve('turboMode');
        const eventBus = container.resolve('eventBus');

        let emittedEvent = null;
        eventBus.on('message:show', (msg) => {
            emittedEvent = msg;
        });

        turboMode.toggle();
        expect(emittedEvent).toBeTruthy();
    });
});
```

## Best Practices

### ✅ DO
- Register services in ServiceRegistry
- Use minimal dependencies (only what you need)
- Use events for cross-feature communication
- Test with mocked dependencies
- Use factory functions for complex initialization

### ❌ DON'T
- Pass entire game instance to features
- Create circular dependencies
- Resolve services in constructors
- Register anonymous functions (use named factories)
- Override singleton instances after creation

## Advanced: Scoped Containers

For advanced testing scenarios:

```javascript
// Parent container with shared services
const appContainer = new DIContainer();
registerServices(appContainer);

// Test-specific scope
const testScope = appContainer.createScope();

// Override specific services for this test
testScope.value('soundManager', silentSoundManager);
testScope.value('config', testConfig);

// Use test scope
const feature = testScope.resolve('myFeature');
// Uses real dependencies except overridden ones
```

## Next Steps

1. **Write unit tests** - Test DIContainer and example feature
2. **Migrate simple features** - Start with SoundManager, SpinHistory
3. **Migrate medium features** - Autoplay, Gamble, VisualEffects
4. **Migrate complex features** - FreeSpins, BonusGame, Cascade
5. **Refactor core** - SlotMachine, GameOrchestrator use container
6. **Remove old wiring** - Clean up manual dependency passing

## Resources

- `src/core/DIContainer.js` - Container implementation
- `src/core/ServiceRegistry.js` - Service registrations
- `src/features/TurboMode.refactored.js` - Example refactored feature
- `src/features/TurboMode.js` - Original for comparison

---

**Implementation Status:** ✅ Infrastructure Complete (Task #12)
**Next:** Begin feature migration and unit testing
