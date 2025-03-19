/**
 * tutorial-service.js
 * Core Tutorial Service - Manages the tutorial lifecycle and coordinates components
 */
class TutorialService {
    constructor(game) {
        this.game = game;
        this.events = game.events || window.gameEvents;
        this.board = game.board;
        this.ui = game.ui;
        
        // Tutorial state
        this.isActive = false;
        this.currentStepIndex = 0;
        this.state = 'INACTIVE';
        
        // Original game state for restoration
        this.originalGameState = null;
        
        // Original functions to override
        this.originalCheckWinConditions = null;
        this.originalShowWinModal = null;
        this.originalClearSelection = null;
        this.originalEndGame = null;
        this.originalGameOverHandler = null;
        this.originalUpdateStatus = null;
        this.originalGameStatusDisplay = null;
        this.originalExecuteMove = null;
        
        // Load components
        this.uiManager = new TutorialUIManager(this);
        this.stepManager = new TutorialStepManager(this);
        this.eventHandler = new TutorialEventHandler(this);
    }
    
    /**
     * Start the tutorial
     */
    start() {
        console.log("Starting tutorial...");
        
        // Save original game state
        this.saveGameState();
        
        // Save original functions
        this.saveOriginalFunctions();
        
        // Override key game functions
        this.overrideGameFunctions();
        
        // Initialize tutorial state
        this.isActive = true;
        this.currentStepIndex = 0;
        this.state = 'STARTING';
        
        // Thoroughly clear all existing board state
        this.clearAllBoardState();
        
        // Hide game screens, show game board
        this.uiManager.showGameScreen();
        
        // Setup board and UI
        this.uiManager.setupTutorialUI();
        
        // Set up event handlers
        this.eventHandler.setupEventListeners();
        
        // Load the first step
        this.loadStep(0);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:started', {
                step: 1,
                totalSteps: this.stepManager.getTotalSteps(),
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * End the tutorial
     */
    end() {
        if (!this.isActive) return;
        
        console.log("Ending tutorial...");
        
        // Update state
        this.isActive = false;
        this.state = 'INACTIVE';
        
        // Clean up
        this.eventHandler.removeEventListeners();
        this.uiManager.cleanupTutorialUI();
        this.board.clearHighlights();
        
        // Restore original functions
        this.restoreOriginalFunctions();
        
        // Restore game state
        this.restoreGameState();
        
        // Show main menu
        this.uiManager.showMainMenu();
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:ended', {
                completed: false,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Save original game functions before overriding
     */
    saveOriginalFunctions() {
        // Save win conditions check
        if (this.game.checkWinConditions) {
            this.originalCheckWinConditions = this.game.checkWinConditions;
        }
        
        // Save show win modal
        if (this.game.ui && this.game.ui.showWinModal) {
            this.originalShowWinModal = this.game.ui.showWinModal;
        }
        
        // Save end game function
        if (this.game.endGame) {
            this.originalEndGame = this.game.endGame;
        }
        
        // Save clear selection
        if (this.game.ui && this.game.ui.clearSelection) {
            this.originalClearSelection = this.game.ui.clearSelection;
        }
        
        // Save update status function
        if (this.game.ui && this.game.ui.updateStatus) {
            this.originalUpdateStatus = this.game.ui.updateStatus;
        }
        
        // Save executeMove function - store it as a class property
        if (this.game.ui && this.game.ui.executeMove) {
            this.originalExecuteMove = this.game.ui.executeMove;
        }
        
        // No need to save game over handlers - we'll do that during override
        this.originalGameOverHandler = null;
        this.originalGameStatusDisplay = 'block'; // Default display value
    }
    
    /**
     * Override key game functions for tutorial mode
     */
    overrideGameFunctions() {
        // Override win conditions check to prevent win modal
        this.game.checkWinConditions = () => false;
        
        // Override show win modal
        if (this.game.ui) {
            this.game.ui.showWinModal = () => {};
        }
        
        // Override end game function to prevent triggering win conditions
        if (this.game.endGame) {
            this.game.endGame = () => {};
        }
        
        // Make sure we disable the global gameOver event handling
        if (this.events && this.events.listeners) {
            this.originalGameOverHandler = {};
            if (this.events.listeners['game:over']) {
                this.originalGameOverHandler['game:over'] = [...this.events.listeners['game:over']];
                this.events.listeners['game:over'] = [];
            }
        }
        
        // Ensure the game stays active throughout the tutorial
        this.game.isGameActive = true;
        
        // Override executeMove to handle incorrect moves
        if (this.game.ui && this.originalExecuteMove) {  // Check both conditions
            this.game.ui.executeMove = (move) => {
                // If tutorial not active, use original behavior
                if (!this.isActive) {
                    return this.originalExecuteMove.call(this.game.ui, move);
                }
                
                // If not in the correct state, use original behavior
                if (this.state !== 'WAITING_FOR_ACTION') {
                    return this.originalExecuteMove.call(this.game.ui, move);
                }
                
                // If the step manager is retrying or a move has already been performed, block all moves
                if (this.stepManager.isRetrying || this.stepManager.movePerformed) {
                    return;
                }
                
                // Get current step and expected action
                const step = this.stepManager.getStep(this.currentStepIndex);
                if (!step) {
                    return this.originalExecuteMove.call(this.game.ui, move);
                }
                
                const expectedActionIndex = this.stepManager.expectedActionIndex;
                if (expectedActionIndex >= step.expectedActions.length) {
                    return this.originalExecuteMove.call(this.game.ui, move);
                }
                
                const expectedAction = step.expectedActions[expectedActionIndex];
                
                // Only validate if we're expecting a move
                if (expectedAction.type === 'move') {
                    let isValidMove = true;
                    
                    // Steps 1 and 2 - any move is okay
                    if (this.currentStepIndex <= 1) {
                        isValidMove = true;
                    } 
                    // More specific validation for steps 3+
                    else if (expectedAction.validateMove) {
                        isValidMove = expectedAction.validateMove(move);
                    } else if (expectedAction.validDestinations) {
                        isValidMove = expectedAction.validDestinations.some(pos => 
                            move.to.row === pos.row && move.to.col === pos.col
                        );
                    }
                    
                    // Execute the move regardless of validity
                    this.originalExecuteMove.call(this.game.ui, move);
                    
                    // Clear highlights after any move
                    this.uiManager.clearHighlights();
                    
                    // Mark that a move has been performed
                    this.stepManager.movePerformed = true;
                    
                    if (!isValidMove) {
                        // Show error and Try Again button
                        const errorMessage = expectedAction.errorMessage || 
                                          `Incorrect move. ${step.instructions}`;
                        
                        this.uiManager.showInstructions(
                            step.title,
                            errorMessage,
                            this.currentStepIndex + 1,
                            this.stepManager.getTotalSteps()
                        );
                        
                        this.uiManager.showTryAgainButton();
                        this.stepManager.isRetrying = true;
                        return;
                    }
                    
                    // Valid move - proceed with the tutorial
                    if (expectedAction.nextInstructions) {
                        this.uiManager.showInstructions(
                            step.title,
                            expectedAction.nextInstructions,
                            this.currentStepIndex + 1,
                            this.stepManager.getTotalSteps()
                        );
                    }
                    
                    // Execute any after-completion logic
                    if (expectedAction.onComplete) {
                        expectedAction.onComplete(this);
                    }
                    
                    // If this completes the step, show continue button
                    if (expectedAction.completesStep) {
                        this.uiManager.showContinueButton();
                    }
                    
                    return;
                }
                
                // If not handling a move action, use original behavior
                this.originalExecuteMove.call(this.game.ui, move);
            };
        }
        
        // Override clear selection to maintain token selection during tutorial
        if (this.game.ui) {
            const originalClearSelection = this.game.ui.clearSelection;
            this.game.ui.clearSelection = () => {
                // Only run clear selection if we're not in the middle of a tutorial step
                // that requires keeping selection active
                if (!this.isActive || !this.isInSelectionMoveSequence()) {
                    originalClearSelection.call(this.game.ui);
                }
            };
            
            // Override updateStatus to prevent game status messages during tutorial
            if (this.game.ui.updateStatus) {
                this.originalUpdateStatus = this.game.ui.updateStatus;
                this.game.ui.updateStatus = () => {};
            }
        }
        
        // Force hide the win modal if it's visible
        const winModal = document.getElementById('win-modal');
        if (winModal) {
            winModal.classList.add('hidden');
        }
        
        // Hide status text area during tutorial 
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.style.display = 'none';
        }
        
        // Also hide game status container
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            this.originalGameStatusDisplay = gameStatus.style.display;
            gameStatus.style.display = 'none';
        }
    }
    
