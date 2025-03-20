/**
 * Game class handles the game logic and flow
 * Refactored to use event-driven architecture
 */
class Game {
    constructor() {
        // Use the global event system or create a new one
        this.events = window.gameEvents || new EventSystem();
        
        // Initialize components
        this.board = new Board(this);
        this.moveManager = new MoveManager(this.board, this);
        this.gameState = new GameState(this.board, this.moveManager, this);
        this.ai = new AIPlayer(this.board, this.moveManager, this.gameState, this);
        
        // Game state
        this.isGameActive = false;
        this.currentPlayer = 'white'; // White moves first
        this.blackPlayerType = 'human';
        this.whitePlayerType = 'human';
        this.blackAILevel = 1;
        this.whiteAILevel = 1;
        this.winner = null;
        this.winReason = '';
        
        // AI move processing flag
        this.isProcessingAIMove = false;
        
        // Tournament mode flags
        this.isTournamentMode = false;
        this.currentOpponent = null;
        
        // Create UI manager after DOM is loaded
        this.ui = null;
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for game events
     */
    setupEventListeners() {
        // Listen for move execution to check win conditions
        this.events.on('move:executed', (data) => {
            // Check for win conditions
            this.checkWinConditions(data.capturedTokens);
            
            // Switch turns if game is still active
            if (this.isGameActive) {
                this.switchTurn();
            }
        });
        
        // Also listen for turn changes to trigger AI (redundant but safer)
        this.events.on('turn:changed', (data) => {
            if (data.isAI && this.isGameActive && !this.isProcessingAIMove) {
                setTimeout(() => this.executeAIMove(), 100);
            }
        });
        
        // Listen for tournament mode changes
        this.events.on('tournament:gameInitialized', (data) => {
            // Update tournament-specific settings if needed
            this.isTournamentMode = true;
            this.currentOpponent = data.opponent;
        });
        
        // Listen for tournament completion
        this.events.on('tournament:completed', () => {
            // Update game state for tournament completion
            this.isTournamentMode = true;
            this.tournamentCompleted = true;
        });
    }

    /**
     * Initialize the UI after DOM is loaded
     */
    initUI() {
        this.ui = new UIManager(this);
    }

    /**
     * Initialize a new game
     */
    initialize(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel) {
        this.isGameActive = true;
        this.currentPlayer = 'white'; // White moves first
        this.blackPlayerType = blackPlayerType;
        this.whitePlayerType = whitePlayerType;
        this.blackAILevel = blackAILevel;
        this.whiteAILevel = whiteAILevel;
        this.winner = null;
        this.winReason = '';
        this.isProcessingAIMove = false;
        
        // Clear move history
        this.gameState.clearHistory();
        
        // Set up the board
        this.board.setupInitialPosition();
        
        // Set AI strength
        this.ai.setStrength(this.currentPlayer === 'black' ? this.blackAILevel : this.whiteAILevel);
        
        // Update UI for undo/redo buttons based on tournament mode
        if (this.ui) {
            this.ui.updateUndoRedoButtons();
        }
        
        // Emit game:initialized event
        this.events.emit('game:initialized', {
            currentPlayer: this.currentPlayer,
            blackPlayerType: this.blackPlayerType,
            whitePlayerType: this.whitePlayerType,
            blackAILevel: this.blackAILevel,
            whiteAILevel: this.whiteAILevel
        });
        
        // Emit initial turn:changed event
        const isAITurn = (this.currentPlayer === 'white' && this.whitePlayerType === 'ai') ||
                         (this.currentPlayer === 'black' && this.blackPlayerType === 'ai');
        
        this.events.emit('turn:changed', {
            player: this.currentPlayer,
            isAI: isAITurn
        });
        
        // If AI starts, make its move directly (in addition to event)
        if (isAITurn) {
            setTimeout(() => this.executeAIMove(), 100);
        }
    }

    /**
     * Check if it's a human player's turn
     */
    isHumanTurn() {
        const playerType = this.currentPlayer === 'black' 
            ? this.blackPlayerType 
            : this.whitePlayerType;
        return playerType === 'human' && !this.isProcessingAIMove;
    }

	/**
	 * Execute a player's move
	 */
	executePlayerMove(move) {
		if (!this.isGameActive) return;
		
		// Execute the move using gameState with additional options
		// Reset active status only if this is the first action of a turn
		// Clear redo stack since we're making a new move
		const options = {
			resetActiveStatus: true, // Active tokens are reset at the start of each turn
			clearRedoStack: true,
			skipRendering: false,
			additionalState: {
				winner: this.winner,
				winReason: this.winReason,
				isGameActive: this.isGameActive
			}
		};
		
		const capturedTokens = this.gameState.applyMove(move, this.currentPlayer, options);
		
		// Update UI buttons
		if (this.ui) {
			this.ui.updateUndoRedoButtons();
		}
		
		// Emit move:executed event
		this.events.emit('move:executed', {
			move: move,
			player: this.currentPlayer,
			capturedTokens: capturedTokens,
			forAISimulation: false  // Mark as real user move
		});
	}
    /**
     * Undo the last move
     */
    undoMove() {
        // Don't allow undo in tournament mode
        if (this.isTournamentMode || !this.gameState.canUndo() || this.isProcessingAIMove) return false;
        
        // Emit undo:started event
        this.events.emit('undo:started', {
            currentPlayer: this.currentPlayer
        });
        
        // Use gameState to undo the move
        const result = this.gameState.undoLastMove({
            saveForRedo: true,
            currentPlayer: this.currentPlayer,
            additionalState: {
                winner: this.winner,
                winReason: this.winReason,
                isGameActive: this.isGameActive
            }
        });
        
        if (result.success) {
            // Restore game-specific state
            const state = result.state;
            this.currentPlayer = state.currentPlayer;
            
            if (state.additionalState) {
                this.winner = state.additionalState.winner;
                this.winReason = state.additionalState.winReason;
                this.isGameActive = state.additionalState.isGameActive;
            }
            
            // Hide win modal if it's showing and game is now active again
            if (this.isGameActive) {
                const winModal = document.getElementById('win-modal');
                if (winModal) {
                    winModal.classList.add('hidden');
                }
            }
            
            // Update the UI
            if (this.ui) {
                this.ui.updateUndoRedoButtons();
                this.board.renderBoard(); // Ensure board is rendered with updated state
            }
            
            // Emit undo:completed event
            this.events.emit('undo:completed', {
                currentPlayer: this.currentPlayer,
                isGameActive: this.isGameActive
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * Redo a previously undone move
     */
    redoMove() {
        // Don't allow redo in tournament mode
        if (this.isTournamentMode || !this.gameState.canRedo() || this.isProcessingAIMove) return false;
        
        // Emit redo:started event
        this.events.emit('redo:started', {
            currentPlayer: this.currentPlayer
        });
        
        // Use gameState to redo the move
        const result = this.gameState.redoMove({
            saveForUndo: true,
            currentPlayer: this.currentPlayer,
            additionalState: {
                winner: this.winner,
                winReason: this.winReason,
                isGameActive: this.isGameActive
            }
        });
        
        if (result.success) {
            // Restore game-specific state
            const state = result.state;
            this.currentPlayer = state.currentPlayer;
            
            if (state.additionalState) {
                this.winner = state.additionalState.winner;
                this.winReason = state.additionalState.winReason;
                this.isGameActive = state.additionalState.isGameActive;
            }
            
            // Show win modal if game is not active and there is a winner
            if (!this.isGameActive && this.winner && this.ui) {
                // Check for tournament mode before showing win modal
                if (!this.isTournamentMode) {
                    this.ui.showWinModal(this.winner, this.winReason);
                }
            }
            
            // Update the UI
            if (this.ui) {
                this.ui.updateUndoRedoButtons();
                this.board.renderBoard(); // Ensure board is rendered with updated state
            }
            
            // Emit redo:completed event
            this.events.emit('redo:completed', {
                currentPlayer: this.currentPlayer,
                isGameActive: this.isGameActive
            });
            
            return true;
        }
        
        return false;
    }

	/**
	 * Execute an AI move with proper coordination between AI and UI
	 */
	executeAIMove() {
		if (!this.isGameActive || this.isHumanTurn() || this.isProcessingAIMove) return;
		
		// Set flag to prevent multiple AI moves from being processed simultaneously
		this.isProcessingAIMove = true;
		
		// Set AI strength based on current player
		const aiLevel = this.currentPlayer === 'black' ? this.blackAILevel : this.whiteAILevel;
		this.ai.setStrength(aiLevel);
		
		// Emit ai:thinking event
		this.events.emit('ai:thinking', {
			player: this.currentPlayer,
			level: aiLevel
		});
		
		// Create a timer to ensure AI has a minimum thinking time for better UX
		// Even if calculation is instant, display thinking for at least 500ms
		const startTime = performance.now();
		const MIN_THINKING_TIME = 500; // ms
		
		// Define progress callback for AI to report status to UI
		const progressCallback = (progress) => {
			this.events.emit('ai:progress', progress);
		};
		
		// Get best move from AI with progress updates
		const aiMove = this.ai.getBestMove(this.currentPlayer, progressCallback);
		
		// Calculate elapsed time and enforce minimum thinking time for UX
		const elapsedTime = performance.now() - startTime;
		const remainingTime = Math.max(0, MIN_THINKING_TIME - elapsedTime);
		
		// Emit ai:moveSelected event
		this.events.emit('ai:moveSelected', {
			move: aiMove,
			player: this.currentPlayer
		});
		
		// Execute move after minimum thinking time has elapsed
		setTimeout(() => {
			if (aiMove) {
				// For a real AI move, we want to use MoveManager's executeMove with AI flags
				// This requires additional processing to make sure the flags pass through properly
				
				// First, create options for the GameState applyMove method
				const options = {
					resetActiveStatus: true,
					clearRedoStack: true,
					skipRendering: false,
					isActualAIMove: true,  // Flag to indicate this is the actual AI move
					additionalState: {
						winner: this.winner,
						winReason: this.winReason,
						isGameActive: this.isGameActive
					}
				};
				
				// Execute the move directly using GameState to include our special flag
				const capturedTokens = this.gameState.applyMove(aiMove, this.currentPlayer, options);
				
				// Update UI buttons
				if (this.ui) {
					this.ui.updateUndoRedoButtons();
				}
				
				// Emit move:executed event with special flag
				this.events.emit('move:executed', {
					move: aiMove,
					player: this.currentPlayer,
					capturedTokens: capturedTokens,
					forAISimulation: false,    // Not a simulation
					isActualAIMove: true       // Flag to indicate this is the actual AI move
				});
			} else {
				// No valid moves - game over
				this.endGame(this.getOppositeColor(this.currentPlayer), 'No valid moves available');
			}
			
			// Clear processing flag
			this.isProcessingAIMove = false;
			
			// Emit ai:moveExecuted event
			this.events.emit('ai:moveExecuted', {
				player: this.currentPlayer
			});
		}, remainingTime);
	}

    /**
     * Switch to the next player's turn
     */
    switchTurn() {
        // Switch current player
        this.currentPlayer = this.getOppositeColor(this.currentPlayer);
        
        // Check if the new current player has any valid moves
        const possibleMoves = this.moveManager.generatePossibleMoves(this.currentPlayer);
        if (possibleMoves.length === 0) {
            this.endGame(this.getOppositeColor(this.currentPlayer), 'No valid moves available');
            return;
        }
        
        // Determine if it's AI's turn
        const isAITurn = (this.currentPlayer === 'black' && this.blackPlayerType === 'ai') || 
                        (this.currentPlayer === 'white' && this.whitePlayerType === 'ai');
        
        // Emit turn:changed event
        this.events.emit('turn:changed', {
            player: this.currentPlayer,
            isAI: isAITurn
        });
        
        // Directly trigger AI move if needed (in addition to event)
        if (isAITurn && this.isGameActive && !this.isProcessingAIMove) {
            setTimeout(() => this.executeAIMove(), 100);
        }
    }

    /**
     * Get the opposite color
     */
    getOppositeColor(color) {
        return color === 'black' ? 'white' : 'black';
    }

    /**
     * Check for win conditions
     */
    checkWinConditions(capturedTokens) {
        // Check for all captured opponent tokens
        const capturedCounts = this.board.countCapturedTokens();
        const oppositeColor = this.getOppositeColor(this.currentPlayer);
        
        if (capturedCounts[oppositeColor] >= 6) {
            this.endGame(this.currentPlayer, 'All opponent tokens captured');
            return true;
        }
        
        return false;
    }

    /**
     * End the game with a winner
     */
    endGame(winner, reason) {
        this.isGameActive = false;
        this.winner = winner;
        this.winReason = reason;
        
        // Emit game:over event
        this.events.emit('game:over', {
            winner: winner,
            reason: reason
        });
    }
    
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.initUI();
});