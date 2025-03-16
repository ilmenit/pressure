/**
 * AI Player with optimized move/undo system
 */
class AIPlayer {
    constructor(board, moveManager) {
        this.board = board;
        this.moveManager = moveManager;
        this.difficulty = 5; // Default difficulty (1-9 scale)
        this.moveHistory = []; // Stack for move/undo system
        this.nodesEvaluated = 0;
        this.isThinking = false;
        this.thinkingStartTime = 0;
    }

    /**
     * Set difficulty level (1-9 scale)
     */
    setStrength(difficulty) {
        this.difficulty = Math.max(1, Math.min(9, difficulty));
    }

    /**
     * Get the best move for the current player with progress callback
     * @param {string} color - The player color ('black' or 'white')
     * @param {Function} progressCallback - Callback for AI progress updates
     * @returns {Object} The selected move
     */
    getBestMove(color, progressCallback) {
        // Start thinking timer
        this.isThinking = true;
        this.thinkingStartTime = performance.now();
        
        // Initial progress notification
        if (progressCallback) {
            progressCallback({
                type: 'start',
                message: 'AI is thinking...'
            });
        }
        
        // Get all possible moves
        const possibleMoves = this.moveManager.generatePossibleMoves(color);
        
        // Reset performance counter
        this.nodesEvaluated = 0;
        console.time('AI thinking time');
        
        // No moves available
        if (possibleMoves.length === 0) {
            if (progressCallback) {
                progressCallback({
                    type: 'end', 
                    result: 'no_moves',
                    message: 'AI found no possible moves'
                });
            }
            console.timeEnd('AI thinking time');
            this.isThinking = false;
            return null;
        }
        
        // If only one move is available, return it immediately
        if (possibleMoves.length === 1) {
            if (progressCallback) {
                progressCallback({
                    type: 'end',
                    result: 'single_move',
                    message: 'AI found only one possible move'
                });
            }
            console.timeEnd('AI thinking time');
            this.isThinking = false;
            return possibleMoves[0];
        }
        
        // Filter out moves that lead to immediate self-capture
        const nonSuicidalMoves = this.filterObviouslySuicidalMoves(possibleMoves, color);
        const movesToConsider = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : possibleMoves;
        
        // Adjust search depth based on available moves to prevent very slow turns
        let searchDepth = this.difficulty;
        if (movesToConsider.length > 10 && searchDepth > 6) {
            searchDepth = 6; // Moderate limitation
        } else if (movesToConsider.length > 14 && searchDepth > 4) {
            searchDepth = 4; // Limit depth for many available moves
        }
        // Update progress with depth info
        if (progressCallback) {
            progressCallback({
                type: 'depth',
                depth: searchDepth,
                message: `AI analyzing at depth ${searchDepth}...`
            });
        }
        
        // Evaluate all moves with proper depth search
        const evaluatedMoves = [];
        let completedMoves = 0;
        
        for (const move of movesToConsider) {
            // Apply the move with skipRendering=true
            this.applyMove(move, color, true);
            
            // Evaluate this move by simulating opponent's best response
            let score;
            const oppositeColor = color === 'black' ? 'white' : 'black';
            
            if (searchDepth <= 1) {
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
            
            // Update progress indicator periodically (not every move to avoid too many updates)
            completedMoves++;
            if (completedMoves % Math.max(1, Math.floor(movesToConsider.length / 10)) === 0) {
                const progress = Math.floor((completedMoves / movesToConsider.length) * 100);
                if (progressCallback) {
                    progressCallback({
                        type: 'progress',
                        percent: progress,
                        message: `AI analyzing moves: ${progress}%`
                    });
                }
            }
        }
        
        // Sort moves by score (best first)
        evaluatedMoves.sort((a, b) => b.score - a.score);
        
        // Print performance info
        console.log(`AI evaluated ${this.nodesEvaluated} positions at depth ${searchDepth}`);
        console.timeEnd('AI thinking time');
        
        // Final notification that a move has been selected
        if (progressCallback) {
            progressCallback({
                type: 'end',
                result: 'move_selected',
                message: 'AI move selected'
            });
        }
        
        // Improved move selection logic that adds controlled randomness at all difficulty levels
        let selectedMove;
        
        if (evaluatedMoves.length > 1) {
            // Get the best score
            const bestScore = evaluatedMoves[0].score;
            
            // Define a threshold for "equally good" moves based on difficulty
            // Higher difficulty = smaller threshold (more selective)
            const equalityThreshold = 0.02 * (10 - this.difficulty) / 9;
            
            // Find all moves that are within the threshold of the best score
            const topMoves = evaluatedMoves.filter(move => 
                (bestScore - move.score) <= equalityThreshold
            );
            
            if (this.difficulty <= 3) {
                // For lower difficulties, use the original behavior (top third of moves)
                const topCount = Math.min(
                    Math.max(1, Math.ceil(evaluatedMoves.length / 3)),
                    evaluatedMoves.length
                );
                
                const randomIndex = Math.floor(Math.random() * topCount);
                selectedMove = evaluatedMoves[randomIndex].move;
            } else if (topMoves.length > 1) {
                // For higher difficulties with multiple equally good moves,
                // randomly choose among the top moves
                const randomIndex = Math.floor(Math.random() * topMoves.length);
                selectedMove = topMoves[randomIndex].move;
                
                // Log for debugging
                if (topMoves.length > 1) {
                    console.log(`AI selected from ${topMoves.length} equally good moves (threshold: ${equalityThreshold.toFixed(4)})`);
                }
            } else {
                // No equally good moves, just use the best one
                selectedMove = evaluatedMoves[0].move;
            }
        } else {
            // Only one move after evaluation
            selectedMove = evaluatedMoves[0].move;
        }
        
        this.isThinking = false;
        return selectedMove;
    }
    
    /**
     * Filter out moves that lead to immediate self-capture
     */
    filterObviouslySuicidalMoves(moves, color) {
        const safeMoves = [];
        
        for (const move of moves) {
            // Apply this move (with skipRendering=true)
            this.applyMove(move, color, true);
            
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
        
        // Check for no valid moves - use cached moves when possible
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
                this.applyMove(move, color, true);
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
                this.applyMove(move, color, true);
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
     * This is the core optimization that avoids expensive board cloning
     */
    applyMove(move, color, skipRendering = false) {
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
        
        // Execute the move with skipRendering flag
        const capturedTokens = this.moveManager.executeMove(move, color, skipRendering);
        
        // Save captured tokens after move
        state.capturedAfter = { ...this.board.countCapturedTokens() };
        
        // Add to history stack
        this.moveHistory.push(state);
        
        return state;
    }
    
    /**
     * Get all positions that will be affected by a move
     * This is critical for the undo system to work correctly
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
     * This is the key optimization that makes deep search possible
     */
    undoLastMove() {
        if (this.moveHistory.length === 0) return;
        
        const state = this.moveHistory.pop();
        
        // Restore all affected positions
        for (const item of state.affectedTokens) {
            this.board.grid[item.position.row][item.position.col] = item.token;
        }
        
        // Restore last captured tokens array
        if (this.board.lastCapturedTokens) {
            this.board.lastCapturedTokens = state.lastCapturedTokens;
        }
        
        // Restore last move indicators
        if (state.move.from) {
            this.board.lastMoveFrom = state.move.from;
        }
        if (state.move.to) {
            this.board.lastMoveTo = state.move.to;
        }
    }
}