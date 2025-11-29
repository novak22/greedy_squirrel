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
import { DailyChallenges } from '../progression/DailyChallenges.js';
import { Statistics } from '../progression/Statistics.js';
import { Autoplay } from '../features/Autoplay.js';
import { TurboMode } from '../features/TurboMode.js';
import { VisualEffects } from '../effects/VisualEffects.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Settings } from '../ui/Settings.js';
import { SpinHistory } from '../ui/SpinHistory.js';
import { Gamble } from '../features/Gamble.js';
import { BuyBonus } from '../features/BuyBonus.js';
import { WinAnticipation } from '../features/WinAnticipation.js';
import { TimerManager } from '../utils/TimerManager.js';

export class SlotMachine {
    constructor() {
        this.timerManager = new TimerManager();

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

        // Initialize bonus features
        this.freeSpins = new FreeSpins(this);
        this.bonusGame = new BonusGame(this);
        this.cascade = new Cascade(this);

        // Initialize progression systems
        this.levelSystem = new LevelSystem(this);
        this.achievements = new Achievements(this);
        this.dailyChallenges = new DailyChallenges(this);
        this.statistics = new Statistics(this);

        // Initialize advanced features
        this.soundManager = new SoundManager();
        this.visualEffects = new VisualEffects(this);
        this.autoplay = new Autoplay(this, this.timerManager);
        this.turboMode = new TurboMode(this);
        this.settings = new Settings(this);

        // Gamble settings
        this.autoCollectEnabled = false;

        // Track active timers to avoid overlapping animations
        this.winCounterInterval = null;

        // Initialize gamble and history features
        this.spinHistory = new SpinHistory(20);
        this.gamble = new Gamble(this);
        this.buyBonus = new BuyBonus(this);
        this.winAnticipation = new WinAnticipation(this);

        // Load saved data
        this.loadGameState();

        this.init();
    }

