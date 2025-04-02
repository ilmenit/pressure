/**
 * AnimationManager - Handles token movement animations for Pressure game
 * Implements efficient FLIP animation technique for smooth movement
 */
class AnimationManager {
    constructor(game) {
        this.game = game;
        this.board = game.board;
        this.events = game.events || (window.gameEvents || null);
        
        // Animation state tracking
        this.animationQueue = [];
        this.animationsInProgress = 0;
        this.isProcessingQueue = false;
        this.animationTimeouts = []; // Store timeout references for cleanup
        
        // Load settings from localStorage with error handling
        let animationsEnabled = true;
        let animationSpeed = 300;
        try {
            animationsEnabled = localStorage.getItem('animations_enabled') !== 'false';
            animationSpeed = parseInt(localStorage.getItem('animation_speed') || '300');
            if (isNaN(animationSpeed)) animationSpeed = 300; // Safety check
        } catch (e) {
            console.warn("Could not access localStorage for animation settings", e);
        }
        
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia && 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Configuration
        this.config = {
            enabled: prefersReducedMotion ? false : animationsEnabled,
            duration: prefersReducedMotion ? 0 : (animationsEnabled ? animationSpeed : 0),
            pushStagger: prefersReducedMotion ? 0 : (animationsEnabled ? Math.max(30, animationSpeed/10) : 0),
            captureAnimationDuration: 600, // ms for capture animation
            inactiveAnimationDuration: 500, // ms for inactive animation
            easing: 'ease',
            useFLIP: true,
            debug: false
        };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Log initialization
        console.log("Animation Manager initialized with configuration:", this.config);
    }
    
    /**
     * Set up event listeners for animations
     */
    setupEventListeners() {
        // We want to intercept moves BEFORE they execute
        if (this.events && typeof this.events.on === 'function') {
            this.events.on('move:executing', (data) => {
                // Skip if animations disabled
                if (!this.config.enabled || this.config.duration <= 0) return;
                
                // Skip during AI simulation
                if (this.events.isInSimulation && this.events.isInSimulation()) return;
                
                // Add move to queue
                this.animationQueue.push(data.move);
                
                // Start processing queue if not already doing so
                if (!this.isProcessingQueue) {
                    this.processAnimationQueue();
                }
            });
            
            // Listen for token captures to animate them
            this.events.on('token:captured', (data) => {
                // Skip if animations disabled
                if (!this.config.enabled || this.events.isInSimulation()) return;
                
                // Animate the token being captured
                this.animateTokenCapture(data.row, data.col);
            });
            
            // Listen for token deactivation to animate it
            this.events.on('token:deactivated', (data) => {
                // Skip if animations disabled
                if (!this.config.enabled || this.events.isInSimulation()) return;
                
                // Animate the token becoming inactive
                this.animateTokenInactive(data.position.row, data.position.col);
            });
        }
        
        // Clean up animations when needed
        if (this.events) {
            this.events.on('undo:started', () => this.clearAnimations());
            this.events.on('redo:started', () => this.clearAnimations());
            this.events.on('game:initialized', () => this.clearAnimations());
        }
        
        // Handle animation completion via transition events
        document.addEventListener('transitionend', (e) => {
            if (e.target.classList.contains('token') && 
                e.propertyName === 'transform' &&
                e.target.dataset.animating === 'true') {
                this.handleAnimationComplete(e.target);
            }
        });
    }
    
