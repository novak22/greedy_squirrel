// Daily rewards and challenges system
import { PROGRESSION_CONFIG } from '../config/progression.js';

export class DailyRewards {
    constructor(game) {
        this.game = game;
        this.currentStreak = 0;
        this.lastClaimDate = null;
        this.challenges = [];
        this.challengeProgress = {};
    }

    /**
     * Initialize from saved data
     */
    init(savedData) {
        if (savedData) {
            this.currentStreak = savedData.currentStreak || 0;
            this.lastClaimDate = savedData.lastClaimDate || null;
            this.challenges = savedData.challenges || [];
            this.challengeProgress = savedData.challengeProgress || {};

            // Check if need to reset streak
            this.checkStreakExpiry();

            // Generate new challenges if needed
            if (this.shouldRefreshChallenges()) {
                this.generateChallenges();
            }
        } else {
            this.generateChallenges();
        }
    }

    /**
     * Check if streak has expired
     */
    checkStreakExpiry() {
        if (!this.lastClaimDate) return;

        const timeSinceLastClaim = Date.now() - this.lastClaimDate;
        const timeout = PROGRESSION_CONFIG.dailyRewards.streakTimeout;

        if (timeSinceLastClaim > timeout * 2) {
            // More than 48 hours - reset streak
            this.currentStreak = 0;
        }
    }

    /**
     * Check if can claim daily reward
     */
    canClaimDailyReward() {
        if (!this.lastClaimDate) return true;

        const now = new Date();
        const lastClaim = new Date(this.lastClaimDate);

        // Check if it's a different day
        return now.getDate() !== lastClaim.getDate() ||
               now.getMonth() !== lastClaim.getMonth() ||
               now.getFullYear() !== lastClaim.getFullYear();
    }

    /**
     * Claim daily reward
     */
    async claimDailyReward() {
        if (!this.canClaimDailyReward()) {
            await this.game.showMessage('Daily reward already claimed!\nCome back tomorrow!');
            return null;
        }

        // Increment streak
        this.currentStreak++;
        if (this.currentStreak > 7) {
            this.currentStreak = 1; // Reset after week
        }

        this.lastClaimDate = Date.now();

        // Get reward for current streak day
        const rewards = PROGRESSION_CONFIG.dailyRewards.rewards;
        const reward = rewards[this.currentStreak - 1];

        if (reward) {
            // Award credits
            this.game.credits += reward.credits;

            // Award bonus if any
            if (reward.bonus === 'freeSpins') {
                // Could trigger free spins here
                await this.showDailyRewardClaimed(reward);
            } else {
                await this.showDailyRewardClaimed(reward);
            }

            this.game.updateDisplay();
            this.game.saveGameState();

            return reward;
        }

        return null;
    }

    /**
     * Show daily reward claimed message
     */
    async showDailyRewardClaimed(reward) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎁</div>
                <h1 class="feature-title">DAILY REWARD!</h1>
                <div class="feature-details">
                    <p class="daily-streak">Day ${this.currentStreak} Streak</p>
                    <p class="daily-reward">+${reward.credits} Credits</p>
                    <p class="daily-description">${reward.description}</p>
                    ${reward.bonus ? `<p class="daily-bonus">BONUS: ${reward.bonusValue} Free Spins!</p>` : ''}
                </div>
                <p class="feature-end">Keep your streak alive!</p>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve => setTimeout(resolve, 3000));

        overlay.classList.remove('show');
    }

    /**
     * Check if challenges should refresh
     */
    shouldRefreshChallenges() {
        if (this.challenges.length === 0) return true;

        const nextReset = PROGRESSION_CONFIG.dailyChallenges.getNextResetTime();
        return Date.now() >= nextReset;
    }

    /**
     * Generate daily challenges
     */
    generateChallenges() {
        const allChallenges = PROGRESSION_CONFIG.dailyChallenges.challenges;
        const count = PROGRESSION_CONFIG.dailyChallenges.challengesPerDay;

        // Shuffle and pick random challenges
        const shuffled = [...allChallenges].sort(() => Math.random() - 0.5);
        this.challenges = shuffled.slice(0, count).map(challenge => ({
            ...challenge,
            target: challenge.targetGenerator(),
            progress: 0,
            completed: false,
            claimed: false
        }));

        this.challengeProgress = {};
        this.game.saveGameState();
    }

    /**
     * Update challenge progress
     */
    updateChallengeProgress(type, amount = 1) {
        let anyUpdated = false;

        this.challenges.forEach(challenge => {
            if (challenge.id === type && !challenge.completed) {
                challenge.progress += amount;

                if (challenge.progress >= challenge.target) {
                    challenge.progress = challenge.target;
                    challenge.completed = true;
                    anyUpdated = true;
                }
            }
        });

        if (anyUpdated) {
            this.game.saveGameState();
            this.updateChallengesUI();
        }
    }

    /**
     * Claim challenge reward
     */
    async claimChallengeReward(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);

        if (!challenge || !challenge.completed || challenge.claimed) {
            return false;
        }

        challenge.claimed = true;
        this.game.credits += challenge.reward;
        this.game.updateDisplay();
        this.game.saveGameState();

        await this.game.showMessage(`Challenge Complete!\n${challenge.name}\n+${challenge.reward} Credits`);

        return true;
    }

    /**
     * Update challenges UI
     */
    updateChallengesUI() {
        // Try to find the challenges list area in stats modal first
        let container = document.getElementById('challengesListArea');

        // Fall back to challenges display panel
        if (!container) {
            container = document.getElementById('challengesDisplay');
        }

        if (!container) return;

        let html = '<div class="challenges-list">';

        this.challenges.forEach(challenge => {
            const progress = Math.min((challenge.progress / challenge.target) * 100, 100);
            const description = challenge.description.replace('{target}', challenge.target);

            html += `
                <div class="challenge-item ${challenge.completed ? 'completed' : ''} ${challenge.claimed ? 'claimed' : ''}">
                    <div class="challenge-header">
                        <div class="challenge-icon">${challenge.icon}</div>
                        <div class="challenge-name">${challenge.name}</div>
                    </div>
                    <div class="challenge-description">${description}</div>
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress" style="width: ${progress}%"></div>
                    </div>
                    <div class="challenge-stats">${challenge.progress} / ${challenge.target}</div>
                    <div class="challenge-reward">
                        ${challenge.completed && !challenge.claimed ?
                            `<button class="btn-claim" onclick="window.game.dailyRewards.claimChallengeReward('${challenge.id}')">Claim ${challenge.reward} Credits</button>` :
                            challenge.claimed ? '✓ Claimed' :
                            `Reward: ${challenge.reward} Credits`}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            currentStreak: this.currentStreak,
            lastClaimDate: this.lastClaimDate,
            challenges: this.challenges,
            challengeProgress: this.challengeProgress
        };
    }
}