    init() {
        this.updateDisplay();
        this.createReels();
        this.attachEventListeners();

        // Initialize progression UI
        this.levelSystem.updateUI();
        this.dailyChallenges.updateChallengesUI();
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

            // Load progression data
            if (savedData.progression) {
                this.levelSystem.init(savedData.progression.levelSystem);
                this.achievements.init(savedData.progression.achievements);
                this.dailyChallenges.init(savedData.progression.dailyChallenges || savedData.progression.dailyRewards);
                this.statistics.init(savedData.progression.statistics);
            }

            // Load advanced features data
            if (savedData.phase4) {
                this.soundManager.init(savedData.phase4.sound);
                this.visualEffects.init(savedData.phase4.visualEffects);
                this.turboMode.init(savedData.phase4.turboMode);
                this.autoplay.init(savedData.phase4.autoplay);
                this.cascade.init(savedData.phase4.cascade);
            }

            // Load spin history and gamble settings
            if (savedData.phase5) {
                this.spinHistory.init(savedData.phase5.spinHistory);
                this.autoCollectEnabled = savedData.phase5.autoCollectEnabled || false;
            }

            console.log('Game state loaded from localStorage');
        } else {
            // Initialize progression systems for new sessions
            this.dailyChallenges.init();
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
            // Save progression data
            progression: {
                levelSystem: this.levelSystem.getSaveData(),
                achievements: this.achievements.getSaveData(),
                dailyChallenges: this.dailyChallenges.getSaveData(),
                statistics: this.statistics.getSaveData()
            },
            // Save advanced features data
            phase4: {
                sound: this.soundManager.getSaveData(),
                visualEffects: this.visualEffects.getSaveData(),
                turboMode: this.turboMode.getSaveData(),
                autoplay: this.autoplay.getSaveData(),
                cascade: this.cascade.getSaveData()
            },
            // Save spin history and gamble settings
            phase5: {
                spinHistory: this.spinHistory.getSaveData(),
                autoCollectEnabled: this.autoCollectEnabled
            }
        });
    }

    createReels() {
        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            if (!reel) {
                console.error(`Reel element not found: reel-${i}`);
                continue;
            }

            const container = reel.querySelector('.symbol-container');
            if (!container) {
                console.error(`Symbol container not found in reel-${i}`);
                continue;
            }

            container.innerHTML = '';

            // Display initial symbols from reel strip
            const position = RNG.getRandomPosition(this.symbolsPerReel);
            this.reelPositions[i] = position;
            const symbols = RNG.getSymbolsAtPosition(this.reelStrips[i], position, this.rowCount);

            for (let j = 0; j < this.rowCount; j++) {
                const symbol = document.createElement('div');
                symbol.className = 'symbol';
                symbol.textContent = symbols[j];

                // Apply special classes to initial symbols
                this.applySymbolClasses(symbol, symbols[j]);

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

        // Stats button and modal
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.toggleStats());
        }

        const closeStats = document.getElementById('closeStats');
        if (closeStats) {
            closeStats.addEventListener('click', () => this.toggleStats());
        }

        // Stats tabs
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.updateStatsDisplay(tab.dataset.tab);
            });
        });

        // Autoplay and advanced controls
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

        const autoCollectBtn = document.getElementById('autoCollectBtn');
        if (autoCollectBtn) {
            this.updateAutoCollectUI();
            autoCollectBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.autoCollectEnabled = !this.autoCollectEnabled;
                this.updateAutoCollectUI();
                this.saveGameState();
            });
        }

        // Settings panel
        this.settings.attachEventListeners();

        // History panel
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.soundManager.playClick();
                this.spinHistory.toggle();
            });
        }

        // Buy Bonus feature
        this.buyBonus.attachEventListeners();

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
        const creditsEl = document.getElementById('credits');
        const betEl = document.getElementById('bet');
        const betDisplayEl = document.getElementById('betDisplay');
        const winEl = document.getElementById('win');

        if (creditsEl) creditsEl.textContent = this.credits;
        if (betEl) betEl.textContent = this.currentBet;
        if (betDisplayEl) betDisplayEl.textContent = this.currentBet;
        if (winEl) winEl.textContent = this.lastWin;
    }

    /**
     * Update auto collect toggle UI
     */
    updateAutoCollectUI() {
        const autoCollectBtn = document.getElementById('autoCollectBtn');
        if (!autoCollectBtn) return;

        if (this.autoCollectEnabled) {
            autoCollectBtn.classList.add('active');
        } else {
            autoCollectBtn.classList.remove('active');
        }

        autoCollectBtn.textContent = 'COLLECT';
    }

    changeBet(direction) {
        if (this.isSpinning) return;

        this.soundManager.playClick();

        const newIndex = Math.min(
            Math.max(this.currentBetIndex + direction, 0),
            this.betOptions.length - 1
        );

        if (newIndex === this.currentBetIndex) return;

        const proposedBet = this.betOptions[newIndex];
        const increment = proposedBet - this.currentBet;

        if (increment > 0 && increment >= this.getMaxBetIncrement()) {
            this.showMessage('BET INCREASE LIMITED TO 10% OF BALANCE');
            return;
        }

        this.currentBetIndex = newIndex;
        this.currentBet = proposedBet;
        this.updateDisplay();
    }

    setMaxBet() {
        if (this.isSpinning) return;

        this.soundManager.playClick();

        const maxIncrement = this.getMaxBetIncrement();
        const targetIndex = this.findHighestBetWithinIncrement(maxIncrement);

        if (targetIndex === this.currentBetIndex) {
            this.showMessage('BET INCREASE LIMITED TO 10% OF BALANCE');
            return;
        }

        this.currentBetIndex = targetIndex;
        this.currentBet = this.betOptions[this.currentBetIndex];
        this.updateDisplay();
    }

    getMaxBetIncrement() {
        return this.credits * GAME_CONFIG.maxBetIncrementPercent;
    }

    findHighestBetWithinIncrement(maxIncrement) {
        for (let i = this.betOptions.length - 1; i > this.currentBetIndex; i--) {
            if (this.betOptions[i] - this.currentBet < maxIncrement) {
                return i;
            }
        }
        return this.currentBetIndex;
    }

    /**
     * Validate if a spin can be initiated
     * @returns {boolean} True if spin can proceed, false otherwise
     */
    canSpin() {
        if (this.isSpinning) return false;
        if (this.bonusGame.isActive()) return false;

        const isFreeSpin = this.freeSpins.isActive();
        if (!isFreeSpin && this.credits < this.currentBet) {
            this.showMessage('INSUFFICIENT CREDITS');
            return false;
        }

        return true;
    }

    /**
     * Initialize spin state and deduct bet
     * @param {boolean} isFreeSpin - Whether this is a free spin (no bet deduction)
     */
    initializeSpin(isFreeSpin) {
        this.isSpinning = true;

        // Play spin sound
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

        // Award spin XP
        this.levelSystem.awardXP('spin');
        this.dailyChallenges.updateChallengeProgress('play_spins', 1);

        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = true;

        this.clearWinningSymbols();
        this.hidePaylines();

        // Reset anticipation state
        this.winAnticipation.reset();
    }

    /**
     * Pre-generate reel positions and check for anticipation
     * @returns {Object} Object containing reel positions, predetermined symbols, and anticipation data
     * @returns {number[]} return.reelPositions - Random positions for each reel
     * @returns {string[][]} return.predeterminedSymbols - Predetermined symbols for each reel
     * @returns {boolean} return.shouldTriggerAnticipation - Whether to trigger anticipation effects
     * @returns {Object|null} return.anticipationConfig - Configuration for anticipation effects
     * @returns {number} return.anticipationTriggerReel - Reel index where anticipation triggers
     */
    prepareReelResults() {
        // Pre-generate all reel positions for anticipation peeking
        const reelPositions = [];
        for (let i = 0; i < this.reelCount; i++) {
            reelPositions.push(RNG.getRandomPosition(this.symbolsPerReel));
        }

        // Calculate predetermined symbols for anticipation system to analyze
        const predeterminedSymbols = reelPositions.map((pos, reelIndex) => {
            return RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], pos, this.rowCount);
        });

        // Pre-check if we should trigger anticipation effects (before spinning any reels)
        let shouldTriggerAnticipation = false;
        let anticipationConfig = null;
        let anticipationTriggerReel = -1;

        // Quick check: will anticipation trigger on any reel?
        for (let reelIndex = 2; reelIndex < this.reelCount - 1 && !shouldTriggerAnticipation; reelIndex++) {
            const stoppedReelsSymbols = predeterminedSymbols.slice(0, reelIndex);
            const anticipationCheck = this.winAnticipation.checkAnticipation(reelIndex, stoppedReelsSymbols, predeterminedSymbols);
            if (anticipationCheck) {
                shouldTriggerAnticipation = true;
                anticipationTriggerReel = reelIndex;
                anticipationConfig = anticipationCheck;
                break;
            }
        }

        return {
            reelPositions,
            predeterminedSymbols,
            shouldTriggerAnticipation,
            anticipationConfig,
            anticipationTriggerReel
        };
    }

    /**
     * Spin reels with optional anticipation effects
     * @param {Object} reelData - Data from prepareReelResults()
     * @param {number[]} reelData.reelPositions - Predetermined positions for each reel
     * @param {boolean} reelData.shouldTriggerAnticipation - Whether to apply anticipation effects
     * @param {Object} reelData.anticipationConfig - Anticipation configuration data
     * @param {number} reelData.anticipationTriggerReel - Reel where anticipation triggers
     * @returns {Promise<void>}
     */
    async executeReelSpin(reelData) {
        const {
            reelPositions,
            shouldTriggerAnticipation,
            anticipationConfig,
            anticipationTriggerReel
        } = reelData;

        if (shouldTriggerAnticipation) {
            // Sequential spinning with anticipation effects
            for (let i = 0; i < this.reelCount; i++) {
                let duration = this.turboMode.getReelSpinTime(i);

                // Apply anticipation effects at the predetermined reel
                if (i === anticipationTriggerReel) {
                    const extraDelay = this.winAnticipation.getDramaticDelay(anticipationConfig.intensity);
                    duration += extraDelay;

                    this.winAnticipation.applyAnticipationEffects(anticipationConfig, anticipationConfig.intensity);

                    // Add visual glow to remaining reels
                    for (let j = i; j < this.reelCount; j++) {
                        const reel = document.getElementById(`reel-${j}`);
                        if (reel) reel.classList.add('dramatic-slow');
                    }
                }

                await this.spinReel(i, duration, reelPositions[i]);

                // Remove dramatic-slow class after reel stops
                const reel = document.getElementById(`reel-${i}`);
                if (reel) reel.classList.remove('dramatic-slow');
            }
        } else {
            // Fast parallel spinning (no anticipation)
            const spinPromises = [];
            for (let i = 0; i < this.reelCount; i++) {
                const duration = this.turboMode.getReelSpinTime(i);
                spinPromises.push(this.spinReel(i, duration, reelPositions[i]));
            }
            await Promise.all(spinPromises);
        }
    }

    /**
     * Process wins and apply effects
     * @param {Object} winInfo - Win information from PaylineEvaluator
     * @param {number} winInfo.totalWin - Total win amount
     * @param {Set} winInfo.winningPositions - Set of winning symbol positions
     * @param {number[]} winInfo.winningLines - Array of winning payline indices
     * @param {boolean} winInfo.hasScatterWin - Whether scatter symbols won
     * @param {number} winInfo.scatterCount - Number of scatter symbols
     * @param {boolean} isFreeSpin - Whether this is a free spin
     * @returns {Promise<number>} Total win amount including cascades
     */
    async processWins(winInfo, isFreeSpin) {
        let totalWin = 0;

        if (winInfo.totalWin > 0) {
            // Apply free spins multiplier if active
            if (isFreeSpin) {
                winInfo.totalWin = this.freeSpins.applyMultiplier(winInfo.totalWin);
                this.freeSpins.addWin(winInfo.totalWin);
            }

            totalWin = winInfo.totalWin;

            this.highlightWinningSymbols(winInfo.winningPositions);
            this.showWinningPaylines(winInfo.winningLines);

            // Play win sound and visual effects
            const winMultiplier = winInfo.totalWin / this.currentBet;
            this.soundManager.playWin(winMultiplier);
            this.visualEffects.showWinCelebration(winInfo.totalWin, winMultiplier);

            // Screen shake for mega wins
            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
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

                // Track scatter hits
                this.statistics.recordFeatureTrigger('scatter', { count: winInfo.scatterCount });
                this.dailyChallenges.updateChallengeProgress('hit_scatters', winInfo.scatterCount);
                this.levelSystem.awardXP('scatter');

                // Scatter sound and effects
                this.soundManager.playScatter();
            }

            // Pass win amount for counter animation
            await this.showMessage(message, winInfo.totalWin);

            // Check for cascading wins (if enabled)
            if (this.cascade.enabled) {
                const cascadeWins = await this.cascade.executeCascade(winInfo.winningPositions);
                if (cascadeWins > 0) {
                    totalWin += cascadeWins;
                    this.stats.cascadeWins++;
                }
            }
        }

        return totalWin;
    }

    /**
     * Update credits and statistics after win
     * @param {number} totalWin - Total win amount to add to credits
     */
    updateCreditsAndStats(totalWin) {
        if (totalWin > 0) {
            this.credits += totalWin;
            this.lastWin = totalWin;
            this.stats.totalWon += totalWin;

            if (totalWin > this.stats.biggestWin) {
                this.stats.biggestWin = totalWin;
            }

            // Award win XP and track stats
            this.levelSystem.awardXP('win', totalWin);
            this.statistics.recordSpin(this.currentBet, totalWin, true);
            this.dailyChallenges.updateChallengeProgress('win_amount', totalWin);

            // Check for big win
            const winMultiplier = totalWin / this.currentBet;
            if (winMultiplier >= GAME_CONFIG.winThresholds.mega) {
                this.levelSystem.awardXP('bigWin');
            }

            // Update daily challenges
            this.dailyChallenges.updateChallengeProgress('big_win', winMultiplier >= GAME_CONFIG.winThresholds.big ? 1 : 0);

            this.updateDisplay();
        } else {
            // Track loss
            this.statistics.recordSpin(this.currentBet, 0, false);
        }
    }

    /**
     * Handle feature triggers (free spins, bonus)
     * @param {Object} winInfo - Win information with scatter data
     * @param {Object} bonusInfo - Bonus trigger information
     * @param {boolean} bonusInfo.triggered - Whether bonus was triggered
     * @param {Array} bonusInfo.bonusLines - Array of bonus line data
     * @param {boolean} isFreeSpin - Whether this is a free spin
     * @returns {Promise<void>}
     */
    async handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin) {
        // Check for Free Spins trigger
        if (winInfo.hasScatterWin && this.freeSpins.shouldTrigger(winInfo.scatterCount)) {
            if (isFreeSpin) {
                // Re-trigger during free spins
                await this.freeSpins.retrigger(winInfo.scatterCount);
            } else {
                // Initial trigger
                this.stats.freeSpinsTriggers++;

                // Track free spins trigger
                this.statistics.recordFeatureTrigger('freeSpins');
                this.levelSystem.awardXP('freeSpins');
                this.dailyChallenges.updateChallengeProgress('trigger_freespins', 1);

                // Free spins trigger sound
                this.soundManager.playFreeSpinsTrigger();

                await this.freeSpins.trigger(winInfo.scatterCount);

                // Execute free spins
                await this.executeFreeSpins();
            }
        }

        // Check for Bonus trigger
        if (bonusInfo.triggered && !isFreeSpin) {
            this.stats.bonusHits++;

            // Track bonus trigger
            this.statistics.recordFeatureTrigger('bonus');
            this.levelSystem.awardXP('bonus');
            this.dailyChallenges.updateChallengeProgress('trigger_bonus', 1);

            // Bonus trigger sound
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
    }

    /**
     * Finalize spin and cleanup
     * @param {number} totalWin - Total win amount from this spin
     * @param {Object} winInfo - Win information
     * @param {Object} bonusInfo - Bonus trigger information
     * @param {boolean} isFreeSpin - Whether this was a free spin
     * @returns {Promise<void>}
     */
    async finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin) {
        // Handle free spins countdown
        if (isFreeSpin) {
            const hasMoreSpins = await this.freeSpins.executeSpin();
            if (!hasMoreSpins) {
                await this.freeSpins.end();
            }
        }

        // Check achievements
        this.achievements.checkAchievements(
            this.statistics.allTime,
            this.lastWin,
            this.currentBet,
            this.credits
        );

        // Offer gamble on regular wins (not during free spins/bonus)
        if (
            totalWin > 0 &&
            !isFreeSpin &&
            !bonusInfo.triggered &&
            this.gamble.canGamble(totalWin) &&
            !this.autoCollectEnabled
        ) {
            // Deduct the win temporarily
            this.credits -= totalWin;
            this.updateDisplay();

            // Offer gamble
            const gambleResult = await this.offerGamble(totalWin);

            // Add gamble result back
            this.credits += gambleResult;
            totalWin = gambleResult;
            this.lastWin = gambleResult;
            this.updateDisplay();

            // Track gamble in statistics if they won more
            if (gambleResult > 0) {
                this.statistics.recordSpin(this.currentBet, gambleResult, true);
            }
        }

        // Record spin in history
        const features = [];
        if (this.freeSpins.isActive()) features.push('freeSpins');
        if (winInfo.hasScatterWin) features.push('scatter');
        if (bonusInfo.triggered) features.push('bonus');
        if (this.cascade.enabled && totalWin > winInfo.totalWin) features.push('cascade');

        this.spinHistory.recordSpin(this.currentBet, totalWin, features);

        // Save game state after each spin
        this.saveGameState();

        this.isSpinning = false;
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = false;

        if (this.credits === 0 && !isFreeSpin) {
            await this.showMessage('GAME OVER\nResetting to 1000 credits');
            this.credits = GAME_CONFIG.initialCredits;
            this.updateDisplay();
            this.saveGameState();
        }
    }

    /**
     * Main spin method - orchestrates the entire spin process
     */
    async spin() {
        if (!this.canSpin()) return;

        const isFreeSpin = this.freeSpins.isActive();

        this.initializeSpin(isFreeSpin);

        const reelData = this.prepareReelResults();
        await this.executeReelSpin(reelData);

        const result = this.getReelResult();
        let winInfo = PaylineEvaluator.evaluateWins(result, this.currentBet);
        const bonusInfo = PaylineEvaluator.checkBonusTrigger(result);

        let totalWin = await this.processWins(winInfo, isFreeSpin);

        this.updateCreditsAndStats(totalWin);

        await this.handleFeatureTriggers(winInfo, bonusInfo, isFreeSpin);

        await this.finalizeSpin(totalWin, winInfo, bonusInfo, isFreeSpin);
    }

    /**
     * Execute all free spins
     */
    async executeFreeSpins() {
        // Disable manual spinning during free spins
        const spinBtn = document.getElementById('spinBtn');
        const originalText = spinBtn ? spinBtn.textContent : '';

        while (this.freeSpins.isActive() && this.freeSpins.remainingSpins > 0) {
            // Update button text to show auto-spinning
            if (spinBtn) {
                spinBtn.textContent = 'AUTO SPIN';
                spinBtn.disabled = true;
            }

            await this.spin();

            // Short delay between free spins for visibility
            await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.animations.freeSpinDelay));
        }

        // Restore button state
        if (spinBtn) {
            spinBtn.textContent = originalText;
            spinBtn.disabled = false;
        }
    }

    /**
     * Phase 5: Offer gamble feature after win
     */
    async offerGamble(winAmount) {
        return new Promise(async (resolve) => {
            if (this.autoCollectEnabled) {
                this.soundManager.playClick();
                resolve(winAmount);
                return;
            }

            const overlay = document.getElementById('featureOverlay');
            if (!overlay) {
                resolve(winAmount);
                return;
            }

            let autoCollectTimer = null;

            overlay.innerHTML = `
                <div class="gamble-container">
                    <h2 class="gamble-title">🎴 DOUBLE UP</h2>

                    <div class="gamble-current-win">
                        <div class="gamble-label">You Won:</div>
                        <div class="gamble-amount">${winAmount}</div>
                    </div>

                    <div class="gamble-message">
                        Try to double your win?<br>
                        Guess the card color!
                    </div>

                    <div class="gamble-timer">Auto-collect in: <span class="timer-value" id="gambleOfferTimer">5</span>s</div>

                    <div class="gamble-buttons">
                        <button class="btn btn-small" id="gambleAccept">
                            🎲 DOUBLE UP
                        </button>
                        <button class="btn btn-small" id="gambleDecline">
                            💰 COLLECT
                        </button>
                    </div>
                </div>
            `;

            overlay.classList.add('show');

            const clearAutoCollect = () => {
                if (autoCollectTimer) {
                    this.timerManager.clearInterval(autoCollectTimer);
                    autoCollectTimer = null;
                }
                this.cleanupTimers('gamble-offer');
            };

            // Start auto-collect countdown
            const timerDisplay = document.getElementById('gambleOfferTimer');
            let timeLeft = GAME_CONFIG.gamble.offerTimeout;
            autoCollectTimer = this.timerManager.setInterval(() => {
                timeLeft -= 1;
                if (timerDisplay) {
                    timerDisplay.textContent = timeLeft;
                }

                if (timeLeft <= 0) {
                    clearAutoCollect();
                    overlay.classList.remove('show');
                    this.soundManager.playClick();
                    resolve(winAmount);
                }
            }, 1000, 'gamble-offer');

            document.getElementById('gambleAccept').addEventListener('click', async () => {
                clearAutoCollect();
                overlay.classList.remove('show');
                // start() now returns a promise that resolves with the final win amount
                const finalAmount = await this.gamble.start(winAmount);
                resolve(finalAmount);
            });

            document.getElementById('gambleDecline').addEventListener('click', () => {
                clearAutoCollect();
                overlay.classList.remove('show');
                this.soundManager.playClick();
                resolve(winAmount);
            });
        });
    }

    /**
     * Evaluate wins without displaying (used by cascade feature)
     * @param {Array<Array<string>>} result - 2D array of reel symbols
     * @returns {Promise<Object>} Win information from PaylineEvaluator
     */
    async evaluateWinsWithoutDisplay(result) {
        return PaylineEvaluator.evaluateWins(result, this.currentBet);
    }

    /**
     * Spin a single reel with CSS animation
     * OPTIMIZED: Uses CSS animations instead of DOM manipulation every 100ms
     * Much more performant - GPU accelerated, no layout thrashing
     *
     * @param {number} reelIndex - Index of the reel to spin (0-4)
     * @param {number} duration - How long the reel should spin in milliseconds
     * @param {number|null} predeterminedPosition - Final position (null = random)
     * @returns {Promise<void>} Resolves when reel stops spinning
     */
    spinReel(reelIndex, duration, predeterminedPosition = null) {
        return new Promise((resolve) => {
            const reel = document.getElementById(`reel-${reelIndex}`);
            if (!reel) {
                console.error(`Reel not found: reel-${reelIndex}`);
                resolve();
                return;
            }

            const container = reel.querySelector('.symbol-container');
            if (!container) {
                console.error(`Symbol container not found in reel-${reelIndex}`);
                resolve();
                return;
            }

            const symbols = Array.from(container.querySelectorAll('.symbol'));
            if (symbols.length === 0) {
                console.error(`No symbols found in reel-${reelIndex}`);
                resolve();
                return;
            }

            // Start CSS spinning animation
            reel.classList.add('spinning');

            // Populate with random symbols for initial spin effect
            const randomPosition = RNG.getRandomPosition(this.symbolsPerReel);
            const randomSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], randomPosition, this.rowCount);
            symbols.forEach((symbol, index) => {
                symbol.textContent = randomSymbols[index];
            });

            // Wait for spin duration, then stop
            this.timerManager.setTimeout(() => {
                // Remove spinning, add stopping class for deceleration effect
                reel.classList.remove('spinning');
                reel.classList.add('stopping');

                // Set final position
                const finalPosition = predeterminedPosition !== null ? predeterminedPosition : RNG.getRandomPosition(this.symbolsPerReel);
                this.reelPositions[reelIndex] = finalPosition;
                const finalSymbols = RNG.getSymbolsAtPosition(this.reelStrips[reelIndex], finalPosition, this.rowCount);

                // Update to final symbols
                for (let i = 0; i < this.rowCount; i++) {
                    symbols[i].textContent = finalSymbols[i];

                    // Add bounce animation and special classes
                    symbols[i].classList.add('landed');
                    this.timerManager.setTimeout(() => symbols[i].classList.remove('landed'), GAME_CONFIG.animations.symbolLanded, 'reels');

                    // Add special classes for premium symbols
                    this.applySymbolClasses(symbols[i], finalSymbols[i]);
                }

                // Play reel stop sound
                this.soundManager.playReelStop();

                // Remove stopping class after animation completes
                this.timerManager.setTimeout(() => {
                    reel.classList.remove('stopping');
                    resolve();
                }, 300, 'reels'); // Match CSS stopping animation duration
            }, duration, 'reels');
        });
    }

    /**
     * Get current symbols visible on all reels
     * @returns {Array<Array<string>>} 2D array of symbols [reel][row]
     */
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

    /**
     * Highlight symbols that are part of winning combinations
     * @param {Set<string>} winningPositions - Set of position strings (e.g., "0-1", "2-3")
     */
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

    /**
     * Phase 5: Apply special CSS classes to symbols based on their type
     */
    applySymbolClasses(symbolElement, symbolText) {
        // Remove existing special classes
        symbolElement.classList.remove('premium', 'scatter');

        // Premium symbols (high-value symbols)
        const premiumSymbols = ['👑', '💎', '🌰', '🥜'];
        if (premiumSymbols.includes(symbolText)) {
            symbolElement.classList.add('premium');
        }

        // Scatter symbol
        if (symbolText === '⭐') {
            symbolElement.classList.add('scatter');
        }
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

            // Prevent overlapping counter intervals from previous messages
            if (this.winCounterInterval) {
                this.cleanupTimers('win-counter');
            }

            // Win counter animation
            if (winAmount > 0) {
                this.animateWinCounter(overlay, winAmount, message);
            } else {
                overlay.textContent = message;
            }

            overlay.classList.add('show');

            // Use turbo mode timing for messages
            const duration = this.turboMode.getMessageDelay();

            this.timerManager.setTimeout(() => {
                overlay.classList.remove('show');
                resolve();
            }, duration, 'win-overlay');
        });
    }

    /**
     * Phase 5: Animate win counter from 0 to final amount
     */
    animateWinCounter(overlay, finalAmount, baseMessage) {
        const duration = this.turboMode.isActive ? GAME_CONFIG.animations.winCounterFast : GAME_CONFIG.animations.winCounterNormal;
        const steps = this.turboMode.isActive ? GAME_CONFIG.animations.winCounterStepsFast : GAME_CONFIG.animations.winCounterStepsNormal;
        const stepDuration = duration / steps;
        const increment = finalAmount / steps;

        let currentAmount = 0;
        let step = 0;

        this.winCounterInterval = this.timerManager.setInterval(() => {
            step++;
            currentAmount = Math.min(Math.floor(increment * step), finalAmount);

            // Build message with current count
            let message = baseMessage.replace(/WIN: \d+/, `WIN: ${currentAmount}`);
            overlay.textContent = message;

            // Play tick sound every few steps
            if (step % GAME_CONFIG.soundTickFrequency === 0 && this.soundManager.effectsEnabled) {
                this.soundManager.playTone(
                    GAME_CONFIG.soundTickBaseFrequency + (step * GAME_CONFIG.soundTickFrequencyStep),
                    0.03,
                    'sine'
                );
            }

            if (currentAmount >= finalAmount) {
                this.timerManager.clearInterval(this.winCounterInterval);
                this.winCounterInterval = null;
                overlay.textContent = baseMessage; // Final message
            }
        }, stepDuration, 'win-counter');
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

        // Level up sound and visual effects
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

        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.animations.levelUpMessage));
        overlay.classList.remove('show');
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

            case 'challenges':
                html = `
                    <h3 style="color: #ffd700; margin-bottom: 20px;">📅 Daily Challenges</h3>
                    <div id="challengesListArea" style="margin-top: 30px;"></div>
                `;
                container.innerHTML = html;
                this.dailyChallenges.updateChallengesUI();
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

        this.timerManager.setTimeout(() => {
            container.classList.remove('screen-shake');
        }, GAME_CONFIG.animations.screenShake, 'visual-effects');
    }

    /**
     * Clear tracked timers either by label or entirely.
     */
    cleanupTimers(label = null) {
        if (label) {
            this.timerManager.clearByLabel(label);
        } else {
            this.timerManager.clearAll();
        }

        if (!label || label === 'win-counter') {
            this.winCounterInterval = null;
        }

        if (!label || label === 'autoplay') {
            this.autoplay.onTimersCleared();
        }

        if (!label) {
            this.autoplay.isActive = false;
            this.autoplay.updateUI();
            this.isSpinning = false;

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.disabled = false;
            }
        }
    }

    /**
     * Phase 5: Reset all game data
     */
    resetAllData() {
        // Clear localStorage
        Storage.clear();

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
        this.dailyChallenges = new DailyChallenges(this);
        this.statistics = new Statistics(this);
        this.spinHistory.clear();

        this.updateDisplay();
    }
}
