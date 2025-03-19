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
        this.addTutorialStyles();
        this.hideGameControls();
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
        
        // Create controls container - position it at the same location as game controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'tutorial-controls';
        
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
        this.continueHandler = () => this.tutorialService.advanceToNextStep();
        this.skipHandler = () => this.tutorialService.end();
        this.tryAgainHandler = () => {
            this.hideTryAgainButton();
            this.tutorialService.stepManager.retryCurrentStep();
        };
        
        this.continueButton.addEventListener('click', this.continueHandler);
        this.skipButton.addEventListener('click', this.skipHandler);
        this.tryAgainButton.addEventListener('click', this.tryAgainHandler);
        
        // Add buttons to controls
        controlsContainer.appendChild(this.continueButton);
        controlsContainer.appendChild(this.tryAgainButton);
        controlsContainer.appendChild(this.skipButton);
        
        // Add elements to overlay
        this.tutorialOverlay.appendChild(this.messageBox);
        this.tutorialOverlay.appendChild(controlsContainer);
        
        // Add overlay to game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.appendChild(this.tutorialOverlay);
        }
    }
    
    /**
     * Add tutorial-specific CSS styles
     */
    addTutorialStyles() {
        // Remove any existing styles first
        const existingStyles = document.getElementById('tutorial-styles');
        if (existingStyles) {
            existingStyles.parentNode.removeChild(existingStyles);
        }
        
        // Create style element
        const styleElement = document.createElement('style');
        styleElement.id = 'tutorial-styles';
        
        // Define styles
        styleElement.textContent = `
            /* Tutorial Overlay */
            .tutorial-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 50;
            }
            
            /* Message Box */
            .tutorial-message {
                position: absolute;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                width: 80%;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                pointer-events: none;
                z-index: 51;
                font-size: 1.1rem;
                line-height: 1.6;
            }
            
            /* Step title and progress */
            .tutorial-step-title {
                display: block;
                font-size: 1.3rem;
                color: #FFD700;
                margin-bottom: 10px;
            }
            
            .tutorial-step-progress {
                font-size: 0.9rem;
                color: #aaaaaa;
                margin-bottom: 5px;
                display: block;
            }
            
            /* Controls - positioned at the same place as game controls */
            .tutorial-controls {
                position: absolute;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                justify-content: center;
                gap: 15px;
                pointer-events: auto;
                z-index: 51;
                width: 100%;
                max-width: 500px;
            }
            
            /* Buttons */
            .tutorial-btn {
                background-color: #4A6FA5;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: bold;
                transition: background-color 0.2s, transform 0.1s;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                min-width: 100px;
            }
            
            .tutorial-btn:hover {
                background-color: #3A5A80;
                transform: translateY(-2px);
            }
            
            .tutorial-btn:active {
                transform: translateY(1px);
            }
            
            #tutorial-continue-btn {
                background-color: #2E7D32; /* Green color for continue button */
            }
            
            #tutorial-continue-btn:hover {
                background-color: #1B5E20;
            }
            
            #tutorial-try-again-btn {
                background-color: #E74C3C; /* Red color for try again button */
            }
            
            #tutorial-try-again-btn:hover {
                background-color: #C0392B;
            }
            
            #tutorial-skip-btn {
                background-color: #666666;
            }
            
            #tutorial-skip-btn:hover {
                background-color: #555555;
            }
            
            /* Token Highlights */
            .cell.tutorial-highlight {
                background-color: #665200 !important;
                box-shadow: inset 0 0 0 3px #FFD700;
                animation: tutorial-highlight-pulse 1.5s infinite;
            }
            
            @keyframes tutorial-highlight-pulse {
                0% { box-shadow: inset 0 0 0 3px rgba(255, 215, 0, 0.7); }
                50% { box-shadow: inset 0 0 0 3px rgba(255, 215, 0, 1); }
                100% { box-shadow: inset 0 0 0 3px rgba(255, 215, 0, 0.7); }
            }
            
            /* Active Token Highlight */
            .token.tutorial-active {
                box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.7);
                animation: tutorial-token-pulse 1.5s infinite;
            }
            
            @keyframes tutorial-token-pulse {
                0% { box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0.8); }
                100% { box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.4); }
            }
            
            /* Inactive Token Highlight */
            .token.tutorial-inactive-highlight::after {
                animation: tutorial-inactive-pulse 1.5s infinite !important;
            }
            
            @keyframes tutorial-inactive-pulse {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
                50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
            }
            
            /* Captured Token Highlight */
            .token.captured.tutorial-active {
                box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.7);
                animation: tutorial-captured-pulse 1.5s infinite;
            }
            
            @keyframes tutorial-captured-pulse {
                0% { box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(74, 144, 226, 0.8); }
                100% { box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.4); }
            }
            
            /* Tutorial Completion */
            .tutorial-complete {
                text-align: center;
                margin: 0;
                padding: 0;
            }
            
            .tutorial-complete-icon {
                font-size: 48px;
                margin-bottom: 15px;
                color: #FFD700;
                text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                animation: tutorial-trophy-bounce 2s infinite;
            }
            
            @keyframes tutorial-trophy-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            /* Ensure token contrast */
            .token.white {
                background-color: #f0f0f0 !important;
                border: 2px solid #cccccc !important;
            }
            
            .token.black {
                background-color: #222222 !important;
                border: 2px solid #111111 !important;
            }
            
            .token.captured {
                background-color: #4a90e2 !important;
                border: 2px solid #3a7bc8 !important;
            }
            
            /* Responsive Adjustments */
            @media (max-width: 768px) {
                .tutorial-message {
                    max-width: 90%;
                    font-size: 1rem;
                    padding: 15px;
                }
                
                .tutorial-step-title {
                    font-size: 1.2rem;
                }
                
                .tutorial-btn {
                    padding: 10px 18px;
                    font-size: 0.9rem;
                }
            }
        `;
        
        // Add to document
        document.head.appendChild(styleElement);
    }
    
    /**
     * Hide game controls during tutorial
     */
    hideGameControls() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const menuBtn = document.getElementById('menu-btn');
        
        if (undoBtn) undoBtn.classList.add('hidden');
        if (redoBtn) redoBtn.classList.add('hidden');
        if (menuBtn) menuBtn.classList.add('hidden');
        
        // Also hide any game controls container that might be showing
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            gameControls.style.display = 'none';
        }
    }
    
    /**
     * Restore game controls
     */
    restoreGameControls() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const menuBtn = document.getElementById('menu-btn');
        
        if (undoBtn) undoBtn.classList.remove('hidden');
        if (redoBtn) redoBtn.classList.remove('hidden');
        if (menuBtn) menuBtn.classList.remove('hidden');
        
        // Restore any game controls container 
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            gameControls.style.display = '';
        }
    }
    
    /**
     * Show the game screen
     */
    showGameScreen() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('standard-setup').classList.add('hidden');
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('tournament-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
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
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    }
    
    /**
     * Show instructions in the message box with integrated step progress
     */
    showInstructions(title, message, currentStep, totalSteps) {
        if (this.messageBox) {
            // Combine step number with title for cleaner presentation
            const titleElement = `<span class="tutorial-step-title">Tutorial ${currentStep} of ${totalSteps}: ${title}</span>`;
            const content = `${titleElement}${message}`;
            this.messageBox.innerHTML = content;
        }
    }
    
    /**
     * Show the continue button
     */
    showContinueButton() {
        if (this.continueButton) {
            this.continueButton.style.display = 'block';
            this.tryAgainButton.style.display = 'none'; // Hide try again button when showing continue
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
            this.continueButton.style.display = 'none'; // Hide continue button when showing try again
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
                <p>You'll now return to the main menu where you can start a real game!</p>
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
        
        // Reset references
        this.tutorialOverlay = null;
        this.messageBox = null;
        this.continueButton = null;
        this.skipButton = null;
        this.tryAgainButton = null;
        
        // Remove any tutorial classes from cells
        this.clearHighlights();
        
        // Remove visual guidance
        this.clearVisualGuidance();
    }
    
    /**
     * Clear all highlights
     */
    clearHighlights() {
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