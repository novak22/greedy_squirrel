// LocalStorage wrapper for game persistence
import { GAME_CONFIG } from '../config/game.js';

export class Storage {
    /**
     * Save game state to localStorage
     * @param {Object} gameState - The game state to save
     */
    static save(gameState) {
        try {
            const saveData = {
                credits: gameState.credits,
                currentBet: gameState.currentBet,
                currentBetIndex: gameState.currentBetIndex,
                stats: gameState.stats || {},
                timestamp: Date.now()
            };
            localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(saveData));
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    /**
     * Load game state from localStorage
     * @returns {Object|null} - Saved game state or null if none exists
     */
    static load() {
        try {
            const savedData = localStorage.getItem(GAME_CONFIG.storageKey);
            if (!savedData) {
                return null;
            }
            return JSON.parse(savedData);
        } catch (error) {
            console.error('Failed to load game state:', error);
            return null;
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
