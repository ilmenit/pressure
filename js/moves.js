/**
 * MoveManager handles move validation, generation, and execution
 */
class MoveManager {
    constructor(board) {
        this.board = board;
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
     */
    executeMove(move, currentPlayer) {
        const oppositeColor = currentPlayer === 'black' ? 'white' : 'black';
        
        if (move.type === 'move') {
            // Simple move to empty space
            this.board.moveToken(move.from.row, move.from.col, move.to.row, move.to.col);
        } else if (move.type === 'push') {
            // Execute push
            this.executePush(move, currentPlayer, oppositeColor);
        }
        
        // Check for tokens that are now surrounded
        const transformedTokens = this.board.checkAndTransformSurroundedTokens();
        
        // Update the board display
        this.board.renderBoard();
        
        return transformedTokens;
    }

    /**
     * Execute a push move
     */
    executePush(move, currentPlayer, oppositeColor) {
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
        }
        
        // Move the pushing token to the destination
        this.board.moveToken(move.from.row, move.from.col, move.to.row, move.to.col);
        
        // Check for surrounded tokens after all movement
        this.board.checkAndTransformSurroundedTokens();
        
        // Make all pushed opponent tokens inactive
        for (let i = 0; i < pushedOpponentTokens.length; i++) {
            const pos = pushedOpponentTokens[i];
            const token = this.board.getTokenAt(pos.row, pos.col);
            if (token && token.color === oppositeColor && !token.isCaptured) {
                token.isActive = false;
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