import { GAME_CONFIG } from './game.js';
import { FEATURES_CONFIG, GAME_STATES } from './features.js';
import { PROGRESSION_CONFIG } from './progression.js';
import { SYMBOLS, SYMBOL_TYPES } from './symbols.js';

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isPositiveNumber = (value) => typeof value === 'number' && !Number.isNaN(value) && value > 0;
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

function validateGameConfig() {
    const errors = [];

    if (!isPositiveInteger(GAME_CONFIG.reelCount)) {
        errors.push('GAME_CONFIG.reelCount must be a positive integer');
    }

    if (!isPositiveInteger(GAME_CONFIG.rowCount)) {
        errors.push('GAME_CONFIG.rowCount must be a positive integer');
    }

    if (!isPositiveInteger(GAME_CONFIG.symbolsPerReel)) {
        errors.push('GAME_CONFIG.symbolsPerReel must be a positive integer');
    }

    if (!isNonEmptyArray(GAME_CONFIG.betOptions) || !GAME_CONFIG.betOptions.every(isPositiveInteger)) {
        errors.push('GAME_CONFIG.betOptions must be an array of positive integers');
    }

    if (!(typeof GAME_CONFIG.maxBetIncrementPercent === 'number' && GAME_CONFIG.maxBetIncrementPercent > 0 && GAME_CONFIG.maxBetIncrementPercent <= 1)) {
        errors.push('GAME_CONFIG.maxBetIncrementPercent must be a number between 0 and 1');
    }

    if (!(typeof GAME_CONFIG.targetRTP === 'number' && GAME_CONFIG.targetRTP > 0 && GAME_CONFIG.targetRTP <= 100)) {
        errors.push('GAME_CONFIG.targetRTP must be between 0 and 100');
    }

    if (!['low', 'medium', 'high'].includes(GAME_CONFIG.volatility)) {
        errors.push('GAME_CONFIG.volatility must be one of: low, medium, high');
    }

    if (!GAME_CONFIG.winThresholds || !isPositiveNumber(GAME_CONFIG.winThresholds.big) || !isPositiveNumber(GAME_CONFIG.winThresholds.mega)) {
        errors.push('GAME_CONFIG.winThresholds must include positive numbers for big and mega');
    }

    if (!isNonEmptyArray(GAME_CONFIG.paylines) || GAME_CONFIG.paylines.some(line => !Array.isArray(line) || line.length !== GAME_CONFIG.reelCount || line.some(index => !Number.isInteger(index) || index < 0 || index >= GAME_CONFIG.rowCount))) {
        errors.push('GAME_CONFIG.paylines must be arrays matching reelCount with row indices within rowCount');
    }

    if (!isNonEmptyArray(GAME_CONFIG.spinDurations) || GAME_CONFIG.spinDurations.length !== GAME_CONFIG.reelCount || GAME_CONFIG.spinDurations.some(duration => !isPositiveInteger(duration))) {
        errors.push('GAME_CONFIG.spinDurations must be positive integers matching reelCount');
    }

    const animationValues = GAME_CONFIG.animations || {};
    Object.entries(animationValues).forEach(([key, value]) => {
        if (!isPositiveInteger(value)) {
            errors.push(`GAME_CONFIG.animations.${key} must be a positive integer (ms)`);
        }
    });

    if (!isPositiveInteger(GAME_CONFIG.winDisplayDuration)) {
        errors.push('GAME_CONFIG.winDisplayDuration must be a positive integer');
    }

    if (!isPositiveInteger(GAME_CONFIG.messageDisplayDuration)) {
        errors.push('GAME_CONFIG.messageDisplayDuration must be a positive integer');
    }

    const autoplay = GAME_CONFIG.autoplay || {};
    if (!isPositiveInteger(autoplay.normalDelay) || !isPositiveInteger(autoplay.turboDelay)) {
        errors.push('GAME_CONFIG.autoplay delays must be positive integers (ms)');
    }

    const gamble = GAME_CONFIG.gamble || {};
    if (!isPositiveInteger(gamble.offerTimeout)) {
        errors.push('GAME_CONFIG.gamble.offerTimeout must be a positive integer (seconds)');
    }

    const anticipation = GAME_CONFIG.anticipation || {};
    const anticipationFields = ['triggerChance', 'flukeChance'];
    anticipationFields.forEach((field) => {
        if (!(typeof anticipation[field] === 'number' && anticipation[field] >= 0 && anticipation[field] <= 1)) {
            errors.push(`GAME_CONFIG.anticipation.${field} must be between 0 and 1`);
        }
    });

    ['dramaticDelayHigh', 'dramaticDelayMedium'].forEach((field) => {
        if (!isPositiveInteger(anticipation[field])) {
            errors.push(`GAME_CONFIG.anticipation.${field} must be a positive integer (ms)`);
        }
    });

    return errors;
}

