/**
 * Game entry point - initializes modes and handles switching between them
 */

// Store game instance globally for extensions to access
let game = null;
let tournamentManager = null;
let events = null;

// Flag to track if tutorial has been shown in this session
let tutorialShownThisSession = false;

/**
 * Check if the tutorial has been seen before
 * @returns {boolean} True if tutorial has been seen, false otherwise
 */
function hasTutorialBeenSeen() {
    // If tutorial was already shown in this session, don't show it again
    if (tutorialShownThisSession) {
        return true;
    }
    
    try {
        return localStorage.getItem('pressure_tutorial_seen') === 'true';
    } catch (e) {
        console.error("Error accessing localStorage:", e);
        return true; // Fallback to assuming tutorial has been seen
    }
}

/**
 * Mark the tutorial as seen
 * @param {string} reason - Why the tutorial was marked as seen
 */
function markTutorialAsSeen(reason = 'completed') {
    // Set session flag
    tutorialShownThisSession = true;
    
    try {
        localStorage.setItem('pressure_tutorial_seen', 'true');
        console.log(`Tutorial marked as seen (${reason})`);
    } catch (e) {
        console.error("Error setting tutorial seen flag:", e);
    }
}

/**
 * Directly attach skip/back button handlers to tutorial
 */
function attachTutorialButtonHandlers() {
    // Try to find the skip tutorial button and attach a handler
    setTimeout(() => {
        const skipBtn = document.getElementById('tutorial-skip-btn');
        if (skipBtn) {
            // Add our own click handler that marks tutorial as seen
            skipBtn.addEventListener('click', function() {
                console.log("Tutorial skip button clicked");
                markTutorialAsSeen('skip-button-clicked');
            });
        }
        
        // Also try to find any "back to menu" buttons that might be in the tutorial
        const backButtons = document.querySelectorAll('button:not([id])');
        backButtons.forEach(btn => {
            if (btn.textContent && 
                (btn.textContent.includes('Back to Menu') || 
                 btn.textContent.includes('Main Menu'))) {
                btn.addEventListener('click', function() {
                    console.log("Back to menu button clicked in tutorial");
                    markTutorialAsSeen('back-button-clicked');
                });
            }
        });
    }, 1000); // Give time for tutorial UI to be created
}

/**
 * Check and possibly auto-start the tutorial for first-time players
 * @returns {boolean} True if tutorial was started, false otherwise
 */
function checkAndAutoStartTutorial() {
    // Only auto-start tutorial for first-time players
    if (!hasTutorialBeenSeen()) {
        // Check if tutorial function is available
        if (typeof window.startTutorial === 'function') {
            console.log("First-time player detected. Auto-starting tutorial...");
            
            // Mark as shown this session immediately
            tutorialShownThisSession = true;
            
            // Use a small delay to ensure everything is initialized
            setTimeout(() => {
                // Start the tutorial
                window.startTutorial();
                
                // Attach direct handlers to tutorial buttons
                attachTutorialButtonHandlers();
                
                // Set up a fallback to ensure the flag is set
                setTimeout(() => {
                    // If after 30 seconds we're back at the main menu, mark tutorial as seen
                    const mainMenu = document.getElementById('main-menu');
                    if (mainMenu && !mainMenu.classList.contains('hidden')) {
                        markTutorialAsSeen('timeout-at-main-menu');
                    }
                }, 30000);
            }, 100);
            
            return true; // Tutorial started
        } else {
            console.error("Tutorial service not available");
            // Mark as seen to avoid getting stuck if tutorial is unavailable
            markTutorialAsSeen('service-unavailable');
        }
    }
    
    return false; // Tutorial not started
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // First, initialize the event system
    events = window.gameEvents || new EventSystem();
    window.gameEvents = events; // Ensure global access
    
    // Set up event listeners for tutorial events	
	events.on('tutorial:completed', () => {
		console.log("Tutorial completed event received");
		markTutorialAsSeen('completed-event');
		
		// Play tournament win sound
		if (window.soundManager) {
			window.soundManager.playSound('winTournament');
		}
	});
    
    events.on('tutorial:skipped', () => {
        console.log("Tutorial skipped event received");
        markTutorialAsSeen('skipped-event');
    });
    
    // Set up additional event to catch tutorial completion
    events.on('ui:menuOpened', () => {
        console.log("Menu opened event received");
        markTutorialAsSeen('menu-opened');
    });
    
    // Reference the existing game instance or create new one
    if (window.game) {
        game = window.game;
        game.events = events; // Ensure game uses our event system
    } else {
        // For first load, initialize as it would have done in game.js
        game = new Game();
        game.events = events; // Ensure game uses our event system
        game.initUI();
        window.game = game; // Store globally
    }
    
    // Initialize tournament manager
    tournamentManager = new TournamentManager(game);
    game.tournamentManager = tournamentManager;
    
    // Set up event listeners for main menu
    setupMainMenuListeners();
    
    // Set up event listeners for game events
    setupGameEventListeners();
    
    // Check if we should auto-start the tutorial for first-time players
    const tutorialStarted = checkAndAutoStartTutorial();
    
    // Only show main menu if tutorial didn't start
    if (!tutorialStarted) {
        showMainMenu();
    }
    
    // Set default player settings - Black player should be AI with level 1
    setDefaultPlayerSettings();
});

