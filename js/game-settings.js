/**
 * game-settings.js
 * Unified settings manager for game options including sound and animations
 * Replaces sound-settings.js with enhanced functionality
 */
(function() {
    // Hook into the showTournamentSettings function
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for everything to be loaded
        const initSettingsHook = () => {
            // Only do this if the showTournamentSettings function exists
            if (typeof window.showTournamentSettings === 'function') {
                // Store original function reference
                const originalShowTournamentSettings = window.showTournamentSettings;
                
                // Completely replace the function with our enhanced version
                window.showTournamentSettings = function() {
                    // Hide all screens (from original function)
                    if (typeof window.hideAllScreens === 'function') {
                        window.hideAllScreens();
                    }
                    
                    // Create or get the settings div
                    let settingsScreen = document.getElementById('tournament-settings');
                    
                    if (!settingsScreen) {
                        // Create settings screen from scratch with our desired layout
                        settingsScreen = document.createElement('div');
                        settingsScreen.id = 'tournament-settings';
                        settingsScreen.className = 'screen';
                        
                        // Initial HTML with title and container
                        settingsScreen.innerHTML = `
                            <h1>Game Settings</h1>
                            <div class="settings-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 20px auto;">
                                <!-- Sections will be added dynamically -->
                            </div>
                        `;
                        
                        document.body.appendChild(settingsScreen);
                    } else {
                        // Update existing screen's title
                        const title = settingsScreen.querySelector('h1');
                        if (title) title.textContent = 'Game Settings';
                        
                        // Clear the container for fresh content
                        const container = settingsScreen.querySelector('.settings-container');
                        if (container) container.innerHTML = '';
                    }
                    
                    // Now add sections in our desired order
                    const container = settingsScreen.querySelector('.settings-container');
                    if (container) {
                        // Add sound settings
                        addSoundSection(container);
                        
                        // Add animation settings
                        addAnimationSection(container);
                        
                        // Add tournament reset section
                        addTournamentResetSection(container);
                        
                        // Add back button at the very bottom
                        addBackButton(container);
                    }
                    
                    // Show the settings screen
                    settingsScreen.classList.remove('hidden');
                };
                
                return true;
            }
            return false;
        };
        
        // Try immediately
        if (!initSettingsHook()) {
            // If not ready, try again after a delay
            setTimeout(() => {
                if (!initSettingsHook()) {
                    // One more retry
                    setTimeout(initSettingsHook, 500);
                }
            }, 200);
        }
    });
    
    /**
     * Add sound settings section
     */
    function addSoundSection(container) {
        // Safely check sound manager state
        let isSoundEnabled = false;
        try {
            isSoundEnabled = window.soundManager && window.soundManager.isSoundEnabled;
        } catch (e) {
            console.warn("Error accessing sound manager", e);
        }
        
        // Create sound settings item
        const soundSection = document.createElement('div');
        soundSection.className = 'settings-item';
        soundSection.innerHTML = `
            <h2>Sound</h2>
            <button id="sound-toggle-btn" class="large-btn">Sound: ${isSoundEnabled ? 'ON' : 'OFF'}</button>
        `;
        
        container.appendChild(soundSection);
        
        // Add event listener for sound toggle
        setupSoundToggleHandler();
    }
    
    /**
     * Add animation settings section
     */
    function addAnimationSection(container) {
        // Get current animation settings with fallback
        let isEnabled = true;
        let currentSpeed = '300';
        try {
            isEnabled = localStorage.getItem('animations_enabled') !== 'false';
            currentSpeed = localStorage.getItem('animation_speed') || '300';
        } catch (e) {
            console.warn("Could not access localStorage for animation settings", e);
        }
        
        const speedText = getSpeedText(currentSpeed);
        
        // Check preferred reduced motion setting
        const prefersReducedMotion = window.matchMedia && 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // If user prefers reduced motion, override stored setting
        if (prefersReducedMotion) {
            isEnabled = false;
        }
        
        // Create animation settings section
        const animationSection = document.createElement('div');
        animationSection.className = 'settings-item';
        animationSection.innerHTML = `
            <h2>Animations</h2>
            <div class="settings-options">
                <button id="animations-toggle-btn" class="large-btn">Animations: ${isEnabled ? 'ON' : 'OFF'}</button>
                <button id="animations-speed-btn" class="large-btn ${!isEnabled ? 'disabled' : ''}">Speed: ${speedText}</button>
            </div>
            ${prefersReducedMotion ? '<p class="settings-note">Animations disabled due to reduced motion preference in your system settings.</p>' : ''}
        `;
        
        container.appendChild(animationSection);
        
        // Add event handlers for animation settings
        setupAnimationHandlers();
    }
    
    /**
     * Add tournament reset section
     */
    function addTournamentResetSection(container) {
        const resetSection = document.createElement('div');
        resetSection.className = 'settings-item';
        resetSection.innerHTML = `
            <h2>Reset Tournament Progress</h2>
            <button id="tournament-reset-btn" class="large-btn" style="background-color: #E74C3C;">Reset Progress</button>
        `;
        
        container.appendChild(resetSection);
        
        // Add event listener for reset button
        setupResetButtonHandler();
    }
    
    /**
     * Add back button at the bottom
     */
    function addBackButton(container) {
        const backButtonContainer = document.createElement('div');
        backButtonContainer.className = 'settings-item back-button-container';
        backButtonContainer.innerHTML = `
            <button id="settings-back-btn" class="large-btn">Back to Main Menu</button>
        `;
        
        container.appendChild(backButtonContainer);
        
        // Add event listener for back button
        setupBackButtonHandler();
    }
    
    /**
     * Setup handler for sound toggle button
     */
    function setupSoundToggleHandler() {
        const toggleBtn = document.getElementById('sound-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                try {
                    if (window.soundManager && typeof window.soundManager.toggleSound === 'function') {
                        const isEnabled = window.soundManager.toggleSound();
                        toggleBtn.textContent = `Sound: ${isEnabled ? 'ON' : 'OFF'}`;
                        
                        // Play a sound when enabling
                        if (isEnabled && typeof window.soundManager.playSound === 'function') {
                            window.soundManager.playSound('menuButtonClick');
                        }
                    } else {
                        // Fallback if sound manager isn't available
                        const currentState = toggleBtn.textContent.includes('ON');
                        const newState = !currentState;
                        toggleBtn.textContent = `Sound: ${newState ? 'ON' : 'OFF'}`;
                        
                        try {
                            localStorage.setItem('sound_enabled', newState);
                        } catch (e) {
                            console.warn("Could not save sound setting", e);
                        }
                    }
                    
                    // Add feedback animation
                    toggleBtn.classList.add('btn-feedback');
                    setTimeout(() => {
                        toggleBtn.classList.remove('btn-feedback');
                    }, 300);
                } catch (e) {
                    console.error("Error toggling sound", e);
                }
            });
        }
    }
    
    /**
     * Setup handlers for animation buttons
     */
    function setupAnimationHandlers() {
        const toggleBtn = document.getElementById('animations-toggle-btn');
        const speedBtn = document.getElementById('animations-speed-btn');
        
        // Check if reduced motion is preferred
        const prefersReducedMotion = window.matchMedia && 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (toggleBtn) {
            // Toggle handler
            toggleBtn.addEventListener('click', () => {
                // Skip if reduced motion preference is enabled
                if (prefersReducedMotion) {
                    alert("Animations are disabled due to reduced motion preference in your system settings. You can change this in your operating system's accessibility settings.");
                    return;
                }
                
                try {
                    let newState;
                    
                    if (window.game && window.game.animationManager && 
                        typeof window.game.animationManager.toggleAnimations === 'function') {
                        // Use animation manager if available
                        newState = window.game.animationManager.toggleAnimations();
                    } else {
                        // Fallback if animation manager isn't available
                        const currentState = toggleBtn.textContent.includes('ON');
                        newState = !currentState;
                        
                        try {
                            localStorage.setItem('animations_enabled', newState);
                        } catch (e) {
                            console.warn("Could not save animation setting", e);
                        }
                    }
                    
                    // Update button text
                    toggleBtn.textContent = `Animations: ${newState ? 'ON' : 'OFF'}`;
                    
                    // Update speed button state
                    if (speedBtn) {
                        if (newState) {
                            speedBtn.classList.remove('disabled');
                        } else {
                            speedBtn.classList.add('disabled');
                        }
                    }
                    
                    // Add feedback animation
                    toggleBtn.classList.add('btn-feedback');
                    setTimeout(() => {
                        toggleBtn.classList.remove('btn-feedback');
                    }, 300);
                    
                    // Play sound if sound manager exists and is enabled
                    try {
                        if (window.soundManager && window.soundManager.isSoundEnabled) {
                            window.soundManager.playSound('menuButtonClick');
                        }
                    } catch (e) {
                        console.warn("Error playing sound", e);
                    }
                } catch (e) {
                    console.error("Error toggling animations", e);
                }
            });
        }
        
        if (speedBtn) {
            // Speed cycle handler
            speedBtn.addEventListener('click', () => {
                // Skip if animations are disabled
                if (speedBtn.classList.contains('disabled')) return;
                
                try {
                    const currentText = speedBtn.textContent;
                    let newSpeed, newText;
                    
                    // Cycle through speeds: Normal -> Fast -> Instant -> Slow -> Normal
                    if (currentText.includes('Normal')) {
                        newSpeed = 150;
                        newText = 'Fast';
                    } else if (currentText.includes('Fast')) {
                        newSpeed = 0;
                        newText = 'Instant';
                    } else if (currentText.includes('Instant')) {
                        newSpeed = 450;
                        newText = 'Slow';
                    } else {
                        newSpeed = 300;
                        newText = 'Normal';
                    }
                    
                    // Update button text
                    speedBtn.textContent = `Speed: ${newText}`;
                    
                    // Add feedback animation
                    speedBtn.classList.add('btn-feedback');
                    setTimeout(() => {
                        speedBtn.classList.remove('btn-feedback');
                    }, 300);
                    
                    // Update animation manager if available
                    if (window.game && window.game.animationManager && 
                        typeof window.game.animationManager.setAnimationSpeed === 'function') {
                        window.game.animationManager.setAnimationSpeed(newSpeed);
                    } else {
                        // Fallback if animation manager isn't available
                        try {
                            localStorage.setItem('animation_speed', newSpeed);
                        } catch (e) {
                            console.warn("Could not save animation speed", e);
                        }
                    }
                    
                    // Play sound if sound manager exists and is enabled
                    try {
                        if (window.soundManager && window.soundManager.isSoundEnabled) {
                            window.soundManager.playSound('menuButtonClick');
                        }
                    } catch (e) {
                        console.warn("Error playing sound", e);
                    }
                } catch (e) {
                    console.error("Error changing animation speed", e);
                }
            });
        }
        
        // If reduced motion is preferred, disable the toggle button
        if (prefersReducedMotion && toggleBtn) {
            toggleBtn.disabled = true;
            toggleBtn.title = "Disabled due to reduced motion preference";
        }
    }
    
    /**
     * Setup handler for reset tournament button
     */
    function setupResetButtonHandler() {
        const resetBtn = document.getElementById('tournament-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset your tournament progress? This cannot be undone.')) {
                    // Reset the tournament progress
                    if (window.tournamentManager) {
                        window.tournamentManager.resetProgress();
                        alert('Tournament progress has been reset.');
                    }
                }
            });
        }
    }
    
    /**
     * Setup handler for back button
     */
    function setupBackButtonHandler() {
        const backBtn = document.getElementById('settings-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const settingsScreen = document.getElementById('tournament-settings');
                if (settingsScreen) {
                    settingsScreen.classList.add('hidden');
                }
                if (typeof window.showMainMenu === 'function') {
                    window.showMainMenu();
                }
            });
        }
    }
    
    /**
     * Get text representation of animation speed
     */
    function getSpeedText(speed) {
        const numSpeed = parseInt(speed);
        if (numSpeed === 0) return 'Instant';
        if (numSpeed <= 150) return 'Fast';
        if (numSpeed >= 400) return 'Slow';
        return 'Normal';
    }
})();