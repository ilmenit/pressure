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
        this.MIN_THINKING_DISPLAY_TIME = 800; // Minimum time to show thinking indicator (ms)
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
        // Show thinking indicator with a guaranteed render
        this.isThinking = true;
        this.thinkingStartTime = performance.now();
        this.showThinkingIndicator(true);
        
        // Force browser to render the thinking indicator before starting calculations
        return new Promise(resolve => {
            setTimeout(() => {
                // Reset performance counter
                this.nodesEvaluated = 0;
                console.time('AI thinking time');
                
                try {
                    // Get all possible moves
                    const possibleMoves = this.moveManager.generatePossibleMoves(color);
                    
                    if (possibleMoves.length === 0) {
                        this.ensureMinimumThinkingTime(() => resolve(null));
                        return;
                    }
                    
                    // If only one move is available, return it after minimal thinking time
                    if (possibleMoves.length === 1) {
                        this.ensureMinimumThinkingTime(() => resolve(possibleMoves[0]));
                        return;
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
                    
                    // Show depth in indicator
                    this.updateThinkingIndicator(`Analyzing at depth ${searchDepth}...`);
                    
                    // Process the moves to find the best one
                    this.evaluateMovesInBatches(movesToConsider, color, searchDepth, bestMove => {
                        // Print performance info
                        console.log(`AI evaluated ${this.nodesEvaluated} positions at depth ${searchDepth}`);
                        console.timeEnd('AI thinking time');
                        
                        // Ensure minimum thinking time then return the best move
                        this.ensureMinimumThinkingTime(() => resolve(bestMove));
                    });
                } catch (error) {
                    console.error('Error in AI calculation:', error);
                    this.ensureMinimumThinkingTime(() => resolve(null));
                }
            }, 50); // Small delay to ensure indicator renders before calculations begin
        });
    }
    
    /**
     * Evaluate moves in small batches to allow UI to update
     */
    evaluateMovesInBatches(moves, color, searchDepth, callback) {
        const evaluatedMoves = [];
        let completedMoves = 0;
        const totalMoves = moves.length;
        const oppositeColor = color === 'black' ? 'white' : 'black';
        
        // Process a batch of moves, then yield to allow UI updates
        const processBatch = (startIndex) => {
            // Process a small batch of moves (3 at a time)
            const endIndex = Math.min(startIndex + 3, totalMoves);
            
            for (let i = startIndex; i < endIndex; i++) {
                const move = moves[i];
                
                // Apply the move with skipRendering=true
                this.applyMove(move, color, true);
                
                // Evaluate this move
                let score;
                if (searchDepth <= 1) {
                    // For lowest difficulties, just evaluate immediate position
                    score = this.evaluatePosition(color);
                } else {
                    // For higher difficulties, perform minimax search
                    score = this.minimax(searchDepth - 1, oppositeColor, -1, 1, false);
                }
                
                // Undo the move
                this.undoLastMove();
                
                // Add move to evaluated list
                evaluatedMoves.push({ move, score });
                
                // Update progress indicator
                completedMoves++;
                const progress = Math.floor((completedMoves / totalMoves) * 100);
                this.updateThinkingIndicator(`Analyzing moves: ${progress}%`);
            }
            
            // If more moves to process, schedule next batch
            if (endIndex < totalMoves) {
                setTimeout(() => processBatch(endIndex), 0);
            } else {
                // All moves processed, sort and select best move
                evaluatedMoves.sort((a, b) => b.score - a.score);
                
                // For lower difficulties, introduce randomness
                let bestMove;
                if (this.difficulty <= 3 && evaluatedMoves.length > 1) {
                    const topCount = Math.min(
                        Math.max(1, Math.ceil(evaluatedMoves.length / 3)),
                        evaluatedMoves.length
                    );
                    
                    // Choose randomly from top third of moves
                    const randomIndex = Math.floor(Math.random() * topCount);
                    bestMove = evaluatedMoves[randomIndex].move;
                } else {
                    // Return the best move for higher difficulties
                    bestMove = evaluatedMoves[0].move;
                }
                
                callback(bestMove);
            }
        };
        
        // Start processing the first batch
        processBatch(0);
    }
    
    /**
     * Ensure the thinking indicator displays for at least the minimum time
     */
    ensureMinimumThinkingTime(callback) {
        const elapsedTime = performance.now() - this.thinkingStartTime;
        const remainingTime = Math.max(0, this.MIN_THINKING_DISPLAY_TIME - elapsedTime);
        
        setTimeout(() => {
            // Hide the thinking indicator
            this.isThinking = false;
            this.showThinkingIndicator(false);
            
            // Execute the callback
            callback();
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
            
            // Add CSS class for styling
            indicator.className = 'ai-thinking-indicator';
            
            // Set initial text
            indicator.textContent = 'AI is thinking...';
            
            // Set inline styles to ensure immediate application
            Object.assign(indicator.style, {
                position: 'fixed',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '10px 20px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                borderRadius: '5px',
                zIndex: '1000',
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                display: show ? 'block' : 'none',
                transition: 'opacity 0.2s'
            });
            
            // Add a pulsing dot for visual feedback
            const pulsingDot = document.createElement('span');
            pulsingDot.className = 'pulsing-dot';
            Object.assign(pulsingDot.style, {
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: '#4A6FA5',
                borderRadius: '50%',
                marginLeft: '8px',
                animation: 'pulse 1.5s infinite'
            });
            
            // Define the animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                    100% { opacity: 0.4; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
            
            indicator.appendChild(pulsingDot);
            document.body.appendChild(indicator);
            
            // Force a reflow to ensure styles are applied
            indicator.offsetHeight;
        }
        
        const indicator = document.getElementById('ai-thinking-indicator');
        indicator.style.display = show ? 'block' : 'none';
        
        // Flash animation when showing
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
            // Find and preserve the pulsing dot (last child)
            const pulsingDot = indicator.lastChild;
            
            // Update text and reattach the dot
            indicator.textContent = text;
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