/**
 * NLP Studio — Unit Tests for Security Module
 */
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeInput,
  validateTextInput,
  generateCSRFToken,
  validateUrl,
  createRateLimiter,
  safeJsonParse
} from '../../src/core/security.js';

describe('Security Module', () => {
  describe('escapeHtml', () => {
    it('escapes angle brackets', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('escapes quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('handles non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(42)).toBe('');
    });

    it('handles clean strings', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeInput', () => {
    it('strips HTML tags', () => {
      expect(sanitizeInput('<b>bold</b>')).toBe('bold');
    });

    it('removes javascript: URLs', () => {
      expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:');
    });

    it('removes on* event handlers', () => {
      expect(sanitizeInput('onerror=alert(1)')).not.toContain('onerror=');
    });

    it('handles non-string input', () => {
      expect(sanitizeInput(null)).toBe('');
    });
  });

  describe('validateTextInput', () => {
    it('validates minimum length', () => {
      const result = validateTextInput('', { minLength: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('validates maximum length', () => {
      const result = validateTextInput('a'.repeat(100), { maxLength: 50 });
      expect(result.valid).toBe(false);
    });

    it('passes valid input', () => {
      const result = validateTextInput('Hello world');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sanitizes input', () => {
      const result = validateTextInput('<script>alert(1)</script>Test');
      expect(result.sanitized).not.toContain('<script>');
    });
  });

  describe('generateCSRFToken', () => {
    it('generates token of correct length', () => {
      const token = generateCSRFToken();
      expect(token.length).toBe(64); // 32 bytes * 2 hex chars
    });

    it('generates unique tokens', () => {
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('validateUrl', () => {
    it('accepts https URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('accepts http URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
    });

    it('rejects javascript URLs', () => {
      expect(validateUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('createRateLimiter', () => {
    it('allows requests within limit', () => {
      const limiter = createRateLimiter(3, 1000);
      expect(limiter().allowed).toBe(true);
      expect(limiter().allowed).toBe(true);
      expect(limiter().allowed).toBe(true);
    });

    it('blocks requests exceeding limit', () => {
      const limiter = createRateLimiter(2, 1000);
      limiter();
      limiter();
      const result = limiter();
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
      expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
    });

    it('returns fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid', 'fallback')).toBe('fallback');
    });

    it('returns null by default for invalid JSON', () => {
      expect(safeJsonParse('invalid')).toBe(null);
    });
  });
});
