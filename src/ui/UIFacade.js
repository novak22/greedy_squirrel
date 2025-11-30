import { formatNumber } from '../utils/formatters.js';
import { GAME_CONFIG } from '../config/game.js';

/**
 * UIFacade - Bridges SlotMachine logic with the UIController
 *
 * Responsibilities:
 * - Provide a stable adapter around UIController for DOM updates
 * - Encapsulate timer/turbo-aware message handling
 * - Offer convenience helpers for SlotMachine without duplicating UI logic
 */
export class UIFacade {
    constructor(domCache, timerManager, turboMode) {
        this.dom = domCache;
        this.timerManager = timerManager;
        this.turboMode = turboMode;
        this.controller = null;
        this.winCounterInterval = null;
    }

    bindController(controller) {
        this.controller = controller;
    }

    // --- Simple controller delegates ---

    bindStatsControls(onToggle, onTabChange) {
        this.controller?.bindStatsControls(onToggle, onTabChange);
    }

    clearElementContent(element) {
        this.controller?.clearElementContent(element);
    }

    highlightWinningSymbols(winningPositions) {
        this.controller?.highlightWinningSymbols(winningPositions);
    }

    clearWinningSymbols() {
        this.controller?.clearWinningSymbols();
    }

    showWinningPaylines(winningLines) {
        this.controller?.showWinningPaylines(winningLines);
    }

    hidePaylines() {
        this.controller?.hidePaylines();
    }

    toggleStatsModal(show) {
        this.controller?.toggleStatsModal(show);
    }

    setActiveStatsTab(tab) {
        this.controller?.setActiveStatsTab(tab);
    }

    renderStatsContent(html) {
        this.controller?.renderStatsContent(html);
    }

    showFeatureOverlay(content) {
        return this.controller?.showFeatureOverlay(content) || null;
    }

    hideFeatureOverlay() {
        this.controller?.hideFeatureOverlay();
    }

    updateTurboMode(enabled) {
        this.controller?.updateTurboMode(enabled);
    }

    showLevelUp(level) {
        return this.controller?.showLevelUp(level);
    }

    triggerScreenShake() {
        this.controller?.triggerScreenShake();
    }

    updateFreeSpinsCounter(remaining, total) {
        this.controller?.updateFreeSpinsCounter(remaining, total);
    }

    updateAutoplayCounter(active) {
        this.controller?.updateAutoplayCounter(active);
    }

    // --- Enhanced helpers ---

    updateDisplay(credits, currentBet, lastWin) {
        if (this.dom.credits) this.dom.credits.textContent = formatNumber(credits);
        if (this.dom.bet) this.dom.bet.textContent = formatNumber(currentBet);
        if (this.dom.betDisplay) this.dom.betDisplay.textContent = formatNumber(currentBet);
        if (this.dom.win) this.dom.win.textContent = formatNumber(lastWin);
    }

    updateAutoCollectUI(autoCollectEnabled) {
        if (!this.dom.autoCollectBtn) return;

        if (autoCollectEnabled) {
            this.dom.autoCollectBtn.classList.add('active');
        } else {
            this.dom.autoCollectBtn.classList.remove('active');
        }

        this.dom.autoCollectBtn.textContent = 'COLLECT';
    }

    createReels(reelCount, symbolsPerReel, rowCount, reelStrips, state, applySymbolClasses, rng) {
        for (let i = 0; i < reelCount; i++) {
            const reel = this.dom.reels[i];
            if (!reel) continue;

            const container = reel.querySelector('.symbol-container');
            if (!container) continue;

            this.clearElementContent(container);

            const position = rng.getRandomPosition(symbolsPerReel);
            state.setReelPosition(i, position);
            const symbols = rng.getSymbolsAtPosition(reelStrips[i], position, rowCount);

            for (let j = 0; j < rowCount; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = symbols[j];

                applySymbolClasses(symbol, symbols[j]);

                container.appendChild(symbol);
            }
        }
    }

    showMessage(message, winAmount = 0) {
        return new Promise((resolve) => {
            const overlay = this.dom.winOverlay;

            if (!overlay) {
                resolve();
                return;
            }

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

            this.timerManager.setTimeout(
                () => {
                    overlay.classList.remove('show');
                    resolve();
                },
                duration,
                'win-overlay'
            );
        });
    }

    animateWinCounter(overlay, finalAmount, baseMessage) {
        const duration = this.turboMode.isActive
            ? GAME_CONFIG.animations.winCounterFast
            : GAME_CONFIG.animations.winCounterNormal;
        const steps = this.turboMode.isActive
            ? GAME_CONFIG.animations.winCounterStepsFast
            : GAME_CONFIG.animations.winCounterStepsNormal;
        const stepDuration = duration / steps;
        const increment = finalAmount / steps;

        let currentAmount = 0;
        let step = 0;

        this.winCounterInterval = this.timerManager.setInterval(
            () => {
                step++;
                currentAmount = Math.min(Math.floor(increment * step), finalAmount);

                let message = baseMessage.replace(
                    /WIN: \d+/,
                    `WIN: ${formatNumber(currentAmount)}`
                );
                overlay.textContent = message;

                if (currentAmount >= finalAmount) {
                    this.timerManager.clearInterval(this.winCounterInterval);
                    this.winCounterInterval = null;
                    overlay.textContent = baseMessage;
                }
            },
            stepDuration,
            'win-counter'
        );
    }
}
