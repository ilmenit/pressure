/**
 * UI Status Manager handles game status displays and modals
 * Refactored to use event-driven architecture
 */
class UIStatusManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.game = uiManager.game;
        this.events = uiManager.events;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for status-related events
     */
    setupEventListeners() {
        // Listen for token captures
        this.events.on('token:captured', (data) => {
            const color = data.color.charAt(0).toUpperCase() + data.color.slice(1);
            this.updateStatus(`${color} token captured!`, "normal");
        });
        
        // Listen for AI thinking 
        this.events.on('ai:thinking', (data) => {
            const player = data.player.charAt(0).toUpperCase() + data.player.slice(1);
            this.updateStatus(`${player} turn. AI is thinking...`, "thinking");
        });
        
        // Listen for AI move selected
        this.events.on('ai:moveSelected', (data) => {
            const player = data.player.charAt(0).toUpperCase() + data.player.slice(1);
            this.updateStatus(`${player} turn. AI has selected a move.`, "thinking");
        });
        
        // Listen for AI move executed
        this.events.on('ai:moveExecuted', (data) => {
            const player = data.player.charAt(0).toUpperCase() + data.player.slice(1);
            this.updateStatus(`${player} turn. AI has made its move.`, "normal");
        });
        
        // Listen for game over
        this.events.on('game:over', (data) => {
            const winner = data.winner.charAt(0).toUpperCase() + data.winner.slice(1);
            this.updateStatus(`${winner} player won. ${data.reason}`, "error");
        });
    }

    /**
     * Set up the win modal
     */
    setupWinModal() {
        // The modal is now defined in HTML, just need to set up event handlers
        const undoButton = document.getElementById('win-modal-undo');
        const newStandardButton = document.getElementById('win-modal-new-standard');
        const menuButton = document.getElementById('win-modal-menu');
        
        if (undoButton) {
            undoButton.addEventListener('click', () => {
                document.getElementById('win-modal').classList.add('hidden');
                if (this.uiManager) this.uiManager.undoMove();
            });
        }
        
        if (newStandardButton) {
            newStandardButton.addEventListener('click', () => {
                document.getElementById('win-modal').classList.add('hidden');
                // Show standard game setup directly
                if (typeof window.showStandardSetup === 'function') {
                    window.showStandardSetup();
                } else {
                    console.warn('showStandardSetup function not available');
                    // Fallback to opening menu
                    if (this.uiManager) this.uiManager.openMenu();
                }
            });
        }
        
        if (menuButton) {
            menuButton.addEventListener('click', () => {
                document.getElementById('win-modal').classList.add('hidden');
                if (this.uiManager) this.uiManager.openMenu();
            });
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
        const newStandardButton = document.getElementById('win-modal-new-standard');
        
        // Handle button visibility based on tournament mode
        if (this.game.isTournamentMode) {
            // Hide undo and new standard game buttons in tournament mode
            if (undoButton) undoButton.style.display = 'none';
            if (newStandardButton) newStandardButton.style.display = 'none';
        } else {
            // Show buttons in standard mode
            if (undoButton) undoButton.style.display = 'inline-block';
            if (newStandardButton) newStandardButton.style.display = 'inline-block';
        }
        
        const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
        modalTitle.textContent = `${winnerName} Wins!`;
        modalMessage.textContent = reason;
        
        // Also update the game status
        this.updateStatus(`${winnerName} player won. ${reason}`, "error");
        
        modal.classList.remove('hidden');
        
        // Emit UI event
        if (this.events) {
            this.events.emit('ui:winModalShown', {
                winner: winner,
                reason: reason
            });
        }
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
        
        // Emit status:updated event
        if (this.events) {
            this.events.emit('status:updated', {
                text: text,
                state: state
            });
        }
    }
}