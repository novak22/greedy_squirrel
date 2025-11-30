/**
 * StatsController - Manages statistics display and interactions
 *
 * Separates stats management logic from GameOrchestrator.
 * Coordinates between progression systems (Statistics, Achievements, DailyChallenges)
 * and the UI rendering layer (StatsRenderer).
 */

export class StatsController {
    /**
     * Create StatsController
     * @param {Object} options - Configuration options
     * @param {Object} options.statistics - Statistics instance
     * @param {Object} options.achievements - Achievements instance
     * @param {Object} options.dailyChallenges - DailyChallenges instance
     * @param {Object} options.renderer - StatsRenderer instance
     * @param {Object} options.ui - UI facade for rendering
     * @param {Object} options.stateManager - StateManager instance (for UI state)
     */
    constructor({ statistics, achievements, dailyChallenges, renderer, ui, stateManager }) {
        this.statistics = statistics;
        this.achievements = achievements;
        this.dailyChallenges = dailyChallenges;
        this.renderer = renderer;
        this.ui = ui;
        this.stateManager = stateManager;
        this.currentTab = 'session';
    }

    /**
     * Toggle statistics modal
     */
    toggle() {
        const shouldShow = !this.stateManager.select('ui.statsOpen');

        if (shouldShow) {
            this.currentTab = 'session';
            this.updateDisplay('session');
        }

        this.stateManager.update('ui.statsOpen', shouldShow);
        this.ui.toggleStatsModal(shouldShow);
    }

    /**
     * Update statistics display for a specific tab
     * @param {string} tab - Tab to display: 'session', 'allTime', 'achievements', 'challenges'
     */
    updateDisplay(tab = 'session') {
        this.currentTab = tab;

        // Update active tab UI
        this.ui.setActiveStatsTab(tab);

        // Gather data from progression systems
        const data = {
            sessionStats: this.statistics.getSessionStats(),
            allTimeStats: this.statistics.getAllTimeStats(),
            achievements: {
                unlocked: this.achievements.getUnlocked(),
                locked: this.achievements.getLocked(),
                stats: this.achievements.getStats()
            }
        };

        // Render HTML using dedicated renderer
        const html = this.renderer.render(tab, data);
        this.ui.renderStatsContent(html);

        // Special case: challenges need additional rendering
        if (tab === 'challenges') {
            this.dailyChallenges.updateChallengesUI();
        }
    }

    /**
     * Get current tab
     * @returns {string}
     */
    getCurrentTab() {
        return this.currentTab;
    }
}
