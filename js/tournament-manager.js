/**
 * Tournament Manager for Pressure game
 * Handles tournament progression and character interactions
 */
class TournamentManager {
    constructor(game) {
        this.game = game;
        this.opponents = [];
        this.currentOpponentIndex = 0;
        this.tournamentCompleted = false;
        // Track player color in tournament mode
        this.playerColor = null;
        this.aiColor = null;
        
        this.initialize();
    }

    /**
     * Initialize the tournament manager
     */
    initialize() {
        this.loadOpponents();
        this.loadProgress();
        this.setupEventListeners();
    }

    /**
     * Load opponent data
     */
    loadOpponents() {
        // Load opponents from the TournamentOpponents class
        this.opponents = TournamentOpponents.getOpponents();
    }
    
    /**
     * Load saved tournament progress
     */
    loadProgress() {
        try {
            // Check if localStorage is available
            if (typeof localStorage === 'undefined') {
                console.warn("localStorage not available, tournament progress won't be saved");
                return;
            }
            
            const savedData = localStorage.getItem('pressure_tournament');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.currentOpponentIndex = data.currentOpponentIndex || 0;
                this.tournamentCompleted = data.tournamentCompleted || false;
                
                // Update opponent defeated status
                if (data.defeatedOpponents) {
                    data.defeatedOpponents.forEach(id => {
                        const opponent = this.opponents.find(o => o.id === id);
                        if (opponent) {
                            opponent.defeated = true;
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error loading tournament progress:", e);
            this.resetProgress();
        }
    }
    
    /**
     * Save tournament progress
     */
    saveProgress() {
        try {
            // Check if localStorage is available
            if (typeof localStorage === 'undefined') {
                console.warn("localStorage not available, tournament progress won't be saved");
                return;
            }
            
            const defeatedOpponents = this.opponents
                .filter(o => o.defeated)
                .map(o => o.id);
                
            const data = {
                currentOpponentIndex: this.currentOpponentIndex,
                tournamentCompleted: this.tournamentCompleted,
                defeatedOpponents: defeatedOpponents
            };
            
            localStorage.setItem('pressure_tournament', JSON.stringify(data));
        } catch (e) {
            console.error("Error saving tournament progress:", e);
        }
    }
    
    /**
     * Reset tournament progress
     */
    resetProgress() {
        this.currentOpponentIndex = 0;
        this.tournamentCompleted = false;
        this.opponents.forEach(o => o.defeated = false);
        
        // Check if localStorage is available
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('pressure_tournament');
            } catch (e) {
                console.error("Error removing tournament progress from localStorage:", e);
            }
        }
    }
    
    /**
     * Get current opponent
     */
    getCurrentOpponent() {
        return this.opponents[this.currentOpponentIndex];
    }
    
    /**
     * Advance to next opponent
     * @returns {boolean} - True if there are more opponents, false if tournament is complete
     */
    advanceToNextOpponent() {
        // Mark current opponent as defeated
        if (this.currentOpponentIndex < this.opponents.length) {
            this.opponents[this.currentOpponentIndex].defeated = true;
        }
        
        // Move to next opponent
        if (this.currentOpponentIndex < this.opponents.length - 1) {
            this.currentOpponentIndex++;
            this.saveProgress();
            return true;
        } else {
            // Tournament completed
            this.tournamentCompleted = true;
            this.saveProgress();
            return false;
        }
    }
    
    /**
     * Setup event listeners for tournament controls
     */
    setupEventListeners() {
        // Challenge button
        const startMatchBtn = document.getElementById('start-match-btn');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', () => {
                this.startMatch();
            });
        }
        
