/**
 * AI Player with optimized move/undo system and thinking indicator
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
        this.MIN_THINKING_DISPLAY_TIME = 1500; // Increased minimum time to show thinking indicator (ms)
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
        // Show thinking indicator immediately
        this.isThinking = true;
        this.thinkingStartTime = performance.now();
        this.showThinkingIndicator(true);
        
        // Get all possible moves
        const possibleMoves = this.moveManager.generatePossibleMoves(color);
        
        // Reset performance counter
        this.nodesEvaluated = 0;
        console.time('AI thinking time');
        
        if (possibleMoves.length === 0) {
            this.hideThinkingAfterDelay(this.MIN_THINKING_DISPLAY_TIME);
            console.timeEnd('AI thinking time');
            return null;
        }
        
        // If only one move is available, return it immediately
        if (possibleMoves.length === 1) {
            this.updateThinkingIndicator("Move selected");
            this.hideThinkingAfterDelay(this.MIN_THINKING_DISPLAY_TIME);
            console.timeEnd('AI thinking time');
            return possibleMoves[0];
        }
        
        // Filter out moves that lead to immediate self-capture
        const nonSuicidalMoves = this.filterObviouslySuicidalMoves(possibleMoves, color);
        const movesToConsider = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : possibleMoves;
        
        // Adjust search depth based on available moves to prevent very slow turns
        let searchDepth = this.difficulty;
        if (movesToConsider.length > 12 && searchDepth > 4) {
            searchDepth = 4; // Limit depth for many available moves
        } else if (movesToConsider.length > 8 && searchDepth > 6) {
            searchDepth = 6; // Moderate limitation
        }
        
        // Update thinking indicator with depth info
        this.updateThinkingIndicator(`Analyzing at depth ${searchDepth}...`);
        
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
            
            // Update progress indicator periodically (not every move to avoid too many UI updates)
            completedMoves++;
            if (completedMoves % Math.max(1, Math.floor(movesToConsider.length / 10)) === 0) {
                const progress = Math.floor((completedMoves / movesToConsider.length) * 100);
                this.updateThinkingIndicator(`Analyzing moves: ${progress}%`);
            }
        }
        
        // Sort moves by score (best first)
        evaluatedMoves.sort((a, b) => b.score - a.score);
        
        // Print performance info
        console.log(`AI evaluated ${this.nodesEvaluated} positions at depth ${searchDepth}`);
        console.timeEnd('AI thinking time');
        
        // Update the thinking indicator to show that a move has been selected
        this.updateThinkingIndicator("Move selected");
        
        // Hide thinking indicator with minimum display time
        this.hideThinkingAfterDelay(this.MIN_THINKING_DISPLAY_TIME);
        
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
     * Hide the thinking indicator after a minimum delay
     * @param {number} minDelay - Minimum delay in milliseconds
     */
    hideThinkingAfterDelay(minDelay) {
        const elapsedTime = performance.now() - this.thinkingStartTime;
        const remainingTime = Math.max(0, minDelay - elapsedTime);
        
        setTimeout(() => {
            this.isThinking = false;
            this.showThinkingIndicator(false);
        }, remainingTime);
    }
    
    /**
     * Show or hide the AI thinking indicator
     */
    showThinkingIndicator(show) {
        // Create indicator if it doesn't exist
        if (!document.getElementById('ai-thinking-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'ai-thinking-indicator';
            indicator.className = 'ai-thinking-indicator';
            indicator.textContent = 'AI is thinking...';
            
            // Create and add the pulsing dot
            const pulsingDot = document.createElement('span');
            pulsingDot.className = 'pulsing-dot';
            indicator.appendChild(pulsingDot);
            
            // Ensure the animation styles are in place
            if (!document.getElementById('ai-thinking-styles')) {
                const style = document.createElement('style');
                style.id = 'ai-thinking-styles';
                style.textContent = `
                    .ai-thinking-indicator {
                        position: fixed;
                        top: 10px;
                        left: 50%;
                        transform: translateX(-50%);
                        padding: 10px 20px;
                        background-color: rgba(0, 0, 0, 0.8);
                        color: white;
                        border-radius: 5px;
                        z-index: 1000;
                        font-weight: bold;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                        transition: opacity 0.2s;
                    }
                    .pulsing-dot {
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        background-color: #4A6FA5;
                        border-radius: 50%;
                        margin-left: 8px;
                        animation: pulse 1.5s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 0.4; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.3); }
                        100% { opacity: 0.4; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(indicator);
        }
        
        const indicator = document.getElementById('ai-thinking-indicator');
        indicator.style.display = show ? 'block' : 'none';
        
        // Ensure the indicator is visible by forcing a reflow
        if (show) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.opacity = '1';
            }, 10);
        }
    }
    
    /**
     * Update the text in the thinking indicator
     */
    updateThinkingIndicator(text) {
        const indicator = document.getElementById('ai-thinking-indicator');
        if (indicator) {
            // Get the pulsing dot (last element)
            const pulsingDot = indicator.querySelector('.pulsing-dot');
            
            // Update text content
            indicator.textContent = text;
            
            // Add the dot back if it exists
            if (pulsingDot) {
                indicator.appendChild(pulsingDot);
            }
        }
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