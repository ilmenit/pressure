/**
 * AI Player with optimized move/undo system
 * Refactored to use event-driven architecture with simulation context
 * Enhanced with transposition table for performance optimization
 */
class AIPlayer {
    constructor(board, moveManager, gameState, game) {
        this.board = board;
        this.moveManager = moveManager;
        this.gameState = gameState;
        this.game = game;
        this.events = game ? game.events : null;
        this.difficulty = 5; // Default difficulty (1-9 scale)
        this.nodesEvaluated = 0;
        this.isThinking = false;
        this.thinkingStartTime = 0;
        
        // Transposition table optimization
        this.transpositionTable = new Map();
        this.tableCacheHits = 0;
        this.maxTableSize = 1000000; // Limit table size to prevent memory issues
        
        // Set up event listeners
        if (this.events) {
            this.setupEventListeners();
        }
    }

    /**
     * Set up event listeners for AI-related events
     */
    setupEventListeners() {
        // Listen for turn changes
        this.events.on('turn:changed', (data) => {
            if (data.isAI && !this.isThinking) {
                // AI turn is now handled by the Game class, this is just for monitoring
                this.isThinking = true;
                this.thinkingStartTime = performance.now();
            }
        });
        
        // Listen for AI move completion
        this.events.on('ai:moveExecuted', () => {
            this.isThinking = false;
            const thinkingTime = performance.now() - this.thinkingStartTime;
            
            if (this.game.events) {
                this.game.events.emit('ai:thinkingCompleted', {
                    duration: thinkingTime
                });
            }
        });
    }

    /**
     * Set difficulty level (1-9 scale)
     */
    setStrength(difficulty) {
        this.difficulty = Math.max(1, Math.min(9, difficulty));
        
        // Emit event for difficulty change
        if (this.events) {
            this.events.emit('ai:difficultySet', {
                level: this.difficulty
            });
        }
    }

    /**
     * Clear and reset the transposition table
     */
    clearTranspositionTable() {
        this.transpositionTable.clear();
        this.tableCacheHits = 0;
    }

