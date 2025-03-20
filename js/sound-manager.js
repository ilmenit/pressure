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
        
        // Flags to track AI activity
        this.isAISimulating = false;  // During AI minimax simulation
        this.isAIFinalMoving = false; // During AI's actual selected move execution
        
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
        
        // Track AI thinking and move execution states
        this.events.on('ai:thinking', () => {
            this.isAISimulating = true;
            this.isAIFinalMoving = false;
            console.log("[SoundManager] AI thinking started");
        });
        
        this.events.on('ai:moveSelected', () => {
            // AI has selected its move and is about to execute it
            this.isAIFinalMoving = true;
            console.log("[SoundManager] AI move selected, final move execution starting");
        });
        
        this.events.on('ai:moveExecuted', () => {
            // AI has completely finished its turn
            this.isAISimulating = false;
            this.isAIFinalMoving = false;
            console.log("[SoundManager] AI move execution complete");
        });
        
        // Define event to sound mappings for game events
        const eventSoundMap = {
            // UI interactions

			'ui:tokenSelected': (data) => {
				// If the UIManager has already validated this token, use that information
				if (data && data.isValidToken === true) {
					return 'tokenSelect';
				}
				
				// Otherwise, perform our own validation
				if (data && data.position && window.game) {
					const row = data.position.row;
					const col = data.position.col;
					const token = window.game.board.getTokenAt(row, col);
					
					if (token && 
						token.color === window.game.currentPlayer && 
						token.isActive && 
						!token.isCaptured) {
						return 'tokenSelect';
					}
				}
				return null;
			},
            
            'ui:winModalShown': data => data.winner === 'white' ? 'matchWin' : 'matchLose',
            
            // Move execution - filters to detect real vs simulation moves
            'move:executed': (data) => {
                // If this is explicitly marked as AI's actual move, play sound
                if (data && data.isActualAIMove) {
                    return data.player === 'white' ? 'player1Move' : 'player2Move';
                }
                
                // Skip if explicitly marked as simulation
                if (data && data.forAISimulation === true) {
                    return null;
                }
                
                // Skip during AI simulation unless it's the final move
                if (this.isAISimulating && !this.isAIFinalMoving) {
                    return null;
                }
                
                return data.player === 'white' ? 'player1Move' : 'player2Move';
            },
            
            // Move types
            'move:simple': (data) => {
                // If this is explicitly marked as AI's actual move, play sound
                if (data && data.isActualAIMove) {
                    return data.player === 'white' ? 'player1Move' : 'player2Move';
                }
                
                // Skip if explicitly marked as simulation
                if (data && data.forAISimulation === true) {
                    return null;
                }
                
                // Skip during AI simulation unless it's the final move
                if (this.isAISimulating && !this.isAIFinalMoving) {
                    return null;
                }
                
                return data.player === 'white' ? 'player1Move' : 'player2Move';
            },
            
            'move:push': (data) => {
                // If this is explicitly marked as AI's actual move, play sound
                if (data && data.isActualAIMove) {
                    return data.player === 'white' ? 'player1Move' : 'player2Move';
                }
                
                // Skip if explicitly marked as simulation
                if (data && data.forAISimulation === true) {
                    return null;
                }
                
                // Skip during AI simulation unless it's the final move
                if (this.isAISimulating && !this.isAIFinalMoving) {
                    return null;
                }
                
                return data.player === 'white' ? 'player1Move' : 'player2Move';
            },
            
            // Token events - capture sounds
            'token:captured': (data) => {
                // Skip if explicitly marked as simulation (but not if it's the actual AI move)
                if (data && data.forAISimulation === true && !data.isActualAIMove) {
                    return null;
                }
                
                // Skip during AI simulation unless it's the final move (but not if explicitly marked as actual AI move)
                if (this.isAISimulating && !this.isAIFinalMoving && !data?.isActualAIMove) {
                    return null;
                }
                
                // Play sound based on the color of the captured token
                if (data && data.color) {
                    console.log("[SoundManager] Token captured:", data.color);
                    // player1-capture.mp3 for white token captured
                    // player2-capture.mp3 for black token captured
                    return data.color === 'white' ? 'player1Capture' : 'player2Capture';
                }
                
                // Fallback if color data is missing
                return 'player1Capture';
            },
            
            // Also listen to the notified capture event for backward compatibility
            'token:captureNotified': (data) => {
                // Skip if explicitly marked as simulation
                if (data && data.forAISimulation === true && !data.isActualAIMove) {
                    return null;
                }
                
                // Skip during AI simulation unless it's the final move
                if (this.isAISimulating && !this.isAIFinalMoving && !data?.isActualAIMove) {
                    return null;
                }
                
                // Play sound based on the color of the captured token
                if (data && data.color) {
                    console.log("[SoundManager] Token capture notified:", data.color);
                    // player1-capture.mp3 for white token captured
                    // player2-capture.mp3 for black token captured
                    return data.color === 'white' ? 'player1Capture' : 'player2Capture';
                }
                
                // Fallback if color data is missing
                return 'player1Capture';
            },
            
            // Game state
            'game:over': data => {
                // Skip if explicitly marked as simulation
                if (data && data.forAISimulation === true) {
                    return null;
                }
                
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
                    
                    // Only play if soundName is not null
                    if (soundName) {
                        this.playSound(soundName);
                    }
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
        // Add direct click listeners to all buttons
        // This approach is more reliable than event delegation for complex apps
        const addButtonSounds = () => {
            // Find all buttons in the document
            const allButtons = document.querySelectorAll('button');
            
            allButtons.forEach(button => {
                // Skip buttons that already have sound handlers
                if (button.hasAttribute('data-sound-added')) return;
                
                // Add the sound handler
                button.addEventListener('click', (e) => {
                    // Skip sound toggle button to avoid double sounds
                    if (button.id === 'sound-toggle-btn' || button.closest('#sound-toggle')) return;
                    
                    // Determine which sound to play based on context
                    if (button.closest('#main-menu') || 
                        button.classList.contains('large-btn') ||
                        button.closest('.tournament-controls')) {
                        this.playSound('menuButtonClick');
                    } else {
                        this.playSound('buttonClick');
                    }
                }, true); // Use capture to ensure we get the event before stopPropagation
                
                // Mark the button as having a sound handler
                button.setAttribute('data-sound-added', 'true');
            });
            
            // Also add event delegation for dynamically added elements
            document.addEventListener('click', e => {
                // Handle cell clicks (but not token clicks)
                const cell = e.target.closest('.cell');
                const token = e.target.closest('.token');
                
                if (cell && !token && !cell.hasAttribute('data-sound-added')) {
                    cell.setAttribute('data-sound-added', 'true');
                    this.playSound('buttonClick');
                }
                
                // Handle ladder opponent clicks in tournament mode
                const ladderOpponent = e.target.closest('.ladder-opponent');
                if (ladderOpponent && !ladderOpponent.hasAttribute('data-sound-added')) {
                    ladderOpponent.setAttribute('data-sound-added', 'true');
                    this.playSound('menuButtonClick');
                }
            });
        };
        
        // Add sounds immediately
        addButtonSounds();
        
        // Also periodically check for new buttons
        setInterval(addButtonSounds, 1000);
        
        // Check after DOM changes
        const observer = new MutationObserver(() => {
            addButtonSounds();
        });
        
        // Start observing
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
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