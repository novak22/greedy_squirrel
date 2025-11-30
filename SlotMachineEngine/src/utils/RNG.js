// Weighted Random Number Generator
export class RNG {
    /**
     * Create an RNG instance with symbol configuration
     * @param {Function} getSymbolsForReel - Function that returns available symbols for a reel
     */
    constructor(getSymbolsForReel = null) {
        this.getSymbolsForReel = getSymbolsForReel;
    }

    /**
     * Static factory method for backward compatibility
     * @param {Function} getSymbolsForReel - Function that returns available symbols for a reel
     * @returns {RNG} RNG instance
     */
    static create(getSymbolsForReel) {
        return new RNG(getSymbolsForReel);
    }
    /**
     * Generate weighted random symbol for a specific reel
     * @param {number} reelIndex - The reel index (0-4)
     * @returns {string} - Symbol emoji
     */
    getWeightedSymbol(reelIndex) {
        if (typeof reelIndex !== 'number' || reelIndex < 0) {
            throw new Error(`Invalid reel index: ${reelIndex}. Must be a non-negative number.`);
        }

        if (!this.getSymbolsForReel) {
            throw new Error('RNG not configured with getSymbolsForReel function');
        }

        const availableSymbols = this.getSymbolsForReel(reelIndex);

        if (!availableSymbols || availableSymbols.length === 0) {
            throw new Error(`No symbols available for reel ${reelIndex}`);
        }

        // Calculate total weight
        const totalWeight = availableSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);

        if (totalWeight <= 0) {
            throw new Error(`Invalid total weight for reel ${reelIndex}: ${totalWeight}`);
        }

        // Generate random number between 0 and totalWeight
        let random = Math.random() * totalWeight;

        // Select symbol based on weight
        for (const symbol of availableSymbols) {
            random -= symbol.weight;
            if (random <= 0) {
                return symbol.emoji;
            }
        }

        // Fallback (should never reach here)
        return availableSymbols[0].emoji;
    }

    /**
     * Generate a complete reel strip with weighted symbols
     * @param {number} reelIndex - The reel index (0-4)
     * @param {number} length - Length of the reel strip
     * @returns {Array<string>} - Array of symbol emojis
     */
    generateReelStrip(reelIndex, length) {
        if (typeof length !== 'number' || length <= 0) {
            throw new Error(`Invalid reel strip length: ${length}. Must be a positive number.`);
        }

        const strip = [];
        for (let i = 0; i < length; i++) {
            strip.push(this.getWeightedSymbol(reelIndex));
        }
        return strip;
    }

    /**
     * Get random position on reel strip (instance method)
     * @param {number} stripLength - Length of the reel strip
     * @returns {number} - Random position
     */
    getRandomPosition(stripLength) {
        if (typeof stripLength !== 'number' || stripLength <= 0) {
            throw new Error(`Invalid strip length: ${stripLength}. Must be a positive number.`);
        }

        return Math.floor(Math.random() * stripLength);
    }

    /**
     * Get symbols from reel strip at a given position (instance method)
     * @param {Array<string>} reelStrip - The reel strip
     * @param {number} position - Starting position
     * @param {number} count - Number of symbols to get
     * @returns {Array<string>} - Array of visible symbols
     */
    getSymbolsAtPosition(reelStrip, position, count) {
        if (!Array.isArray(reelStrip) || reelStrip.length === 0) {
            throw new Error('Invalid reel strip: must be a non-empty array');
        }

        if (typeof position !== 'number' || position < 0) {
            throw new Error(`Invalid position: ${position}. Must be a non-negative number.`);
        }

        if (typeof count !== 'number' || count <= 0) {
            throw new Error(`Invalid count: ${count}. Must be a positive number.`);
        }

        const symbols = [];
        for (let i = 0; i < count; i++) {
            const index = (position + i) % reelStrip.length;
            symbols.push(reelStrip[index]);
        }
        return symbols;
    }

    // Static methods for backward compatibility
    /**
     * Get random position on reel strip (static method)
     * @param {number} stripLength - Length of the reel strip
     * @returns {number} - Random position
     */
    static getRandomPosition(stripLength) {
        if (typeof stripLength !== 'number' || stripLength <= 0) {
            throw new Error(`Invalid strip length: ${stripLength}. Must be a positive number.`);
        }

        return Math.floor(Math.random() * stripLength);
    }

    /**
     * Get symbols from reel strip at a given position (static method)
     * @param {Array<string>} reelStrip - The reel strip
     * @param {number} position - Starting position
     * @param {number} count - Number of symbols to get
     * @returns {Array<string>} - Array of visible symbols
     */
    static getSymbolsAtPosition(reelStrip, position, count) {
        if (!Array.isArray(reelStrip) || reelStrip.length === 0) {
            throw new Error('Invalid reel strip: must be a non-empty array');
        }

        if (typeof position !== 'number' || position < 0) {
            throw new Error(`Invalid position: ${position}. Must be a non-negative number.`);
        }

        if (typeof count !== 'number' || count <= 0) {
            throw new Error(`Invalid count: ${count}. Must be a positive number.`);
        }

        const symbols = [];
        for (let i = 0; i < count; i++) {
            const index = (position + i) % reelStrip.length;
            symbols.push(reelStrip[index]);
        }
        return symbols;
    }
}
