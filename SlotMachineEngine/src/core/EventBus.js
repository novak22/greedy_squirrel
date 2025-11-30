/**
 * EventBus - Centralized event system for decoupling game components
 *
 * Purpose: Allow features to communicate without direct dependencies
 *
 * Example usage:
 *   // Subscribe to events
 *   eventBus.on('feature:triggered', (data) => {
 *       console.log('Feature triggered:', data.type);
 *   });
 *
 *   // Emit events
 *   eventBus.emit('feature:triggered', { type: 'freeSpins', count: 10 });
 *
 * Benefits:
 * - Features don't need direct references to each other
 * - Easy to add new features without modifying existing code
 * - Testable - can mock event subscriptions
 * - Clear event contracts
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first trigger)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }

        this.onceListeners.get(event).push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.onceListeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Data to pass to subscribers
     */
    emit(event, data = null) {
        // Call regular listeners
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }

        // Call once listeners and remove them
        const onceListeners = this.onceListeners.get(event);
        if (onceListeners && onceListeners.length > 0) {
            // Copy array to avoid modification during iteration
            const callbacks = [...onceListeners];
            this.onceListeners.set(event, []);

            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in one-time event listener for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name (optional, clears all if not provided)
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    /**
     * Get number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const regular = this.listeners.get(event)?.length || 0;
        const once = this.onceListeners.get(event)?.length || 0;
        return regular + once;
    }

    /**
     * Get all registered event names
     * @returns {Array<string>} Event names
     */
    eventNames() {
        const names = new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
        return Array.from(names);
    }
}

/**
 * Standard game events
 */
export const GAME_EVENTS = {
    // Spin lifecycle
    SPIN_START: 'spin:start',
    SPIN_END: 'spin:end',
    REEL_STOPPED: 'reel:stopped',

    // Wins
    WIN: 'win:detected',
    BIG_WIN: 'win:big',
    MEGA_WIN: 'win:mega',

    // Features
    FEATURE_TRIGGERED: 'feature:triggered',
    FREE_SPINS_START: 'freeSpins:start',
    FREE_SPINS_END: 'freeSpins:end',
    BONUS_START: 'bonus:start',
    BONUS_END: 'bonus:end',
    CASCADE_START: 'cascade:start',
    CASCADE_END: 'cascade:end',

    // Progression
    LEVEL_UP: 'level:up',
    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
    CHALLENGE_COMPLETED: 'challenge:completed',

    // UI
    CREDITS_CHANGED: 'credits:changed',
    BET_CHANGED: 'bet:changed',

    // Audio
    SOUND_PLAY: 'sound:play',
    MUSIC_CHANGE: 'music:change',

    // Game state
    GAME_OVER: 'game:over',
    GAME_RESET: 'game:reset'
};
