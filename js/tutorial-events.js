/**
 * tutorial-events.js
 * Manages event handling and coordination for the tutorial
 */
class TutorialEventHandler {
    constructor(tutorialService) {
        this.tutorialService = tutorialService;
        this.game = tutorialService.game;
        this.events = tutorialService.events;
        
        // Store bound handlers for proper removal
        this.boundHandlers = {};
        
        // Track last selected position for click-then-move pattern
        this.lastSelectedPosition = null;
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        if (!this.events) return;
        
        // Create bound handlers for events
        this.boundHandlers = {
            tokenSelected: this.handleTokenSelected.bind(this),
            moveExecuted: this.handleMoveExecuted.bind(this),
            tokenCaptured: this.handleTokenCaptured.bind(this),
            selectionCleared: this.handleSelectionCleared.bind(this),
            boardRendered: this.handleBoardRendered.bind(this),
            dragStarted: this.handleDragStarted.bind(this),
            dragDropped: this.handleDragDropped.bind(this)
        };
        
        // Register event listeners
        this.events.on('ui:tokenSelected', this.boundHandlers.tokenSelected);
        this.events.on('move:executed', this.boundHandlers.moveExecuted);
        this.events.on('token:captured', this.boundHandlers.tokenCaptured);
        this.events.on('ui:selectionCleared', this.boundHandlers.selectionCleared);
        this.events.on('board:rendered', this.boundHandlers.boardRendered);
        this.events.on('drag:started', this.boundHandlers.dragStarted);
        this.events.on('drag:dropped', this.boundHandlers.dragDropped);
        
        // Add custom event listener for selection preservation
        this.addSelectionPreservationHandler();
    }
    
    /**
     * Add custom handler to preserve selection during click-then-move
     */
    addSelectionPreservationHandler() {
        // Select the board element
        const boardElement = this.game.board.boardElement;
        if (!boardElement) return;
        
        // Add mouse event listener to detect mouseup events
        boardElement.addEventListener('mouseup', (event) => {
            if (!this.tutorialService.isActive) return;
            
            // If we have a last selected position, check if we're in a selection-move sequence
            if (this.lastSelectedPosition && this.tutorialService.isInSelectionMoveSequence()) {
                // Re-select the token after a brief delay
                setTimeout(() => {
                    // Only re-select if still in tutorial mode and we still want to preserve selection
                    if (this.tutorialService.isActive && this.tutorialService.isInSelectionMoveSequence()) {
                        const ui = this.game.ui;
                        if (ui && ui.selectToken) {
                            ui.selectToken(this.lastSelectedPosition.row, this.lastSelectedPosition.col);
                        }
                    }
                }, 50);
            }
        });
    }
    
    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        if (!this.events || !this.boundHandlers) return;
        
        // Remove all registered event listeners
        this.events.off('ui:tokenSelected', this.boundHandlers.tokenSelected);
        this.events.off('move:executed', this.boundHandlers.moveExecuted);
        this.events.off('token:captured', this.boundHandlers.tokenCaptured);
        this.events.off('ui:selectionCleared', this.boundHandlers.selectionCleared);
        this.events.off('board:rendered', this.boundHandlers.boardRendered);
        this.events.off('drag:started', this.boundHandlers.dragStarted);
        this.events.off('drag:dropped', this.boundHandlers.dragDropped);
    }
    
    /**
     * Handle token selection event
     */
    handleTokenSelected(data) {
        if (!this.tutorialService.isActive) return;
        
        // Store the last selected position for click-then-move pattern
        this.lastSelectedPosition = data.position;
        
        // Pass to tutorial service
        this.tutorialService.handleTokenSelected(data);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:actionPerformed', {
                type: 'tokenSelected',
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handle move execution event
     */
    handleMoveExecuted(data) {
        if (!this.tutorialService.isActive) return;
        
        // Reset last selected position
        this.lastSelectedPosition = null;
        
        // Pass to tutorial service
        this.tutorialService.handleMoveExecuted(data);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:actionPerformed', {
                type: 'moveExecuted',
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handle token capture event
     */
    handleTokenCaptured(data) {
        if (!this.tutorialService.isActive) return;
        
        // Pass to tutorial service
        this.tutorialService.handleTokenCaptured(data);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:actionPerformed', {
                type: 'tokenCaptured',
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handle selection cleared event - preserve selection if needed
     */
    handleSelectionCleared() {
        if (!this.tutorialService.isActive) return;
        
        // If we're in a selection-move sequence, don't clear the selection
        if (this.lastSelectedPosition && this.tutorialService.isInSelectionMoveSequence()) {
            // Re-apply selection after a brief delay to let native events complete
            setTimeout(() => {
                const ui = this.game.ui;
                if (ui && ui.selectToken) {
                    ui.selectToken(this.lastSelectedPosition.row, this.lastSelectedPosition.col);
                }
            }, 50);
            return;
        }
        
        // Otherwise, reapply highlights from current step
        const step = this.tutorialService.stepManager.getStep(this.tutorialService.currentStepIndex);
        if (step) {
            const expectedActionIndex = this.tutorialService.stepManager.expectedActionIndex;
            
            if (expectedActionIndex < step.expectedActions.length) {
                const expectedAction = step.expectedActions[expectedActionIndex];
                
                // Apply highlights based on current expected action
                if (expectedAction.type === 'select' && expectedAction.position) {
                    this.tutorialService.applyHighlights([expectedAction.position]);
                } else if (expectedAction.highlightPositions) {
                    this.tutorialService.applyHighlights(expectedAction.highlightPositions);
                } else if (step.initialHighlights) {
                    this.tutorialService.applyHighlights(step.initialHighlights);
                }
            }
        }
    }
    
    /**
     * Handle board rendered event
     */
    handleBoardRendered() {
        if (!this.tutorialService.isActive) return;
        
        // Reapply highlights after board renders
        this.handleSelectionCleared();
    }
    
    /**
     * Handle drag started event
     */
    handleDragStarted(data) {
        if (!this.tutorialService.isActive) return;
        
        // Store last selected position for drag operations
        this.lastSelectedPosition = data.position;
        
        // Similar to token selected
        this.tutorialService.handleTokenSelected(data);
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:actionPerformed', {
                type: 'dragStarted',
                data: data,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Handle drag dropped event
     */
    handleDragDropped(data) {
        if (!this.tutorialService.isActive) return;
        
        // Reset selected position
        this.lastSelectedPosition = null;
        
        // Emit event
        if (this.events) {
            this.events.emit('tutorial:actionPerformed', {
                type: 'dragDropped',
                data: data,
                timestamp: Date.now()
            });
        }
    }
}