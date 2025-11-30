// Level and XP progression system
import { PROGRESSION_CONFIG, getLevelFromXP } from '../config/progression.js';

export class LevelSystem {
    constructor(game) {
        this.game = game;
        this.xp = 0;
        this.level = 1;
        this.unlockedFeatures = new Set();
    }

    /**
     * Initialize from saved data
     */
    init(savedData) {
        if (savedData) {
            this.xp = savedData.xp || 0;
            this.unlockedFeatures = new Set(savedData.unlockedFeatures || []);
            this.updateLevel();
        }
    }

    /**
     * Award XP for various actions
     */
    awardXP(source, amount = null) {
        const config = PROGRESSION_CONFIG.levels.xpSources;
        let xpGained = 0;

        switch (source) {
            case 'spin':
                xpGained =
                    config.spinBase +
                    (this.game.state.getCurrentBet() / 10) * config.spinMultiplier;
                break;
            case 'win':
                xpGained = (amount / 20) * config.winMultiplier;
                break;
            case 'bigWin':
                xpGained = config.bigWin;
                break;
            case 'scatter':
                xpGained = config.scatterHit;
                break;
            case 'bonus':
                xpGained = config.bonusRound;
                break;
            case 'freeSpins':
                xpGained = config.freeSpins;
                break;
            default:
                xpGained = amount || 0;
        }

        xpGained = Math.floor(xpGained);
        this.xp += xpGained;

        // Check for level up
        const oldLevel = this.level;
        this.updateLevel();

        if (this.level > oldLevel) {
            this.onLevelUp(this.level);
        }

        this.updateUI();
        return xpGained;
    }

    /**
     * Update level based on current XP
     */
    updateLevel() {
        const levelData = getLevelFromXP(this.xp);
        this.level = levelData.level;
        return levelData;
    }

    /**
     * Handle level up
     */
    async onLevelUp(newLevel) {
        // Check for rewards
        const reward = PROGRESSION_CONFIG.levels.rewards[newLevel];

        if (reward) {
            await this.game.showLevelUpMessage(newLevel, reward);

            // Apply reward using GameState
            if (reward.credits) {
                this.game.state.addCredits(reward.credits);
                this.game.updateDisplay();
            }

            // Unlock features
            if (reward.type === 'feature') {
                this.unlockedFeatures.add(reward.value);
                await this.unlockFeature(reward.value);
            }
        } else {
            await this.game.showLevelUpMessage(newLevel, null);
        }

        this.game.saveGameState();
    }

    /**
     * Unlock a feature
     */
    async unlockFeature(featureName) {
        switch (featureName) {
            case 'autoplay':
                console.log('✨ Autoplay unlocked!');
                break;
            case 'turbo':
                console.log('✨ Turbo mode unlocked!');
                break;
            case 'cascade':
                console.log('✨ Cascading wins unlocked!');
                this.game.cascade.setEnabled(true);
                break;
        }
    }

    /**
     * Check if feature is unlocked
     */
    isFeatureUnlocked(featureName) {
        return this.unlockedFeatures.has(featureName);
    }

    /**
     * Get current level progress
     */
    getProgress() {
        const levelData = getLevelFromXP(this.xp);
        const progress = (levelData.currentLevelXP / levelData.nextLevelXP) * 100;

        return {
            level: this.level,
            xp: this.xp,
            currentLevelXP: levelData.currentLevelXP,
            nextLevelXP: levelData.nextLevelXP,
            progress: Math.min(progress, 100),
            unlockedFeatures: Array.from(this.unlockedFeatures)
        };
    }

    /**
     * Update level UI
     */
    updateUI() {
        const progress = this.getProgress();
        const container = document.getElementById('levelDisplay');

        if (container) {
            container.innerHTML = `
                <div class="level-info">
                    <span class="level-number">LV ${progress.level}</span>
                    <div class="xp-bar-container">
                        <div class="xp-bar" style="width: ${progress.progress}%"></div>
                    </div>
                    <span class="xp-text">${Math.floor(progress.currentLevelXP)} / ${progress.nextLevelXP} XP</span>
                </div>
            `;
        }
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            xp: this.xp,
            unlockedFeatures: Array.from(this.unlockedFeatures)
        };
    }
}
