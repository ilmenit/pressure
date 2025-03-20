/**
 * MoveManager handles move validation, generation, and execution
 * Refactored to use event-driven architecture
 */
class MoveManager {
    constructor(board, game) {
        this.board = board;
        this.game = game;
        this.events = game && game.events ? game.events : null;
        this.directions = [
            { dr: -1, dc: 0, name: 'up' },    // Up
            { dr: 1, dc: 0, name: 'down' },   // Down
            { dr: 0, dc: -1, name: 'left' },  // Left
            { dr: 0, dc: 1, name: 'right' }   // Right
        ];
    }

    /**
     * Generate all possible moves for a given color
     */
    generatePossibleMoves(color) {
        let moves = [];
        
        // Check each cell in the grid
        for (let row = 0; row < this.board.size; row++) {
            for (let col = 0; col < this.board.size; col++) {
                const token = this.board.getTokenAt(row, col);
                
                // Check if there is a token of the right color that is active and not captured
                if (token && token.color === color && token.isActive === true && !token.isCaptured) {
                    // For each direction
                    this.directions.forEach(dir => {
                        const destRow = row + dir.dr;
                        const destCol = col + dir.dc;
                        
                        // Check if destination is within bounds
                        if (this.isValidPosition(destRow, destCol)) {
                            const destToken = this.board.getTokenAt(destRow, destCol);
                            
                            if (!destToken) {
                                // Simple move to empty space
                                moves.push({
                                    from: { row, col },
                                    to: { row: destRow, col: destCol },
                                    type: 'move',
                                    direction: dir.name
                                });
                            } else {
                                // Possible push
                                const result = this.validatePush(row, col, dir.dr, dir.dc);
                                if (result.valid) {
                                    moves.push({
                                        from: { row, col },
                                        to: { row: destRow, col: destCol },
                                        type: 'push',
                                        direction: dir.name,
                                        tokens: result.tokensToPush
                                    });
                                }
                            }
                        }
                    });
                }
            }
        }
        
        // Emit moves:generated event
        if (this.events) {
            this.events.emit('moves:generated', {
                color: color,
                count: moves.length
            });
        }
        
        return moves;
    }

    /**
     * Check if a position is valid (within board bounds)
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.board.size && col >= 0 && col < this.board.size;
    }

    /**
     * Validate a push move
     */
    validatePush(startRow, startCol, dr, dc) {
        const pusherToken = this.board.getTokenAt(startRow, startCol);
        if (!pusherToken || pusherToken.isActive === false || pusherToken.isCaptured) {
            return { valid: false };
        }

        // Get destination position
        const destRow = startRow + dr;
        const destCol = startCol + dc;
        const destToken = this.board.getTokenAt(destRow, destCol);
        
        if (!destToken) {
            return { valid: false }; // Can't push into an empty space
        }
        
        // Find all connected tokens starting from destination
        let tokensToPush = [];
        let row = destRow;
        let col = destCol;
        
        // Count tokens in the push line
        while (this.isValidPosition(row, col)) {
            const token = this.board.getTokenAt(row, col);
            if (!token) break;
            
            tokensToPush.push({ row, col });
            row += dr;
            col += dc;
        }
        
        // Check if the last position (after all pushed tokens) is empty
        const lastRow = destRow + (tokensToPush.length * dr);
        const lastCol = destCol + (tokensToPush.length * dc);
        
        const canPush = this.isValidPosition(lastRow, lastCol) && 
                      this.board.getTokenAt(lastRow, lastCol) === null;
        
        return {
            valid: canPush,
            tokensToPush: tokensToPush
        };
    }

