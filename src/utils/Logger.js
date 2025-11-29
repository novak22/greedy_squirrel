/**
 * Logger utility for centralized, conditional logging
 *
 * Usage:
 *   import { Logger } from './utils/Logger.js';
 *   Logger.debug('My debug message', data);
 *   Logger.error('Error occurred', error);
 */

export class Logger {
    static debugMode = false;

    /**
     * Initialize logger with debug mode setting
     * @param {boolean} enabled - Enable debug mode
     */
    static init(enabled = false) {
        Logger.debugMode = enabled;
    }

    /**
     * Log debug messages (only in debug mode)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static debug(message, ...args) {
        if (Logger.debugMode) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log info messages (only in debug mode)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static info(message, ...args) {
        if (Logger.debugMode) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Log warnings (always shown)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }

    /**
     * Log errors (always shown)
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    static error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
}
