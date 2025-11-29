// Main SlotMachine class with Phase 1 enhancements
import { SYMBOLS, getAllSymbolEmojis } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { RNG } from '../utils/RNG.js';
import { Storage } from '../utils/Storage.js';
import { PaylineEvaluator } from './PaylineEvaluator.js';

export class SlotMachine {
    constructor() {
        // Game configuration
        this.reelCount = GAME_CONFIG.reelCount;
        this.rowCount = GAME_CONFIG.rowCount;
        this.symbolsPerReel = GAME_CONFIG.symbolsPerReel;

        // Reel strips (generated once with weighted symbols)
        this.reelStrips = [];
        for (let i = 0; i < this.reelCount; i++) {
            this.reelStrips.push(RNG.generateReelStrip(i, this.symbolsPerReel));
        }

        // Game state
        this.credits = GAME_CONFIG.initialCredits;
        this.currentBet = GAME_CONFIG.betOptions[0];
        this.betOptions = GAME_CONFIG.betOptions;
        this.currentBetIndex = 0;
        this.lastWin = 0;

        this.isSpinning = false;
        this.reelPositions = [0, 0, 0, 0, 0];

        // Statistics tracking
        this.stats = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            scatterHits: 0,
            bonusHits: 0
        };

        // Load saved data
        this.loadGameState();

