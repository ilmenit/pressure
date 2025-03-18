/**
 * Event System for decoupled communication between game components
 * Implements the Observer pattern
 */
class EventSystem {
    constructor() {
        this.listeners = {};
        this.debug = false; // Set to true to log events during development
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        
        this.listeners[event].push(callback);
        
        if (this.debug) {
            console.log(`Event listener added: ${event}`);
        }
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        
        if (this.listeners[event].length === 0) {
            delete this.listeners[event];
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        
        if (this.debug) {
            console.log(`Event emitted: ${event}`, data);
        }
        
        // Create a copy of the listeners array to avoid issues if callbacks modify the array
        const callbacks = [...this.listeners[event]];
        
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.listeners = {};
    }

    /**
     * Get all registered event types
     * @returns {string[]} - Array of event types
     */
    getRegisteredEvents() {
        return Object.keys(this.listeners);
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether debug mode is enabled
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Export as both a class and a singleton instance for flexibility
window.EventSystem = EventSystem;
window.gameEvents = new EventSystem();
