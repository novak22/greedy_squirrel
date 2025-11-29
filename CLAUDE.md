# CLAUDE.md

## Project: Greedy Squirrel Slot Machine
Vanilla JS browser game. No build process. Open `index.html` to run.

## Architecture

**State Management:**
- All game state via `GameState` wrapper (src/core/GameState.js)
- Access: `game.state.getCredits()`, `game.state.setCredits(value)`
- Never bypass validation - use GameState methods

**Core Classes:**
- `SlotMachine` (src/core/SlotMachine.js) - Main game orchestration
- `StateManager` (src/core/StateManager.js) - Observable state with subscriptions
- `GameState` (src/core/GameState.js) - Validated state access wrapper
- `EventBus` (src/core/EventBus.js) - Decoupled feature communication
- `PaylineEvaluator` (src/core/PaylineEvaluator.js) - Win calculation

**Game Flow:**
1. Spin deducts bet via `state.deductCredits()`
2. Reels spin using CSS animations (not DOM manipulation)
3. PaylineEvaluator checks wins
4. Credits added via `state.addCredits()`

**Features:** FreeSpins, BonusGame, Cascade, Autoplay, BuyBonus
**Progression:** LevelSystem, Achievements, DailyChallenges, Statistics

## Working with Code

**DO:**
- Use `game.state.getX()` / `game.state.setX()` for state access
- Add inline comments for complex logic only
- Keep responses concise - explain changes verbally
- Reference code locations: `file.js:123`

**DON'T:**
- Create verbose .md documentation files unless explicitly requested
- Write long summaries or migration guides
- Create ASCII tables or "before/after" examples
- Generate testing checklists (just test it)
