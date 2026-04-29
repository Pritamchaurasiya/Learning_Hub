/**
 * NLP Studio — Unit Tests for NLP Pipeline Orchestrator
 */
import { describe, it, expect } from 'vitest';
import { runAnalysis, getTextStats } from '../../src/nlp/pipeline.js';

describe('NLP Pipeline', () => {
  describe('runAnalysis', () => {
    it('runs sentiment analysis', async () => {
      const result = await runAnalysis('sentiment', 'This is amazing!');
      expect(result).toHaveProperty('type', 'sentiment');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('inputLength');
      expect(result.result.label).toContain('positive');
    });

    it('runs NER analysis', async () => {
      const result = await runAnalysis('ner', 'John went to Paris');
      expect(result.type).toBe('ner');
      expect(result.result).toHaveProperty('entities');
      expect(result.result).toHaveProperty('counts');
      expect(result.result).toHaveProperty('annotatedText');
    });

    it('runs summary analysis', async () => {
      const longText = 'Machine learning is a branch of AI. It enables computers to learn from data. Models are trained on datasets to make predictions. Deep learning uses neural networks with multiple layers. Natural language processing handles text and speech.';
      const result = await runAnalysis('summary', longText, { ratio: 0.3 });
      expect(result.type).toBe('summary');
      expect(result.result).toHaveProperty('summary');
      expect(result.result.summaryLength).toBeLessThanOrEqual(result.result.originalLength);
    });

    it('runs intent analysis', async () => {
      const result = await runAnalysis('intent', 'What is machine learning?');
      expect(result.type).toBe('intent');
      expect(result.result).toHaveProperty('intents');
      expect(result.result).toHaveProperty('primaryIntent');
    });

    it('throws on unknown analysis type', async () => {
      await expect(runAnalysis('unknown', 'test')).rejects.toThrow('Unknown analysis type');
    });

    it('records processingTime >= 0', async () => {
      const result = await runAnalysis('sentiment', 'Hello');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('records input length correctly', async () => {
      const text = 'Hello world';
      const result = await runAnalysis('sentiment', text);
      expect(result.inputLength).toBe(text.length);
    });

    it('includes ISO timestamp', async () => {
      const result = await runAnalysis('sentiment', 'Test');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getTextStats', () => {
    it('counts characters', () => {
      expect(getTextStats('Hello').characters).toBe(5);
    });

    it('counts words', () => {
      expect(getTextStats('Hello beautiful world').words).toBe(3);
    });

    it('counts sentences', () => {
      expect(getTextStats('Hello. World! Test?').sentences).toBe(3);
    });

    it('counts paragraphs', () => {
      expect(getTextStats('Para one.\n\nPara two.\n\nPara three.').paragraphs).toBe(3);
    });

    it('calculates average word length', () => {
      const stats = getTextStats('Hi there world');
      expect(stats.avgWordLength).toBeGreaterThan(0);
    });

    it('handles empty input', () => {
      const stats = getTextStats('');
      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
      expect(stats.sentences).toBe(0);
    });

    it('handles null input', () => {
      const stats = getTextStats(null);
      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
    });

    it('handles whitespace-only input', () => {
      const stats = getTextStats('   \n\t  ');
      expect(stats.words).toBe(0);
    });

    it('returns correct structure', () => {
      const stats = getTextStats('Test');
      expect(stats).toHaveProperty('characters');
      expect(stats).toHaveProperty('words');
      expect(stats).toHaveProperty('sentences');
      expect(stats).toHaveProperty('paragraphs');
      expect(stats).toHaveProperty('avgWordLength');
    });
  });
});
