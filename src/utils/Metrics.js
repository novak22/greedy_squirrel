import { Logger } from './Logger.js';
import { GAME_CONFIG } from '../config/game.js';

/**
 * Lightweight metrics helper for timing instrumentation.
 *
 * Use Metrics.startTimer(name, metadata) to capture durations and Metrics.record
 * to log ad-hoc data points. Provide a reporter via Metrics.setReporter(fn) to
 * forward metrics to a dashboard; otherwise metrics are written with Logger.debug
 * when debug mode is enabled.
 */
export class Metrics {
    static reporter = null;
    static budgets = GAME_CONFIG.performanceBudgets || {};

    /**
     * Register a metrics reporter. Reporters receive a single payload object
     * containing the metric name, timestamp, duration (if applicable), and any
     * metadata passed by the caller.
     * @param {(payload: Object) => void} reporter
     */
    static setReporter(reporter) {
        if (typeof reporter === 'function') {
            Metrics.reporter = reporter;
        }
    }

    /**
     * Record a metrics payload immediately.
     * @param {string} metric
     * @param {Object} data
     */
    static record(metric, data = {}) {
        const payload = {
            metric,
            timestamp: Date.now(),
            ...data
        };

        if (Metrics.reporter) {
            try {
                Metrics.reporter(payload);
                return;
            } catch (error) {
                Logger.error('Metrics reporter failed', error);
            }
        }

        Logger.debug(`[METRIC] ${metric}`, payload);
    }

    /**
     * Start a timer for duration-based metrics.
     * @param {string} metric
     * @param {Object} metadata
     * @returns {{ end: (extra?: Object) => number }}
     */
    static startTimer(metric, metadata = {}) {
        const hasPerformance =
            typeof performance !== 'undefined' && typeof performance.now === 'function';
        const start = hasPerformance ? performance.now() : Date.now();

        return {
            end: (extra = {}) => {
                const endTime = hasPerformance ? performance.now() : Date.now();
                const duration = endTime - start;

                // Check performance budget and warn if exceeded
                Metrics.checkBudget(metric, duration);

                Metrics.record(metric, { ...metadata, ...extra, duration });
                return duration;
            }
        };
    }

    /**
     * Check if a metric exceeds its performance budget and log a warning
     * @param {string} metric - Metric name (e.g., 'spin.total', 'spin.evaluation')
     * @param {number} duration - Measured duration in milliseconds
     */
    static checkBudget(metric, duration) {
        // Extract budget key from metric name (e.g., 'spin.total' -> 'spinTotal')
        const budgetKey = metric.replace(/\./g, '');
        const budget = Metrics.budgets[budgetKey];

        if (budget && duration > budget) {
            Logger.warn(
                `Performance budget exceeded for "${metric}": ${duration.toFixed(2)}ms (budget: ${budget}ms)`
            );
        }
    }
}
