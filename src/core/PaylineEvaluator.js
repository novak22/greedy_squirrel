// Payline evaluation with WILD and SCATTER support
import { SYMBOLS, SYMBOL_TYPES, getSymbolByEmoji } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { Metrics } from '../utils/Metrics.js';

export class PaylineEvaluator {
    /**
     * Check all wins for a given reel result
     * @param {Array<Array<string>>} result - 2D array of symbols [reel][row]
     * @param {number} betAmount - Current bet amount
     * @returns {Object} - Win information
     */
    static evaluateWins(result, betAmount) {
        // Input validation
        if (!result || !Array.isArray(result)) {
            throw new Error('Invalid result: must be a 2D array of symbols');
        }
        if (result.length === 0 || !Array.isArray(result[0])) {
            throw new Error('Invalid result: must contain reel arrays');
        }
        if (typeof betAmount !== 'number' || betAmount <= 0) {
            throw new Error(`Invalid bet amount: ${betAmount}. Must be a positive number`);
        }

        const evalTimer = Metrics.startTimer('spin.evaluation', { betAmount });
        let totalWin = 0;
        const winningPositions = new Set();
        const winningLines = [];
        const winDetails = [];

        // Check payline wins
        const paylineWins = this.checkPaylineWins(result, betAmount);
        totalWin += paylineWins.totalWin;
        paylineWins.winningPositions.forEach(pos => winningPositions.add(pos));
        winningLines.push(...paylineWins.winningLines);
        winDetails.push(...paylineWins.details);

        // Check scatter wins (pays anywhere)
        const scatterWins = this.checkScatterWins(result, betAmount);
        totalWin += scatterWins.totalWin;
        scatterWins.winningPositions.forEach(pos => winningPositions.add(pos));
        if (scatterWins.details.length > 0) {
            winDetails.push(...scatterWins.details);
        }

        const response = {
            totalWin,
            winningPositions,
            winningLines,
            details: winDetails,
            hasScatterWin: scatterWins.totalWin > 0,
            scatterCount: scatterWins.count
        };

        evalTimer.end({ totalWin, scatterCount: scatterWins.count });

        return response;
    }

    /**
     * Check payline wins with WILD substitution
     * @param {Array<Array<string>>} result - 2D array of symbols
     * @param {number} betAmount - Current bet amount
     * @returns {Object} - Payline win information
     */
    static checkPaylineWins(result, betAmount) {
        let totalWin = 0;
        const winningPositions = new Set();
        const winningLines = [];
        const details = [];

        GAME_CONFIG.paylines.forEach((payline, lineIndex) => {
            const symbols = [];
            const positions = [];

            // Get symbols along the payline
            for (let i = 0; i < GAME_CONFIG.reelCount; i++) {
                const row = payline[i];
                const symbol = result[i][row];
                symbols.push(symbol);
                positions.push({ reel: i, row: row });
            }

            // Evaluate the payline with WILD substitution
            const lineWin = this.evaluatePayline(symbols, positions, betAmount);

            if (lineWin.win > 0) {
                totalWin += lineWin.win;
                winningLines.push(lineIndex);

                // Add winning positions
                for (let i = 0; i < lineWin.matchCount; i++) {
                    winningPositions.add(`${positions[i].reel}-${positions[i].row}`);
                }

                details.push({
                    type: 'payline',
                    lineIndex,
                    symbol: lineWin.symbol,
                    matchCount: lineWin.matchCount,
                    win: lineWin.win
                });
            }
        });

        return { totalWin, winningPositions, winningLines, details };
    }

