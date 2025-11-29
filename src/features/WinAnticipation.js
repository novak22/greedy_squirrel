// Win Anticipation System - Near-miss effects and dramatic reel reveals

export class WinAnticipation {
    constructor(slotMachine) {
        this.game = slotMachine;
        this.enabled = true;
        this.anticipationActive = false;
        this.triggerChance = 0.25; // 25% chance to even consider anticipation
        this.flukeChance = 0.15; // 15% of anticipations are "flukes" (false excitement)
    }

    /**
     * Check if we should trigger anticipation effects
     * Called after each reel stops to evaluate potential wins
     */
    checkAnticipation(stoppedReels, result, finalResult) {
        if (!this.enabled || stoppedReels < 2) return null;

        // Random chance gate - most spins don't trigger anticipation at all
        if (Math.random() > this.triggerChance) return null;

        // Peek at final result to decide if we should trigger (with some flukes)
        const willBeFluke = Math.random() < this.flukeChance;

        // Check for scatter anticipation (2+ scatters visible)
        const scatterCount = this.countVisibleScatters(result, stoppedReels);
        if (scatterCount >= 2 && stoppedReels < 5) {
            // Peek: will there be 3+ scatters in final result?
            const finalScatters = finalResult ? this.countVisibleScatters(finalResult, 5) : 0;

            // Trigger if: actually getting feature, OR it's a fluke near-miss
            if (finalScatters >= 3 || (willBeFluke && scatterCount === 2)) {
                return {
                    type: 'scatter',
                    intensity: scatterCount === 2 ? 'medium' : 'high'
                };
            }
        }

        // Check for bonus symbol anticipation
        const bonusCount = this.countBonusOnPayline(result, stoppedReels);
        if (bonusCount >= 2 && stoppedReels < 5) {
            // Peek: will there be 3+ bonus symbols?
            const finalBonus = finalResult ? this.countBonusOnPayline(finalResult, 5) : 0;

            if (finalBonus >= 3 || (willBeFluke && bonusCount === 2)) {
                return {
                    type: 'bonus',
                    intensity: bonusCount === 2 ? 'medium' : 'high'
                };
            }
        }

        // Check for potential big win on paylines
        if (stoppedReels >= 2) {
            const bigWinPotential = this.checkBigWinPotential(result, stoppedReels);
            if (bigWinPotential) {
                // Peek: will there actually be a good win?
                const willHaveBigWin = finalResult ? this.willHaveBigWin(finalResult) : false;

                if (willHaveBigWin || willBeFluke) {
                    return {
                        type: 'bigwin',
                        intensity: 'medium'
                    };
                }
            }
        }

        return null;
    }

