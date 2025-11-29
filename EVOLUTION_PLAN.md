# Greedy Squirrel - Evolution Plan

## Current State Analysis

### Existing Features
- ✅ Basic 5-reel, 3-row slot machine
- ✅ 10 fixed paylines
- ✅ 8 standard symbols with paytable
- ✅ Credit system with bet controls
- ✅ Visual feedback (winning symbols, paylines, win overlay)
- ✅ Paytable modal
- ✅ Keyboard controls (spacebar to spin)

### Critical Gaps Identified

#### 1. **No Special Symbols/Features**
- No WILD symbols (substitute for other symbols)
- No SCATTER symbols (pay anywhere, trigger bonuses)
- No BONUS symbols (trigger special features)
- No multiplier symbols

#### 2. **No Bonus Features**
- No free spins/bonus rounds
- No progressive features
- No cascading/tumbling reels
- No expanding symbols
- No sticky wilds
- No re-spins

#### 3. **Limited Progression System**
- No player levels or achievements
- No unlockable content
- No daily rewards/challenges
- No session statistics tracking

#### 4. **No Persistence**
- Credits reset on page reload
- No save/load system
- No localStorage integration
- No player progress tracking

#### 5. **Basic RNG**
- Completely random symbol generation
- No RTP (Return to Player) configuration
- No volatility settings
- No near-miss mechanics
- No weighted symbol distribution

#### 6. **Limited Game Modes**
- Single game mode only
- No autoplay feature
- No turbo spin
- No bet-behind or side bets

#### 7. **No Audio**
- No sound effects
- No background music
- No audio feedback for wins/actions

#### 8. **No Advanced UI/UX**
- No win animations beyond basic highlight
- No particle effects
- No win meter/anticipation builds
- No history panel (last X spins)
- No statistics display (biggest win, total spins, etc.)

#### 9. **No Risk/Gamble Features**
- No double-up/gamble feature after wins
- No ladder bonus
- No pick-em games

#### 10. **No Social/Competitive Elements**
- No leaderboards
- No achievements/trophies
- No share functionality

---

## Evolution Roadmap

### 🎯 PHASE 1: Core Mechanics Enhancement (Foundation)
**Goal**: Add essential special symbols and improve RNG

#### 1.1 Special Symbols System
- [ ] Add WILD symbol (🃏) - substitutes for regular symbols
  - Appears on reels 2, 3, 4 only
  - Cannot substitute for SCATTER or BONUS
  - Configure weighted appearance (lower probability)

- [ ] Add SCATTER symbol (⭐) - pays anywhere on reels
  - 3+ scatters trigger free spins
  - Pays independent of paylines
  - Higher payouts (5x = 500, 4x = 100, 3x = 20)

- [ ] Add BONUS symbol (🎁) - triggers bonus features
  - 3+ on active payline triggers pick-me bonus
  - Only appears on reels 1, 3, 5

#### 1.2 Weighted RNG System
- [ ] Implement reel strips (pre-defined symbol sequences per reel)
- [ ] Configure symbol weights/probabilities
  - High-value symbols: 10-15% appearance rate
  - Medium-value symbols: 20-25% appearance rate
  - Low-value symbols: 30-35% appearance rate
  - WILD: 5% appearance rate
  - SCATTER: 3% appearance rate
  - BONUS: 2% appearance rate

- [ ] Add RTP configuration (target 94-96%)
- [ ] Implement volatility settings (Low/Medium/High)

#### 1.3 Persistence Layer
- [ ] LocalStorage integration for:
  - Player credits
  - Total spins played
  - Biggest win
  - Current session stats
  - Settings preferences

- [ ] Auto-save after each spin
- [ ] Reset/clear data option in settings

**Estimated Effort**: Medium | **Value**: High | **Priority**: Critical

---

### 🎰 PHASE 2: Bonus Features (Engagement)
**Goal**: Add exciting bonus rounds and free spins

#### 2.1 Free Spins Feature
- [ ] Trigger: 3+ SCATTER symbols anywhere
  - 3 scatters = 10 free spins
  - 4 scatters = 15 free spins
  - 5 scatters = 25 free spins

- [ ] During free spins:
  - All wins multiplied by 2x or 3x
  - Can re-trigger with additional scatters
  - Different background/UI to indicate free spins mode
  - Free spin counter display

- [ ] Transition animations (enter/exit free spins mode)

#### 2.2 Pick-Me Bonus Game
- [ ] Trigger: 3+ BONUS symbols on payline
- [ ] Mini-game overlay showing acorns/treasures
- [ ] Player picks 3-5 items to reveal prizes
- [ ] Prizes: credit multipliers, instant wins, extra picks
- [ ] "Collect" feature to end bonus early

#### 2.3 Cascading Wins (Tumble Feature)
- [ ] After a win, winning symbols disappear
- [ ] Symbols above fall down to fill gaps
- [ ] New symbols fill from top
- [ ] Continue until no new wins
- [ ] Win multiplier increases with each cascade (1x, 2x, 3x, 5x)