    /**
     * Generate a hash for the current board state
     * @returns {string} A unique string representation of the board
     */
    getBoardHash() {
        let hash = '';
        
        // Include board representation with tokens
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (!token) {
                    hash += '0';
                } else if (token.color === 'white') {
                    hash += token.isCaptured ? '1' : '2';
                } else { // black
                    hash += token.isCaptured ? '3' : '4';
                }
            }
        }
        
        // Include active status separately for clarity
        hash += '-';
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                if (token && !token.isCaptured) {
                    hash += token.isActive ? '1' : '0';
                }
            }
        }
        
        return hash;
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
        
        // Clear transposition table for a fresh search
        this.clearTranspositionTable();
        
        // Emit AI thinking started event
        if (this.events) {
            this.events.emit('ai:thinkingStarted', {
                color: color,
                difficulty: this.difficulty
            });
        }
        
        // Begin simulation context - all events emitted during AI thinking will be marked as simulated
        if (this.events) {
            this.events.beginSimulation();
        }
        
        try {
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
                
                // Emit AI thinking completed event
                if (this.events) {
                    this.events.emit('ai:noMovesFound', {
                        color: color
                    });
                }
                
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
                
                // Emit AI thinking completed event
                if (this.events) {
                    this.events.emit('ai:singleMoveFound', {
                        color: color,
                        move: possibleMoves[0]
                    });
                }
                
                return possibleMoves[0];
            }
            
            // Filter out moves that lead to immediate self-capture
            const nonSuicidalMoves = this.filterObviouslySuicidalMoves(possibleMoves, color);
            const movesToConsider = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : possibleMoves;
            
            // Adjust search depth based on available moves to prevent very slow turns
            let searchDepth = this.difficulty;
            if (movesToConsider.length > 8 && searchDepth > 6) {
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
            
            // Emit AI search depth event
            if (this.events) {
                this.events.emit('ai:searchDepthSet', {
                    depth: searchDepth,
                    movesCount: movesToConsider.length
                });
            }
            
            // Evaluate all moves with proper depth search
            const evaluatedMoves = [];
            let completedMoves = 0;
            
            for (const move of movesToConsider) {
                // Apply the move with AI simulation options
                this.applyMove(move, color);
                
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
                this.gameState.undoLastMove();
                
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
                    
                    // Emit AI progress event
                    if (this.events) {
                        this.events.emit('ai:evaluationProgress', {
                            progress: progress,
                            completed: completedMoves,
                            total: movesToConsider.length
                        });
                    }
                }
            }
            
            // Sort moves by score (best first)
            evaluatedMoves.sort((a, b) => b.score - a.score);
            
            // Print performance info
            const cacheEfficiency = this.nodesEvaluated > 0 ? 
                Math.round(this.tableCacheHits / this.nodesEvaluated * 100) : 0;
                
            console.log(`AI evaluated ${this.nodesEvaluated} positions at depth ${searchDepth}`);
            console.log(`Transposition table hits: ${this.tableCacheHits} (${cacheEfficiency}% cache efficiency)`);
            console.log(`Table size: ${this.transpositionTable.size} entries`);
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
            
            // Emit AI move selected event
            if (this.events) {
                this.events.emit('ai:moveEvaluated', {
                    color: color,
                    move: selectedMove,
                    evaluatedMoves: evaluatedMoves.length,
                    nodesEvaluated: this.nodesEvaluated,
                    cacheHits: this.tableCacheHits,
                    thinkingTime: performance.now() - this.thinkingStartTime
                });
            }
            
            return selectedMove;
        }
        finally {
            // Always end the simulation context, even if there's an error
            if (this.events) {
                this.events.endSimulation();
            }
        }
    }
    
    /**
     * Filter out moves that lead to immediate self-capture
     */
    filterObviouslySuicidalMoves(moves, color) {
        const safeMoves = [];
        
        for (const move of moves) {
            // Apply this move for AI simulation
            this.applyMove(move, color);
            
            // Check if any of our tokens were captured
            const capturedTokens = this.board.getLastCapturedTokens();
            const selfCapture = capturedTokens && capturedTokens.some(token => token.color === color);
            
            // Undo the move
            this.gameState.undoLastMove();
            
            // Keep only non-suicidal moves
            if (!selfCapture) {
                safeMoves.push(move);
            }
        }
        
        return safeMoves;
    }
    
    /**
     * Apply a move for AI simulation
     */
    applyMove(move, color) {
        // Apply the move with AI simulation options
        // We use forAISimulation: true to ensure we use the efficient minimal state tracking approach
        // resetActiveStatus: false because we're just simulating, not actually starting a new turn
        return this.gameState.applyMove(move, color, {
            skipRendering: true,
            resetActiveStatus: false
        });
    }
    
	/**
	 * Principal Variation Search (PVS) - A more efficient minimax variant
	 * This replaces the original minimax method in AIPlayer class
	 * 
	 * @param {number} depth - Current search depth
	 * @param {string} color - Current player color
	 * @param {number} alpha - Alpha value for pruning
	 * @param {number} beta - Beta value for pruning
	 * @param {boolean} isMaximizing - Whether this is a maximizing node
	 * @returns {number} - Evaluation score
	 */
	minimax(depth, color, alpha, beta, isMaximizing) {
		this.nodesEvaluated++;
		const oppositeColor = color === 'black' ? 'white' : 'black';
		
		// Create hash key for current board position
		const boardHash = this.getBoardHash();
		const hashKey = `${boardHash}:${depth}:${isMaximizing ? 1 : 0}`;
		
		// Check transposition table for cached result
		if (this.transpositionTable.has(hashKey)) {
			this.tableCacheHits++;
			return this.transpositionTable.get(hashKey);
		}
		
		// Terminal node checks
		const capturedCounts = this.board.countCapturedTokens();
		
		// Check for wins/losses
		if (capturedCounts[oppositeColor] >= 6) {
			const result = isMaximizing ? 1 : -1; // Win
			this.storeTranspositionResult(hashKey, result);
			return result;
		}
		
		if (capturedCounts[color] >= 6) {
			const result = isMaximizing ? -1 : 1; // Loss
			this.storeTranspositionResult(hashKey, result);
			return result;
		}
		
		// Leaf node - evaluate position
		if (depth === 0) {
			// Convert score from 0-1 range to -1 to 1 range
			const score = (this.evaluatePosition(color) * 2) - 1;
			const result = isMaximizing ? score : -score;
			this.storeTranspositionResult(hashKey, result);
			return result;
		}
		
		// Check for no valid moves
		const possibleMoves = this.moveManager.generatePossibleMoves(color);
		if (possibleMoves.length === 0) {
			const result = isMaximizing ? -1 : 1; // Loss - no moves
			this.storeTranspositionResult(hashKey, result);
			return result;
		}
		
		// Order moves to improve alpha-beta pruning
		possibleMoves.sort((a, b) => {
			// Prefer pushes over simple moves
			if (a.type === 'push' && b.type !== 'push') return -1;
			if (a.type !== 'push' && b.type === 'push') return 1;
			return 0;
		});

		// FIXED: Simplify implementation and fix null window search issues
		if (isMaximizing) {
			let maxEval = -Infinity;
			let firstChild = true;
			
			for (let i = 0; i < possibleMoves.length; i++) {
				this.applyMove(possibleMoves[i], color);
				
				let score;
				if (firstChild) {
					// First child is searched with full window
					score = this.minimax(depth - 1, oppositeColor, alpha, beta, false);
					firstChild = false;
				} else {
					// FIXED: Use appropriate epsilon for floating-point scores
					// We search with a null window first
					score = this.minimax(depth - 1, oppositeColor, alpha, alpha + 0.0001, false);
					
					// FIXED: Correct condition for re-search
					if (score > alpha) {
						// If the move looks promising, re-search with full window
						score = this.minimax(depth - 1, oppositeColor, alpha, beta, false);
					}
				}
				
				this.gameState.undoLastMove();
				
				if (score > maxEval) {
					maxEval = score;
				}
				
				alpha = Math.max(alpha, maxEval);
				
				// Alpha-beta pruning
				if (alpha >= beta) {
					break;
				}
			}
			
			this.storeTranspositionResult(hashKey, maxEval);
			return maxEval;
		} else {
			let minEval = Infinity;
			let firstChild = true;
			
			for (let i = 0; i < possibleMoves.length; i++) {
				this.applyMove(possibleMoves[i], color);
				
				let score;
				if (firstChild) {
					// First child is searched with full window
					score = this.minimax(depth - 1, oppositeColor, alpha, beta, true);
					firstChild = false;
				} else {
					// FIXED: Use appropriate epsilon for floating-point scores
					// We search with a null window first
					score = this.minimax(depth - 1, oppositeColor, beta - 0.0001, beta, true);
					
					// FIXED: Correct condition for re-search
					if (score < beta) {
						// If the move looks promising, re-search with full window
						score = this.minimax(depth - 1, oppositeColor, alpha, beta, true);
					}
				}
				
				this.gameState.undoLastMove();
				
				if (score < minEval) {
					minEval = score;
				}
				
				beta = Math.min(beta, minEval);
				
				// Alpha-beta pruning
				if (alpha >= beta) {
					break;
				}
			}
			
			this.storeTranspositionResult(hashKey, minEval);
			return minEval;
		}
	}
    
    /**
     * Store result in transposition table with memory management
     */
    storeTranspositionResult(key, value) {
        // Implement a simple memory management strategy
        if (this.transpositionTable.size >= this.maxTableSize) {
            // If table gets too large, clear the older half to avoid memory issues
            // This is a simple approach - more sophisticated replacement strategies exist
            if (this.transpositionTable.size >= this.maxTableSize * 0.9) {
                const entries = Array.from(this.transpositionTable.entries());
                const halfSize = Math.floor(entries.length / 2);
                
                this.transpositionTable = new Map(entries.slice(halfSize));
                
                console.log(`Transposition table pruned to ${this.transpositionTable.size} entries`);
            }
        }
        
        // Store the result
        this.transpositionTable.set(key, value);
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
		
		// Check if opponent has any active tokens left (win condition)
		let hasActiveOppTokens = false;
		for (let row = 0; row < this.board.size; row++) {
			for (let col = 0; col < this.board.size; col++) {
				const token = this.board.getTokenAt(row, col);
				if (token && token.color === oppositeColor && token.isActive && !token.isCaptured) {
					hasActiveOppTokens = true;
					break;
				}
			}
			if (hasActiveOppTokens) break;
		}
		
		// If opponent has no active tokens, they'll have no valid moves on their turn = win
		if (!hasActiveOppTokens) {
			return 1.0; // Win - opponent has no active tokens
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
}