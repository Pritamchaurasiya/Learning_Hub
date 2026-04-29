/**
 * NLP Studio — Unit Tests for Sentiment Analysis Engine
 */
import { describe, it, expect } from 'vitest';
import { analyzeSentiment } from '../../src/nlp/sentiment.js';

describe('Sentiment Analysis', () => {
  describe('Basic sentiment detection', () => {
    it('detects positive sentiment', () => {
      const result = analyzeSentiment('This product is amazing and wonderful!');
      expect(result.label).toContain('positive');
      expect(result.score).toBeGreaterThan(0);
      expect(result.comparative).toBeGreaterThan(0);
    });

    it('detects negative sentiment', () => {
      const result = analyzeSentiment('This is terrible and horrible!');
      expect(result.label).toContain('negative');
      expect(result.score).toBeLessThan(0);
      expect(result.comparative).toBeLessThan(0);
    });

    it('detects neutral sentiment', () => {
      const result = analyzeSentiment('The meeting is at 3pm in room 202.');
      expect(result.label).toBe('neutral');
    });
  });

  describe('Negation handling', () => {
    it('flips positive words with negation', () => {
      const positive = analyzeSentiment('This is good');
      const negated = analyzeSentiment('This is not good');
      expect(negated.score).toBeLessThan(positive.score);
    });

    it('handles contraction negations', () => {
      const result = analyzeSentiment("I don't like this");
      expect(result.score).toBeLessThanOrEqual(0);
    });
  });

  describe('Intensifiers', () => {
    it('amplifies score with intensifiers', () => {
      const normal = analyzeSentiment('This is good');
      const intense = analyzeSentiment('This is very good');
      expect(intense.score).toBeGreaterThan(normal.score);
    });

    it('extremely amplifies with strong intensifier', () => {
      const normal = analyzeSentiment('This is good');
      const extreme = analyzeSentiment('This is extremely good');
      expect(extreme.score).toBeGreaterThan(normal.score);
    });
  });

  describe('Emoji support', () => {
    it('detects positive emojis', () => {
      const result = analyzeSentiment('Great job! 😍💯');
      expect(result.score).toBeGreaterThan(0);
    });

    it('detects negative emojis', () => {
      const result = analyzeSentiment('So sad 😭💔');
      expect(result.score).toBeLessThan(0);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = analyzeSentiment('');
      expect(result.score).toBe(0);
      expect(result.label).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('handles null input', () => {
      const result = analyzeSentiment(null);
      expect(result.score).toBe(0);
    });

    it('handles undefined input', () => {
      const result = analyzeSentiment(undefined);
      expect(result.score).toBe(0);
    });

    it('returns correct structure', () => {
      const result = analyzeSentiment('test');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('comparative');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('positive');
      expect(result).toHaveProperty('negative');
      expect(result).toHaveProperty('tokens');
    });

    it('confidence is between 0 and 1', () => {
      const result = analyzeSentiment('This is really amazing and wonderful excellent product!');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('BUT-clause weighting', () => {
    it('emphasizes words after but', () => {
      const result = analyzeSentiment('The food was bad but the service was excellent');
      // "excellent" after "but" should carry more weight
      expect(result.score).toBeGreaterThan(-2);
    });
  });
});
