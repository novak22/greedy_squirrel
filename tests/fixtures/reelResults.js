import { SYMBOLS } from '../../src/config/symbols.js';

const { WILD, CROWN, DIAMOND, MUSHROOM } = SYMBOLS;

export const wildOnlyAcrossMiddle = [
    [WILD.emoji, WILD.emoji, WILD.emoji],
    [WILD.emoji, WILD.emoji, WILD.emoji],
    [WILD.emoji, WILD.emoji, WILD.emoji],
    [WILD.emoji, WILD.emoji, WILD.emoji],
    [WILD.emoji, WILD.emoji, WILD.emoji]
];

export const wildSubstitutesCrown = [
    ['🍂', WILD.emoji, '🍂'],
    ['🌲', CROWN.emoji, '🌲'],
    ['🍄', CROWN.emoji, '🍄'],
    ['🌻', CROWN.emoji, '🌻'],
    ['🥜', CROWN.emoji, '🥜']
];

export const mixedWithNonPayingSpecials = [
    ['🍂', WILD.emoji, '🍂'],
    ['🌲', SYMBOLS.SCATTER.emoji, '🌲'],
    ['🍄', SYMBOLS.BONUS.emoji, '🍄'],
    ['🌻', WILD.emoji, '🌻'],
    ['🥜', WILD.emoji, '🥜']
];

export const deterministicReelStrip = [
    [WILD.emoji, CROWN.emoji, DIAMOND.emoji],
    [DIAMOND.emoji, MUSHROOM.emoji, CROWN.emoji]
];
