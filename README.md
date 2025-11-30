# 🐿️ Greedy Squirrel Slot Machine

A browser-based slot machine game with advanced mechanics and progression systems.

## Current Status: Phase 1 Complete ✅

### Phase 1 Features (Implemented)
- **Special Symbols**:
  - 🃏 WILD - Substitutes for regular symbols (appears on reels 2, 3, 4)
  - ⭐ SCATTER - Pays anywhere on reels (3+ triggers message)
  - 🎁 BONUS - Appears on reels 1, 3, 5 (3+ triggers message)

- **Weighted RNG System**: Symbols have different probabilities
  - High-value symbols appear less frequently
  - Special symbols are rare
  - Each reel has pre-generated weighted strips

- **Persistence**: Game state auto-saves to localStorage
  - Credits persist across sessions
  - Statistics tracked
  - Bet amount remembered

- **Statistics Tracking**:
  - Total spins played
  - Total wagered
  - Total won
  - Biggest win
  - Scatter hits
  - Bonus triggers

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
window.game              // Main game instance
window.game.stats        // View statistics
window.game.reelStrips   // View weighted reel strips
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
localStorage.removeItem('greedy_squirrel_save')
location.reload()
```

## Project Structure
```
slotgame1/
├── index.html              # Main HTML file
├── game.js                 # Entry point (ES6 module)
├── style.css               # All styles
├── src/
│   ├── config/
│   │   ├── symbols.js      # Symbol definitions & weights
│   │   └── game.js         # Game configuration
│   ├── core/
│   │   ├── SlotMachine.js  # Main game controller
│   │   └── PaylineEvaluator.js  # Win calculation with WILD/SCATTER
│   └── utils/
│       ├── RNG.js          # Weighted random number generator
│       └── Storage.js      # localStorage wrapper
├── CLAUDE.md               # AI coding guide
├── EVOLUTION_PLAN.md       # Full feature roadmap
└── PHASE1_TESTING.md       # Testing checklist

```

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
