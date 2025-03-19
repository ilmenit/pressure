/**
 * tutorial-ui.js
 * Manages tutorial UI components and rendering
 */
class TutorialUIManager {
    constructor(tutorialService) {
        this.tutorialService = tutorialService;
        this.game = tutorialService.game;
        this.board = tutorialService.board;
        
        // Tutorial UI elements
        this.tutorialOverlay = null;
        this.messageBox = null;
        this.progressIndicator = null;
        this.continueButton = null;
        this.skipButton = null;
        this.tryAgainButton = null;
        this.tutorialControls = null;
        
        // Original game controls container to restore later
        this.originalGameControls = null;
        
        // Event handlers for proper cleanup
        this.continueHandler = null;
        this.skipHandler = null;
        this.tryAgainHandler = null;
    }
    
    /**
     * Create and setup tutorial UI elements
     */
    setupTutorialUI() {
        this.createTutorialElements();
        this.ensureTutorialStylesLoaded();
        this.setupTutorialControls();
    }
    
    /**
     * Create tutorial UI elements
     */
    createTutorialElements() {
        // Clean up any existing elements first
        this.cleanupTutorialUI();
        
        // Create overlay container
        this.tutorialOverlay = document.createElement('div');
        this.tutorialOverlay.id = 'tutorial-overlay';
        this.tutorialOverlay.className = 'tutorial-overlay';
        
        // Create message box
        this.messageBox = document.createElement('div');
        this.messageBox.id = 'tutorial-message';
        this.messageBox.className = 'tutorial-message';
        
        // Add message box to overlay
        this.tutorialOverlay.appendChild(this.messageBox);
        
        // Add overlay to game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.appendChild(this.tutorialOverlay);
        }
    }
    
    /**
     * Setup tutorial controls by replacing the game controls
     */
    setupTutorialControls() {
        // Find the game controls container
        const gameControls = document.querySelector('.game-controls');
        if (!gameControls) {
            console.error('Game controls container not found');
            return;
        }
        
        // Save original game controls to restore later
        this.originalGameControls = gameControls.cloneNode(true);
        
        // Create tutorial controls
        this.tutorialControls = document.createElement('div');
        this.tutorialControls.className = 'tutorial-controls';
        
        // Create continue button
        this.continueButton = document.createElement('button');
        this.continueButton.id = 'tutorial-continue-btn';
        this.continueButton.className = 'tutorial-btn';
        this.continueButton.textContent = 'Continue';
        this.continueButton.style.display = 'none';
        
        // Create try again button
        this.tryAgainButton = document.createElement('button');
        this.tryAgainButton.id = 'tutorial-try-again-btn';
        this.tryAgainButton.className = 'tutorial-btn';
        this.tryAgainButton.textContent = 'Try Again';
        this.tryAgainButton.style.display = 'none';
        
        // Create skip button
        this.skipButton = document.createElement('button');
        this.skipButton.id = 'tutorial-skip-btn';
        this.skipButton.className = 'tutorial-btn';
        this.skipButton.textContent = 'Skip Tutorial';
        
        // Add event handlers
        this.continueHandler = () => {
            if (this.tutorialService && this.tutorialService.isActive) {
                this.tutorialService.advanceToNextStep();
            }
        };
        
        this.skipHandler = () => {
            if (this.tutorialService && this.tutorialService.isActive) {
                this.tutorialService.end();
            }
        };
        
        this.tryAgainHandler = () => {
            if (this.tutorialService && this.tutorialService.isActive) {
                this.hideTryAgainButton();
                this.tutorialService.stepManager.retryCurrentStep();
            }
        };
        
        this.continueButton.addEventListener('click', this.continueHandler);
        this.skipButton.addEventListener('click', this.skipHandler);
        this.tryAgainButton.addEventListener('click', this.tryAgainHandler);
        
        // Add buttons to controls
        this.tutorialControls.appendChild(this.continueButton);
        this.tutorialControls.appendChild(this.tryAgainButton);
        this.tutorialControls.appendChild(this.skipButton);
        
        // Replace game controls with tutorial controls
        gameControls.innerHTML = '';
        gameControls.appendChild(this.tutorialControls);
        
        // Show the game controls container to ensure tutorial controls are visible
        gameControls.style.display = 'flex';
    }
    
    /**
     * Ensure tutorial styles are loaded
     */
    ensureTutorialStylesLoaded() {
        // Check if the styles are already loaded
        if (!document.getElementById('tutorial-external-css')) {
            // Create link element to load external CSS
            const link = document.createElement('link');
            link.id = 'tutorial-external-css';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'css/tutorial-styles.css';
            
            // Add to head
            document.head.appendChild(link);
        }
    }
    
    /**
     * Hide game controls during tutorial
     */
    hideGameControls() {
        // This function is no longer needed as we're replacing the controls
        // rather than hiding them
    }
    
    /**
     * Restore game controls
     */
    restoreGameControls() {
        // Restore original game controls if they exist
        if (this.originalGameControls) {
            const gameControls = document.querySelector('.game-controls');
            if (gameControls) {
                // Replace with the original controls
                gameControls.innerHTML = '';
                
                // Clone all child nodes from original game controls
                Array.from(this.originalGameControls.childNodes).forEach(node => {
                    gameControls.appendChild(node.cloneNode(true));
                });
                
                // Restore event listeners for undo/redo buttons
                const undoBtn = gameControls.querySelector('#undo-btn');
                const redoBtn = gameControls.querySelector('#redo-btn');
                const menuBtn = gameControls.querySelector('#menu-btn');
                
                if (undoBtn && this.game.undoMove) {
                    undoBtn.addEventListener('click', this.game.undoMove.bind(this.game));
                }
                
                if (redoBtn && this.game.redoMove) {
                    redoBtn.addEventListener('click', this.game.redoMove.bind(this.game));
                }
                
                if (menuBtn && this.game.ui && this.game.ui.openMenu) {
                    menuBtn.addEventListener('click', this.game.ui.openMenu.bind(this.game.ui));
                }
            }
            
            // Clear the reference
            this.originalGameControls = null;
        }
    }
    
    /**
     * Show the game screen
     */
    showGameScreen() {
        // Hide all screens first to avoid potential conflicts
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        
        // Show game screen specifically
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.remove('hidden');
        }
        
        // Hide any opponent display from tournament mode
        const opponentDisplay = document.getElementById('opponent-display');
        if (opponentDisplay) {
            opponentDisplay.classList.add('hidden');
        }
    }
    
    /**
     * Show the main menu
     */
    showMainMenu() {
        // Hide all screens first
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        
        // Show main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) {
            mainMenu.classList.remove('hidden');
            
            // Focus on the first button in the main menu for better UX
            setTimeout(() => {
                const firstButton = mainMenu.querySelector('button');
                if (firstButton) {
                    firstButton.focus();
                }
            }, 100);
        }
    }
    
    /**
     * Show instructions in the message box with integrated step progress
     */
    showInstructions(title, message, currentStep, totalSteps) {
        if (!this.messageBox) return;
        
        // Format the title with step count
        const titleElement = `<span class="tutorial-step-title">Tutorial ${currentStep} of ${totalSteps}: ${title}</span>`;
        
        // Convert newlines to HTML breaks
        const formattedMessage = message.replace(/\n/g, '<br>');
        
        const content = `${titleElement}${formattedMessage}`;
        this.messageBox.innerHTML = content;
    }
    
    /**
     * Show the continue button
     */
    showContinueButton() {
        if (this.continueButton) {
            this.continueButton.style.display = 'block';
            if (this.tryAgainButton) {
                this.tryAgainButton.style.display = 'none'; // Hide try again button when showing continue
            }
            
            // Focus the continue button for better accessibility
            setTimeout(() => {
                this.continueButton.focus();
            }, 100);
        }
    }
    
    /**
     * Hide the continue button
     */
    hideContinueButton() {
        if (this.continueButton) {
            this.continueButton.style.display = 'none';
        }
    }
    
    /**
     * Show the try again button
     */
    showTryAgainButton() {
        if (this.tryAgainButton) {
            this.tryAgainButton.style.display = 'block';
            if (this.continueButton) {
                this.continueButton.style.display = 'none'; // Hide continue button when showing try again
            }
            
            // Focus the try again button for better accessibility
            setTimeout(() => {
                this.tryAgainButton.focus();
            }, 100);
        }
    }
    
    /**
     * Hide the try again button
     */
    hideTryAgainButton() {
        if (this.tryAgainButton) {
            this.tryAgainButton.style.display = 'none';
        }
    }
    
    /**
     * Show completion message
     */
    showCompletionMessage() {
        // Update message box
        this.showInstructions("Tutorial Complete", `
            <div class="tutorial-complete">
                <div class="tutorial-complete-icon">🏆</div>
                <p>Congratulations! You've completed the tutorial and now know how to play Pressure.</p>
                <p>You've learned about movement, pushing, capturing, and the victory conditions.</p>
                <p>You'll now return to the main menu where you can start a real game or try Tournament Mode!</p>
            </div>
        `, this.tutorialService.stepManager.getTotalSteps(), this.tutorialService.stepManager.getTotalSteps());
        
        // Hide the continue and skip buttons since we're returning to menu automatically
        if (this.continueButton) this.continueButton.style.display = 'none';
        if (this.skipButton) this.skipButton.style.display = 'none';
    }
    
    /**
     * Clean up all tutorial UI elements
     */
    cleanupTutorialUI() {
        // Remove event listeners
        if (this.continueButton) {
            this.continueButton.removeEventListener('click', this.continueHandler);
        }
        
        if (this.skipButton) {
            this.skipButton.removeEventListener('click', this.skipHandler);
        }
        
        if (this.tryAgainButton) {
            this.tryAgainButton.removeEventListener('click', this.tryAgainHandler);
        }
        
        // Remove overlay if it exists
        if (this.tutorialOverlay && this.tutorialOverlay.parentNode) {
            this.tutorialOverlay.parentNode.removeChild(this.tutorialOverlay);
        }
        
        // Restore original game controls
        this.restoreGameControls();
        
        // Reset references
        this.tutorialOverlay = null;
        this.messageBox = null;
        this.continueButton = null;
        this.skipButton = null;
        this.tryAgainButton = null;
        this.tutorialControls = null;
        this.continueHandler = null;
        this.skipHandler = null;
        this.tryAgainHandler = null;
        
        // Remove any tutorial classes from cells
        this.clearHighlights();
        
        // Remove visual guidance
        this.clearVisualGuidance();
    }
    
    /**
     * Clear all highlights
     */
    clearHighlights() {
        // Only proceed if tutorial is active
        if (!this.tutorialService || !this.tutorialService.isActive) return;
        
        // Clear cell highlights
        document.querySelectorAll('.cell.tutorial-highlight').forEach(cell => {
            cell.classList.remove('tutorial-highlight');
        });
        
        // Clear token highlights
        document.querySelectorAll('.token.tutorial-active').forEach(token => {
            token.classList.remove('tutorial-active');
        });
        
        // Clear inactive token highlights
        document.querySelectorAll('.token.tutorial-inactive-highlight').forEach(token => {
            token.classList.remove('tutorial-inactive-highlight');
        });
        
        // Only remove last-move-indicator elements if in active tutorial
        document.querySelectorAll('.last-move-indicator').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
    
    /**
     * Clear visual guidance elements
     */
    clearVisualGuidance() {
        // Remove paths
        const paths = document.querySelectorAll('.tutorial-path');
        paths.forEach(path => {
            if (path.parentNode) {
                path.parentNode.removeChild(path);
            }
        });
    }
    
    /**
     * Highlight specific positions
     */
    highlightPositions(positions) {
        if (!positions || positions.length === 0) return;
        
        positions.forEach(pos => {
            // Check position validity
            if (!pos || typeof pos.row !== 'number' || typeof pos.col !== 'number') return;
            
            // Find the cell
            const cell = this.board.boardElement.querySelector(
                `.cell[data-row="${pos.row}"][data-col="${pos.col}"]`
            );
            
            if (cell) {
                // Add highlight class
                cell.classList.add('tutorial-highlight');
                
                // If there's a token, highlight it too
                const token = cell.querySelector('.token');
                if (token) {
                    token.classList.add('tutorial-active');
                }
            }
        });
    }
    
    /**
     * Highlight inactive tokens
     */
    highlightInactiveToken() {
        // Find all inactive tokens
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && !token.isActive && !token.isCaptured) {
                    // Find the cell
                    const cell = this.board.boardElement.querySelector(
                        `.cell[data-row="${row}"][data-col="${col}"]`
                    );
                    
                    if (cell) {
                        // Find the token element
                        const tokenElement = cell.querySelector('.token');
                        if (tokenElement) {
                            tokenElement.classList.add('tutorial-inactive-highlight');
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Highlight captured tokens
     */
    highlightCapturedToken() {
        // Find all captured tokens
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && token.isCaptured) {
                    // Find the cell
                    const cell = this.board.boardElement.querySelector(
                        `.cell[data-row="${row}"][data-col="${col}"]`
                    );
                    
                    if (cell) {
                        // Highlight the cell
                        cell.classList.add('tutorial-highlight');
                        
                        // Find the token element
                        const tokenElement = cell.querySelector('.token');
                        if (tokenElement) {
                            tokenElement.classList.add('tutorial-active');
                        }
                    }
                }
            }
        }
    }
}