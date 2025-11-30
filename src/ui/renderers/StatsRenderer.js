/**
 * StatsRenderer - Handles rendering of statistics HTML
 *
 * Separates presentation logic from business logic.
 * GameOrchestrator provides data, this class generates HTML.
 */

import { formatNumber } from '../../utils/formatters.js';

export class StatsRenderer {
    /**
     * Render stats based on tab type
     * @param {string} tab - Tab type: 'session', 'allTime', 'achievements', 'challenges'
     * @param {Object} data - Data object containing stats, achievements, challenges
     * @returns {string} HTML string
     */
    render(tab, data) {
        switch (tab) {
            case 'session':
                return this.renderSession(data.sessionStats);
            case 'allTime':
                return this.renderAllTime(data.allTimeStats);
            case 'achievements':
                return this.renderAchievements(data.achievements);
            case 'challenges':
                return this.renderChallenges();
            default:
                return '<p>Invalid tab</p>';
        }
    }

    /**
     * Render session statistics tab
     * @param {Object} stats - Session statistics
     * @returns {string} HTML string
     */
    renderSession(stats) {
        // Calculate derived stats (session stats don't include these pre-calculated)
        const rtp = stats.wagered > 0 ? (stats.won / stats.wagered) * 100 : 0;
        const hitFrequency = stats.spins > 0 ? (stats.winCount / stats.spins) * 100 : 0;
        const bonusFrequency = stats.spins > 0 ? (stats.bonusTriggers / stats.spins) * 100 : 0;
        const averageWin = stats.winCount > 0 ? stats.won / stats.winCount : 0;

        return `
            <h3 style="color: #ffd700; margin-bottom: 20px;">🎮 Current Session</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Spins</div>
                    <div class="stat-value">${formatNumber(stats.spins)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Bet</div>
                    <div class="stat-value">${formatNumber(stats.wagered)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Win</div>
                    <div class="stat-value">${formatNumber(stats.won)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">RTP</div>
                    <div class="stat-value">${rtp.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Best Win</div>
                    <div class="stat-value">${formatNumber(stats.biggestWin)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Hit Frequency</div>
                    <div class="stat-value">${hitFrequency.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Bonus Frequency</div>
                    <div class="stat-value">${bonusFrequency.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Win</div>
                    <div class="stat-value">${averageWin.toFixed(1)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render all-time statistics tab
     * @param {Object} stats - All-time statistics
     * @returns {string} HTML string
     */
    renderAllTime(stats) {
        return `
            <h3 style="color: #ffd700; margin-bottom: 20px;">📊 Lifetime Stats</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Spins</div>
                    <div class="stat-value">${formatNumber(stats.totalSpins)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Bet</div>
                    <div class="stat-value">${formatNumber(stats.totalBet)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Win</div>
                    <div class="stat-value">${formatNumber(stats.totalWin)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">RTP</div>
                    <div class="stat-value">${stats.rtp.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Best Win</div>
                    <div class="stat-value">${formatNumber(stats.bestWin)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Hit Frequency</div>
                    <div class="stat-value">${stats.hitFrequency.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Bonus Frequency</div>
                    <div class="stat-value">${stats.bonusFrequency.toFixed(1)}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Win</div>
                    <div class="stat-value">${stats.averageWin.toFixed(1)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render achievements tab
     * @param {Object} achievements - Achievement data
     * @param {Array} achievements.unlocked - Unlocked achievements
     * @param {Array} achievements.locked - Locked achievements
     * @param {Object} achievements.stats - Achievement statistics
     * @returns {string} HTML string
     */
    renderAchievements(achievements) {
        const { unlocked, locked, stats } = achievements;

        return `
            <h3 style="color: #ffd700; margin-bottom: 10px;">🏅 Achievements (${stats.unlocked}/${stats.total})</h3>
            <p style="text-align: center; color: #b0bec5; margin-bottom: 20px;">Completion: ${stats.completion}%</p>
            <div class="achievements-grid">
                ${unlocked
                    .map(
                        (a) => `
                    <div class="achievement-item unlocked">
                        <div class="achievement-item-icon">${a.icon}</div>
                        <div class="achievement-item-name">${a.name}</div>
                        <div class="achievement-item-desc">${a.description}</div>
                        <div class="achievement-item-reward">+${a.reward} Credits</div>
                        <div class="achievement-item-date">Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}</div>
                    </div>
                `
                    )
                    .join('')}
                ${locked
                    .map(
                        (a) => `
                    <div class="achievement-item locked">
                        <div class="achievement-item-icon">${a.icon}</div>
                        <div class="achievement-item-name">???</div>
                        <div class="achievement-item-desc">${a.description}</div>
                        <div class="achievement-item-reward">+${a.reward} Credits</div>
                    </div>
                `
                    )
                    .join('')}
            </div>
        `;
    }

    /**
     * Render challenges tab
     * Note: Challenges are rendered separately by DailyChallenges.updateChallengesUI()
     * This returns a placeholder container
     * @returns {string} HTML string
     */
    renderChallenges() {
        return `
            <h3 style="color: #ffd700; margin-bottom: 20px;">📅 Daily Challenges</h3>
            <div id="challengesListArea" style="margin-top: 30px;"></div>
        `;
    }
}
