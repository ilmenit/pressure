/**
 * Animation Integration - Connects the animation system with the game
 * Enhances existing methods with animation effects without breaking functionality
 */
(function() {
    // Initialize animation manager when game is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Try to initialize with a maximum number of retries
        let retryCount = 0;
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 200;
        
        const initAnimations = () => {
            if (window.game) {
                try {
                    // Check if AnimationManager constructor exists
                    if (typeof AnimationManager !== 'function') {
                        console.error("AnimationManager class not found");
                        return false;
                    }
                    
                    // Check if we already have an animation manager
                    if (window.game.animationManager instanceof AnimationManager) {
                        console.log("Animation manager already initialized");
                        return true;
                    }
                    
                    // Create animation manager
                    window.game.animationManager = new AnimationManager(window.game);
                    console.log("Animation manager created with config:", window.game.animationManager.config);
                    
                    // Enhance Board.renderBoard to respect animation state
                    enhanceBoardRenderMethod();
                    
                    // Emit initialization event
                    if (window.game.events && typeof window.game.events.emit === 'function') {
                        window.game.events.emit('animations:initialized', {
                            timestamp: Date.now()
                        });
                    }
                    
                    console.log("Animation integration complete");
                    return true;
                } catch (e) {
                    console.error("Error initializing animation system:", e);
                    return false;
                }
            }
            return false;
        };
        
        // Function to attempt initialization with retries
        const attemptInitWithRetry = () => {
            if (initAnimations()) return;
            
            retryCount++;
            if (retryCount < MAX_RETRIES) {
                console.log(`Animation initialization retry ${retryCount}/${MAX_RETRIES}...`);
                setTimeout(attemptInitWithRetry, RETRY_DELAY);
            } else {
                console.warn("Failed to initialize animation system after maximum retries");
            }
        };
        
        // Start the initialization process
        attemptInitWithRetry();
    });
    
    /**
     * Enhance Board.renderBoard to respect animation state
     * This creates a unified rendering mechanism that respects animations in progress
     */
    function enhanceBoardRenderMethod() {
        if (!Board || !Board.prototype || !Board.prototype.renderBoard) {
            console.warn("Board.renderBoard not found, cannot enhance");
            return;
        }
        
        console.log("Enhancing Board.renderBoard for animations");
        
        // Store original method reference
        const originalRenderBoard = Board.prototype.renderBoard;
        
        // Replace with enhanced version that checks animation state
        Board.prototype.renderBoard = function() {
            // Get animation manager (if exists)
            const animMgr = window.game?.animationManager;
            
            // Skip rendering during simulation or animation
            if ((this.events && this.events.isInSimulation && this.events.isInSimulation()) || 
                (animMgr && animMgr.isAnimating())) {
                return;
            }
            
            // Call original method
            const result = originalRenderBoard.apply(this, arguments);
            
            // Update draggable tokens if available
            if (window.game && window.game.ui && typeof window.game.ui.makeTokensDraggable === 'function') {
                window.game.ui.makeTokensDraggable();
            }
            
            return result;
        };
        
        // Make sure isValidPosition exists on Board prototype
        if (!Board.prototype.isValidPosition) {
            console.log("Adding isValidPosition method to Board prototype");
            Board.prototype.isValidPosition = function(row, col) {
                return row >= 0 && row < this.size && col >= 0 && col < this.size;
            };
        }
    }
})();