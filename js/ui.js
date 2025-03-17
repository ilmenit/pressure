/**
 * UI Manager handles user interface interactions and events
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.board = game.board;
        this.moveManager = game.moveManager;
        this.gameState = game.gameState;
        this.selectedTokenPos = null;
        this.possibleMoves = [];
        
        // For drag operations
        this.isDragging = false;
        this.draggedTokenPos = null;
        this.dragGhost = null;
        this.validDropTargets = [];
        this.dragOccurred = false; // Flag to track if a drag operation occurred
        
        // Detect if we're on a touch device
        this.isTouchDevice = ('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
        
        this.setupEventListeners();
        this.setupWinModal();
        this.setupDragEvents();
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Board cell click events with improved check to prevent conflict with drag
        this.board.boardElement.addEventListener('click', (event) => {
            if (!this.game.isGameActive) return;
            
            // FIXED: Improved drag detection to fix clicking issue
            // Only skip click handling if drag truly occurred and mouse was moved
            if (this.dragOccurred && this.mouseWasMoved) {
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
     * Set up the drag events
     */
    setupDragEvents() {
        // FIXED: Added tracking of mouse movement during drag
        this.mouseWasMoved = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // Mouse events for desktop
        this.board.boardElement.addEventListener('mousedown', this.handleDragStart.bind(this));
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        
        // Touch events for mobile
        if (this.isTouchDevice) {
            this.board.boardElement.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: false });
            document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.handleDragEnd.bind(this));
        }
        
        // Create drag ghost element if it doesn't exist
        if (!document.getElementById('drag-ghost')) {
            this.dragGhost = document.createElement('div');
            this.dragGhost.id = 'drag-ghost';
            this.dragGhost.className = 'drag-ghost';
            this.dragGhost.style.display = 'none';
            document.body.appendChild(this.dragGhost);
        } else {
            this.dragGhost = document.getElementById('drag-ghost');
        }
    }

    /**
     * Handle the start of a drag operation
     */
    handleDragStart(event) {
        // Only allow dragging if it's a human player's turn and not already dragging
        if (!this.game.isHumanTurn() || this.isDragging) {
            return;
        }
        
        // Get the clicked cell and token
        const cell = event.target.closest('.cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const token = this.board.getTokenAt(row, col);
        
        // Check if clicked on a valid token to drag (must be active and belong to current player)
        if (token && 
            token.color === this.game.currentPlayer && 
            token.isActive === true && 
            !token.isCaptured) {
            
            // Prevent default to avoid text selection during drag
            event.preventDefault();
            
            // Start dragging
            this.isDragging = true;
            this.draggedTokenPos = { row, col };
            
            // FIXED: Track starting position for movement detection
            this.mouseWasMoved = false;
            this.dragStartX = this.isTouchDevice ? event.touches[0].clientX : event.clientX;
            this.dragStartY = this.isTouchDevice ? event.touches[0].clientY : event.clientY;
            
            // Show drag ghost
            const tokenElement = cell.querySelector('.token');
            if (tokenElement) {
                // Set ghost appearance based on token color
                this.dragGhost.style.backgroundColor = token.color === 'white' ? '#f0f0f0' : '#222222';
                this.dragGhost.style.border = token.color === 'white' ? '2px solid #cccccc' : '2px solid #111111';
                this.dragGhost.style.display = 'block';
                
                // Position ghost at cursor
                const x = this.isTouchDevice ? event.touches[0].clientX : event.clientX;
                const y = this.isTouchDevice ? event.touches[0].clientY : event.clientY;
                this.dragGhost.style.left = `${x}px`;
                this.dragGhost.style.top = `${y}px`;
                
                // Add dragging class to original token
                tokenElement.classList.add('dragging');
            }
            
            // Generate and highlight valid drop targets
            this.highlightValidDropTargets(row, col);
        }
    }

    /**
     * Handle the dragging motion
     */
    handleDragMove(event) {
        if (!this.isDragging || !this.dragGhost) return;
        
        // Prevent default to avoid scrolling on touch devices
        if (this.isTouchDevice) {
            event.preventDefault();
        }
        
        // Get current position
        const x = this.isTouchDevice ? event.touches[0].clientX : event.clientX;
        const y = this.isTouchDevice ? event.touches[0].clientY : event.clientY;
        
        // FIXED: Check if mouse has moved enough to consider it a drag
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If moved more than 5px, consider it a genuine drag
        if (distance > 5) {
            this.mouseWasMoved = true;
        }
        
        // Move ghost element with cursor
        this.dragGhost.style.left = `${x}px`;
        this.dragGhost.style.top = `${y}px`;
    }

    /**
     * Handle dropping the token
     */
    handleDragEnd(event) {
        if (!this.isDragging) return;
        
        // FIXED: Only consider it a drag if mouse was genuinely moved
        this.dragOccurred = this.mouseWasMoved;
        
        // Only process the drop if it was a genuine drag
        if (this.mouseWasMoved) {
            // Get the cursor position
            const x = this.isTouchDevice && event.changedTouches ? 
                event.changedTouches[0].clientX : event.clientX;
            const y = this.isTouchDevice && event.changedTouches ? 
                event.changedTouches[0].clientY : event.clientY;
            
            // Find the cell under the cursor
            const elements = document.elementsFromPoint(x, y);
            const cell = elements.find(el => el.classList.contains('cell'));
            
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                // Check if this is a valid drop target
                if (this.validDropTargets.some(target => target.row === row && target.col === col)) {
                    // Find and execute the move
                    const move = this.findMoveToPosition(row, col);
                    if (move) {
                        this.executeMove(move);
                    }
                }
            }
        }
        
        // Clean up dragging state
        this.endDragOperation();
    }

    /**
     * Find and highlight valid drop targets
     */
    highlightValidDropTargets(row, col) {
        // Clear any existing selection
        this.clearSelection();
        
        // Select the token and find possible moves
        this.selectedTokenPos = { row, col };
        
        // Generate possible moves for this token
        const allMoves = this.moveManager.generatePossibleMoves(this.game.currentPlayer);
        this.possibleMoves = allMoves.filter(move => 
            move.from.row === row && move.from.col === col
        );
        
        // Get possible destinations to highlight
        this.validDropTargets = this.possibleMoves.map(move => move.to);
        
        // Highlight valid drop targets with a special class
        this.validDropTargets.forEach(target => {
            const targetCell = this.board.boardElement.querySelector(
                `.cell[data-row="${target.row}"][data-col="${target.col}"]`
            );
            if (targetCell) {
                targetCell.classList.add('valid-drop-target');
            }
        });
        
        // Update status to show token is being dragged
        const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
        this.updateStatus(`${currentPlayer} turn. Dragging token. Drop on a highlighted cell.`);
    }

    /**
     * Clean up after dragging ends
     */
    endDragOperation() {
        // Reset dragging state
        this.isDragging = false;
        
        // Hide ghost element
        if (this.dragGhost) {
            this.dragGhost.style.display = 'none';
        }
        
        // Remove dragging class from original token
        if (this.draggedTokenPos) {
            const cell = this.board.boardElement.querySelector(
                `.cell[data-row="${this.draggedTokenPos.row}"][data-col="${this.draggedTokenPos.col}"]`
            );
            if (cell) {
                const tokenElement = cell.querySelector('.token');
                if (tokenElement) {
                    tokenElement.classList.remove('dragging');
                }
            }
        }
        
        // Clear selected position and valid drop targets
        this.draggedTokenPos = null;
        
        // Remove valid-drop-target class from all cells
        document.querySelectorAll('.cell.valid-drop-target').forEach(cell => {
            cell.classList.remove('valid-drop-target');
        });
        
        // Clear selection and reset status if no move was made
        this.clearSelection();
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
        const undoButton = document.getElementById('win-modal-undo');
        
        // FIX: Hide undo button in tournament mode
        if (this.game.isTournamentMode && undoButton) {
            undoButton.style.display = 'none';
        } else if (undoButton) {
            undoButton.style.display = 'inline-block';
        }
        
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
        
        // Update draggable tokens
        this.makeTokensDraggable();
        
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
        
        // Additionally clear valid drop targets
        document.querySelectorAll('.cell.valid-drop-target').forEach(cell => {
            cell.classList.remove('valid-drop-target');
        });
        
        this.validDropTargets = [];
        
        // Reset status message (only if game is active and not during dragging)
        if (this.game.isGameActive && !this.isDragging) {
            const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
            this.updateStatus(`${currentPlayer} turn. Select piece to move.`);
        }
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
                // Reset to normal status when AI is done thinking
                const currentPlayer = this.game.currentPlayer.charAt(0).toUpperCase() + this.game.currentPlayer.slice(1);
                this.updateStatus(`${currentPlayer} turn. AI has made its move.`, "normal");
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
            // FIX: Check for tournament mode before showing the standard win modal
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
        
        // FIXED: Handle tournament mode - hide undo/redo buttons
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
        // FIXED: Don't allow undo in tournament mode
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
        // FIXED: Don't allow redo in tournament mode
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
        // Make sure drag events are set up
        if (!window.game.ui.dragGhost) {
            window.game.ui.setupDragEvents();
        }
    }
});