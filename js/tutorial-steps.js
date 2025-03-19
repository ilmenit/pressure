/**
 * tutorial-steps.js
 * Manages tutorial step definitions and validation logic
 */
class TutorialStepManager {
    constructor(tutorialService) {
        this.tutorialService = tutorialService;
        this.game = tutorialService.game;
        this.board = tutorialService.board;
        this.events = tutorialService.events;
        
        // Current expected action
        this.expectedActionIndex = 0;
        this.stepCompleted = false;
        this.isRetrying = false;
        
        // Track if a move has been made
        this.movePerformed = false;
        
        // Step definitions
        this.steps = this.defineSteps();
    }
    
    /**
     * Define all tutorial steps
     */
    defineSteps() {
        return [
            // Step 1: Basic Movement
            {
                id: "basic-movement",
                title: "Basic Movement",
                instructions: "You can move tokens in two ways: Click to select and click again to move, or drag and drop. Try moving your white token to an adjacent space.",
                boardSetup: [
                    { row: 2, col: 2, color: 'white' }
                ],
                initialHighlights: [{ row: 2, col: 2 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 2 },
                        nextInstructions: "Now click on a highlighted cell to move your token.",
                        highlightPositions: [
                            { row: 1, col: 2 }, // Up
                            { row: 3, col: 2 }, // Down
                            { row: 2, col: 1 }, // Left
                            { row: 2, col: 3 }  // Right
                        ]
                    },
                    {
                        type: 'move',
                        validDestinations: [
                            { row: 1, col: 2 }, { row: 3, col: 2 }, 
                            { row: 2, col: 1 }, { row: 2, col: 3 }
                        ],
                        nextInstructions: "Great! You can move to any adjacent empty space.",
                        completesStep: true
                    }
                ]
            },
            
            // Step 2: Turn Alternation
            {
                id: "turn-alternation",
                title: "Taking Turns",
                instructions: "In Pressure, players take turns. Make a move with your white token.",
                boardSetup: [
                    { row: 2, col: 2, color: 'white' },
                    { row: 1, col: 0, color: 'black' }
                ],
                initialHighlights: [{ row: 2, col: 2 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 2 },
                        nextInstructions: "Select a destination for your token."
                    },
                    {
                        type: 'move',
                        nextInstructions: "Now the black player (AI) will take their turn.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.showContinueButton();
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 3: Basic Pushing
            {
                id: "basic-pushing",
                title: "Basic Pushing",
                instructions: "You can push tokens if there's an empty space at the end of the line. Try pushing the black token by moving right.",
                boardSetup: [
                    { row: 2, col: 1, color: 'white' },
                    { row: 2, col: 2, color: 'black' }
                    // Empty space at 2,3
                ],
                initialHighlights: [{ row: 2, col: 1 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 1 },
                        nextInstructions: "To push the black token, move your white token to the right into the black token's position.",
                        highlightPositions: [{ row: 2, col: 2 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 2, col: 2 }],
                        errorMessage: "Please push the black token to the right. Try again.",
                        nextInstructions: "Pushed opponent tokens become inactive for their next turn (marked with red dot).",
                        onComplete: function(tutorialService) {
                            // Highlight the inactive token after push
                            setTimeout(() => {
                                tutorialService.uiManager.highlightInactiveToken();
                                tutorialService.uiManager.showContinueButton();
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 4: Multi-Token Pushing
            {
                id: "multi-token-pushing",
                title: "Multi-Token Pushing",
                instructions: "You can push multiple tokens at once. Try pushing this line of tokens to the right.",
                boardSetup: [
                    { row: 2, col: 0, color: 'white' },
                    { row: 2, col: 1, color: 'black' },
                    { row: 2, col: 2, color: 'white' },
                    { row: 2, col: 3, color: 'black' }
                    // Empty space at 2,3
                ],
                initialHighlights: [{ row: 2, col: 0 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 0 },
                        nextInstructions: "Now push the line of tokens by moving to the right into the black token's position.",
                        highlightPositions: [{ row: 2, col: 1 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 2, col: 1 }],
                        errorMessage: "Please push the tokens to the right. Try again.",
                        nextInstructions: "Pushed opponent tokens become inactive after being pushed. Opponent cannot move them the next turn.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightInactiveToken();
                                tutorialService.uiManager.showContinueButton();
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 5: Token Capture
            {
                id: "token-capture",
                title: "Token Capture",
                instructions: "When a token is surrounded on all four sides, it's captured. Move your token to surround the black token, to capture it.",
                boardSetup: [
                    { row: 2, col: 1, color: 'white' }, // Left of target
                    { row: 1, col: 2, color: 'white' }, // Above target
                    { row: 3, col: 2, color: 'white' }, // Below target
                    { row: 2, col: 2, color: 'black' }, // Target for capture
                    { row: 2, col: 4, color: 'white' }  // Player's token to move
                ],
                initialHighlights: [{ row: 2, col: 4 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 2, col: 4 },
                        nextInstructions: "Move your token left to capture the black token.",
                        highlightPositions: [{ row: 2, col: 3 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 2, col: 3 }],
                        errorMessage: "Please move your token left to complete the capture. Try again.",
                        nextInstructions: "Captured tokens turn blue and cannot be moved directly, but they can still be pushed."
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data && data.color === 'black' && 
                                  data.position && data.position.row === 2 && 
                                  data.position.col === 2;
                        },
                        nextInstructions: "Capturing all opponent tokens is one way to win the game.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                tutorialService.uiManager.showContinueButton();
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 6: Edge Capture Strategy
            {
                id: "edge-capture",
                title: "Edge Capture Strategy",
                instructions: "Board edges count as surroundings too! Position your token to complete the capture using fewer pieces.",
                boardSetup: [
                    { row: 4, col: 1, color: 'black' },  // Target for edge capture (moved to bottom)
                    { row: 4, col: 0, color: 'white' },  // Left of target
                    { row: 3, col: 1, color: 'white' },  // Above target
                    { row: 4, col: 3, color: 'white' }   // Player's token to move
                ],
                initialHighlights: [{ row: 4, col: 3 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 4, col: 3 },
                        nextInstructions: "Move your token left to capture the black token using the board edge.",
                        highlightPositions: [{ row: 4, col: 2 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 4, col: 2 }],
                        errorMessage: "Please move your token left to complete the edge capture. Try again.",
                        nextInstructions: "Using the board edges makes capturing easier - only 3 tokens needed at an edge, and just 2 in a corner!"
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data && data.color === 'black' && 
                                  data.position && data.position.row === 4 && 
                                  data.position.col === 1;
                        },
                        nextInstructions: "You completed an edge capture with fewer tokens!",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                tutorialService.uiManager.showContinueButton();
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 7: Victory Conditions - updated for pushing multiple tokens upward
            {
                id: "victory-conditions",
                title: "Victory Conditions",
                instructions: "To capture token you may also surround it with opponent tokens.",
                boardSetup: [
                    // New setup for pushing tokens upward
                    { row: 4, col: 2, color: 'white' },  // Player's token at bottom
                    { row: 3, col: 2, color: 'black' },  // Token above player
                    { row: 2, col: 2, color: 'black' },  // One more above
                    { row: 1, col: 1, color: 'black' },  // Token to capture
                    { row: 0, col: 1, color: 'white' },  // Above black
                    { row: 1, col: 0, color: 'white' },  // Left of black
                    { row: 2, col: 1, color: 'white' },  // Under of black
                ],
                initialHighlights: [{ row: 4, col: 2 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 4, col: 2 },
                        nextInstructions: "Try pushing multiple tokens upward to make the final capture.",
                        highlightPositions: [{ row: 3, col: 2 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 3, col: 2 }],
                        errorMessage: "Please push upward. Try again.",
                        nextInstructions: "You win the game when opponent has no tokens to move."
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data && data.color === 'black' &&
                                  data.position && data.position.row === 1 &&
                                  data.position.col === 1;
                        },
                        nextInstructions: "Congratulations! You win the game when opponent has no tokens to move.\n\nTry Tournament Mode to challenge a series of AI opponents with increasing difficulty.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                setTimeout(() => {
                                    tutorialService.showTutorialComplete();
                                }, 3000);
                            }, 1000);
                        }
                    }
                ]
            }
        ];
    }
    
    /**
     * Get a specific step by index
     */
    getStep(index) {
        if (index < 0 || index >= this.steps.length) {
            return null;
        }
        return this.steps[index];
    }
    
    /**
     * Get the total number of steps
     */
    getTotalSteps() {
        return this.steps.length;
    }
    
    /**
     * Handle token selection
     */
    handleTokenSelected(data) {
        // Don't allow actions if move has already been performed
        if (this.movePerformed) return;
        
        if (!data || !data.position) return;
        
        const step = this.getStep(this.tutorialService.currentStepIndex);
        if (!step) return;
        
        const expectedAction = step.expectedActions[this.expectedActionIndex];
        
        // If we're not expecting a selection, ignore this event
        if (expectedAction.type !== 'select') {
            return;
        }
        
        // Get the selected token
        const token = this.board.getTokenAt(data.position.row, data.position.col);
        if (!token || token.color !== 'white' || token.isCaptured) {
            // Invalid selection
            return;
        }
        
        // Check if this is the expected token
        if (expectedAction.position && 
            (data.position.row !== expectedAction.position.row || 
             data.position.col !== expectedAction.position.col)) {
            // Wrong token, highlight the correct one
            this.tutorialService.applyHighlights([expectedAction.position]);
            return;
        }
        
        // Valid selection - update instructions
        if (expectedAction.nextInstructions) {
            this.tutorialService.uiManager.showInstructions(
                step.title, 
                expectedAction.nextInstructions,
                this.tutorialService.currentStepIndex + 1,
                this.getTotalSteps()
            );
        }
        
        // Apply new highlights if specified
        if (expectedAction.highlightPositions) {
            this.tutorialService.applyHighlights(expectedAction.highlightPositions);
        }
        
        // Advance to next expected action
        this.expectedActionIndex++;
    }
    
    /**
     * Determine the direction of a move
     * @param {Object} from - The starting position {row, col}
     * @param {Object} to - The ending position {row, col}
     * @returns {string} The direction ('up', 'down', 'left', 'right')
     */
    determineDirection(from, to) {
        if (!from || !to) return '';
        
        if (from.row > to.row) return 'up';
        if (from.row < to.row) return 'down';
        if (from.col > to.col) return 'left';
        if (from.col < to.col) return 'right';
        return ''; // Same position (should not happen)
    }
    
    /**
     * Handle token capture
     */
    handleTokenCaptured(data) {
        const step = this.getStep(this.tutorialService.currentStepIndex);
        if (!step) return;
        
        // See if the next action is a capture
        if (this.expectedActionIndex >= step.expectedActions.length) {
            return;
        }
        
        const expectedAction = step.expectedActions[this.expectedActionIndex];
        
        // If we're not expecting a capture, check if we can skip ahead
        if (expectedAction.type !== 'capture') {
            // Look ahead to see if the next event is a capture
            for (let i = this.expectedActionIndex; i < step.expectedActions.length; i++) {
                if (step.expectedActions[i].type === 'capture') {
                    this.expectedActionIndex = i;
                    this.handleTokenCaptured(data);
                    return;
                }
            }
            return;
        }
        
        // Validate the capture if validation function exists
        if (expectedAction.validateCapture && !expectedAction.validateCapture(data)) {
            // Wrong capture
            return;
        }
        
        // Valid capture - update instructions
        if (expectedAction.nextInstructions) {
            this.tutorialService.uiManager.showInstructions(
                step.title, 
                expectedAction.nextInstructions,
                this.tutorialService.currentStepIndex + 1,
                this.getTotalSteps()
            );
        }
        
        // Execute any after-completion logic
        if (expectedAction.onComplete) {
            expectedAction.onComplete(this.tutorialService);
        }
        
        // If this completes the step, show continue button
        if (expectedAction.completesStep) {
            this.tutorialService.uiManager.showContinueButton();
        } 
        // Otherwise advance to next expected action if not handled by onComplete
        else if (!expectedAction.onComplete) {
            this.expectedActionIndex++;
        }
    }
    
    /**
     * Reset the current step to try again
     */
    retryCurrentStep() {
        // Reset flags
        this.isRetrying = false;
        this.movePerformed = false;
        
        // Reset to the beginning of the current step
        this.tutorialService.loadStep(this.tutorialService.currentStepIndex);
    }
    
    /**
     * Reset the expected action index
     */
    resetExpectedAction() {
        this.expectedActionIndex = 0;
        this.isRetrying = false;
        this.movePerformed = false;
        this.stepCompleted = false;
    }
}