/**
 * Reactive State Store — Proxy-based state management with persistence
 * 
 * Provides centralized state management with:
 * - Dot-notation path-based getState/setState
 * - Subscriber notification on state changes
 * - Middleware pipeline for state transitions
 * - LocalStorage persistence for settings and history
 * - Deep cloning for immutability guarantees
 * 
 * @module store
 */

/**
 * Default application state shape.
 * Serves as the initial state and reset target.
 */
const defaultState = {
  app: {
    currentPage: 'dashboard',
    sidebarOpen: false,
    theme: 'dark',
    loading: false
  },
  nlp: {
    inputText: '',
    activeTab: 'sentiment',
    processing: false,
    results: {
      sentiment: null,
      entities: null,
      summary: null,
      translation: null,
      intent: null
    }
  },
  history: [],
  settings: {
    autoAnalyze: false,
    maxHistoryItems: 50,
    language: 'en',
    targetLanguage: 'es',
    summaryRatio: 0.3,
    showConfidence: true,
    logLevel: 'info'
  },
  logs: []
};

/** Keys that should be persisted to localStorage */
const PERSIST_KEYS = ['settings', 'history'];

/** localStorage key prefix to avoid collisions */
const STORAGE_PREFIX = 'nlp-studio:';

/**
 * Deep clone an object/array/primitive.
 * Handles Date objects, arrays, and nested plain objects.
 * Does NOT handle Map, Set, or class instances — by design.
 * 
 * @param {*} obj - Value to clone
 * @returns {*} Deep clone of the input
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Safely read a value from localStorage and parse it.
 * Returns null if the key doesn't exist or parsing fails.
 * 
 * @param {string} key - Storage key (without prefix)
 * @returns {*} Parsed value or null
 */
function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Safely persist a value to localStorage.
 * Silently fails on quota exceeded or disabled storage.
 * 
 * @param {string} key - Storage key (without prefix)
 * @param {*} value - Value to persist (must be JSON-serializable)
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently handle quota exceeded or disabled localStorage
  }
}

/**
 * Create a new reactive store instance.
 * Each instance has its own subscriber map, middleware stack,
 * and state tree. Supports persistence via localStorage.
 * 
 * @param {Object} [initialState=defaultState] - Initial state shape
 * @returns {{ getState, setState, subscribe, use, reset }}
 * 
 * @example
 * const store = createStore();
 * store.setState('app.loading', true);
 * console.log(store.getState('app.loading')); // true
 * 
 * const unsub = store.subscribe('app', (newVal) => {
 *   console.log('App state changed:', newVal);
 * });
 * unsub(); // Stop listening
 */
function createStore(initialState = defaultState) {
  let state = deepClone(initialState);
  const middleware = [];
  // Each store instance gets its own subscriber map (fixes leak between instances)
  const subscribers = new Map();

  // ─── Hydrate from localStorage ───
  for (const key of PERSIST_KEYS) {
    const saved = loadFromStorage(key);
    if (saved !== null && state[key] !== undefined) {
      // Merge saved values into default state to preserve new keys
      if (typeof saved === 'object' && !Array.isArray(saved) && typeof state[key] === 'object') {
        state[key] = { ...deepClone(state[key]), ...saved };
      } else {
        state[key] = saved;
      }
    }
  }

  /**
   * Get state at a given dot-notation path, or the full state tree.
   * Returns a deep clone to prevent external mutation.
   * 
   * @param {string} [path] - Dot-notation path (e.g., 'app.currentPage')
   * @returns {*} Cloned state value, or undefined if path doesn't exist
   */
  function getState(path) {
    if (!path) return deepClone(state);
    const keys = path.split('.');
    let current = state;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return deepClone(current);
  }

  /**
   * Set state at a given dot-notation path.
   * Notifies all matching subscribers and runs middleware.
   * Persists specified keys to localStorage.
   * 
   * @param {string} path - Dot-notation path (e.g., 'settings.logLevel')
   * @param {*} value - New value to set at the path
   */
  function setState(path, value) {
    const prev = deepClone(state);
    const keys = path.split('.');
    let current = state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = deepClone(value);

    // Run middleware
    for (const mw of middleware) {
      mw({ prev, next: state, path, value });
    }

    // Notify subscribers for matching paths
    for (const [subPath, callbacks] of subscribers) {
      if (path.startsWith(subPath) || subPath.startsWith(path) || subPath === '*') {
        for (const cb of callbacks) {
          try {
            cb(getState(subPath), prev);
          } catch (err) {
            console.error('[Store] Subscriber error:', err);
          }
        }
      }
    }

    // Persist to localStorage
    const rootKey = keys[0];
    if (PERSIST_KEYS.includes(rootKey)) {
      saveToStorage(rootKey, state[rootKey]);
    }
  }

  /**
   * Subscribe to state changes at a given path.
   * The callback fires whenever the value at `path` (or any sub-path) changes.
   * Use '*' to listen to all state changes.
   * 
   * @param {string} path - Dot-notation path or '*' for all changes
   * @param {function} callback - Handler receiving (newValue, previousFullState)
   * @returns {function} Unsubscribe function
   */
  function subscribe(path, callback) {
    if (!subscribers.has(path)) {
      subscribers.set(path, new Set());
    }
    subscribers.get(path).add(callback);

    return function unsubscribe() {
      const subs = subscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) subscribers.delete(path);
      }
    };
  }

  /**
   * Register a middleware function that runs on every state change.
   * Receives { prev, next, path, value }.
   * 
   * @param {function} middlewareFn - Middleware handler
   */
  function use(middlewareFn) {
    middleware.push(middlewareFn);
  }

  /**
   * Reset state to initial values and notify all subscribers.
   * Also clears persisted storage for persisted keys.
   */
  function reset() {
    state = deepClone(initialState);
    // Clear persisted data
    for (const key of PERSIST_KEYS) {
      try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* noop */ }
    }
    for (const [, callbacks] of subscribers) {
      for (const cb of callbacks) {
        try { cb(deepClone(state)); } catch { /* noop */ }
      }
    }
  }

  return { getState, setState, subscribe, use, reset };
}

export const store = createStore();
export { createStore, defaultState };
