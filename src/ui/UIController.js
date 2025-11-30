/**
 * UIController - Handles all DOM manipulation and UI updates
 *
 * Responsibilities:
 * - Subscribe to StateManager changes
 * - Update DOM when state changes
 * - Handle user input events
 * - Trigger UI animations
 * - NO business logic - only UI concerns
 *
 * This class makes SlotMachine testable without DOM!
 */

import { GAME_EVENTS } from '../../SlotMachineEngine/src/core/EventBus.js';
import { GAME_CONFIG } from '../config/game.js';
import { formatNumber } from '../utils/formatters.js';

export class UIController {
    constructor(stateManager, eventBus, domCache) {
        this.state = stateManager;
        this.events = eventBus;
        this.dom = domCache;

        this.subscribeToState();
        this.attachEventListeners();
    }

    /**
     * Subscribe to state changes for reactive UI updates
     */
    subscribeToState() {
        // Game state subscriptions
        this.state.subscribe('game.credits', (credits) => {
            if (this.dom.credits) {
                this.dom.credits.textContent = formatNumber(credits);
            }
        });

        this.state.subscribe('game.currentBet', (bet) => {
            if (this.dom.bet) this.dom.bet.textContent = formatNumber(bet);
            if (this.dom.betDisplay) this.dom.betDisplay.textContent = formatNumber(bet);
        });

        this.state.subscribe('game.lastWin', (win) => {
            if (this.dom.win) {
                this.dom.win.textContent = formatNumber(win);
            }
        });

        this.state.subscribe('game.isSpinning', (isSpinning) => {
            if (this.dom.spinBtn) {
                this.dom.spinBtn.disabled = isSpinning;
            }
        });

        // UI state subscriptions
        this.state.subscribe('ui.reelResult', (result) => {
            this.updateReels(result);
        });

        this.state.subscribe('ui.winningPositions', (positions) => {
            this.highlightWinningSymbols(positions);
        });

        this.state.subscribe('ui.winningLines', (lines) => {
            this.showWinningPaylines(lines);
        });

        // Turbo mode
        this.state.subscribe('controls.turboMode', (enabled) => {
            if (this.dom.turboBtn) {
                this.dom.turboBtn.classList.toggle('active', enabled);
            }
        });
    }

