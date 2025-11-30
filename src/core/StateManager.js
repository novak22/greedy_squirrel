/**
 * StateManager - Centralized state management with observer pattern
 *
 * Responsibilities:
 * - Single source of truth for all game state
 * - Notify subscribers when state changes
 * - Support nested property paths (e.g., 'game.credits')
 * - Immutable updates with versioning safeguards
 *
 * Usage:
 *   const state = new StateManager(initialState);
 *   state.update('game.credits', 1500);
 *   state.subscribe('game.credits', (newVal, oldVal) => { ... });
 */

export class StateManager {
    constructor(initialState = {}) {
        this.state = this.deepClone(initialState);
        this.subscribers = new Map(); // path -> [callbacks]
        this.wildcardSubscribers = []; // callbacks for '*'
        this.version = 0; // increments on every mutation
    }

    /**
     * Internal getter that returns the raw state reference for equality checks
     * @param {string|null} path
     * @returns {*} Raw value
     */
    getValueAtPath(path = null) {
        if (!path) return this.state;

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return value;
    }

    /**
     * Read state value at path.
     * Returns a cloned value to prevent external mutation of internal state.
     * @param {string|null} path - Dot-notation path (e.g., 'game.credits')
     * @returns {*} Cloned value at path
     */
    select(path = null) {
        if (!path) return this.deepClone(this.state);

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return this.deepClone(value);
    }

    /**
     * Apply an immutable update to the state and notify subscribers.
     * @param {string} path - Dot-notation path
     * @param {*} value - New value or updater function(prevValue)
     * @param {Object} options
     * @param {boolean} options.silent - If true, don't notify subscribers
     * @param {number} [options.expectedVersion] - Optional optimistic lock guard
     */
    update(path, value, { silent = false, expectedVersion } = {}) {
        if (expectedVersion !== undefined && expectedVersion !== this.version) {
            throw new Error(
                `State version mismatch. Expected ${expectedVersion}, actual ${this.version}`
            );
        }

        const keys = path.split('.');
        const lastKey = keys[keys.length - 1];
        const currentValue = this.getValueAtPath(path);
        const oldValue = this.deepClone(currentValue);

        const newValue = typeof value === 'function' ? value(oldValue) : value;
        if (this.isEqual(currentValue, newValue)) {
            return;
        }

        const nextState = Array.isArray(this.state) ? [...this.state] : { ...this.state };
        let cursorOld = this.state;
        let cursorNew = nextState;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const sourceChild = cursorOld?.[key];
            const clonedChild = Array.isArray(sourceChild)
                ? [...sourceChild]
                : sourceChild && typeof sourceChild === 'object'
                  ? { ...sourceChild }
                  : {};

            cursorNew[key] = clonedChild;
            cursorOld = sourceChild || {};
            cursorNew = clonedChild;
        }

        const finalValue = this.deepClone(newValue);
        cursorNew[lastKey] = finalValue;

        const previousState = this.state;
        this.state = nextState;
        this.version += 1;

        if (!silent) {
            this.notify(path, finalValue, oldValue);
        }

        return { state: this.select(), previousState, version: this.version };
    }

    /**
     * Update multiple state properties at once
     * @param {Object} updates - Object with path: value pairs
     */
    batchUpdate(updates) {
        const changes = [];

        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.deepClone(this.getValueAtPath(path));
            const result = this.update(path, value, { silent: true });
            if (result && !this.isEqual(oldValue, value)) {
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
            callbacks.forEach((callback) => {
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
                const parentValue = this.select(parentPath);
                parentCallbacks.forEach((callback) => {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (error) {
                        console.error(
                            `Error in parent state subscriber for "${parentPath}":`,
                            error
                        );
                    }
                });
            }
        }

        // Notify wildcard subscribers
        this.wildcardSubscribers.forEach((callback) => {
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
            this.version += 1;
            this.notify('*', this.state, undefined);
        } else {
            this.update(path, value);
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
     * Read the current state version for optimistic updates
     * @returns {number}
     */
    getVersion() {
        return this.version;
    }

    /**
     * Load state from snapshot
     * @param {Object} snapshot - State snapshot
     * @param {boolean} silent - If true, don't notify subscribers
     */
    loadSnapshot(snapshot, silent = false) {
        const oldState = this.state;
        this.state = this.deepClone(snapshot);
        this.version += 1;

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
            return obj.map((item) => this.deepClone(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
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
