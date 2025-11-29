import { GAME_CONFIG } from '../config/game.js';
import { formatNumber } from '../utils/formatters.js';
import { Logger } from '../utils/Logger.js';

export class FeatureManager {
    constructor({
        freeSpins,
        bonusGame,
        statistics,
        levelSystem,
        dailyChallenges,
        soundManager,
        state,
        achievements,
        gamble,
        spinHistory,
        cascade,
        uiFacade,
        saveGameState,
        executeSpin,
        autoCollectEnabledRef,
        offerGamble
    }) {
        this.freeSpins = freeSpins;
        this.bonusGame = bonusGame;
        this.statistics = statistics;
        this.levelSystem = levelSystem;
        this.dailyChallenges = dailyChallenges;
        this.soundManager = soundManager;
        this.state = state;
        this.achievements = achievements;
        this.gamble = gamble;
        this.spinHistory = spinHistory;
        this.cascade = cascade;
        this.uiFacade = uiFacade;
        this.saveGameState = saveGameState;
        this.executeSpin = executeSpin;
        this.autoCollectEnabledRef = autoCollectEnabledRef;
        this.offerGamble = offerGamble;
    }

    async handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin) {
        let shouldExecuteFreeSpins = false;

        if (winInfo.hasScatterWin && this.freeSpins.shouldTrigger(winInfo.scatterCount)) {
            if (isFreeSpin) {
                await this.freeSpins.retrigger(winInfo.scatterCount);
            } else {
                this.statistics.recordFeatureTrigger('freeSpins');
                this.levelSystem.awardXP('freeSpins');
                this.dailyChallenges.updateChallengeProgress('trigger_freespins', 1);

                this.soundManager.playFreeSpinsTrigger();

                await this.freeSpins.trigger(winInfo.scatterCount);
                shouldExecuteFreeSpins = true;
            }
        }

        if (bonusInfo.triggered && !isFreeSpin) {
            this.statistics.recordFeatureTrigger('bonus');
            this.levelSystem.awardXP('bonus');
            this.dailyChallenges.updateChallengeProgress('trigger_bonus', 1);

            this.soundManager.playBonusTrigger();

            const bonusCount = bonusInfo.bonusLines[0].count;
            await this.bonusGame.trigger(bonusCount);

            const bonusWin = await this.bonusGame.end();
            if (bonusWin > 0) {
                this.state.addCredits(bonusWin);
                this.state.setLastWin(this.state.getLastWin() + bonusWin);

                this.uiFacade.updateDisplay();
                await this.uiFacade.showMessage(`BONUS WIN: ${formatNumber(bonusWin)}`);
            }
        }

        return shouldExecuteFreeSpins;
    }

    async finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin) {
        Logger.debug('finalizeSpin - isFreeSpin:', isFreeSpin, 'remaining before:', this.freeSpins.remainingSpins);

        if (isFreeSpin) {
            const hasMoreSpins = await this.freeSpins.executeSpin();
            Logger.debug('After executeSpin - hasMoreSpins:', hasMoreSpins, 'remaining:', this.freeSpins.remainingSpins);
            if (!hasMoreSpins) {
                await this.freeSpins.end();
            }
        }

        this.achievements.checkAchievements(
            this.statistics.allTime,
            this.state.getLastWin(),
            this.state.getCurrentBet(),
            this.state.getCredits()
        );

        if (
            totalWin > 0 &&
            !isFreeSpin &&
            !bonusInfo.triggered &&
            this.gamble.canGamble(totalWin) &&
            !this.autoCollectEnabledRef()
        ) {
            const currentCredits = this.state.getCredits();
            this.state.setCredits(currentCredits - totalWin);
            this.uiFacade.updateDisplay();

            const gambleResult = await this.offerGamble(totalWin);

            this.state.setCredits(this.state.getCredits() + gambleResult);
            totalWin = gambleResult;
            this.state.setLastWin(gambleResult);
            this.uiFacade.updateDisplay();

            if (gambleResult > 0) {
                this.statistics.recordSpin(this.state.getCurrentBet(), gambleResult, true);
            }
        }

        const features = [];
        if (this.freeSpins.isActive()) features.push('freeSpins');
        if (winInfo.hasScatterWin) features.push('scatter');
        if (bonusInfo.triggered) features.push('bonus');
        if (this.cascade.enabled && totalWin > winInfo.totalWin) features.push('cascade');

        this.spinHistory.recordSpin(this.state.getCurrentBet(), totalWin, features);

        this.saveGameState();

        this.state.setSpinning(false);
        if (this.uiFacade.dom.spinBtn) this.uiFacade.dom.spinBtn.disabled = false;

        if (this.state.getCredits() === 0 && !isFreeSpin) {
            await this.uiFacade.showMessage('GAME OVER\nResetting to 1000 credits');
            this.state.setCredits(GAME_CONFIG.initialCredits);
            this.uiFacade.updateDisplay();
            this.saveGameState();
        }
    }

    async executeFreeSpins() {
        const originalText = this.uiFacade.dom.spinBtn ? this.uiFacade.dom.spinBtn.textContent : '';

        Logger.debug('executeFreeSpins started - remaining:', this.freeSpins.remainingSpins);

        try {
            while (this.freeSpins.isActive() && this.freeSpins.remainingSpins > 0) {
                Logger.debug('Free spin loop - remaining:', this.freeSpins.remainingSpins, 'isActive:', this.freeSpins.isActive());

                if (this.uiFacade.dom.spinBtn) {
                    this.uiFacade.dom.spinBtn.textContent = 'AUTO SPIN';
                    this.uiFacade.dom.spinBtn.disabled = true;
                }

                const remainingBefore = this.freeSpins.remainingSpins;

                await this.executeSpin();

                Logger.debug('After spin - remaining:', this.freeSpins.remainingSpins);

                if (this.freeSpins.remainingSpins === remainingBefore) {
                    Logger.error('Free spins stuck - remainingSpins did not decrement. Breaking loop.');
                    await this.freeSpins.end();
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.animations.freeSpinDelay));
            }
        } catch (error) {
            Logger.error('Error during free spins execution:', error);
            await this.freeSpins.end();
        }

        if (this.uiFacade.dom.spinBtn) {
            this.uiFacade.dom.spinBtn.textContent = originalText;
            this.uiFacade.dom.spinBtn.disabled = false;
        }
    }
}
