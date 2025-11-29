import { Logger } from '../utils/Logger.js';

export const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    STATE: 'STATE_ERROR',
    FEATURE: 'FEATURE_ERROR',
    SPIN: 'SPIN_ERROR',
    FREE_SPIN: 'FREE_SPIN_ERROR',
    NETWORK: 'NETWORK_ERROR',
    UNEXPECTED: 'UNEXPECTED_ERROR'
};

export class GameError extends Error {
    constructor(type, message, options = {}) {
        super(message);
        this.name = 'GameError';
        this.type = type;
        this.code = options.code;
        this.details = options.details;
        this.original = options.cause;
    }
}

export class ErrorHandler {
    static init(options = {}) {
        ErrorHandler.showMessage = options.showMessage;
    }

    static create(type, message, options = {}) {
        return new GameError(type, message, options);
    }

    static async handle(error, options = {}) {
        const {
            context = 'General',
            type = ERROR_TYPES.UNEXPECTED,
            userMessage,
            fallback
        } = options;

        const normalizedError = ErrorHandler.normalize(error, type);

        Logger.error(`[${context}] ${normalizedError.message}`, {
            type: normalizedError.type,
            code: normalizedError.code,
            details: normalizedError.details,
            error
        });

        const message = userMessage || ErrorHandler.getUserMessage(normalizedError);
        if (ErrorHandler.showMessage) {
            await ErrorHandler.showMessage(message);
        }

        if (typeof fallback === 'function') {
            try {
                await fallback(normalizedError);
            } catch (fallbackError) {
                Logger.error(`[${context}] Fallback handler failed`, fallbackError);
            }
        }

        return normalizedError;
    }

    static normalize(error, defaultType = ERROR_TYPES.UNEXPECTED) {
        if (error instanceof GameError) {
            return error;
        }

        const message = error?.message || 'Unexpected error occurred';
        return new GameError(defaultType, message, { cause: error });
    }

    static getUserMessage(error) {
        switch (error.type) {
            case ERROR_TYPES.VALIDATION:
                return 'CHECK YOUR INPUT AND TRY AGAIN';
            case ERROR_TYPES.STATE:
                return 'STATE OUT OF SYNC - RESTORING SAFE VALUES';
            case ERROR_TYPES.FEATURE:
                return 'FEATURE TEMPORARILY UNAVAILABLE';
            case ERROR_TYPES.SPIN:
                return 'SPIN FAILED - BET REFUNDED';
            case ERROR_TYPES.FREE_SPIN:
                return 'FREE SPINS INTERRUPTED - RESUMING NORMAL PLAY';
            case ERROR_TYPES.NETWORK:
                return 'NETWORK ISSUE - PLEASE RETRY';
            default:
                return 'SOMETHING WENT WRONG - PLEASE TRY AGAIN';
        }
    }
}