**Estimated Effort**: High | **Value**: Very High | **Priority**: High

---

### 📊 PHASE 3: Progression & Engagement (Retention)
**Goal**: Keep players engaged long-term

#### 3.1 Level System
- [ ] Experience points (XP) earned per spin
  - Base XP = bet amount / 10
  - Bonus XP for big wins (>50x bet)

- [ ] Level progression (1-50)
- [ ] Unlocks per level:
  - Level 5: Autoplay feature
  - Level 10: Turbo spin mode
  - Level 15: New symbol set/theme
  - Level 20: Max bet increased
  - Level 25: Free daily bonus
  - Level 30+: Exclusive high-volatility mode

- [ ] Level-up celebration animation
- [ ] Progress bar showing XP to next level

#### 3.2 Achievement System
- [ ] 20+ achievements tracking:
  - "First Win" - win on first spin
  - "Big Winner" - win 100x bet or more
  - "Lucky Streak" - win 5 consecutive spins
  - "Scatter Master" - hit 5 scatters
  - "Millionaire" - reach 10,000 credits
  - "Persistent" - play 100/500/1000 spins
  - "Free Spin Fan" - trigger free spins 10/50/100 times
  - "Bonus Hunter" - trigger bonus round 25 times
  - "High Roller" - bet max 50 times

- [ ] Achievement notification system
- [ ] Rewards: bonus credits, XP multipliers, unlocks

#### 3.3 Daily Rewards & Challenges
- [ ] Daily login bonus (increasing with streak)
  - Day 1: 100 credits
  - Day 2: 150 credits
  - Day 7: 500 credits + free spins

- [ ] Daily challenges (3 per day):
  - "Win X amount today"
  - "Trigger free spins Y times"
  - "Play Z spins"
  - Rewards: bonus credits, XP boost

#### 3.4 Statistics Dashboard
- [ ] Session stats:
  - Total spins this session
  - Total wagered
  - Total won
  - Net profit/loss
  - Biggest win this session
  - Win rate percentage

- [ ] All-time stats:
  - Total spins ever
  - Biggest win ever
  - Total time played
  - Favorite bet amount
  - Free spins triggered
  - Bonus rounds played

- [ ] Visual charts (win/loss over time)

**Estimated Effort**: High | **Value**: High | **Priority**: Medium

---

### 🎮 PHASE 4: Game Modes & Features (Variety)
**Goal**: Provide different play styles

#### 4.1 Autoplay System
- [ ] Set number of auto spins (10/25/50/100/∞)
- [ ] Stop conditions:
  - On any win
  - If single win exceeds X
  - If balance increases by X
  - If balance decreases by X
  - On bonus feature trigger

- [ ] Pause/resume controls
- [ ] Speed control (normal/fast/turbo)

#### 4.2 Turbo Mode
- [ ] Reduced spin animation time (1s per reel vs 2-3s)
- [ ] Instant win display (no 2s delay)
- [ ] Quick-spin button/toggle
- [ ] Reduced animation effects

#### 4.3 Gamble/Double-Up Feature
- [ ] After any win, option to gamble
- [ ] Red/Black card prediction mini-game
- [ ] Double win on correct guess
- [ ] Lose all on wrong guess
- [ ] Can gamble multiple times (up to 5x or until max)
- [ ] "Collect" to take winnings

#### 4.4 Buy Bonus Feature
- [ ] Pay upfront cost (50-100x bet) to trigger free spins immediately
- [ ] Guaranteed free spins without waiting for scatters
- [ ] Higher cost for more free spins
- [ ] Special "guaranteed feature" mode

**Estimated Effort**: Medium | **Value**: Medium | **Priority**: Medium

---

### 🎨 PHASE 5: Polish & Audio-Visual (Immersion)
**Goal**: Create immersive, polished experience

#### 5.1 Audio System
- [ ] Sound effects:
  - Reel spin sounds (mechanical click)
  - Reel stop sounds (thud)
  - Win sounds (tiered by win size)
  - Button clicks
  - Scatter/bonus symbol lands
  - Free spins trigger fanfare
  - Big win celebration
  - Coin sounds for credit updates

- [ ] Background music:
  - Main game theme (forest/woodland ambiance)
  - Free spins theme (more energetic)
  - Bonus round theme (suspenseful)

- [ ] Volume controls (master, SFX, music)
- [ ] Mute toggle
- [ ] Audio settings persistence

#### 5.2 Advanced Animations
- [ ] Symbol animations:
  - Winning symbols animate (bounce, glow, pulse)
  - Scatter symbols sparkle
  - Wild symbols expand/contract
  - Symbol anticipation (near-miss wiggle)

- [ ] Particle effects:
  - Coin burst on wins
  - Confetti on big wins
  - Sparkles for special symbols
  - Squirrel character animations

- [ ] Transition effects:
  - Screen shake on big wins
  - Fade transitions between modes
  - Reel blur during spin
  - Win celebration sequences

#### 5.3 Enhanced UI/UX
- [ ] Win anticipation system:
  - Slow down final reel when 2 scatters showing
  - Visual hints for potential big wins
  - Dramatic pause before revealing win

