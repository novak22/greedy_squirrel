// Settings panel for user preferences

export class Settings {
    constructor({
        soundManager,
        visualEffects,
        autoplay,
        saveGameState,
        resetAllData,
        eventBus
    } = {}) {
        this.soundManager = soundManager;
        this.visualEffects = visualEffects;
        this.autoplay = autoplay;
        this.eventBus = eventBus;

        this.saveGameState =
            saveGameState || (() => this.eventBus?.emit('game:save'));
        this.resetAllData = resetAllData || (() => this.eventBus?.emit('game:reset'));
    }

    /**
     * Show settings modal
     */
    show() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        this.updateSettingsDisplay();
        modal.classList.add('active');
    }

    /**
     * Hide settings modal
     */
    hide() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        modal.classList.remove('active');
    }

    /**
     * Toggle settings modal
     */
    toggle() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        if (modal.classList.contains('active')) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Update settings display with current values
     */
    updateSettingsDisplay() {
        // Audio settings
        this.updateToggle('soundEnabled', this.soundManager?.enabled);
        this.updateToggle('musicEnabled', this.soundManager?.musicEnabled);
        this.updateToggle('effectsEnabled', this.soundManager?.effectsEnabled);
        this.updateSlider('volumeSlider', this.soundManager?.volume ?? 0);

        // Visual settings
        this.updateToggle('particlesEnabled', this.visualEffects?.particlesEnabled);
        this.updateToggle('animationsEnabled', this.visualEffects?.animationsEnabled);

        // Autoplay settings
        this.updateInput('autoplaySpins', this.autoplay?.settings?.spins);
        this.updateToggle('stopOnWin', this.autoplay?.settings?.stopOnWin);
        this.updateToggle('stopOnBigWin', this.autoplay?.settings?.stopOnBigWin);
        this.updateInput('bigWinMultiplier', this.autoplay?.settings?.bigWinMultiplier);
        this.updateToggle('stopOnFeature', this.autoplay?.settings?.stopOnFeature);
        this.updateToggle('stopOnBalance', this.autoplay?.settings?.stopOnBalance);
        this.updateInput('balanceIncrease', this.autoplay?.settings?.balanceIncrease);
        this.updateToggle('stopOnBalanceLow', this.autoplay?.settings?.stopOnBalanceLow);
        this.updateInput('balanceLowLimit', this.autoplay?.settings?.balanceLowLimit);
    }

    /**
     * Update toggle switch
     */
    updateToggle(id, value) {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.checked = value;
        }
    }

    /**
     * Update slider
     */
    updateSlider(id, value) {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = value;
        }

        const display = document.getElementById(id + 'Value');
        if (display) {
            display.textContent = Math.round(value * 100) + '%';
        }
    }

    /**
     * Update input field
     */
    updateInput(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
        }
    }

    /**
     * Attach event listeners for settings controls
     */
    attachEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.toggle());
        }

        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.hide());
        }

        // Audio settings
        this.attachToggleListener('soundEnabled', (value) => {
            this.soundManager?.toggleSound(value);
            if (value) this.soundManager?.playClick();
        });

        this.attachToggleListener('musicEnabled', (value) => {
            this.soundManager?.toggleMusic(value);
        });

        this.attachToggleListener('effectsEnabled', (value) => {
            this.soundManager?.toggleEffects(value);
            if (value) this.soundManager?.playClick();
        });

        this.attachSliderListener('volumeSlider', (value) => {
            this.soundManager?.setVolume(value);
            this.updateSlider('volumeSlider', value);
        });

        // Visual settings
        this.attachToggleListener('particlesEnabled', (value) => {
            this.visualEffects?.toggleParticles(value);
        });

        this.attachToggleListener('animationsEnabled', (value) => {
            this.visualEffects?.toggleAnimations(value);
        });

        // Autoplay settings
        this.attachInputListener('autoplaySpins', (value) => {
            const spins = parseInt(value) || 10;
            this.autoplay?.updateSettings({ spins: Math.max(1, Math.min(1000, spins)) });
        });

        this.attachToggleListener('stopOnWin', (value) => {
            this.autoplay?.updateSettings({ stopOnWin: value });
        });

        this.attachToggleListener('stopOnBigWin', (value) => {
            this.autoplay?.updateSettings({ stopOnBigWin: value });
        });

        this.attachInputListener('bigWinMultiplier', (value) => {
            const multiplier = parseInt(value) || 50;
            this.autoplay?.updateSettings({ bigWinMultiplier: Math.max(1, multiplier) });
        });

        this.attachToggleListener('stopOnFeature', (value) => {
            this.autoplay?.updateSettings({ stopOnFeature: value });
        });

        this.attachToggleListener('stopOnBalance', (value) => {
            this.autoplay?.updateSettings({ stopOnBalance: value });
        });

        this.attachInputListener('balanceIncrease', (value) => {
            const amount = parseInt(value) || 1000;
            this.autoplay?.updateSettings({ balanceIncrease: Math.max(1, amount) });
        });

        this.attachToggleListener('stopOnBalanceLow', (value) => {
            this.autoplay?.updateSettings({ stopOnBalanceLow: value });
        });

        this.attachInputListener('balanceLowLimit', (value) => {
            const limit = parseInt(value) || 100;
            this.autoplay?.updateSettings({ balanceLowLimit: Math.max(0, limit) });
        });

        // Phase 5: Reset data button
        const resetDataBtn = document.getElementById('resetDataBtn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => {
                this.confirmReset();
            });
        }
    }

    /**
     * Phase 5: Confirm and execute data reset
     */
    confirmReset() {
        const confirmed = confirm(
            'Are you sure you want to reset ALL game data?\n\n' +
                'This will delete:\n' +
                '• All credits and progress\n' +
                '• Levels and XP\n' +
                '• All achievements\n' +
                '• Statistics and history\n' +
                '• Daily rewards streak\n\n' +
                'This action CANNOT be undone!'
        );

        if (confirmed) {
            const doubleConfirm = confirm(
                'FINAL WARNING!\n\n' +
                    'This will permanently delete all your game data.\n\n' +
                    'Are you absolutely sure?'
            );

            if (doubleConfirm) {
                this.resetAllData?.();
                alert('All game data has been reset!');
                this.hide();
                location.reload(); // Reload page to reset everything
            }
        }
    }

    /**
     * Attach toggle listener
     */
    attachToggleListener(id, callback) {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                callback(e.target.checked);
                this.saveGameState?.();
            });
        }
    }

    /**
     * Attach slider listener
     */
    attachSliderListener(id, callback) {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', (e) => {
                callback(parseFloat(e.target.value));
                this.saveGameState?.();
            });
        }
    }

    /**
     * Attach input listener
     */
    attachInputListener(id, callback) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', (e) => {
                callback(e.target.value);
                this.saveGameState?.();
            });
        }
    }
}
