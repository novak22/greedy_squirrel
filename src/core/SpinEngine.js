import { GAME_CONFIG } from '../config/game.js';
import { formatNumber } from '../utils/formatters.js';
import { GAME_EVENTS } from '../../SlotMachineEngine/src/core/EventBus.js';

export class SpinEngine {
    constructor({
        reelCount,
        rowCount,
        symbolsPerReel,
        reelStrips,
        turboMode,
        timerManager,
        state,
        dom,
        soundManager,
        winAnticipation,
        events,
        cascade,
        freeSpins,
        statistics,
        dailyChallenges,
        levelSystem,
        visualEffects,
        ui,
        triggerScreenShake,
        metrics = null,
        rng = null
    }) {
        this.reelCount = reelCount;
        this.rowCount = rowCount;
        this.symbolsPerReel = symbolsPerReel;
        this.reelStrips = reelStrips;
        this.turboMode = turboMode;
        this.timerManager = timerManager;
        this.state = state;
        this.dom = dom;
        this.soundManager = soundManager;
        this.winAnticipation = winAnticipation;
        this.events = events;
        this.cascade = cascade;
        this.freeSpins = freeSpins;
        this.statistics = statistics;
        this.dailyChallenges = dailyChallenges;
        this.levelSystem = levelSystem;
        this.visualEffects = visualEffects;
        this.ui = ui;
        this.triggerScreenShake = triggerScreenShake;
        this.metrics = metrics;
        this.rng = rng;
    }

    setUI(ui) {
        this.ui = ui;
    }

    async executeReelSpin(reelData) {
        const {
            reelPositions,
            predeterminedSymbols,
            shouldTriggerAnticipation,
            anticipationConfig,
            anticipationTriggerReel
        } = reelData;

        const spinTimer = this.metrics?.startTimer?.('spin.reels', {
            mode: shouldTriggerAnticipation ? 'anticipation' : 'standard',
            reelCount: this.reelCount
        });

        if (shouldTriggerAnticipation) {
            for (let i = 0; i < this.reelCount; i++) {
                let duration = this.turboMode.getReelSpinTime(i);

                if (i === anticipationTriggerReel) {
                    const extraDelay = this.winAnticipation.getDramaticDelay(anticipationConfig.intensity);
                    duration += extraDelay;

                    this.winAnticipation.applyAnticipationEffects(anticipationConfig, anticipationConfig.intensity);

                    for (let j = i; j < this.reelCount; j++) {
                        const reel = this.dom.reels[j];
                        if (reel) reel.classList.add('dramatic-slow');
                    }
                }

                await this.spinReel(i, duration, reelPositions[i], predeterminedSymbols ? predeterminedSymbols[i] : null);

                const reel = this.dom.reels[i];
                if (reel) reel.classList.remove('dramatic-slow');
            }
        } else {
            const spinPromises = [];
            for (let i = 0; i < this.reelCount; i++) {
                const duration = this.turboMode.getReelSpinTime(i);
                spinPromises.push(this.spinReel(i, duration, reelPositions[i], predeterminedSymbols ? predeterminedSymbols[i] : null));
            }
            await Promise.all(spinPromises);
        }

        spinTimer?.end({
            turbo: this.turboMode.isActive
        });
    }

    async processWins(winInfo, isFreeSpin) {
        const renderTimer = this.metrics?.startTimer?.('spin.render', {
            isFreeSpin
        });
        let totalWin = 0;

        if (winInfo.totalWin > 0) {
            if (isFreeSpin) {
                winInfo.totalWin = this.freeSpins.applyMultiplier(winInfo.totalWin);
                this.freeSpins.addWin(winInfo.totalWin);
            }

            totalWin = winInfo.totalWin;

            const winMultiplier = winInfo.totalWin / this.state.getCurrentBet();
            this.events.emit(GAME_EVENTS.WIN, {
                amount: winInfo.totalWin,
                multiplier: winMultiplier,
                positions: winInfo.winningPositions,
                lines: winInfo.winningLines
            });

            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.events.emit(GAME_EVENTS.MEGA_WIN, { amount: winInfo.totalWin, multiplier: winMultiplier });
            } else if (winMultiplier >= GAME_CONFIG.winThresholds.big) {
                this.events.emit(GAME_EVENTS.BIG_WIN, { amount: winInfo.totalWin, multiplier: winMultiplier });
            }

            this.ui.highlightWinningSymbols(winInfo.winningPositions);
            this.ui.showWinningPaylines(winInfo.winningLines);

            this.soundManager.playWin(winMultiplier);
            this.visualEffects.showWinCelebration(winInfo.totalWin, winMultiplier);

            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.triggerScreenShake();
            }

