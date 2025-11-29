// Main SlotMachine class with Phase 1, 2, 3 & 4 enhancements
import { SYMBOLS, getAllSymbolEmojis } from '../config/symbols.js';
import { GAME_CONFIG } from '../config/game.js';
import { RNG } from '../utils/RNG.js';
import { Storage } from '../utils/Storage.js';
import { PaylineEvaluator } from './PaylineEvaluator.js';
import { FreeSpins } from '../features/FreeSpins.js';
import { BonusGame } from '../features/BonusGame.js';
import { Cascade } from '../features/Cascade.js';
import { LevelSystem } from '../progression/LevelSystem.js';
import { Achievements } from '../progression/Achievements.js';
import { DailyRewards } from '../progression/DailyRewards.js';
import { Statistics } from '../progression/Statistics.js';
import { Autoplay } from '../features/Autoplay.js';
import { TurboMode } from '../features/TurboMode.js';
import { VisualEffects } from '../effects/VisualEffects.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Settings } from '../ui/Settings.js';
import { SpinHistory } from '../ui/SpinHistory.js';
import { Gamble } from '../features/Gamble.js';

export class SlotMachine {
    constructor() {
        // Game configuration
        this.reelCount = GAME_CONFIG.reelCount;
        this.rowCount = GAME_CONFIG.rowCount;
        this.symbolsPerReel = GAME_CONFIG.symbolsPerReel;

        // Reel strips (generated once with weighted symbols)
        this.reelStrips = [];
        for (let i = 0; i < this.reelCount; i++) {
            this.reelStrips.push(RNG.generateReelStrip(i, this.symbolsPerReel));
        }

        // Game state
        this.credits = GAME_CONFIG.initialCredits;
        this.currentBet = GAME_CONFIG.betOptions[0];
        this.betOptions = GAME_CONFIG.betOptions;
        this.currentBetIndex = 0;
        this.lastWin = 0;

        this.isSpinning = false;
        this.reelPositions = [0, 0, 0, 0, 0];

        // Statistics tracking
        this.stats = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            scatterHits: 0,
            bonusHits: 0,
            freeSpinsTriggers: 0,
            cascadeWins: 0
        };

        // Phase 2: Initialize features
        this.freeSpins = new FreeSpins(this);
        this.bonusGame = new BonusGame(this);
        this.cascade = new Cascade(this);

        // Phase 3: Initialize progression systems
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyRewards = new DailyRewards(this);
        this.statistics = new Statistics(this);

        // Phase 4: Initialize advanced features
        this.soundManager = new SoundManager();
        this.visualEffects = new VisualEffects(this);
        this.autoplay = new Autoplay(this);
        this.turboMode = new TurboMode(this);
        this.settings = new Settings(this);

        // Phase 5: Initialize spin history and gamble
        this.spinHistory = new SpinHistory(20);
        this.gamble = new Gamble(this);

        // Load saved data
        this.loadGameState();