	/**
	 * Execute a move
	 * @param {Object} move - The move to execute
	 * @param {string} currentPlayer - The current player color
	 * @param {boolean} skipRendering - Whether to skip rendering (used for AI simulation)
	 * @param {Object} options - Additional options
	 * @returns {Array} - Captured tokens during this move
	 */
	executeMove(move, currentPlayer, skipRendering = false, options = {}) {
		const oppositeColor = currentPlayer === 'black' ? 'white' : 'black';
		
		// Determine if this is an AI simulation or the actual AI move
		const isAISimulation = skipRendering && !options.isActualAIMove;
		const isActualAIMove = options.isActualAIMove || false;
		
		// Emit move:executing event
		if (this.events) {
			this.events.emit('move:executing', {
				move: move,
				player: currentPlayer,
				forAISimulation: isAISimulation,
				isActualAIMove: isActualAIMove
			});
		}
		
		if (move.type === 'move') {
			// Simple move to empty space
			this.board.moveToken(move.from.row, move.from.col, move.to.row, move.to.col);
			
			// Check for surrounded tokens after a simple move, passing options
			const capturedTokens = this.board.checkAndTransformSurroundedTokens({
				forAISimulation: isAISimulation,
				isActualAIMove: isActualAIMove
			});
			
			// Emit move:simple event
			if (this.events) {
				this.events.emit('move:simple', {
					from: move.from,
					to: move.to,
					player: currentPlayer,
					capturedTokens: capturedTokens,
					forAISimulation: isAISimulation,
					isActualAIMove: isActualAIMove
				});
			}
		} else if (move.type === 'push') {
			// Execute push
			this.executePush(move, currentPlayer, oppositeColor, {
				forAISimulation: isAISimulation,
				isActualAIMove: isActualAIMove
			});
			
			// Emit move:push event
			if (this.events) {
				this.events.emit('move:push', {
					move: move,
					player: currentPlayer,
					direction: move.direction,
					forAISimulation: isAISimulation,
					isActualAIMove: isActualAIMove
				});
			}
		}
		
		// Update the board display only if not in simulation mode
		if (!skipRendering) {
			this.board.renderBoard();
		}
		
		// Return any tokens that were captured during this move
		return this.board.getLastCapturedTokens();
	}

	/**
	 * Execute a push move
	 * @param {Object} move - The push move
	 * @param {string} currentPlayer - Current player color
	 * @param {string} oppositeColor - Opposite player color
	 * @param {Object} options - Additional options
	 */
	executePush(move, currentPlayer, oppositeColor, options = {}) {
		const { dr, dc } = this.getDirectionVector(move.direction);
		
		// Get all tokens in the line to be pushed (from the destination)
		let tokensInLine = [];
		let row = move.to.row;
		let col = move.to.col;
		
		while (this.isValidPosition(row, col)) {
			const token = this.board.getTokenAt(row, col);
			if (!token) break;
			
			tokensInLine.push({ row, col });
			row += dr;
			col += dc;
		}
		
		// Track which opponent tokens are pushed
		const pushedOpponentTokens = [];
		
		// Move tokens starting from the end (to avoid overwriting)
		for (let i = tokensInLine.length - 1; i >= 0; i--) {
			const tokenPos = tokensInLine[i];
			const tokenObj = this.board.getTokenAt(tokenPos.row, tokenPos.col);
			const isOpponentToken = tokenObj && tokenObj.color === oppositeColor;
			
			const newRow = tokenPos.row + dr;
			const newCol = tokenPos.col + dc;
			
			this.board.moveToken(tokenPos.row, tokenPos.col, newRow, newCol);
			
			// Track pushed opponent tokens by their new position
			if (isOpponentToken && !tokenObj.isCaptured) {
				pushedOpponentTokens.push({ row: newRow, col: newCol });
			}
			
			// Check for surrounded tokens after each individual token movement
			this.board.checkAndTransformSurroundedTokens(options);
		}
		
		// Move the pushing token to the destination
		this.board.moveToken(move.from.row, move.from.col, move.to.row, move.to.col);
		
		// Check for surrounds after the pusher moves too
		this.board.checkAndTransformSurroundedTokens(options);
		
		// Make all pushed opponent tokens inactive
		for (let i = 0; i < pushedOpponentTokens.length; i++) {
			const pos = pushedOpponentTokens[i];
			const token = this.board.getTokenAt(pos.row, pos.col);
			if (token && token.color === oppositeColor && !token.isCaptured) {
				token.isActive = false;
				
				// Emit token:deactivated event
				if (this.events) {
					this.events.emit('token:deactivated', {
						position: pos,
						color: oppositeColor,
						forAISimulation: options.forAISimulation,
						isActualAIMove: options.isActualAIMove
					});
				}
			}
		}
	}

    /**
     * Convert direction name to vector
     */
    getDirectionVector(direction) {
        const dirMap = {
            'up': { dr: -1, dc: 0 },
            'down': { dr: 1, dc: 0 },
            'left': { dr: 0, dc: -1 },
            'right': { dr: 0, dc: 1 }
        };
        return dirMap[direction];
    }
}