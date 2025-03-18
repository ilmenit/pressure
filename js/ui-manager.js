/**
 * UI Manager - Main class that initializes and coordinates UI components
 * Refactored to use event-driven architecture
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.events = game.events;
        this.board = game.board;
        this.moveManager = game.moveManager;
        this.gameState = game.gameState;
        
        this.selectedTokenPos = null;
        this.possibleMoves = [];
        
        // Initialize UI components first
        this.statusManager = new UIStatusManager(this);
        this.dragHandler = new UIDragHandler(this);
        
        // Setup win modal after statusManager is initialized
        this.setupWinModal();
        
        // Setup UI event listeners after components are initialized
        this.setupEventListeners();
        
        // Setup game event listeners after UI components are ready
        this.setupGameEventListeners();
    }

    /**
     * Set up game event listeners
     */
    setupGameEventListeners() {
        // Listen for game initialization
        this.events.on('game:initialized', (data) => {
            // Update UI for current player
            const currentPlayer = data.currentPlayer.charAt(0).toUpperCase() + data.currentPlayer.slice(1);
            
            if ((data.currentPlayer === 'white' && data.whitePlayerType === 'ai') ||
                (data.currentPlayer === 'black' && data.blackPlayerType === 'ai')) {
                this.updateStatus(`${currentPlayer} turn. AI is thinking...`, "thinking");
            } else {
                this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
            }
            
            // Update draggable tokens
            this.makeTokensDraggable();
        });
        
        // Listen for turn changes
        this.events.on('turn:changed', (data) => {
            if (!data.isAI) {
                const currentPlayer = data.player.charAt(0).toUpperCase() + data.player.slice(1);
                this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
                this.makeTokensDraggable();
            }
        });
        
        // Listen for AI thinking
        this.events.on('ai:thinking', (data) => {
            const currentPlayer = data.player.charAt(0).toUpperCase() + data.player.slice(1);
            this.updateStatus(`${currentPlayer} turn. AI is thinking...`, "thinking");
        });
        
        // Listen for AI progress
        this.events.on('ai:progress', (progress) => {
            this.handleAIProgress(progress);
        });
        
        // Listen for AI move selection
        this.events.on('ai:moveSelected', (data) => {
            const currentPlayer = data.player.charAt(0).toUpperCase() + data.player.slice(1);
            this.updateStatus(`${currentPlayer} turn. AI has selected a move.`, "thinking");
        });
        
        // Listen for move execution
        this.events.on('move:executed', () => {
            // Clear any selected token
            this.clearSelection();
        });
        
        // Listen for game over
        this.events.on('game:over', (data) => {
            if (!this.game.isTournamentMode) {
                this.showWinModal(data.winner, data.reason);
            }
        });
        
        // Listen for board rendered
        this.events.on('board:rendered', () => {
            this.makeTokensDraggable();
        });
        
        // Listen for undo/redo
        this.events.on('undo:completed', () => {
            this.updateUndoRedoButtons();
            this.updateGameState();
        });
        
        this.events.on('redo:completed', () => {
            this.updateUndoRedoButtons();
            this.updateGameState();
        });
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Board cell click events
        this.board.boardElement.addEventListener('click', (event) => {
            if (!this.game.isGameActive) return;
            
            // Only skip click handling if drag truly occurred and mouse was moved
            if (this.dragHandler.dragOccurred && this.dragHandler.mouseWasMoved) {
                return;
            }
            
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
        if (this.statusManager) {
            this.statusManager.setupWinModal();
        } else {
            console.error("Status manager not initialized yet");
        }
    }

    /**
     * Handle AI progress updates
     * @param {Object} progress - Progress information from AI
     */
    handleAIProgress(progress) {
        this.statusManager.handleAIProgress(progress);
    }

    /**
     * Show the win modal
     */
    showWinModal(winner, reason) {
        this.statusManager.showWinModal(winner, reason);
    }

    /**
     * Update status message
     */
    updateStatus(text, state = "normal") {
        this.statusManager.updateStatus(text, state);
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
        
        // Update draggable tokens
        this.makeTokensDraggable();
        
        // Emit UI event
        this.events.emit('ui:gameStarted', {
            blackPlayerType,
            whitePlayerType,
            blackAILevel,
            whiteAILevel
        });
    }

    /**
     * Open the menu
     */
    openMenu() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        
        // Emit UI event
        this.events.emit('ui:menuOpened', {
            timestamp: Date.now()
        });
    }

    /**
     * Resume the game
     */
    resumeGame() {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Emit UI event
        this.events.emit('ui:gameResumed', {
            timestamp: Date.now()
        });
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
        
        // Emit UI event
        this.events.emit('ui:tokenSelected', {
            position: { row, col },
            player: this.game.currentPlayer,
            possibleMoves: this.possibleMoves
        });
    }

    /**
     * Clear the current selection
     */
    clearSelection() {
        this.selectedTokenPos = null;
        this.possibleMoves = [];
        this.board.clearHighlights();
        
        // Additionally clear valid drop targets
        document.querySelectorAll('.cell.valid-drop-target').forEach(cell => {
            cell.classList.remove('valid-drop-target');
        });
        
        // Reset status message (only if game is active and not during dragging)
        if (this.game.isGameActive && !this.dragHandler.isDragging) {
            const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
            this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
        }
        
        // Emit UI event
        this.events.emit('ui:selectionCleared', {
            timestamp: Date.now()
        });
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
     * Update the game state display based on current game state
     */
    updateGameState() {
        // If the game is over, show result
        if (!this.game.isGameActive && this.game.winner) {
            // Check for tournament mode before showing the standard win modal
            if (this.game.isTournamentMode && this.game.tournamentManager) {
                // Let tournament manager handle the victory UI
                // Don't show the standard win modal
                return;
            }
            
            this.showWinModal(this.game.winner, this.game.winReason);
            return;
        }
        
        // Otherwise show current player's turn
        const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
        
        if (this.game.isHumanTurn()) {
            this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
            // Update draggable tokens
            this.makeTokensDraggable();
        } else {
            // AI's turn - set initial message, AI component will update it
            this.updateStatus(`${currentPlayer} turn. AI is thinking...`, "thinking");
        }
    }

    /**
     * Make tokens appear draggable by adding visual cues
     */
    makeTokensDraggable() {
        // Add draggable class to all applicable tokens
        document.querySelectorAll('.cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const token = this.board.getTokenAt(row, col);
            
            const tokenElement = cell.querySelector('.token');
            if (tokenElement) {
                // Remove draggable class first
                tokenElement.classList.remove('draggable');
                
                // Add draggable class to tokens that are valid to move
                if (token && token.color === this.game.currentPlayer && 
                    token.isActive === true && !token.isCaptured && 
                    this.game.isHumanTurn()) {
                    tokenElement.classList.add('draggable');
                }
            }
        });
    }

    /**
     * Update the state of undo/redo buttons
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        // Handle tournament mode - hide undo/redo buttons
        if (this.game.isTournamentMode) {
            if (undoBtn) undoBtn.classList.add('hidden');
            if (redoBtn) redoBtn.classList.add('hidden');
            return;
        } else {
            if (undoBtn) undoBtn.classList.remove('hidden');
            if (redoBtn) redoBtn.classList.remove('hidden');
        }
        
        if (undoBtn) {
            undoBtn.disabled = !this.gameState.canUndo();
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.gameState.canRedo();
        }
    }

    /**
     * Undo the last move
     */
    undoMove() {
        // Don't allow undo in tournament mode
        if (this.game.isTournamentMode) return false;
        
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
        // Don't allow redo in tournament mode
        if (this.game.isTournamentMode) return false;
        
        if (this.game.redoMove()) {
            this.clearSelection();
            
            // Update game status
            this.updateGameState();
            
            // If we're now on an AI's turn and the game is active, 
            // trigger the AI move or redo the next move
            if (this.game.isGameActive && !this.game.isHumanTurn()) {
                if (this.gameState.canRedo()) {
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

// Extend the Board's renderBoard method to update draggable tokens
const originalRenderBoard = Board.prototype.renderBoard;
Board.prototype.renderBoard = function() {
    // Call original method
    originalRenderBoard.call(this);
    
    // Update draggable tokens if the game and UI exist
    if (window.game && window.game.ui) {
        window.game.ui.makeTokensDraggable();
    }
};

// Initialize drag support when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if the game instance exists
    if (window.game && window.game.ui) {
        // Drag events are set up in the UIManager constructor via UIDragHandler
        console.log("UI Manager initialized");
    }
});