// Visual effects system for enhanced animations and particle effects

export class VisualEffects {
    constructor(slotMachine) {
        this.game = slotMachine;
        this.particlesEnabled = true;
        this.animationsEnabled = true;
        this.activeParticleEffects = 0;
        this.effectQueue = [];
        this.maxConcurrentParticleEffects = 3;
        this.effectDebounce = 100;
        this.lastParticleEffectTime = 0;
    }

    shouldAnimate() {
        return this.animationsEnabled && !document.hidden;
    }

    /**
     * Create particle effect at position
     */
    createParticles(x, y, config = {}) {
        if (!this.particlesEnabled || !this.shouldAnimate()) return;

        const {
            count = 20,
            emoji = '💰',
            spread = 100,
            duration = 1000,
            gravity = 0.5
        } = config;

        this.enqueueParticleEffect(() => {
            this.runParticleEffect(x, y, { count, emoji, spread, duration, gravity });
        }, duration);
    }

    enqueueParticleEffect(effectRunner, duration) {
        if (!this.shouldAnimate()) return;

        const now = Date.now();
        const shouldQueue =
            this.activeParticleEffects >= this.maxConcurrentParticleEffects ||
            (now - this.lastParticleEffectTime < this.effectDebounce && this.effectQueue.length > 0);

        if (shouldQueue) {
            this.effectQueue.push({ effectRunner, duration });
            return;
        }

        this.startParticleEffect(effectRunner, duration);
    }

    startParticleEffect(effectRunner, duration) {
        this.activeParticleEffects++;
        this.lastParticleEffectTime = Date.now();
        effectRunner();

        setTimeout(() => {
            this.activeParticleEffects = Math.max(0, this.activeParticleEffects - 1);
            this.processParticleQueue();
        }, duration);
    }

    processParticleQueue() {
        if (!this.shouldAnimate() || this.effectQueue.length === 0) return;

        while (this.effectQueue.length > 0 && this.activeParticleEffects < this.maxConcurrentParticleEffects) {
            const nextEffect = this.effectQueue.shift();
            if (!nextEffect) break;
            this.startParticleEffect(nextEffect.effectRunner, nextEffect.duration);
        }
    }

    runParticleEffect(x, y, config) {
        const { count, emoji, spread, duration, gravity } = config;

        const container = document.createElement('div');
        container.className = 'particle-container';
        container.style.position = 'fixed';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '10000';
        document.body.appendChild(container);

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = emoji;
            particle.style.position = 'absolute';
            particle.style.fontSize = (Math.random() * 20 + 15) + 'px';

            const angle = (Math.PI * 2 * i) / count;
            const velocity = spread * (0.5 + Math.random() * 0.5);
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 100;

            container.appendChild(particle);

            this.animateParticle(particle, vx, vy, duration, gravity);
        }

