/**
 * Extension for Game class to support tournament mode
 * This file extends the existing Game class rather than modifying it directly
 */

// Extend Game class prototype with tournament-specific methods
(function() {
    // Store reference to the original initialize method
    const originalInitialize = Game.prototype.initialize;
    
    // Extend initialize method to support tournament mode
    Game.prototype.initialize = function(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel) {
        // Call the original method
        originalInitialize.call(this, blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel);
        
        // If tournament mode is active, adjust settings if needed
        if (this.isTournamentMode && this.currentOpponent) {
            // For tournament mode, we might want to add specific behaviors here
            
            // FIXED: Ensure UI is updated to disable undo/redo buttons
            if (this.ui) {
                this.ui.updateUndoRedoButtons();
            }
        }
    };
    
    // Store reference to the original checkWinConditions method
    const originalCheckWinConditions = Game.prototype.checkWinConditions;
    
    // Extend checkWinConditions method for tournament integration
    Game.prototype.checkWinConditions = function(capturedTokens) {
        // Call the original method
        const result = originalCheckWinConditions.call(this, capturedTokens);
        
        // We don't need to call tournament manager here, as it will be called in endGame
        // This prevents race conditions with the win modal
        
        return result;
    };
    
    // Store reference to the original endGame method
    const originalEndGame = Game.prototype.endGame;
    
    // Extend endGame method
    Game.prototype.endGame = function(winner, reason) {
        // Call the original method
        originalEndGame.call(this, winner, reason);
        
        // FIX: Now notify tournament manager AFTER the game state is updated
        // but BEFORE the UI shows any win modal
        if (this.isTournamentMode && this.tournamentManager) {
            // Notify tournament manager about game outcome
            this.tournamentManager.handleMatchOutcome(this.winner);
        }
    };
    
    // Add new method for token capture notification
    Game.prototype.notifyTokenCaptured = function(tokenColor) {
        // Notify tournament manager if in tournament mode
        if (this.isTournamentMode && this.tournamentManager) {
            this.tournamentManager.handleTokenCapture(tokenColor);
        }
    };
    
    // Add tournament mode properties to Game class
    Object.defineProperties(Game.prototype, {
        'isTournamentMode': {
            value: false,
            writable: true,
            configurable: true
        },
        'currentOpponent': {
            value: null,
            writable: true,
            configurable: true
        },
        'tournamentManager': {
            value: null,
            writable: true,
            configurable: true
        }
    });
})();

// Extend Board class to notify about token captures
(function() {
    // Store reference to the original checkAndTransformSurroundedTokens method
    const originalCheckAndTransform = Board.prototype.checkAndTransformSurroundedTokens;
    
    // Extend checkAndTransformSurroundedTokens method
    Board.prototype.checkAndTransformSurroundedTokens = function() {
        // Call the original method
        const captured = originalCheckAndTransform.call(this);
        
        // Notify game about captures if game instance is available
        if (window.game && captured.length > 0) {
            for (const token of captured) {
                window.game.notifyTokenCaptured(token.color);
            }
        }
        
        return captured;
    };
})();