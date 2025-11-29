// Daily challenges system
import { PROGRESSION_CONFIG } from '../config/progression.js';

export class DailyChallenges {
    constructor(game) {
        this.game = game;
        this.challenges = [];
        this.challengeProgress = {};
    }

    /**
     * Initialize from saved data
     */
    init(savedData) {
        if (savedData) {
            this.challenges = savedData.challenges || [];
            this.challengeProgress = savedData.challengeProgress || {};

            if (this.shouldRefreshChallenges()) {
                this.generateChallenges();
            }
        } else {
            this.generateChallenges();
        }
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
        this.game.state.addCredits(challenge.reward);
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
                            `<button class="btn-claim" onclick="window.game.dailyChallenges.claimChallengeReward('${challenge.id}')">Claim ${challenge.reward} Credits</button>` :
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
            challenges: this.challenges,
            challengeProgress: this.challengeProgress
        };
    }
}
