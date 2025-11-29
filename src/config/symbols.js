// Symbol configuration with weights and special properties
export const SYMBOL_TYPES = {
    WILD: 'WILD',
    SCATTER: 'SCATTER',
    BONUS: 'BONUS',
    REGULAR: 'REGULAR'
};

export const SYMBOLS = {
    WILD: {
        emoji: '🃏',
        type: SYMBOL_TYPES.WILD,
        name: 'Wild Card',
        description: 'Substitutes for all regular symbols',
        allowedReels: [1, 2, 3], // 0-indexed: reels 2, 3, 4
        weight: 5 // Lower = more rare
    },
    SCATTER: {
        emoji: '⭐',
        type: SYMBOL_TYPES.SCATTER,
        name: 'Lucky Star',
        description: 'Pays anywhere on reels - 3+ triggers Free Spins',
        allowedReels: [0, 1, 2, 3, 4], // Can appear on all reels
        weight: 3,
        payouts: {
            5: 500,
            4: 100,
            3: 20
        }
    },
    BONUS: {
        emoji: '🎁',
        type: SYMBOL_TYPES.BONUS,
        name: 'Bonus Gift',
        description: '3+ on payline triggers Pick-Me Bonus',
        allowedReels: [0, 2, 4], // 0-indexed: reels 1, 3, 5
        weight: 2
    },
    CROWN: {
        emoji: '👑',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Golden Crown',
        tier: 'premium',
        weight: 10,
        payouts: {
            5: 200,
            4: 40,
            3: 10
        }
    },
    DIAMOND: {
        emoji: '💎',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Diamond',
        tier: 'premium',
        weight: 12,
        payouts: {
            5: 150,
            4: 30,
            3: 8
        }
    },
    ACORN: {
        emoji: '🌰',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Premium Acorn',
        tier: 'premium',
        weight: 15,
        payouts: {
            5: 100,
            4: 25,
            3: 5
        }
    },
    PEANUT: {
        emoji: '🥜',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Peanuts',
        tier: 'premium',
        weight: 15,
        payouts: {
            5: 100,
            4: 25,
            3: 5
        }
    },
    SUNFLOWER: {
        emoji: '🌻',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Sunflower Seeds',
        weight: 20,
        payouts: {
            5: 80,
            4: 20,
            3: 4
        }
    },
    MUSHROOM: {
        emoji: '🍄',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Mushroom',
        weight: 25,
        payouts: {
            5: 60,
            4: 15,
            3: 3
        }
    },
    PINECONE: {
        emoji: '🌲',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Pine Cone',
        weight: 30,
        payouts: {
            5: 40,
            4: 10,
            3: 2
        }
    },
    LEAF: {
        emoji: '🍂',
        type: SYMBOL_TYPES.REGULAR,
        name: 'Autumn Leaf',
        weight: 35,
        payouts: {
            5: 20,
            4: 8,
            3: 2
        }
    }
};

// Get all symbol emojis as array
export function getAllSymbolEmojis() {
    return Object.values(SYMBOLS).map(s => s.emoji);
}

// Get symbol config by emoji
export function getSymbolByEmoji(emoji) {
    return Object.values(SYMBOLS).find(s => s.emoji === emoji);
}

// Get symbols allowed on specific reel
export function getSymbolsForReel(reelIndex) {
    return Object.values(SYMBOLS).filter(symbol => {
        if (!symbol.allowedReels) {
            return true; // If no restriction, allowed on all reels
        }
        return symbol.allowedReels.includes(reelIndex);
    });
}

// Get premium symbol emojis
export function getPremiumSymbols() {
    return Object.values(SYMBOLS)
        .filter(s => s.tier === 'premium')
        .map(s => s.emoji);
}

// Get high-value symbol emojis (for big win detection)
export function getHighValueSymbols() {
    return Object.values(SYMBOLS)
        .filter(s => s.type === SYMBOL_TYPES.REGULAR && s.tier === 'premium')
        .map(s => s.emoji);
}
