// Number formatting utilities

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @param {string} separator - Separator character (default: ',')
 * @returns {string} - Formatted number
 */
export function formatNumber(value, separator = ',') {
    // Handle undefined, null, or non-numeric values
    if (value === undefined || value === null) {
        console.warn('formatNumber received undefined/null:', value);
        return '0';
    }

    // Convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof numValue !== 'number' || !Number.isFinite(numValue)) {
        console.warn('formatNumber received invalid value:', value);
        return '0';
    }

    const rounded = Math.floor(numValue);
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
