/**
 * Sound Manager for the game
 * Implements the Observer pattern to respond to game events with sounds
 */
class SoundManager {
    constructor(events) {
        this.events = events || window.gameEvents;
        this.sounds = {};
        this.loadedSounds = 0;
        this.totalSounds = 0;
        this.isSoundEnabled = true;
        this.isMuted = false;
        this.isReady = false;
        
        // Load sound preferences first
        this.loadSoundPreferences();
        
        // Initialize and load sounds
        this.initSounds();
        
        // Set up event listeners after a short delay to ensure game is initialized
        setTimeout(() => this.setupEventListeners(), 100);
    }
    
    /**
     * Initialize sound objects with error handling
     */
    initSounds() {
        const soundFiles = {
            // Menu and UI sounds
            buttonClick: 'assets/sounds/button-click.mp3',
            menuButtonClick: 'assets/sounds/menu-button-click.mp3',
            
            // Game sounds
            tokenSelect: 'assets/sounds/token-select.mp3',
            player1Move: 'assets/sounds/player1-move.mp3',
            player2Move: 'assets/sounds/player2-move.mp3',
            player1Capture: 'assets/sounds/player1-capture.mp3',
            player2Capture: 'assets/sounds/player2-capture.mp3',
            
            // Result sounds
            matchWin: 'assets/sounds/match_win.mp3',
            matchLose: 'assets/sounds/match-lose.mp3',
            winTournament: 'assets/sounds/win-tournament.mp3'
        };
        
        this.totalSounds = Object.keys(soundFiles).length;
        
        // Create and load all sound objects
        Object.entries(soundFiles).forEach(([name, path]) => {
            try {
                const audio = new Audio();
                
                // Add event listeners for loading and errors
                audio.addEventListener('canplaythrough', () => {
                    this.loadedSounds++;
                    if (this.events && this.loadedSounds === this.totalSounds) {
                        this.isReady = true;
                        this.events.emit('sound:allLoaded', {
                            soundCount: this.totalSounds
                        });
                    }
                }, { once: true });
                
                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load sound ${name} from ${path}:`, e);
                });
                
                // Set source and load
                audio.src = path;
                audio.volume = 0.5;
                audio.load();
                
                this.sounds[name] = audio;
            } catch (e) {
                console.error(`Failed to create audio object for ${name}:`, e);
            }
        });
    }
    
    /**
     * Set up event listeners for game events
     */
    setupEventListeners() {
        if (!this.events) return;
        
        // Define event to sound mappings for game events
        const eventSoundMap = {
            // UI interactions
            'ui:tokenSelected': 'tokenSelect',
            'ui:winModalShown': data => data.winner === 'white' ? 'matchWin' : 'matchLose',
            
            // Move execution
            'move:executed': data => data.player === 'white' ? 'player1Move' : 'player2Move',
            'move:simple': data => data.player === 'white' ? 'player1Move' : 'player2Move',
            'move:push': data => data.player === 'white' ? 'player1Move' : 'player2Move',
            
            // Token events
            'token:captured': data => {
                const game = window.game;
                const currentPlayer = game ? game.currentPlayer : 'white';
                return currentPlayer === 'white' ? 'player1Capture' : 'player2Capture';
            },
            
            // Game state
            'game:over': data => {
                const game = window.game;
                // For tournament mode
                if (game && game.isTournamentMode) {
                    return data.winner === 'white' ? 'matchWin' : 'matchLose';
                }
                
                // For standard mode
                return data.winner === 'white' ? 'matchWin' : 'matchLose';
            },
            
            // Tournament events
            'tournament:completed': 'winTournament',
            'tournament:gameEnded': data => data.winner === 'white' ? 'matchWin' : 'matchLose',
        };
        
        // Add tutorial events if they exist
        if (typeof window.tutorialService !== 'undefined') {
            eventSoundMap['tutorial:completed'] = 'winTournament';
            eventSoundMap['tutorial:stepCompleted'] = 'tokenSelect';
        }
        
        // Register listeners based on mapping
        Object.entries(eventSoundMap).forEach(([eventName, soundNameOrFn]) => {
            this.events.on(eventName, data => {
                try {
                    const soundName = typeof soundNameOrFn === 'function' 
                        ? soundNameOrFn(data) 
                        : soundNameOrFn;
                    
                    this.playSound(soundName);
                } catch (e) {
                    console.warn(`Error playing sound for event ${eventName}:`, e);
                }
            });
        });
        
        // Add button click sounds
        this.addButtonClickSounds();
    }
    
    /**
     * Add button click sounds to various UI elements
     */
    addButtonClickSounds() {
        // Add click listeners to buttons, with debounce to prevent multiple sounds
        let lastClickTime = 0;
        
        document.addEventListener('click', e => {
            // Debounce clicks to prevent double sounds
            const now = Date.now();
            if (now - lastClickTime < 50) return;
            lastClickTime = now;
            
            // Find the clicked button or clickable element
            const button = e.target.closest('button');
            const cell = e.target.closest('.cell');
            const ladderOpponent = e.target.closest('.ladder-opponent');
            
            // Skip sound toggle button to avoid double sounds
            if (button && (button.id === 'sound-toggle-btn' || button.closest('#sound-toggle'))) return;
            
            // Play appropriate sound based on context
            if (button) {
                if (button.closest('#main-menu') || 
                    button.classList.contains('large-btn')) {
                    this.playSound('menuButtonClick');
                } else {
                    this.playSound('buttonClick');
                }
            } else if (cell && !cell.querySelector('.token:hover') && !e.target.closest('.token')) {
                // For cell clicks (but not token clicks)
                this.playSound('buttonClick');
            } else if (ladderOpponent) {
                this.playSound('menuButtonClick');
            }
        });
    }
    
    /**
     * Play a sound if sound is enabled
     * @param {string} soundName - Name of the sound to play
     */
    playSound(soundName) {
        if (!this.isSoundEnabled || this.isMuted || !this.isReady) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            try {
                // Try to use the original sound object (more efficient)
                if (sound.paused || sound.ended) {
                    sound.currentTime = 0;
                    const playPromise = sound.play();
                    
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            console.warn(`Failed to play sound ${soundName} (original):`, e);
                            this.playClonedSound(sound, soundName);
                        });
                    }
                } else {
                    // Sound is already playing, use a clone
                    this.playClonedSound(sound, soundName);
                }
            } catch (e) {
                console.warn(`Failed to play sound ${soundName}:`, e);
            }
        }
    }
    
    /**
     * Play a cloned sound for overlapping sounds
     * @param {HTMLAudioElement} sound - Original sound
     * @param {string} soundName - Sound name for debug
     */
    playClonedSound(sound, soundName) {
        try {
            const soundClone = sound.cloneNode();
            soundClone.volume = sound.volume;
            
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn(`Failed to play sound ${soundName} (clone):`, e);
                });
            }
        } catch (e) {
            console.warn(`Failed to clone sound ${soundName}:`, e);
        }
    }
    
    /**
     * Enable or disable all sounds
     * @param {boolean} enabled - Whether sound should be enabled
     */
    setSoundEnabled(enabled) {
        this.isSoundEnabled = enabled;
        
        // Save preference
        this.saveSoundPreferences();
        
        // Emit event
        if (this.events) {
            this.events.emit('sound:enabledChanged', {
                enabled: this.isSoundEnabled
            });
        }
        
        // Update UI toggle if it exists
        this.updateSoundToggleUI();
    }
    
    /**
     * Toggle sound enabled state
     * @returns {boolean} - New sound enabled state
     */
    toggleSound() {
        this.setSoundEnabled(!this.isSoundEnabled);
        return this.isSoundEnabled;
    }
    
    /**
     * Mute or unmute all sounds (temporary)
     * @param {boolean} muted - Whether sound should be muted
     */
    setMuted(muted) {
        this.isMuted = muted;
        
        // Emit event
        if (this.events) {
            this.events.emit('sound:mutedChanged', {
                muted: this.isMuted
            });
        }
    }
    
    /**
     * Toggle mute state
     * @returns {boolean} - New muted state
     */
    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }
    
    /**
     * Set volume for all sounds
     * @param {number} volume - Volume level (0 to 1)
     */
    setVolume(volume) {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.min(Math.max(volume, 0), 1);
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = clampedVolume;
        });
        
        // Emit event
        if (this.events) {
            this.events.emit('sound:volumeChanged', {
                volume: clampedVolume
            });
        }
    }
    
    /**
     * Save sound preferences to localStorage
     */
    saveSoundPreferences() {
        try {
            localStorage.setItem('pressure_sound_enabled', this.isSoundEnabled.toString());
        } catch (e) {
            console.warn('Failed to save sound preferences:', e);
        }
    }
    
    /**
     * Load sound preferences from localStorage
     */
    loadSoundPreferences() {
        try {
            const soundEnabled = localStorage.getItem('pressure_sound_enabled');
            if (soundEnabled !== null) {
                this.isSoundEnabled = soundEnabled === 'true';
            }
        } catch (e) {
            console.warn('Failed to load sound preferences:', e);
        }
    }
    
    /**
     * Update the sound toggle UI elements
     */
    updateSoundToggleUI() {
        // Update floating sound toggle
        const soundOn = document.getElementById('sound-on');
        const soundOff = document.getElementById('sound-off');
        
        if (soundOn && soundOff) {
            soundOn.style.display = this.isSoundEnabled ? 'inline' : 'none';
            soundOff.style.display = this.isSoundEnabled ? 'none' : 'inline';
        }
        
        // Update settings toggle button
        const soundToggleBtn = document.getElementById('sound-toggle-btn');
        if (soundToggleBtn) {
            soundToggleBtn.textContent = `Sound: ${this.isSoundEnabled ? 'ON' : 'OFF'}`;
        }
    }
    
    /**
     * Add floating sound toggle to the UI
     */
    addSoundToggleToUI() {
        // Don't add if it already exists
        if (document.getElementById('sound-toggle')) return;
        
        // Create sound toggle button
        const soundToggle = document.createElement('div');
        soundToggle.id = 'sound-toggle';
        soundToggle.className = 'sound-toggle';
        soundToggle.innerHTML = `
            <span id="sound-on" ${!this.isSoundEnabled ? 'style="display:none"' : ''}>🔊</span>
            <span id="sound-off" ${this.isSoundEnabled ? 'style="display:none"' : ''}>🔇</span>
        `;
        
        // Add click event listener
        soundToggle.addEventListener('click', () => {
            const isEnabled = this.toggleSound();
            
            // Play sound when enabling
            if (isEnabled) {
                this.playSound('buttonClick');
            }
        });
        
        // Add to document
        document.body.appendChild(soundToggle);
    }
}

// Create sound manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for event system to be available
    const initSoundManager = () => {
        if (window.gameEvents) {
            window.soundManager = new SoundManager(window.gameEvents);
            
            // Add sound toggle to UI after a short delay to ensure DOM is fully ready
            setTimeout(() => {
                if (window.soundManager) {
                    window.soundManager.addSoundToggleToUI();
                }
            }, 500);
        } else {
            // Retry after a short delay
            setTimeout(initSoundManager, 100);
        }
    };
    
    initSoundManager();
});
