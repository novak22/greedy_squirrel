import { UIController } from './UIController.js';
import { GAME_CONFIG } from '../config/game.js';
import { SYMBOLS, getPremiumSymbols } from '../config/symbols.js';
import { RNG } from '../utils/RNG.js';
import { formatNumber } from '../utils/formatters.js';

export class UIFacade {
    constructor({ stateManager, eventBus, timerManager, turboMode, soundManager, state, reelStrips, reelCount, rowCount, symbolsPerReel }) {
        this.stateManager = stateManager;
        this.events = eventBus;
        this.timerManager = timerManager;
        this.turboMode = turboMode;
        this.soundManager = soundManager;
        this.state = state;
        this.reelStrips = reelStrips;
        this.reelCount = reelCount;
        this.rowCount = rowCount;
        this.symbolsPerReel = symbolsPerReel;

        this.dom = {};
        this.uiController = null;
        this.winCounterInterval = null;
    }

    init() {
        this.cacheDOM();
        this.uiController = new UIController(this.stateManager, this.events, this.dom);
    }

    cacheDOM() {
        this.dom = {
            // Display elements
            credits: document.getElementById('credits'),
            bet: document.getElementById('bet'),
            betDisplay: document.getElementById('betDisplay'),
            win: document.getElementById('win'),

            // Control elements
            spinBtn: document.getElementById('spinBtn'),
            increaseBet: document.getElementById('increaseBet'),
            decreaseBet: document.getElementById('decreaseBet'),
            maxBet: document.getElementById('maxBet'),

            // Overlay elements
            winOverlay: document.getElementById('winOverlay'),
            featureOverlay: document.getElementById('featureOverlay'),

            // Modal elements
            paytableModal: document.getElementById('paytableModal'),
            statsModal: document.getElementById('statsModal'),

            // Advanced controls
            autoplayBtn: document.getElementById('autoplayBtn'),
            turboBtn: document.getElementById('turboBtn'),
            autoCollectBtn: document.getElementById('autoCollectBtn'),
            autoplayCounter: document.getElementById('autoplayCounter'),

            // Reel containers
            reels: [
                document.getElementById('reel-0'),
                document.getElementById('reel-1'),
                document.getElementById('reel-2'),
                document.getElementById('reel-3'),
                document.getElementById('reel-4')
            ]
        };
    }

    createReels() {
        for (let i = 0; i < this.reelCount; i++) {
            const reel = this.dom.reels[i];
            if (!reel) continue;

            const container = reel.querySelector('.symbol-container');
            if (!container) continue;

            container.innerHTML = '';

            const position = RNG.getRandomPosition(this.symbolsPerReel);
            this.state.setReelPosition(i, position);
            const symbols = RNG.getSymbolsAtPosition(this.reelStrips[i], position, this.rowCount);

            for (let j = 0; j < this.rowCount; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = symbols[j];
                this.applySymbolClasses(symbol, symbols[j]);
                container.appendChild(symbol);
            }
        }
    }

    updateDisplay() {
        if (this.dom.credits) this.dom.credits.textContent = formatNumber(this.state.getCredits());
        if (this.dom.bet) this.dom.bet.textContent = formatNumber(this.state.getCurrentBet());
        if (this.dom.betDisplay) this.dom.betDisplay.textContent = formatNumber(this.state.getCurrentBet());
        if (this.dom.win) this.dom.win.textContent = formatNumber(this.state.getLastWin());
    }

    updateAutoCollectUI(autoCollectEnabled) {
        if (!this.dom.autoCollectBtn) return;

        this.dom.autoCollectBtn.classList.toggle('active', autoCollectEnabled);
        this.dom.autoCollectBtn.textContent = 'COLLECT';
    }

    applySymbolClasses(symbolElement, symbolText) {
        symbolElement.classList.remove('premium', 'scatter');

        const premiumSymbols = getPremiumSymbols();
        if (premiumSymbols.includes(symbolText)) {
            symbolElement.classList.add('premium');
        }

        if (symbolText === SYMBOLS.SCATTER.emoji) {
            symbolElement.classList.add('scatter');
        }
    }

