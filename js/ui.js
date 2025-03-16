/**
 * UI Manager handles user interface interactions and events
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.board = game.board;
        this.moveManager = game.moveManager;
        this.selectedTokenPos = null;
        this.possibleMoves = [];
        
        this.setupEventListeners();
        this.setupWinModal();
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Board cell click events
        this.board.boardElement.addEventListener('click', (event) => {
            if (!this.game.isGameActive) return;
            
            const cell = event.target.closest('.cell');
            if (!cell) return;
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            this.handleCellClick(row, col);
        });
        
        // Player type buttons
        document.querySelectorAll('.player-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const player = btn.dataset.player;
                const type = btn.dataset.type;
                
                // Update active state
                document.querySelectorAll(`.player-type-btn[data-player="${player}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                // Show/hide AI levels
                const aiLevelsContainer = document.querySelector(`.${player}-ai-levels`);
                if (type === 'ai') {
                    aiLevelsContainer.classList.remove('hidden');
                } else {
                    aiLevelsContainer.classList.add('hidden');
                }
            });
        });
        
        // AI level buttons
        document.querySelectorAll('.ai-level-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const player = btn.dataset.player;
                
                // Update active state
                document.querySelectorAll(`.ai-level-btn[data-player="${player}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
        
        // Start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Undo button
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undoMove();
        });
        
        // Redo button
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redoMove();
        });
        
        // Menu button
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.openMenu();
        });
        
        // Resume game button
        document.getElementById('resume-game-btn').addEventListener('click', () => {
            this.resumeGame();
        });

        // Win modal buttons
        document.getElementById('win-modal-undo').addEventListener('click', () => {
            document.getElementById('win-modal').classList.add('hidden');
            this.undoMove();
        });
        
        document.getElementById('win-modal-menu').addEventListener('click', () => {
            document.getElementById('win-modal').classList.add('hidden');
            this.openMenu();
        });
        
        // Window resize event
        window.addEventListener('resize', () => {
            // Redraw board on resize
            this.board.renderBoard();
        });
    }

    /**
     * Set up the win modal
     */
    setupWinModal() {
        // Check if win modal already exists
        if (!document.getElementById('win-modal')) {
            const modal = document.createElement('div');
            modal.id = 'win-modal';
            modal.className = 'modal hidden';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <h2 id="win-modal-title">Game Over</h2>
                    <p id="win-modal-message"></p>
                    <div class="modal-buttons">
                        <button id="win-modal-undo">Undo Last Move</button>
                        <button id="win-modal-menu">Return to Menu</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
    }

    /**
     * Show the win modal
     */
    showWinModal(winner, reason) {
        const modalTitle = document.getElementById('win-modal-title');
        const modalMessage = document.getElementById('win-modal-message');
        const modal = document.getElementById('win-modal');
        
        const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
        modalTitle.textContent = `${winnerName} Wins!`;
        modalMessage.textContent = reason;
        
        // Also update the game status
        this.updateStatus(`${winnerName} player won. ${reason}`, "error");
        
        modal.classList.remove('hidden');
    }

    /**
     * Start a new game
     */
    startGame() {
        // Clear any existing selection before starting a new game
        this.clearSelection();
        
        // Get player types
        const blackPlayerType = document.querySelector('.player-type-btn[data-player="black"].active').dataset.type;
        const whitePlayerType = document.querySelector('.player-type-btn[data-player="white"].active').dataset.type;
        
        // Get AI levels
        const blackAILevel = blackPlayerType === 'ai' 
            ? parseInt(document.querySelector('.ai-level-btn[data-player="black"].active').dataset.level)
            : 1;
        
        const whiteAILevel = whitePlayerType === 'ai'
            ? parseInt(document.querySelector('.ai-level-btn[data-player="white"].active').dataset.level)
            : 1;
        
        // Initialize the game
        this.game.initialize(blackPlayerType, whitePlayerType, blackAILevel, whiteAILevel);
        
        // Hide win modal if it's showing
        document.getElementById('win-modal').classList.add('hidden');
        
        // Show game screen, hide menu screen
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Show resume game button in menu for when user returns
        document.getElementById('resume-game-btn').classList.remove('hidden');
        
        // Update undo/redo buttons
        this.updateUndoRedoButtons();
        
        // Set initial game status based on whether the starting player is AI
        if ((this.game.currentPlayer === 'white' && this.game.whitePlayerType === 'ai') ||
            (this.game.currentPlayer === 'black' && this.game.blackPlayerType === 'ai')) {
            const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
            this.updateStatus(`${currentPlayer} turn. AI is thinking...`, "thinking");
        } else {
            const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
            this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
        }
    }

    /**
     * Open the menu
     */
    openMenu() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
    }

    /**
     * Resume the game
     */
    resumeGame() {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
    }

    /**
     * Handle cell click
     */
    handleCellClick(row, col) {
        // Check if it's a human player's turn
        if (!this.game.isHumanTurn()) {
            return;
        }
        
        const currentPlayerColor = this.game.currentPlayer;
        const token = this.board.getTokenAt(row, col);
        
        // If no token is selected yet
        if (!this.selectedTokenPos) {
            // Check if clicked on a valid token (must be active)
            if (token && token.color === currentPlayerColor && token.isActive === true && !token.isCaptured) {
                this.selectToken(row, col);
            }
            return;
        }
        
        // If a token is already selected
        
        // Clicked on the same token - deselect it
        if (this.selectedTokenPos.row === row && this.selectedTokenPos.col === col) {
            this.clearSelection();
            return;
        }
        
        // Check if this is a potential push of your own token
        // (Don't reselect if it could be a valid push destination)
        const isValidPushDestination = this.possibleMoves.some(move => 
            move.to.row === row && move.to.col === col
        );
        
        // Only reselect if it's not a valid push destination
        if (token && token.color === currentPlayerColor && token.isActive && 
            !token.isCaptured && !isValidPushDestination) {
            this.clearSelection();
            this.selectToken(row, col);
            return;
        }
        
        // Check if clicked on a valid destination
        const move = this.findMoveToPosition(row, col);
        if (move) {
            this.executeMove(move);
        }
    }

    /**
     * Select a token and show its possible moves
     */
    selectToken(row, col) {
        this.selectedTokenPos = { row, col };
        
        // Generate possible moves for this token
        const allMoves = this.moveManager.generatePossibleMoves(this.game.currentPlayer);
        this.possibleMoves = allMoves.filter(move => 
            move.from.row === row && move.from.col === col
        );
        
        // Highlight the selected token and possible destinations
        const possibleDestinations = this.possibleMoves.map(move => move.to);
        this.board.highlightCells([{ row, col }, ...possibleDestinations]);
        
        // Update status to show piece is selected
        const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
        this.updateStatus(`${currentPlayer} turn. Token selected. Choose destination.`);
    }

    /**
     * Clear the current selection
     */
    clearSelection() {
        this.selectedTokenPos = null;
        this.possibleMoves = [];
        this.board.clearHighlights();
        
        // Reset status message
        const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
        this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
    }

    /**
     * Find a move that targets the given position
     */
    findMoveToPosition(row, col) {
        return this.possibleMoves.find(move => 
            move.to.row === row && move.to.col === col
        );
    }

    /**
     * Execute a move and update the game state
     */
    executeMove(move) {
        this.game.executePlayerMove(move);
        this.clearSelection();
        this.updateGameState();
    }

    /**
     * Handle AI progress updates
     * @param {Object} progress - Progress information from AI
     */
    handleAIProgress(progress) {
        switch(progress.type) {
            case 'start':
                this.updateStatus(progress.message, "thinking");
                break;
                
            case 'depth':
            case 'progress':
                this.updateStatus(progress.message, "thinking");
                break;
                
            case 'end':
                this.updateStatus(progress.message, "thinking");
                break;
                
            default:
                console.warn("Unknown AI progress type:", progress.type);
        }
    }

    /**
     * Update the game state display based on current game state
     */
    updateGameState() {
        // If the game is over, show result
        if (!this.game.isGameActive && this.game.winner) {
            this.showWinModal(this.game.winner, this.game.winReason);
            return;
        }
        
        // Otherwise show current player's turn
        const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
        
        if (this.game.isHumanTurn()) {
            this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
        } else {
            // AI's turn - set initial message, AI component will update it
            this.updateStatus(`${currentPlayer} turn. AI is thinking...`, "thinking");
            
            // Use setTimeout to ensure UI updates before AI processing
            setTimeout(() => {
                this.game.executeAIMove();
            }, 100);
        }
    }
    
    /**
     * Centralized method to update the game status text
     * @param {string} text - The status message
     * @param {string} state - The state type (normal, thinking, error)
     */
    updateStatus(text, state = "normal") {
        const statusText = document.getElementById('status-text');
        if (!statusText) return;
        
        // Remove any existing status dot
        const existingDot = statusText.querySelector('.status-dot');
        if (existingDot) {
            existingDot.remove();
        }
        
        // Set the text
        statusText.textContent = text;
        
        // Add pulsing dot for thinking state
        if (state === "thinking") {
            const dot = document.createElement('span');
            dot.className = 'status-dot';
            statusText.appendChild(dot);
        }
        
        // Set the appropriate class
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.className = 'game-status';
            statusElement.classList.add(`status-${state}`);
        }
    }

    /**
     * Update the state of undo/redo buttons
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = this.game.moveHistory.length === 0;
        redoBtn.disabled = this.game.redoStack.length === 0;
    }

    /**
     * Undo the last move
     */
    undoMove() {
        if (this.game.undoMove()) {
            this.clearSelection();
            
            // Make sure the board is re-rendered with the updated last move indicators
            this.board.renderBoard();
            
            // Update game status
            this.updateGameState();
            
            // If we're now on an AI's turn and the game is active, 
            // we need to undo one more time to get to a human turn
            if (this.game.isGameActive && !this.game.isHumanTurn()) {
                setTimeout(() => this.undoMove(), 10);
            }
        }
    }

    /**
     * Redo a previously undone move
     */
    redoMove() {
        if (this.game.redoMove()) {
            this.clearSelection();
            
            // Make sure the board is re-rendered with the updated last move indicators
            this.board.renderBoard();
            
            // Update game status
            this.updateGameState();
            
            // If we're now on an AI's turn and the game is active, 
            // trigger the AI move or redo the next move
            if (this.game.isGameActive && !this.game.isHumanTurn()) {
                if (this.game.redoStack.length > 0) {
                    // If there's a move to redo, use that
                    setTimeout(() => this.redoMove(), 10);
                } else {
                    // Otherwise let the AI calculate a new move
                    setTimeout(() => this.game.executeAIMove(), 100);
                }
            }
        }
    }
}