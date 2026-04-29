/**
 * NLP Studio — Unit Tests for Intent Detection Engine
 */
import { describe, it, expect } from 'vitest';
import { detectIntent } from '../../src/nlp/intent.js';

describe('Intent Detection', () => {
  describe('Greeting detection', () => {
    it('detects hello', () => {
      const result = detectIntent('Hello there!');
      expect(result.intents.some(i => i.intent === 'greeting')).toBe(true);
    });

    it('detects good morning', () => {
      const result = detectIntent('Good morning everyone');
      expect(result.intents.some(i => i.intent === 'greeting')).toBe(true);
    });
  });

  describe('Question detection', () => {
    it('detects questions with question mark', () => {
      const result = detectIntent('What time is the meeting?');
      expect(result.intents.some(i => i.intent === 'question')).toBe(true);
    });

    it('detects how questions', () => {
      const result = detectIntent('How can I reset my password?');
      const hasQuestion = result.intents.some(i => i.intent === 'question' || i.intent === 'request');
      expect(hasQuestion).toBe(true);
    });
  });

  describe('Complaint detection', () => {
    it('detects complaints about broken things', () => {
      const result = detectIntent('The system is broken and not working at all');
      expect(result.intents.some(i => i.intent === 'complaint')).toBe(true);
    });
  });

  describe('Request detection', () => {
    it('detects requests with please', () => {
      const result = detectIntent('Please help me find the document');
      expect(result.intents.some(i => i.intent === 'request')).toBe(true);
    });

    it('detects need-based requests', () => {
      const result = detectIntent('I need help with my account');
      expect(result.intents.some(i => i.intent === 'request')).toBe(true);
    });
  });

  describe('Appreciation detection', () => {
    it('detects thank you', () => {
      const result = detectIntent('Thank you so much for your help!');
      expect(result.intents.some(i => i.intent === 'appreciation')).toBe(true);
    });
  });

  describe('Output structure', () => {
    it('returns correct structure', () => {
      const result = detectIntent('Hello world');
      expect(result).toHaveProperty('intents');
      expect(result).toHaveProperty('primaryIntent');
      expect(result).toHaveProperty('text');
      expect(result.primaryIntent).toHaveProperty('intent');
      expect(result.primaryIntent).toHaveProperty('label');
      expect(result.primaryIntent).toHaveProperty('confidence');
    });

    it('limits to top 5 intents', () => {
      const result = detectIntent('Please help me, I think there is a problem with the broken system, thank you');
      expect(result.intents.length).toBeLessThanOrEqual(5);
    });

    it('intents are sorted by confidence', () => {
      const result = detectIntent('Please help me find information');
      for (let i = 1; i < result.intents.length; i++) {
        expect(result.intents[i].confidence).toBeLessThanOrEqual(result.intents[i - 1].confidence);
      }
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = detectIntent('');
      expect(result.primaryIntent.intent).toBe('unknown');
    });

    it('handles null', () => {
      const result = detectIntent(null);
      expect(result.primaryIntent.intent).toBe('unknown');
    });
  });
});