    highlightWinningSymbols(winningPositions) {
        this.clearWinningSymbols();

        winningPositions.forEach(pos => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = this.dom.reels[reel];
            if (reelEl) {
                const symbols = reelEl.querySelectorAll('.symbol');
                if (symbols[row]) {
                    symbols[row].classList.add('winning');
                }
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

    showMessage(message, winAmount = 0) {
        return new Promise((resolve) => {
            const overlay = this.dom.winOverlay;

            if (this.winCounterInterval) {
                this.timerManager.clearInterval(this.winCounterInterval);
                this.winCounterInterval = null;
            }

            if (winAmount > 0) {
                this.animateWinCounter(overlay, winAmount, message);
            } else {
                overlay.textContent = message;
            }

            overlay.classList.add('show');
            const duration = this.turboMode.getMessageDelay();

            this.timerManager.setTimeout(() => {
                overlay.classList.remove('show');
                resolve();
            }, duration, 'win-overlay');
        });
    }

    animateWinCounter(overlay, finalAmount, baseMessage) {
        const duration = this.turboMode.isActive ? GAME_CONFIG.animations.winCounterFast : GAME_CONFIG.animations.winCounterNormal;
        const steps = this.turboMode.isActive ? GAME_CONFIG.animations.winCounterStepsFast : GAME_CONFIG.animations.winCounterStepsNormal;
        const stepDuration = duration / steps;
        const increment = finalAmount / steps;

        let currentAmount = 0;
        let step = 0;

        this.winCounterInterval = this.timerManager.setInterval(() => {
            step++;
            currentAmount = Math.min(Math.floor(increment * step), finalAmount);

            let message = baseMessage.replace(/WIN: \d+/, `WIN: ${formatNumber(currentAmount)}`);
            overlay.textContent = message;

            if (step % GAME_CONFIG.soundTickFrequency === 0 && this.soundManager.effectsEnabled) {
                this.soundManager.playTone(
                    GAME_CONFIG.soundTickBaseFrequency + (step * GAME_CONFIG.soundTickFrequencyStep),
                    0.03,
                    'sine'
                );
            }

            if (currentAmount >= finalAmount) {
                this.timerManager.clearInterval(this.winCounterInterval);
                this.winCounterInterval = null;
                overlay.textContent = baseMessage;
            }
        }, stepDuration, 'win-counter');
    }

    togglePaytable(show) {
        if (!this.dom.paytableModal) return;

        if (show) {
            this.dom.paytableModal.classList.add('show');
        } else {
            this.dom.paytableModal.classList.remove('show');
        }
    }

    updateTurboUI(isActive) {
        const container = document.querySelector('.game-container');
        container.classList.toggle('turbo-mode', isActive);
    }

    triggerScreenShake() {
        const container = document.querySelector('.game-container');
        container.classList.add('screen-shake');

        this.timerManager.setTimeout(() => {
            container.classList.remove('screen-shake');
        }, GAME_CONFIG.animations.screenShake, 'visual-effects');
    }

    getReelResult() {
        const result = [];

        for (let i = 0; i < this.reelCount; i++) {
            const reel = this.dom.reels[i];
            const symbols = reel.querySelectorAll('.symbol');
            const reelSymbols = [];

            for (let j = 0; j < this.rowCount; j++) {
                reelSymbols.push(symbols[j].textContent);
            }

            result.push(reelSymbols);
        }

        return result;
    }

    spinReel(reelIndex, duration, predeterminedPosition = null, predeterminedSymbols = null) {
        return new Promise((resolve) => {
            const reel = this.dom.reels[reelIndex];
            if (!reel) {
                resolve();
                return;
            }

            const container = reel.querySelector('.symbol-container');
            if (!container) {
                resolve();
                return;
            }

            const symbols = Array.from(container.querySelectorAll('.symbol'));
            if (symbols.length === 0) {
                resolve();
                return;
            }

            reel.classList.add('spinning');

            const randomPosition = RNG.getRandomPosition(this.symbolsPerReel);
            const randomSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], randomPosition, this.rowCount);
            symbols.forEach((symbol, index) => {
                symbol.textContent = randomSymbols[index];
            });

            this.timerManager.setTimeout(() => {
                reel.classList.remove('spinning');
                reel.classList.add('stopping');

                let finalSymbols;
                if (predeterminedSymbols) {
                    finalSymbols = predeterminedSymbols;
                } else {
                    const finalPosition = predeterminedPosition !== null ? predeterminedPosition : RNG.getRandomPosition(this.symbolsPerReel);
                    this.state.setReelPosition(reelIndex, finalPosition);
                    finalSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], finalPosition, this.rowCount);
                }

                for (let i = 0; i < this.rowCount; i++) {
                    symbols[i].textContent = finalSymbols[i];
                    symbols[i].classList.add('landed');
                    this.timerManager.setTimeout(() => symbols[i].classList.remove('landed'), GAME_CONFIG.animations.symbolLanded, 'reels');
                    this.applySymbolClasses(symbols[i], finalSymbols[i]);
                }

                this.soundManager.playReelStop();

                this.timerManager.setTimeout(() => {
                    reel.classList.remove('stopping');
                    resolve();
                }, GAME_CONFIG.animations.reelStopping, 'reels');
            }, duration, 'reels');
        });
    }
}
