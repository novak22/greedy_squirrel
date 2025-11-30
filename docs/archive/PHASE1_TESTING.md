# Phase 1 - Testing Checklist

## Features to Test

### ✅ Module Architecture

- [x] Game loads successfully with ES6 modules
- [x] Console shows "Phase 1 Loaded" message
- [x] No JavaScript errors in console

### ✅ Special Symbols

#### WILD Symbol (🃏)

- [ ] WILD appears on reels 2, 3, 4 only (never on reels 1 or 5)
- [ ] WILD substitutes for regular symbols in winning combinations
- [ ] Example: 👑-🃏-👑-👑-👑 should pay as 5x Crown
- [ ] WILD does NOT substitute for SCATTER or BONUS

#### SCATTER Symbol (⭐)

- [ ] SCATTER can appear on all reels
- [ ] 3 SCATTERS anywhere pays 20x bet
- [ ] 4 SCATTERS anywhere pays 100x bet
- [ ] 5 SCATTERS anywhere pays 500x bet
- [ ] SCATTER wins are independent of paylines
- [ ] SCATTER positions highlight when winning

#### BONUS Symbol (🎁)

- [ ] BONUS appears only on reels 1, 3, 5
- [ ] 3+ BONUS on a payline shows "BONUS TRIGGERED" message
- [ ] Message mentions "Coming in Phase 2"

### ✅ Weighted RNG

- [ ] Symbols appear with varying frequencies
- [ ] Higher value symbols (👑, 💎) appear less frequently
- [ ] Lower value symbols (🍂, 🌲) appear more frequently
- [ ] WILD appears rarely (approximately 5% of time on allowed reels)
- [ ] SCATTER appears very rarely (approximately 3% of time)
- [ ] Each reel uses pre-generated weighted strip (consistent probabilities)

### ✅ Persistence System

- [ ] Credits are saved after each spin
- [ ] Reload page - credits should persist
- [ ] Bet amount persists across page reload
- [ ] Statistics persist across sessions
- [ ] Check localStorage in browser DevTools for 'greedy_squirrel_save' key

### ✅ Statistics Tracking

- [ ] Stats are updated after each spin
- [ ] Check window.game.stats in console:
    - totalSpins increments
    - totalWagered increases by bet amount
    - totalWon increases on wins
    - biggestWin updates when new record
    - scatterHits increments on scatter wins
    - bonusHits increments on bonus trigger

### ✅ Win Evaluation

- [ ] Regular symbols still pay correctly (3, 4, 5 of a kind)
- [ ] Wins are calculated with WILD substitution
- [ ] Multiple paylines can win simultaneously
- [ ] Win amounts displayed correctly
- [ ] Winning symbols highlight properly
- [ ] Winning paylines show correctly

### ✅ UI Updates

- [ ] Paytable shows special symbols section
- [ ] Paytable shows WILD, SCATTER, BONUS with descriptions
- [ ] Special symbols highlighted with golden border
- [ ] Regular symbols section still displays correctly
- [ ] Scatter note added to paylines info

### ✅ Game Flow

- [ ] Game starts with saved credits or 1000 if new
- [ ] Spin deducts bet from credits
- [ ] Win adds to credits
- [ ] Last win displays correctly
- [ ] Game Over resets to 1000 credits
- [ ] Auto-save happens after every spin

## Test Scenarios

### Scenario 1: WILD Substitution

1. Play multiple spins until WILD appears
2. Verify WILD only on reels 2, 3, or 4
3. Check if WILD completes winning combinations
4. Example win: Any-Symbol-WILD-Symbol-Symbol-Symbol (4 of a kind)

### Scenario 2: SCATTER Win

1. Play until 3+ SCATTER symbols appear anywhere
2. Verify scatter positions highlight
3. Check payout matches:
    - 3 scatters = 20x bet
    - 4 scatters = 100x bet
    - 5 scatters = 500x bet
4. Verify message shows "X SCATTERS!"

### Scenario 3: Persistence

1. Note current credits (e.g., 1234)
2. Make a bet and spin
3. Refresh the page (F5 or Cmd+R)
4. Verify credits restored to value after last spin
5. Clear localStorage and refresh - should start at 1000

### Scenario 4: Statistics

1. Open browser console (F12)
2. Type: `window.game.stats`
3. Play 10 spins
4. Check stats again - should show:
    - totalSpins: 10
    - totalWagered: 10 × bet amount
    - totalWon: sum of all wins
5. Check biggestWin updates correctly

### Scenario 5: Symbol Distribution

1. Play 50+ spins and observe symbol frequencies
2. Low-value symbols (🍂, 🌲, 🍄) should appear most
3. Medium-value symbols (🌻, 🥜, 🌰) appear moderately
4. High-value symbols (💎, 👑) should be rare
5. Special symbols (🃏, ⭐, 🎁) should be very rare

## Performance Checks

- [ ] Game loads in under 2 seconds
- [ ] Spin animation smooth at 60fps
- [ ] No lag or stuttering during spins
- [ ] Memory usage stable (check DevTools Performance)
- [ ] No memory leaks after 100+ spins

## Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations (Expected)

- Bonus round not implemented (Phase 2)
- Free spins not implemented (Phase 2)
- No audio (Phase 5)
- No animations beyond basic highlights (Phase 5)
- No autoplay (Phase 4)

## Bug Report Template

If you find bugs, document them here:

**Bug**:
**Steps to Reproduce**:

1.
2.
3.

**Expected**:
**Actual**:
**Severity**: Critical / High / Medium / Low

---

## Testing Status

- **Date**: 2025-11-29
- **Tester**:
- **Status**: Ready for Testing
- **Passed Tests**: 0/30+
- **Failed Tests**: 0
- **Blockers**: None