        // Back to menu button
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                this.backToMainMenu();
            });
        }
        
        // Try again button
        const retryBtn = document.getElementById('tournament-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                retryBtn.classList.add('hidden');
                this.startMatch();
            });
        }
        
        // Complete tournament button
        const tournamentCompleteBackBtn = document.getElementById('tournament-complete-back-btn');
        if (tournamentCompleteBackBtn) {
            tournamentCompleteBackBtn.addEventListener('click', () => {
                const completeScreen = document.getElementById('tournament-complete-screen');
                if (completeScreen) {
                    completeScreen.classList.add('hidden');
                }
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) {
                    mainMenu.classList.remove('hidden');
                    // Focus on the main menu for keyboard accessibility
                    const firstButton = mainMenu.querySelector('button');
                    if (firstButton) {
                        firstButton.focus();
                    }
                }
            });
        }
    }
    
    /**
     * Start a match with the current opponent
     */
    startMatch() {
        const opponent = this.getCurrentOpponent();
        if (!opponent) {
            console.error("No opponent found at index", this.currentOpponentIndex);
            return;
        }
        
        // Hide tournament screen
        const tournamentScreen = document.getElementById('tournament-screen');
        if (tournamentScreen) {
            tournamentScreen.classList.add('hidden');
        }
        
        // Hide the retry button if it's visible
        const retryBtn = document.getElementById('tournament-retry-btn');
        if (retryBtn) {
            retryBtn.classList.add('hidden');
        }
        
        // Make sure win modal is hidden
        const winModal = document.getElementById('win-modal');
        if (winModal) {
            winModal.classList.add('hidden');
        }
        
        // Set game to tournament mode
        this.game.isTournamentMode = true;
        this.game.currentOpponent = opponent;
        
        // Randomly assign player colors
        const playerIsWhite = Math.random() >= 0.5;
        this.playerColor = playerIsWhite ? 'white' : 'black';
        this.aiColor = playerIsWhite ? 'black' : 'white';
        
        // Initialize game with random color assignment
        // Remember: initialize(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel)
        if (playerIsWhite) {
            // Player is white, AI is black
            this.game.initialize('ai', 'human', opponent.difficulty, 0);
        } else {
            // Player is black, AI is white
            this.game.initialize('human', 'ai', 0, opponent.difficulty);
        }
        
        // Hide undo/redo buttons in tournament mode
        if (this.game.ui) {
            this.game.ui.updateUndoRedoButtons();
        }
        
        // Show opponent display
        this.showOpponentDisplay(opponent);
        
        // Add player display if not already present
        this.setupPlayerDisplay();
        
        // Show start commentary
        this.displayCommentary('start');
        
        // Show game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Setup the opponent display
     */
    showOpponentDisplay(opponent) {
        const opponentDisplay = document.getElementById('opponent-display');
        const opponentPortrait = document.getElementById('opponent-portrait');
        const opponentInfo = document.getElementById('opponent-info');
        
        if (opponentDisplay && opponentPortrait && opponentInfo) {
            opponentDisplay.classList.remove('hidden');
            opponentPortrait.src = `assets/characters/${opponent.image}`;
            opponentPortrait.onerror = function() {
                // If image loading fails, try to get from localStorage fallback
                try {
                    const fallbackImage = localStorage.getItem(`char_img_${opponent.image}`);
                    if (fallbackImage) {
                        opponentPortrait.src = fallbackImage;
                    } else {
                        // Use a simple color block with text as fallback
                        opponentPortrait.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0QTZGQTUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5DaGFyYWN0ZXI8L3RleHQ+PC9zdmc+';
                    }
                } catch (e) {
                    console.error("Error using fallback image:", e);
                }
            };
            
            opponentInfo.innerHTML = `
                <div class="opponent-name">${opponent.name}</div>
                <div class="opponent-difficulty">
                    ${'★'.repeat(opponent.difficulty)}${'☆'.repeat(3 - opponent.difficulty)}
                </div>
                <div class="opponent-color">Playing as ${this.aiColor.toUpperCase()}</div>
            `;
        }
    }
    
    /**
     * Setup the player display
     */
    setupPlayerDisplay() {
        let playerDisplay = document.getElementById('player-display');
        if (!playerDisplay) {
            playerDisplay = document.createElement('div');
            playerDisplay.id = 'player-display';
            playerDisplay.className = 'player-display';
            
            const playerPortrait = document.createElement('img');
            playerPortrait.id = 'player-portrait';
            playerPortrait.src = 'assets/characters/player.webp';
            playerPortrait.alt = 'Player';
            // Fallback if player image doesn't load
            playerPortrait.onerror = function() {
                playerPortrait.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMzQTVBODAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2U2ZTZlNiIvPjxyZWN0IHg9IjMwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiByeD0iNSIgZmlsbD0iI2U2ZTZlNiIvPjx0ZXh0IHg9IjUwIiB5PSI5MiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGxheWVyPC90ZXh0Pjwvc3ZnPg==';
            };
            
            const playerInfo = document.createElement('div');
            playerInfo.id = 'player-info';
            playerInfo.innerHTML = `
                <div class="player-name">You</div>
                <div class="player-color">Playing as ${this.playerColor.toUpperCase()}</div>
            `;
            
            playerDisplay.appendChild(playerPortrait);
            playerDisplay.appendChild(playerInfo);
            
            // Add to game screen on the left side
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.appendChild(playerDisplay);
            }
        } else {
            playerDisplay.classList.remove('hidden');
            // Update player color info
            const playerColorInfo = playerDisplay.querySelector('.player-color');
            if (playerColorInfo) {
                playerColorInfo.textContent = `Playing as ${this.playerColor.toUpperCase()}`;
            } else {
                const playerInfo = playerDisplay.querySelector('#player-info');
                if (playerInfo) {
                    const colorDiv = document.createElement('div');
                    colorDiv.className = 'player-color';
                    colorDiv.textContent = `Playing as ${this.playerColor.toUpperCase()}`;
                    playerInfo.appendChild(colorDiv);
                }
            }
        }
    }
    
    /**
     * Display character commentary using a bag of quotes system
     */
    displayCommentary(type) {
        const opponent = this.getCurrentOpponent();
        if (!opponent || !opponent.quotes || !opponent.quotes[type]) {
            return;
        }
        
        // Initialize quote bags if they don't exist
        this.quoteBags = this.quoteBags || {};
        if (!this.quoteBags[opponent.id]) {
            this.quoteBags[opponent.id] = {};
        }
        
        // Get or create the quote bag for this type
        if (!this.quoteBags[opponent.id][type] || this.quoteBags[opponent.id][type].length === 0) {
            // If bag is empty or doesn't exist, refill it with all quotes (shuffled)
            this.quoteBags[opponent.id][type] = [...opponent.quotes[type]];
            this.shuffleArray(this.quoteBags[opponent.id][type]);
        }
        
        // For non-critical events, apply probability to decide whether to show dialog
        if (type === 'capture' || type === 'opponentCapture') {
            // Only show dialog 30% of the time for captures
            if (Math.random() > 0.3) {
                return;
            }
        }
        
        // Get the next quote from the bag
        const quote = this.quoteBags[opponent.id][type].pop();
        
        const commentaryBox = document.getElementById('commentary-box');
        if (commentaryBox) {
            commentaryBox.textContent = quote;
            commentaryBox.classList.add('active');
            
            // Hide commentary after a few seconds
            setTimeout(() => {
                commentaryBox.classList.remove('active');
            }, 3000);
        }
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * Handle token capture event
     */
    handleTokenCapture(tokenColor) {
        // Initialize capture tracking
        this.captureCounter = this.captureCounter || { lastCaptureTime: 0, consecutiveCaptures: 0 };
        
        // Check if we're in tournament mode
        if (this.game.isTournamentMode) {
            const now = Date.now();
            
            // Don't show commentary for consecutive captures within 2 seconds
            // This prevents dialog spam when multiple captures happen at once
            if (now - this.captureCounter.lastCaptureTime < 2000) {
                this.captureCounter.consecutiveCaptures++;
                
                // Only show dialog for first 2 consecutive captures
                if (this.captureCounter.consecutiveCaptures > 2) {
                    return;
                }
            } else {
                // Reset consecutive captures counter if enough time has passed
                this.captureCounter.consecutiveCaptures = 1;
            }
            
            // Update last capture time
            this.captureCounter.lastCaptureTime = now;
            
            // If player's token was captured
            if (tokenColor === this.playerColor) {
                this.displayCommentary('opponentCapture');
            } 
            // If opponent's token was captured
            else if (tokenColor === this.aiColor) {
                this.displayCommentary('capture');
            }
        }
    }
    
    /**
     * Handle match outcome
     */
    handleMatchOutcome(winner) {
        // Check if player has won based on stored player color
        const isPlayerWin = winner === this.playerColor;
        
        // Show appropriate commentary
        if (isPlayerWin) {
            this.displayCommentary('lose');  // Opponent lost
        } else {
            this.displayCommentary('win');   // Opponent won
        }
        
        // FIX: Clear any existing win modal elements handlers to prevent issues
        const existingContinueBtn = document.getElementById('tournament-continue-btn');
        const existingLadderBtn = document.getElementById('tournament-ladder-btn');
        if (existingContinueBtn) {
            const newBtn = existingContinueBtn.cloneNode(true);
            existingContinueBtn.parentNode.replaceChild(newBtn, existingContinueBtn);
        }
        if (existingLadderBtn) {
            const newBtn = existingLadderBtn.cloneNode(true);
            existingLadderBtn.parentNode.replaceChild(newBtn, existingLadderBtn);
        }
        
        // If player won
        if (isPlayerWin) {
            this.handlePlayerVictory();
        } else {
            this.handlePlayerDefeat();
        }
    }
    
    /**
     * Handle player victory in tournament match
     */
    handlePlayerVictory() {
        // IMPORTANT: Save progress immediately upon victory
        // This ensures progress isn't lost if player uses menu button
        if (this.currentOpponentIndex < this.opponents.length) {
            this.opponents[this.currentOpponentIndex].defeated = true;
            this.saveProgress();
        }
    
        // Override win modal with tournament advancement UI
        const winModal = document.getElementById('win-modal');
        const winModalTitle = document.getElementById('win-modal-title');
        const winModalMessage = document.getElementById('win-modal-message');
        const winModalButtons = document.querySelector('#win-modal .modal-buttons');
        
        if (winModal && winModalTitle && winModalMessage && winModalButtons) {
            // Change modal content to show tournament victory
            winModalTitle.textContent = 'Tournament Victory!';
            winModalTitle.className = 'tournament-modal-title';
            
            const currentOpponent = this.getCurrentOpponent();
            const defeatedCount = this.opponents.filter(o => o.defeated).length;
            const totalOpponents = this.opponents.length;
            const isLastOpponent = this.currentOpponentIndex === totalOpponents - 1;
            
            winModalMessage.innerHTML = `
                <div>You've defeated ${currentOpponent.name}!</div>
                <div class="victory-feedback">
                    ${isLastOpponent 
                        ? 'Final boss conquered!' 
                        : `Opponent ${defeatedCount} of ${totalOpponents} defeated!`}
                </div>
            `;
            
            // Replace buttons with continue button and return to ladder button
            winModalButtons.innerHTML = `
                <button id="tournament-continue-btn" class="large-btn">
                    ${isLastOpponent 
                        ? 'Claim Your Championship Trophy' 
                        : 'Continue to Next Opponent'}
                </button>
                <button id="tournament-ladder-btn" class="large-btn">
                    Return to Tournament Ladder
                </button>
            `;
            
            // Show win modal (might be hidden in tournament mode)
            winModal.classList.remove('hidden');
            
            // Add event listener to continue button
            const continueBtn = document.getElementById('tournament-continue-btn');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    // Hide win modal
                    winModal.classList.add('hidden');
                    
                    // Advance to next opponent
                    const hasNextOpponent = this.advanceToNextOpponent();
                    
                    if (!hasNextOpponent) {
                        // Tournament complete
                        this.showTournamentComplete();
                    } else {
                        // Return to tournament ladder
                        this.showTournamentScreen();
                    }
                });
                
                // Set focus to the continue button for keyboard accessibility
                setTimeout(() => {
                    continueBtn.focus();
                }, 100);
            }
            
            // Add event listener to ladder button
            const ladderBtn = document.getElementById('tournament-ladder-btn');
            if (ladderBtn) {
                ladderBtn.addEventListener('click', () => {
                    // Hide win modal
                    winModal.classList.add('hidden');
                    
                    // Return to tournament ladder without advancing
                    this.showTournamentScreen();
                });
            }
        } else {
            // Fallback if modal elements not found
            setTimeout(() => {
                const hasNextOpponent = this.advanceToNextOpponent();
                
                if (!hasNextOpponent) {
                    // Tournament complete
                    this.showTournamentComplete();
                } else {
                    // Return to tournament ladder
                    this.showTournamentScreen();
                }
            }, 3000);
        }
    }
    
    /**
     * Handle player defeat in tournament match
     */
    handlePlayerDefeat() {
        // Player lost - show retry button
        const retryBtn = document.getElementById('tournament-retry-btn');
        if (retryBtn) {
            // Show it after a short delay
            setTimeout(() => {
                retryBtn.classList.remove('hidden');
                
                // Set focus to retry button for keyboard accessibility
                setTimeout(() => {
                    retryBtn.focus();
                }, 100);
            }, 2000);
        }
    }
    
    /**
     * Show tournament complete screen
     */
    showTournamentComplete() {
        // Hide game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('hidden');
        }
        
        // Show completion screen
        const completeScreen = document.getElementById('tournament-complete-screen');
        if (completeScreen) {
            // Update completion message with more personalization
            const completionElement = completeScreen.querySelector('.tournament-victory');
            if (completionElement) {
                completionElement.innerHTML = `
                    <div class="tournament-trophy">🏆</div>
                    <h2>Congratulations!</h2>
                    <p>You have defeated all opponents and become the Pressure Champion!</p>
                    <p class="final-stats">You've mastered the game by defeating ${this.opponents.length} unique opponents!</p>
                    <button id="tournament-complete-back-btn" class="large-btn">Return to Main Menu</button>
                `;
                
                // Re-attach event listener to the new button
                const backBtn = document.getElementById('tournament-complete-back-btn');
                if (backBtn) {
                    backBtn.addEventListener('click', () => {
                        completeScreen.classList.add('hidden');
                        const mainMenu = document.getElementById('main-menu');
                        if (mainMenu) {
                            mainMenu.classList.remove('hidden');
                            // Focus on the main menu for keyboard accessibility
                            const firstButton = mainMenu.querySelector('button');
                            if (firstButton) {
                                firstButton.focus();
                            }
                        }
                    });
                }
            }
            
            completeScreen.classList.remove('hidden');
            
            // Play celebration animation/sound
            this.celebrateTournamentVictory();
        }
    }
    
    /**
     * Celebrate tournament victory with special effects
     */
    celebrateTournamentVictory() {
        // Create a more elaborate victory animation
        const completeScreen = document.getElementById('tournament-complete-screen');
        if (!completeScreen) return;
        
        // Add celebration background
        const celebration = document.createElement('div');
        celebration.className = 'tournament-celebration';
        completeScreen.appendChild(celebration);
        
        // Create confetti
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'victory-confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.top = `-${Math.random() * 20 + 10}px`;
                confetti.style.backgroundColor = this.getRandomCelebrateColor();
                confetti.style.width = `${Math.random() * 10 + 5}px`;
                confetti.style.height = `${Math.random() * 10 + 5}px`;
                confetti.style.animationDelay = `${Math.random() * 3}s`;
                confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
                celebration.appendChild(confetti);
                
                // Remove confetti after animation completes
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 5000);
            }, i * 50); // Staggered creation for better effect
        }
    }
    
    /**
     * Get random color for celebration confetti
     */
    getRandomCelebrateColor() {
        const colors = [
            '#FFD700', // Gold
            '#FF5733', // Red-Orange
            '#33FF57', // Green
            '#5733FF', // Purple
            '#FF33A8', // Pink
            '#33FFF3', // Cyan
            '#F3FF33'  // Yellow
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Show tournament screen (ladder)
     */
    showTournamentScreen() {
        // Hide game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('hidden');
        }
        
        // Show tournament screen
        const tournamentScreen = document.getElementById('tournament-screen');
        if (tournamentScreen) {
            tournamentScreen.classList.remove('hidden');
            
            // Set focus to the challenge button for keyboard accessibility
            const startMatchBtn = document.getElementById('start-match-btn');
            if (startMatchBtn) {
                setTimeout(() => {
                    startMatchBtn.focus();
                }, 100);
            }
        }
        
        // Update ladder display
        this.renderLadder();
    }
    
    /**
     * Back to main menu
     */
    backToMainMenu() {
        const tournamentScreen = document.getElementById('tournament-screen');
        const mainMenu = document.getElementById('main-menu');
        
        if (tournamentScreen) {
            tournamentScreen.classList.add('hidden');
        }
        
        if (mainMenu) {
            mainMenu.classList.remove('hidden');
            
            // Set focus to first button in main menu for keyboard accessibility
            const firstButton = mainMenu.querySelector('button');
            if (firstButton) {
                setTimeout(() => {
                    firstButton.focus();
                }, 100);
            }
        }
    }
    
    /**
     * Render tournament ladder UI
     */
    renderLadder() {
        const ladderElement = document.getElementById('tournament-ladder');
        if (!ladderElement) {
            console.error("Tournament ladder element not found");
            return;
        }
        
        ladderElement.innerHTML = '';
        
        // Add progress indicator at the top
        const progressElement = document.createElement('div');
        progressElement.className = 'tournament-progress';
        
        // Calculate progress 
        const defeatedCount = this.opponents.filter(o => o.defeated).length;
        const totalOpponents = this.opponents.length;
        
        progressElement.innerHTML = `
            <div class="progress-text">
                <span>Progress: ${defeatedCount} / ${totalOpponents} opponents defeated</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(defeatedCount / totalOpponents) * 100}%"></div>
            </div>
        `;
        
        ladderElement.appendChild(progressElement);
        
        // Add all opponents to ladder
        this.opponents.forEach((opponent, index) => {
            const opponentElement = document.createElement('div');
            opponentElement.className = 'ladder-opponent';
            
            // Add appropriate classes
            if (opponent.defeated) {
                opponentElement.classList.add('defeated');
            }
            
            if (index === this.currentOpponentIndex && !opponent.defeated) {
                opponentElement.classList.add('current');
                
                // Update the button text for the current opponent
                const startMatchBtn = document.getElementById('start-match-btn');
                if (startMatchBtn) {
                    startMatchBtn.textContent = `Challenge ${opponent.name}`;
                }
            }
            
            // Check if this is the current opponent and not defeated
            let opponentHTML = '';
            
            if (index === this.currentOpponentIndex && !opponent.defeated) {
                // Include player icon for the current opponent
                opponentHTML = `
                    <div class="player-vs-opponent">
                        <div class="player-mini-portrait">
                            <img src="assets/characters/player.webp" alt="Player" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiMzQTVBODAiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjIwIiByPSIxMCIgZmlsbD0iI2U2ZTZlNiIvPjxyZWN0IHg9IjE1IiB5PSIzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1IiByeD0iMyIgZmlsbD0iI2U2ZTZlNiIvPjwvc3ZnPg=='">
                        </div>
                        <div class="vs-indicator">VS</div>
                    </div>
                `;
            }
            
            opponentHTML += `
                <div class="opponent-portrait">
                    <img src="assets/characters/${opponent.image}" alt="${opponent.name}">
                </div>
                <div class="opponent-info">
                    <div class="opponent-name">${opponent.name}</div>
                    <div class="opponent-difficulty">
                        ${'★'.repeat(opponent.difficulty)}${'☆'.repeat(3 - opponent.difficulty)}
                    </div>
                </div>
                ${opponent.defeated ? '<div class="opponent-status">Defeated</div>' : ''}
            `;
            
            opponentElement.innerHTML = opponentHTML;
            
            // Handle image loading errors
            const img = opponentElement.querySelector('.opponent-portrait img');
            if (img) {
                img.onerror = function() {
                    // If image loading fails, try to get from localStorage fallback
                    try {
                        const fallbackImage = localStorage.getItem(`char_img_${opponent.image}`);
                        if (fallbackImage) {
                            img.src = fallbackImage;
                        } else {
                            // Use a simple color block with text as fallback
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0QTZGQTUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5DaGFyYWN0ZXI8L3RleHQ+PC9zdmc+';
                        }
                    } catch (e) {
                        console.error("Error using fallback image:", e);
                    }
                };
            }
            
            // Also handle player image loading errors
            const playerImg = opponentElement.querySelector('.player-mini-portrait img');
            if (playerImg) {
                playerImg.onerror = function() {
                    playerImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiMzQTVBODAiLz48Y2lyY2xlIGN4PSIyNSIgY3k9IjIwIiByPSIxMCIgZmlsbD0iI2U2ZTZlNiIvPjxyZWN0IHg9IjE1IiB5PSIzMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1IiByeD0iMyIgZmlsbD0iI2U2ZTZlNiIvPjwvc3ZnPg==';
                };
            }
            
            ladderElement.appendChild(opponentElement);
        });
    }
}