    /**
     * Restore original game functions
     */
    restoreOriginalFunctions() {
        // Restore win conditions check
        if (this.originalCheckWinConditions) {
            this.game.checkWinConditions = this.originalCheckWinConditions;
            this.originalCheckWinConditions = null;
        }
        
        // Restore show win modal
        if (this.originalShowWinModal && this.game.ui) {
            this.game.ui.showWinModal = this.originalShowWinModal;
            this.originalShowWinModal = null;
        }
        
        // Restore end game function
        if (this.originalEndGame) {
            this.game.endGame = this.originalEndGame;
            this.originalEndGame = null;
        }
        
        // Restore game over event handlers
        if (this.events && this.originalGameOverHandler) {
            if (!this.events.listeners) this.events.listeners = {};
            
            Object.keys(this.originalGameOverHandler).forEach(eventName => {
                this.events.listeners[eventName] = this.originalGameOverHandler[eventName];
            });
            this.originalGameOverHandler = null;
        }
        
        // Restore clear selection
        if (this.originalClearSelection && this.game.ui) {
            this.game.ui.clearSelection = this.originalClearSelection;
            this.originalClearSelection = null;
        }
        
        // Restore update status
        if (this.originalUpdateStatus && this.game.ui) {
            this.game.ui.updateStatus = this.originalUpdateStatus;
            this.originalUpdateStatus = null;
        }
        
        // Restore executeMove
        if (this.originalExecuteMove && this.game.ui) {
            this.game.ui.executeMove = this.originalExecuteMove;
            this.originalExecuteMove = null;
        }
        
        // Restore status text visibility
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.style.display = '';
        }
        
