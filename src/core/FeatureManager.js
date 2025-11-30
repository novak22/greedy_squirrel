import { formatNumber } from '../utils/formatters.js';

export class FeatureManager {
    constructor({
        freeSpins,
        bonusGame,
        statistics,
        levelSystem,
        achievements,
        dailyChallenges,
        soundManager,
        gamble,
        autoCollectEnabledRef,
        state,
        ui,
        spinHistory,
        cascade,
        gameConfig,
        spinExecutor,
        saveGameState,
        dom
    }) {
        this.freeSpins = freeSpins;
        this.bonusGame = bonusGame;
        this.statistics = statistics;
        this.levelSystem = levelSystem;
        this.achievements = achievements;
        this.dailyChallenges = dailyChallenges;
        this.soundManager = soundManager;
        this.gamble = gamble;
        this.autoCollectEnabledRef = autoCollectEnabledRef;
        this.state = state;
        this.ui = ui;
        this.spinHistory = spinHistory;
        this.cascade = cascade;
        this.gameConfig = gameConfig;
        this.spinExecutor = spinExecutor;
        this.saveGameState = saveGameState;
        this.dom = dom;
    }

    setUI(ui) {
        this.ui = ui;
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

                this.ui.updateDisplay(
                    this.state.getCredits(),
                    this.state.getCurrentBet(),
                    this.state.getLastWin()
                );
                await this.ui.showMessage(`BONUS WIN: ${formatNumber(bonusWin)}`);
            }
        }

        return shouldExecuteFreeSpins;
    }

    async finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin) {
        if (isFreeSpin) {
            const hasMoreSpins = await this.freeSpins.executeSpin();
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
            this.ui.updateDisplay(
                this.state.getCredits(),
                this.state.getCurrentBet(),
                this.state.getLastWin()
            );

            const gambleResult = await this.spinExecutor.offerGamble(totalWin);

            this.state.setCredits(this.state.getCredits() + gambleResult);
            totalWin = gambleResult;
            this.state.setLastWin(gambleResult);
            this.ui.updateDisplay(
                this.state.getCredits(),
                this.state.getCurrentBet(),
                this.state.getLastWin()
            );

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
        if (this.dom?.spinBtn) this.dom.spinBtn.disabled = false;

        if (this.state.getCredits() === 0 && !isFreeSpin) {
            await this.ui.showMessage('GAME OVER\nResetting to 1000 credits');
            this.state.setCredits(this.gameConfig.initialCredits);
            this.ui.updateDisplay(
                this.state.getCredits(),
                this.state.getCurrentBet(),
                this.state.getLastWin()
            );
            this.saveGameState();
        }
    }
}
