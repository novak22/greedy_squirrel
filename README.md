# 🐿️ Greedy Squirrel Slot Machine

A browser-based slot machine game with advanced mechanics and progression systems.

## Architecture Overview

- **StateManager**: Centralized, observable state that drives UI updates and enforces immutable transitions.
- **GameOrchestrator**: High-level controller that wires the SlotMachine core to renderers, feature controllers, and persistence.
- **Dependency Injection (DI)**: `DIContainer` and `ServiceRegistry` define explicit dependencies so features can be tested and swapped independently.
- **SlotMachineEngine**: Extracted engine package containing the reusable StateManager, EventBus, PaylineEvaluator, and RNG primitives.

### Gameplay Highlights

- **Special Symbols**: 🃏 WILD (reels 2–4), ⭐ SCATTER (pays anywhere), 🎁 BONUS (reels 1, 3, 5)
- **Weighted RNG System**: Reel strips are generated with per-symbol rarity for authentic slot pacing.
- **Persistence**: Credits, bets, and statistics auto-save to `localStorage` via the state layer.
- **Statistics Tracking**: Total spins, wagered amount, total won, biggest win, scatter hits, and bonus triggers.

## How to Run

### Method 1: Local HTTP Server (Recommended)

ES6 modules require an HTTP server. Use any of these methods:

**Python (Recommended)**:

```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000/index.html

**Node.js (if installed)**:

```bash
npx http-server -p 8000
```

Then open: http://localhost:8000/index.html

**PHP (if installed)**:

```bash
php -S localhost:8000
```

Then open: http://localhost:8000/index.html

### Method 2: Browser Extension

Install "Live Server" extension in VS Code or similar, then right-click `index.html` and select "Open with Live Server".

### ⚠️ Important

Do NOT open `index.html` directly with `file://` protocol - ES6 modules will not work due to CORS restrictions.

## How to Play

1. **Set Your Bet**: Use +/- buttons or MAX BET
2. **Spin**: Click SPIN button or press SPACEBAR
3. **Win**: Match 3+ symbols on any of the 10 paylines
4. **Special Wins**:
    - WILD (🃏) substitutes for regular symbols
    - SCATTER (⭐) pays anywhere: 3 = 20x, 4 = 100x, 5 = 500x
    - BONUS (🎁) will trigger features in Phase 2

## Game Controls

- **SPIN Button**: Start a spin
- **SPACEBAR**: Quick spin
- **+/- Buttons**: Adjust bet amount
- **MAX BET**: Set bet to maximum
- **PAYTABLE**: View symbol payouts and rules

## Developer Tools

### Debug Console

Open browser console (F12) and access:

```javascript
window.game; // Main game instance
window.game.stats; // View statistics
window.game.reelStrips; // View weighted reel strips
```

## Code Quality Tools

Install dependencies and run ESLint and Prettier to keep the codebase consistent:

```bash
npm install
npm run lint          # Check code style and potential issues
npm run lint:fix      # Auto-fix fixable ESLint issues
npm run format        # Check formatting with Prettier
npm run format:write  # Write Prettier formatting changes
```

> **Why is `package-lock.json` large?** ESLint and Prettier bring a sizable dependency tree. The lockfile records exact versions for every transitive package so installs are reproducible; its size is expected and should stay committed.

### Clear Save Data

```javascript
localStorage.removeItem('greedy_squirrel_save');
location.reload();
```

## Development

- **Architecture & setup:** See [`docs/development.md`](docs/development.md) for a current overview of module boundaries, DI usage, and local development commands.
- **Engine package:** See [`SlotMachineEngine/README.md`](SlotMachineEngine/README.md) for details on the extracted core engine.
- **Roadmap:** See [EVOLUTION_PLAN.md](EVOLUTION_PLAN.md) for upcoming phases.

## Upcoming Features

See [EVOLUTION_PLAN.md](EVOLUTION_PLAN.md) for the complete roadmap:

- **Phase 2**: Free spins, bonus rounds, cascading wins
- **Phase 3**: Level system, achievements, daily challenges
- **Phase 4**: Autoplay, turbo mode, gamble feature
- **Phase 5**: Audio system, advanced animations
- **Phase 6**: Leaderboards, social features

## Technologies Used

- Vanilla JavaScript (ES6+ modules)
- HTML5
- CSS3 (Gradients, animations, flexbox/grid)
- LocalStorage API

## Browser Compatibility

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

Modern browsers with ES6 module support required.

## License

Educational/Portfolio Project

## Credits

Developed with Claude Code