function validateFeaturesConfig() {
    const errors = [];
    const freeSpins = FEATURES_CONFIG.freeSpins || {};

    if (!freeSpins.trigger || !isPositiveInteger(freeSpins.trigger.minScatters)) {
        errors.push('FEATURES_CONFIG.freeSpins.trigger.minScatters must be a positive integer');
    }

    if (!freeSpins.trigger || typeof freeSpins.trigger.scatterCounts !== 'object') {
        errors.push('FEATURES_CONFIG.freeSpins.trigger.scatterCounts must be defined');
    }

    if (!isNonEmptyArray(freeSpins.multipliers) || freeSpins.multipliers.some(multiplier => !isPositiveNumber(multiplier))) {
        errors.push('FEATURES_CONFIG.freeSpins.multipliers must be positive numbers');
    }

    const bonusGame = FEATURES_CONFIG.bonusGame || {};
    if (!bonusGame.trigger || !isPositiveInteger(bonusGame.trigger.minBonusSymbols)) {
        errors.push('FEATURES_CONFIG.bonusGame.trigger.minBonusSymbols must be a positive integer');
    }

    const pickGame = bonusGame.pickGame || {};
    if (!isPositiveInteger(pickGame.minPicks) || !isPositiveInteger(pickGame.maxPicks) || pickGame.minPicks > pickGame.maxPicks) {
        errors.push('FEATURES_CONFIG.bonusGame.pickGame minPicks/maxPicks must be positive integers with minPicks <= maxPicks');
    }

    if (!isNonEmptyArray(pickGame.prizes)) {
        errors.push('FEATURES_CONFIG.bonusGame.pickGame.prizes must contain at least one prize');
    }

    const gamble = FEATURES_CONFIG.gamble || {};
    if (!isPositiveInteger(gamble.maxWinAmount) || !isPositiveInteger(gamble.maxAttempts)) {
        errors.push('FEATURES_CONFIG.gamble.maxWinAmount and maxAttempts must be positive integers');
    }

    const cascade = FEATURES_CONFIG.cascade || {};
    if (cascade.enabled && (!isPositiveInteger(cascade.maxIterations) || !isNonEmptyArray(cascade.multipliers))) {
        errors.push('FEATURES_CONFIG.cascade requires valid maxIterations and multipliers when enabled');
    }

    return errors;
}

function validateProgressionConfig() {
    const errors = [];
    const levels = PROGRESSION_CONFIG.levels || {};

    if (!isPositiveInteger(levels.maxLevel)) {
        errors.push('PROGRESSION_CONFIG.levels.maxLevel must be a positive integer');
    }

    if (typeof levels.xpPerLevel !== 'function' || !isPositiveInteger(levels.xpPerLevel(1))) {
        errors.push('PROGRESSION_CONFIG.levels.xpPerLevel must be a function returning positive integers');
    }

    const xpSources = levels.xpSources || {};
    Object.entries(xpSources).forEach(([key, value]) => {
        if (!(typeof value === 'number' && value >= 0)) {
            errors.push(`PROGRESSION_CONFIG.levels.xpSources.${key} must be a non-negative number`);
        }
    });

    if (!Array.isArray(PROGRESSION_CONFIG.achievements)) {
        errors.push('PROGRESSION_CONFIG.achievements must be an array');
    } else if (PROGRESSION_CONFIG.achievements.some(achievement => !(achievement.id && typeof achievement.check === 'function'))) {
        errors.push('Each achievement requires an id and check function');
    }

    const dailyChallenges = PROGRESSION_CONFIG.dailyChallenges || {};
    if (!isNonEmptyArray(dailyChallenges.challenges)) {
        errors.push('PROGRESSION_CONFIG.dailyChallenges.challenges must be a non-empty array');
    }

    return errors;
}

function validateSymbolsConfig() {
    const errors = [];

    Object.entries(SYMBOLS).forEach(([key, symbol]) => {
        if (!symbol.emoji) {
            errors.push(`SYMBOLS.${key} is missing an emoji`);
        }
        if (!Object.values(SYMBOL_TYPES).includes(symbol.type)) {
            errors.push(`SYMBOLS.${key}.type must be one of the defined SYMBOL_TYPES`);
        }
        if (symbol.allowedReels && (!Array.isArray(symbol.allowedReels) || symbol.allowedReels.some(index => !Number.isInteger(index) || index < 0))) {
            errors.push(`SYMBOLS.${key}.allowedReels must contain non-negative integers`);
        }
        if (!isPositiveInteger(symbol.weight)) {
            errors.push(`SYMBOLS.${key}.weight must be a positive integer`);
        }
    });

    return errors;
}

export function validateConfigs() {
    const errors = [
        ...validateGameConfig(),
        ...validateFeaturesConfig(),
        ...validateProgressionConfig(),
        ...validateSymbolsConfig()
    ];

    return errors;
}

export function assertValidConfigs(logger) {
    const errors = validateConfigs();

    if (errors.length) {
        errors.forEach((error) => {
            if (logger && typeof logger.error === 'function') {
                logger.error(error);
            }
        });
    }

    return errors;
}

export { GAME_STATES };
