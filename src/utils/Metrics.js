import { Logger } from './Logger.js';

/**
 * Lightweight metrics utility for timing and instrumentation.
 * Allows logging to the console (via Logger) and optional dashboard hooks via listeners.
 */
export class Metrics {
    static loggingEnabled = false;
    static listeners = new Set();

    /**
     * Initialize metrics logging and optional listener.
     * @param {Object} options
     * @param {boolean} [options.enableLogging=false] - Whether to mirror metrics to Logger.info
     * @param {Function} [options.listener] - Optional listener to receive metric payloads
     */
    static init({ enableLogging = false, listener } = {}) {
        Metrics.loggingEnabled = enableLogging;
        if (listener) {
            Metrics.onRecord(listener);
        }
    }

    /**
     * Register a listener for metrics events.
     * @param {Function} listener - Callback receiving the metric payload
     * @returns {Function} Unsubscribe function
     */
    static onRecord(listener) {
        Metrics.listeners.add(listener);
        return () => Metrics.listeners.delete(listener);
    }

    /**
     * Record a metric payload.
     * @param {string} name - Metric name
     * @param {Object} data - Additional metadata
     */
    static record(name, data = {}) {
        const payload = {
            name,
            timestamp: Date.now(),
            ...data
        };

        if (Metrics.loggingEnabled) {
            Logger.info(`[METRIC] ${name}`, payload);
        }

        Metrics.listeners.forEach(listener => {
            try {
                listener(payload);
            } catch (error) {
                Logger.warn('Metrics listener error', error);
            }
        });

        return payload;
    }

    /**
     * Create a timer that records its duration when invoked.
     * @param {string} name - Metric name
     * @param {Object} context - Metadata to include with the metric
     * @returns {Function} Stop function that records the metric when called
     */
    static time(name, context = {}) {
        const start = Metrics._now();
        return (extraData = {}) => {
            const duration = Metrics._now() - start;
            return Metrics.record(name, { duration, ...context, ...extraData });
        };
    }

    static _now() {
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
        }
        return Date.now();
    }
}
