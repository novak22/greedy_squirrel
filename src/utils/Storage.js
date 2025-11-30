// LocalStorage wrapper for game persistence with schema validation & migration
import { GAME_CONFIG } from '../config/game.js';
import { FEATURES_CONFIG } from '../config/features.js';

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_STATISTICS = {
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0,
    biggestWin: 0,
    biggestWinBet: 0,
    biggestWinMultiplier: 0,
    scatterHits: 0,
    bonusHits: 0,
    freeSpinsTriggers: 0,
    cascadeWins: 0,
    maxScatters: 0,
    maxBetCount: 0,
    minBetCount: 0,
    winStreak: 0,
    bestWinStreak: 0,
    comebacks: 0,
    totalPlayTime: 0,
    lastPlayed: Date.now()
};

const DEFAULT_SAVE_DATA = () => ({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    credits: GAME_CONFIG.initialCredits,
    currentBet: GAME_CONFIG.betOptions[0],
    currentBetIndex: 0,
    progression: {
        levelSystem: { xp: 0, unlockedFeatures: [] },
        achievements: { achievements: [] },
        dailyChallenges: { challenges: [], challengeProgress: {} },
        statistics: { ...DEFAULT_STATISTICS }
    },
    phase4: {
        sound: {
            enabled: true,
            volume: 0.5,
            musicEnabled: true,
            effectsEnabled: true
        },
        visualEffects: {
            particlesEnabled: true,
            animationsEnabled: true
        },
        turboMode: {
            isActive: false,
            unlocked: true
        },
        autoplay: {
            settings: {
                stopOnWin: false,
                stopOnBigWin: true,
                bigWinMultiplier: 50,
                stopOnFeature: false,
                stopOnBalance: false,
                balanceIncrease: 1000,
                stopOnBalanceLow: true,
                balanceLowLimit: 100
            }
        },
        cascade: {
            enabled: FEATURES_CONFIG.cascade.enabled
        }
    },
    phase5: {
        spinHistory: {
            history: [],
            isVisible: false
        },
        autoCollectEnabled: false
    },
    timestamp: Date.now()
});

export class Storage {
    static createDefaultSaveData() {
        return DEFAULT_SAVE_DATA();
    }

    static isValidNumber(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
    }

    static deepMerge(defaults, data) {
        const result = Array.isArray(defaults) ? [...defaults] : { ...defaults };

        Object.entries(data || {}).forEach(([key, value]) => {
            if (value === undefined || value === null) return;

            if (
                typeof value === 'object' &&
                !Array.isArray(value) &&
                typeof defaults[key] === 'object' &&
                defaults[key] !== null &&
                !Array.isArray(defaults[key])
            ) {
                result[key] = this.deepMerge(defaults[key], value);
            } else {
                result[key] = value;
            }
        });

        return result;
    }

    static applyMigrations(data) {
        let migrated = { ...data };

        // Migration: pre-schema saves -> schema version 1
        if (!migrated.schemaVersion || migrated.schemaVersion < 1) {
            migrated = this.deepMerge(this.createDefaultSaveData(), migrated);
            migrated.schemaVersion = 1;
        }

        migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
        return migrated;
    }

    static normalizeSaveData(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            return this.createDefaultSaveData();
        }

        const migrated = this.applyMigrations(rawData);
        const defaults = this.createDefaultSaveData();

        const merged = this.deepMerge(defaults, migrated);
        merged.credits = this.isValidNumber(merged.credits, defaults.credits);
        merged.currentBet = this.isValidNumber(merged.currentBet, defaults.currentBet);
        merged.currentBetIndex = this.isValidNumber(
            merged.currentBetIndex,
            defaults.currentBetIndex
        );
        merged.timestamp = Date.now();
        merged.schemaVersion = CURRENT_SCHEMA_VERSION;
        return merged;
    }

    static createSavePayload(game) {
        const base = this.createDefaultSaveData();

        const payload = {
            ...base,
            credits: game.state.getCredits(),
            currentBet: game.state.getCurrentBet(),
            currentBetIndex: game.state.getCurrentBetIndex(),
            progression: {
                levelSystem: game.levelSystem.getSaveData(),
                achievements: game.achievements.getSaveData(),
                dailyChallenges: game.dailyChallenges.getSaveData(),
                statistics: game.statistics.getSaveData()
            },
            phase4: {
                sound: game.soundManager.getSaveData(),
                visualEffects: game.visualEffects.getSaveData(),
                turboMode: game.turboMode.getSaveData(),
                autoplay: game.autoplay.getSaveData(),
                cascade: game.cascade.getSaveData()
            },
            phase5: {
                spinHistory: game.spinHistory.getSaveData(),
                autoCollectEnabled: game.autoCollectEnabled
            },
            timestamp: Date.now()
        };

        return this.deepMerge(base, payload);
    }

    /**
     * Save game state to localStorage
     * @param {Object} gameState - The game state to save
     */
    static save(gameState) {
        try {
            const normalized = this.normalizeSaveData(gameState);
            localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(normalized));
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    /**
     * Load game state from localStorage
     * @returns {Object} - Saved game state or default
     */
    static load() {
        try {
            const savedData = localStorage.getItem(GAME_CONFIG.storageKey);
            const parsed = savedData ? JSON.parse(savedData) : null;
            const normalized = this.normalizeSaveData(parsed);

            if (parsed && parsed.schemaVersion !== normalized.schemaVersion) {
                this.save(normalized);
            }

            return normalized;
        } catch (error) {
            console.error('Failed to load game state:', error);
            return this.createDefaultSaveData();
        }
    }

    /**
     * Clear saved game state
     */
    static clear() {
        try {
            localStorage.removeItem(GAME_CONFIG.storageKey);
        } catch (error) {
            console.error('Failed to clear game state:', error);
        }
    }

    /**
     * Check if save data exists
     * @returns {boolean}
     */
    static hasSaveData() {
        return localStorage.getItem(GAME_CONFIG.storageKey) !== null;
    }
}
