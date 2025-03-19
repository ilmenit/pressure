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
        this.waitingForAction = false;
        this.isRetrying = false;
        this.waitingForContinue = false;
        
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
                        nextInstructions: "Great! You can move to any adjacent empty space (up, down, left, or right). Take a moment to understand this movement.",
                        completesStep: true,
                        displayDuration: 3000 // Show text for 3 seconds before showing continue button
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
                    { row: 1, col: 0, color: 'black' } // Moved from (1,1) to (1,0) to avoid pushing problems
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
                            // Simulate AI move after a delay - using a single deterministic move
                            setTimeout(() => {
                                // Use the black token positioned at (1,0)
                                const blackTokenPos = { row: 1, col: 0 };
                                
                                // Move it one space down - (2,0)
                                const moveDestination = { row: 2, col: 0 };
                                
                                // Highlight the black token
                                tutorialService.applyHighlights([blackTokenPos]);
                                
                                // After a delay, move it
                                setTimeout(() => {
                                    tutorialService.board.moveToken(
                                        blackTokenPos.row, 
                                        blackTokenPos.col, 
                                        moveDestination.row, 
                                        moveDestination.col
                                    );
                                    tutorialService.board.renderBoard();
                                    
                                    // Show completion message
                                    setTimeout(() => {
                                        tutorialService.uiManager.showInstructions(
                                            "Taking Turns",
                                            "Each player moves one token per turn. White always goes first. Take a moment to observe this turn sequence.",
                                            tutorialService.currentStepIndex + 1,
                                            tutorialService.stepManager.getTotalSteps()
                                        );
                                        // Clear all highlights
                                        tutorialService.uiManager.clearHighlights();
                                        // Show continue button after a delay to give time to read
                                        setTimeout(() => {
                                            tutorialService.uiManager.showContinueButton();
                                        }, 3000);
                                    }, 1000);
                                }, 1500);
                            }, 1500);
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
                        validateDirection: 'right', // Validate specific direction
                        errorMessage: "Please push the black token to the right. Try again.",
                        nextInstructions: "When pushing, the entire connected line moves one space. Notice how it works.",
                        onComplete: function(tutorialService) {
                            // Highlight the inactive token after push
                            setTimeout(() => {
                                tutorialService.uiManager.showInstructions(
                                    "Basic Pushing",
                                    "Notice that the black token now has a red dot. Pushed opponent tokens become inactive for their next turn. Take some time to observe this.",
                                    tutorialService.currentStepIndex + 1,
                                    tutorialService.stepManager.getTotalSteps()
                                );
                                tutorialService.uiManager.highlightInactiveToken();
                                // Show continue button after a delay to give time to read
                                setTimeout(() => {
                                    tutorialService.uiManager.showContinueButton();
                                }, 3000);
                            }, 1500);
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
                    { row: 2, col: 2, color: 'white' }
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
                        validateDirection: 'right', // Validate specific direction
                        errorMessage: "Please push the tokens to the right. Try again.",
                        nextInstructions: "Good job! You pushed multiple tokens at once. Let's see what happens.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.showInstructions(
                                    "Multi-Token Pushing",
                                    "Notice that only the black token became inactive (red dot). Your own tokens remain active when pushed. This is an important strategic point.",
                                    tutorialService.currentStepIndex + 1,
                                    tutorialService.stepManager.getTotalSteps()
                                );
                                tutorialService.uiManager.highlightInactiveToken();
                                // Show continue button after a delay to give time to read
                                setTimeout(() => {
                                    tutorialService.uiManager.showContinueButton();
                                }, 3000);
                            }, 1500);
                        }
                    }
                ]
            },
            
            // Step 5: Token Capture
            {
                id: "token-capture",
                title: "Token Capture",
                instructions: "When a token is surrounded on all four sides, it's captured. Move your token to the right of the black token to capture it.",
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
                        nextInstructions: "Move to the right of the black token to surround and capture it.",
                        highlightPositions: [{ row: 2, col: 3 }]
                    },
                    {
                        type: 'move',
                        validDestinations: [{ row: 2, col: 3 }],
                        validateDirection: 'left', // Validate specific direction
                        errorMessage: "Please move to position (2,3) to complete the capture. Try again.",
                        nextInstructions: "Excellent! You're about to surround the black token from all four sides."
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data.color === 'black' && 
                                  data.position.row === 2 && 
                                  data.position.col === 2;
                        },
                        nextInstructions: "Captured tokens turn blue and cannot be moved directly, but they can still be pushed.",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                setTimeout(() => {
                                    tutorialService.uiManager.showInstructions(
                                        "Token Capture",
                                        "Capturing all opponent tokens is one way to win the game. Captured tokens stay captured for the rest of the game.",
                                        tutorialService.currentStepIndex + 1,
                                        tutorialService.stepManager.getTotalSteps()
                                    );
                                    // Show continue button after a delay to give time to read
                                    setTimeout(() => {
                                        tutorialService.uiManager.showContinueButton();
                                    }, 3000);
                                }, 1000);
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
                        nextInstructions: "Move to position (4,2) to capture the black token using the board edge.",
                        highlightPositions: [{ row: 4, col: 2 }]
                    },
                    {
                        type: 'move',
                        validateMove: (move) => {
                            return move.to.row === 4 && move.to.col === 2;
                        },
                        errorMessage: "Please move to position (4,2) to complete the edge capture. Try again.",
                        nextInstructions: "Great move! You're about to capture the black token using the board edge."
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data.color === 'black' && 
                                  data.position.row === 4 && 
                                  data.position.col === 1;
                        },
                        nextInstructions: "Smart move! Using the board edges makes capturing easier - only 3 tokens needed at an edge, and just 2 in a corner!",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                // Show continue button after a delay to give time to read
                                setTimeout(() => {
                                    tutorialService.uiManager.showContinueButton();
                                }, 2000);
                            }, 1000);
                        }
                    }
                ]
            },
            
            // Step 7: Victory Conditions
            {
                id: "victory-conditions",
                title: "Victory Conditions",
                instructions: "The goal is to win by either capturing all opponent tokens or leaving them no valid moves.",
                boardSetup: [
                    { row: 1, col: 1, color: 'black' },   // Last opponent token
                    { row: 0, col: 1, color: 'white' },   // Above target
                    { row: 1, col: 0, color: 'white' },   // Left of target
                    { row: 2, col: 1, color: 'white' },   // Below target
                    { row: 1, col: 3, color: 'white' }    // Player's token to move
                ],
                initialHighlights: [{ row: 1, col: 3 }],
                expectedActions: [
                    {
                        type: 'select',
                        position: { row: 1, col: 3 },
                        nextInstructions: "Move to position (1,2) to capture the black token and win the game.",
                        highlightPositions: [{ row: 1, col: 2 }]
                    },
                    {
                        type: 'move',
                        validateMove: (move) => {
                            return move.to.row === 1 && move.to.col === 2;
                        },
                        errorMessage: "Please move to position (1,2) to complete the capture. Try again.",
                        nextInstructions: "Excellent! You're about to capture the last black token."
                    },
                    {
                        type: 'capture',
                        validateCapture: (data) => {
                            return data.color === 'black';
                        },
                        nextInstructions: "Congratulations! You've captured all the opponent's tokens and won the game!",
                        onComplete: function(tutorialService) {
                            setTimeout(() => {
                                tutorialService.uiManager.highlightCapturedToken();
                                setTimeout(() => {
                                    tutorialService.uiManager.showInstructions(
                                        "Victory Conditions",
                                        "You've won by capturing all opponent tokens! This is one of the victory conditions in Pressure. You've completed the tutorial!",
                                        tutorialService.currentStepIndex + 1,
                                        tutorialService.stepManager.getTotalSteps()
                                    );
                                    setTimeout(() => {
                                        tutorialService.showTutorialComplete();
                                    }, 3000);
                                }, 1000);
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
        // Don't allow selecting if we're waiting for continue button
        if (this.waitingForContinue) return;
        
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
     * Handle move execution
     */
    handleMoveExecuted(data) {
        // Don't allow moves if we're waiting for continue button
        if (this.waitingForContinue) return;
        
        const step = this.getStep(this.tutorialService.currentStepIndex);
        if (!step) return;
        
        const expectedAction = step.expectedActions[this.expectedActionIndex];
        
        // If we're not expecting a move, ignore this event
        if (expectedAction.type !== 'move') {
            return;
        }
        
        // Validate the move
        let isValidMove = true;
        
        // Check for direction validation
        if (expectedAction.validateDirection) {
            // Determine the actual direction of the move
            const actualDirection = this.determineDirection(data.move.from, data.move.to);
            isValidMove = (actualDirection === expectedAction.validateDirection);
        }
        // Validate using custom validation function if provided
        else if (expectedAction.validateMove) {
            isValidMove = expectedAction.validateMove(data.move);
        } 
        // Validate using validDestinations if provided
        else if (expectedAction.validDestinations) {
            isValidMove = expectedAction.validDestinations.some(pos => 
                data.move.to.row === pos.row && data.move.to.col === pos.col
            );
        }
        
        if (!isValidMove) {
            // Wrong move - display an error message and reset the step
            const errorMessage = expectedAction.errorMessage || `Incorrect move. ${step.instructions}`;
            
            this.tutorialService.uiManager.showInstructions(
                step.title,
                errorMessage,
                this.tutorialService.currentStepIndex + 1,
                this.tutorialService.getTotalSteps()
            );
            
            // Show try again button
            this.tutorialService.uiManager.showTryAgainButton();
            
            // Mark as retrying to avoid further processing
            this.isRetrying = true;
            
            return;
        }
        
        // Clear all highlights after a valid move
        this.tutorialService.uiManager.clearHighlights();
        
        // Valid move - update instructions
        if (expectedAction.nextInstructions) {
            this.tutorialService.uiManager.showInstructions(
                step.title, 
                expectedAction.nextInstructions,
                this.tutorialService.currentStepIndex + 1,
                this.getTotalSteps()
            );
        }
        
        // Mark that we're waiting for continue to prevent further moves
        if (expectedAction.completesStep || expectedAction.onComplete) {
            this.waitingForContinue = true;
        }
        
        // Execute any after-completion logic
        if (expectedAction.onComplete) {
            expectedAction.onComplete(this.tutorialService);
        }
        
        // If this completes the step, show continue button after delay if specified
        if (expectedAction.completesStep) {
            if (expectedAction.displayDuration) {
                setTimeout(() => {
                    this.tutorialService.uiManager.showContinueButton();
                }, expectedAction.displayDuration);
            } else {
                this.tutorialService.uiManager.showContinueButton();
            }
        } 
        // Otherwise advance to next expected action if not handled by onComplete
        else if (!expectedAction.onComplete) {
            this.expectedActionIndex++;
        }
    }
    
    /**
     * Determine the direction of a move
     * @param {Object} from - The starting position {row, col}
     * @param {Object} to - The ending position {row, col}
     * @returns {string} The direction ('up', 'down', 'left', 'right')
     */
    determineDirection(from, to) {
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
        
        // Mark that we're waiting for continue to prevent further moves
        this.waitingForContinue = true;
        
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
        // Reset the retrying flag
        this.isRetrying = false;
        this.waitingForContinue = false;
        
        // Reset to the beginning of the current step
        this.tutorialService.loadStep(this.tutorialService.currentStepIndex);
    }
    
    /**
     * Reset the expected action index
     */
    resetExpectedAction() {
        this.expectedActionIndex = 0;
        this.isRetrying = false;
        this.waitingForContinue = false;
    }
}