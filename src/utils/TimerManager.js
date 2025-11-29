export class TimerManager {
    constructor() {
        this.timers = new Map();
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

    clearByLabel(label) {
        for (const [handle, meta] of [...this.timers.entries()]) {
            if (meta.label === label) {
                this._clearHandle(handle, meta.type);
            }
        }
    }

    clearAll() {
        for (const [handle, meta] of [...this.timers.entries()]) {
            this._clearHandle(handle, meta.type);
        }
    }

    _clearHandle(handle, type) {
        if (type === 'interval') {
            clearInterval(handle);
        } else {
            clearTimeout(handle);
        }
        this.timers.delete(handle);
    }
}