/**
 * Set default player settings
 */
function setDefaultPlayerSettings() {
    // Set black player to AI by default
    const blackAIBtn = document.querySelector('.player-type-btn[data-player="black"][data-type="ai"]');
    const blackAILevel1 = document.querySelector('.ai-level-btn[data-player="black"][data-level="1"]');
    
    if (blackAIBtn) {
        blackAIBtn.classList.add('active');
        document.querySelector('.player-type-btn[data-player="black"][data-type="human"]').classList.remove('active');
        
        // Show AI level selection
        const blackAILevels = document.querySelector('.black-ai-levels');
        if (blackAILevels) {
            blackAILevels.classList.remove('hidden');
        }
    }
    
    // Set black AI level to 1
    if (blackAILevel1) {
        // Clear other active levels
        document.querySelectorAll('.ai-level-btn[data-player="black"]').forEach(btn => {
            btn.classList.remove('active');
        });
        blackAILevel1.classList.add('active');
    }
}

/**
 * Set up event listeners for game-level events
 */
function setupGameEventListeners() {
    // Only setup if events system exists
    if (!events) return;
    
    // Listen for screen changes
    events.on('ui:gameStarted', () => {
        // Hide menu screens, show game screen
        hideAllScreens();
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.classList.remove('hidden');
        
        // Show resume game button for when user returns to menu
        const resumeGameBtn = document.getElementById('resume-game-btn');
        if (resumeGameBtn) resumeGameBtn.classList.remove('hidden');
    });
    
    events.on('ui:menuOpened', () => {
        showMainMenu();
    });
    
    events.on('tournament:completed', () => {
        // Update tournament complete screen with celebration effects
        const completeScreen = document.getElementById('tournament-complete-screen');
        if (completeScreen) {
            completeScreen.classList.remove('hidden');
        }
    });
}

/**
 * Setup main menu event listeners
 */
