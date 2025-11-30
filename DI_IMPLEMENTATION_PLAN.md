# DI Implementation Plan

## Feature Dependency Analysis

### Simple Features (Minimal Dependencies)

#### 1. **Gamble**
- Dependencies: `soundManager`
- Methods used: `playClick()`, `playWin()`, `playError()`
- DOM: Direct DOM access (getElementById)
- **Refactoring:** Easy - just inject soundManager

#### 2. **WinAnticipation**
- Dependencies: `timerManager`, `soundManager`
- Methods used: `setTimeout()`, `playTone()`
- DOM: Direct DOM access (getElementById, querySelectorAll)
- **Refactoring:** Easy - inject 2 services

### Medium Complexity

#### 3. **FreeSpins** (Already DI-ready!)
- Dependencies: `renderer` (already injected via `setRenderer()`)
- **Refactoring:** Minimal - just formalize constructor

#### 4. **Autoplay** (Already DI-ready!)
- Dependencies: `timerManager`, `gameState`, `eventBus`, `turboMode`
- **Refactoring:** Remove backward compatibility shim

#### 5. **TurboMode** (Already DI-ready!)
- Dependencies: `eventBus`, `dom`
- **Refactoring:** Remove backward compatibility shim

### Complex Features (Many Dependencies + Game Methods)

#### 6. **BuyBonus**
- **State access:**
  - `state.getCredits()`, `state.getCurrentBet()`, `state.deductCredits()`, `state.addCredits()`, `state.setLastWin()`, `state.isSpinning()`
- **Services:**
  - `soundManager.playClick()`
  - `statistics.recordFeatureTrigger()`, `statistics.recordSpin()`
  - `bonusGame.trigger()`, `bonusGame.end()`
  - `levelSystem.awardXP()`
- **Game methods (need abstraction):**
  - `game.updateDisplay()` → UIController
  - `game.saveGameState()` → GameStateLoader
  - `game.showMessage()` → UIFacade
- **Refactoring:** Create UIFacade service for game methods

#### 7. **Cascade**
- Need to analyze

#### 8. **BonusGame**
- Need to analyze

### Progression Systems

#### 9. **LevelSystem**
- Need to analyze

#### 10. **Achievements**
- Need to analyze

#### 11. **Statistics** (Likely independent)
- Need to analyze

#### 12. **DailyChallenges**
- Need to analyze

### UI/Effects

#### 13. **VisualEffects**
- Need to analyze

#### 14. **Settings**
- Need to analyze

---

## Abstraction Needed: Game Methods

Several features call game instance methods:
- `game.updateDisplay()` → Move to UIController or UIFacade
- `game.saveGameState()` → Move to GameStateLoader service
- `game.showMessage(msg)` → Move to UIFacade

### Solution: Create Injectable Services
```javascript
// UIFacade service (already exists but not fully utilized)
class UIFacade {
    updateDisplay() { ... }
    showMessage(msg) { ... }
}

// GameStateLoader service (already exists)
class GameStateLoader {
    saveGameState() { ... }
    loadGameState() { ... }
}
```

---

## Implementation Order

### Phase 1: Simple Features (Start Here)
1. ✓ Gamble - inject `soundManager`
2. ✓ WinAnticipation - inject `timerManager`, `soundManager`

### Phase 2: DI-Ready Features (Remove Shims)
3. ✓ Autoplay - remove backward compatibility
4. ✓ TurboMode - remove backward compatibility
5. ✓ FreeSpins - formalize DI constructor

### Phase 3: Abstract Game Methods
6. ✓ Enhance UIFacade with `updateDisplay()`, `showMessage()`
7. ✓ Enhance GameStateLoader as injectable service

### Phase 4: Complex Features
8. ✓ BuyBonus - inject all dependencies + UIFacade
9. ✓ BonusGame
10. ✓ Cascade

### Phase 5: Progression Systems
11. ✓ LevelSystem
12. ✓ Achievements
13. ✓ Statistics
14. ✓ DailyChallenges

### Phase 6: UI Systems
15. ✓ VisualEffects
16. ✓ Settings

### Phase 7: Wire Everything
17. ✓ Update ServiceRegistry with real dependencies (remove `null` placeholders)
18. ✓ Update GameFactory to use DI path
19. ✓ Update SlotMachine to accept DI-injected features

### Phase 8: Cleanup
20. ✓ Remove all game instance passing
21. ✓ Test thoroughly

---

## Current Status: Starting Phase 1
