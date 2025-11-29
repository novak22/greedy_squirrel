// Progression system configuration (levels, achievements, daily rewards)

export const PROGRESSION_CONFIG = {
    levels: {
        maxLevel: 50,

        // XP required for each level (cumulative)
        xpPerLevel: (level) => {
            // Exponential growth: level * 100 * 1.1^level
            return Math.floor(level * 100 * Math.pow(1.1, level));
        },

        // XP earned per action
        xpSources: {
            spinBase: 1,           // Base XP per spin
            spinMultiplier: 0.1,   // Multiply by bet amount / 10
            winMultiplier: 0.05,   // Multiply by win amount / 20
            bigWin: 50,           // Win > 50x bet
            scatterHit: 25,       // Hit scatter symbols
            bonusRound: 100,      // Trigger bonus
            freeSpins: 75         // Trigger free spins
        },

        // Rewards and unlocks per level
        rewards: {
            5: { type: 'feature', value: 'autoplay', credits: 500 },
            10: { type: 'feature', value: 'turbo', credits: 1000 },
            15: { type: 'betIncrease', value: 500, credits: 1500 },
            20: { type: 'feature', value: 'cascade', credits: 2000 },
            25: { type: 'dailyBonus', value: 1000, credits: 2500 },
            30: { type: 'betIncrease', value: 1000, credits: 3000 },
            35: { type: 'multiplier', value: 1.1, credits: 4000 },
            40: { type: 'betIncrease', value: 2000, credits: 5000 },
            45: { type: 'multiplier', value: 1.2, credits: 7500 },
            50: { type: 'max', value: 'everything', credits: 10000 }
        }
    },

    achievements: [
        // Beginner achievements
        { id: 'first_spin', name: 'First Spin', description: 'Spin the reels for the first time', icon: '🎰', reward: 100, check: (stats) => stats.totalSpins >= 1 },
        { id: 'first_win', name: 'First Win', description: 'Win your first payout', icon: '💰', reward: 150, check: (stats) => stats.totalWon > 0 },
        { id: 'ten_spins', name: 'Getting Started', description: 'Play 10 spins', icon: '🔟', reward: 200, check: (stats) => stats.totalSpins >= 10 },

        // Spin milestones
        { id: 'hundred_spins', name: 'Persistent', description: 'Play 100 spins', icon: '💯', reward: 500, check: (stats) => stats.totalSpins >= 100 },
        { id: 'five_hundred_spins', name: 'Dedicated', description: 'Play 500 spins', icon: '🎯', reward: 1000, check: (stats) => stats.totalSpins >= 500 },
        { id: 'thousand_spins', name: 'Veteran', description: 'Play 1000 spins', icon: '👑', reward: 2500, check: (stats) => stats.totalSpins >= 1000 },

        // Win achievements
        { id: 'big_winner', name: 'Big Winner', description: 'Win 100x bet or more in a single spin', icon: '💎', reward: 300, check: (stats, lastWin, bet) => lastWin >= bet * 100 },
        { id: 'mega_win', name: 'Mega Win', description: 'Win 500x bet or more', icon: '🌟', reward: 1000, check: (stats, lastWin, bet) => lastWin >= bet * 500 },
        { id: 'lucky_streak', name: 'Lucky Streak', description: 'Win 5 consecutive spins', icon: '🍀', reward: 500, check: (stats) => stats.winStreak >= 5 },
        { id: 'millionaire', name: 'Millionaire', description: 'Reach 10,000 credits', icon: '💵', reward: 1000, check: (stats, lastWin, bet, credits) => credits >= 10000 },

        // Feature achievements
        { id: 'scatter_master', name: 'Scatter Master', description: 'Hit 5 scatter symbols', icon: '⭐', reward: 1500, check: (stats) => stats.maxScatters >= 5 },
        { id: 'free_spin_fan', name: 'Free Spin Fan', description: 'Trigger free spins 10 times', icon: '🎡', reward: 750, check: (stats) => stats.freeSpinsTriggers >= 10 },
        { id: 'free_spin_master', name: 'Free Spin Master', description: 'Trigger free spins 50 times', icon: '🎪', reward: 2000, check: (stats) => stats.freeSpinsTriggers >= 50 },
        { id: 'bonus_hunter', name: 'Bonus Hunter', description: 'Trigger bonus round 25 times', icon: '🎁', reward: 1000, check: (stats) => stats.bonusHits >= 25 },
        { id: 'cascade_king', name: 'Cascade King', description: 'Achieve 10 cascade wins', icon: '🔥', reward: 800, check: (stats) => stats.cascadeWins >= 10 },

        // Betting achievements
        { id: 'high_roller', name: 'High Roller', description: 'Bet maximum 50 times', icon: '💸', reward: 600, check: (stats) => stats.maxBetCount >= 50 },
        { id: 'conservative', name: 'Conservative', description: 'Play 100 spins at minimum bet', icon: '🐌', reward: 300, check: (stats) => stats.minBetCount >= 100 },

        // Time-based
        { id: 'marathon', name: 'Marathon Player', description: 'Play for 1 hour in one session', icon: '⏰', reward: 1500, check: (stats) => stats.sessionTime >= 3600000 },
        { id: 'comeback', name: 'Comeback Kid', description: 'Go from 0 credits back to 5000+', icon: '🔄', reward: 2000, check: (stats) => stats.comebacks >= 1 },

        // Special
        { id: 'explorer', name: 'Explorer', description: 'Unlock all features', icon: '🗺️', reward: 3000, check: (stats) => stats.level >= 20 },
        { id: 'perfectionist', name: 'Perfectionist', description: 'Unlock all achievements', icon: '🏆', reward: 5000, check: (stats, lastWin, bet, credits, achievements) => achievements.filter(a => a.unlocked).length >= 19 }
    ],

    dailyRewards: {
        // Consecutive day rewards
        rewards: [
            { day: 1, credits: 100, description: 'Welcome back!' },
            { day: 2, credits: 150, description: 'Day 2 streak!' },
            { day: 3, credits: 200, description: 'Building momentum!' },
            { day: 4, credits: 300, description: 'Keep it up!' },
            { day: 5, credits: 500, description: '5 day streak!' },
            { day: 6, credits: 750, description: 'Almost there!' },
            { day: 7, credits: 1000, description: 'Week complete!', bonus: 'freeSpins', bonusValue: 5 }
        ],

        // Resets if more than 24 hours since last claim
        streakTimeout: 86400000 // 24 hours in ms
    },

    dailyChallenges: {
        // 3 challenges refresh daily
        challenges: [
            { id: 'win_amount', name: 'Big Earner', description: 'Win {target} credits today', icon: '💰', targetGenerator: () => Math.floor(Math.random() * 2000) + 1000, reward: 300 },
            { id: 'trigger_freespins', name: 'Scatter Hunter', description: 'Trigger free spins {target} times', icon: '⭐', targetGenerator: () => Math.floor(Math.random() * 3) + 2, reward: 500 },
            { id: 'play_spins', name: 'Daily Grind', description: 'Play {target} spins', icon: '🎰', targetGenerator: () => Math.floor(Math.random() * 50) + 50, reward: 200 },
            { id: 'hit_scatters', name: 'Lucky Stars', description: 'Hit {target} scatter symbols', icon: '✨', targetGenerator: () => Math.floor(Math.random() * 10) + 10, reward: 250 },
            { id: 'trigger_bonus', name: 'Bonus Seeker', description: 'Trigger bonus round {target} times', icon: '🎁', targetGenerator: () => Math.floor(Math.random() * 2) + 1, reward: 400 },
            { id: 'big_win', name: 'Go Big', description: 'Get a win of {target}x bet or higher', icon: '💎', targetGenerator: () => Math.floor(Math.random() * 50) + 50, reward: 600 }
        ],

        // How many challenges per day
        challengesPerDay: 3,

        // Refresh time (midnight)
        getNextResetTime: () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow.getTime();
        }
    }
};

// Helper to get XP for level
export function getXPForLevel(level) {
    let totalXP = 0;
    for (let i = 1; i <= level; i++) {
        totalXP += PROGRESSION_CONFIG.levels.xpPerLevel(i);
    }
    return totalXP;
}

// Helper to get level from XP
export function getLevelFromXP(xp) {
    let level = 1;
    let totalXP = 0;

    while (level < PROGRESSION_CONFIG.levels.maxLevel) {
        const nextLevelXP = PROGRESSION_CONFIG.levels.xpPerLevel(level + 1);
        if (totalXP + nextLevelXP > xp) {
            break;
        }
        totalXP += nextLevelXP;
        level++;
    }

    return {
        level,
        currentLevelXP: xp - totalXP,
        nextLevelXP: PROGRESSION_CONFIG.levels.xpPerLevel(level + 1),
        totalXP: xp
    };
}
