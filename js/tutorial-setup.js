/**
 * tutorial-setup.js
 * Main integration file that loads all tutorial components
 */

// Global function to start the tutorial
function startTutorial() {
    const game = window.game;
    
    if (!game) {
        console.error("Game instance not found");
        return;
    }
    
    // Clean up any existing tutorial
    if (window.tutorialService && window.tutorialService.isActive) {
        window.tutorialService.end();
    }
    
        // Create new tutorial service
        window.tutorialService = new TutorialService(game);
        
        // Start the tutorial
        window.tutorialService.start();
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Make the function globally available
    window.startTutorial = startTutorial;
        
    console.log("Tutorial system initialized and ready");
});