function setupMainMenuListeners() {
    // Tutorial mode button
    const tutorialModeBtn = document.getElementById('tutorial-mode-btn');
    if (tutorialModeBtn) {
        tutorialModeBtn.addEventListener('click', () => {
            // Start tutorial directly (function defined in tutorial-service.js)
            if (typeof window.startTutorial === 'function') {
                window.startTutorial();
                // Mark tutorial as shown in this session to prevent auto-restart
                tutorialShownThisSession = true;
            } else {
                console.error("Tutorial service not loaded");
                alert("Tutorial mode will be available in a future update.");
            }
        });
    }
    
    // Tournament mode button
    const tournamentModeBtn = document.getElementById('tournament-mode-btn');
    if (tournamentModeBtn) {
        tournamentModeBtn.addEventListener('click', () => {
            showTournamentScreen();
        });
    }
    
    // Standard mode button
    const standardModeBtn = document.getElementById('standard-mode-btn');
    if (standardModeBtn) {
        standardModeBtn.addEventListener('click', () => {
            showStandardSetup();
        });
    }
    
    // NEW: Read Game Rules button
    const readRulesBtn = document.getElementById('read-rules-btn');
    if (readRulesBtn) {
        readRulesBtn.addEventListener('click', () => {
            showRulesScreen();
        });
    }
    
    // Rules back button
    const rulesBackBtn = document.getElementById('rules-back-btn');
    if (rulesBackBtn) {
        rulesBackBtn.addEventListener('click', () => {
            showMainMenu();
        });
    }
    
    // Tournament settings button
    const tournamentSettingsBtn = document.getElementById('tournament-settings-btn');
    if (tournamentSettingsBtn) {
        tournamentSettingsBtn.addEventListener('click', () => {
            showTournamentSettings();
        });
    }

    // Standard mode setup controls
    const standardStartBtn = document.getElementById('standard-start-game-btn');
    if (standardStartBtn) {
        standardStartBtn.addEventListener('click', () => {
            startStandardGame();
        });
    }
    
    const standardBackBtn = document.getElementById('standard-back-btn');
    if (standardBackBtn) {
        standardBackBtn.addEventListener('click', () => {
            showMainMenu();
        });
    }
    
    // Menu button in game controls
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        // Update button text to "Exit Match"
        menuBtn.textContent = "Exit Match";
        
        // Replace with new handler
        menuBtn.onclick = function() {
            // Hide game screen
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.classList.add('hidden');
            }
            
            // Hide menu screen (in case it's shown)
            const menuScreen = document.getElementById('menu-screen');
            if (menuScreen) {
                menuScreen.classList.add('hidden');
            }
            
            // Based on the game mode, show appropriate screen
            if (game && game.isTournamentMode) {
                // For tournament mode, show tournament ladder
                const tournamentScreen = document.getElementById('tournament-screen');
                if (tournamentScreen) {
                    tournamentScreen.classList.remove('hidden');
                    // Update tournament ladder if needed
                    if (game.tournamentManager) {
                        game.tournamentManager.renderLadder();
                        setTimeout(() => game.tournamentManager.scrollToCurrentOpponent(), 100);
                    }
                }
            } else {
                // For standard mode, show One on One Game setup
                showStandardSetup();
            }
        };
    }
    
    // Win modal menu button redirect to main menu
    const winModalMenuBtn = document.getElementById('win-modal-menu');
    if (winModalMenuBtn) {
        // Update button text
        winModalMenuBtn.textContent = "Exit Match";
        
        // Store original click handler
        const originalClickHandler = winModalMenuBtn.onclick;
        
        // Replace with new handler
        winModalMenuBtn.onclick = function() {
            if (originalClickHandler) {
                originalClickHandler.call(this);
            }
            
            // After original handler, redirect to appropriate screen
            setTimeout(() => {
                const menuScreen = document.getElementById('menu-screen');
                if (menuScreen) {
                    menuScreen.classList.add('hidden');
                }
                
                if (game && game.isTournamentMode) {
                    // Show tournament screen
                    const tournamentScreen = document.getElementById('tournament-screen');
                    if (tournamentScreen) {
                        tournamentScreen.classList.remove('hidden');
                        if (game.tournamentManager) {
                            game.tournamentManager.renderLadder();
                            setTimeout(() => game.tournamentManager.scrollToCurrentOpponent(), 100);
                        }
                    }
                } else {
                    // Show standard setup
                    showStandardSetup();
                }
            }, 50);
        };
    }
    
    // Resume game button
    const resumeGameBtn = document.getElementById('resume-game-btn');
    if (resumeGameBtn) {
        // Store original click handler
        const originalClickHandler = resumeGameBtn.onclick;
        
        resumeGameBtn.onclick = function() {
            if (originalClickHandler) {
                originalClickHandler.call(this);
            }
            
            showMainMenu();
            
            // If in standard mode
            if (!game.isTournamentMode) {
                // Open game screen directly
                const mainMenu = document.getElementById('main-menu');
                const gameScreen = document.getElementById('game-screen');
                
                if (mainMenu) mainMenu.classList.add('hidden');
                if (gameScreen) gameScreen.classList.remove('hidden');
                
                // Ensure undo/redo buttons are properly shown/hidden
                if (game.ui) {
                    game.ui.updateUndoRedoButtons();
                }
            } 
            // If in tournament mode
            else if (game.isTournamentMode) {
                // Open tournament screen
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) mainMenu.classList.add('hidden');
                
                // If game is still active, show game screen
                if (game.isGameActive) {
                    const gameScreen = document.getElementById('game-screen');
                    const opponentDisplay = document.getElementById('opponent-display');
                    const playerDisplay = document.getElementById('player-display');
                    
                    if (gameScreen) gameScreen.classList.remove('hidden');
                    if (opponentDisplay) opponentDisplay.classList.remove('hidden');
                    if (playerDisplay) playerDisplay.classList.remove('hidden');
                    
                    // Ensure undo/redo buttons are properly hidden
                    if (game.ui) {
                        game.ui.updateUndoRedoButtons();
                    }
                } 
                // Otherwise show tournament screen
                else {
                    const tournamentScreen = document.getElementById('tournament-screen');
                    if (tournamentScreen) {
                        tournamentScreen.classList.remove('hidden');
                        tournamentManager.renderLadder();
                    }
                }
            }
        };
    }
}

/**
 * Show the main menu
 */
function showMainMenu() {
    // First hide ALL screens completely
    hideAllScreens();
    
    // Mark tutorial as seen when main menu is shown
    // This ensures the tutorial won't start again if skipped
    markTutorialAsSeen('main-menu-shown');
    
    // Then show the main menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        // Remove hidden class completely
        mainMenu.classList.remove('hidden');
    } else {
        console.error("Missing main menu element");
        // Fallback to showing menu-screen if main-menu doesn't exist
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            menuScreen.classList.remove('hidden');
        }
    }
}

/**
 * Hide all screens 
 */
function hideAllScreens() {
    // Hide all screens - use optional chaining to avoid errors if an element is missing
    const screens = [
        'main-menu', // Added main-menu to the list to fix visibility issue
        'menu-screen',
        'standard-setup',
        'tournament-screen',
        'tournament-complete-screen',
        'game-screen',
        'tournament-settings',
        'rules-screen' // Added rules screen
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    });
}