        setTimeout(() => container.remove(), duration);
    }

    /**
     * Animate a single particle
     */
    animateParticle(particle, vx, vy, duration, gravity) {
        let x = 0, y = 0;
        let currentVy = vy;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                return;
            }

            currentVy += gravity * 2;
            x += vx * 0.05;
            y += currentVy * 0.05;

            particle.style.transform = `translate(${x}px, ${y}px)`;
            particle.style.opacity = 1 - (elapsed / duration);

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Show win celebration effect
     */
    showWinCelebration(winAmount, multiplier) {
        if (!this.shouldAnimate()) return;

        const container = document.querySelector('.game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Different effects based on win size
        if (multiplier >= 100) {
            // Mega win - massive celebration
            this.createParticles(centerX, centerY, { count: 50, emoji: '💎', spread: 200, duration: 2000 });
            this.createParticles(centerX, centerY, { count: 30, emoji: '⭐', spread: 150, duration: 2000 });
            this.showScreenFlash('gold');
        } else if (multiplier >= 50) {
            // Big win
            this.createParticles(centerX, centerY, { count: 30, emoji: '💰', spread: 150, duration: 1500 });
            this.createParticles(centerX, centerY, { count: 20, emoji: '✨', spread: 120, duration: 1500 });
        } else if (multiplier >= 20) {
            // Good win
            this.createParticles(centerX, centerY, { count: 20, emoji: '💵', spread: 100, duration: 1200 });
        } else if (winAmount > 0) {
            // Small win
            this.createParticles(centerX, centerY, { count: 10, emoji: '💛', spread: 80, duration: 1000 });
        }
    }

    /**
     * Show screen flash effect
     */
    showScreenFlash(color = 'white') {
        if (!this.shouldAnimate()) return;

        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${color};
            opacity: 0.5;
            pointer-events: none;
            z-index: 9999;
            animation: flashFade 0.5s ease-out;
        `;
        document.body.appendChild(flash);

        setTimeout(() => flash.remove(), 500);
    }

    /**
     * Animate symbol bounce for wins
     */
    bounceSymbol(symbolElement) {
        if (!this.shouldAnimate()) return;

        symbolElement.style.animation = 'symbolBounce 0.5s ease-in-out';
        setTimeout(() => {
            symbolElement.style.animation = '';
        }, 500);
    }

    /**
     * Show scatter collect animation
     */
    showScatterCollect(scatterElements) {
        if (!this.shouldAnimate()) return;

        scatterElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.animation = 'scatterPulse 0.3s ease-in-out 3';
                this.createParticles(
                    element.getBoundingClientRect().left + element.offsetWidth / 2,
                    element.getBoundingClientRect().top + element.offsetHeight / 2,
                    { count: 5, emoji: '⭐', spread: 50, duration: 800 }
                );
            }, index * 100);
        });
    }

    /**
     * Show bonus symbol collect animation
     */
    showBonusCollect(bonusElements) {
        if (!this.shouldAnimate()) return;

        bonusElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.animation = 'bonusPulse 0.3s ease-in-out 3';
                this.createParticles(
                    element.getBoundingClientRect().left + element.offsetWidth / 2,
                    element.getBoundingClientRect().top + element.offsetHeight / 2,
                    { count: 5, emoji: '🎁', spread: 50, duration: 800 }
                );
            }, index * 100);
        });
    }

    /**
     * Create level up fireworks
     */
    showLevelUpEffect() {
        if (!this.shouldAnimate()) return;

        const container = document.querySelector('.game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Multiple firework bursts
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 200;
                const offsetY = (Math.random() - 0.5) * 200;
                this.createParticles(centerX + offsetX, centerY + offsetY, {
                    count: 30,
                    emoji: ['🎉', '🎊', '⭐', '✨'][i % 4],
                    spread: 120,
                    duration: 1500
                });
            }, i * 200);
        }

        this.showScreenFlash('rgba(255, 215, 0, 0.3)');
    }

    /**
     * Show achievement unlock effect
     */
    showAchievementEffect() {
        if (!this.shouldAnimate()) return;

        const notification = document.getElementById('achievementNotification');
        if (!notification) return;

        const rect = notification.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        this.createParticles(centerX, centerY, {
            count: 20,
            emoji: '🏆',
            spread: 100,
            duration: 1200
        });
    }

    /**
     * Create coin fountain effect for big wins
     */
    showCoinFountain() {
        if (!this.shouldAnimate()) return;

        const container = document.querySelector('.game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        // Create continuous coin drops
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createParticles(centerX, rect.top + 100, {
                    count: 5,
                    emoji: '🪙',
                    spread: 50,
                    duration: 1000,
                    gravity: 1
                });
            }, i * 100);
        }
    }

    /**
     * Toggle particles on/off
     */
    toggleParticles(enabled) {
        this.particlesEnabled = enabled;
    }

    /**
     * Toggle animations on/off
     */
    toggleAnimations(enabled) {
        this.animationsEnabled = enabled;
        if (!enabled) {
            this.effectQueue = [];
            this.activeParticleEffects = 0;
        }
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            particlesEnabled: this.particlesEnabled,
            animationsEnabled: this.animationsEnabled
        };
    }

    /**
     * Load saved data
     */
    init(data) {
        if (!data) return;

        this.particlesEnabled = data.particlesEnabled !== undefined ? data.particlesEnabled : true;
        this.animationsEnabled = data.animationsEnabled !== undefined ? data.animationsEnabled : true;
    }
}
