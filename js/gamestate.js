/**
 * GameState class handles unified state management for both regular gameplay and AI simulation
 * Centralizes all state tracking, move application, and undo/redo functionality
 * Refactored to use event-driven architecture with simulation context
 */
class GameState {
    constructor(board, moveManager, game) {
        this.board = board;
        this.moveManager = moveManager;
        this.game = game;
        this.events = game ? game.events : null;
        this.stateHistory = [];
        this.redoStack = [];
    }

    /**
     * Apply a move and save state for undo
     * @param {Object} move - The move to apply
     * @param {string} color - Player color making the move
     * @param {Object} options - Additional options
     * @returns {Array} - Captured tokens during this move
     */
    applyMove(move, color, options = {}) {
        const skipRendering = options.skipRendering || false;

        // Emit state:saving event before saving state
        if (this.events) {
            this.events.emit('state:saving', {
                move: move,
                color: color
            });
        }

        // For regular gameplay, save full state for undo/redo
        // No special flag is needed anymore - simulation context is tracked in the event system
        this.saveFullState({
            grid: this.board.getDeepCopy(),
            currentPlayer: color,
            lastMoveFrom: this.board.lastMoveFrom ? {...this.board.lastMoveFrom} : null,
            lastMoveTo: this.board.lastMoveTo ? {...this.board.lastMoveTo} : null,
            lastCapturedTokens: this.board.lastCapturedTokens ? [...this.board.lastCapturedTokens] : [],
            additionalState: options.additionalState || {}
        });
        
        // Clear redo stack when making a new move
        if (options.clearRedoStack) {
            this.redoStack = [];
            
            // Emit redoStack:cleared event
            if (this.events) {
                this.events.emit('redoStack:cleared', {
                    timestamp: Date.now()
                });
            }
        }

        // Before executing move, reset active status for current player's tokens if needed
        // This should only be done at the start of a player's turn, not during move simulation
        if (options.resetActiveStatus) {
            this.board.resetActiveStatus(color);
            
            // Emit tokens:activated event
            if (this.events) {
                this.events.emit('tokens:activated', {
                    color: color
                });
            }
        }

        // Execute the move
        const capturedTokens = this.moveManager.executeMove(move, color, skipRendering);
        
        // Emit state:applied event after applying move
        if (this.events) {
            this.events.emit('state:applied', {
                move: move,
                color: color,
                capturedTokens: capturedTokens
            });
        }
        
        return capturedTokens;
    }

    /**
     * Save full game state (used for regular gameplay)
     */
    saveFullState(state) {
        this.stateHistory.push(state);
        
        // Emit stateHistory:updated event
        if (this.events) {
            this.events.emit('stateHistory:updated', {
                historyLength: this.stateHistory.length,
                redoLength: this.redoStack.length
            });
        }
    }

    /**
     * Undo the last move
     */
    undoLastMove(options = {}) {
        if (this.stateHistory.length === 0) return { success: false };
        
        // Emit undo:started event
        if (this.events) {
            this.events.emit('undo:started', {
                historyLength: this.stateHistory.length
            });
        }
        
        const state = this.stateHistory.pop();
        
        // If we're in regular gameplay, save state for redo
        if (options.saveForRedo) {
            const currentState = {
                grid: this.board.getDeepCopy(),
                currentPlayer: options.currentPlayer,
                lastMoveFrom: this.board.lastMoveFrom ? {...this.board.lastMoveFrom} : null,
                lastMoveTo: this.board.lastMoveTo ? {...this.board.lastMoveTo} : null,
                lastCapturedTokens: this.board.lastCapturedTokens ? [...this.board.lastCapturedTokens] : [],
                additionalState: options.additionalState || {}
            };
            
            this.redoStack.push(currentState);
            
            // Emit redoStack:updated event
            if (this.events) {
                this.events.emit('redoStack:updated', {
                    redoLength: this.redoStack.length
                });
            }
        }
        
        // Determine what type of state we're restoring
        if (state.grid) {
            // Full state restoration
            this.board.restoreFromCopy(state.grid);
            this.board.lastMoveFrom = state.lastMoveFrom;
            this.board.lastMoveTo = state.lastMoveTo;
            
            // Ensure lastCapturedTokens is properly restored
            if (state.lastCapturedTokens) {
                this.board.lastCapturedTokens = [...state.lastCapturedTokens];
            } else {
                this.board.lastCapturedTokens = [];
            }
            
            // Emit undo:completed event
            if (this.events) {
                this.events.emit('undo:completed', {
                    historyLength: this.stateHistory.length,
                    redoLength: this.redoStack.length,
                    restoredState: state
                });
            }
            
            // Return additional state for the Game class to handle
            return { 
                success: true, 
                state: state
            };
        } else {
            // For backward compatibility, handle the minimal state format
            // This branch can be removed in future refactors
            // Restore all affected positions
            for (const item of state.affectedTokens) {
                this.board.grid[item.position.row][item.position.col] = item.token;
            }
            
            // Restore last captured tokens array
            if (state.lastCapturedTokens) {
                this.board.lastCapturedTokens = [...state.lastCapturedTokens];
            } else {
                this.board.lastCapturedTokens = [];
            }
            
            // Restore last move indicators
            if (state.move.from) {
                this.board.lastMoveFrom = {...state.move.from};
            }
            if (state.move.to) {
                this.board.lastMoveTo = {...state.move.to};
            }
            
            // Emit undo:completed event for AI simulation
            if (this.events) {
                this.events.emit('undo:aiSimulation', {
                    historyLength: this.stateHistory.length
                });
            }
            
            return { success: true };
        }
    }

    /**
     * Redo a previously undone move
     */
    redoMove(options = {}) {
        if (this.redoStack.length === 0) return { success: false };
        
        // Emit redo:started event
        if (this.events) {
            this.events.emit('redo:started', {
                redoLength: this.redoStack.length
            });
        }
        
        // Save current state for undo
        if (options.saveForUndo) {
            this.saveFullState({
                grid: this.board.getDeepCopy(),
                currentPlayer: options.currentPlayer,
                lastMoveFrom: this.board.lastMoveFrom ? {...this.board.lastMoveFrom} : null,
                lastMoveTo: this.board.lastMoveTo ? {...this.board.lastMoveTo} : null,
                lastCapturedTokens: this.board.lastCapturedTokens ? [...this.board.lastCapturedTokens] : [],
                additionalState: options.additionalState || {}
            });
        }
        
        // Restore state from redo stack
        const nextState = this.redoStack.pop();
        this.board.restoreFromCopy(nextState.grid);
        
        // Ensure deep copies for all state references
        if (nextState.lastMoveFrom) {
            this.board.lastMoveFrom = {...nextState.lastMoveFrom};
        } else {
            this.board.lastMoveFrom = null;
        }
        
        if (nextState.lastMoveTo) {
            this.board.lastMoveTo = {...nextState.lastMoveTo};
        } else {
            this.board.lastMoveTo = null;
        }
        
        if (nextState.lastCapturedTokens) {
            this.board.lastCapturedTokens = [...nextState.lastCapturedTokens];
        } else {
            this.board.lastCapturedTokens = [];
        }
        
        // Emit redo:completed event
        if (this.events) {
            this.events.emit('redo:completed', {
                historyLength: this.stateHistory.length,
                redoLength: this.redoStack.length,
                restoredState: nextState
            });
        }
        
        return { 
            success: true, 
            state: nextState
        };
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.stateHistory.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.stateHistory = [];
        this.redoStack = [];
        
        // Emit history:cleared event
        if (this.events) {
            this.events.emit('history:cleared', {
                timestamp: Date.now()
            });
        }
    }
}