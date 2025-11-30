// Achievement system with tracking and notifications
import { PROGRESSION_CONFIG } from '../config/progression.js';
import { GAME_EVENTS } from '../core/EventBus.js';

export class Achievements {
    constructor({ gameState, updateDisplay = () => {}, saveGameState = () => {}, eventBus = null } = {}) {
        this.gameState = gameState || {
            addCredits: () => {}
        };
        this.updateDisplay = updateDisplay;
        this.saveGameState = saveGameState;
        this.eventBus = eventBus;
        this.achievements = [];
        this.pendingNotifications = [];

        // Initialize achievements
        this.initAchievements();
    }

    /**
     * Initialize achievements from config
     */
    initAchievements() {
        this.achievements = PROGRESSION_CONFIG.achievements.map((achievement) => ({
            ...achievement,
            unlocked: false,
            unlockedAt: null,
            progress: 0
        }));
    }

    /**
     * Load from saved data
     */
    init(savedData) {
        if (savedData && savedData.achievements) {
            savedData.achievements.forEach((saved) => {
                const achievement = this.achievements.find((a) => a.id === saved.id);
                if (achievement) {
                    achievement.unlocked = saved.unlocked;
                    achievement.unlockedAt = saved.unlockedAt;
                }
            });
        }
    }

    /**
     * Check all achievements
     */
    checkAchievements(stats, lastWin, bet, credits) {
        const newlyUnlocked = [];

        this.achievements.forEach((achievement) => {
            if (!achievement.unlocked) {
                const unlocked = achievement.check(stats, lastWin, bet, credits, this.achievements);

                if (unlocked) {
                    achievement.unlocked = true;
                    achievement.unlockedAt = Date.now();
                    newlyUnlocked.push(achievement);

                    // Award credits using GameState
                    if (achievement.reward) {
                        this.gameState.addCredits(achievement.reward);
                    }
                }
            }
        });

        // Show notifications for newly unlocked
        if (newlyUnlocked.length > 0) {
            this.queueNotifications(newlyUnlocked);
            this.eventBus?.emit?.(GAME_EVENTS.ACHIEVEMENT_UNLOCKED, newlyUnlocked);
            this.updateDisplay();
            this.saveGameState();
        }

        return newlyUnlocked;
    }

    /**
     * Queue achievement notifications
     */
    queueNotifications(achievements) {
        this.pendingNotifications.push(...achievements);
        if (this.pendingNotifications.length > 0 && !this.isShowingNotification) {
            this.showNextNotification();
        }
    }

    /**
     * Show next achievement notification
     */
    async showNextNotification() {
        if (this.pendingNotifications.length === 0) {
            this.isShowingNotification = false;
            return;
        }

        this.isShowingNotification = true;
        const achievement = this.pendingNotifications.shift();

        await this.showAchievementNotification(achievement);

        // Show next after delay
        setTimeout(() => this.showNextNotification(), 500);
    }

    /**
     * Show achievement notification
     */
    async showAchievementNotification(achievement) {
        return new Promise((resolve) => {
            const container = document.getElementById('achievementNotification');
            if (!container) {
                resolve();
                return;
            }

            container.innerHTML = `
                <div class="achievement-card">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-badge">🏆 ACHIEVEMENT UNLOCKED!</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        ${achievement.reward ? `<div class="achievement-reward">+${achievement.reward} credits</div>` : ''}
                    </div>
                </div>
            `;

            container.classList.add('show');

            setTimeout(() => {
                container.classList.remove('show');
                setTimeout(resolve, 300);
            }, 3000);
        });
    }

    /**
     * Get achievement statistics
     */
    getStats() {
        const unlocked = this.achievements.filter((a) => a.unlocked).length;
        const total = this.achievements.length;
        const completion = (unlocked / total) * 100;

        return {
            unlocked,
            total,
            completion: Math.floor(completion),
            achievements: this.achievements
        };
    }

    /**
     * Get unlocked achievements
     */
    getUnlocked() {
        return this.achievements.filter((a) => a.unlocked);
    }

    /**
     * Get locked achievements
     */
    getLocked() {
        return this.achievements.filter((a) => !a.unlocked);
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            achievements: this.achievements.map((a) => ({
                id: a.id,
                unlocked: a.unlocked,
                unlockedAt: a.unlockedAt
            }))
        };
    }
}
