/**
 * StateManager - Centralized state management with observer pattern
 *
 * Responsibilities:
 * - Single source of truth for all game state
 * - Notify subscribers when state changes
 * - Support nested property paths (e.g., 'game.credits')
 * - Type-safe getters and setters
 *
 * Usage:
 *   const state = new StateManager(initialState);
 *   state.setState('game.credits', 1500);
 *   state.subscribe('game.credits', (newVal, oldVal) => { ... });
 */

export class StateManager {
    constructor(initialState = {}) {
        this.state = this.deepClone(initialState);
        this.subscribers = new Map(); // path -> [callbacks]
        this.wildcardSubscribers = []; // callbacks for '*'
    }

    /**
     * Get state value at path
     * @param {string} path - Dot-notation path (e.g., 'game.credits')
     * @returns {*} Value at path
     */
    getState(path = null) {
        if (!path) return this.deepClone(this.state);

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return value;
    }

    /**
     * Set state value at path and notify subscribers
     * @param {string} path - Dot-notation path
     * @param {*} value - New value
     * @param {boolean} silent - If true, don't notify subscribers
     */
    setState(path, value, silent = false) {
        const keys = path.split('.');
        const lastKey = keys.pop();

        // Navigate to parent object
        let parent = this.state;
        for (const key of keys) {
            if (!(key in parent)) {
                parent[key] = {};
            }
            parent = parent[key];
        }

        const oldValue = parent[lastKey];

        // Only update if value changed
        if (this.isEqual(oldValue, value)) {
            return;
        }

        parent[lastKey] = value;

        if (!silent) {
            this.notify(path, value, oldValue);
        }
    }

    /**
     * Update multiple state properties at once
     * @param {Object} updates - Object with path: value pairs
     */
    batchUpdate(updates) {
        const changes = [];

        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getState(path);
            this.setState(path, value, true); // Silent updates
            if (!this.isEqual(oldValue, value)) {
                changes.push({ path, value, oldValue });
            }
        }

