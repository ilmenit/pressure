/**
 * UI Drag Handler manages drag and drop operations for tokens
 */
class UIDragHandler {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.game = uiManager.game;
        this.board = uiManager.board;
        
        // For drag operations
        this.isDragging = false;
        this.draggedTokenPos = null;
        this.dragGhost = null;
        this.validDropTargets = [];
        this.dragOccurred = false; // Flag to track if a drag operation occurred
        this.mouseWasMoved = false; // Flag to track if mouse was genuinely moved
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        // Detect if we're on a touch device
        this.isTouchDevice = ('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
        
        this.setupDragEvents();
    }

    /**
     * Set up the drag events
     */
    setupDragEvents() {
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
            
            // Track starting position for movement detection
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
        
        // Check if mouse has moved enough to consider it a drag
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
        
        // Only consider it a drag if mouse was genuinely moved
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
                    const move = this.uiManager.findMoveToPosition(row, col);
                    if (move) {
                        this.uiManager.executeMove(move);
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
        this.uiManager.clearSelection();
        
        // Select the token and find possible moves
        this.uiManager.selectedTokenPos = { row, col };
        
        // Generate possible moves for this token
        const allMoves = this.uiManager.moveManager.generatePossibleMoves(this.game.currentPlayer);
        this.uiManager.possibleMoves = allMoves.filter(move => 
            move.from.row === row && move.from.col === col
        );
        
        // Get possible destinations to highlight
        this.validDropTargets = this.uiManager.possibleMoves.map(move => move.to);
        
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
        this.uiManager.updateStatus(`${currentPlayer} turn. Dragging token. Drop on a highlighted cell.`);
    }

    /**
     * Clean up after dragging ends
     */
    endDragOperation() {
        const inTutorialMode = window.tutorialService && window.tutorialService.isActive;
        const draggedPos = this.draggedTokenPos;
        
        // Reset dragging state
        this.isDragging = false;
        
        // Hide ghost element
        if (this.dragGhost) {
            this.dragGhost.style.display = 'none';
        }
        
        // Remove dragging class from original token
        if (draggedPos) {
            const cell = this.board.boardElement.querySelector(
                `.cell[data-row="${draggedPos.row}"][data-col="${draggedPos.col}"]`
            );
            if (cell) {
                const tokenElement = cell.querySelector('.token');
                if (tokenElement) {
                    tokenElement.classList.remove('dragging');
                }
            }
        }
        
        // Clear dragged position
        this.draggedTokenPos = null;
        
        // Remove valid-drop-target class from all cells
        document.querySelectorAll('.cell.valid-drop-target').forEach(cell => {
            cell.classList.remove('valid-drop-target');
        });
        
        // Special handling for tutorial mode - if it's just a click (not a real drag), 
        // maintain selection for tutorial
        if (inTutorialMode && !this.mouseWasMoved) {
            // In tutorial mode, we'll leave the selection intact for clicks
            // This enables the tutorial to work correctly
            return;
        }
        
        // If we're not in tutorial mode or this was a real drag, clear selection normally
        this.uiManager.clearSelection();
    }
}
