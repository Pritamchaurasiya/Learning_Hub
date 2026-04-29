/**
 * Security Module — Input sanitization, XSS prevention, CSRF, validation
 * 
 * Enterprise-grade security utilities for client-side applications.
 * Provides HTML escaping, input sanitization, validation, CSRF tokens,
 * URL validation, rate limiting, and safe JSON parsing.
 * 
 * @module security
 */

// ─── HTML Entity Escaping ───

/** Map of dangerous characters to their HTML entity equivalents */
const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;'
};

/** Regex matching all characters that need HTML entity escaping */
const ENTITY_REGEX = /[&<>"'\/`]/g;

/**
 * Escapes HTML entities to prevent XSS in rendered content.
 * Converts dangerous characters (&, <, >, ", ', /, `) to HTML entities.
 * 
 * @param {string} str - The string to escape
 * @returns {string} HTML-safe string, or empty string if input is not a string
 * 
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(ENTITY_REGEX, (char) => ENTITY_MAP[char] || char);
}

// ─── Input Sanitization ───

/** Maximum input length to prevent ReDoS attacks via regex processing */
const MAX_SANITIZE_LENGTH = 100000;

/**
 * Sanitize user input — strips HTML tags and dangerous patterns.
 * Guards against XSS via tag injection, javascript: URLs, data: URLs,
 * on* event handlers, and CSS expression() injections.
 * 
 * @param {string} input - Raw user input to sanitize
 * @returns {string} Cleaned input string, or empty string if input is invalid
 * 
 * @example
 * sanitizeInput('<b>bold</b> <script>evil()</script>')
 * // Returns: 'bold evil()'
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Guard against ReDoS with excessively long inputs
  if (input.length > MAX_SANITIZE_LENGTH) {
    input = input.substring(0, MAX_SANITIZE_LENGTH);
  }

  return input
    // Strip all HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: URLs (case-insensitive, handles whitespace)
    .replace(/javascript\s*:/gi, '')
    // Remove data: URLs
    .replace(/data\s*:/gi, '')
    // Remove on* event handlers (e.g., onclick=, onerror=)
    .replace(/on\w+\s*=/gi, '')
    // Remove CSS expression() injections
    .replace(/expression\s*\(/gi, '')
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, '')
    // Trim leading/trailing whitespace
    .trim();
}

// ─── Input Validation ───

/**
 * Validate text input against configurable constraints.
 * Checks for type, minimum length, and maximum length.
 * Returns sanitized output alongside validation results.
 * 
 * @param {string} text - The text to validate
 * @param {Object} [options] - Validation constraints
 * @param {number} [options.minLength=1] - Minimum required character count
 * @param {number} [options.maxLength=50000] - Maximum allowed character count
 * @returns {{ valid: boolean, errors: string[], sanitized?: string }}
 * 
 * @example
 * validateTextInput('Hello World')
 * // Returns: { valid: true, errors: [], sanitized: 'Hello World' }
 * 
 * validateTextInput('', { minLength: 1 })
 * // Returns: { valid: false, errors: ['Text must be at least 1 character(s)'] }
 */
export function validateTextInput(text, { minLength = 1, maxLength = 50000 } = {}) {
  const errors = [];

  if (typeof text !== 'string') {
    errors.push('Input must be a string');
    return { valid: false, errors };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    errors.push(`Text must be at least ${minLength} character(s)`);
  }

  if (trimmed.length > maxLength) {
    errors.push(`Text must not exceed ${maxLength} characters`);
  }

  return { valid: errors.length === 0, errors, sanitized: sanitizeInput(trimmed) };
}

// ─── CSRF Protection ───

/**
 * Generate a cryptographically secure CSRF token.
 * Uses Web Crypto API (crypto.getRandomValues) for entropy.
 * 
 * @returns {string} 64-character hexadecimal token
 * 
 * @example
 * const token = generateCSRFToken();
 * // Returns something like: 'a1b2c3d4e5f6...' (64 hex chars)
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── CSP Nonce Generation ───

/**
 * Generate a nonce for Content Security Policy inline scripts/styles.
 * Each page load should generate a fresh nonce.
 * 
 * @returns {string} Base64-encoded 16-byte nonce
 */
export function generateCSPNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ─── URL Validation ───

/** Set of allowed URL protocols for validation */
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

/** Set of explicitly blocked URL protocols */
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'blob:']);

/**
 * Validate a URL — ensures it uses an allowed protocol (HTTP/HTTPS).
 * Explicitly blocks dangerous protocols like javascript:, data:, vbscript:.
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and uses an allowed protocol
 * 
 * @example
 * validateUrl('https://example.com')  // true
 * validateUrl('javascript:alert(1)')  // false
 * validateUrl('data:text/html,...')    // false
 */
export function validateUrl(url) {
  try {
    const parsed = new URL(url);
    // Explicitly reject dangerous protocols
    if (BLOCKED_PROTOCOLS.has(parsed.protocol)) return false;
    // Only allow HTTP and HTTPS
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Rate Limiting ───

/**
 * Create a sliding-window rate limiter to prevent API abuse.
 * Tracks request timestamps and enforces a maximum count per time window.
 * 
 * @param {number} [maxRequests=10] - Maximum requests allowed in the window
 * @param {number} [windowMs=60000] - Time window in milliseconds
 * @returns {function(): { allowed: boolean, retryAfter?: number }}
 * 
 * @example
 * const limiter = createRateLimiter(5, 10000); // 5 requests per 10 seconds
 * const result = limiter();
 * if (!result.allowed) {
 *   console.log(`Wait ${result.retryAfter} seconds`);
 * }
 */
export function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  const requests = [];

  return function canProceed() {
    const now = Date.now();
    // Remove expired entries from the front of the array
    while (requests.length > 0 && requests[0] < now - windowMs) {
      requests.shift();
    }

    if (requests.length >= maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000) };
    }

    requests.push(now);
    return { allowed: true };
  };
}

// ─── Safe JSON Parsing ───

/**
 * Safely parse JSON with prototype pollution protection.
 * Returns a fallback value on parse failure instead of throwing.
 * Strips __proto__ and constructor keys to prevent prototype pollution.
 * 
 * @param {string} str - JSON string to parse
 * @param {*} [fallback=null] - Value to return if parsing fails
 * @returns {*} Parsed object or fallback value
 * 
 * @example
 * safeJsonParse('{"key":"value"}')              // { key: 'value' }
 * safeJsonParse('invalid json', { default: 1 }) // { default: 1 }
 * safeJsonParse('{"__proto__":{"admin":true}}')  // {} (proto stripped)
 */
export function safeJsonParse(str, fallback = null) {
  try {
    const parsed = JSON.parse(str);
    // Prototype pollution protection
    if (typeof parsed === 'object' && parsed !== null) {
      return stripDangerousKeys(parsed);
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Recursively strip dangerous keys (__proto__, constructor, prototype)
 * from parsed JSON objects to prevent prototype pollution attacks.
 * 
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function stripDangerousKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null ? stripDangerousKeys(item) : item
    );
  }
  if (typeof obj !== 'object' || obj === null) return obj;

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const val = obj[key];
    clean[key] = typeof val === 'object' && val !== null ? stripDangerousKeys(val) : val;
  }
  return clean;
}

// ─── Module Export ───

/**
 * Aggregated security utilities namespace.
 * Provides convenient access to all security functions.
 */
export const security = {
  escapeHtml,
  sanitizeInput,
  validateTextInput,
  generateCSRFToken,
  generateCSPNonce,
  validateUrl,
  createRateLimiter,
  safeJsonParse
};
