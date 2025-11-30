// Comprehensive statistics tracking
export class Statistics {
    constructor(game) {
        this.game = game;

        // Session stats (reset on page load)
        this.session = {
            startTime: Date.now(),
            spins: 0,
            wagered: 0,
            won: 0,
            biggestWin: 0,
            winCount: 0,
            lossCount: 0,
            currentStreak: 0,
            bestStreak: 0,
            freeSpinsTriggers: 0,
            bonusTriggers: 0,
            scatterHits: 0
        };

        // All-time stats (persisted)
        this.allTime = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            biggestWinBet: 0,
            biggestWinMultiplier: 0,
            scatterHits: 0,
            bonusHits: 0,
            freeSpinsTriggers: 0,
            cascadeWins: 0,
            maxScatters: 0,
            maxBetCount: 0,
            minBetCount: 0,
            winStreak: 0,
            bestWinStreak: 0,
            comebacks: 0,
            totalPlayTime: 0,
            lastPlayed: Date.now()
        };

        // Streak tracking
        this.currentWinStreak = 0;
        this.currentLossStreak = 0;
    }

    /**
     * Initialize from saved data
     */
    init(savedData) {
        if (savedData) {
            this.allTime = { ...this.allTime, ...savedData };
        }
    }

    /**
     * Record a spin
     */
    recordSpin(bet, won, isWin) {
        // Session stats
        this.session.spins++;
        this.session.wagered += bet;

        if (isWin) {
            this.session.won += won;
            this.session.winCount++;
            this.currentWinStreak++;
            this.currentLossStreak = 0;

            if (this.currentWinStreak > this.session.bestStreak) {
                this.session.bestStreak = this.currentWinStreak;
            }

            if (won > this.session.biggestWin) {
                this.session.biggestWin = won;
            }
        } else {
            this.session.lossCount++;
            this.currentLossStreak++;
            this.currentWinStreak = 0;
        }

        // All-time stats
        this.allTime.totalSpins++;
        this.allTime.totalWagered += bet;

        if (isWin) {
            this.allTime.totalWon += won;

            if (won > this.allTime.biggestWin) {
                this.allTime.biggestWin = won;
                this.allTime.biggestWinBet = bet;
                this.allTime.biggestWinMultiplier = Math.floor(won / bet);
            }
        }

        // Track win streak
        if (this.currentWinStreak > this.allTime.bestWinStreak) {
            this.allTime.bestWinStreak = this.currentWinStreak;
            this.allTime.winStreak = this.currentWinStreak;
        }

        // Track bet patterns
        if (bet === this.game.betOptions[this.game.betOptions.length - 1]) {
            this.allTime.maxBetCount++;
        }

        if (bet === this.game.betOptions[0]) {
            this.allTime.minBetCount++;
        }

        this.allTime.lastPlayed = Date.now();
    }

    /**
     * Record feature trigger
     */
    recordFeatureTrigger(feature, data = {}) {
        switch (feature) {
            case 'scatter':
                this.session.scatterHits++;
                this.allTime.scatterHits++;
                if (data.count > this.allTime.maxScatters) {
                    this.allTime.maxScatters = data.count;
                }
                break;

            case 'freeSpins':
                this.session.freeSpinsTriggers++;
                this.allTime.freeSpinsTriggers++;
                break;

            case 'bonus':
                this.session.bonusTriggers++;
                this.allTime.bonusHits++;
                break;

            case 'cascade':
                this.allTime.cascadeWins++;
                break;
        }
    }

    /**
     * Record comeback (going from 0 to 5000+)
     */
    recordComeback() {
        this.allTime.comebacks++;
    }

    /**
     * Get session time in ms
     */
    getSessionTime() {
        return Date.now() - this.session.startTime;
    }

    /**
     * Get session stats
     */
    getSessionStats() {
        const netProfit = this.session.won - this.session.wagered;
        const winRate =
            this.session.spins > 0
                ? ((this.session.winCount / this.session.spins) * 100).toFixed(1)
                : 0;
        const sessionTime = this.getSessionTime();

        return {
            ...this.session,
            sessionTime,
            netProfit,
            winRate
        };
    }

    /**
     * Get all-time stats
     */
    getAllTimeStats() {
        const netProfit = this.allTime.totalWon - this.allTime.totalWagered;
        const rtp =
            this.allTime.totalWagered > 0
                ? ((this.allTime.totalWon / this.allTime.totalWagered) * 100).toFixed(2)
                : 0;

        return {
            ...this.allTime,
            netProfit,
            rtp
        };
    }

    /**
     * Format time duration
     */
    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get save data
     */
    getSaveData() {
        // Add session time to total play time
        this.allTime.totalPlayTime += this.getSessionTime();

        return this.allTime;
    }
}
