/**
 * GameStateLoader - Handles save/load of game state
 *
 * Separates persistence logic from GameOrchestrator.
 * Coordinates loading data into all game subsystems.
 */

import { Storage } from '../utils/Storage.js';
import { Logger } from '../utils/Logger.js';

export class GameStateLoader {
    /**
     * Create GameStateLoader
     * @param {Object} dependencies - Explicit subsystem dependencies
     * @param {import('./GameState.js').GameState} dependencies.gameState
     * @param {import('../progression/LevelSystem.js').LevelSystem} dependencies.levelSystem
     * @param {import('../progression/Achievements.js').Achievements} dependencies.achievements
     * @param {import('../progression/Statistics.js').Statistics} dependencies.statistics
     * @param {import('../progression/DailyChallenges.js').DailyChallenges} dependencies.dailyChallenges
     * @param {import('../audio/SoundManager.js').SoundManager} dependencies.soundManager
     * @param {import('../effects/VisualEffects.js').VisualEffects} dependencies.visualEffects
     * @param {import('../features/TurboMode.js').TurboMode} dependencies.turboMode
     * @param {import('../features/Autoplay.js').Autoplay} dependencies.autoplay
     * @param {import('../features/Cascade.js').Cascade} dependencies.cascade
     * @param {import('../ui/SpinHistory.js').SpinHistory} dependencies.spinHistory
     * @param {() => boolean} dependencies.getAutoCollectEnabled
     * @param {(value: boolean) => void} dependencies.setAutoCollectEnabled
     */
    constructor({
        gameState,
        levelSystem,
        achievements,
        statistics,
        dailyChallenges,
        soundManager,
        visualEffects,
        turboMode,
        autoplay,
        cascade,
        spinHistory,
        getAutoCollectEnabled,
        setAutoCollectEnabled
    }) {
        this.gameState = gameState;
        this.levelSystem = levelSystem;
        this.achievements = achievements;
        this.statistics = statistics;
        this.dailyChallenges = dailyChallenges;
        this.soundManager = soundManager;
        this.visualEffects = visualEffects;
        this.turboMode = turboMode;
        this.autoplay = autoplay;
        this.cascade = cascade;
        this.spinHistory = spinHistory;
        this.getAutoCollectEnabled = getAutoCollectEnabled;
        this.setAutoCollectEnabled = setAutoCollectEnabled;
    }

    /**
     * Load game state from localStorage
     */
    load() {
        const savedData = Storage.load();

        // Load core state
        this.gameState.setCredits(savedData.credits);
        this.gameState.setCurrentBet(savedData.currentBet);
        this.gameState.setCurrentBetIndex(savedData.currentBetIndex);

        // Load progression systems
        this.levelSystem.init(savedData.progression.levelSystem);
        this.achievements.init(savedData.progression.achievements);
        this.dailyChallenges.init(savedData.progression.dailyChallenges);
        this.statistics.init(savedData.progression.statistics);

        // Load features (phase 4)
        this.soundManager.init(savedData.phase4.sound);
        this.visualEffects.init(savedData.phase4.visualEffects);
        this.turboMode.init(savedData.phase4.turboMode);
        this.autoplay.init(savedData.phase4.autoplay);
        this.cascade.init(savedData.phase4.cascade);

        // Load phase 5 features
        this.spinHistory.init(savedData.phase5.spinHistory);
        this.setAutoCollectEnabled(savedData.phase5.autoCollectEnabled);

        Logger.info('Game state loaded from localStorage');
    }

    /**
     * Save game state to localStorage
     */
    save() {
        const payload = Storage.createSavePayload({
            gameState: this.gameState,
            levelSystem: this.levelSystem,
            achievements: this.achievements,
            statistics: this.statistics,
            dailyChallenges: this.dailyChallenges,
            soundManager: this.soundManager,
            visualEffects: this.visualEffects,
            turboMode: this.turboMode,
            autoplay: this.autoplay,
            cascade: this.cascade,
            spinHistory: this.spinHistory,
            autoCollectEnabled: this.getAutoCollectEnabled()
        });
        Storage.save(payload);
    }

    /**
     * Clear all saved data
     */
    clear() {
        Storage.clear();
        Logger.info('Game state cleared from localStorage');
    }
}
