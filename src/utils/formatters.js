// Number formatting utilities

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @param {string} separator - Separator character (default: ',')
 * @returns {string} - Formatted number
 */
export function formatNumber(value, separator = ',') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '0';
    }

    const rounded = Math.floor(value);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Format credits display
 * @param {number} credits - Credits value
 * @returns {string} - Formatted credits
 */
export function formatCredits(credits) {
    return formatNumber(credits, ',');
}

/**
 * Format win amount
 * @param {number} amount - Win amount
 * @returns {string} - Formatted win amount
 */
export function formatWin(amount) {
    return formatNumber(amount, ',');
}