        // Restore game status container visibility
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            gameStatus.style.display = this.originalGameStatusDisplay || '';
            this.originalGameStatusDisplay = null;
        }
    }
    
    /**
     * Check if we're in the middle of a selection-move sequence
     */
    isInSelectionMoveSequence() {
        if (!this.isActive) return false;
        
        const step = this.stepManager.getStep(this.currentStepIndex);
        if (!step) return false;
        
        const expectedActionIndex = this.stepManager.expectedActionIndex;
        if (expectedActionIndex >= step.expectedActions.length) return false;
        
        const currentAction = step.expectedActions[expectedActionIndex];
        
        // If we've just completed a selection and are now expecting a move,
        // we're in a selection-move sequence
        return currentAction.type === 'move' && 
               expectedActionIndex > 0 && 
               step.expectedActions[expectedActionIndex - 1].type === 'select';
    }
    
    /**
     * Clear all board state thoroughly
     */
    clearAllBoardState() {
        // Clear board highlights
        this.board.clearHighlights();
        
        // Reset last move indicators - IMPORTANT for preventing yellow highlights
        this.board.lastMoveFrom = null;
        this.board.lastMoveTo = null;
        this.board.lastCapturedTokens = [];
        
        // Clear any selection
        if (this.game.ui && this.originalClearSelection) {
            this.originalClearSelection.call(this.game.ui);
        }
        
        // Remove all highlighting classes from cells
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('highlight', 'valid-drop-target', 'tutorial-highlight');
            // Also remove any last-move indicators that might persist
            const moveIndicator = cell.querySelector('.last-move-indicator');
            if (moveIndicator && moveIndicator.parentNode) {
                moveIndicator.parentNode.removeChild(moveIndicator);
            }
        });
        
        // Remove special classes from tokens
        document.querySelectorAll('.token').forEach(token => {
            token.classList.remove('dragging', 'tutorial-active', 'tutorial-inactive-highlight');
        });
        
        // Hide win modal if visible
        const winModal = document.getElementById('win-modal');
        if (winModal) {
            winModal.classList.add('hidden');
        }
        
        // Force a board re-render
        this.board.renderBoard();
    }
    
    /**
     * Load a specific tutorial step
     */
    loadStep(stepIndex) {
        console.log(`Loading tutorial step ${stepIndex + 1}`);
        
        const totalSteps = this.stepManager.getTotalSteps();
        
        if (stepIndex >= totalSteps) {
            this.showTutorialComplete();
            return;
        }
        
        // Update state
        this.currentStepIndex = stepIndex;
        this.state = 'WAITING_FOR_ACTION';
        
        // Reset expected action index
        this.stepManager.resetExpectedAction();
        
        // Get step definition
        const step = this.stepManager.getStep(stepIndex);
        
        // Thoroughly clean the board state before setting up a new step
        this.clearAllBoardState();
        
        // Setup board for this step
        this.setupBoardForStep(step);
        
        // Update UI with step instructions
        this.uiManager.showInstructions(step.title, step.instructions, stepIndex + 1, totalSteps);
        this.uiManager.hideContinueButton();
        
        // Apply initial highlights
        this.applyHighlights(step.initialHighlights);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:stepLoaded', {
                step: stepIndex + 1,
                totalSteps: totalSteps,
                title: step.title,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Setup the board for a specific step
     */
    setupBoardForStep(step) {
        // Clear the board
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                this.board.setTokenAt(row, col, null);
            }
        }
        
        // Place tokens according to the step setup
        if (step.boardSetup) {
            step.boardSetup.forEach(token => {
                this.board.setTokenAt(token.row, token.col, {
                    color: token.color,
                    isActive: token.isActive !== false,
                    isCaptured: token.isCaptured === true
                });
            });
        }
        
        // Reset game state
        this.game.isGameActive = true;
        this.game.currentPlayer = 'white';
        this.game.blackPlayerType = 'ai';
        this.game.whitePlayerType = 'human';
        this.game.winner = null;
        this.game.winReason = '';
        
        // Ensure the win modal is hidden
        const winModal = document.getElementById('win-modal');
        if (winModal) {
            winModal.classList.add('hidden');
        }
        
        // Clear any game status messages referring to wins
        const statusText = document.getElementById('status-text');
        if (statusText && statusText.textContent.toLowerCase().includes('win')) {
            statusText.textContent = 'White turn. Follow the tutorial instructions.';
        }
        
        // Render the board
        this.board.renderBoard();
        
        // Update game status
        if (this.game.ui) {
            this.game.ui.updateStatus("White turn. Follow the tutorial instructions.");
        }
    }
    
    /**
     * Apply highlights to positions
     */
    applyHighlights(positions) {
        if (!positions || positions.length === 0) return;
        
        // Clear existing highlights
        this.uiManager.clearHighlights();
        
        // Apply new highlights
        this.uiManager.highlightPositions(positions);
    }
    
    /**
     * Advance to the next step
     */
    advanceToNextStep() {
        // Clear any highlights
        this.uiManager.clearHighlights();
        
        // Load the next step
        const nextStepIndex = this.currentStepIndex + 1;
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:stepCompleted', {
                step: this.currentStepIndex + 1,
                nextStep: nextStepIndex + 1,
                totalSteps: this.stepManager.getTotalSteps(),
                timestamp: Date.now()
            });
        }
        
        this.loadStep(nextStepIndex);
    }
    
    /**
     * Show tutorial completion screen
     */
    showTutorialComplete() {
        console.log("Tutorial complete!");
        
        // Update state
        this.state = 'COMPLETED';
        
        // Clear highlights
        this.uiManager.clearHighlights();
        
        // Show completion message
        this.uiManager.showCompletionMessage();
        
        // Automatically return to main menu after a delay
        setTimeout(() => {
            this.end();
            this.uiManager.showMainMenu();
            
            // Emit event
            if (this.events) {
                this.events.emit('tutorial:completedAndReturned', {
                    timestamp: Date.now()
                });
            }
        }, 5000);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:completed', {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Save the current game state
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
     * Restore the original game state
     */
    restoreGameState() {
        if (!this.originalGameState) return;
        
        // Restore game properties
        this.game.isGameActive = this.originalGameState.isGameActive;
        this.game.currentPlayer = this.originalGameState.currentPlayer;
        this.game.blackPlayerType = this.originalGameState.blackPlayerType;
        this.game.whitePlayerType = this.originalGameState.whitePlayerType;
        this.game.isTournamentMode = this.originalGameState.isTournamentMode;
        
        // Restore board state
        if (this.originalGameState.grid) {
            this.board.restoreFromCopy(this.originalGameState.grid);
        }
        
        // Thoroughly clean up all tutorial UI elements and classes
        this.uiManager.cleanupTutorialUI();
        
        // Update UI
        this.board.renderBoard();
        if (this.game.ui) {
            this.game.ui.updateGameState();
        }
    }
    
    /**
     * Handle token selection
     */
    handleTokenSelected(data) {
        if (this.state !== 'WAITING_FOR_ACTION') return;
        
        this.stepManager.handleTokenSelected(data);
    }
    
    /**
     * Handle move execution
     */
    handleMoveExecuted(data) {
        if (this.state !== 'WAITING_FOR_ACTION') return;
        
        // The actual move handling is now done in the executeMove override
        // This method remains for event handling compatibility
    }
    
    /**
     * Handle token capture
     */
    handleTokenCaptured(data) {
        if (this.state !== 'WAITING_FOR_ACTION') return;
        
        this.stepManager.handleTokenCaptured(data);
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
    
    // Clean up any existing tutorial
    if (window.tutorialService && window.tutorialService.isActive) {
        window.tutorialService.end();
    }
    
    // Create new tutorial service
    window.tutorialService = new TutorialService(game);
    
    // Start the tutorial
    window.tutorialService.start();
}

// Make function globally available
window.startTutorial = startTutorial;