    /**
     * Evaluate a single payline with WILD substitution
     * @param {Array<string>} symbols - Symbols on the payline
     * @param {Array<Object>} positions - Positions of symbols
     * @param {number} betAmount - Current bet amount
     * @returns {Object} - Win information for this payline
     */
    static evaluatePayline(symbols, positions, betAmount) {
        const wildEmoji = SYMBOLS.WILD.emoji;
        const scatterEmoji = SYMBOLS.SCATTER.emoji;
        const bonusEmoji = SYMBOLS.BONUS.emoji;

        /**
         * CRITICAL GAME DESIGN RULE: Wild Symbol Substitution Logic
         *
         * Wilds are SUBSTITUTES ONLY - they do not have their own payout value.
         * A payline containing ONLY wilds, scatters, or bonus symbols does NOT pay.
         *
         * This is intentional game design to balance RTP and matches industry standards.
         *
         * Example:
         * - [WILD, CROWN, CROWN, CROWN, CROWN] = PAYS (wild substitutes for crown)
         * - [WILD, WILD, WILD, WILD, WILD] = DOES NOT PAY (no base symbol)
         *
         * To change this behavior:
         * 1. Add payouts to SYMBOLS.WILD in symbols.js
         * 2. Modify this logic to allow wild-only wins
         * 3. Update RTP calculations accordingly
         */
        let baseSymbol = null;
        for (const symbol of symbols) {
            if (symbol !== wildEmoji && symbol !== scatterEmoji && symbol !== bonusEmoji) {
                baseSymbol = symbol;
                break;
            }
        }

        // If no base symbol found (all special symbols), no payline win
        if (!baseSymbol) {
            return { win: 0, matchCount: 0, symbol: null };
        }

        // Count consecutive matches from left with WILD substitution
        let matchCount = 0;
        for (const symbol of symbols) {
            if (symbol === baseSymbol || symbol === wildEmoji) {
                matchCount++;
            } else {
                break;
            }
        }

        // Check if we have a winning combination (3 or more)
        if (matchCount >= 3) {
            const symbolConfig = getSymbolByEmoji(baseSymbol);
            if (symbolConfig && symbolConfig.payouts && symbolConfig.payouts[matchCount]) {
                const payout = symbolConfig.payouts[matchCount];
                const win = payout * betAmount;
                return { win, matchCount, symbol: baseSymbol };
            }
        }

        return { win: 0, matchCount: 0, symbol: null };
    }

    /**
     * Check scatter wins (pays anywhere on reels)
     * @param {Array<Array<string>>} result - 2D array of symbols
     * @param {number} betAmount - Current bet amount
     * @returns {Object} - Scatter win information
     */
    static checkScatterWins(result, betAmount) {
        const scatterEmoji = SYMBOLS.SCATTER.emoji;
        const scatterPositions = [];

        // Count scatters anywhere on the reels
        for (let reel = 0; reel < result.length; reel++) {
            for (let row = 0; row < result[reel].length; row++) {
                if (result[reel][row] === scatterEmoji) {
                    scatterPositions.push({ reel, row });
                }
            }
        }

        const scatterCount = scatterPositions.length;
        let totalWin = 0;
        const winningPositions = new Set();
        const details = [];

        // Check if scatter count meets minimum for payout
        if (scatterCount >= 3) {
            // Use max payout if count exceeds defined payouts
            const payoutKey = Math.min(scatterCount, 5);
            const payout = SYMBOLS.SCATTER.payouts[payoutKey];

            if (payout) {
                totalWin = payout * betAmount;

                // Mark all scatter positions as winning
                scatterPositions.forEach(pos => {
                    winningPositions.add(`${pos.reel}-${pos.row}`);
                });

                details.push({
                    type: 'scatter',
                    symbol: scatterEmoji,
                    count: scatterCount,
                    win: totalWin
                });
            }
        }

        return { totalWin, winningPositions, details, count: scatterCount };
    }

    /**
     * Check for bonus symbol triggers
     * @param {Array<Array<string>>} result - 2D array of symbols
     * @returns {Object} - Bonus trigger information
     */
    static checkBonusTrigger(result) {
        const bonusEmoji = SYMBOLS.BONUS.emoji;
        const bonusPositions = [];

        // Count bonus symbols on any payline
        GAME_CONFIG.paylines.forEach((payline, lineIndex) => {
            let bonusCount = 0;
            const positions = [];

            for (let i = 0; i < GAME_CONFIG.reelCount; i++) {
                const row = payline[i];
                const symbol = result[i][row];
                if (symbol === bonusEmoji) {
                    bonusCount++;
                    positions.push({ reel: i, row });
                }
            }

            if (bonusCount >= 3) {
                bonusPositions.push({
                    lineIndex,
                    count: bonusCount,
                    positions
                });
            }
        });

        return {
            triggered: bonusPositions.length > 0,
            bonusLines: bonusPositions
        };
    }
}
