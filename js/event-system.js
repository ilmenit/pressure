/**
 * Event System for decoupled communication between game components
 * Implements the Observer pattern with simulation context tracking
 */
class EventSystem {
    constructor() {
        this.listeners = {};
        this.simulationContext = null;
        this.simulationStack = []; // Support for nested simulations
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
     * Subscribe only to real (non-simulated) events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    onReal(event, callback) {
        return this.on(event, (data) => {
            if (!data._simulated) {
                callback(data);
            }
        });
    }

    /**
     * Subscribe only to simulated events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    onSimulation(event, callback) {
        return this.on(event, (data) => {
            if (data._simulated) {
                callback(data);
            }
        });
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
     * Begin a simulation context
     * @returns {Object} The simulation context object
     */
    beginSimulation() {
        const newContext = { id: Date.now(), level: this.simulationStack.length };
        
        // Push to stack for nested simulations support
        this.simulationStack.push(newContext);
        this.simulationContext = newContext;
        
        if (this.debug) {
            console.log(`Simulation context started: ${newContext.id} (level: ${newContext.level})`);
        }
        
        this.emit('simulation:begin', { context: newContext });
        return newContext;
    }

    /**
     * End the current simulation context
     */
    endSimulation() {
        if (this.simulationStack.length === 0) {
            console.warn("Attempting to end simulation when no simulation is active");
            return;
        }
        
        const endedContext = this.simulationStack.pop();
        
        // Set current context to previous level or null if none
        this.simulationContext = this.simulationStack.length > 0 ? 
            this.simulationStack[this.simulationStack.length - 1] : null;
        
        if (this.debug) {
            console.log(`Simulation context ended: ${endedContext.id} (level: ${endedContext.level})`);
        }
        
        this.emit('simulation:end', { 
            context: endedContext,
            _simulated: false // Force this event to be non-simulated
        });
    }

    /**
     * Check if we're in a simulation context
     * @returns {boolean} True if in simulation
     */
    isInSimulation() {
        return this.simulationStack.length > 0;
    }

    /**
     * Get current simulation depth
     * @returns {number} Simulation depth (0 if not in simulation)
     */
    getSimulationDepth() {
        return this.simulationStack.length;
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        if (!this.listeners[event]) return;
        
        // ROBUST FIX: During simulation, only allow simulation control events and "simulation:*" events
        const isSimulationControlEvent = event === 'simulation:begin' || event === 'simulation:end' || event.startsWith('simulation:');
        const isInSimulation = this.isInSimulation();
        
        // Early return: Skip emitting ALL events during simulation except simulation control events
        // This is the crucial fix that prevents cascading UI updates during AI evaluation
        if (isInSimulation && !isSimulationControlEvent) {
            return; // Don't emit any events during simulation except simulation control events
        }
        
        // Add simulation context to event data as non-enumerable properties
        const eventData = { ...data };
        
        if (!isSimulationControlEvent || eventData._simulated === false) {
            // Only add these if not already defined
            if (!('_simulated' in eventData)) {
                Object.defineProperty(eventData, '_simulated', {
                    value: isInSimulation,
                    enumerable: false 
                });
            }
            
            if (!('_simulationContext' in eventData)) {
                Object.defineProperty(eventData, '_simulationContext', {
                    value: this.simulationContext,
                    enumerable: false
                });
            }
            
            if (!('_simulationDepth' in eventData)) {
                Object.defineProperty(eventData, '_simulationDepth', {
                    value: this.getSimulationDepth(),
                    enumerable: false
                });
            }
        }
        
        if (this.debug) {
            // Only log if not a simulation events (to avoid noise)
            if (event !== 'simulation:begin' && event !== 'simulation:end') {
                console.log(`Event emitted: ${event}`, 
                            `(simulated: ${isInSimulation})`, 
                            eventData);
            }
        }
        
        // Create a copy of the listeners array to avoid issues if callbacks modify the array
        const callbacks = [...this.listeners[event]];
        
        callbacks.forEach(callback => {
            try {
                callback(eventData);
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
        // Also clear any active simulation context
        this.simulationStack = [];
        this.simulationContext = null;
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