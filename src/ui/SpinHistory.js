// Spin History tracker - records last N spins for player reference

export class SpinHistory {
    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.isVisible = false;
    }

    /**
     * Record a spin result
     */
    recordSpin(bet, win, features = []) {
        const spinData = {
            timestamp: Date.now(),
            bet,
            win,
            profit: win - bet,
            multiplier: win > 0 ? (win / bet).toFixed(2) : 0,
            features, // ['freeSpins', 'bonus', 'cascade', etc.]
            isBigWin: win >= bet * 20
        };

        this.history.unshift(spinData); // Add to beginning

        // Keep only last N spins
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }
    }

    /**
     * Get all history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Get statistics from history
     */
    getStats() {
        if (this.history.length === 0) {
            return {
                totalSpins: 0,
                totalWagered: 0,
                totalWon: 0,
                netProfit: 0,
                winRate: 0,
                biggestWin: 0
            };
        }

        const totalWagered = this.history.reduce((sum, spin) => sum + spin.bet, 0);
        const totalWon = this.history.reduce((sum, spin) => sum + spin.win, 0);
        const wins = this.history.filter(spin => spin.win > 0).length;
        const biggestWin = Math.max(...this.history.map(spin => spin.win));

        return {
            totalSpins: this.history.length,
            totalWagered,
            totalWon,
            netProfit: totalWon - totalWagered,
            winRate: this.history.length > 0 ? ((wins / this.history.length) * 100).toFixed(1) : 0,
            biggestWin
        };
    }

    /**
     * Toggle history panel visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.updateUI();
    }

    /**
     * Show history panel
     */
    show() {
        this.isVisible = true;
        this.updateUI();
    }

    /**
     * Hide history panel
     */
    hide() {
        this.isVisible = false;
        this.updateUI();
    }

    /**
     * Update history panel UI
     */
    updateUI() {
        const panel = document.getElementById('historyPanel');
        if (!panel) return;

        if (this.isVisible) {
            panel.classList.add('show');
            this.renderHistory();
        } else {
            panel.classList.remove('show');
        }
    }

    /**
     * Render history items
     */
    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (this.history.length === 0) {
            container.innerHTML = '<div class="history-empty">No spins yet</div>';
            return;
        }

        const html = this.history.map((spin, index) => {
            const profitClass = spin.profit > 0 ? 'profit-positive' : spin.profit < 0 ? 'profit-negative' : 'profit-neutral';
            const timeAgo = this.formatTimeAgo(spin.timestamp);
            const featuresHTML = spin.features.length > 0 ? `<div class="history-features">${this.formatFeatures(spin.features)}</div>` : '';

            return `
                <div class="history-item ${spin.isBigWin ? 'big-win' : ''}">
                    <div class="history-item-header">
                        <span class="history-spin-number">#${this.history.length - index}</span>
                        <span class="history-time">${timeAgo}</span>
                    </div>
                    <div class="history-item-details">
                        <div class="history-bet">Bet: ${spin.bet}</div>
                        <div class="history-win ${spin.win > 0 ? 'has-win' : ''}">Win: ${spin.win}</div>
                        <div class="history-profit ${profitClass}">${spin.profit >= 0 ? '+' : ''}${spin.profit}</div>
                    </div>
                    ${spin.multiplier > 0 ? `<div class="history-multiplier">${spin.multiplier}x</div>` : ''}
                    ${featuresHTML}
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Update stats summary
        this.renderStats();
    }

    /**
     * Render history statistics summary
     */
    renderStats() {
        const statsContainer = document.getElementById('historyStats');
        if (!statsContainer) return;

        const stats = this.getStats();

        statsContainer.innerHTML = `
            <div class="history-stat">
                <span class="history-stat-label">Spins:</span>
                <span class="history-stat-value">${stats.totalSpins}/${this.maxHistory}</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-label">Win Rate:</span>
                <span class="history-stat-value">${stats.winRate}%</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-label">Net:</span>
                <span class="history-stat-value ${stats.netProfit >= 0 ? 'positive' : 'negative'}">${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit}</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-label">Best Win:</span>
                <span class="history-stat-value">${stats.biggestWin}</span>
            </div>
        `;
    }

    /**
     * Format features for display
     */
    formatFeatures(features) {
        const icons = {
            freeSpins: '⭐',
            bonus: '🎁',
            cascade: '🔥',
            scatter: '✨'
        };

        return features.map(feature => icons[feature] || feature).join(' ');
    }

    /**
     * Format time ago
     */
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            history: this.history,
            isVisible: this.isVisible
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        this.history = data.history || [];
        this.isVisible = data.isVisible || false;
        this.updateUI();
    }

    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this.updateUI();
    }
}
