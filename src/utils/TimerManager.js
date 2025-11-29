export class TimerManager {
    constructor() {
        this.timers = new Map();
        this.clearListeners = new Map(); // label -> [callbacks]
    }

    setTimeout(callback, delay, label = 'general') {
        const handle = setTimeout(() => {
            this.timers.delete(handle);
            callback();
        }, delay);
        this.timers.set(handle, { type: 'timeout', label });
        return handle;
    }

    setInterval(callback, delay, label = 'general') {
        const handle = setInterval(callback, delay);
        this.timers.set(handle, { type: 'interval', label });
        return handle;
    }

    clearTimeout(handle) {
        if (!handle) return;
        clearTimeout(handle);
        this.timers.delete(handle);
    }

    clearInterval(handle) {
        if (!handle) return;
        clearInterval(handle);
        this.timers.delete(handle);
    }

    /**
     * Register callback to be notified when timers with specific label are cleared
     * @param {string} label - Timer label to watch
     * @param {Function} callback - Function to call when timers are cleared
     * @returns {Function} Unregister function
     */
    onClear(label, callback) {
        if (!this.clearListeners.has(label)) {
            this.clearListeners.set(label, []);
        }
        this.clearListeners.get(label).push(callback);

        // Return unregister function
        return () => {
            const listeners = this.clearListeners.get(label);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    clearByLabel(label) {
        for (const [handle, meta] of [...this.timers.entries()]) {
            if (meta.label === label) {
                this._clearHandle(handle, meta.type);
            }
        }

        // Notify listeners
        this._notifyClearListeners(label);
    }

    clearAll() {
        const clearedLabels = new Set();
        for (const [handle, meta] of [...this.timers.entries()]) {
            this._clearHandle(handle, meta.type);
            clearedLabels.add(meta.label);
        }

        // Notify all affected listeners
        clearedLabels.forEach(label => this._notifyClearListeners(label));
    }

    _clearHandle(handle, type) {
        if (type === 'interval') {
            clearInterval(handle);
        } else {
            clearTimeout(handle);
        }
        this.timers.delete(handle);
    }

    _notifyClearListeners(label) {
        const listeners = this.clearListeners.get(label);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error(`Error in clear listener for "${label}":`, error);
                }
            });
        }
    }
}
