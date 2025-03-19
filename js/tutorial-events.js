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
                    // Add null check for lastSelectedPosition to avoid potential errors
                    if (this.tutorialService.isActive && 
                        this.tutorialService.isInSelectionMoveSequence() &&
                        this.lastSelectedPosition) {
                        
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
        Object.keys(this.boundHandlers).forEach(eventName => {
            const handler = this.boundHandlers[eventName];
            if (handler) {
                this.events.off(eventName, handler);
            }
        });
        
        // Clear handlers to help garbage collection
        this.boundHandlers = {};
        
        // Clear last selected position
        this.lastSelectedPosition = null;
    }
    
    /**
     * Handle token selection event
     */
    handleTokenSelected(data) {
        if (!this.tutorialService.isActive) return;
        
        // Add null check for data and data.position before storing
        if (data && data.position) {
            // Create a copy of the position to avoid potential reference issues
            this.lastSelectedPosition = {
                row: data.position.row,
                col: data.position.col
            };
            
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
    }
    
    /**
     * Handle move execution event
     */
    handleMoveExecuted(data) {
        if (!this.tutorialService.isActive) return;
        
        // Reset last selected position
        this.lastSelectedPosition = null;
        
        // The actual move validation and execution happens in the executeMove override
        // This handler is now mainly for event notification and cleanup
        
        // Clear highlights after any move
        if (this.tutorialService.uiManager) {
            this.tutorialService.uiManager.clearHighlights();
        }
        
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
        
        // Don't reapply highlights if move has already been performed
        if (this.tutorialService.stepManager.movePerformed) {
            return;
        }
        
        // If we're in a selection-move sequence, don't clear the selection
        if (this.lastSelectedPosition && this.tutorialService.isInSelectionMoveSequence()) {
            // Re-apply selection after a brief delay to let native events complete
            setTimeout(() => {
                // Add null check for lastSelectedPosition
                if (this.lastSelectedPosition) {
                    const ui = this.game.ui;
                    if (ui && ui.selectToken) {
                        ui.selectToken(this.lastSelectedPosition.row, this.lastSelectedPosition.col);
                    }
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
        
        // Reapply highlights after board renders if no move has been performed yet
        if (!this.tutorialService.stepManager.movePerformed && 
            this.tutorialService.state === 'WAITING_FOR_ACTION') {
            
            // Small delay to ensure the board has fully rendered
            setTimeout(() => {
                this.handleSelectionCleared();
            }, 10);
        }
    }
    
    /**
     * Handle drag started event
     */
    handleDragStarted(data) {
        if (!this.tutorialService.isActive) return;
        
        // Add null check for data and data.position
        if (data && data.position) {
            // Create a copy of the position to avoid potential reference issues
            this.lastSelectedPosition = {
                row: data.position.row,
                col: data.position.col
            };
            
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