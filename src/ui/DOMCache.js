/**
 * DOMCache - Centralized DOM element caching
 *
 * Caches all frequently accessed DOM elements for performance.
 * Prevents repeated getElementById calls throughout the game.
 */

export class DOMCache {
    /**
     * Create DOMCache
     * @param {Object} existingDomObject - Optional existing dom object to populate (for backward compatibility)
     */
    constructor(existingDomObject = null) {
        this.target = existingDomObject || this;
        this.cache();
    }

    /**
     * Cache all DOM elements
     */
    cache() {
        const target = this.target;

        // Display elements
        target.credits = document.getElementById('credits');
        target.bet = document.getElementById('bet');
        target.betDisplay = document.getElementById('betDisplay');
        target.win = document.getElementById('win');

        // Control elements
        target.spinBtn = document.getElementById('spinBtn');
        target.increaseBet = document.getElementById('increaseBet');
        target.decreaseBet = document.getElementById('decreaseBet');
        target.maxBet = document.getElementById('maxBet');

        // Overlay elements
        target.winOverlay = document.getElementById('winOverlay');
        target.featureOverlay = document.getElementById('featureOverlay');

        // Modal elements
        target.paytableModal = document.getElementById('paytableModal');
        target.statsModal = document.getElementById('statsModal');
        target.statsContentArea = document.getElementById('statsContentArea');
        target.statsTabs = Array.from(document.querySelectorAll('.stats-tab'));
        target.paytableBtn = document.getElementById('paytableBtn');
        target.closePaytable = document.getElementById('closePaytable');
        target.statsBtn = document.getElementById('statsBtn');
        target.closeStats = document.getElementById('closeStats');
        target.historyBtn = document.getElementById('historyBtn');
        target.closeHistory = document.getElementById('closeHistory');

        // Containers
        target.gameContainer = document.querySelector('.game-container');
        target.slotMachineContainer = document.querySelector('.slot-machine');
        target.paylines = Array.from(document.querySelectorAll('.payline'));
        target.freeSpinsCounter = document.getElementById('freeSpinsCounter');

        // Advanced controls
        target.autoplayBtn = document.getElementById('autoplayBtn');
        target.turboBtn = document.getElementById('turboBtn');
        target.autoCollectBtn = document.getElementById('autoCollectBtn');
        target.autoplayCounter = document.getElementById('autoplayCounter');

        // Reel containers (cache these for frequent access)
        target.reels = [
            document.getElementById('reel-0'),
            document.getElementById('reel-1'),
            document.getElementById('reel-2'),
            document.getElementById('reel-3'),
            document.getElementById('reel-4')
        ];
    }

    /**
     * Get a cached element by key
     * @param {string} key - Element key
     * @returns {HTMLElement|null}
     */
    get(key) {
        return this[key] || null;
    }

    /**
     * Refresh cache (useful if DOM is rebuilt)
     */
    refresh() {
        this.cache();
    }
}
