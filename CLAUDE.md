# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based slot machine game called "Greedy Squirrel" built with vanilla JavaScript, HTML, and CSS. It's a client-side only application with no build process or dependencies.

## Running the Application

Open `index.html` directly in a web browser. No build step, server, or package installation required.

## Code Architecture

### Core Structure

The application uses a single `SlotMachine` class (game.js:1) that manages all game state and logic:

- **Game State**: Credits, bets, wins, and spinning status are tracked as instance properties
- **Reel System**: 5 reels with 3 visible rows each (game.js:4-6). Each reel contains 20 symbol positions
- **Paylines**: 10 fixed paylines defined as row-index arrays (game.js:28-39)
- **Symbols**: 8 emoji symbols with weighted payouts defined in the paytable (game.js:17-26)

### Key Game Flow

1. **Spin Initialization** (game.js:115): Deducts bet, clears previous wins, starts reel animations
2. **Reel Animation** (game.js:165): Each reel spins independently with staggered stop times (2000-3200ms)
3. **Win Evaluation** (game.js:141-152): After all reels stop, checks paylines for matching symbols
4. **Win Display** (game.js:149-152): Highlights winning symbols, shows active paylines, displays win overlay

### Payline System

Paylines are checked left-to-right for consecutive matching symbols (game.js:219-261). A win requires:
- Minimum 3 matching symbols starting from leftmost reel
- Symbols following the payline row pattern
- Symbol exists in paytable with payout multiplier

### DOM Manipulation

- Reels are created by populating `.symbol-container` divs with symbol elements (game.js:50-63)
- Spinning animation uses CSS classes, not JavaScript position updates (game.js:170)
- Final symbols are rendered by directly setting textContent on the first 3 symbol elements per reel (game.js:191-193)

### Event Handling

- Spin button, bet controls, and max bet all check `isSpinning` flag to prevent concurrent spins
- Space bar triggers spin via keyboard event listener (game.js:77-82)
- Paytable modal uses show/hide class toggles (game.js:310-317)

### Betting System

- Fixed bet options: [10, 20, 50, 100, 200] (game.js:10)
- Current bet tracked by index into betOptions array
- Payouts are multiplied by current bet amount (game.js:249)
