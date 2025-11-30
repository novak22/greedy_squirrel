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
     * @param {Object} game - Game instance with all subsystems
     */
    constructor(game) {
        this.game = game;
    }

    /**
     * Load game state from localStorage
     */
    load() {
        const savedData = Storage.load();

        // Load core state
        this.game.state.setCredits(savedData.credits);
        this.game.state.setCurrentBet(savedData.currentBet);
        this.game.state.setCurrentBetIndex(savedData.currentBetIndex);

        // Load progression systems
        this.game.levelSystem.init(savedData.progression.levelSystem);
        this.game.achievements.init(savedData.progression.achievements);
        this.game.dailyChallenges.init(savedData.progression.dailyChallenges);
        this.game.statistics.init(savedData.progression.statistics);

        // Load features (phase 4)
        this.game.soundManager.init(savedData.phase4.sound);
        this.game.visualEffects.init(savedData.phase4.visualEffects);
        this.game.turboMode.init(savedData.phase4.turboMode);
        this.game.autoplay.init(savedData.phase4.autoplay);
        this.game.cascade.init(savedData.phase4.cascade);

        // Load phase 5 features
        this.game.spinHistory.init(savedData.phase5.spinHistory);
        this.game.autoCollectEnabled = savedData.phase5.autoCollectEnabled;

        Logger.info('Game state loaded from localStorage');
    }

    /**
     * Save game state to localStorage
     */
    save() {
        const payload = Storage.createSavePayload(this.game);
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
