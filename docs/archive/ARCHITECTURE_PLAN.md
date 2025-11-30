# UIController & StateManager Architecture Plan

## Current Architecture (Problem)

```
SlotMachine (1500+ lines)
├── Game Logic ✅
├── State Management ❌ (scattered)
├── UI Updates ❌ (mixed with logic)
├── DOM Manipulation ❌ (everywhere)
└── Event Handling ❌ (mixed)
```

**Problems:**

- Can't test game logic without DOM
- State changes scattered across methods
- UI updates interleaved with business logic
- Difficult to swap UI (e.g., different themes)

---

## Target Architecture (Solution)

```
┌─────────────────────────────────────────────────┐
│                   SlotMachine                    │
│            (Pure Game Logic Only)                │
│  - spin(), evaluateWins(), processFeatures()    │
└──────────────┬──────────────────────────────────┘
               │
               │ uses
               │
┌──────────────▼──────────────────────────────────┐
│                  StateManager                    │
│         (Single Source of Truth)                 │
│  - state = { game, features, ui, stats }        │
│  - setState(path, value)                        │
│  - subscribe(path, callback)                    │
│  - Observer pattern for reactive updates        │
└──────────────┬──────────────────────────────────┘
               │
               │ notifies
               │
┌──────────────▼──────────────────────────────────┐
│                  UIController                    │
│              (DOM Management Only)               │
│  - updateCredits(), updateReels(), etc.         │
│  - Subscribes to StateManager                   │
│  - Handles all DOM manipulation                 │
└─────────────────────────────────────────────────┘
```

---

## StateManager Design

### Responsibilities

1. **Store all game state** in a single object
2. **Notify subscribers** when state changes
3. **Provide getters/setters** for type-safe access
4. **Support nested paths** (e.g., `game.credits`, `features.freeSpins.active`)

### State Structure

```javascript
{
    game: {
        credits: 1000,
        currentBet: 10,
        lastWin: 0,
        isSpinning: false
    },
    features: {
        freeSpins: { active: false, remaining: 0, multiplier: 1 },
        bonus: { active: false },
        cascade: { enabled: false, multiplier: 1 }
    },
    ui: {
        reelResult: [[],[],[],[],[]],
        winningPositions: new Set(),
        winningLines: []
    },
    progression: {
        level: 1,
        xp: 0
    }
}
```

### API

```javascript
// Set state (triggers subscribers)
stateManager.setState('game.credits', 1500);
stateManager.setState('features.freeSpins', { active: true, remaining: 10 });

// Get state
const credits = stateManager.getState('game.credits');
const gameState = stateManager.getState('game');

// Subscribe to changes
stateManager.subscribe('game.credits', (newValue, oldValue) => {
    console.log(`Credits changed: ${oldValue} → ${newValue}`);
});

// Subscribe to any change
stateManager.subscribe('*', (state) => {
    console.log('State changed:', state);
});
```

---

## UIController Design

### Responsibilities

1. **Update DOM** based on state changes
2. **Handle user input** (button clicks, keyboard)
3. **Trigger animations** (winning symbols, etc.)
4. **No business logic** - just UI concerns

### API

```javascript
class UIController {
    constructor(stateManager, eventBus, domCache) {
        this.state = stateManager;
        this.events = eventBus;
        this.dom = domCache;

        this.subscribeToState();
        this.attachEventListeners();
    }

    subscribeToState() {
        // React to state changes
        this.state.subscribe('game.credits', (credits) => {
            this.dom.credits.textContent = credits;
        });

        this.state.subscribe('game.lastWin', (win) => {
            this.dom.win.textContent = win;
        });

        this.state.subscribe('ui.reelResult', (result) => {
            this.updateReels(result);
        });
    }

    attachEventListeners() {
        // Handle user input
        this.dom.spinBtn.addEventListener('click', () => {
            this.events.emit(GAME_EVENTS.SPIN_REQUESTED);
        });
    }

    // UI update methods
    updateCredits(credits) { ... }
    updateReels(result) { ... }
    showWinAnimation(positions) { ... }
}
```

---

## Integration Flow

### Before (Current)

```javascript
// In SlotMachine.spin()
this.credits -= this.currentBet; // State change
this.updateDisplay(); // UI update
document.getElementById('spinBtn').disabled = true; // DOM manipulation
```

### After (Target)

```javascript
// In SlotMachine.spin()
this.state.setState('game.credits', this.state.get('game.credits') - bet);
// StateManager notifies UIController
// UIController updates DOM automatically

this.state.setState('game.isSpinning', true);
// UIController automatically disables spin button
```

---

## Migration Strategy

### Phase 1: StateManager (Priority)

1. Create StateManager class
2. Move game state to StateManager
3. Replace direct property access with getters/setters
4. Test that game still works

### Phase 2: UIController (After StateManager)

1. Create UIController class
2. Move DOM manipulation methods to UIController
3. Subscribe UIController to StateManager
4. Remove UI code from SlotMachine

### Phase 3: Cleanup

1. SlotMachine becomes pure game logic
2. Update tests (can test without DOM!)
3. Document new architecture

---

## Benefits

### For Testing

```javascript
// Before: Need full DOM to test
const game = new SlotMachine();
game.spin(); // ERROR: document.getElementById not found

// After: Pure logic testing
const state = new StateManager(initialState);
const game = new SlotMachine(state);
game.spin(); // Works! No DOM needed
```

### For Maintainability

```javascript
// Before: UI and logic mixed
async spin() {
    this.credits -= this.currentBet;  // Logic
    document.getElementById('credits').textContent = this.credits;  // UI
    this.isSpinning = true;  // Logic
    this.dom.spinBtn.disabled = true;  // UI
}

// After: Clean separation
async spin() {
    this.state.setState('game.credits', this.state.get('game.credits') - bet);
    this.state.setState('game.isSpinning', true);
    // UIController handles all UI updates automatically!
}
```

### For Extensibility

```javascript
// Want to add a new UI?
class MobileUIController extends UIController {
    updateCredits(credits) {
        // Different rendering for mobile
    }
}

// Swap UI without touching game logic!
const ui = isMobile ? new MobileUIController() : new UIController();
```

---

## Implementation Order

1. ✅ Create StateManager class
2. ✅ Migrate game state to StateManager
3. ✅ Create UIController class
4. ✅ Move DOM methods to UIController
5. ✅ Subscribe UIController to state changes
6. ✅ Remove UI code from SlotMachine
7. ✅ Test everything works
8. ✅ Update documentation

---

## Backward Compatibility

We'll maintain backward compatibility:

```javascript
// Old API still works
game.credits = 1000;

// Behind the scenes, uses setter:
set credits(value) {
    this.state.setState('game.credits', value);
}

get credits() {
    return this.state.getState('game.credits');
}
```

---

## Success Criteria

- [ ] SlotMachine has NO direct DOM manipulation
- [ ] All state in StateManager
- [ ] UIController handles all UI updates
- [ ] Game testable without DOM
- [ ] 100% backward compatible
- [ ] No bugs introduced
