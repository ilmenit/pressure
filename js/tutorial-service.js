/**
 * Tutorial Service for Pressure game
 * Provides step-by-step interactive guidance for new players
 */
class TutorialService {
    constructor(game) {
        this.game = game;
        this.board = game.board;
        this.moveManager = game.moveManager;
        this.ui = game.ui;
        
        this.isActive = false;
        this.currentStep = 0;
        this.expectedActionIndex = 0;
        this.expectedAction = null;
        this.originalGameState = null;
        
        // Tutorial UI elements
        this.tutorialOverlay = null;
        this.messageBox = null;
        this.progressIndicator = null;
        this.continueButton = null;
        this.skipButton = null;
        
        // Tutorial steps definition
        this.steps = [];
        this.defineSteps();
    }
    
    /**
     * Create tutorial UI elements
     */
    createTutorialUI() {
        // Create overlay container if it doesn't exist
        if (!document.getElementById('tutorial-overlay')) {
            // Tutorial overlay
            this.tutorialOverlay = document.createElement('div');
            this.tutorialOverlay.id = 'tutorial-overlay';
            this.tutorialOverlay.className = 'tutorial-overlay';
            
            // Message box
            this.messageBox = document.createElement('div');
            this.messageBox.id = 'tutorial-message';
            this.messageBox.className = 'tutorial-message';
            
            // Progress indicator
            this.progressIndicator = document.createElement('div');
            this.progressIndicator.id = 'tutorial-progress';
            this.progressIndicator.className = 'tutorial-progress';
            
            // Controls container
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'tutorial-controls';
            
            // Skip button
            this.skipButton = document.createElement('button');
            this.skipButton.id = 'tutorial-skip-btn';
            this.skipButton.className = 'tutorial-btn';
            this.skipButton.textContent = 'Skip Tutorial';
            this.skipButton.addEventListener('click', () => this.endTutorial());
            
            // Continue button
            this.continueButton = document.createElement('button');
            this.continueButton.id = 'tutorial-continue-btn';
            this.continueButton.className = 'tutorial-btn';
            this.continueButton.textContent = 'Continue';
            this.continueButton.addEventListener('click', () => this.advanceToNextStep());
            this.continueButton.style.display = 'none';
            
            // Add buttons to controls
            controlsContainer.appendChild(this.continueButton);
            controlsContainer.appendChild(this.skipButton);
            
            // Add all elements to overlay
            this.tutorialOverlay.appendChild(this.progressIndicator);
            this.tutorialOverlay.appendChild(this.messageBox);
            this.tutorialOverlay.appendChild(controlsContainer);
            
            // Add overlay to game screen
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.appendChild(this.tutorialOverlay);
            }
            
            // Add tutorial styles
            this.addTutorialStyles();
        } else {
            // If elements already exist, get references to them
            this.tutorialOverlay = document.getElementById('tutorial-overlay');
            this.messageBox = document.getElementById('tutorial-message');
            this.progressIndicator = document.getElementById('tutorial-progress');
            this.continueButton = document.getElementById('tutorial-continue-btn');
            this.skipButton = document.getElementById('tutorial-skip-btn');
        }
    }
    
    /**
     * Add tutorial-specific CSS
     */
    addTutorialStyles() {
        if (!document.getElementById('tutorial-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'tutorial-styles';
            styleElement.textContent = `
                .tutorial-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 50;
                }
                
                .tutorial-message {
                    position: absolute;
                    top: 85px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    pointer-events: none;
                    z-index: 51;
                    font-size: 1rem;
                    line-height: 1.4;
                }
                
                .tutorial-progress {
                    position: absolute;
                    top: 15px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #4A6FA5;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    text-align: center;
                    pointer-events: none;
                    z-index: 51;
                }
                
                .tutorial-controls {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    gap: 15px;
                    pointer-events: auto;
                    z-index: 51;
                }
                
                .tutorial-btn {
                    background-color: #4A6FA5;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                }
                
                .tutorial-btn:hover {
                    background-color: #3A5A80;
                }
                
                .tutorial-highlight {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    animation: tutorial-pulse 1.5s infinite;
                    z-index: 40;
                }
                
                @keyframes tutorial-pulse {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.1); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 0.6; }
                }
                
                .token.tutorial-active {
                    animation: tutorial-token-pulse 1.5s infinite;
                }
                
                @keyframes tutorial-token-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
                    50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
                }
                
                .token.tutorial-inactive-highlight::after {
                    animation: tutorial-inactive-pulse 1.5s infinite;
                }
                
                @keyframes tutorial-inactive-pulse {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
                }
                
                .tutorial-complete {
                    text-align: center;
                    margin-top: 20px;
                }
                
                .tutorial-complete-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                    color: #FFD700;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .tutorial-message {
                        max-width: 90%;
                        font-size: 0.9rem;
                    }
                    
                    .tutorial-btn {
                        padding: 8px 15px;
                        font-size: 0.9rem;
                    }
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    /**
     * Start the tutorial
     */
    start() {
        // Clean up any existing game state first
        if (this.game.ui) {
            this.game.ui.clearSelection();
        }
        
        // Clear any existing highlights
        this.board.clearHighlights();
        
        // Save original game state for restoration later
        this.saveGameState();
        
        // Set up tutorial mode
        this.isActive = true;
        this.currentStep = 0;
        this.expectedActionIndex = 0;
        
        // Create UI if it doesn't exist
        this.createTutorialUI();
        
        // Make sure UI elements are visible
        this.tutorialOverlay.style.display = 'block';
        
        // Hide menu screens, show game screen
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
        
        // Hide game controls that aren't needed in tutorial
        this.hideGameControls();
        
        // Load the first step
        this.loadStep(0);
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
    }
    
    /**
     * Restore game controls after tutorial
     */
    restoreGameControls() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const menuBtn = document.getElementById('menu-btn');
        
        if (undoBtn) undoBtn.classList.remove('hidden');
        if (redoBtn) redoBtn.classList.remove('hidden');
        if (menuBtn) menuBtn.classList.remove('hidden');
    }
    
    /**
     * Save current game state for restoration later
     */
    saveGameState() {
        this.originalGameState = {
            isGameActive: this.game.isGameActive,
            currentPlayer: this.game.currentPlayer,
            blackPlayerType: this.game.blackPlayerType,
            whitePlayerType: this.game.whitePlayerType,
            grid: this.board.getDeepCopy(),
            isTournamentMode: this.game.isTournamentMode || false
        };
    }
    
    /**
     * Restore game state when exiting tutorial
     */
    restoreGameState() {
        if (this.originalGameState) {
            this.game.isGameActive = this.originalGameState.isGameActive;
            this.game.currentPlayer = this.originalGameState.currentPlayer;
            this.game.blackPlayerType = this.originalGameState.blackPlayerType;
            this.game.whitePlayerType = this.originalGameState.whitePlayerType;
            this.game.isTournamentMode = this.originalGameState.isTournamentMode;
            
            // Restore board state
            if (this.originalGameState.grid) {
                this.board.restoreFromCopy(this.originalGameState.grid);
            }
            
            // Update UI
            this.board.renderBoard();
            if (this.game.ui) {
                this.game.ui.updateGameState();
            }
        }
    }
    
    /**
     * End the tutorial and return to normal game
     */
    endTutorial() {
        // Don't do anything if not active
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Clear any highlights or tutorial elements
        this.clearAllHighlights();
        
        // Hide the tutorial overlay
        if (this.tutorialOverlay) {
            this.tutorialOverlay.style.display = 'none';
        }
        
        // Restore game controls
        this.restoreGameControls();
        
        // Return to main menu or restore previous game state
        if (this.originalGameState) {
            this.restoreGameState();
            
            // If we were in tournament mode, go back to tournament screen
            if (this.originalGameState.isTournamentMode && this.game.tournamentManager) {
                this.game.tournamentManager.showTournamentScreen();
            } else {
                // Otherwise go back to main menu
                const mainMenu = document.getElementById('main-menu');
                const gameScreen = document.getElementById('game-screen');
                
                if (gameScreen) gameScreen.classList.add('hidden');
                if (mainMenu) mainMenu.classList.remove('hidden');
            }
        } else {
            // If no state to restore, just go to main menu
            document.getElementById('game-screen').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
        }
    }
    
    /**
     * Define all tutorial steps
     */
    defineSteps() {
        this.steps = [
            // Step 1: Basic Movement
            {
                title: "Basic Movement",
                message: "Click on your white token to see where it can move",
                boardSetup: [
                    { row: 2, col: 2, color: 'white' }
                ],
                highlights: [{ row: 2, col: 2 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 2 },
                        nextMessage: "Now click on a highlighted cell to move your token.",
                        highlightsAfter: [
                            { row: 1, col: 2 }, // Up
                            { row: 3, col: 2 }, // Down
                            { row: 2, col: 1 }, // Left
                            { row: 2, col: 3 }  // Right
                        ]
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            // Check if moving to one of the four adjacent cells
                            const validDestinations = [
                                { row: 1, col: 2 }, { row: 3, col: 2 }, 
                                { row: 2, col: 1 }, { row: 2, col: 3 }
                            ];
                            return validDestinations.some(dest => 
                                dest.row === move.to.row && dest.col === move.to.col
                            );
                        },
                        nextMessage: "Great! You can move to any adjacent empty space (up, down, left, or right).",
                        completesStep: true
                    }
                ]
            },
            
            // Step 2: Turn Alternation
            {
                title: "Taking Turns",
                message: "In Pressure, players take turns. Make a move with your white token.",
                boardSetup: [
                    { row: 2, col: 2, color: 'white' },
                    { row: 1, col: 1, color: 'black' }
                ],
                highlights: [{ row: 2, col: 2 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 2 },
                        nextMessage: "Select a destination for your token."
                    },
                    {
                        type: 'move',
                        nextMessage: "Now the black player (AI) will take their turn.",
                        onComplete: function() {
                            // Simulate AI move after a delay
                            setTimeout(() => {
                                // Find black token and make a simple move
                                for (let row = 0; row < this.board.size; row++) {
                                    for (let col = 0; col < this.board.size; col++) {
                                        const token = this.board.getTokenAt(row, col);
                                        if (token && token.color === 'black') {
                                            // Find a valid move for the black token
                                            const moves = this.moveManager.generatePossibleMoves('black');
                                            if (moves.length > 0) {
                                                // Execute the first valid move
                                                const move = moves[0];
                                                this.board.moveToken(move.from.row, move.from.col, move.to.row, move.to.col);
                                                this.board.renderBoard();
                                                
                                                // Show feedback after AI move
                                                setTimeout(() => {
                                                    this.updateMessage("Each player moves one token per turn. White always goes first.");
                                                    this.showContinueButton();
                                                }, 1000);
                                            }
                                            return;
                                        }
                                    }
                                }
                            }, 1500);
                        }
                    }
                ]
            },
            
            // Step 3: Basic Pushing
            {
                title: "Basic Pushing",
                message: "You can push tokens if there's an empty space at the end of the line. Try pushing the black token.",
                boardSetup: [
                    { row: 2, col: 1, color: 'white' },
                    { row: 2, col: 2, color: 'black' }
                    // Empty space at 2,3
                ],
                highlights: [{ row: 2, col: 1 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 1 },
                        nextMessage: "Now move to the black token's position to push it.",
                        highlightsAfter: [{ row: 2, col: 2 }]
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            return move.to.row === 2 && move.to.col === 2;
                        },
                        nextMessage: "When pushing, the entire connected line moves one space.",
                        onComplete: function() {
                            // Highlight the inactive token after push
                            setTimeout(() => {
                                this.updateMessage("Notice that the black token now has a red dot. Pushed opponent tokens become inactive for their next turn.");
                                this.highlightInactiveToken();
                                this.showContinueButton();
                            }, 2000);
                        }
                    }
                ]
            },
            
            // Step 4: Multi-Token Pushing
            {
                title: "Multi-Token Pushing",
                message: "You can push multiple tokens at once. Try pushing this line of tokens.",
                boardSetup: [
                    { row: 2, col: 0, color: 'white' },
                    { row: 2, col: 1, color: 'black' },
                    { row: 2, col: 2, color: 'white' }
                    // Empty space at 2,3
                ],
                highlights: [{ row: 2, col: 0 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 0 },
                        nextMessage: "Now push the line of tokens by moving into the black token's position.",
                        highlightsAfter: [{ row: 2, col: 1 }]
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            return move.to.row === 2 && move.to.col === 1;
                        },
                        nextMessage: "Good job! You pushed multiple tokens at once.",
                        onComplete: function() {
                            setTimeout(() => {
                                this.updateMessage("Notice that only the black token became inactive (red dot). Your own tokens remain active when pushed.");
                                this.highlightInactiveToken();
                                this.showContinueButton();
                            }, 2000);
                        }
                    }
                ]
            },
            
            // Step 5: Token Capture
            {
                title: "Token Capture",
                message: "When a token is surrounded on all four sides, it's captured. Move your token to capture the black token.",
                boardSetup: [
                    { row: 2, col: 1, color: 'white' }, // Left of target
                    { row: 1, col: 2, color: 'white' }, // Above target
                    { row: 3, col: 2, color: 'white' }, // Below target
                    { row: 2, col: 2, color: 'black' }, // Target for capture
                    { row: 2, col: 4, color: 'white' }  // Player's token to move
                ],
                highlights: [{ row: 2, col: 4 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 4 },
                        nextMessage: "Move to the right of the black token to surround and capture it.",
                        highlightsAfter: [{ row: 2, col: 3 }]
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            return move.to.row === 2 && move.to.col === 3;
                        },
                        nextMessage: "Excellent! Captured tokens turn blue and cannot be moved by either player, but they can still be pushed.",
                        onComplete: function() {
                            // Highlight the captured token
                            setTimeout(() => {
                                this.highlightCapturedToken();
                                setTimeout(() => {
                                    this.updateMessage("Capturing all opponent tokens is one way to win the game.");
                                    this.showContinueButton();
                                }, 1500);
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 6: Edge Capture Strategy
            {
                title: "Edge Capture Strategy",
                message: "Board edges count as surroundings too! Position your token to complete the capture using fewer pieces.",
                boardSetup: [
                    { row: 0, col: 1, color: 'black' },  // Target for edge capture
                    { row: 0, col: 0, color: 'white' },  // Left of target
                    { row: 1, col: 1, color: 'white' },  // Below target
                    { row: 2, col: 3, color: 'white' }   // Player's token to move
                ],
                highlights: [{ row: 2, col: 3 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 3 },
                        nextMessage: "Move your token to get closer to the black token in the corner."
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            // Allow any valid move - player will need multiple moves
                            return true;
                        },
                        nextMessage: "Good! Now select your token again to move it closer to the target.",
                        completesStep: false,
                        onComplete: function() {
                            // After player's first move, set up for next move
                            setTimeout(() => {
                                // Find the token they just moved and highlight it
                                const tokenPos = this.findPlayerToken();
                                if (tokenPos) {
                                    this.applyHighlights([tokenPos]);
                                }
                                // Update expected action index
                                this.expectedActionIndex++;
                                if (this.expectedActionIndex < this.steps[this.currentStep].expectedActions.length) {
                                    this.expectedAction = this.steps[this.currentStep].expectedActions[this.expectedActionIndex];
                                }
                            }, 1000);
                        }
                    },
                    {
                        type: 'selectAny',
                        nextMessage: "Move to the right of the black token to complete the capture."
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            // Allow any move that completes the capture
                            // This could be a direct move to 0,2 or another intermediate move
                            return true;
                        },
                        nextMessage: "Keep going! Position your token to the right of the black token.",
                        completesStep: false,
                        onComplete: function() {
                            // Check if we've captured the black token yet
                            const isBlackCaptured = this.isTokenCaptured(0, 1);
                            
                            if (isBlackCaptured) {
                                // Black token was captured - complete the step
                                setTimeout(() => {
                                    this.updateMessage("Smart move! Using the board edges makes capturing easier - you need fewer tokens at an edge, and even fewer in a corner!");
                                    this.showContinueButton();
                                }, 1000);
                            } else {
                                // Still need to move closer - set up another move
                                setTimeout(() => {
                                    // Find the token they just moved and highlight it
                                    const tokenPos = this.findPlayerToken();
                                    if (tokenPos) {
                                        this.applyHighlights([tokenPos]);
                                    }
                                    // Don't increment action index - stay on the current action
                                }, 1000);
                            }
                        }
                    }
                ]
            },
            
            // Step 7: Victory Conditions
            {
                title: "Victory Conditions",
                message: "The goal is to win by either capturing all opponent tokens or leaving them no valid moves.",
                boardSetup: [
                    { row: 1, col: 1, color: 'black' },   // Last opponent token
                    { row: 0, col: 1, color: 'white' },   // Above target
                    { row: 1, col: 0, color: 'white' },   // Left of target
                    { row: 2, col: 1, color: 'white' },   // Below target
                    { row: 1, col: 3, color: 'white' }    // Player's token to move
                ],
                highlights: [{ row: 1, col: 3 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 1, col: 3 },
                        nextMessage: "Move to the right of the black token to make the final capture and win!"
                    },
                    {
                        type: 'move',
                        validate: (move) => {
                            return move.to.row === 1 && move.to.col === 2;
                        },
                        nextMessage: "Congratulations! You've completed the tutorial and now know how to play Pressure.",
                        onComplete: function() {
                            setTimeout(() => {
                                this.showTutorialComplete();
                            }, 2000);
                        }
                    }
                ]
            }
        ];
    }
    
    /**
     * Load a specific step
     */
    loadStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.showTutorialComplete();
            return;
        }
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        this.expectedActionIndex = 0;
        
        // Clear any existing selections from the UI manager
        if (this.game.ui) {
            this.game.ui.clearSelection();
        }
        
        // Set up board for this step
        this.setupBoardForStep(step);
        
        // Clear any existing highlights
        this.clearAllHighlights();
        
        // Update progress indicator
        this.updateProgress(stepIndex + 1, this.steps.length);
        
        // Update message
        this.updateMessage(step.message, step.title);
        
        // Apply initial highlights
        if (step.highlights && step.highlights.length > 0) {
            this.applyHighlights(step.highlights);
        }
        
        // Set initial expected action
        this.expectedAction = step.expectedActions[0];
        
        // Hide continue button at start of step
        this.continueButton.style.display = 'none';
    }
    
    /**
     * Set up board for a specific step
     */
    setupBoardForStep(step) {
        // Clear the board first
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                this.board.setTokenAt(row, col, null);
            }
        }
        
        // Place tokens according to the step configuration
        if (step.boardSetup && step.boardSetup.length > 0) {
            step.boardSetup.forEach(token => {
                this.board.setTokenAt(token.row, token.col, {
                    color: token.color,
                    isActive: token.isActive !== false,
                    isCaptured: token.isCaptured === true
                });
            });
        }
        
        // Render the updated board
        this.board.renderBoard();
        
        // Make sure game state is properly set
        this.game.isGameActive = true;
        this.game.currentPlayer = 'white';  // Tutorial always uses white as player
        this.game.blackPlayerType = 'ai';
        this.game.whitePlayerType = 'human';
    }
    
    /**
     * Update the progress indicator
     */
    updateProgress(current, total) {
        if (this.progressIndicator) {
            this.progressIndicator.textContent = `Step ${current} of ${total}`;
        }
    }
    
    /**
     * Update the tutorial message
     */
    updateMessage(message, title = null) {
        if (this.messageBox) {
            let content = message;
            if (title) {
                content = `<strong>${title}</strong><br>${message}`;
            }
            this.messageBox.innerHTML = content;
        }
    }
    
    /**
     * Find a player's (white) token on the board
     */
    findPlayerToken() {
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && token.color === 'white' && token.isActive && !token.isCaptured) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    /**
     * Check if a token at given position is captured
     */
    isTokenCaptured(row, col) {
        const token = this.board.getTokenAt(row, col);
        return token && token.isCaptured;
    }
    
    /**
     * Apply highlights to specified positions
     */
    applyHighlights(positions) {
        this.clearTutorialHighlights();
        
        if (!positions || positions.length === 0) return;
        
        positions.forEach(pos => {
            // Find the cell element
            const cell = this.board.boardElement.querySelector(
                `.cell[data-row="${pos.row}"][data-col="${pos.col}"]`
            );
            
            if (cell) {
                // Add tutorial highlight to the cell
                cell.classList.add('tutorial-highlight');
                
                // For token highlights, add special class
                const tokenElement = cell.querySelector('.token');
                if (tokenElement) {
                    tokenElement.classList.add('tutorial-active');
                }
            }
        });
    }
    
    /**
     * Highlight inactive token for teaching purposes
     */
    highlightInactiveToken() {
        // Find all inactive tokens
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && !token.isActive && !token.isCaptured) {
                    // Create special highlight for inactive token
                    const cell = this.board.boardElement.querySelector(
                        `.cell[data-row="${row}"][data-col="${col}"]`
                    );
                    
                    if (cell) {
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
     * Highlight captured token for teaching purposes
     */
    highlightCapturedToken() {
        // Find all captured tokens
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && token.isCaptured) {
                    // Create special highlight for captured token
                    const cell = this.board.boardElement.querySelector(
                        `.cell[data-row="${row}"][data-col="${col}"]`
                    );
                    
                    if (cell) {
                        cell.classList.add('tutorial-highlight');
                        const tokenElement = cell.querySelector('.token');
                        if (tokenElement) {
                            tokenElement.classList.add('tutorial-active');
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Clear tutorial-specific highlights
     */
    clearTutorialHighlights() {
        // Clear tutorial-specific highlighting
        const highlightedCells = document.querySelectorAll('.cell.tutorial-highlight');
        highlightedCells.forEach(cell => {
            cell.classList.remove('tutorial-highlight');
        });
        
        // Clear token highlights
        const highlightedTokens = document.querySelectorAll('.token.tutorial-active');
        highlightedTokens.forEach(token => {
            token.classList.remove('tutorial-active');
        });
        
        // Clear inactive token highlights
        const inactiveHighlights = document.querySelectorAll('.token.tutorial-inactive-highlight');
        inactiveHighlights.forEach(token => {
            token.classList.remove('tutorial-inactive-highlight');
        });
    }
    
    /**
     * Clear all highlights (both tutorial and game)
     */
    clearAllHighlights() {
        // Clear tutorial highlights
        this.clearTutorialHighlights();
        
        // Clear game highlights
        this.board.clearHighlights();
        
        // Also clear UI selection if it exists
        if (this.game.ui) {
            this.game.ui.clearSelection();
        }
    }
    
    /**
     * Show the continue button
     */
    showContinueButton() {
        if (this.continueButton) {
            this.continueButton.style.display = 'block';
        }
    }
    
    /**
     * Advance to next step
     */
    advanceToNextStep() {
        this.clearAllHighlights();
        this.currentStep++;
        this.loadStep(this.currentStep);
    }
    
    /**
     * Show tutorial completion
     */
    showTutorialComplete() {
        this.clearAllHighlights();
        
        this.updateMessage(`
            <div class="tutorial-complete">
                <div class="tutorial-complete-icon">🏆</div>
                <p>Congratulations! You've completed the tutorial and now know how to play Pressure.</p>
                <p>You've learned about movement, pushing, capturing, and the victory conditions.</p>
                <p>Ready to play a real game?</p>
            </div>
        `);
        
        // Change continue button to "Start Game"
        this.continueButton.textContent = "Start Game";
        this.continueButton.removeEventListener('click', () => this.advanceToNextStep());
        this.continueButton.addEventListener('click', () => this.startRealGame());
        this.showContinueButton();
        
        // Update progress
        this.updateProgress(this.steps.length, this.steps.length);
    }
    
    /**
     * Start a real game after tutorial
     */
    startRealGame() {
        this.isActive = false;
        
        // Hide tutorial UI
        if (this.tutorialOverlay) {
            this.tutorialOverlay.style.display = 'none';
        }
        
        // Restore game controls
        this.restoreGameControls();
        
        // Start a new standard game
        this.game.initialize('human', 'ai', 5, 5);
        
        // Update UI
        if (this.game.ui) {
            this.game.ui.updateGameState();
        }
    }
    
    /**
     * Handle cell selection
     */
    handleCellSelection(row, col) {
        if (!this.isActive || !this.expectedAction) return false;
        
        const token = this.board.getTokenAt(row, col);
        
        // Handle based on expected action type
        if (this.expectedAction.type === 'select') {
            // Expected a specific token selection
            if (row === this.expectedAction.position.row && 
                col === this.expectedAction.position.col) {
                
                // Update to next message
                if (this.expectedAction.nextMessage) {
                    this.updateMessage(this.expectedAction.nextMessage);
                }
                
                // Let the game's UI handle the selection first
                // We'll apply our tutorial highlights after
                
                // Advance to next expected action
                this.expectedActionIndex++;
                if (this.expectedActionIndex < this.steps[this.currentStep].expectedActions.length) {
                    this.expectedAction = this.steps[this.currentStep].expectedActions[this.expectedActionIndex];
                } else {
                    this.expectedAction = null;
                }
                
                // Apply new highlights if specified (after a brief delay for better UX)
                if (this.steps[this.currentStep].expectedActions[this.expectedActionIndex - 1].highlightsAfter) {
                    setTimeout(() => {
                        this.applyHighlights(
                            this.steps[this.currentStep].expectedActions[this.expectedActionIndex - 1].highlightsAfter
                        );
                    }, 100);
                }
                
                return true;
            }
        } else if (this.expectedAction.type === 'selectAny') {
            // Player can select any of their tokens
            if (token && token.color === 'white' && token.isActive && !token.isCaptured) {
                // Update to next message
                if (this.expectedAction.nextMessage) {
                    this.updateMessage(this.expectedAction.nextMessage);
                }
                
                // Advance to next expected action
                this.expectedActionIndex++;
                if (this.expectedActionIndex < this.steps[this.currentStep].expectedActions.length) {
                    this.expectedAction = this.steps[this.currentStep].expectedActions[this.expectedActionIndex];
                } else {
                    this.expectedAction = null;
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle move execution
     */
    handleMoveExecution(move) {
        if (!this.isActive || !this.expectedAction) return false;
        
        if (this.expectedAction.type === 'move') {
            // Validate the move if validation function exists
            if (this.expectedAction.validate && !this.expectedAction.validate(move)) {
                return false;
            }
            
            // Use the game's move execution to properly update state
            this.game.executePlayerMove(move);
            
            // Update message
            if (this.expectedAction.nextMessage) {
                this.updateMessage(this.expectedAction.nextMessage);
            }
            
            // Execute any after-completion logic
            if (this.expectedAction.onComplete) {
                this.expectedAction.onComplete.call(this);
            }
            
            // Check if this completes the step
            if (this.expectedAction.completesStep !== false) {
                // If not explicitly set to false, step is completed
                // Show continue button unless in last step
                if (this.currentStep < this.steps.length - 1) {
                    this.showContinueButton();
                }
            } else {
                // Advance to next expected action only if not handled in onComplete
                if (!this.expectedAction.onComplete) {
                    this.expectedActionIndex++;
                    if (this.expectedActionIndex < this.steps[this.currentStep].expectedActions.length) {
                        this.expectedAction = this.steps[this.currentStep].expectedActions[this.expectedActionIndex];
                    } else {
                        this.expectedAction = null;
                    }
                }
            }
            
            return true;
        }
        
        return false;
    }
}

/**
 * Global function to start the tutorial
 */
function startTutorial() {
    const game = window.game;
    
    if (!game) {
        console.error("Game instance not found");
        return;
    }
    
    // Ensure any ongoing game is reset
    if (game.isGameActive) {
        // Save current game for later restoration
        // (handled by tutorial service)
    }
    
    // Create tutorial service if it doesn't exist
    if (!window.tutorialService) {
        window.tutorialService = new TutorialService(game);
    }
    
    // Start the tutorial
    window.tutorialService.start();
}

// Make function globally available
window.startTutorial = startTutorial;
