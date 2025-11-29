/**
 * GameState - Type-safe wrapper around StateManager for game-specific state
 *
 * Provides validated getters/setters for game state properties
 * Centralizes validation logic and ensures consistent state updates
 */

export class GameState {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    // ========== Credits ==========

    getCredits() {
        return this.stateManager.getState('game.credits') || 0;
    }

    setCredits(value) {
        if (typeof value !== 'number') {
            throw new Error(`Credits must be a number, got ${typeof value}`);
        }
        if (value < 0) {
            throw new Error(`Credits cannot be negative: ${value}`);
        }
        if (!Number.isFinite(value)) {
            throw new Error(`Credits must be finite: ${value}`);
        }

        this.stateManager.setState('game.credits', Math.floor(value));
    }

    addCredits(amount) {
        const current = this.getCredits();
        this.setCredits(current + amount);
    }

    deductCredits(amount) {
        const current = this.getCredits();
        if (current < amount) {
            throw new Error(`Insufficient credits: ${current} < ${amount}`);
        }
        this.setCredits(current - amount);
    }

    // ========== Bet ==========

    getCurrentBet() {
        return this.stateManager.getState('game.currentBet') || 10;
    }

    setCurrentBet(value) {
        if (typeof value !== 'number') {
            throw new Error(`Bet must be a number, got ${typeof value}`);
        }
        if (value <= 0) {
            throw new Error(`Bet must be positive: ${value}`);
        }

        this.stateManager.setState('game.currentBet', value);
    }

    getCurrentBetIndex() {
        return this.stateManager.getState('game.currentBetIndex') || 0;
    }

    setCurrentBetIndex(value) {
        if (typeof value !== 'number') {
            throw new Error(`Bet index must be a number, got ${typeof value}`);
        }
        if (value < 0) {
            throw new Error(`Bet index cannot be negative: ${value}`);
        }

        this.stateManager.setState('game.currentBetIndex', value);
    }

    // ========== Win ==========

    getLastWin() {
        return this.stateManager.getState('game.lastWin') || 0;
    }

    setLastWin(value) {
        if (typeof value !== 'number') {
            throw new Error(`Last win must be a number, got ${typeof value}`);
        }
        if (value < 0) {
            throw new Error(`Last win cannot be negative: ${value}`);
        }

        this.stateManager.setState('game.lastWin', Math.floor(value));
    }

    // ========== Spinning State ==========

    isSpinning() {
        return this.stateManager.getState('game.isSpinning') || false;
    }

    setSpinning(value) {
        if (typeof value !== 'boolean') {
            throw new Error(`Spinning state must be boolean, got ${typeof value}`);
        }

        this.stateManager.setState('game.isSpinning', value);
    }

    // ========== Reel Positions ==========

    getReelPositions() {
        return this.stateManager.getState('game.reelPositions') || [0, 0, 0, 0, 0];
    }

    setReelPositions(value) {
        if (!Array.isArray(value)) {
            throw new Error(`Reel positions must be an array, got ${typeof value}`);
        }
        if (value.length !== 5) {
            throw new Error(`Reel positions must have 5 elements, got ${value.length}`);
        }
        if (!value.every(pos => typeof pos === 'number' && pos >= 0)) {
            throw new Error(`All reel positions must be non-negative numbers`);
        }

        this.stateManager.setState('game.reelPositions', [...value]);
    }

    setReelPosition(reelIndex, position) {
        if (reelIndex < 0 || reelIndex > 4) {
            throw new Error(`Invalid reel index: ${reelIndex}`);
        }

        const positions = this.getReelPositions();
        positions[reelIndex] = position;
        this.setReelPositions(positions);
    }

    // ========== Batch Updates ==========

    /**
     * Update multiple state properties atomically
     * @param {Object} updates - Object with property names and values
     */
    batchUpdate(updates) {
        const stateUpdates = {};

        if ('credits' in updates) {
            this.validateCredits(updates.credits);
            stateUpdates['game.credits'] = Math.floor(updates.credits);
        }
        if ('currentBet' in updates) {
            this.validateBet(updates.currentBet);
            stateUpdates['game.currentBet'] = updates.currentBet;
        }
        if ('currentBetIndex' in updates) {
            this.validateBetIndex(updates.currentBetIndex);
            stateUpdates['game.currentBetIndex'] = updates.currentBetIndex;
        }
        if ('lastWin' in updates) {
            this.validateWin(updates.lastWin);
            stateUpdates['game.lastWin'] = Math.floor(updates.lastWin);
        }
        if ('isSpinning' in updates) {
            this.validateSpinning(updates.isSpinning);
            stateUpdates['game.isSpinning'] = updates.isSpinning;
        }

        this.stateManager.batchUpdate(stateUpdates);
    }

    // ========== Validation Helpers (private) ==========

    validateCredits(value) {
        if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
            throw new Error(`Invalid credits: ${value}`);
        }
    }

    validateBet(value) {
        if (typeof value !== 'number' || value <= 0) {
            throw new Error(`Invalid bet: ${value}`);
        }
    }

    validateBetIndex(value) {
        if (typeof value !== 'number' || value < 0) {
            throw new Error(`Invalid bet index: ${value}`);
        }
    }

    validateWin(value) {
        if (typeof value !== 'number' || value < 0) {
            throw new Error(`Invalid win amount: ${value}`);
        }
    }

    validateSpinning(value) {
        if (typeof value !== 'boolean') {
            throw new Error(`Invalid spinning state: ${value}`);
        }
    }

    // ========== Snapshot Management ==========

    /**
     * Create checkpoint for error recovery
     */
    createCheckpoint() {
        return {
            credits: this.getCredits(),
            lastWin: this.getLastWin(),
            isSpinning: this.isSpinning(),
            currentBet: this.getCurrentBet(),
            currentBetIndex: this.getCurrentBetIndex()
        };
    }

    /**
     * Restore from checkpoint
     */
    restoreCheckpoint(checkpoint) {
        this.batchUpdate(checkpoint);
    }

    // ========== Subscriptions ==========

    /**
     * Subscribe to credits changes
     */
    onCreditsChange(callback) {
        return this.stateManager.subscribe('game.credits', callback);
    }

    /**
     * Subscribe to bet changes
     */
    onBetChange(callback) {
        return this.stateManager.subscribe('game.currentBet', callback);
    }

    /**
     * Subscribe to spinning state changes
     */
    onSpinningChange(callback) {
        return this.stateManager.subscribe('game.isSpinning', callback);
    }

    /**
     * Subscribe to win changes
     */
    onWinChange(callback) {
        return this.stateManager.subscribe('game.lastWin', callback);
    }
}
