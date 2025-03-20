/**
 * sound-settings.js
 * Adds sound settings to the game's settings screen
 * Uses a non-invasive approach that enhances the existing settings function
 */
(function() {
    // Function to add sound settings to tournament settings
    function addSoundSettingsToTournamentSettings() {
        // Find the settings container
        const settingsContainer = document.querySelector('#tournament-settings .settings-container');
        if (!settingsContainer) return;
        
        // Check if sound settings already exist
        if (settingsContainer.querySelector('#sound-settings-item')) return;
        
        // Create sound settings item
        const soundSettingsItem = document.createElement('div');
        soundSettingsItem.id = 'sound-settings-item';
        soundSettingsItem.className = 'settings-item';
        soundSettingsItem.innerHTML = `
            <h2>Sound</h2>
            <p>Toggle game sounds on or off.</p>
            <button id="sound-toggle-btn" class="large-btn">Sound: ${window.soundManager && window.soundManager.isSoundEnabled ? 'ON' : 'OFF'}</button>
        `;
        
        // Add sound settings as the first item
        if (settingsContainer.firstChild) {
            settingsContainer.insertBefore(soundSettingsItem, settingsContainer.firstChild);
        } else {
            settingsContainer.appendChild(soundSettingsItem);
        }
        
        // Add event listener for sound toggle
        const soundToggleBtn = document.getElementById('sound-toggle-btn');
        if (soundToggleBtn && window.soundManager) {
            soundToggleBtn.addEventListener('click', () => {
                const isEnabled = window.soundManager.toggleSound();
                soundToggleBtn.textContent = `Sound: ${isEnabled ? 'ON' : 'OFF'}`;
                // Play a sound when enabling
                if (isEnabled) {
                    window.soundManager.playSound('menuButtonClick'); // Use menu button sound
                }
            });
            
            // Mark the button to prevent duplicate sound handlers
            soundToggleBtn.setAttribute('data-sound-added', 'true');
        }
    }

    // Hook into the showTournamentSettings function
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for everything to be loaded
        const initSettingsHook = () => {
            // Only do this if the game and settings function exist
            if (window.showTournamentSettings) {
                // Store original function reference
                const originalShowTournamentSettings = window.showTournamentSettings;
                
                // Replace with enhanced version
                window.showTournamentSettings = function() {
                    // Call original function first
                    originalShowTournamentSettings.apply(this, arguments);
                    
                    // Add our sound settings after a slight delay to ensure DOM is updated
                    setTimeout(addSoundSettingsToTournamentSettings, 0);
                };
                
                return true;
            }
            return false;
        };
        
        // Try immediately
        if (!initSettingsHook()) {
            // If not ready, try again after a delay
            setTimeout(initSettingsHook, 500);
        }
    });
})();