            let message = `WIN: ${formatNumber(winInfo.totalWin)}`;
            if (isFreeSpin) {
                message += `\n✨ ${this.freeSpins.multiplier}x MULTIPLIER!`;
            }
            if (winInfo.hasScatterWin) {
                message += `\n⭐ ${winInfo.scatterCount} SCATTERS!`;

                this.statistics.recordFeatureTrigger('scatter', { count: winInfo.scatterCount });
                this.dailyChallenges.updateChallengeProgress('hit_scatters', winInfo.scatterCount);
                this.levelSystem.awardXP('scatter');

                this.soundManager.playScatter();
            }

            await this.ui.showMessage(message, winInfo.totalWin);

            if (this.cascade.enabled) {
                const cascadeWins = await this.cascade.executeCascade(winInfo.winningPositions);
                if (cascadeWins > 0) {
                    totalWin += cascadeWins;
                }
            }
        }

        renderTimer?.end({
            totalWin,
            hasScatter: winInfo.hasScatterWin
        });

        return totalWin;
    }

    async evaluateWinsWithoutDisplay(result, paylineEvaluator) {
        return paylineEvaluator.evaluateWins(result, this.state.getCurrentBet());
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

            const randomPosition = this.rng.getRandomPosition(this.symbolsPerReel);
            const randomSymbols = this.rng.getSymbolsAtPosition(this.reelStrips[reelIndex], randomPosition, this.rowCount);
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
                    const finalPosition = predeterminedPosition !== null ? predeterminedPosition : this.rng.getRandomPosition(this.symbolsPerReel);
                    this.state.setReelPosition(reelIndex, finalPosition);
                    finalSymbols = this.rng.getSymbolsAtPosition(this.reelStrips[reelIndex], finalPosition, this.rowCount);
                }

                for (let i = 0; i < this.rowCount; i++) {
                    symbols[i].textContent = finalSymbols[i];

                    symbols[i].classList.add('landed');
                    this.timerManager.setTimeout(() => symbols[i].classList.remove('landed'), GAME_CONFIG.animations.symbolLanded, 'reels');

                    this.ui.applySymbolClasses?.(symbols[i], finalSymbols[i]);
                }

                this.soundManager.playReelStop();

                this.timerManager.setTimeout(() => {
                    reel.classList.remove('stopping');
                    resolve();
                }, GAME_CONFIG.animations.reelStopping, 'reels');
            }, duration, 'reels');
        });
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

    updateCreditsAndStats(totalWin) {
        if (totalWin > 0) {
            this.state.addCredits(totalWin);
            this.state.setLastWin(totalWin);

            this.levelSystem.awardXP('win', totalWin);
            this.statistics.recordSpin(this.state.getCurrentBet(), totalWin, true);
            this.dailyChallenges.updateChallengeProgress('win_amount', totalWin);

            const winMultiplier = totalWin / this.state.getCurrentBet();
            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.levelSystem.awardXP('bigWin');
            }

            this.dailyChallenges.updateChallengeProgress('big_win', winMultiplier >= GAME_CONFIG.winThresholds.big ? 1 : 0);

            this.ui.updateDisplay(this.state.getCredits(), this.state.getCurrentBet(), this.state.getLastWin());
        } else {
            this.statistics.recordSpin(this.state.getCurrentBet(), 0, false);
        }
    }
}