        // Notify all changes at once
        changes.forEach(({ path, value, oldValue }) => {
            this.notify(path, value, oldValue);
        });
    }

    /**
     * Subscribe to state changes at specific path
     * @param {string} path - Path to watch, or '*' for all changes
     * @param {Function} callback - Callback(newValue, oldValue, path)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (path === '*') {
            this.wildcardSubscribers.push(callback);
            return () => {
                const index = this.wildcardSubscribers.indexOf(callback);
                if (index > -1) {
                    this.wildcardSubscribers.splice(index, 1);
                }
            };
        }

        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, []);
        }

        this.subscribers.get(path).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(path);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Notify subscribers of state change
     * @param {string} path - Path that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    notify(path, newValue, oldValue) {
        // Notify exact path subscribers
        const callbacks = this.subscribers.get(path);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    // Always log errors, not debug-only
                    console.error(`Error in state subscriber for "${path}":`, error);
                }
            });
        }

        // Notify parent path subscribers (e.g., 'game' when 'game.credits' changes)
        const parentPath = this.getParentPath(path);
        if (parentPath) {
            const parentCallbacks = this.subscribers.get(parentPath);
            if (parentCallbacks) {
                const parentValue = this.getState(parentPath);
                parentCallbacks.forEach(callback => {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (error) {
                        console.error(`Error in parent state subscriber for "${parentPath}":`, error);
                    }
                });
            }
        }

        // Notify wildcard subscribers
        this.wildcardSubscribers.forEach(callback => {
            try {
                callback(this.state, path);
            } catch (error) {
                console.error('Error in wildcard state subscriber:', error);
            }
        });
    }

    /**
     * Get parent path from dot-notation path
     * @param {string} path - e.g., 'game.credits'
     * @returns {string|null} - e.g., 'game', or null if no parent
     */
    getParentPath(path) {
        const keys = path.split('.');
        if (keys.length <= 1) return null;
        keys.pop();
        return keys.join('.');
    }

    /**
     * Reset entire state or specific path
     * @param {string} path - Optional path to reset, or null for entire state
     * @param {*} value - Value to reset to (default: {})
     */
    reset(path = null, value = {}) {
        if (!path) {
            this.state = this.deepClone(value);
            this.notify('*', this.state, undefined);
        } else {
            this.setState(path, value);
        }
    }

    /**
     * Get snapshot of current state for debugging
     * @returns {Object} Deep clone of state
     */
    getSnapshot() {
        return this.deepClone(this.state);
    }

    /**
     * Load state from snapshot
     * @param {Object} snapshot - State snapshot
     * @param {boolean} silent - If true, don't notify subscribers
     */
    loadSnapshot(snapshot, silent = false) {
        const oldState = this.state;
        this.state = this.deepClone(snapshot);

        if (!silent) {
            this.notify('*', this.state, oldState);
        }
    }

    /**
     * Deep clone an object (optimized for game state objects)
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        // Fast path for primitives and null
        if (obj === null || typeof obj !== 'object') return obj;

        // Handle special object types that need custom cloning
        if (obj instanceof Set) return new Set(obj);
        if (obj instanceof Map) return new Map(obj);
        if (obj instanceof Date) return new Date(obj);

        // For plain objects and arrays, use native JSON methods for speed
        // This is safe for game state which contains only JSON-serializable data
        try {
            // Check if object has only plain properties (no methods, symbols, etc.)
            if (Object.getPrototypeOf(obj) === Object.prototype || Array.isArray(obj)) {
                return JSON.parse(JSON.stringify(obj));
            }
        } catch (e) {
            // Fallback to recursive clone if JSON fails (circular refs, etc.)
        }

        // Fallback: recursive clone for complex objects
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Check if two values are equal
     * Uses shallow comparison for performance - sufficient for most game state updates
     * @param {*} a - First value
     * @param {*} b - Second value
     * @returns {boolean} True if equal
     */
    isEqual(a, b) {
        // Fast path: strict equality (primitives, same reference)
        if (a === b) return true;

        // Handle null/undefined
        if (a == null || b == null) return false;

        // Different types
        if (typeof a !== typeof b) return false;

        // For objects and arrays, use reference equality
        // This is intentional for performance - state updates should use new references
        // to trigger re-renders, following immutability patterns
        if (typeof a === 'object' && typeof b === 'object') {
            return a === b;
        }

        return false;
    }

    /**
     * Get all subscriber counts for debugging
     * @returns {Object} Map of path -> subscriber count
     */
    getSubscriberCounts() {
        const counts = {};
        for (const [path, callbacks] of this.subscribers.entries()) {
            counts[path] = callbacks.length;
        }
        counts['*'] = this.wildcardSubscribers.length;
        return counts;
    }

    /**
     * Clear all subscribers (useful for cleanup)
     */
    clearSubscribers() {
        this.subscribers.clear();
        this.wildcardSubscribers = [];
    }
}

/**
 * Create initial game state structure
 * @returns {Object} Initial state
 */
export function createInitialState() {
    return {
        game: {
            credits: 1000,
            currentBet: 10,
            currentBetIndex: 0,
            lastWin: 0,
            isSpinning: false,
            reelPositions: [0, 0, 0, 0, 0]
        },
        features: {
            freeSpins: {
                active: false,
                remaining: 0,
                total: 0,
                multiplier: 1,
                totalWins: 0
            },
            bonus: {
                active: false,
                picks: 0,
                totalWin: 0
            },
            cascade: {
                enabled: false,
                count: 0,
                multiplier: 1,
                totalWins: 0
            },
            gamble: {
                active: false,
                autoCollect: false
            }
        },
        ui: {
            reelResult: [[], [], [], [], []],
            winningPositions: new Set(),
            winningLines: [],
            showPaytable: false,
            showStats: false
        },
        controls: {
            turboMode: false,
            autoplay: false
        }
    };
}
