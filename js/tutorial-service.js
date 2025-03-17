/**
 * Tutorial Service for Pressure game
 * Manages the interactive tutorial experience with minimal impact on core game code
 */
class TutorialService {
    constructor(game) {
        this.game = game;
        this.currentStepIndex = 0;
        this.steps = [];
        this.isActive = false;
        
        // UI elements
        this.instructionPanel = null;
        this.nextButton = null;
        
        // Store original handlers to restore later
        this.originalHandlers = {
            cellClick: null,
            executeMove: null,
            clearSelection: null,
            endDragOperation: null
        };
        
        // Bind methods
        this.handleMoveCompleted = this.handleMoveCompleted.bind(this);
        
        // Initialize
        this.initializeSteps();
    }

    /**
     * Initialize tutorial steps
     */
    initializeSteps() {
        this.steps = [
            // Step 1: Basic Movement
            {
                title: "Basic Movement",
                instructions: "Click on your white token to see where it can move, then move it to any valid space.",
                secondaryInstructions: "Now move your token to any highlighted space.",
                successMessage: "Great! You can move to any adjacent empty space (up, down, left, or right).",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place a single white token in the center
                    board.setTokenAt(2, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 2}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 2;
                },
                isCompleted: (lastMove) => {
                    // Step is complete when the token has moved from center
                    return lastMove && 
                           lastMove.from.row === 2 && 
                           lastMove.from.col === 2;
                }
            },

            // Step 2: Turn Alternation
            {
                title: "Turn Alternation",
                instructions: "In Pressure, players take turns. Make a move with your token.",
                secondaryInstructions: "Now the black player (AI) will take their turn.",
                successMessage: "Each player moves one token per turn. White always goes first.",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place white token
                    board.setTokenAt(2, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place black token
                    board.setTokenAt(2, 4, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 2}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 2;
                },
                isCompleted: (lastMove) => {
                    return lastMove && lastMove.from.row === 2 && lastMove.from.col === 2;
                },
                onStepCompleted: () => {
                    // Show AI making its move
                    this.updateInstructions(this.steps[this.currentStepIndex].secondaryInstructions);
                    
                    // Simulate AI move after a delay
                    setTimeout(() => {
                        if (this.game.board.getTokenAt(2, 4)) {
                            this.game.board.moveToken(2, 4, 3, 4);
                            this.game.board.renderBoard();
                            
                            // Show success message after AI move
                            setTimeout(() => {
                                this.showStepSuccess();
                            }, 1000);
                        }
                    }, 1500);
                    
                    // This step has custom completion logic, so don't auto-advance
                    return false;
                }
            },

            // Step 3: Basic Pushing
            {
                title: "Basic Pushing",
                instructions: "You can push tokens if there's an empty space at the end of the line. Try pushing the black token.",
                successMessage: "When pushing, the entire connected line moves one space. Notice that the black token now has a red dot. Pushed opponent tokens become inactive for their next turn.",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place white token
                    board.setTokenAt(2, 1, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place black token
                    board.setTokenAt(2, 2, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 1}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 1;
                },
                isCompleted: (lastMove) => {
                    return lastMove && 
                           lastMove.from.row === 2 && 
                           lastMove.from.col === 1 &&
                           lastMove.to.row === 2 &&
                           lastMove.to.col === 2;
                }
            },

            // Step 4: Multi-Token Pushing
            {
                title: "Multi-Token Pushing",
                instructions: "You can push multiple tokens at once. Try pushing both the black and white tokens.",
                successMessage: "Notice that only the black token became inactive (red dot). Your own tokens remain active when pushed.",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place pusher white token
                    board.setTokenAt(2, 0, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place black token to be pushed
                    board.setTokenAt(2, 1, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place another white token to be pushed
                    board.setTokenAt(2, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 0}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 0;
                },
                isCompleted: (lastMove) => {
                    return lastMove && 
                           lastMove.from.row === 2 && 
                           lastMove.from.col === 0 &&
                           lastMove.to.row === 2 &&
                           lastMove.to.col === 1;
                }
            },

            // Step 5: Token Capture
            {
                title: "Token Capture",
                instructions: "When a token is surrounded on all four sides, it's captured. Move your token to capture the black token.",
                successMessage: "Excellent! Captured tokens turn blue and cannot be moved by either player, but they can still be pushed. Capturing all opponent tokens is one way to win the game.",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place the black token to be captured
                    board.setTokenAt(2, 2, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place white tokens on three sides
                    board.setTokenAt(1, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.setTokenAt(2, 1, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.setTokenAt(3, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Player's white token to move for the capture
                    board.setTokenAt(2, 0, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 0}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 0;
                },
                isCompleted: (lastMove, capturedTokens) => {
                    // Check if a black token was captured
                    return capturedTokens && capturedTokens.some(token => token.color === 'black');
                }
            },

            // Step 6: Edge Capture Strategy
            {
                title: "Edge Capture Strategy",
                instructions: "Board edges count as surroundings too! Position your token to complete the capture with fewer pieces.",
                successMessage: "Smart move! Using the board edges makes capturing easier - only 3 tokens needed at an edge, and just 2 in a corner!",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place black token near edge
                    board.setTokenAt(0, 1, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place white tokens on two sides
                    board.setTokenAt(0, 0, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.setTokenAt(1, 1, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Player's white token to move
                    board.setTokenAt(2, 3, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 3}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 3;
                },
                isCompleted: (lastMove, capturedTokens) => {
                    // Check if a black token was captured
                    return capturedTokens && capturedTokens.some(token => token.color === 'black');
                }
            },

            // Step 7: Victory Conditions
            {
                title: "Victory Conditions",
                instructions: "The goal is to win by either capturing all opponent tokens or leaving them no valid moves. Make the final move to win!",
                successMessage: "Congratulations! You've completed the tutorial and now know how to play Pressure.",
                setupBoard: (board) => {
                    // Clear the board
                    board.grid = Array(board.size).fill().map(() => Array(board.size).fill(null));
                    
                    // Place the last black token to be captured
                    board.setTokenAt(2, 2, {
                        color: 'black',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // Place white tokens on three sides
                    board.setTokenAt(1, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.setTokenAt(2, 1, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.setTokenAt(3, 2, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    // 5 more black tokens captured already
                    for (let i = 0; i < 5; i++) {
                        const row = 4;
                        const col = i;
                        board.setTokenAt(row, col, {
                            color: 'black',
                            isActive: false,
                            isCaptured: true
                        });
                    }
                    
                    // Player's white token to make the winning move
                    board.setTokenAt(2, 3, {
                        color: 'white',
                        isActive: true,
                        isCaptured: false
                    });
                    
                    board.renderBoard();
                },
                highlightPositions: [{row: 2, col: 3}],
                onTokenSelected: (pos) => {
                    return pos.row === 2 && pos.col === 3;
                },
                isCompleted: (lastMove, capturedTokens) => {
                    // Check if a black token was captured
                    return capturedTokens && capturedTokens.some(token => token.color === 'black');
                },
                onStepCompleted: () => {
                    // Show completion message
                    setTimeout(() => {
                        this.showTutorialComplete();
                    }, 2000);
                    
                    return false; // Don't auto-advance
                }
            }
        ];
    }

    /**
     * Create UI elements for the tutorial
     */
    createUIElements() {
        // Create instruction panel if it doesn't exist
        if (!document.getElementById('tutorial-panel')) {
            const gameScreen = document.getElementById('game-screen');
            if (!gameScreen) return;
            
            // Create tutorial panel
            this.instructionPanel = document.createElement('div');
            this.instructionPanel.id = 'tutorial-panel';
            this.instructionPanel.className = 'tutorial-panel';
            
            this.instructionPanel.innerHTML = `
                <div class="tutorial-header">
                    <div class="tutorial-progress">Step <span id="tutorial-step-number">1</span> of ${this.steps.length}</div>
                    <div class="tutorial-title" id="tutorial-title">Basic Movement</div>
                </div>
                <div class="tutorial-content">
                    <p id="tutorial-instructions">Click on your white token to see where it can move.</p>
                </div>
                <div class="tutorial-navigation">
                    <button id="tutorial-skip-btn" class="tutorial-btn">Skip Tutorial</button>
                    <button id="tutorial-next-btn" class="tutorial-btn" disabled>Next Step</button>
                </div>
            `;
            
            // Insert at the top of the game screen
            gameScreen.insertBefore(this.instructionPanel, gameScreen.firstChild);
            
            // Store navigation buttons
            this.nextButton = document.getElementById('tutorial-next-btn');
            const skipButton = document.getElementById('tutorial-skip-btn');
            
            // Add event listeners
            if (this.nextButton) {
                this.nextButton.addEventListener('click', () => this.nextStep());
            }
            
            if (skipButton) {
                skipButton.addEventListener('click', () => this.exitTutorial());
            }
            
            // Add styles if not already added
            this.addTutorialStyles();
        }
    }
    
    /**
     * Add tutorial styles to the document
     */
    addTutorialStyles() {
        if (!document.getElementById('tutorial-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'tutorial-styles';
            styleElement.textContent = `
                .tutorial-panel {
                    background-color: #1E1E1E;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    max-width: 800px;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                .tutorial-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .tutorial-progress {
                    font-size: 0.9rem;
                    color: #aaaaaa;
                }
                
                .tutorial-title {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: #4A6FA5;
                }
                
                .tutorial-content {
                    margin-bottom: 15px;
                    font-size: 1.1rem;
                }
                
                .tutorial-navigation {
                    display: flex;
                    justify-content: space-between;
                }
                
                .tutorial-btn {
                    background-color: #4A6FA5;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                }
                
                .tutorial-btn:hover {
                    background-color: #3A5A80;
                }
                
                .tutorial-btn:disabled {
                    background-color: #666666;
                    cursor: not-allowed;
                }
                
                .cell.tutorial-highlight {
                    animation: tutorial-pulse 2s infinite;
                }
                
                @keyframes tutorial-pulse {
                    0% { background-color: #665200; }
                    50% { background-color: #997700; }
                    100% { background-color: #665200; }
                }
                
                .tutorial-success {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .tutorial-complete-modal {
                    background-color: #1E1E1E;
                    border-radius: 8px;
                    padding: 25px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                }
                
                .tutorial-complete-title {
                    font-size: 1.5rem;
                    color: #4A6FA5;
                    margin-bottom: 15px;
                }
                
                .tutorial-complete-content {
                    margin-bottom: 20px;
                    font-size: 1.1rem;
                }
                
                .tutorial-complete-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                }
                
                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                /* Responsive styles */
                @media (max-width: 768px) {
                    .tutorial-panel {
                        padding: 10px;
                    }
                    
                    .tutorial-title {
                        font-size: 1rem;
                    }
                    
                    .tutorial-content {
                        font-size: 0.95rem;
                    }
                    
                    .tutorial-btn {
                        padding: 6px 12px;
                        font-size: 0.9rem;
                    }
                }
                
                /* Ensure tutorial view has fixed height */
                #game-screen.tutorial-mode {
                    height: auto;
                    max-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    padding-bottom: 0;
                    overflow: hidden;
                }
                
                #game-screen.tutorial-mode .board-container {
                    flex: 0 0 auto;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    /**
     * Start the tutorial
     */
    startTutorial() {
        this.isActive = true;
        this.currentStepIndex = 0;
        
        // Set up UI
        this.createUIElements();
        
        // Force current player to white for tutorial
        this.game.currentPlayer = 'white';
        
        // Hide ALL menu screens
        const menuScreens = [
            'main-menu',
            'menu-screen',
            'standard-setup',
            'tournament-screen',
            'tournament-complete-screen',
            'tournament-settings'
        ];
        
        // Hide all menu screens
        menuScreens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.classList.add('hidden');
        });
        
        // Disable undo/redo in tutorial mode
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.classList.add('hidden');
        if (redoBtn) redoBtn.classList.add('hidden');
        
        // Hide game controls to prevent scrollbar
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) gameControls.classList.add('hidden');
        
        // Hide game status area
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) gameStatus.classList.add('hidden');
        
        // Add tutorial mode class to game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.classList.add('tutorial-mode');
            gameScreen.classList.remove('hidden');
        }
        
        // Set up the first step
        this.setupCurrentStep();
        
        // Add event listeners for tracking player actions
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for the tutorial
     */
    setupEventListeners() {
        // Store the original token select handler
        this.originalHandlers.cellClick = this.game.ui.handleCellClick;
        
        // Override the cell click handler for tutorial
        this.game.ui.handleCellClick = (row, col) => {
            if (!this.isActive) return this.originalHandlers.cellClick.call(this.game.ui, row, col);
            
            // Process tutorial logic first
            const token = this.game.board.getTokenAt(row, col);
            const currentStep = this.steps[this.currentStepIndex];
            
            // If a token is already selected and clicking on a destination
            if (this.game.ui.selectedTokenPos) {
                // Let the original handler execute the move as normal
                this.originalHandlers.cellClick.call(this.game.ui, row, col);
                return;
            }
            
            // If clicking on a token to select it
            if (token && token.color === this.game.currentPlayer && token.isActive && !token.isCaptured) {
                if (currentStep.onTokenSelected && currentStep.onTokenSelected({row, col})) {
                    // Call the UI's selectToken directly to ensure highlights are shown
                    this.game.ui.selectToken(row, col);
                    
                    // Update instructions if needed
                    if (currentStep.secondaryInstructions) {
                        this.updateInstructions(currentStep.secondaryInstructions);
                    }
                } else {
                    // Show hint if wrong token
                    this.showHint();
                }
            } else {
                // For other cells, call the original handler
                this.originalHandlers.cellClick.call(this.game.ui, row, col);
            }
        };
        
        // Store the original executeMove handler
        this.originalHandlers.executeMove = this.game.moveManager.executeMove;
        
        // Override the executeMove method to track move completion
        this.game.moveManager.executeMove = (move, currentPlayer, skipRendering) => {
            // Call original method to execute the move
            const capturedTokens = this.originalHandlers.executeMove.call(
                this.game.moveManager, move, currentPlayer, skipRendering
            );
            
            // Track move completion for tutorial progress
            if (this.isActive) {
                this.handleMoveCompleted(move, capturedTokens);
            }
            
            return capturedTokens;
        };
    }
    
    /**
     * Reset event listeners to original state
     */
    resetEventListeners() {
        // Restore original handlers
        if (this.originalHandlers.cellClick) {
            this.game.ui.handleCellClick = this.originalHandlers.cellClick;
            this.originalHandlers.cellClick = null;
        }
        
        if (this.originalHandlers.executeMove) {
            this.game.moveManager.executeMove = this.originalHandlers.executeMove;
            this.originalHandlers.executeMove = null;
        }
    }
    
    /**
     * Handle move completion event
     */
    handleMoveCompleted(move, capturedTokens) {
        const currentStep = this.steps[this.currentStepIndex];
        
        // Check if this move completes the current step
        if (currentStep.isCompleted && currentStep.isCompleted(move, capturedTokens)) {
            // Step completed, enable next button
            if (this.nextButton) {
                this.nextButton.disabled = false;
            }
            
            // Show success message
            this.updateInstructions(`<span class="tutorial-success">✓ ${currentStep.successMessage}</span>`);
            
            // Check if the step has a custom completion handler
            if (currentStep.onStepCompleted) {
                const shouldAdvance = currentStep.onStepCompleted();
                if (shouldAdvance) {
                    // Auto-advance after a delay
                    setTimeout(() => this.nextStep(), 2000);
                }
            } else {
                // Auto-advance after a delay
                setTimeout(() => this.nextStep(), 2000);
            }
        }
    }
    
    /**
     * Setup the current tutorial step
     */
    setupCurrentStep() {
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep) return;
        
        // Update UI
        document.getElementById('tutorial-step-number').textContent = this.currentStepIndex + 1;
        document.getElementById('tutorial-title').textContent = currentStep.title;
        document.getElementById('tutorial-instructions').textContent = currentStep.instructions;
        
        // Disable next button until step is completed
        if (this.nextButton) {
            this.nextButton.disabled = true;
        }
        
        // Set up the board for this step
        if (currentStep.setupBoard) {
            currentStep.setupBoard(this.game.board);
        }
        
        // Add highlights
        this.clearHighlights();
        if (currentStep.highlightPositions) {
            this.highlightPositions(currentStep.highlightPositions);
        }
        
        // Force current player to white for all tutorial steps
        this.game.currentPlayer = 'white';
        
        // Clear any previous selection
        if (this.game.ui.selectedTokenPos) {
            this.game.ui.clearSelection();
        }
    }
    
    /**
     * Update the instruction text
     */
    updateInstructions(text) {
        const instructionsElement = document.getElementById('tutorial-instructions');
        if (instructionsElement) {
            instructionsElement.innerHTML = text;
        }
    }
    
    /**
     * Show hint to guide the player
     */
    showHint() {
        const currentStep = this.steps[this.currentStepIndex];
        
        // Enhance highlighting effect
        this.clearHighlights();
        if (currentStep.highlightPositions) {
            this.highlightPositions(currentStep.highlightPositions, true);
        }
        
        // Flash the instruction text
        const instructionsElement = document.getElementById('tutorial-instructions');
        if (instructionsElement) {
            instructionsElement.style.animation = 'none';
            // Trigger reflow
            void instructionsElement.offsetWidth;
            instructionsElement.style.animation = 'flash 1s';
        }
    }
    
    /**
     * Clear all highlights
     */
    clearHighlights() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('tutorial-highlight');
            cell.classList.remove('highlight'); // Regular game highlight
            cell.classList.remove('valid-drop-target'); // Drag-and-drop highlight
            cell.style.animation = ''; // Clear any animation
        });
    }
    
    /**
     * Highlight specific positions
     */
    highlightPositions(positions, isHint = false) {
        positions.forEach(pos => {
            const cell = document.querySelector(`.cell[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (cell) {
                cell.classList.add('tutorial-highlight');
                
                // Add extra effect for hints
                if (isHint) {
                    cell.style.animation = 'none';
                    // Trigger reflow
                    void cell.offsetWidth;
                    cell.style.animation = 'tutorial-pulse 1s infinite';
                }
            }
        });
    }
    
    /**
     * Show success message for the current step
     */
    showStepSuccess() {
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep) return;
        
        // Enable next button
        if (this.nextButton) {
            this.nextButton.disabled = false;
        }
        
        // Show success message
        this.updateInstructions(`<span class="tutorial-success">✓ ${currentStep.successMessage}</span>`);
        
        // Auto-advance after a delay if not the last step
        if (this.currentStepIndex < this.steps.length - 1) {
            setTimeout(() => this.nextStep(), 2000);
        }
    }
    
    /**
     * Advance to the next tutorial step
     */
    nextStep() {
        this.currentStepIndex++;
        
        // Check if tutorial is complete
        if (this.currentStepIndex >= this.steps.length) {
            this.showTutorialComplete();
            return;
        }
        
        // Set up the next step
        this.setupCurrentStep();
    }
    
    /**
     * Show tutorial completion screen
     */
    showTutorialComplete() {
        // Hide the instruction panel
        if (this.instructionPanel) {
            this.instructionPanel.classList.add('hidden');
        }
        
        // Create the completion modal
        const modal = document.createElement('div');
        modal.id = 'tutorial-complete-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="tutorial-complete-modal">
                <div class="tutorial-complete-title">Tutorial Complete!</div>
                <div class="tutorial-complete-content">
                    <p>Congratulations! You've completed the tutorial and learned how to play Pressure.</p>
                    <p>You now know about:</p>
                    <ul style="text-align: left; margin-left: 30px;">
                        <li>Moving tokens</li>
                        <li>Turn alternation</li>
                        <li>Pushing tokens</li>
                        <li>Inactivity after being pushed</li>
                        <li>Capturing tokens</li>
                        <li>Using edges for strategic captures</li>
                        <li>Victory conditions</li>
                    </ul>
                    <p>You're ready to play the full game!</p>
                </div>
                <div class="tutorial-complete-buttons">
                    <button id="tutorial-play-btn" class="tutorial-btn">Play Game</button>
                    <button id="tutorial-menu-btn" class="tutorial-btn">Main Menu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const playBtn = document.getElementById('tutorial-play-btn');
        const menuBtn = document.getElementById('tutorial-menu-btn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                modal.remove();
                this.exitTutorial(true); // Exit and start a new game
            });
        }
        
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                modal.remove();
                this.exitTutorial(false); // Just exit to main menu
            });
        }
    }
    
    /**
     * Exit the tutorial
     */
    exitTutorial(startGame = false) {
        // Reset flag
        this.isActive = false;
        
        // IMPROVED CLEANUP: Clear all highlight classes and animations
        this.clearHighlights();
        
        // IMPROVED CLEANUP: Clear any selection that might be active
        if (this.game.ui && this.game.ui.selectedTokenPos) {
            this.game.ui.clearSelection();
        }
        
        // IMPROVED CLEANUP: Reset the board appearance
        this.game.board.renderBoard();
        
        // Reset event listeners
        this.resetEventListeners();
        
        // Remove UI elements
        if (this.instructionPanel) {
            this.instructionPanel.remove();
            this.instructionPanel = null;
        }
        
        // Remove completion modal if it exists
        const completeModal = document.getElementById('tutorial-complete-modal');
        if (completeModal) {
            completeModal.remove();
        }
        
        // IMPROVED CLEANUP: Clear all tutorial-specific UI state
        document.querySelectorAll('.cell').forEach(cell => {
            // Remove all possible highlight/animation classes
            cell.classList.remove('tutorial-highlight');
            cell.classList.remove('highlight');
            cell.classList.remove('valid-drop-target');
            cell.style.animation = '';
            
            // Force all other inline styles to be cleared
            cell.removeAttribute('style');
        });
        
        // Show game controls again
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) gameControls.classList.remove('hidden');
        
        // Show game status area
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) gameStatus.classList.remove('hidden');
        
        // Remove tutorial mode class from game screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) gameScreen.classList.remove('tutorial-mode');
        
        // Enable undo/redo buttons
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.classList.remove('hidden');
        if (redoBtn) redoBtn.classList.remove('hidden');
        
        if (startGame) {
            // Start a new standard game
            const gameScreen = document.getElementById('game-screen');
            const standardSetup = document.getElementById('standard-setup');
            
            if (gameScreen) gameScreen.classList.add('hidden');
            if (standardSetup) {
                standardSetup.classList.remove('hidden');
                // Trigger the start game button
                const startGameBtn = document.getElementById('standard-start-game-btn');
                if (startGameBtn) {
                    startGameBtn.click();
                }
            }
        } else {
            // Return to main menu
            const gameScreen = document.getElementById('game-screen');
            const mainMenu = document.getElementById('main-menu');
            
            if (gameScreen) gameScreen.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    }
}

// Start tutorial directly
function startTutorial() {
    // Show the game screen
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        gameScreen.classList.remove('hidden');
    }
    
    // Hide ALL menu screens
    const menuScreens = [
        'main-menu',
        'menu-screen',
        'standard-setup',
        'tournament-screen',
        'tournament-complete-screen',
        'tournament-settings'
    ];
    
    // Hide all menu screens
    menuScreens.forEach(screenId => {
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('hidden');
    });
    
    // Create tutorial service if it doesn't exist
    if (!window.tutorialService) {
        window.tutorialService = new TutorialService(window.game);
    }
    
    // Start the tutorial
    window.tutorialService.startTutorial();
}

// Function to be exposed globally
window.startTutorial = startTutorial;