        this.init();
    }

    init() {
        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();
    }

    /**
     * Load game state from localStorage
     */
    loadGameState() {
        const savedData = Storage.load();
        if (savedData) {
            this.credits = savedData.credits || GAME_CONFIG.initialCredits;
            this.currentBet = savedData.currentBet || GAME_CONFIG.betOptions[0];
            this.currentBetIndex = savedData.currentBetIndex || 0;
            this.stats = savedData.stats || this.stats;
            console.log('Game state loaded from localStorage');
        }
    }

    /**
     * Save game state to localStorage
     */
    saveGameState() {
        Storage.save({
            credits: this.credits,
            currentBet: this.currentBet,
            currentBetIndex: this.currentBetIndex,
            stats: this.stats
        });
    }

    createReels() {
        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            const container = reel.querySelector('.symbol-container');
            container.innerHTML = '';

            // Display initial symbols from reel strip
            const position = RNG.getRandomPosition(this.symbolsPerReel);
            this.reelPositions[i] = position;
            const symbols = RNG.getSymbolsAtPosition(this.reelStrips[i], position, this.rowCount);

            for (let j = 0; j < this.rowCount; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = symbols[j];
                container.appendChild(symbol);
            }
        }
    }

    attachEventListeners() {
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        document.getElementById('increaseBet').addEventListener('click', () => this.changeBet(1));
        document.getElementById('decreaseBet').addEventListener('click', () => this.changeBet(-1));
        document.getElementById('maxBet').addEventListener('click', () => this.setMaxBet());
        document.getElementById('paytableBtn').addEventListener('click', () => this.togglePaytable(true));
        document.getElementById('closePaytable').addEventListener('click', () => this.togglePaytable(false));

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpinning) {
                e.preventDefault();
                this.spin();
            }
        });
    }

    updateDisplay() {
        document.getElementById('credits').textContent = this.credits;
        document.getElementById('bet').textContent = this.currentBet;
        document.getElementById('betDisplay').textContent = this.currentBet;
        document.getElementById('win').textContent = this.lastWin;
    }

    changeBet(direction) {
        if (this.isSpinning) return;

        this.currentBetIndex += direction;

        if (this.currentBetIndex < 0) {
            this.currentBetIndex = 0;
        } else if (this.currentBetIndex >= this.betOptions.length) {
            this.currentBetIndex = this.betOptions.length - 1;
        }

        this.currentBet = this.betOptions[this.currentBetIndex];
        this.updateDisplay();
    }

    setMaxBet() {
        if (this.isSpinning) return;

        this.currentBetIndex = this.betOptions.length - 1;
        this.currentBet = this.betOptions[this.currentBetIndex];
        this.updateDisplay();
    }

    async spin() {
        if (this.isSpinning) return;

        if (this.credits < this.currentBet) {
            this.showMessage('INSUFFICIENT CREDITS');
            return;
        }

        this.isSpinning = true;
        this.credits -= this.currentBet;
        this.lastWin = 0;
        this.updateDisplay();

        // Update statistics
        this.stats.totalSpins++;
        this.stats.totalWagered += this.currentBet;

        document.getElementById('spinBtn').disabled = true;
        this.clearWinningSymbols();
        this.hidePaylines();

        const spinPromises = [];

        for (let i = 0; i < this.reelCount; i++) {
            spinPromises.push(this.spinReel(i, GAME_CONFIG.spinDurations[i]));
        }

        await Promise.all(spinPromises);

        const result = this.getReelResult();
        const winInfo = PaylineEvaluator.evaluateWins(result, this.currentBet);
        const bonusInfo = PaylineEvaluator.checkBonusTrigger(result);

        if (winInfo.totalWin > 0) {
            this.credits += winInfo.totalWin;
            this.lastWin = winInfo.totalWin;
            this.stats.totalWon += winInfo.totalWin;

            if (winInfo.totalWin > this.stats.biggestWin) {
                this.stats.biggestWin = winInfo.totalWin;
            }

            this.updateDisplay();

            this.highlightWinningSymbols(winInfo.winningPositions);
            this.showWinningPaylines(winInfo.winningLines);

            // Build win message
            let message = `WIN: ${winInfo.totalWin}`;
            if (winInfo.hasScatterWin) {
                message += `\n⭐ ${winInfo.scatterCount} SCATTERS!`;
                this.stats.scatterHits++;
            }

            await this.showMessage(message);
        }

        // Check for bonus trigger (Phase 2 will handle this)
        if (bonusInfo.triggered) {
            this.stats.bonusHits++;
            await this.showMessage('🎁 BONUS TRIGGERED!\n(Coming in Phase 2)');
        }

        // Save game state after each spin
        this.saveGameState();

        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;

        if (this.credits === 0) {
            await this.showMessage('GAME OVER\nResetting to 1000 credits');
            this.credits = GAME_CONFIG.initialCredits;
            this.updateDisplay();
            this.saveGameState();
        }
    }

    spinReel(reelIndex, duration) {
        return new Promise((resolve) => {
            const reel = document.getElementById(`reel-${reelIndex}`);
            const container = reel.querySelector('.symbol-container');

            reel.classList.add('spinning');

            let spins = 0;
            const maxSpins = Math.floor(duration / 100);

            const interval = setInterval(() => {
                // Show random symbols during spin for visual effect
                const symbols = container.querySelectorAll('.symbol');
                const position = RNG.getRandomPosition(this.symbolsPerReel);
                const displaySymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], position, this.rowCount);

                symbols.forEach((symbol, index) => {
                    symbol.textContent = displaySymbols[index];
                });

                spins++;
                if (spins >= maxSpins) {
                    clearInterval(interval);
                    reel.classList.remove('spinning');

                    // Set final position using weighted RNG
                    const finalPosition = RNG.getRandomPosition(this.symbolsPerReel);
                    this.reelPositions[reelIndex] = finalPosition;
                    const finalSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], finalPosition, this.rowCount);

                    for (let i = 0; i < this.rowCount; i++) {
                        symbols[i].textContent = finalSymbols[i];
                    }

                    resolve();
                }
            }, 100);
        });
    }

    getReelResult() {
        const result = [];

        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            const symbols = reel.querySelectorAll('.symbol');
            const reelSymbols = [];

            for (let j = 0; j < this.rowCount; j++) {
                reelSymbols.push(symbols[j].textContent);
            }

            result.push(reelSymbols);
        }

        return result;
    }

    highlightWinningSymbols(winningPositions) {
        this.clearWinningSymbols();

        winningPositions.forEach(pos => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = document.getElementById(`reel-${reel}`);
            const symbols = reelEl.querySelectorAll('.symbol');
            if (symbols[row]) {
                symbols[row].classList.add('winning');
            }
        });
    }

    clearWinningSymbols() {
        document.querySelectorAll('.symbol.winning').forEach(symbol => {
            symbol.classList.remove('winning');
        });
    }

    showWinningPaylines(winningLines) {
        winningLines.forEach(lineIndex => {
            const payline = document.querySelector(`.payline-${lineIndex + 1}`);
            if (payline) {
                payline.classList.add('active');
            }
        });
    }

    hidePaylines() {
        document.querySelectorAll('.payline').forEach(line => {
            line.classList.remove('active');
        });
    }

    showMessage(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('winOverlay');
            overlay.textContent = message;
            overlay.classList.add('show');

            setTimeout(() => {
                overlay.classList.remove('show');
                resolve();
            }, GAME_CONFIG.messageDisplayDuration);
        });
    }

    togglePaytable(show) {
        const modal = document.getElementById('paytableModal');
        if (show) {
            modal.classList.add('show');
        } else {
            modal.classList.remove('show');
        }
    }
}