/**
 * Show standard game setup
 */
function showStandardSetup() {
    hideAllScreens();
    
    const standardSetup = document.getElementById('standard-setup');
    if (standardSetup) standardSetup.classList.remove('hidden');
}

/**
 * Show rules screen
 */
function showRulesScreen() {
    hideAllScreens();
    
    const rulesScreen = document.getElementById('rules-screen');
    if (rulesScreen) rulesScreen.classList.remove('hidden');
}

/**
 * Show tournament screen
 */
function showTournamentScreen() {
    hideAllScreens();
    
    const tournamentScreen = document.getElementById('tournament-screen');
    
    if (tournamentScreen) {
        tournamentScreen.classList.remove('hidden');
        if (tournamentManager) {
            tournamentManager.renderLadder();           
            setTimeout(() => tournamentManager.scrollToCurrentOpponent(), 100);
        }
    }
}

/**
 * Show tournament settings with reset function
 */
function showTournamentSettings() {
    // Hide all screens
    hideAllScreens();
    
    // Create settings div if it doesn't exist
    let tournamentSettings = document.getElementById('tournament-settings');
    if (!tournamentSettings) {
        tournamentSettings = document.createElement('div');
        tournamentSettings.id = 'tournament-settings';
        tournamentSettings.className = 'screen';
        tournamentSettings.innerHTML = `
            <h1>Tournament Settings</h1>
            <div class="settings-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 20px auto;">
                <div class="settings-item">
                    <h2>Reset Tournament Progress</h2>
                    <p>This will reset all your tournament progress. Defeated opponents will be marked as undefeated.</p>
                    <button id="tournament-reset-btn" class="large-btn" style="background-color: #E74C3C;">Reset Progress</button>
                </div>
                <button id="settings-back-btn" class="large-btn">Back to Main Menu</button>
            </div>
        `;
        document.body.appendChild(tournamentSettings);
        
        // Add event listeners for new elements
        const resetBtn = document.getElementById('tournament-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset your tournament progress? This cannot be undone.')) {
                    // Reset the tournament progress
                    if (tournamentManager) {
                        tournamentManager.resetProgress();
                        alert('Tournament progress has been reset.');
                    }
                }
            });
        }
        
        const backBtn = document.getElementById('settings-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                tournamentSettings.classList.add('hidden');
                showMainMenu();
            });
        }
    }
    
    // Show settings screen
    tournamentSettings.classList.remove('hidden');
}

/**
 * Start standard game
 */
function startStandardGame() {
    // Get player types
    const blackPlayerTypeElem = document.querySelector('.player-type-btn[data-player="black"].active');
    const whitePlayerTypeElem = document.querySelector('.player-type-btn[data-player="white"].active');
    
    if (!blackPlayerTypeElem || !whitePlayerTypeElem) {
        console.error("Could not find player type elements");
        return;
    }
    
    const blackPlayerType = blackPlayerTypeElem.dataset.type;
    const whitePlayerType = whitePlayerTypeElem.dataset.type;
    
    // Get AI levels
    const blackAILevelElem = document.querySelector('.ai-level-btn[data-player="black"].active');
    const whiteAILevelElem = document.querySelector('.ai-level-btn[data-player="white"].active');
    
    const blackAILevel = (blackPlayerType === 'ai' && blackAILevelElem) 
        ? parseInt(blackAILevelElem.dataset.level)
        : 1;
    
    const whiteAILevel = (whitePlayerType === 'ai' && whiteAILevelElem)
        ? parseInt(whiteAILevelElem.dataset.level)
        : 1;
    
    // Set tournament mode to false
    game.isTournamentMode = false;
    
    // Hide opponent display if visible
    const opponentDisplay = document.getElementById('opponent-display');
    if (opponentDisplay) {
        opponentDisplay.classList.add('hidden');
    }
    
    // Hide player display if visible
    const playerDisplay = document.getElementById('player-display');
    if (playerDisplay) {
        playerDisplay.classList.add('hidden');
    }
    
    // Initialize the game
    game.initialize(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel);
    
    // Hide win modal if it's showing
    const winModal = document.getElementById('win-modal');
    if (winModal) {
        winModal.classList.add('hidden');
    }
    
    // Show game screen, hide setup screen
    hideAllScreens();
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) gameScreen.classList.remove('hidden');
    
    // Show resume game button in menu for when user returns
    const resumeGameBtn = document.getElementById('resume-game-btn');
    if (resumeGameBtn) {
        resumeGameBtn.classList.remove('hidden');
    }
    
    // Ensure undo/redo buttons are properly shown
    if (game.ui) {
        game.ui.updateUndoRedoButtons();
    }
}

// Make showStandardSetup function available globally for direct navigation
window.showStandardSetup = showStandardSetup;