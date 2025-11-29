// Feature configuration for bonus rounds and special features

export const FEATURES_CONFIG = {
    freeSpins: {
        // Scatter trigger requirements
        trigger: {
            minScatters: 3,
            scatterCounts: {
                3: 10,  // 3 scatters = 10 free spins
                4: 15,  // 4 scatters = 15 free spins
                5: 25   // 5 scatters = 25 free spins
            }
        },

        // Win multipliers during free spins
        multipliers: [2, 3], // Random between 2x and 3x

        // Can re-trigger with more scatters
        canRetrigger: true,

        // UI settings
        transitionDuration: 1500, // ms
        celebrationDuration: 2000 // ms
    },

    bonusGame: {
        // Bonus symbol trigger requirements
        trigger: {
            minBonusSymbols: 3
        },

        // Pick-me game settings
        pickGame: {
            minPicks: 3,
            maxPicks: 5,
            prizes: [
                { type: 'credits', min: 50, max: 500 },
                { type: 'multiplier', min: 2, max: 10 },
                { type: 'extraPick', value: 1 }
            ]
        },

        // UI settings
        transitionDuration: 1500,
        revealDelay: 300 // Delay between reveals
    },

    gamble: {
        maxWinAmount: 5000,      // Maximum win amount that can be gambled
        maxAttempts: 5,          // Maximum number of gamble attempts
        offerTimeout: 5          // Seconds before auto-collect
    },

    spinHistory: {
        maxEntries: 20           // Maximum number of spins to track in history
    },

    cascade: {
        enabled: false, // Will enable in this phase
        maxIterations: 20        // Safety limit to prevent infinite cascades

        // Multiplier progression for consecutive cascades
        multipliers: [1, 2, 3, 5, 8], // 1x, 2x, 3x, 5x, 8x

        // Animation timings
        removeDelay: 500,      // Time to show winning symbols before removal
        dropDelay: 300,        // Time for symbols to drop
        fillDelay: 300,        // Time for new symbols to fill
        evaluationDelay: 500,  // Time before checking for new wins

        // Visual settings
        particleCount: 20,
        particleColors: ['#cd853f', '#8b5a2b', '#daa520']
    }
};

export const GAME_STATES = {
    NORMAL: 'normal',
    FREE_SPINS: 'free_spins',
    BONUS_GAME: 'bonus_game',
    CASCADING: 'cascading'
};