    /**
     * Attach event listeners for user input
     */
    attachEventListeners() {
        // Spin button
        if (this.dom.spinBtn) {
            this.dom.spinBtn.addEventListener('click', () => {
                this.events.emit(GAME_EVENTS.SPIN_START);
            });
        }

        // Bet controls
        if (this.dom.increaseBet) {
            this.dom.increaseBet.addEventListener('click', () => {
                this.events.emit('bet:increase');
            });
        }

        if (this.dom.decreaseBet) {
            this.dom.decreaseBet.addEventListener('click', () => {
                this.events.emit('bet:decrease');
            });
        }

        if (this.dom.maxBet) {
            this.dom.maxBet.addEventListener('click', () => {
                this.events.emit('bet:max');
            });
        }

        // Stats modal controls are bound from SlotMachine via bindStatsControls

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                // Emit keyboard event for game logic to handle conditionally
                this.events.emit('keyboard:space');
            }
        });

        // Paytable modal
        if (this.dom.paytableBtn) {
            this.dom.paytableBtn.addEventListener('click', () => {
                this.state.update('ui.showPaytable', true);
                this.togglePaytable(true);
            });
        }
        if (this.dom.closePaytable) {
            this.dom.closePaytable.addEventListener('click', () => {
                this.state.update('ui.showPaytable', false);
                this.togglePaytable(false);
            });
        }
    }

    bindStatsControls(onToggle, onTabChange) {
        if (this.dom.statsBtn) {
            this.dom.statsBtn.addEventListener('click', onToggle);
        }

        if (this.dom.closeStats) {
            this.dom.closeStats.addEventListener('click', onToggle);
        }

        this.dom.statsTabs?.forEach((tab) => {
            tab.addEventListener('click', () => onTabChange(tab.dataset.tab));
        });
    }

    /**
     * Highlight winning symbol positions
     * @param {Set<string>} winningPositions - Set of position strings "reel-row"
     */
    highlightWinningSymbols(winningPositions) {
        this.clearWinningSymbols();

        if (!winningPositions || winningPositions.size === 0) return;

        winningPositions.forEach((pos) => {
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

    /**
     * Show winning paylines
     * @param {Array<number>} winningLines - Array of payline indices
     */
    showWinningPaylines(winningLines) {
        // Hide all paylines first
        this.hidePaylines();

        if (!winningLines || winningLines.length === 0) return;

        winningLines.forEach((lineIndex) => {
            const payline = this.dom.paylines?.find((line) =>
                line.classList.contains(`payline-${lineIndex + 1}`)
            );
            if (payline) {
                payline.classList.add('active');
            }
        });
    }

    /**
     * Hide all paylines
     */
    hidePaylines() {
        this.dom.paylines?.forEach((line) => {
            line.classList.remove('active');
        });
    }

    /**
     * Clear winning symbols highlights
     */
    clearWinningSymbols() {
        this.dom.reels.forEach((reel) => {
            const winningSymbols = reel?.querySelectorAll('.symbol.winning') || [];
            winningSymbols.forEach((symbol) => symbol.classList.remove('winning'));
        });
    }

    toggleStatsModal(show) {
        if (!this.dom.statsModal) return;

        this.dom.statsModal.classList.toggle('active', show);
    }

    setActiveStatsTab(tab) {
        this.dom.statsTabs?.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }

    renderStatsContent(html) {
        if (this.dom.statsContentArea) {
            this.dom.statsContentArea.innerHTML = html;
        }
    }

    clearElementContent(element) {
        if (element) {
            element.innerHTML = '';
        }
    }

    /**
     * Show message overlay with optional win counter animation
     * @param {string} message - Message to display
     * @param {number} winAmount - Win amount for counter animation
     * @returns {Promise}
     */
    showMessage(message, winAmount = 0) {
        return new Promise((resolve) => {
            const overlay = this.dom.winOverlay;
            if (!overlay) {
                resolve();
                return;
            }

            overlay.textContent = message;
            overlay.classList.add('show');

            // If there's a win amount, animate counting up
            if (winAmount > 0) {
                this.animateWinCounter(overlay, winAmount).then(resolve);
            } else {
                setTimeout(() => {
                    overlay.classList.remove('show');
                    resolve();
                }, GAME_CONFIG.messageDisplayDuration);
            }
        });
    }

    /**
     * Animate win counter
     * @param {HTMLElement} element - Element to update
     * @param {number} finalAmount - Final win amount
     * @returns {Promise}
     */
    animateWinCounter(element, finalAmount) {
        return new Promise((resolve) => {
            const isTurbo = this.state.select('controls.turboMode');
            const duration = isTurbo
                ? GAME_CONFIG.animations.winCounterFast
                : GAME_CONFIG.animations.winCounterNormal;
            const steps = isTurbo
                ? GAME_CONFIG.animations.winCounterStepsFast
                : GAME_CONFIG.animations.winCounterStepsNormal;

            let currentStep = 0;
            const increment = finalAmount / steps;
            const stepDuration = duration / steps;

            const interval = setInterval(() => {
                currentStep++;
                const currentAmount = Math.min(Math.floor(increment * currentStep), finalAmount);
                element.textContent = `WIN: ${formatNumber(currentAmount)}`;

                if (currentStep >= steps) {
                    clearInterval(interval);
                    setTimeout(() => {
                        element.classList.remove('show');
                        resolve();
                    }, 1000);
                }
            }, stepDuration);
        });
    }

    /**
     * Toggle paytable modal
     * @param {boolean} show - Show or hide
     */
    togglePaytable(show) {
        if (!this.dom.paytableModal) return;

        if (show) {
            this.dom.paytableModal.classList.add('show');
        } else {
            this.dom.paytableModal.classList.remove('show');
        }
    }

    showFeatureOverlay(content) {
        if (!this.dom.featureOverlay) return null;

        this.dom.featureOverlay.innerHTML = content;
        this.dom.featureOverlay.classList.add('show');
        return this.dom.featureOverlay;
    }

    hideFeatureOverlay() {
        if (!this.dom.featureOverlay) return;

        this.dom.featureOverlay.classList.remove('show');
    }

    /**
     * Update turbo mode UI
     * @param {boolean} enabled - Turbo mode state
     */
    updateTurboMode(enabled) {
        if (this.dom.turboBtn) {
            this.dom.turboBtn.classList.toggle('active', enabled);
        }

        if (this.dom.gameContainer) {
            this.dom.gameContainer.classList.toggle('turbo-mode', enabled);
        }
    }

    /**
     * Show level up message
     * @param {number} level - New level
     * @returns {Promise}
     */
    async showLevelUp(level) {
        const overlay = this.dom.featureOverlay;
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="level-up-message">
                <div class="level-icon">⭐</div>
                <div class="level-text">LEVEL UP!</div>
                <div class="level-number">LEVEL ${level}</div>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise((resolve) => setTimeout(resolve, GAME_CONFIG.animations.levelUpMessage));

        overlay.classList.remove('show');
    }

    /**
     * Trigger screen shake effect
     */
    triggerScreenShake() {
        const container = this.dom.slotMachineContainer || this.dom.gameContainer;
        if (!container) return;

        container.classList.add('shake');
        setTimeout(() => {
            container.classList.remove('shake');
        }, GAME_CONFIG.animations.screenShake);
    }

    /**
     * Update free spins counter display
     * @param {number} remaining - Remaining free spins
     * @param {number} total - Total free spins
     */
    updateFreeSpinsCounter(remaining, total) {
        const counter = this.dom.freeSpinsCounter;
        if (!counter) return;

        if (remaining > 0) {
            counter.textContent = `FREE SPINS: ${formatNumber(remaining)}/${formatNumber(total)}`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    /**
     * Update autoplay counter
     * @param {boolean} active - Autoplay active state
     */
    updateAutoplayCounter(active) {
        const counter = this.dom.autoplayCounter;
        if (!counter) return;

        if (active) {
            counter.textContent = 'Auto: ∞';
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    /**
     * Cleanup - remove event listeners and subscriptions
     */
    destroy() {
        // Event listeners are cleaned up automatically when DOM is removed
        // State subscriptions should be tracked if we need manual cleanup
        console.log('UIController destroyed');
    }
}
