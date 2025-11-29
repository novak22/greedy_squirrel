import { GAME_CONFIG } from '../config/game.js';
import { RNG } from '../utils/RNG.js';
import { PaylineEvaluator } from './PaylineEvaluator.js';
import { GAME_EVENTS } from './EventBus.js';
import { Logger } from '../utils/Logger.js';
import { formatNumber } from '../utils/formatters.js';

export class SpinEngine {
    constructor({
        state,
        events,
        freeSpins,
        bonusGame,
        cascade,
        levelSystem,
        dailyChallenges,
        statistics,
        gamble,
        achievements,
        turboMode,
        visualEffects,
        winAnticipation,
        timerManager,
        soundManager,
        reelStrips,
        reelCount,
        rowCount,
        symbolsPerReel,
        uiFacade,
        featureManager,
        saveGameState,
        showMessage,
        updateDisplay,
        cleanupTimers,
        clearWinningSymbols,
        hidePaylines
    }) {
        this.state = state;
        this.events = events;
        this.freeSpins = freeSpins;
        this.bonusGame = bonusGame;
        this.cascade = cascade;
        this.levelSystem = levelSystem;
        this.dailyChallenges = dailyChallenges;
        this.statistics = statistics;
        this.gamble = gamble;
        this.achievements = achievements;
        this.turboMode = turboMode;
        this.visualEffects = visualEffects;
        this.winAnticipation = winAnticipation;
        this.timerManager = timerManager;
        this.soundManager = soundManager;
        this.reelStrips = reelStrips;
        this.reelCount = reelCount;
        this.rowCount = rowCount;
        this.symbolsPerReel = symbolsPerReel;
        this.uiFacade = uiFacade;
        this.featureManager = featureManager;
        this.saveGameState = saveGameState;
        this.showMessage = showMessage;
        this.updateDisplay = updateDisplay;
        this.cleanupTimers = cleanupTimers;
        this.clearWinningSymbols = clearWinningSymbols;
        this.hidePaylines = hidePaylines;
        this.debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
        this.debugNextSpin = null;
    }

    setDebugNextSpin(debugNextSpin) {
        this.debugNextSpin = debugNextSpin;
    }

    canSpin() {
        if (this.state.isSpinning()) return false;
        if (this.bonusGame.isActive()) return false;

        const isFreeSpin = this.freeSpins.isActive();
        if (!isFreeSpin && this.state.getCredits() < this.state.getCurrentBet()) {
            this.showMessage('INSUFFICIENT CREDITS');
            return false;
        }

        return true;
    }

    initializeSpin(isFreeSpin) {
        this.state.setSpinning(true);
        this.soundManager.playReelSpin();

        if (!isFreeSpin) {
            this.state.deductCredits(this.state.getCurrentBet());
        }

        this.state.setLastWin(0);
        this.updateDisplay();

        this.levelSystem.awardXP('spin');
        this.dailyChallenges.updateChallengeProgress('play_spins', 1);

        this.clearWinningSymbols();
        this.hidePaylines();

        this.winAnticipation.reset();
    }

