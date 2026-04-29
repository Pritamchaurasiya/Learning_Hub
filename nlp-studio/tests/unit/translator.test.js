/**
 * NLP Studio — Unit Tests for Translator Module
 */
import { describe, it, expect, vi } from 'vitest';
import { getSupportedLanguages, translate, clearCache } from '../../src/nlp/translator.js';

describe('Translator', () => {
  describe('getSupportedLanguages', () => {
    it('returns an object with 28 languages', () => {
      const langs = getSupportedLanguages();
      expect(Object.keys(langs).length).toBe(28);
    });

    it('includes common languages', () => {
      const langs = getSupportedLanguages();
      expect(langs).toHaveProperty('en', 'English');
      expect(langs).toHaveProperty('es', 'Spanish');
      expect(langs).toHaveProperty('fr', 'French');
      expect(langs).toHaveProperty('de', 'German');
      expect(langs).toHaveProperty('ja', 'Japanese');
      expect(langs).toHaveProperty('zh', 'Chinese');
      expect(langs).toHaveProperty('hi', 'Hindi');
    });

    it('returns a copy (not a reference)', () => {
      const langs1 = getSupportedLanguages();
      const langs2 = getSupportedLanguages();
      langs1.xx = 'Test';
      expect(langs2).not.toHaveProperty('xx');
    });
  });

  describe('translate - same language', () => {
    it('returns original text when from === to', async () => {
      const result = await translate('Hello world', 'en', 'en');
      expect(result.translatedText).toBe('Hello world');
      expect(result.confidence).toBe(1);
      expect(result.cached).toBe(false);
      expect(result.fromName).toBe('English');
      expect(result.toName).toBe('English');
    });
  });

  describe('translate - validation', () => {
    it('throws on empty text', async () => {
      await expect(translate('')).rejects.toThrow('Text is required');
    });

    it('throws on null text', async () => {
      await expect(translate(null)).rejects.toThrow('Text is required');
    });

    it('throws on unsupported source language', async () => {
      await expect(translate('hello', 'xx', 'en')).rejects.toThrow('Unsupported source language');
    });

    it('throws on unsupported target language', async () => {
      await expect(translate('hello', 'en', 'xx')).rejects.toThrow('Unsupported target language');
    });
  });

  describe('translate - output structure', () => {
    it('returns correct keys for same-language translation', async () => {
      const result = await translate('Test', 'en', 'en');
      expect(result).toHaveProperty('translatedText');
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
      expect(result).toHaveProperty('fromName');
      expect(result).toHaveProperty('toName');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('cached');
    });
  });

  describe('clearCache', () => {
    it('does not throw', () => {
      expect(() => clearCache()).not.toThrow();
    });
  });
});
