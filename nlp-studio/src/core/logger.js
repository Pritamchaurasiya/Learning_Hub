/**
 * Structured Logger — Levels, timestamps, structured output, log viewer
 * 
 * Provides structured logging with:
 * - Four severity levels (debug, info, warn, error)
 * - Console output with color-coded formatting
 * - State store integration for UI log viewer
 * - Automatic log rotation (max entries)
 * - Collision-free unique IDs via crypto.randomUUID fallback
 * 
 * @module logger
 */

/** Numeric severity levels for comparison */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

/** Current minimum severity threshold */
let currentLevel = LOG_LEVELS.info;

/** Reference to the state store for log persistence */
let logStore = null;

/** Maximum log entries to retain in memory */
const MAX_LOGS = 500;

/**
 * Set the minimum log severity level.
 * Messages below this level will be silently dropped.
 * 
 * @param {string} level - One of: 'debug', 'info', 'warn', 'error'
 */
function setLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
  }
}

/**
 * Attach a state store for persisting log entries.
 * The store must implement getState(path) and setState(path, value).
 * 
 * @param {Object} store - State store instance
 */
function setStore(store) {
  logStore = store;
}

/**
 * Format a Date into HH:MM:SS for log display.
 * 
 * @param {Date} date - Date to format
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Generate a unique log entry ID.
 * Uses crypto.randomUUID when available, falls back to timestamp+random.
 * 
 * @returns {string} Unique identifier
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Core logging function. Creates a structured log entry,
 * outputs to console with color styling, and persists to state store.
 * 
 * @param {string} level - Severity level ('debug' | 'info' | 'warn' | 'error')
 * @param {string} message - Log message
 * @param {*} [data=null] - Optional structured data to attach
 * @returns {Object|undefined} The log entry object, or undefined if filtered
 */
function log(level, message, data = null) {
  if (LOG_LEVELS[level] < currentLevel) return;

  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    time: formatTime(new Date()),
    level,
    message,
    data
  };

  // Console output with color-coded severity
  const style = {
    debug: 'color: #7878a0',
    info: 'color: #54a0ff',
    warn: 'color: #ffb347',
    error: 'color: #ff4757'
  };
  const consoleFn = level === 'debug' ? 'log' : level;
  console[consoleFn](
    `%c[${entry.time}] [${level.toUpperCase()}]%c ${message}`,
    style[level], 'color: inherit',
    data || ''
  );

  // Persist to state store (if attached)
  if (logStore) {
    const logs = logStore.getState('logs') || [];
    logs.push(entry);
    // Rotate: keep only the most recent MAX_LOGS entries
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
    logStore.setState('logs', logs);
  }

  return entry;
}

/**
 * Logger instance with convenience methods for each severity level.
 * 
 * @example
 * logger.info('Application started');
 * logger.warn('Cache miss', { key: 'user_prefs' });
 * logger.error('Failed to fetch', { url, status: 500 });
 * logger.debug('State transition', { from, to });
 */
export const logger = {
  /** Log at DEBUG level (verbose development info) */
  debug: (msg, data) => log('debug', msg, data),
  /** Log at INFO level (normal operational messages) */
  info: (msg, data) => log('info', msg, data),
  /** Log at WARN level (potential issues, non-critical) */
  warn: (msg, data) => log('warn', msg, data),
  /** Log at ERROR level (failures, exceptions) */
  error: (msg, data) => log('error', msg, data),
  setLevel,
  setStore,
  LOG_LEVELS
};
