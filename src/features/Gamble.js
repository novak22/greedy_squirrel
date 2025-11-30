// Gamble/Double-up feature - Red/Black card prediction game
import { FEATURES_CONFIG } from '../config/features.js';

export class Gamble {
    constructor(slotMachine) {
        this.game = slotMachine;
        this.isActive = false;
        this.currentWin = 0;
        this.gamblesRemaining = FEATURES_CONFIG.gamble.maxAttempts;
        this.history = [];
        this.maxGambles = FEATURES_CONFIG.gamble.maxAttempts;
        this.resolveCallback = null;
    }

    /**
     * Check if gamble is available for current win
     */
    canGamble(winAmount) {
        if (typeof winAmount !== 'number' || winAmount <= 0) {
            return false;
        }
        return winAmount <= FEATURES_CONFIG.gamble.maxWinAmount;
    }

    /**
     * Start gamble feature
     * @returns {Promise<number>} Final win amount after gamble completes
     */
    start(winAmount) {
        if (!this.canGamble(winAmount)) {
            return Promise.resolve(winAmount);
        }

        return new Promise((resolve) => {
            this.isActive = true;
            this.currentWin = winAmount;
            this.gamblesRemaining = this.maxGambles;
            this.history = [];
            this.resolveCallback = resolve;

            this.game.soundManager.playClick();
            this.showGambleUI();
        });
    }

    /**
     * Show gamble UI
     */
    async showGambleUI() {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        const historyHTML = this.history
            .map((h) => {
                const icon = h.suit === 'hearts' || h.suit === 'diamonds' ? '♥️' : '♠️';
                const colorClass = h.suit === 'hearts' || h.suit === 'diamonds' ? 'red' : 'black';
                return `<div class="gamble-history-card ${colorClass}">${icon}</div>`;
            })
            .join('');

        overlay.innerHTML = `
            <div class="gamble-container">
                <h2 class="gamble-title">🎴 DOUBLE UP</h2>

                <div class="gamble-current-win">
                    <div class="gamble-label">Current Win:</div>
                    <div class="gamble-amount">${this.currentWin}</div>
                </div>

                <div class="gamble-info">
                    <div>Chances Left: ${this.gamblesRemaining}/${this.maxGambles}</div>
                </div>

                ${
                    this.history.length > 0
                        ? `
                    <div class="gamble-history">
                        <div class="gamble-history-label">Previous Cards:</div>
                        <div class="gamble-history-cards">${historyHTML}</div>
                    </div>
                `
                        : ''
                }

                <div class="gamble-message">Guess the card color:</div>

                <div class="gamble-buttons">
                    <button class="btn-gamble btn-gamble-red" id="gambleRed">
                        <div class="gamble-btn-icon">♥️</div>
                        <div class="gamble-btn-text">RED</div>
                    </button>
                    <button class="btn-gamble btn-gamble-black" id="gambleBlack">
                        <div class="gamble-btn-icon">♠️</div>
                        <div class="gamble-btn-text">BLACK</div>
                    </button>
                </div>

                <button class="btn-gamble-collect" id="gambleCollect">
                    COLLECT ${this.currentWin}
                </button>
            </div>
        `;

        overlay.classList.add('show');

        // Attach button handlers - use the stored resolve callback
        document.getElementById('gambleRed').addEventListener('click', () => {
            this.makeGuess('red');
        });

        document.getElementById('gambleBlack').addEventListener('click', () => {
            this.makeGuess('black');
        });

        document.getElementById('gambleCollect').addEventListener('click', () => {
            this.collect();
        });
    }

    /**
     * Make a guess
     */
    async makeGuess(guess) {
        // Draw a random card
        const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const cardColor = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';

        const won = guess === cardColor;

        // Add to history
        this.history.push({ suit, color: cardColor, won });

        // Show card reveal
        await this.revealCard(suit, cardColor, won);

        if (won) {
            // Double the win
            this.currentWin *= 2;
            this.gamblesRemaining--;

            this.game.soundManager.playWin(2);

            // Check if can continue
            if (
                this.gamblesRemaining > 0 &&
                this.currentWin <= FEATURES_CONFIG.gamble.maxWinAmount
            ) {
                // Show updated UI and continue
                await this.showGambleUI();
            } else {
                // Max gambles reached or hit limit
                await this.showResult(true, 'Maximum reached! Collecting...');
                this.collect();
            }
        } else {
            // Lost everything
            this.game.soundManager.playError();
            await this.showResult(false, 'Wrong! You lost everything!');
            this.currentWin = 0;
            this.end();
        }
    }

    /**
     * Reveal the drawn card
     */
    async revealCard(suit, color, won) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        const suitSymbols = {
            hearts: '♥️',
            diamonds: '♦️',
            spades: '♠️',
            clubs: '♣️'
        };

        overlay.innerHTML = `
            <div class="gamble-container">
                <h2 class="gamble-title">Card Revealed!</h2>
                <div class="gamble-card-reveal ${color}">
                    <div class="gamble-card-suit">${suitSymbols[suit]}</div>
                    <div class="gamble-card-color">${color.toUpperCase()}</div>
                </div>
                <div class="gamble-result ${won ? 'win' : 'lose'}">
                    ${won ? '🎉 YOU WON! DOUBLED!' : '💔 YOU LOST!'}
                </div>
            </div>
        `;

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    /**
     * Show final result
     */
    async showResult(won, message) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="gamble-container">
                <h2 class="gamble-title">${won ? '🎉 SUCCESS!' : '💔 GAME OVER'}</h2>
                <div class="gamble-final-message">${message}</div>
                ${
                    this.currentWin > 0
                        ? `
                    <div class="gamble-final-amount">
                        Final Amount: ${this.currentWin}
                    </div>
                `
                        : ''
                }
            </div>
        `;

        await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    /**
     * Collect winnings
     */
    collect() {
        this.game.soundManager.playClick();
        this.end();
    }

    /**
     * End gamble feature
     */
    end() {
        const finalWin = this.currentWin;

        const overlay = document.getElementById('featureOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }

        this.isActive = false;
        this.currentWin = 0;
        this.history = [];

        // Resolve the promise with final win amount
        if (this.resolveCallback) {
            this.resolveCallback(finalWin);
            this.resolveCallback = null;
        }
    }

    /**
     * Check if gamble is currently active
     */
    isGambling() {
        return this.isActive;
    }
}
