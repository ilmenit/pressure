/**
 * AI Player with scalable difficulty from beginner (1) to expert (9)
 * Implements minimax algorithm with variable depth search
 */
class AIPlayer {
    constructor(board, moveManager) {
        this.board = board;
        this.moveManager = moveManager;
        this.difficulty = 5; // Default difficulty (1-9 scale)
        this.moveHistory = []; // Stack for move/undo system
        this.nodesEvaluated = 0;
    }

    /**
     * Set difficulty level (1-9 scale)
     */
    setStrength(difficulty) {
        this.difficulty = Math.max(1, Math.min(9, difficulty));
    }

    /**
     * Get the best move for the current player
     */
    getBestMove(color) {
        // Reset performance counter
        this.nodesEvaluated = 0;
        
        // Get all possible moves
        const possibleMoves = this.moveManager.generatePossibleMoves(color);
        
        if (possibleMoves.length === 0) {
            return null;
        }
        
        // If only one move is available, return it immediately
        if (possibleMoves.length === 1) {
            return possibleMoves[0];
        }
        
        // Filter out moves that lead to immediate self-capture
        // This is fast and prevents obviously bad moves at all difficulty levels
        const nonSuicidalMoves = this.filterObviouslySuicidalMoves(possibleMoves, color);
        const movesToConsider = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : possibleMoves;
        
        // Evaluate all moves with proper depth search
        const searchDepth = this.getSearchDepthForDifficulty();
        const evaluatedMoves = [];
        
        for (const move of movesToConsider) {
            // Apply the move
            this.applyMove(move, color);
            
            // Evaluate this move by simulating opponent's best response
            let score;
            const oppositeColor = color === 'black' ? 'white' : 'black';
            
            if (searchDepth <= 1 || this.difficulty <= 2) {
                // For lowest difficulties or depth 1, just evaluate immediate position
                score = this.evaluatePosition(color);
            } else {
                // For higher difficulties, perform minimax search
                score = this.minimax(searchDepth - 1, oppositeColor, -1, 1, false);
            }
            
            // Undo the move
            this.undoLastMove();
            
            // Add move to evaluated list
            evaluatedMoves.push({ move, score });
        }
        
        // Sort moves by score (best first)
        evaluatedMoves.sort((a, b) => b.score - a.score);
        
        // For lower difficulties, introduce randomness
        if (this.difficulty <= 3 && evaluatedMoves.length > 1) {
            const topCount = Math.min(
                Math.max(1, Math.ceil(evaluatedMoves.length / 3)),
                evaluatedMoves.length
            );
            
            // Choose randomly from top third of moves
            const randomIndex = Math.floor(Math.random() * topCount);
            return evaluatedMoves[randomIndex].move;
        }
        
        // Return the best move for higher difficulties
        return evaluatedMoves[0].move;
    }
    
    /**
     * Filter out moves that lead to immediate self-capture
     */
    filterObviouslySuicidalMoves(moves, color) {
        const safeMoves = [];
        
        for (const move of moves) {
            // Apply this move
            this.applyMove(move, color);
            
            // Check if any of our tokens were captured
            const capturedTokens = this.board.getLastCapturedTokens();
            const selfCapture = capturedTokens.some(token => token.color === color);
            
            // Undo the move
            this.undoLastMove();
            
            // Keep only non-suicidal moves
            if (!selfCapture) {
                safeMoves.push(move);
            }
        }
        
        return safeMoves;
    }
    
    /**
     * Get search depth based on difficulty
     */
    getSearchDepthForDifficulty() {
        if (this.difficulty <= 2) return 1;
        if (this.difficulty <= 4) return 2;
        if (this.difficulty <= 6) return 3;
        if (this.difficulty <= 8) return 4;
        return 5;
    }
    
