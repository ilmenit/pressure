/**
 * Game class handles the game logic and flow
 */
class Game {
    constructor() {
        this.board = new Board();
        this.moveManager = new MoveManager(this.board);
        this.ai = new AIPlayer(this.board, this.moveManager);
        
        this.isGameActive = false;
        this.currentPlayer = 'white'; // White moves first
        this.blackPlayerType = 'human';
        this.whitePlayerType = 'human';
        this.blackAILevel = 1;
        this.whiteAILevel = 1;
        this.winner = null;
        this.winReason = '';
        
        // Move history for undo/redo
        this.moveHistory = [];
        this.redoStack = [];
        
        // AI move processing flag
        this.isProcessingAIMove = false;
        
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
        this.moveHistory = [];
        this.redoStack = [];
        
        // Set up the board
        this.board.setupInitialPosition();
        
        // Set AI strength
        this.ai.setStrength(this.currentPlayer === 'black' ? this.blackAILevel : this.whiteAILevel);
        
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
        
        // Save the current state for undo
        this.saveStateForUndo();
        
        // Clear the redo stack when a new move is made
        this.redoStack = [];
        this.ui.updateUndoRedoButtons();
        
        // Before executing move, reset active status for current player's tokens
        // This ensures tokens that were inactive last turn are now active
        this.board.resetActiveStatus(this.currentPlayer);
        
        // Execute the move
        const capturedTokens = this.moveManager.executeMove(move, this.currentPlayer);
        
        // Check for win conditions
        this.checkWinConditions(capturedTokens);
        
        // Switch turns if game is still active
        if (this.isGameActive) {
            this.switchTurn();
        }
    }

    /**
     * Save the current state for undo
     */
    saveStateForUndo() {
        const state = {
            grid: this.board.getDeepCopy(),
            currentPlayer: this.currentPlayer,
            lastMoveFrom: this.board.lastMoveFrom ? {...this.board.lastMoveFrom} : null,
            lastMoveTo: this.board.lastMoveTo ? {...this.board.lastMoveTo} : null,
            winner: this.winner,
            winReason: this.winReason,
            isGameActive: this.isGameActive
        };
        
        this.moveHistory.push(state);
    }

    /**
     * Undo the last move
     */
    undoMove() {
        if (this.moveHistory.length === 0 || this.isProcessingAIMove) return false;
        
        // Save current state for redo
        const currentState = {
            grid: this.board.getDeepCopy(),
            currentPlayer: this.currentPlayer,
            lastMoveFrom: this.board.lastMoveFrom ? {...this.board.lastMoveFrom} : null,
            lastMoveTo: this.board.lastMoveTo ? {...this.board.lastMoveTo} : null,
            winner: this.winner,
            winReason: this.winReason,
            isGameActive: this.isGameActive
        };
        
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.moveHistory.pop();
        this.board.restoreFromCopy(previousState.grid);
        this.currentPlayer = previousState.currentPlayer;
        this.board.lastMoveFrom = previousState.lastMoveFrom;
        this.board.lastMoveTo = previousState.lastMoveTo;
        this.winner = previousState.winner;
        this.winReason = previousState.winReason;
        this.isGameActive = previousState.isGameActive;
        
        // Hide win modal if it's showing and game is now active again
        if (this.isGameActive) {
            document.getElementById('win-modal').classList.add('hidden');
        }
        
        // Update the UI
        this.ui.updateUndoRedoButtons();
        
        return true;
    }

    /**
     * Redo a previously undone move
     */
    redoMove() {
        if (this.redoStack.length === 0 || this.isProcessingAIMove) return false;
        
        // Save current state for undo
        this.saveStateForUndo();
        
        // Restore state from redo stack
        const nextState = this.redoStack.pop();
        this.board.restoreFromCopy(nextState.grid);
        this.currentPlayer = nextState.currentPlayer;
        this.board.lastMoveFrom = nextState.lastMoveFrom;
        this.board.lastMoveTo = nextState.lastMoveTo;
        this.winner = nextState.winner;
        this.winReason = nextState.winReason;
        this.isGameActive = nextState.isGameActive;
        
        // Show win modal if game is not active and there is a winner
        if (!this.isGameActive && this.winner) {
            this.ui.showWinModal(this.winner, this.winReason);
        }
        
        // Update the UI
        this.ui.updateUndoRedoButtons();
        
        return true;
    }

    /**
     * Execute an AI move
     */
    executeAIMove() {
        if (!this.isGameActive || this.isHumanTurn() || this.isProcessingAIMove) return;
        
        // Set flag to prevent multiple AI moves from being processed simultaneously
        this.isProcessingAIMove = true;
        
        // Set AI strength based on current player
        const aiLevel = this.currentPlayer === 'black' ? this.blackAILevel : this.whiteAILevel;
        this.ai.setStrength(aiLevel);
        
        // Get the best move from AI
        const aiMove = this.ai.getBestMove(this.currentPlayer);
        
        // Handle the move result with a timeout to ensure the thinking indicator has time to display
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
            
            // Update game status for next player
            this.ui.updateGameStatus();
        }, 300); // Increased delay to ensure thinking indicator has time to show "Move selected" message
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