/**
 * UI Status Manager handles game status displays and modals
 */
class UIStatusManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.game = uiManager.game;
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
            
            // Add event listeners for the new buttons
            document.getElementById('win-modal-undo').addEventListener('click', () => {
                document.getElementById('win-modal').classList.add('hidden');
                this.uiManager.undoMove();
            });
            
            document.getElementById('win-modal-menu').addEventListener('click', () => {
                document.getElementById('win-modal').classList.add('hidden');
                this.uiManager.openMenu();
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
        
        // Hide undo button in tournament mode
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
    }
}