    /**
     * Count scatter symbols visible on stopped reels
     */
    countVisibleScatters(result, stoppedReels) {
        let count = 0;
        for (let reel = 0; reel < stoppedReels; reel++) {
            for (let row = 0; row < 3; row++) {
                if (result[reel] && result[reel][row] === '⭐') {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Count bonus symbols on payline positions
     */
    countBonusOnPayline(result, stoppedReels) {
        // Check main payline (middle row) for bonus symbols
        let count = 0;
        const bonusReels = [0, 2, 4]; // Bonus appears on reels 1, 3, 5

        for (let i = 0; i < stoppedReels; i++) {
            if (bonusReels.includes(i) && result[i] && result[i][1] === '🎁') {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if there's potential for a big win
     */
    checkBigWinPotential(result, stoppedReels) {
        // Check main payline for matching high-value symbols
        const highValueSymbols = ['👑', '💎', '🌰', '🥜'];

        if (stoppedReels >= 2) {
            const firstSymbol = result[0][1]; // Middle row of first reel
            const secondSymbol = result[1][1]; // Middle row of second reel

            // If first two symbols match and are high-value
            if (firstSymbol === secondSymbol && highValueSymbols.includes(firstSymbol)) {
                return true;
            }

            // Check if we have a wild that could lead to a match
            if (firstSymbol === '🃏' || secondSymbol === '🃏') {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if final result will have a big win (4+ matching symbols)
     */
    willHaveBigWin(finalResult) {
        if (!finalResult || finalResult.length < 4) return false;

        // Check main payline (middle row) for 4+ matching symbols
        const payline = finalResult.map(reel => reel[1]);
        const highValueSymbols = ['👑', '💎', '🌰', '🥜'];

        // Count consecutive matches from left
        let matches = 1;
        let currentSymbol = payline[0];

        for (let i = 1; i < payline.length; i++) {
            if (payline[i] === currentSymbol || payline[i] === '🃏' || currentSymbol === '🃏') {
                matches++;
            } else {
                break;
            }
        }

        // Big win if 4+ matches and includes high-value symbols
        return matches >= 4 && (highValueSymbols.includes(currentSymbol) || highValueSymbols.includes(payline[0]));
    }

    /**
     * Apply visual anticipation effects
     */
    applyAnticipationEffects(anticipationType, intensity) {
        if (!anticipationType) return;

        this.anticipationActive = true;

        // Add visual indicators
        const overlay = document.getElementById('winOverlay');
        if (overlay) {
            let message = '';
            let className = '';

            switch (anticipationType.type) {
                case 'scatter':
                    message = intensity === 'high' ? '⭐⭐⭐ SCATTER!' : '⭐⭐ ALMOST...';
                    className = 'anticipation-scatter';
                    break;
                case 'bonus':
                    message = intensity === 'high' ? '🎁🎁🎁 BONUS!' : '🎁🎁 CLOSE...';
                    className = 'anticipation-bonus';
                    break;
                case 'bigwin':
                    message = '💰 BIG WIN INCOMING?';
                    className = 'anticipation-bigwin';
                    break;
            }

            overlay.textContent = message;
            overlay.className = `win-overlay ${className} show`;

            // Clear after a moment
            setTimeout(() => {
                overlay.classList.remove('show', className);
            }, 1500);
        }

        // Highlight relevant symbols
        this.highlightAnticipationSymbols(anticipationType.type);

        // Play anticipation sound
        this.game.soundManager.playTone(800, 0.3, 'sine');
    }

    /**
     * Highlight symbols that are causing anticipation
     */
    highlightAnticipationSymbols(type) {
        const symbols = {
            'scatter': '⭐',
            'bonus': '🎁',
            'bigwin': null // Will highlight matching symbols
        };

        const targetSymbol = symbols[type];
        if (!targetSymbol && type !== 'bigwin') return;

        // Find and highlight the relevant symbols
        document.querySelectorAll('.symbol').forEach(symbol => {
            if (type === 'bigwin') {
                // Highlight matching symbols on first two reels
                const parent = symbol.closest('.reel');
                if (parent && (parent.id === 'reel-0' || parent.id === 'reel-1')) {
                    symbol.classList.add('anticipation');
                }
            } else if (symbol.textContent === targetSymbol) {
                symbol.classList.add('anticipation');
            }
        });

        // Remove anticipation class after effect
        setTimeout(() => {
            document.querySelectorAll('.symbol.anticipation').forEach(s => {
                s.classList.remove('anticipation');
            });
        }, 2000);
    }

    /**
     * Calculate dramatic delay for remaining reels
     * Returns additional delay in ms based on anticipation intensity
     */
    getDramaticDelay(intensity) {
        if (!this.enabled) return 0;

        switch (intensity) {
            case 'high':
                return 800; // Significant slow-down
            case 'medium':
                return 400; // Moderate slow-down
            default:
                return 0;
        }
    }

    /**
     * Show near-miss effect
     * Called when anticipation was high but didn't result in the feature
     */
    showNearMiss(missType) {
        const overlay = document.getElementById('winOverlay');
        if (!overlay) return;

        let message = '';
        switch (missType) {
            case 'scatter':
                message = '⭐ SO CLOSE!';
                break;
            case 'bonus':
                message = '🎁 ALMOST!';
                break;
            case 'bigwin':
                message = '💔 NEXT TIME!';
                break;
        }

        overlay.textContent = message;
        overlay.className = 'win-overlay near-miss show';

        setTimeout(() => {
            overlay.classList.remove('show', 'near-miss');
        }, 1200);

        // Play near-miss sound
        this.game.soundManager.playTone(400, 0.2, 'sawtooth');
    }

    /**
     * Reset anticipation state
     */
    reset() {
        this.anticipationActive = false;
        document.querySelectorAll('.symbol.anticipation').forEach(s => {
            s.classList.remove('anticipation');
        });
    }

    /**
     * Toggle anticipation system
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