    /**
     * Process the animation queue
     */
    processAnimationQueue() {
        if (this.animationQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        // Check if animation should be skipped (e.g., document hidden or game screen not visible)
        if (!this.isAnimationVisible()) {
            // Empty the queue and skip animations
            this.animationQueue = [];
            this.isProcessingQueue = false;
            
            // Ensure board is rendered
            if (this.board && typeof this.board.renderBoard === 'function') {
                this.board.renderBoard();
            }
            return;
        }
        
        this.isProcessingQueue = true;
        const move = this.animationQueue.shift();
        
        // Process based on move type
        if (move.type === 'move') {
            this.animateSimpleMove(move);
        } else if (move.type === 'push') {
            this.animatePush(move);
        } else {
            // Unknown move type, just continue to next
            this.continueQueue();
        }
    }
    
    /**
     * Check if animations should be visible
     * Skips animations if document is hidden or game screen is not visible
     */
    isAnimationVisible() {
        // Skip animations if document is hidden (tab in background)
        if (document.visibilityState !== 'visible') {
            return false;
        }
        
        // Skip animations if game screen is hidden
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen && gameScreen.classList.contains('hidden')) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Animate a simple token move using FLIP technique if enabled
     */
    animateSimpleMove(move) {
        try {
            // Get the relevant DOM elements
            const fromCell = this.getCellElement(move.from.row, move.from.col);
            const toCell = this.getCellElement(move.to.row, move.to.col);
            
            if (!fromCell || !toCell) {
                this.logDebug("Could not find cells for animation", move);
                this.continueQueue();
                return;
            }
            
            const token = fromCell.querySelector('.token');
            if (!token || !token.isConnected) {
                this.logDebug("Could not find token for animation", move);
                this.continueQueue();
                return;
            }
            
            // Track this animation
            this.animationsInProgress++;
            
            // Mark token as animating
            token.dataset.animating = 'true';
            token.dataset.destRow = move.to.row;
            token.dataset.destCol = move.to.col;
            
            // Increase z-index during animation to ensure it appears above other tokens
            token.style.zIndex = '10';
            
            // Apply will-change only during animation for better performance
            token.style.willChange = 'transform';
            
            if (this.config.useFLIP) {
                try {
                    // Use FLIP technique for more efficient animation
                    
                    // 1. First - Record the starting position
                    const firstRect = token.getBoundingClientRect();
                    
                    // 2. Last - Move token in the DOM without animation
                    toCell.appendChild(token);
                    
                    // 3. Invert - Calculate the transform needed to make it appear in original position
                    const lastRect = token.getBoundingClientRect();
                    const dx = firstRect.left - lastRect.left;
                    const dy = firstRect.top - lastRect.top;
                    
                    // Apply transform without transition first
                    token.style.transition = 'none';
                    token.style.transform = `translate(${dx}px, ${dy}px)`;
                    
                    // Force reflow to apply the transform
                    token.offsetHeight;
                    
                    // 4. Play - Animate to final position (identity transform)
                    token.style.transition = `transform ${this.config.duration}ms ${this.config.easing}`;
                    token.style.transform = '';
                } catch (e) {
                    // Fallback if FLIP calculation fails
                    console.warn("FLIP animation failed, using fallback", e);
                    token.style.transition = 'none';
                    token.style.transform = '';
                }
            } else {
                // Use simple position calculation, but still follow FLIP pattern for consistency
                try {
                    // Move token to destination first
                    toCell.appendChild(token);
                    
                    // Calculate transform to make it appear at original position
                    const lastRect = token.getBoundingClientRect();
                    const fromRect = fromCell.getBoundingClientRect();
                    const dx = fromRect.left - lastRect.left;
                    const dy = fromRect.top - lastRect.top;
                    
                    // Apply initial transform
                    token.style.transition = 'none';
                    token.style.transform = `translate(${dx}px, ${dy}px)`;
                    
                    // Force reflow
                    token.offsetHeight;
                    
                    // Animate to final position
                    token.style.transition = `transform ${this.config.duration}ms ${this.config.easing}`;
                    token.style.transform = '';
                } catch (e) {
                    // Fallback if calculation fails
                    console.warn("Position calculation failed", e);
                    token.style.transition = 'none';
                    token.style.transform = '';
                    toCell.appendChild(token);
                }
            }
            
            // Emit animation started event
            if (this.events && typeof this.events.emit === 'function') {
                this.events.emit('animation:started', {
                    type: 'move',
                    from: move.from,
                    to: move.to
                });
            }
            
            // Set backup completion handler
            this.setBackupCompletionTimer(token);
        } catch (e) {
            console.error("Error in animateSimpleMove", e);
            // Ensure we continue the queue even if animation fails
            this.continueQueue();
        }
    }
    
    /**
     * Animate a push move - multiple tokens moving
     */
    animatePush(move) {
        try {
            // Get direction vector
            const direction = this.getDirectionVector(move.direction);
            if (!direction) {
                this.logDebug("Invalid direction for push animation", move);
                this.continueQueue();
                return;
            }
            
            // Get the pusher token
            const pusherCell = this.getCellElement(move.from.row, move.from.col);
            if (!pusherCell) {
                this.logDebug("Could not find pusher cell", move);
                this.continueQueue();
                return;
            }
            
            const pusherToken = pusherCell.querySelector('.token');
            if (!pusherToken) {
                this.logDebug("Could not find pusher token", move);
                this.continueQueue();
                return;
            }
            
            // Get all tokens in the push line
            const tokensToAnimate = [];
            let row = move.to.row;
            let col = move.to.col;
            let animationIndex = 0;
            
            // Add the pusher token
            tokensToAnimate.push({
                token: pusherToken,
                fromRow: move.from.row,
                fromCol: move.from.col,
                toRow: move.to.row,
                toCol: move.to.col,
                index: animationIndex++
            });
            
            // Add all pushed tokens
            while (this.isValidPosition(row, col)) {
                const cell = this.getCellElement(row, col);
                const token = cell?.querySelector('.token');
                
                if (!token) break;
                
                tokensToAnimate.push({
                    token: token,
                    fromRow: row,
                    fromCol: col,
                    toRow: row + direction.dr,
                    toCol: col + direction.dc,
                    index: animationIndex++
                });
                
                // Move to next position
                row += direction.dr;
                col += direction.dc;
            }
            
            // Calculate maximum z-index base to ensure tokens always appear above board
            // This avoids stacking context issues with complex token arrangements
            const MAX_TOKENS = tokensToAnimate.length;
            const Z_INDEX_BASE = 100; // High base value to avoid conflicts
            
            // Track animations
            this.animationsInProgress += tokensToAnimate.length;
            
            // Animate each token
            tokensToAnimate.forEach(tokenInfo => {
                // Get cells
                const fromCell = this.getCellElement(tokenInfo.fromRow, tokenInfo.fromCol);
                const toCell = this.getCellElement(tokenInfo.toRow, tokenInfo.toCol);
                
                if (!fromCell || !toCell || !tokenInfo.token || !tokenInfo.token.isConnected) {
                    this.animationsInProgress--;
                    return;
                }
                
                const token = tokenInfo.token;
                
                // Mark token as animating
                token.dataset.animating = 'true';
                token.dataset.destRow = tokenInfo.toRow;
                token.dataset.destCol = tokenInfo.toCol;
                
                // Set z-index with reversed order to ensure tokens at end of push appear on top
                // This gives a more natural appearance for the push direction
                token.style.zIndex = (Z_INDEX_BASE + (MAX_TOKENS - tokenInfo.index)).toString();
                
                // Calculate delay based on position in push sequence
                const delay = tokenInfo.index * this.config.pushStagger;
                
                // Apply will-change only to animating elements for better performance
                token.style.willChange = 'transform';
                
                if (this.config.useFLIP) {
                    try {
                        // Use FLIP technique
                        
                        // 1. First - Record the starting position
                        const firstRect = token.getBoundingClientRect();
                        
                        // 2. Last - Move token to destination cell
                        toCell.appendChild(token);
                        
                        // 3. Invert - Calculate transform to make it appear in original position
                        const lastRect = token.getBoundingClientRect();
                        const dx = firstRect.left - lastRect.left;
                        const dy = firstRect.top - lastRect.top;
                        
                        // Apply initial transform without transition
                        token.style.transition = 'none';
                        token.style.transform = `translate(${dx}px, ${dy}px)`;
                        
                        // Force reflow
                        token.offsetHeight;
                        
                        // 4. Play - Animate to final position with delay
                        token.style.transition = `transform ${this.config.duration}ms ${this.config.easing} ${delay}ms`;
                        token.style.transform = '';
                    } catch (e) {
                        // Fallback if FLIP fails
                        console.warn("FLIP animation failed, using fallback", e);
                        token.style.transition = 'none';
                        token.style.transform = '';
                    }
                } else {
                    // Use simple position calculation with FLIP pattern for consistency
                    try {
                        // Move token to destination first
                        toCell.appendChild(token);
                        
                        // Calculate transform to make it appear at original position
                        const lastRect = token.getBoundingClientRect();
                        const fromRect = fromCell.getBoundingClientRect();
                        const dx = fromRect.left - lastRect.left;
                        const dy = fromRect.top - lastRect.top;
                        
                        // Apply initial transform
                        token.style.transition = 'none';
                        token.style.transform = `translate(${dx}px, ${dy}px)`;
                        
                        // Force reflow
                        token.offsetHeight;
                        
                        // Animate to final position with delay
                        token.style.transition = `transform ${this.config.duration}ms ${this.config.easing} ${delay}ms`;
                        token.style.transform = '';
                    } catch (e) {
                        // Fallback if calculation fails
                        console.warn("Position calculation failed", e);
                        token.style.transition = 'none';
                        token.style.transform = '';
                        toCell.appendChild(token);
                    }
                }
                
                // Set backup completion timer
                this.setBackupCompletionTimer(token, delay);
            });
            
            // Emit animation started event
            if (this.events && typeof this.events.emit === 'function') {
                this.events.emit('animation:started', {
                    type: 'push',
                    from: move.from,
                    to: move.to,
                    direction: move.direction,
                    tokenCount: tokensToAnimate.length
                });
            }
        } catch (e) {
            console.error("Error in animatePush", e);
            // Ensure we continue the queue even if animation fails
            this.continueQueue();
        }
    }
    
    /**
     * Animate a token being captured (turning blue)
     */
    animateTokenCapture(row, col) {
        const cell = this.getCellElement(row, col);
        if (!cell) return;
        
        const token = cell.querySelector('.token');
        if (!token || !token.isConnected) return;
        
        // Check if token is already part of a move animation
        const isCurrentlyAnimating = token.dataset.animating === 'true';
        
        // Add appropriate capture animation class
        if (isCurrentlyAnimating) {
            // Use a non-transform animation if the token is already being animated with transforms
            token.classList.add('token-captured-during-move');
            
            // Play capture sound if sound manager is available
            try {
                if (window.soundManager && 
                    typeof window.soundManager.playSound === 'function' &&
                    window.soundManager.isSoundEnabled) {
                    window.soundManager.playSound('captureToken');
                }
            } catch (e) {
                console.warn("Error playing capture sound", e);
            }
            
            // Remove class after animation completes
            setTimeout(() => {
                if (token && token.isConnected) {
                    token.classList.remove('token-captured-during-move');
                }
            }, this.config.captureAnimationDuration);
        } else {
            // Use standard capture animation
            token.classList.add('token-captured');
            
            // Play capture sound if sound manager is available
            try {
                if (window.soundManager && 
                    typeof window.soundManager.playSound === 'function' &&
                    window.soundManager.isSoundEnabled) {
                    window.soundManager.playSound('captureToken');
                }
            } catch (e) {
                console.warn("Error playing capture sound", e);
            }
            
            // Remove class after animation completes
            setTimeout(() => {
                if (token && token.isConnected) {
                    token.classList.remove('token-captured');
                }
            }, this.config.captureAnimationDuration);
        }
    }
    
    /**
     * Animate a token becoming inactive (red dot appearing)
     */
    animateTokenInactive(row, col) {
        const cell = this.getCellElement(row, col);
        if (!cell) return;
        
        const token = cell.querySelector('.token');
        if (!token || !token.isConnected) return;
        
        // Add inactive animation class
        token.classList.add('token-inactivated');
        
        // Remove class after animation completes
        setTimeout(() => {
            if (token && token.isConnected) {
                token.classList.remove('token-inactivated');
            }
        }, this.config.inactiveAnimationDuration);
    }
    
    /**
     * Set a backup timer to ensure animation completes
     */
    setBackupCompletionTimer(token, delay = 0) {
        if (!token || !token.dataset) return;
        
        const timeout = this.config.duration + delay + 50; // Add 50ms buffer
        const timeoutId = setTimeout(() => {
            // Check if token is still in the DOM and still animating
            if (token && token.isConnected && token.dataset && token.dataset.animating === 'true') {
                this.handleAnimationComplete(token);
            }
        }, timeout);
        
        // Store timeout reference for cleanup
        this.animationTimeouts.push(timeoutId);
    }
    
    /**
     * Handle animation completion for a token
     */
    handleAnimationComplete(token) {
        // Check if token is still in the DOM and still animating
        if (!token || !token.isConnected || !token.dataset || token.dataset.animating !== 'true') {
            // If token is missing but we still have an animation in progress, decrement counter
            if (this.animationsInProgress > 0) {
                this.animationsInProgress--;
                
                // Check if this was the last animation
                if (this.animationsInProgress === 0) {
                    this.finalizeMove();
                }
            }
            return;
        }
        
        try {
            // Clean up animation state
            delete token.dataset.animating;
            token.style.transition = '';
            token.style.transform = '';
            token.style.zIndex = '';
            token.style.willChange = '';
            
            // Note: We don't need to move the token here since we now 
            // consistently move tokens to their destination cells during 
            // the FLIP setup in both methods. The destRow/destCol data 
            // is kept for reference only.
            if (token.dataset.destRow) delete token.dataset.destRow;
            if (token.dataset.destCol) delete token.dataset.destCol;
        } catch (e) {
            console.warn("Error cleaning up token animation", e);
        }
        
        // Update counters
        this.animationsInProgress--;
        
        // Check if this completes a batch
        if (this.animationsInProgress === 0) {
            this.finalizeMove();
        }
    }
    
    /**
     * Finalize move and continue to next animation
     */
    finalizeMove() {
        // Render board to ensure everything is in the right place
        if (this.board && typeof this.board.renderBoard === 'function') {
            this.board.renderBoard();
        }
        
        // Emit event to signal completion
        if (this.events && typeof this.events.emit === 'function') {
            this.events.emit('animation:completed', {
                timestamp: Date.now()
            });
        }
        
        // Small delay before next animation
        setTimeout(() => {
            this.continueQueue();
        }, 50);
    }
    
    /**
     * Continue to next animation in queue
     */
    continueQueue() {
        this.processAnimationQueue();
    }
    
    /**
     * Clear all animations
     */
    clearAnimations() {
        // Reset tracking
        this.animationsInProgress = 0;
        this.animationQueue = [];
        this.isProcessingQueue = false;
        
        // Clear all animation timeouts
        this.animationTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.animationTimeouts = [];
        
        // Clean up any ongoing animations
        try {
            // Clean up move animations
            document.querySelectorAll('.token[data-animating="true"]').forEach(token => {
                if (token.isConnected) {
                    token.style.transition = '';
                    token.style.transform = '';
                    token.style.zIndex = '';
                    token.style.willChange = '';
                    delete token.dataset.animating;
                    
                    // Move token to destination cell if needed
                    if (token.dataset.destRow && token.dataset.destCol) {
                        const destCell = this.getCellElement(
                            parseInt(token.dataset.destRow), 
                            parseInt(token.dataset.destCol)
                        );
                        if (destCell) {
                            destCell.appendChild(token);
                        }
                        delete token.dataset.destRow;
                        delete token.dataset.destCol;
                    }
                }
            });
            
            // Clean up capture animations
            document.querySelectorAll('.token-captured, .token-captured-during-move').forEach(token => {
                if (token.isConnected) {
                    token.classList.remove('token-captured');
                    token.classList.remove('token-captured-during-move');
                }
            });
            
            // Clean up inactive animations
            document.querySelectorAll('.token-inactivated').forEach(token => {
                if (token.isConnected) {
                    token.classList.remove('token-inactivated');
                }
            });
        } catch (e) {
            console.warn("Error cleaning up animations", e);
        }
        
        // Render board to ensure clean state
        if (this.board && typeof this.board.renderBoard === 'function') {
            this.board.renderBoard();
        }
        
        // Emit event if events system is available
        if (this.events && typeof this.events.emit === 'function') {
            this.events.emit('animation:cleared', {
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Get direction vector from name
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
    
    /**
     * Helper to get cell element
     */
    getCellElement(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }
    
    /**
     * Check if position is valid
     */
    isValidPosition(row, col) {
        if (!this.board) return false;
        return row >= 0 && row < this.board.size && col >= 0 && col < this.board.size;
    }
    
    /**
     * Update animation configuration
     */
    updateConfig(newConfig) {
        const previousState = this.config.enabled;
        const previousDuration = this.config.duration;
        
        // Update config
        this.config = {...this.config, ...newConfig};
        
        // Update push stagger based on duration
        if ('duration' in newConfig) {
            this.config.pushStagger = this.config.enabled ? 
                Math.max(30, this.config.duration/10) : 0;
        }
        
        // If animations are being disabled or duration is changing to zero, clean up
        if ((previousState && !this.config.enabled) || 
            (previousDuration > 0 && this.config.duration <= 0)) {
            this.clearAnimations();
        }
        
        // Save settings to localStorage if possible
        try {
            if ('enabled' in newConfig) {
                localStorage.setItem('animations_enabled', this.config.enabled);
            }
            if ('duration' in newConfig) {
                localStorage.setItem('animation_speed', this.config.duration);
            }
        } catch (e) {
            console.warn("Could not save animation settings to localStorage", e);
        }
    }
    
    /**
     * Toggle animations on/off
     */
    toggleAnimations() {
        const newState = !this.config.enabled;
        this.updateConfig({ 
            enabled: newState,
            duration: newState ? (parseInt(localStorage.getItem('animation_speed') || '300')) : 0,
            pushStagger: newState ? Math.max(30, parseInt(localStorage.getItem('animation_speed') || '300')/10) : 0
        });
        
        return newState;
    }
    
    /**
     * Set animation speed
     */
    setAnimationSpeed(speed) {
        const numSpeed = parseInt(speed);
        this.updateConfig({
            duration: this.config.enabled ? numSpeed : 0,
            pushStagger: this.config.enabled ? Math.max(30, numSpeed/10) : 0
        });
        
        return numSpeed;
    }
    
    /**
     * Debug logging
     */
    logDebug(message, data) {
        if (this.config.debug) {
            console.log(`[AnimationManager] ${message}`, data);
        }
    }
    
    /**
     * Check if animations are in progress
     */
    isAnimating() {
        return this.animationsInProgress > 0;
    }
}