    prepareReelResults() {
        if (this.debugMode && this.debugNextSpin) {
            Logger.debug('Using forced spin:', this.debugNextSpin);
            const predeterminedSymbols = this.debugNextSpin;
            this.debugNextSpin = null;

            return {
                reelPositions: [0, 0, 0, 0, 0],
                predeterminedSymbols,
                shouldTriggerAnticipation: false,
                anticipationConfig: null,
                anticipationTriggerReel: -1
            };
        }

        const reelPositions = [];
        for (let i = 0; i < this.reelCount; i++) {
            reelPositions.push(RNG.getRandomPosition(this.symbolsPerReel));
        }

        const predeterminedSymbols = reelPositions.map((pos, reelIndex) => {
            return RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], pos, this.rowCount);
        });

        const anticipationData = this.winAnticipation.checkAnticipation(predeterminedSymbols);

        return {
            reelPositions,
            predeterminedSymbols,
            shouldTriggerAnticipation: anticipationData.shouldTrigger,
            anticipationConfig: anticipationData.config,
            anticipationTriggerReel: anticipationData.triggerReel
        };
    }

    async executeReelSpin({ reelPositions, predeterminedSymbols, shouldTriggerAnticipation, anticipationConfig, anticipationTriggerReel }) {
        if (shouldTriggerAnticipation) {
            this.visualEffects.showWinAnticipation(anticipationConfig);

            for (let i = 0; i < this.reelCount; i++) {
                const duration = this.turboMode.getReelSpinTime(i, anticipationTriggerReel);

                if (i === anticipationTriggerReel) {
                    this.visualEffects.showDramaticSlow(anticipationTriggerReel);
                    await this.uiFacade.spinReel(i, anticipationConfig.finalSlowDuration, reelPositions[i], predeterminedSymbols ? predeterminedSymbols[i] : null);
                    this.visualEffects.hideDramaticSlow(anticipationTriggerReel);
                } else {
                    if (i > anticipationTriggerReel) {
                        for (let j = i; j < this.reelCount; j++) {
                            const reel = document.getElementById(`reel-${j}`);
                            if (reel) reel.classList.add('dramatic-slow');
                        }
                    }

                    await this.uiFacade.spinReel(i, duration, reelPositions[i], predeterminedSymbols ? predeterminedSymbols[i] : null);

                    const reel = document.getElementById(`reel-${i}`);
                    if (reel) reel.classList.remove('dramatic-slow');
                }
            }
        } else {
            const spinPromises = [];
            for (let i = 0; i < this.reelCount; i++) {
                const duration = this.turboMode.getReelSpinTime(i);
                spinPromises.push(this.uiFacade.spinReel(i, duration, reelPositions[i], predeterminedSymbols ? predeterminedSymbols[i] : null));
            }
            await Promise.all(spinPromises);
        }
    }

    async processWins(winInfo, isFreeSpin) {
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

            this.uiFacade.highlightWinningSymbols(winInfo.winningPositions);
            this.uiFacade.showWinningPaylines(winInfo.winningLines);

            this.soundManager.playWin(winMultiplier);
            this.visualEffects.showWinCelebration(winInfo.totalWin, winMultiplier);

            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.uiFacade.triggerScreenShake();
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

            await this.showMessage(message, winInfo.totalWin);

            if (this.cascade.enabled) {
                const cascadeWins = await this.cascade.executeCascade(winInfo.winningPositions);
                if (cascadeWins > 0) {
                    totalWin += cascadeWins;
                }
            }
        }

        return totalWin;
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

            this.updateDisplay();
        } else {
            this.statistics.recordSpin(this.state.getCurrentBet(), 0, false);
        }
    }

    async spin() {
        if (!this.canSpin()) return;

        const isFreeSpin = this.freeSpins.isActive();
        const checkpoint = this.state.createCheckpoint();

        try {
            this.initializeSpin(isFreeSpin);

            this.events.emit(GAME_EVENTS.SPIN_START, {
                bet: this.state.getCurrentBet(),
                credits: this.state.getCredits(),
                isFreeSpin
            });

            const reelData = this.prepareReelResults();
            await this.executeReelSpin(reelData);

            const result = this.uiFacade.getReelResult();

            Logger.debug('Reel result:', result);

            let winInfo = PaylineEvaluator.evaluateWins(result, this.state.getCurrentBet());
            const bonusInfo = PaylineEvaluator.checkBonusTrigger(result);

            Logger.debug('Win info:', winInfo);
            Logger.debug('Scatter count:', winInfo.scatterCount);

            let totalWin = await this.processWins(winInfo, isFreeSpin);

            this.updateCreditsAndStats(totalWin);

            const shouldExecuteFreeSpins = await this.featureManager.handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin);

            await this.featureManager.finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin);

            if (shouldExecuteFreeSpins) {
                await this.featureManager.executeFreeSpins();
            }

            this.events.emit(GAME_EVENTS.SPIN_END, {
                bet: this.state.getCurrentBet(),
                win: totalWin,
                credits: this.state.getCredits(),
                winInfo,
                isFreeSpin
            });
        } catch (error) {
            Logger.error('Spin failed with error:', error);

            this.state.restoreCheckpoint(checkpoint);

            this.cleanupTimers();
            this.clearWinningSymbols();
            this.hidePaylines();

            await this.showMessage('ERROR: SPIN FAILED\nBET REFUNDED');

            this.updateDisplay();
            this.saveGameState();
        }
    }

    async evaluateWinsWithoutDisplay(result) {
        return PaylineEvaluator.evaluateWins(result, this.state.getCurrentBet());
    }
}
