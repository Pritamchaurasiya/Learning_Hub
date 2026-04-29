/**
 * NLP Studio — Unit Tests for Summarizer Engine
 */
import { describe, it, expect } from 'vitest';
import { summarize } from '../../src/nlp/summarizer.js';

const SAMPLE_TEXT = `
Artificial intelligence has transformed the technology industry in recent years. Companies around the world are investing billions of dollars in AI research and development. Machine learning algorithms can now process vast amounts of data to find patterns that humans might miss. Natural language processing enables computers to understand and generate human language with increasing accuracy.

The impact of AI extends far beyond the tech sector. Healthcare organizations use AI to improve diagnosis and treatment planning. Financial institutions deploy machine learning models for fraud detection and risk assessment. Manufacturing companies leverage computer vision and robotics to automate production lines and improve quality control.

Despite the enormous potential, AI also presents significant challenges. Concerns about bias in training data can lead to unfair outcomes for certain groups of people. Privacy issues arise when AI systems collect and process personal information. The displacement of workers by automation remains a topic of heated debate among economists and policymakers.

Looking ahead, experts predict that AI will continue to evolve rapidly. Advances in quantum computing could dramatically increase the speed and capability of AI systems. New frameworks for responsible AI development are emerging to address ethical concerns. The collaboration between humans and AI systems is expected to create new opportunities for innovation and economic growth.
`.trim();

describe('Text Summarizer', () => {
  describe('Basic summarization', () => {
    it('produces a shorter summary', () => {
      const result = summarize(SAMPLE_TEXT, { ratio: 0.3 });
      expect(result.summaryLength).toBeLessThan(result.originalLength);
    });

    it('returns valid compression ratio', () => {
      const result = summarize(SAMPLE_TEXT, { ratio: 0.3 });
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('extracts correct number of sentences', () => {
      const result = summarize(SAMPLE_TEXT, { ratio: 0.3, maxSentences: 3 });
      expect(result.sentenceCount).toBeLessThanOrEqual(3);
      expect(result.sentenceCount).toBeGreaterThan(0);
    });
  });

  describe('Ratio control', () => {
    it('higher ratio produces longer summary', () => {
      const short = summarize(SAMPLE_TEXT, { ratio: 0.2 });
      const long = summarize(SAMPLE_TEXT, { ratio: 0.5 });
      expect(long.summaryLength).toBeGreaterThanOrEqual(short.summaryLength);
    });
  });

  describe('Output structure', () => {
    it('returns correct keys', () => {
      const result = summarize(SAMPLE_TEXT);
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('originalLength');
      expect(result).toHaveProperty('summaryLength');
      expect(result).toHaveProperty('compressionRatio');
      expect(result).toHaveProperty('sentenceCount');
      expect(result).toHaveProperty('topSentences');
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const result = summarize('');
      expect(result.summary).toBe('');
      expect(result.sentenceCount).toBe(0);
    });

    it('handles null input', () => {
      const result = summarize(null);
      expect(result.summary).toBe('');
    });

    it('handles short text (1-2 sentences)', () => {
      const result = summarize('Hello world. This is short.');
      expect(result.summary).toBe('Hello world. This is short.');
      expect(result.compressionRatio).toBe(1);
    });

    it('handles single sentence', () => {
      const result = summarize('This is a single sentence that stands alone.');
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