        this.init();
    }

    init() {
        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();

        // Phase 3: Initialize progression UI
        this.levelSystem.updateUI();
        this.dailyRewards.updateChallengesUI();

        // Check if can claim daily reward
        if (this.dailyRewards.canClaimDailyReward()) {
            this.showDailyRewardPrompt();
        }
    }

    /**
     * Load game state from localStorage
     */
    loadGameState() {
        const savedData = Storage.load();
        if (savedData) {
            this.credits = savedData.credits || GAME_CONFIG.initialCredits;
            this.currentBet = savedData.currentBet || GAME_CONFIG.betOptions[0];
            this.currentBetIndex = savedData.currentBetIndex || 0;
            this.stats = savedData.stats || this.stats;

            // Phase 3: Load progression data
            if (savedData.progression) {
                this.levelSystem.init(savedData.progression.levelSystem);
                this.achievements.init(savedData.progression.achievements);
                this.dailyRewards.init(savedData.progression.dailyRewards);
                this.statistics.init(savedData.progression.statistics);
            }

            // Phase 4: Load advanced features data
            if (savedData.phase4) {
                this.soundManager.init(savedData.phase4.sound);
                this.visualEffects.init(savedData.phase4.visualEffects);
                this.turboMode.init(savedData.phase4.turboMode);
            }

            // Phase 5: Load spin history
            if (savedData.phase5) {
                this.spinHistory.init(savedData.phase5.spinHistory);
            }

            console.log('Game state loaded from localStorage');
        }
    }

    /**
     * Save game state to localStorage
     */
    saveGameState() {
        Storage.save({
            credits: this.credits,
            currentBet: this.currentBet,
            currentBetIndex: this.currentBetIndex,
            stats: this.stats,
            // Phase 3: Save progression data
            progression: {
                levelSystem: this.levelSystem.getSaveData(),
                achievements: this.achievements.getSaveData(),
                dailyRewards: this.dailyRewards.getSaveData(),
                statistics: this.statistics.getSaveData()
            },
            // Phase 4: Save advanced features data
            phase4: {
                sound: this.soundManager.getSaveData(),
                visualEffects: this.visualEffects.getSaveData(),
                turboMode: this.turboMode.getSaveData()
            },
            // Phase 5: Save spin history
            phase5: {
                spinHistory: this.spinHistory.getSaveData()
            }
        });
    }

    createReels() {
        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            const container = reel.querySelector('.symbol-container');
            container.innerHTML = '';

            // Display initial symbols from reel strip
            const position = RNG.getRandomPosition(this.symbolsPerReel);
            this.reelPositions[i] = position;
            const symbols = RNG.getSymbolsAtPosition(this.reelStrips[i], position, this.rowCount);

            for (let j = 0; j < this.rowCount; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = symbols[j];
                container.appendChild(symbol);
            }
        }
    }

    attachEventListeners() {
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        document.getElementById('increaseBet').addEventListener('click', () => this.changeBet(1));
        document.getElementById('decreaseBet').addEventListener('click', () => this.changeBet(-1));
        document.getElementById('maxBet').addEventListener('click', () => this.setMaxBet());
        document.getElementById('paytableBtn').addEventListener('click', () => this.togglePaytable(true));
        document.getElementById('closePaytable').addEventListener('click', () => this.togglePaytable(false));

        // Phase 3: Stats button and modal
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.toggleStats());
        }

        const closeStats = document.getElementById('closeStats');
        if (closeStats) {
            closeStats.addEventListener('click', () => this.toggleStats());
        }

        // Phase 3: Stats tabs
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.updateStatsDisplay(tab.dataset.tab);
            });
        });

        // Phase 4: Advanced controls
        const autoplayBtn = document.getElementById('autoplayBtn');
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                if (this.autoplay.isActive) {
                    this.autoplay.stop();
                } else {
                    this.autoplay.start();
                }
            });
        }

        const turboBtn = document.getElementById('turboBtn');
        if (turboBtn) {
            turboBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.turboMode.toggle();
                this.updateTurboUI();
            });
        }

        // Phase 4: Settings
        this.settings.attachEventListeners();

        // Phase 5: History panel
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.toggle();
            });
        }

        const closeHistory = document.getElementById('closeHistory');
        if (closeHistory) {
            closeHistory.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.hide();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpinning && !this.autoplay.isActive) {
                e.preventDefault();
                this.spin();
            }
        });
    }

    updateDisplay() {
        document.getElementById('credits').textContent = this.credits;
        document.getElementById('bet').textContent = this.currentBet;
        document.getElementById('betDisplay').textContent = this.currentBet;
        document.getElementById('win').textContent = this.lastWin;
    }

    changeBet(direction) {
        if (this.isSpinning) return;

        this.soundManager.playClick();

        this.currentBetIndex += direction;

        if (this.currentBetIndex < 0) {
            this.currentBetIndex = 0;
        } else if (this.currentBetIndex >= this.betOptions.length) {
            this.currentBetIndex = this.betOptions.length - 1;
        }

        this.currentBet = this.betOptions[this.currentBetIndex];
        this.updateDisplay();
    }

    setMaxBet() {
        if (this.isSpinning) return;

        this.soundManager.playClick();

        this.currentBetIndex = this.betOptions.length - 1;
        this.currentBet = this.betOptions[this.currentBetIndex];
        this.updateDisplay();
    }

    async spin() {
        if (this.isSpinning) return;

        // Check if in bonus game (can't spin during bonus)
        if (this.bonusGame.isActive()) return;

        // Free spins mode - don't deduct credits
        const isFreeSpin = this.freeSpins.isActive();

        if (!isFreeSpin && this.credits < this.currentBet) {
            this.showMessage('INSUFFICIENT CREDITS');
            return;
        }

        this.isSpinning = true;

        // Phase 4: Play spin sound
        this.soundManager.playReelSpin();

        // Only deduct bet if not in free spins
        if (!isFreeSpin) {
            this.credits -= this.currentBet;
        }

        this.lastWin = 0;
        this.updateDisplay();

        // Update statistics
        this.stats.totalSpins++;
        if (!isFreeSpin) {
            this.stats.totalWagered += this.currentBet;
        }

        // Phase 3: Award spin XP
        this.levelSystem.awardXP('spin');
        this.dailyRewards.updateChallengeProgress('play_spins', 1);

        document.getElementById('spinBtn').disabled = true;
        this.clearWinningSymbols();
        this.hidePaylines();

        const spinPromises = [];

        for (let i = 0; i < this.reelCount; i++) {
            // Phase 4: Use turbo mode timing if active
            const duration = this.turboMode.getReelSpinTime(i);
            spinPromises.push(this.spinReel(i, duration));
        }

        await Promise.all(spinPromises);

        const result = this.getReelResult();
        let winInfo = PaylineEvaluator.evaluateWins(result, this.currentBet);
        const bonusInfo = PaylineEvaluator.checkBonusTrigger(result);

        let totalWin = 0;

        if (winInfo.totalWin > 0) {
            // Apply free spins multiplier if active
            if (isFreeSpin) {
                const originalWin = winInfo.totalWin;
                winInfo.totalWin = this.freeSpins.applyMultiplier(winInfo.totalWin);
                this.freeSpins.addWin(winInfo.totalWin);
            }

            totalWin = winInfo.totalWin;

            this.highlightWinningSymbols(winInfo.winningPositions);
            this.showWinningPaylines(winInfo.winningLines);

            // Phase 4: Play win sound and visual effects
            const winMultiplier = winInfo.totalWin / this.currentBet;
            this.soundManager.playWin(winMultiplier);
            this.visualEffects.showWinCelebration(winInfo.totalWin, winMultiplier);

            // Phase 5: Screen shake for mega wins
            if (winMultiplier >= 100) {
                this.triggerScreenShake();
            }

            // Build win message
            let message = `WIN: ${winInfo.totalWin}`;
            if (isFreeSpin) {
                message += `\n✨ ${this.freeSpins.multiplier}x MULTIPLIER!`;
            }
            if (winInfo.hasScatterWin) {
                message += `\n⭐ ${winInfo.scatterCount} SCATTERS!`;
                this.stats.scatterHits++;

                // Phase 3: Track scatter hits
                this.statistics.recordFeatureTrigger('scatter', { count: winInfo.scatterCount });
                this.dailyRewards.updateChallengeProgress('hit_scatters', winInfo.scatterCount);
                this.levelSystem.awardXP('scatter');

                // Phase 4: Scatter sound and effects
                this.soundManager.playScatter();
            }

            // Phase 5: Pass win amount for counter animation
            await this.showMessage(message, winInfo.totalWin);

            // Phase 2: Check for cascading wins (if enabled)
            if (this.cascade.enabled) {
                const cascadeWins = await this.cascade.executeCascade(winInfo.winningPositions);
                if (cascadeWins > 0) {
                    totalWin += cascadeWins;
                    this.stats.cascadeWins++;
                }
            }
        }

        // Add total wins to credits
        if (totalWin > 0) {
            this.credits += totalWin;
            this.lastWin = totalWin;
            this.stats.totalWon += totalWin;

            if (totalWin > this.stats.biggestWin) {
                this.stats.biggestWin = totalWin;
            }

            // Phase 3: Award win XP and track stats
            this.levelSystem.awardXP('win', totalWin);
            this.statistics.recordSpin(this.currentBet, totalWin, true);
            this.dailyRewards.updateChallengeProgress('win_amount', totalWin);

            // Check for big win
            const winMultiplier = totalWin / this.currentBet;
            if (winMultiplier >= 100) {
                this.levelSystem.awardXP('bigWin');
            }

            // Update daily challenges
            this.dailyRewards.updateChallengeProgress('big_win', winMultiplier >= 50 ? 1 : 0);

            this.updateDisplay();
        } else {
            // Phase 3: Track loss
            this.statistics.recordSpin(this.currentBet, 0, false);
        }

        // Phase 2: Check for Free Spins trigger
        if (winInfo.hasScatterWin && this.freeSpins.shouldTrigger(winInfo.scatterCount)) {
            if (isFreeSpin) {
                // Re-trigger during free spins
                await this.freeSpins.retrigger(winInfo.scatterCount);
            } else {
                // Initial trigger
                this.stats.freeSpinsTriggers++;

                // Phase 3: Track free spins trigger
                this.statistics.recordFeatureTrigger('freeSpins');
                this.levelSystem.awardXP('freeSpins');
                this.dailyRewards.updateChallengeProgress('trigger_freespins', 1);

                // Phase 4: Free spins trigger sound
                this.soundManager.playFreeSpinsTrigger();

                await this.freeSpins.trigger(winInfo.scatterCount);

                // Execute free spins
                await this.executeFreeSpins();
            }
        }

        // Phase 2: Check for Bonus trigger
        if (bonusInfo.triggered && !isFreeSpin) {
            this.stats.bonusHits++;

            // Phase 3: Track bonus trigger
            this.statistics.recordFeatureTrigger('bonus');
            this.levelSystem.awardXP('bonus');
            this.dailyRewards.updateChallengeProgress('trigger_bonus', 1);

            // Phase 4: Bonus trigger sound
            this.soundManager.playBonusTrigger();

            const bonusCount = bonusInfo.bonusLines[0].count;
            await this.bonusGame.trigger(bonusCount);

            const bonusWin = await this.bonusGame.end();
            if (bonusWin > 0) {
                this.credits += bonusWin;
                this.lastWin += bonusWin;
                this.stats.totalWon += bonusWin;

                if (bonusWin > this.stats.biggestWin) {
                    this.stats.biggestWin = bonusWin;
                }

                this.updateDisplay();
                await this.showMessage(`BONUS WIN: ${bonusWin}`);
            }
        }

        // Handle free spins countdown
        if (isFreeSpin) {
            const hasMoreSpins = await this.freeSpins.executeSpin();
            if (!hasMoreSpins) {
                const freeSpinsTotal = await this.freeSpins.end();
            }
        }

        // Phase 3: Check achievements
        this.achievements.checkAchievements(
            this.statistics.allTime,
            this.lastWin,
            this.currentBet,
            this.credits
        );

        // Phase 5: Offer gamble on regular wins (not during free spins/bonus)
        if (totalWin > 0 && !isFreeSpin && !bonusInfo.triggered && this.gamble.canGamble(totalWin)) {
            // Deduct the win temporarily
            this.credits -= totalWin;
            this.updateDisplay();

            // Offer gamble
            const gambleResult = await this.offerGamble(totalWin);

            // Add gamble result back
            this.credits += gambleResult;
            totalWin = gambleResult; // Update total win for history
            this.lastWin = gambleResult;
            this.updateDisplay();

            // Track gamble in statistics if they won more
            if (gambleResult > 0) {
                this.statistics.recordSpin(this.currentBet, gambleResult, true);
            }
        }

        // Phase 5: Record spin in history
        const features = [];
        if (this.freeSpins.isActive()) features.push('freeSpins');
        if (winInfo.hasScatterWin) features.push('scatter');
        if (bonusInfo.triggered) features.push('bonus');
        if (this.cascade.enabled && totalWin > winInfo.totalWin) features.push('cascade');

        this.spinHistory.recordSpin(this.currentBet, totalWin, features);

        // Save game state after each spin
        this.saveGameState();

        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;

        if (this.credits === 0 && !isFreeSpin) {
            await this.showMessage('GAME OVER\nResetting to 1000 credits');
            this.credits = GAME_CONFIG.initialCredits;
            this.updateDisplay();
            this.saveGameState();
        }
    }

    /**
     * Execute all free spins
     */
    async executeFreeSpins() {
        while (this.freeSpins.isActive() && this.freeSpins.remainingSpins > 0) {
            await this.spin();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * Phase 5: Offer gamble feature after win
     */
    async offerGamble(winAmount) {
        return new Promise(async (resolve) => {
            const overlay = document.getElementById('featureOverlay');
            if (!overlay) {
                resolve(winAmount);
                return;
            }

            overlay.innerHTML = `
                <div class="gamble-container">
                    <h2 class="gamble-title">🎴 GAMBLE FEATURE</h2>

                    <div class="gamble-current-win">
                        <div class="gamble-label">You Won:</div>
                        <div class="gamble-amount">${winAmount}</div>
                    </div>

                    <div class="gamble-message">
                        Try to double your win?<br>
                        Guess the card color!
                    </div>

                    <div class="gamble-buttons">
                        <button class="btn btn-small" id="gambleAccept">
                            🎲 GAMBLE
                        </button>
                        <button class="btn btn-small" id="gambleDecline">
                            💰 COLLECT
                        </button>
                    </div>
                </div>
            `;

            overlay.classList.add('show');

            document.getElementById('gambleAccept').addEventListener('click', async () => {
                overlay.classList.remove('show');
                // start() now returns a promise that resolves with the final win amount
                const finalAmount = await this.gamble.start(winAmount);
                resolve(finalAmount);
            });

            document.getElementById('gambleDecline').addEventListener('click', () => {
                overlay.classList.remove('show');
                this.soundManager.playClick();
                resolve(winAmount);
            });
        });
    }

    /**
     * Evaluate wins without displaying (used by cascade feature)
     */
    async evaluateWinsWithoutDisplay(result) {
        return PaylineEvaluator.evaluateWins(result, this.currentBet);
    }

    spinReel(reelIndex, duration) {
        return new Promise((resolve) => {
            const reel = document.getElementById(`reel-${reelIndex}`);
            const container = reel.querySelector('.symbol-container');

            reel.classList.add('spinning');

            let spins = 0;
            const maxSpins = Math.floor(duration / 100);

            const interval = setInterval(() => {
                // Show random symbols during spin for visual effect
                const symbols = container.querySelectorAll('.symbol');
                const position = RNG.getRandomPosition(this.symbolsPerReel);
                const displaySymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], position, this.rowCount);

                symbols.forEach((symbol, index) => {
                    symbol.textContent = displaySymbols[index];
                });

                spins++;
                if (spins >= maxSpins) {
                    clearInterval(interval);
                    reel.classList.remove('spinning');

                    // Set final position using weighted RNG
                    const finalPosition = RNG.getRandomPosition(this.symbolsPerReel);
                    this.reelPositions[reelIndex] = finalPosition;
                    const finalSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], finalPosition, this.rowCount);

                    for (let i = 0; i < this.rowCount; i++) {
                        symbols[i].textContent = finalSymbols[i];
                    }

                    resolve();
                }
            }, 100);
        });
    }

    getReelResult() {
        const result = [];

        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            const symbols = reel.querySelectorAll('.symbol');
            const reelSymbols = [];

            for (let j = 0; j < this.rowCount; j++) {
                reelSymbols.push(symbols[j].textContent);
            }

            result.push(reelSymbols);
        }

        return result;
    }

    highlightWinningSymbols(winningPositions) {
        this.clearWinningSymbols();

        winningPositions.forEach(pos => {
            const [reel, row] = pos.split('-').map(Number);
            const reelEl = document.getElementById(`reel-${reel}`);
            const symbols = reelEl.querySelectorAll('.symbol');
            if (symbols[row]) {
                symbols[row].classList.add('winning');
            }
        });
    }

    clearWinningSymbols() {
        document.querySelectorAll('.symbol.winning').forEach(symbol => {
            symbol.classList.remove('winning');
        });
    }

    showWinningPaylines(winningLines) {
        winningLines.forEach(lineIndex => {
            const payline = document.querySelector(`.payline-${lineIndex + 1}`);
            if (payline) {
                payline.classList.add('active');
            }
        });
    }

    hidePaylines() {
        document.querySelectorAll('.payline').forEach(line => {
            line.classList.remove('active');
        });
    }

    showMessage(message, winAmount = 0) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('winOverlay');

            // Phase 5: Win counter animation
            if (winAmount > 0) {
                this.animateWinCounter(overlay, winAmount, message);
            } else {
                overlay.textContent = message;
            }

            overlay.classList.add('show');

            // Phase 4: Use turbo mode timing for messages
            const duration = this.turboMode.getMessageDelay();

            setTimeout(() => {
                overlay.classList.remove('show');
                resolve();
            }, duration);
        });
    }

    /**
     * Phase 5: Animate win counter from 0 to final amount
     */
    animateWinCounter(overlay, finalAmount, baseMessage) {
        const duration = this.turboMode.isActive ? 500 : 1000;
        const steps = this.turboMode.isActive ? 10 : 20;
        const stepDuration = duration / steps;
        const increment = finalAmount / steps;

        let currentAmount = 0;
        let step = 0;

        const countInterval = setInterval(() => {
            step++;
            currentAmount = Math.min(Math.floor(increment * step), finalAmount);

            // Build message with current count
            let message = baseMessage.replace(/WIN: \d+/, `WIN: ${currentAmount}`);
            overlay.textContent = message;

            // Play tick sound every few steps
            if (step % 3 === 0 && this.soundManager.effectsEnabled) {
                this.soundManager.playTone(400 + (step * 20), 0.03, 'sine');
            }

            if (currentAmount >= finalAmount) {
                clearInterval(countInterval);
                overlay.textContent = baseMessage; // Final message
            }
        }, stepDuration);
    }

    togglePaytable(show) {
        const modal = document.getElementById('paytableModal');
        if (show) {
            modal.classList.add('show');
        } else {
            modal.classList.remove('show');
        }
    }

    /**
     * Phase 3: Show level up message
     */
    async showLevelUpMessage(level, reward) {
        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        // Phase 4: Level up sound and visual effects
        this.soundManager.playLevelUp();
        this.visualEffects.showLevelUpEffect();

        // Unlock turbo mode at level 10
        if (level === 10 && reward?.type === 'feature' && reward?.value === 'turbo') {
            this.turboMode.unlock();
        }

        let rewardText = '';
        if (reward) {
            rewardText = `<p class="level-reward">+${reward.credits} Credits</p>`;
            if (reward.type === 'feature') {
                rewardText += `<p class="level-unlock">✨ ${reward.value.toUpperCase()} UNLOCKED!</p>`;
            }
        }

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎉</div>
                <h1 class="feature-title">LEVEL UP!</h1>
                <div class="feature-details">
                    <p class="level-number-big">LEVEL ${level}</p>
                    ${rewardText}
                </div>
            </div>
        `;
        overlay.classList.add('show');

        await new Promise(resolve => setTimeout(resolve, 2500));
        overlay.classList.remove('show');
    }

    /**
     * Phase 3: Show daily reward prompt
     */
    async showDailyRewardPrompt() {
        // Wait a bit after page load
        await new Promise(resolve => setTimeout(resolve, 1000));

        const overlay = document.getElementById('featureOverlay');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="feature-transition">
                <div class="feature-icon">🎁</div>
                <h1 class="feature-title">DAILY REWARD</h1>
                <div class="feature-details">
                    <p class="daily-prompt">Your daily reward is ready!</p>
                </div>
                <button class="btn btn-claim-daily" id="claimDailyBtn">CLAIM REWARD</button>
            </div>
        `;
        overlay.classList.add('show');

        // Add click handler
        document.getElementById('claimDailyBtn').addEventListener('click', async () => {
            overlay.classList.remove('show');
            await this.dailyRewards.claimDailyReward();
        });
    }

    /**
     * Phase 3: Toggle statistics dashboard
     */
    toggleStats() {
        const modal = document.getElementById('statsModal');
        if (!modal) return;

        if (!modal.classList.contains('active')) {
            this.currentStatsTab = 'session';
            this.updateStatsDisplay('session');
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }

    /**
     * Phase 3: Update statistics display with tabs
     */
    updateStatsDisplay(tab = 'session') {
        const container = document.getElementById('statsContentArea');
        if (!container) return;

        // Update active tab
        document.querySelectorAll('.stats-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        const sessionStats = this.statistics.getSessionStats();
        const allTimeStats = this.statistics.getAllTimeStats();
        const achievementStats = this.achievements.getStats();

        let html = '';

        switch(tab) {
            case 'session':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">🎮 Current Session</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Spins</div>
                            <div class="stat-value">${sessionStats.spins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Wagered</div>
                            <div class="stat-value">${sessionStats.wagered}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Won</div>
                            <div class="stat-value">${sessionStats.won}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit</div>
                            <div class="stat-value ${sessionStats.netProfit >= 0 ? 'positive' : 'negative'}">${sessionStats.netProfit >= 0 ? '+' : ''}${sessionStats.netProfit}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Win Rate</div>
                            <div class="stat-value neutral">${sessionStats.winRate}%</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Biggest Win</div>
                            <div class="stat-value">${sessionStats.biggestWin}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Best Streak</div>
                            <div class="stat-value">${sessionStats.bestStreak}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Play Time</div>
                            <div class="stat-value">${Statistics.formatTime(sessionStats.sessionTime)}</div>
                        </div>
                    </div>
                `;
                break;

            case 'alltime':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">🏆 All-Time Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Spins</div>
                            <div class="stat-value">${allTimeStats.totalSpins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Wagered</div>
                            <div class="stat-value">${allTimeStats.totalWagered}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Won</div>
                            <div class="stat-value">${allTimeStats.totalWon}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit</div>
                            <div class="stat-value ${allTimeStats.netProfit >= 0 ? 'positive' : 'negative'}">${allTimeStats.netProfit >= 0 ? '+' : ''}${allTimeStats.netProfit}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">RTP</div>
                            <div class="stat-value neutral">${allTimeStats.rtp}%</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Biggest Win</div>
                            <div class="stat-value">${allTimeStats.biggestWin}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Win Multiplier</div>
                            <div class="stat-value">${allTimeStats.biggestWinMultiplier}x</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Best Streak</div>
                            <div class="stat-value">${allTimeStats.bestWinStreak}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Free Spins</div>
                            <div class="stat-value">${allTimeStats.freeSpinsTriggers}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Bonus Rounds</div>
                            <div class="stat-value">${allTimeStats.bonusHits}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Cascade Wins</div>
                            <div class="stat-value">${allTimeStats.cascadeWins}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Play Time</div>
                            <div class="stat-value">${Statistics.formatTime(allTimeStats.totalPlayTime + sessionStats.sessionTime)}</div>
                        </div>
                    </div>
                `;
                break;

            case 'achievements':
                const unlocked = this.achievements.getUnlocked();
                const locked = this.achievements.getLocked();

                html = `
                    <h3 style="color: #ffd700; margin-bottom: 10px;">🏅 Achievements (${achievementStats.unlocked}/${achievementStats.total})</h3>
                    <p style="text-align: center; color: #b0bec5; margin-bottom: 20px;">Completion: ${achievementStats.completion}%</p>
                    <div class="achievements-grid">
                        ${unlocked.map(a => `
                            <div class="achievement-item unlocked">
                                <div class="achievement-item-icon">${a.icon}</div>
                                <div class="achievement-item-name">${a.name}</div>
                                <div class="achievement-item-desc">${a.description}</div>
                                <div class="achievement-item-reward">+${a.reward} Credits</div>
                                <div class="achievement-item-date">Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}</div>
                            </div>
                        `).join('')}
                        ${locked.map(a => `
                            <div class="achievement-item locked">
                                <div class="achievement-item-icon">${a.icon}</div>
                                <div class="achievement-item-name">???</div>
                                <div class="achievement-item-desc">${a.description}</div>
                                <div class="achievement-item-reward">+${a.reward} Credits</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'daily':
                const canClaim = this.dailyRewards.canClaimDailyReward();
                const streak = this.dailyRewards.currentStreak;

                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">📅 Daily Rewards & Challenges</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <p style="font-size: 1.2em; color: #ffd700; margin-bottom: 15px;">Current Streak: ${streak} days</p>
                        ${canClaim ?
                            '<button class="btn-claim-reward" onclick="window.game.dailyRewards.claimDailyReward()">Claim Daily Reward</button>' :
                            '<p style="color: #b0bec5;">Come back tomorrow for your next reward!</p>'
                        }
                    </div>
                    <div id="challengesListArea" style="margin-top: 30px;"></div>
                `;
                container.innerHTML = html;
                this.dailyRewards.updateChallengesUI();
                return;
        }

        container.innerHTML = html;
    }

    /**
     * Phase 4: Update turbo mode UI
     */
    updateTurboUI() {
        const container = document.querySelector('.game-container');
        if (this.turboMode.isActive) {
            container.classList.add('turbo-mode');
        } else {
            container.classList.remove('turbo-mode');
        }
        this.saveGameState();
    }

    /**
     * Phase 5: Trigger screen shake effect for mega wins
     */
    triggerScreenShake() {
        const container = document.querySelector('.game-container');
        container.classList.add('screen-shake');

        setTimeout(() => {
            container.classList.remove('screen-shake');
        }, 500);
    }

    /**
     * Phase 5: Reset all game data
     */
    resetAllData() {
        // Clear localStorage
        localStorage.removeItem('greedySquirrelGame');

        // Reset all game state
        this.credits = GAME_CONFIG.initialCredits;
        this.currentBet = GAME_CONFIG.betOptions[0];
        this.currentBetIndex = 0;
        this.lastWin = 0;

        // Reset stats
        this.stats = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            scatterHits: 0,
            bonusHits: 0,
            freeSpinsTriggers: 0,
            cascadeWins: 0
        };

        // Clear all subsystems
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyRewards = new DailyRewards(this);
        this.statistics = new Statistics(this);
        this.spinHistory.clear();

        this.updateDisplay();
    }
}
