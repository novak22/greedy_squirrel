// Game configuration
export const GAME_CONFIG = {
    reelCount: 5,
    rowCount: 3,
    symbolsPerReel: 20,

    // Starting credits
    initialCredits: 1000,

    // Bet options
    betOptions: [10, 20, 50, 100, 200],

    // RTP configuration (Return to Player)
    targetRTP: 95.5, // Target 95.5% RTP

    // Volatility setting
    volatility: 'medium', // low, medium, high

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
        [0, 0, 1, 2, 2]  // Diagonal up
    ],

    // Spin animation timings (ms)
    spinDurations: [2000, 2300, 2600, 2900, 3200],

    // UI timings
    winDisplayDuration: 2000,
    messageDisplayDuration: 2000,

    // localStorage key
    storageKey: 'greedy_squirrel_save'
};
