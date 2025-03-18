/**
 * Tournament Service
 * Handles character image loading and fallbacks
 * Refactored to use event-driven architecture
 */
 
document.addEventListener('DOMContentLoaded', () => {
    // Get event system
    const events = window.gameEvents || null;
    
    // Preload character images with fallbacks
    preloadCharacterImages();
    
    // Add tournament initializations if tournament mode is active
    setupTournamentElements();
    
    // Emit service:initialized event
    if (events) {
        events.emit('tournamentService:initialized', {
            timestamp: Date.now()
        });
    }
});

/**
 * Preload character images with fallbacks
 */
function preloadCharacterImages() {
    // Get event system
    const events = window.gameEvents || null;
    
    // Fallback image in case the actual character images are missing
    const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0QTZGQTUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5DaGFyYWN0ZXI8L3RleHQ+PC9zdmc+';
    
    // Define character image filenames
    const characterImages = [
        'rabbit_pirate.webp',
        'dino_policeman.webp',
        'octopus_chef.webp',
        'cowboy_skeleton.webp',
        'alien_accountant.webp',
        'vampire_sloth.webp',
        'disco_walrus.webp',
        'cat_detective.webp', 
        'tropical_gangsta_bear.webp',
        'time_travelling_raccoon.webp',
        'koala_hacker.webp'
    ];
    
    // Check if assets directory exists
    ensureCharactersDirectory();
    
    // Preload images and handle fallbacks
    for (const image of characterImages) {
        const img = new Image();
        img.onerror = function() {
            const fallback = createFallbackImage(image, fallbackImage);
            
            // Emit image:fallbackCreated event
            if (events) {
                events.emit('image:fallbackCreated', {
                    image: image,
                    fallback: fallback ? 'created' : 'failed'
                });
            }
        };
        img.onload = function() {
            // Emit image:loaded event
            if (events) {
                events.emit('image:loaded', {
                    image: image
                });
            }
        };
        img.src = `assets/characters/${image}`;
    }
    
    // Emit images:preloadStarted event
    if (events) {
        events.emit('images:preloadStarted', {
            count: characterImages.length
        });
    }
}

/**
 * Check for directory structure
 * Note: Browsers can't create directories, this just logs a warning
 */
function ensureCharactersDirectory() {
    // Get event system
    const events = window.gameEvents || null;
    
    // In a browser context, we can't create directories
    // This function now just checks for existence and logs warnings
    
    // Create a test image to check if the directory might exist
    const testImg = new Image();
    testImg.onerror = function() {
        console.warn('Characters directory may not exist. Character images may not load properly.');
        
        // Emit directory:missing event
        if (events) {
            events.emit('directory:missing', {
                path: 'assets/characters'
            });
        }
    };
    testImg.onload = function() {
        console.log('Characters directory appears to be accessible');
        
        // Emit directory:accessible event
        if (events) {
            events.emit('directory:accessible', {
                path: 'assets/characters'
            });
        }
    };
    testImg.src = 'assets/characters/test-access.png';
}

/**
 * Create fallback image for missing character images
 */
function createFallbackImage(imageName, fallbackImage) {
    // Get event system
    const events = window.gameEvents || null;
    
    // If unable to load actual image, create a personalized fallback based on character name
    console.warn(`Character image ${imageName} not found, using fallback`);
    
    // Extract character name from filename to create a better fallback
    let characterName = 'Character';
    if (imageName.includes('_')) {
        // Extract parts from filenames like "rabbit_pirate.webp"
        const parts = imageName.split('.')[0].split('_');
        if (parts.length >= 2) {
            characterName = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
        }
    }
    
    // Create custom SVG with character's name
    const customFallback = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#4A6FA5"/>
        <circle cx="50" cy="40" r="20" fill="#333"/>
        <rect x="30" y="65" width="40" height="25" rx="5" fill="#333"/>
        <text x="50" y="92" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${characterName}</text>
    </svg>`)}`;
    
    // Store the fallback in localStorage to use later
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`char_img_${imageName}`, customFallback);
            
            // Emit fallback:stored event
            if (events) {
                events.emit('fallback:stored', {
                    image: imageName,
                    name: characterName
                });
            }
        }
    } catch (e) {
        console.error('Could not save fallback image to localStorage', e);
        
        // Emit fallback:storeFailed event
        if (events) {
            events.emit('fallback:storeFailed', {
                image: imageName,
                error: e.message
            });
        }
    }
    
    // Apply to any current images
    applyFallbackToCurrentImages(imageName, customFallback);
    
    return customFallback;
}

/**
 * Apply fallback image to current images in the DOM
 */
function applyFallbackToCurrentImages(imageName, fallbackImage) {
    // Get event system
    const events = window.gameEvents || null;
    
    // Find any images currently trying to use this file and replace src
    const images = document.querySelectorAll(`img[src$="${imageName}"]`);
    images.forEach(img => {
        img.src = fallbackImage;
    });
    
    // Emit fallback:applied event
    if (events && images.length > 0) {
        events.emit('fallback:applied', {
            image: imageName,
            count: images.length
        });
    }
}

/**
 * Setup tournament UI elements with additional behaviors
 */
function setupTournamentElements() {
    // Get event system
    const events = window.gameEvents || null;
    
    // Handle tournament completion visualization
    setupTournamentCompletion();
    
    // FIXED: Removed opponent selection behavior - no more ladder item selection
    // We no longer call setupLadderInteractions()
    
    // Emit elements:setup event
    if (events) {
        events.emit('tournamentElements:setup', {
            timestamp: Date.now()
        });
    }
}

/**
 * Setup tournament completion visualization
 */
function setupTournamentCompletion() {
    // Get event system
    const events = window.gameEvents || null;
    
    const completionScreen = document.getElementById('tournament-complete-screen');
    if (!completionScreen) return;
    
    // Add confetti effect on completion screen when visible
    const victorySection = completionScreen.querySelector('.tournament-victory');
    if (victorySection) {
        completionScreen.addEventListener('transitionend', (e) => {
            // Only trigger when the screen becomes visible
            if (e.propertyName === 'opacity' && !completionScreen.classList.contains('hidden')) {
                addCompletionEffects(victorySection);
                
                // Emit completion:effectsAdded event
                if (events) {
                    events.emit('completion:effectsAdded', {
                        timestamp: Date.now()
                    });
                }
            }
        });
    }
}

/**
 * Add special effects to tournament completion
 */
function addCompletionEffects(container) {
    // Get event system
    const events = window.gameEvents || null;
    
    if (!container) return;
    
    // Simple confetti animation using DOM elements
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `-${Math.random() * 20 + 10}px`;
        confetti.style.backgroundColor = getRandomColor();
        confetti.style.width = `${Math.random() * 6 + 3}px`;
        confetti.style.height = `${Math.random() * 6 + 3}px`;
        confetti.style.animationDelay = `${Math.random() * 3}s`;
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        container.appendChild(confetti);
        
        // Remove after animation completes
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 5000);
    }
    
    // Emit confetti:created event
    if (events) {
        events.emit('confetti:created', {
            count: 50
        });
    }
}

/**
 * Generate a random color for confetti
 */
function getRandomColor() {
    const colors = [
        '#4A6FA5', '#FFD700', '#FF5733', '#33FF57', '#5733FF',
        '#FF33A8', '#33FFF3', '#F3FF33'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}