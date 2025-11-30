# Development Guide

This document outlines how the modern multi-phase architecture is organized and how to work on Greedy Squirrel.

## Project Setup

1. Install dependencies:

```bash
npm install
```

2. Run quality gates during development:

- **TypeScript build:** `npm run build` (or `npm run dev` for watch mode)
- **Type checking only:** `npm run typecheck`
- **Linting:** `npm run lint` (auto-fix with `npm run lint:fix`)
- **Formatting:** `npm run format` (write changes with `npm run format:write`)
- **Unit tests:** `npm test`

3. Serve the browser game via any static server (examples in the main README). Avoid `file://` loads because ES modules require HTTP.

## Module Boundaries

### SlotMachineEngine (reusable core)
- **StateManager**: Observable state container with immutable updates.
- **EventBus**: Pub/sub layer for game lifecycle, spin, and feature events.
- **PaylineEvaluator**: Configurable win calculation with wild/scatter logic.
- **RNG**: Weighted random generation for reel strips and symbol selection.

### Game orchestration (app layer)
- **GameOrchestrator (`src/core/GameOrchestrator.ts`)**: Extends `SlotMachine` to wire the engine to UI renderers, feature controllers, and persistence (`GameStateLoader`).
- **SlotMachine (`src/core/SlotMachine.js`)**: Core game logic coordinating spins, features, and statistics while relying on the engine primitives.
- **UI layer (`src/ui`)**: `UIController` reacts to `StateManager` updates; renderers like `StatsRenderer`, `CascadeRenderer`, and `BonusGameRenderer` handle DOM updates.
- **Features (`src/features`) & Progression (`src/progression`)**: Free spins, bonus game, cascades, autoplay, achievements, and level system sit behind the event bus and state APIs rather than direct DOM calls.

### Dependency Injection
- **DIContainer & ServiceRegistry (`src/core`)**: Central registration for services with explicit dependencies and lifecycles (singleton/transient/value).
- **GameFactory (`src/core/GameFactory.js`)**: Helper to create production or test containers, bridge legacy constructors, and register DOM caches after load.
- **Feature constructors** accept either the container-resolved dependency bag or the legacy `game` instance for backward compatibility.

### Persistence and validation
- **GameStateLoader (`src/core/GameStateLoader.js`)**: Persists and restores state snapshots through `StateManager`.
- **Configuration validation (`src/config/validation.js`)**: Validates game, feature, and symbol configs before boot.

## Testing Strategy

- **Engine unit tests:** `npm test` runs the Node test suite covering RNG, payline evaluation, and `StateManager` contracts.
- **DI tests:** `node tests/DIContainer.test.js` exercises the container, lifecycle management, and circular dependency detection.
- **Integration checks:** `node tests/DI.integration.test.js` validates service wiring and backward-compatible constructors.
- **Type safety & linting:** Run `npm run typecheck` and `npm run lint` before commits to catch regressions early.

Tests are written with the built-in Node test runner; no browser is required.

## Extension Points

- **Events:** Emit and listen via `GAME_EVENTS` on the `EventBus` instead of calling features directly (e.g., `events.emit(GAME_EVENTS.SPIN_START)`).
- **State updates:** Use `StateManager` to change game or UI state so `UIController` and renderers react automatically.
- **Dependency injection:** Register new services in `ServiceRegistry` and resolve them through `DIContainer` to keep dependencies explicit and testable.
- **Engine configuration:** Extend symbol definitions, paylines, or reel counts by updating `src/config` files; the engine reads these through `GameOrchestrator`.
- **Renderers:** Add or replace renderers in `src/ui/renderers` to change animations or visual themes without touching game logic.

Following these boundaries keeps the SlotMachineEngine reusable, the app layer testable, and new features decoupled from the DOM.
