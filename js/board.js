/**
 * Board class handles the representation and rendering of the game board
 * Refactored to use event-driven architecture
 */
class Board {
    constructor(game) {
        this.game = game;
        // Access events either from game or global, consistently with other classes
        this.events = game && game.events ? game.events : (window.gameEvents || null);
        this.size = 5;
        this.grid = [];
        this.boardElement = document.querySelector('.board');
        this.lastMoveFrom = null;
        this.lastMoveTo = null;
        this.lastCapturedTokens = [];
        this.initialize();
    }

    /**
     * Initialize the board grid
     */
    initialize() {
        // Create empty grid
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        
        // Clear any existing board content
        if (this.boardElement) {
            this.boardElement.innerHTML = '';
            
            // Create board cells
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                    
                    this.boardElement.appendChild(cell);
                }
            }
        }
        
        // Clear last move data
        this.lastMoveFrom = null;
        this.lastMoveTo = null;
        this.lastCapturedTokens = [];
        
        // Emit board:initialized event
        if (this.events) {
            this.events.emit('board:initialized', {
                size: this.size
            });
        }
    }

    /**
     * Set up the initial token positions
     */
    setupInitialPosition() {
        // Clear the grid
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        
        // Clear last move data
        this.lastMoveFrom = null;
        this.lastMoveTo = null;
        this.lastCapturedTokens = [];
        
        // Initial positions for black tokens (a3, a4, b3, b5, c4, c5)
        const blackPositions = [
            {row: 2, col: 0}, // a3
            {row: 1, col: 0}, // a4
            {row: 2, col: 1}, // b3
            {row: 0, col: 1}, // b5
            {row: 1, col: 2}, // c4
            {row: 0, col: 2}  // c5
        ];
        
        // Initial positions for white tokens (c1, c2, d1, d3, e2, e3)
        const whitePositions = [
            {row: 4, col: 2}, // c1
            {row: 3, col: 2}, // c2
            {row: 4, col: 3}, // d1
            {row: 2, col: 3}, // d3
            {row: 3, col: 4}, // e2
            {row: 2, col: 4}  // e3
        ];
        
        // Place black tokens
        blackPositions.forEach(pos => {
            this.grid[pos.row][pos.col] = {
                color: 'black',
                isActive: true,
                isCaptured: false
            };
        });
        
        // Place white tokens
        whitePositions.forEach(pos => {
            this.grid[pos.row][pos.col] = {
                color: 'white',
                isActive: true,
                isCaptured: false
            };
        });
        
        this.renderBoard();
        
        // Emit board:setup event
        if (this.events) {
            this.events.emit('board:setup', {
                blackPositions,
                whitePositions
            });
        }
    }

    /**
     * Render the current state of the board
     */
    renderBoard() {
        if (!this.boardElement) return;
        
        const cells = this.boardElement.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            // Clear existing content
            cell.innerHTML = '';
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const token = this.grid[row][col];
            
            if (token) {
                const tokenElement = document.createElement('div');
                
                // Set token color class
                if (token.isCaptured) {
                    tokenElement.className = 'token captured';
                } else {
                    tokenElement.className = `token ${token.color}`;
                }
                
                // Mark inactive tokens
                if (!token.isActive) {
                    tokenElement.classList.add('inactive');
                }
                
                cell.appendChild(tokenElement);
            }
            
            // Add last move indicators
            if (this.lastMoveFrom && row === this.lastMoveFrom.row && col === this.lastMoveFrom.col) {
                const indicator = document.createElement('div');
                indicator.className = 'last-move-indicator';
                cell.appendChild(indicator);
            }
            
            if (this.lastMoveTo && row === this.lastMoveTo.row && col === this.lastMoveTo.col) {
                const indicator = document.createElement('div');
                indicator.className = 'last-move-indicator';
                cell.appendChild(indicator);
            }
        });
        
        // Emit board:rendered event
        if (this.events) {
            this.events.emit('board:rendered', {
                timestamp: Date.now()
            });
        }
    }

    /**
     * Set the last move for highlighting
     */
    setLastMove(from, to) {
        this.lastMoveFrom = from;
        this.lastMoveTo = to;
        
        // Emit lastMove:updated event
        if (this.events) {
            this.events.emit('lastMove:updated', {
                from: from,
                to: to
            });
        }
    }

    /**
     * Get token at the specified position
     */
    getTokenAt(row, col) {
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            return this.grid[row][col];
        }
        return null;
    }

    /**
     * Set token at the specified position
     */
    setTokenAt(row, col, token) {
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            const oldToken = this.grid[row][col];
            this.grid[row][col] = token;
            
            // Emit token:updated event
            if (this.events) {
                this.events.emit('token:updated', {
                    row: row,
                    col: col,
                    oldToken: oldToken,
                    newToken: token
                });
            }
        }
    }

    /**
     * Move a token from one position to another
     */
    moveToken(fromRow, fromCol, toRow, toCol) {
        const token = this.getTokenAt(fromRow, fromCol);
        
        if (!token) {
            console.error(`No token found at position [${fromRow}, ${fromCol}]`);
            return;
        }
        
        // Emit token:moving event
        if (this.events) {
            this.events.emit('token:moving', {
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                token: token
            });
        }
        
        this.setTokenAt(fromRow, fromCol, null);
        this.setTokenAt(toRow, toCol, token);
        
        // Update last move
        this.setLastMove({row: fromRow, col: fromCol}, {row: toRow, col: toCol});
        
        // Emit token:moved event
        if (this.events) {
            this.events.emit('token:moved', {
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                token: token
            });
        }
    }

    /**
     * Check if a token is surrounded on all four sides
     * (by other tokens or board edges)
     */
    isTokenSurrounded(row, col) {
        // Check board edges
        const isTopEdge = row === 0;
        const isBottomEdge = row === this.size - 1;
        const isLeftEdge = col === 0;
        const isRightEdge = col === this.size - 1;
        
        // Check adjacent cells
        const hasTokenAbove = isTopEdge || this.getTokenAt(row - 1, col) !== null;
        const hasTokenBelow = isBottomEdge || this.getTokenAt(row + 1, col) !== null;
        const hasTokenLeft = isLeftEdge || this.getTokenAt(row, col - 1) !== null;
        const hasTokenRight = isRightEdge || this.getTokenAt(row, col + 1) !== null;
        
        return hasTokenAbove && hasTokenBelow && hasTokenLeft && hasTokenRight;
    }

    /**
     * Check for and transform surrounded tokens (capture them)
     */
    checkAndTransformSurroundedTokens() {
        // Clear the last captured tokens array
        this.lastCapturedTokens = [];
        
        let captured = [];
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const token = this.getTokenAt(row, col);
                if (token && !token.isCaptured && this.isTokenSurrounded(row, col)) {
                    token.isCaptured = true;
                    
                    const captureInfo = { 
                        row, 
                        col, 
                        color: token.color
                    };
                    
                    captured.push(captureInfo);
                    
                    // Add to the last captured tokens array
                    this.lastCapturedTokens.push(captureInfo);
                    
                    // Emit token:captured event
                    if (this.events) {
                        this.events.emit('token:captured', {
                            row: row,
                            col: col,
                            color: token.color,
                            position: { row, col }
                        });
                    }
                    
                    // For backward compatibility
                    if (this.game) {
                        this.game.notifyTokenCaptured(token.color);
                    }
                }
            }
        }
        
        return captured;
    }

    /**
     * Reset active status for all tokens of a given color
     */
    resetActiveStatus(color) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const token = this.getTokenAt(row, col);
                if (token && token.color === color && !token.isCaptured) {
                    token.isActive = true;
                }
            }
        }
        
        // Emit tokens:activated event
        if (this.events) {
            this.events.emit('tokens:activated', {
                color: color
            });
        }
    }

    /**
     * Count the number of captured tokens of each color
     */
    countCapturedTokens() {
        let count = {
            black: 0,
            white: 0
        };
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const token = this.getTokenAt(row, col);
                if (token && token.isCaptured) {
                    count[token.color]++;
                }
            }
        }
        
        return count;
    }

    /**
     * Get the last tokens captured during the current move
     */
    getLastCapturedTokens() {
        return [...this.lastCapturedTokens];
    }

    /**
     * Get a deep copy of the current board state
     */
    getDeepCopy() {
        const gridCopy = [];
        
        for (let row = 0; row < this.size; row++) {
            gridCopy[row] = [];
            for (let col = 0; col < this.size; col++) {
                const token = this.grid[row][col];
                if (token) {
                    gridCopy[row][col] = {
                        color: token.color,
                        isActive: token.isActive,
                        isCaptured: token.isCaptured
                    };
                } else {
                    gridCopy[row][col] = null;
                }
            }
        }
        
        return gridCopy;
    }

    /**
     * Restore the board from a deep copy
     */
    restoreFromCopy(gridCopy) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                this.grid[row][col] = gridCopy[row][col];
            }
        }
        
        this.renderBoard();
        
        // Emit board:restored event
        if (this.events) {
            this.events.emit('board:restored', {
                timestamp: Date.now()
            });
        }
    }

    /**
     * Clear all highlights from the board cells
     */
    clearHighlights() {
        if (!this.boardElement) return;
        
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('highlight');
        });
        
        // Emit highlights:cleared event
        if (this.events) {
            this.events.emit('highlights:cleared', {
                timestamp: Date.now()
            });
        }
    }

    /**
     * Highlight cells that are possible moves
     */
    highlightCells(positions) {
        this.clearHighlights();
        
        if (!this.boardElement) return;
        
        positions.forEach(pos => {
            const cell = this.boardElement.querySelector(
                `.cell[data-row="${pos.row}"][data-col="${pos.col}"]`
            );
            if (cell) {
                cell.classList.add('highlight');
            }
        });
        
        // Emit cells:highlighted event
        if (this.events) {
            this.events.emit('cells:highlighted', {
                positions: positions
            });
        }
    }
}