    /**
     * Simplified minimax with alpha-beta pruning
     */
    minimax(depth, color, alpha, beta, isMaximizing) {
        this.nodesEvaluated++;
        const oppositeColor = color === 'black' ? 'white' : 'black';
        
        // Terminal node checks
        const capturedCounts = this.board.countCapturedTokens();
        
        // Check for wins/losses
        if (capturedCounts[oppositeColor] >= 6) {
            return isMaximizing ? 1 : -1; // Win
        }
        
        if (capturedCounts[color] >= 6) {
            return isMaximizing ? -1 : 1; // Loss
        }
        
        // Check for no valid moves
        const possibleMoves = this.moveManager.generatePossibleMoves(color);
        if (possibleMoves.length === 0) {
            return isMaximizing ? -1 : 1; // Loss - no moves
        }
        
        // Leaf node - evaluate position
        if (depth === 0) {
            // Convert score from 0-1 range to -1 to 1 range
            const score = (this.evaluatePosition(color) * 2) - 1;
            return isMaximizing ? score : -score;
        }
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const move of possibleMoves) {
                this.applyMove(move, color);
                const evaluation = this.minimax(depth - 1, oppositeColor, alpha, beta, false);
                this.undoLastMove();
                
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                
                // Alpha-beta pruning
                if (beta <= alpha) break;
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of possibleMoves) {
                this.applyMove(move, color);
                const evaluation = this.minimax(depth - 1, oppositeColor, alpha, beta, true);
                this.undoLastMove();
                
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                
                // Alpha-beta pruning
                if (beta <= alpha) break;
            }
            
            return minEval;
        }
    }
    
    /**
     * Evaluate board position focusing on token captures
     * Returns a score from 0.0 (worst) to 1.0 (best) for the given color
     */
    evaluatePosition(color) {
        const oppositeColor = color === 'black' ? 'white' : 'black';
        
        // Count captured tokens
        const capturedCounts = this.board.countCapturedTokens();
        
        // Win conditions
        if (capturedCounts[oppositeColor] >= 6) {
            return 1.0; // Win - captured all opponent tokens
        }
        
        if (capturedCounts[color] >= 6) {
            return 0.0; // Loss - all our tokens captured
        }
        
        // Check for mobility
        const ownMoves = this.moveManager.generatePossibleMoves(color).length;
        if (ownMoves === 0) {
            return 0.0; // Loss - no valid moves
        }
        
        // Calculate score based on capture differential
        // Range from -6 to 6, normalized to 0-1
        const captureDiff = capturedCounts[oppositeColor] - capturedCounts[color];
        
        // Calculate threatened tokens (tokens with 3 sides surrounded)
        let ownThreatened = 0;
        let oppThreatened = 0;
        
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (!token || token.isCaptured) continue;
                
                const surroundedSides = this.countSurroundedSides(row, col);
                if (surroundedSides >= 3) {
                    if (token.color === color) {
                        ownThreatened++;
                    } else {
                        oppThreatened++;
                    }
                }
            }
        }
        
        // Threat differential ranges from -6 to 6
        const threatDiff = oppThreatened - ownThreatened;
        
        // Combined score with heavier weight on actual captures
        const weightedDiff = (captureDiff * 0.8) + (threatDiff * 0.2);
        
        // Normalize to 0-1 range
        const normalizedScore = 0.5 + (weightedDiff / 12) * 0.5;
        
        return Math.max(0, Math.min(1, normalizedScore));
    }
    
    /**
     * Count how many sides of a token are surrounded
     */
    countSurroundedSides(row, col) {
        const directions = [
            {dr: -1, dc: 0}, // Up
            {dr: 1, dc: 0},  // Down
            {dr: 0, dc: -1}, // Left
            {dr: 0, dc: 1}   // Right
        ];
        
        let surroundedSides = 0;
        
        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            
            // Count board edges and other tokens as surrounding
            if (newRow < 0 || newRow >= this.board.size || 
                newCol < 0 || newCol >= this.board.size || 
                this.board.getTokenAt(newRow, newCol) !== null) {
                surroundedSides++;
            }
        }
        
        return surroundedSides;
    }
    
    /**
     * Apply a move and save state for undo
     */
    applyMove(move, color) {
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
        
        // Save board state before move
        state.capturedBefore = { ...this.board.countCapturedTokens() };
        
        // Execute the move
        this.moveManager.executeMove(move, color);
        
        // Save captured tokens after move
        state.capturedAfter = { ...this.board.countCapturedTokens() };
        
        // Add to history stack
        this.moveHistory.push(state);
        
        return state;
    }
    
    /**
     * Get all positions that will be affected by a move
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
     */
    undoLastMove() {
        if (this.moveHistory.length === 0) return;
        
        const state = this.moveHistory.pop();
        
        // Restore all affected positions
        for (const item of state.affectedTokens) {
            this.board.grid[item.position.row][item.position.col] = item.token;
        }
    }
}