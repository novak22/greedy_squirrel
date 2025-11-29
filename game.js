class SlotMachine {
    constructor() {
        this.symbols = ['👑', '💎', '🌰', '🥜', '🌻', '🍄', '🌲', '🍂'];
        this.reelCount = 5;
        this.rowCount = 3;
        this.symbolsPerReel = 20;

        this.credits = 1000;
        this.currentBet = 10;
        this.betOptions = [10, 20, 50, 100, 200];
        this.currentBetIndex = 0;
        this.lastWin = 0;

        this.isSpinning = false;
        this.reelPositions = [0, 0, 0, 0, 0];

        this.paytable = {
            '👑': { 5: 200, 4: 40, 3: 10 },
            '💎': { 5: 150, 4: 30, 3: 8 },
            '🌰': { 5: 100, 4: 25, 3: 5 },
            '🥜': { 5: 100, 4: 25, 3: 5 },
            '🌻': { 5: 80, 4: 20, 3: 4 },
            '🍄': { 5: 60, 4: 15, 3: 3 },
            '🌲': { 5: 40, 4: 10, 3: 2 },
            '🍂': { 5: 20, 4: 8, 3: 2 }
        };

        this.paylines = [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0],
            [2, 2, 2, 2, 2],
            [0, 1, 2, 1, 0],
            [2, 1, 0, 1, 2],
            [0, 1, 1, 1, 0],
            [2, 1, 1, 1, 2],
            [1, 0, 1, 2, 1],
            [1, 2, 1, 0, 1],
            [0, 0, 1, 2, 2]
        ];

        this.init();
    }

    init() {
        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();
    }

    createReels() {
        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            const container = reel.querySelector('.symbol-container');
            container.innerHTML = '';

            for (let j = 0; j < this.symbolsPerReel; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = this.getRandomSymbol();
                container.appendChild(symbol);
            }
        }
    }

    getRandomSymbol() {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
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

        document.getElementById('spinBtn').disabled = true;
        this.clearWinningSymbols();
        this.hidePaylines();

        const spinDurations = [2000, 2300, 2600, 2900, 3200];
        const spinPromises = [];

        for (let i = 0; i < this.reelCount; i++) {
            spinPromises.push(this.spinReel(i, spinDurations[i]));
        }

        await Promise.all(spinPromises);

        const result = this.getReelResult();
        const winInfo = this.checkWins(result);

        if (winInfo.totalWin > 0) {
            this.credits += winInfo.totalWin;
            this.lastWin = winInfo.totalWin;
            this.updateDisplay();

            this.highlightWinningSymbols(winInfo.winningPositions);
            this.showWinningPaylines(winInfo.winningLines);

            await this.showMessage(`WIN: ${winInfo.totalWin}`);
        }

        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;

        if (this.credits === 0) {
            await this.showMessage('GAME OVER');
            this.credits = 1000;
            this.updateDisplay();
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
                const symbols = container.querySelectorAll('.symbol');
                symbols.forEach(symbol => {
                    symbol.textContent = this.getRandomSymbol();
                });

                spins++;
                if (spins >= maxSpins) {
                    clearInterval(interval);
                    reel.classList.remove('spinning');

                    const finalSymbols = [];
                    for (let i = 0; i < this.rowCount; i++) {
                        finalSymbols.push(this.getRandomSymbol());
                    }

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

    checkWins(result) {
        let totalWin = 0;
        const winningPositions = new Set();
        const winningLines = [];

        this.paylines.forEach((payline, lineIndex) => {
            const symbols = [];
            const positions = [];

            for (let i = 0; i < this.reelCount; i++) {
                const row = payline[i];
                const symbol = result[i][row];
                symbols.push(symbol);
                positions.push({ reel: i, row: row });
            }

            let matchCount = 1;
            const firstSymbol = symbols[0];

            for (let i = 1; i < symbols.length; i++) {
                if (symbols[i] === firstSymbol) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3 && this.paytable[firstSymbol]) {
                const payout = this.paytable[firstSymbol][matchCount] || 0;
                if (payout > 0) {
                    const win = payout * this.currentBet;
                    totalWin += win;
                    winningLines.push(lineIndex);

                    for (let i = 0; i < matchCount; i++) {
                        winningPositions.add(`${positions[i].reel}-${positions[i].row}`);
                    }
                }
            }
        });

        return { totalWin, winningPositions, winningLines };
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
            }, 2000);
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

document.addEventListener('DOMContentLoaded', () => {
    const game = new SlotMachine();
});
