/**
 * Game class handles the game logic and flow
 */
class Game {
    constructor() {
        this.board = new Board();
        this.moveManager = new MoveManager(this.board);
        this.gameState = new GameState(this.board, this.moveManager);
        this.ai = new AIPlayer(this.board, this.moveManager, this.gameState);
        
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
        
        // FIXED: Add tournament mode flags
        this.isTournamentMode = false;
        this.currentOpponent = null;
        
        // Create UI manager after DOM is loaded
        this.ui = null;
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
        
        // FIXED: Update UI for undo/redo buttons based on tournament mode
        if (this.ui) {
            this.ui.updateUndoRedoButtons();
        }
        
        // If AI starts, make its move
        if (this.currentPlayer === 'white' && this.whitePlayerType === 'ai') {
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
        
        // Check for win conditions
        this.checkWinConditions(capturedTokens);
        
        // Switch turns if game is still active
        if (this.isGameActive) {
            this.switchTurn();
        }
    }

    /**
     * Undo the last move
     */
    undoMove() {
        // FIXED: Add check for tournament mode
        if (this.isTournamentMode || !this.gameState.canUndo() || this.isProcessingAIMove) return false;
        
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
            
            return true;
        }
        
        return false;
    }

    /**
     * Redo a previously undone move
     */
    redoMove() {
        // FIXED: Add check for tournament mode
        if (this.isTournamentMode || !this.gameState.canRedo() || this.isProcessingAIMove) return false;
        
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
                this.ui.showWinModal(this.winner, this.winReason);
            }
            
            // Update the UI
            if (this.ui) {
                this.ui.updateUndoRedoButtons();
                this.board.renderBoard(); // Ensure board is rendered with updated state
            }
            
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
        
        // Create a timer to ensure AI has a minimum thinking time for better UX
        // Even if calculation is instant, display thinking for at least 500ms
        const startTime = performance.now();
        const MIN_THINKING_TIME = 500; // ms
        
        // Define progress callback for AI to report status to UI
        const progressCallback = (progress) => {
            if (this.ui) {
                this.ui.handleAIProgress(progress);
            }
        };
        
        // Get best move from AI with progress updates
        const aiMove = this.ai.getBestMove(this.currentPlayer, progressCallback);
        
        // Calculate elapsed time and enforce minimum thinking time for UX
        const elapsedTime = performance.now() - startTime;
        const remainingTime = Math.max(0, MIN_THINKING_TIME - elapsedTime);
        
        // Execute move after minimum thinking time has elapsed
        setTimeout(() => {
            if (aiMove) {
                // Execute the move
                this.executePlayerMove(aiMove);
            } else {
                // No valid moves - game over
                this.endGame(this.getOppositeColor(this.currentPlayer), 'No valid moves available');
            }
            
            // Clear processing flag
            this.isProcessingAIMove = false;
            
            // Update game state in UI
            if (this.ui) {
                this.ui.updateGameState();
            }
        }, remainingTime);
    }

    /**
     * Switch to the next player's turn
     */
    switchTurn() {
        // Switch current player
        this.currentPlayer = this.getOppositeColor(this.currentPlayer);
        
        // At this point, we do NOT reset active status for all tokens
        // Inactive tokens should remain inactive for one turn
        
        // Check if the new current player has any valid moves
        const possibleMoves = this.moveManager.generatePossibleMoves(this.currentPlayer);
        if (possibleMoves.length === 0) {
            this.endGame(this.getOppositeColor(this.currentPlayer), 'No valid moves available');
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
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.initUI();
});