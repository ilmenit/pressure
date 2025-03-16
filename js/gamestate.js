/**
 * GameState class handles unified state management for both regular gameplay and AI simulation
 * Centralizes all state tracking, move application, and undo/redo functionality
 */
class GameState {
    constructor(board, moveManager) {
        this.board = board;
        this.moveManager = moveManager;
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
        const forAISimulation = options.forAISimulation || false;

        if (!forAISimulation) {
            // For regular gameplay, save full state for undo/redo
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
            }
        } else {
            // For AI simulation, use a more efficient approach that only tracks affected positions
            this.saveMinimalState(move, color);
        }

        // Before executing move, reset active status for current player's tokens if needed
        // This should only be done at the start of a player's turn, not during move simulation
        if (options.resetActiveStatus) {
            this.board.resetActiveStatus(color);
        }

        // Execute the move
        const capturedTokens = this.moveManager.executeMove(move, color, skipRendering);
        
        return capturedTokens;
    }

    /**
     * Save full game state (used for regular gameplay)
     */
    saveFullState(state) {
        this.stateHistory.push(state);
    }

    /**
     * Save minimal game state (used for AI simulation)
     * Only tracks positions affected by the move for efficiency
     */
    saveMinimalState(move, color) {
        // Save the current state
        const state = {
            move: move,
            color: color,
            // Save pieces that will be affected (moved or captured)
            affected: this.getAffectedPositions(move)
        };
        
        // Record the current state of affected positions
        state.affectedTokens = state.affected.map(pos => {
            const token = this.board.getTokenAt(pos.row, pos.col);
            if (token) {
                // Create a deep copy of the token to prevent reference issues
                return {
                    position: { ...pos },
                    token: { 
                        color: token.color,
                        isActive: token.isActive,
                        isCaptured: token.isCaptured
                    }
                };
            } else {
                return {
                    position: { ...pos },
                    token: null
                };
            }
        });
        
        // Save last captured tokens array state
        if (this.board.lastCapturedTokens) {
            state.lastCapturedTokens = [...this.board.lastCapturedTokens];
        } else {
            state.lastCapturedTokens = [];
        }
        
        // Save board state before move
        state.capturedBefore = { ...this.board.countCapturedTokens() };
        
        // Add to history stack
        this.stateHistory.push(state);
    }

    /**
     * Get all positions that will be affected by a move
     * Critical for efficient state tracking
     */
    getAffectedPositions(move) {
        const positions = [move.from, move.to];
        
        // If it's a push, add all positions in the push line
        if (move.type === 'push' && move.tokens) {
            // Add all tokens being pushed
            for (const tokenPos of move.tokens) {
                positions.push({ ...tokenPos });
                
                // Also add the position where each token will end up
                const { dr, dc } = this.moveManager.getDirectionVector(move.direction);
                positions.push({
                    row: tokenPos.row + dr,
                    col: tokenPos.col + dc
                });
            }
        }
        
        // Add surrounding positions (for capture checks)
        const directions = [
            {dr: -1, dc: 0}, // Up
            {dr: 1, dc: 0},  // Down
            {dr: 0, dc: -1}, // Left
            {dr: 0, dc: 1}   // Right
        ];
        
        // Add positions around the destination and all moved tokens (potential captures)
        const positionsToCheck = [...positions];
        for (const pos of positionsToCheck) {
            for (const dir of directions) {
                positions.push({
                    row: pos.row + dir.dr,
                    col: pos.col + dir.dc
                });
            }
        }
        
        // Filter out duplicate positions and invalid positions
        const uniqueValidPositions = [];
        const seen = new Set();
        
        for (const pos of positions) {
            const key = `${pos.row},${pos.col}`;
            if (!seen.has(key) && 
                pos.row >= 0 && pos.row < this.board.size && 
                pos.col >= 0 && pos.col < this.board.size) {
                seen.add(key);
                uniqueValidPositions.push({ ...pos });
            }
        }
        
        return uniqueValidPositions;
    }

    /**
     * Undo the last move
     * Handles both full state and minimal state undo
     */
    undoLastMove(options = {}) {
        if (this.stateHistory.length === 0) return false;
        
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
            
            // Return additional state for the Game class to handle
            return { 
                success: true, 
                state: state
            };
        } else {
            // Minimal state restoration (for AI)
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
            
            return { success: true };
        }
    }

    /**
     * Redo a previously undone move
     */
    redoMove(options = {}) {
        if (this.redoStack.length === 0) return false;
        
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
    }
}