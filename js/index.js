/**
 * Game entry point - initializes modes and handles switching between them
 */

// Store game instance globally for extensions to access
let game = null;
let tournamentManager = null;

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Reference the existing game instance or create new one
    if (window.game) {
        game = window.game;
    } else {
        // For first load, initialize as it would have done in game.js
        game = new Game();
        game.initUI();
        window.game = game; // Store globally
    }
    
    // Initialize tournament manager
    tournamentManager = new TournamentManager(game);
    game.tournamentManager = tournamentManager;
    
    // Set up event listeners for main menu
    setupMainMenuListeners();
    
    // Show main menu immediately
    showMainMenu();
});

/**
 * Setup main menu event listeners
 */
function setupMainMenuListeners() {
    // Make sure elements exist before adding event listeners
    const standardModeBtn = document.getElementById('standard-mode-btn');
    if (standardModeBtn) {
        standardModeBtn.addEventListener('click', () => {
            showStandardSetup();
        });
    } else {
        console.error("Missing element: standard-mode-btn");
    }
    
    // Tournament mode button
    const tournamentModeBtn = document.getElementById('tournament-mode-btn');
    if (tournamentModeBtn) {
        tournamentModeBtn.addEventListener('click', () => {
            showTournamentScreen();
        });
    } else {
        console.error("Missing element: tournament-mode-btn");
    }
    
    // Standard mode setup controls
    const standardStartBtn = document.getElementById('standard-start-game-btn');
    if (standardStartBtn) {
        standardStartBtn.addEventListener('click', () => {
            startStandardGame();
        });
    } else {
        console.error("Missing element: standard-start-game-btn");
    }
    
    const standardBackBtn = document.getElementById('standard-back-btn');
    if (standardBackBtn) {
        standardBackBtn.addEventListener('click', () => {
            showMainMenu();
        });
    } else {
        console.error("Missing element: standard-back-btn");
    }
    
    // Menu button in game controls
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        // Store original click handler
        const originalClickHandler = menuBtn.onclick;
        
        // Replace with new handler that shows main menu
        menuBtn.onclick = function() {
            if (originalClickHandler) {
                originalClickHandler.call(this);
            }
            
            // After original handler opens the menu-screen, we hide it and show main menu
            setTimeout(() => {
                const menuScreen = document.getElementById('menu-screen');
                if (menuScreen) {
                    menuScreen.classList.add('hidden');
                }
                showMainMenu();
            }, 50);
        };
    }
    
    // Win modal menu button redirect to main menu
    const winModalMenuBtn = document.getElementById('win-modal-menu');
    if (winModalMenuBtn) {
        // Store original click handler
        const originalClickHandler = winModalMenuBtn.onclick;
        
        // Replace with new handler
        winModalMenuBtn.onclick = function() {
            if (originalClickHandler) {
                originalClickHandler.call(this);
            }
            
            // After original handler, we redirect to main menu
            setTimeout(() => {
                const menuScreen = document.getElementById('menu-screen');
                if (menuScreen) {
                    menuScreen.classList.add('hidden');
                }
                showMainMenu();
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
                    
                    if (gameScreen) gameScreen.classList.remove('hidden');
                    if (opponentDisplay) opponentDisplay.classList.remove('hidden');
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
    // Hide all screens - use optional chaining to avoid errors if an element is missing
    const screens = [
        'menu-screen',
        'standard-setup',
        'tournament-screen',
        'tournament-complete-screen',
        'game-screen'
    ];
    
    screens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    });
    
    // Show main menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
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
 * Show standard game setup
 */
function showStandardSetup() {
    const mainMenu = document.getElementById('main-menu');
    const standardSetup = document.getElementById('standard-setup');
    
    if (mainMenu) mainMenu.classList.add('hidden');
    if (standardSetup) standardSetup.classList.remove('hidden');
}

/**
 * Show tournament screen
 */
function showTournamentScreen() {
    const mainMenu = document.getElementById('main-menu');
    const tournamentScreen = document.getElementById('tournament-screen');
    
    if (mainMenu) mainMenu.classList.add('hidden');
    if (tournamentScreen) {
        tournamentScreen.classList.remove('hidden');
        if (tournamentManager) {
            tournamentManager.renderLadder();
        }
    }
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
    
    // Initialize the game
    game.initialize(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel);
    
    // Hide win modal if it's showing
    const winModal = document.getElementById('win-modal');
    if (winModal) {
        winModal.classList.add('hidden');
    }
    
    // Show game screen, hide setup screen
    const standardSetup = document.getElementById('standard-setup');
    const gameScreen = document.getElementById('game-screen');
    
    if (standardSetup) standardSetup.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
    
    // Show resume game button in menu for when user returns
    const resumeGameBtn = document.getElementById('resume-game-btn');
    if (resumeGameBtn) {
        resumeGameBtn.classList.remove('hidden');
    }
}
