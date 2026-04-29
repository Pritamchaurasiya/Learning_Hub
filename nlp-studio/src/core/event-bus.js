/**
 * Event Bus — Pub/sub system for decoupled communication
 * 
 * Implements the Observer pattern for loose coupling between components.
 * Supports one-time listeners, wildcard clearing, and error isolation.
 * 
 * @module event-bus
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<function>>} */
    this._listeners = new Map();
    /** @type {Map<function, function>} Mapping from original to wrapped (once) callbacks */
    this._onceListeners = new Map();
  }

  /**
   * Register a persistent listener for an event.
   * 
   * @param {string} event - Event name to listen for
   * @param {function} callback - Handler function
   * @returns {function} Unsubscribe function — call to remove this listener
   * 
   * @example
   * const unsub = bus.on('toast', ({ message }) => console.log(message));
   * unsub(); // Stop listening
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Register a one-time listener. Automatically removed after first invocation.
   * 
   * @param {string} event - Event name
   * @param {function} callback - Handler (called at most once)
   * @returns {function} Unsubscribe function
   */
  once(event, callback) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      callback(...args);
    };
    this._onceListeners.set(callback, wrapped);
    return this.on(event, wrapped);
  }

  /**
   * Remove a listener for an event.
   * Handles both regular and once-wrapped callbacks.
   * 
   * @param {string} event - Event name
   * @param {function} callback - The original callback to remove
   */
  off(event, callback) {
    const wrapped = this._onceListeners.get(callback) || callback;
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(wrapped);
      listeners.delete(callback);
      if (listeners.size === 0) this._listeners.delete(event);
    }
    this._onceListeners.delete(callback);
  }

  /**
   * Emit an event, invoking all registered listeners.
   * Errors in individual handlers are caught and logged, never propagated.
   * 
   * @param {string} event - Event name to emit
   * @param {...*} args - Arguments passed to each listener
   */
  emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      // Create a shallow copy to prevent infinite loops if listeners mutate the Set during execution
      const listenersCopy = [...listeners];
      for (const cb of listenersCopy) {
        try {
          const result = cb(...args);
          // Catch unhandled Promise rejections from async listeners
          if (result && typeof result.catch === 'function') {
            result.catch(err => console.error(`[EventBus] Async Error in "${event}" handler:`, err));
          }
        } catch (err) {
          console.error(`[EventBus] Error in "${event}" handler:`, err);
        }
      }
    }
  }

  /**
   * Clear listeners. If event specified, clears only that event.
   * If no event, clears all listeners and once-mappings.
   * 
   * @param {string} [event] - Specific event to clear, or omit for all
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners registered for an event.
   * 
   * @param {string} event - Event name
   * @returns {number} Listener count
   */
  listenerCount(event) {
    return this._listeners.get(event)?.size || 0;
  }
}

/** Singleton event bus instance for application-wide use */
export const bus = new EventBus();
export { EventBus };