- [ ] Win meter animation:
  - Count up from 0 to win amount
  - Sound effects during count-up
  - Tiered celebration based on win size

- [ ] History panel:
  - Last 10-20 spin results
  - Win amounts color-coded
  - Quick replay/details

- [ ] Responsive mobile design:
  - Touch-optimized controls
  - Portrait/landscape modes
  - Gesture support (swipe to spin)

**Estimated Effort**: High | **Value**: Medium | **Priority**: Low

---

### 🏆 PHASE 6: Social & Competitive (Community)
**Goal**: Add competitive and shareable elements

#### 6.1 Leaderboard System
- [ ] Global leaderboards:
  - Biggest single win
  - Highest balance reached
  - Most spins played
  - Longest win streak
  - Most free spins triggered

- [ ] Weekly/monthly resets
- [ ] Prize pools for top players (bonus credits)

#### 6.2 Achievement Showcase
- [ ] Public profile showing:
  - Unlocked achievements
  - Level and XP
  - Rare wins
  - Statistics

- [ ] Achievement rarity indicators
- [ ] Badge display system

#### 6.3 Share Functionality
- [ ] Screenshot big wins
- [ ] Share to social media
- [ ] Generate shareable stats images
- [ ] Referral system (bonus credits)

**Estimated Effort**: Medium | **Value**: Low | **Priority**: Low

---

## Implementation Priority Matrix

| Phase | Features | Effort | Value | Priority | Order |
|-------|----------|--------|-------|----------|-------|
| Phase 1 | Special Symbols, RNG, Persistence | Medium | High | Critical | 1st |
| Phase 2 | Bonus Features, Free Spins | High | Very High | High | 2nd |
| Phase 3 | Progression, Achievements, Stats | High | High | Medium | 3rd |
| Phase 4 | Autoplay, Turbo, Gamble | Medium | Medium | Medium | 4th |
| Phase 5 | Audio, Animations, Polish | High | Medium | Low | 5th |
| Phase 6 | Social, Leaderboards | Medium | Low | Low | 6th |

---

## Technical Considerations

### Architecture Improvements Needed

#### 1. State Management
Current: All state in SlotMachine class
**Needed**:
- Separate GameState class
- StateMachine for game modes (normal/freespins/bonus)
- Observable pattern for state changes

#### 2. Module Structure
Current: Single game.js file
**Needed**:
```
src/
  ├── core/
  │   ├── SlotMachine.js       # Main game controller
  │   ├── ReelController.js    # Reel management
  │   ├── SymbolManager.js     # Symbol definitions
  │   └── PaylineEvaluator.js  # Win calculation
  ├── features/
  │   ├── FreeSpins.js
  │   ├── BonusGame.js
  │   ├── Cascade.js
  │   └── Gamble.js
  ├── progression/
  │   ├── LevelSystem.js
  │   ├── Achievements.js
  │   └── Statistics.js
  ├── audio/
  │   └── AudioManager.js
  ├── ui/
  │   ├── UIController.js
  │   ├── AnimationEngine.js
  │   └── ParticleSystem.js
  └── utils/
      ├── RNG.js               # Weighted random
      ├── Storage.js           # LocalStorage wrapper
      └── EventBus.js          # Event system
```

#### 3. Configuration System
**Needed**:
- `config/symbols.js` - Symbol definitions, weights
- `config/paytables.js` - Payout configurations
- `config/features.js` - Feature settings
- `config/audio.js` - Sound mappings
- `config/achievements.js` - Achievement definitions

#### 4. Build System
Current: None (vanilla JS)
**Consider**:
- Module bundler (Vite or Rollup) for better organization
- Asset optimization
- Minification for production
- Development server with hot reload

#### 5. Data Models
**Needed classes**:
```javascript
class GameState {
  credits, bet, level, xp, achievements, stats
}

class SpinResult {
  reelPositions, symbols, wins, features
}

class WinData {
  payline, symbols, multiplier, amount
}

class BonusFeature {
  type, active, data, multiplier
}
```

---

## Success Metrics

### Player Engagement
- Average session length: >10 minutes
- Return rate: >30% next-day
- Spins per session: >50
- Feature trigger rate: Every 20-30 spins

### Feature Adoption
- Autoplay usage: >40% of sessions
- Gamble usage: >25% of wins
- Achievement completion: >10% of all achievements

### Technical Performance
- Spin execution: <100ms
- Animation smoothness: 60fps
- Load time: <2s
- Mobile responsiveness: 100%

---

## Next Steps

1. **Review & Prioritize**: Discuss and adjust priorities based on goals
2. **Phase 1 Detailed Planning**: Break down Phase 1 into implementable tasks
3. **Architecture Refactor**: Set up module structure before adding features
4. **Implement Phase 1**: Start with special symbols and RNG improvements
5. **Test & Iterate**: Validate each phase before moving to next

---

**Document Version**: 1.0
**Last Updated**: 2025-11-29
**Status**: Planning Phase
