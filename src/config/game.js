// Game configuration
export const GAME_CONFIG = {
    reelCount: 5,
    rowCount: 3,
    symbolsPerReel: 20,

    // Starting credits
    initialCredits: 1000,

    // Bet options
    betOptions: [10, 20, 50, 100, 200, 500, 1000, 2000],

    // Betting limits
    maxBetIncrementPercent: 0.1, // 10% of current balance

    // RTP configuration (Return to Player)
    targetRTP: 95.5, // Target 95.5% RTP

    // Volatility setting
    volatility: 'medium', // low, medium, high

    // Win thresholds (multipliers)
    winThresholds: {
        big: 50, // 50x bet = big win
        mega: 100 // 100x bet = mega win
    },

    // Paylines (row indices for each reel)
    paylines: [
        [1, 1, 1, 1, 1], // Middle
        [0, 0, 0, 0, 0], // Top
        [2, 2, 2, 2, 2], // Bottom
        [0, 1, 2, 1, 0], // V shape
        [2, 1, 0, 1, 2], // ^ shape
        [0, 1, 1, 1, 0], // V plateau
        [2, 1, 1, 1, 2], // ^ plateau
        [1, 0, 1, 2, 1], // W left
        [1, 2, 1, 0, 1], // M left
        [0, 0, 1, 2, 2] // Diagonal up
    ],

    // Spin animation timings (ms)
    spinDurations: [2000, 2300, 2600, 2900, 3200],
    reelSpinInterval: 100, // Update interval during spin animation

    // Animation durations (ms)
    animations: {
        symbolLanded: 600, // Symbol bounce animation when landed
        levelUpMessage: 2500, // Level up overlay display time
        freeSpinDelay: 1500, // Delay between free spins
        screenShake: 500, // Screen shake effect duration
        winCounterFast: 500, // Win counter animation (turbo)
        winCounterNormal: 1000, // Win counter animation (normal)
        winCounterStepsFast: 10, // Number of steps in counter (turbo)
        winCounterStepsNormal: 20, // Number of steps in counter (normal)
        reelStopping: 300, // Reel deceleration animation duration
        anticipationDisplay: 1500, // How long to show anticipation message
        anticipationHighlight: 2000 // How long anticipation symbols glow
    },

    // UI timings
    winDisplayDuration: 2000,
    messageDisplayDuration: 2000,

    // Autoplay delays (ms)
    autoplay: {
        normalDelay: 1000, // Delay between spins (normal mode)
        turboDelay: 500 // Delay between spins (turbo mode)
    },

    // Gamble feature
    gamble: {
        offerTimeout: 5 // Auto-collect timeout in seconds
    },

    // Win counter sound
    soundTickFrequency: 3, // Play tick sound every N steps
    soundTickBaseFrequency: 400, // Base frequency for tick sound
    soundTickFrequencyStep: 20, // Frequency increase per step

    // Win anticipation settings
    anticipation: {
        enabled: true,
        triggerChance: 0.25, // 25% chance to trigger anticipation effects
        flukeChance: 0.15, // 15% of anticipations are "near misses"
        dramaticDelayHigh: 800, // Extra delay for high-intensity anticipation (ms)
        dramaticDelayMedium: 400 // Extra delay for medium-intensity anticipation (ms)
    },

    // Performance budgets (ms) - warn if exceeded
    performanceBudgets: {
        spinTotal: 5000, // Total spin cycle should complete within 5s
        spinEvaluation: 50, // Win evaluation should complete within 50ms
        reelAnimation: 3500, // Reel animations should complete within 3.5s
        stateUpdate: 10, // State updates should complete within 10ms
        rendering: 16 // UI rendering should complete within 16ms (60fps)
    },

    // localStorage key
    storageKey: 'greedy_squirrel_save'
};
