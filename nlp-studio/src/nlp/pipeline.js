/**
 * NLP Pipeline — Orchestrates all NLP engines, manages processing flow
 */

import { analyzeSentiment } from './sentiment.js';
import { extractEntities } from './ner.js';
import { summarize } from './summarizer.js';
import { translate } from './translator.js';
import { detectIntent } from './intent.js';
import { logger } from '../core/logger.js';

/**
 * Run a single NLP analysis
 */
export async function runAnalysis(type, text, options = {}) {
  const startTime = performance.now();
  logger.info(`Running ${type} analysis`, { textLength: text.length });

  let result;

  try {
    switch (type) {
      case 'sentiment':
        result = analyzeSentiment(text);
        break;
      case 'ner':
        result = await extractEntities(text);
        break;
      case 'summary':
        result = summarize(text, {
          ratio: options.ratio || 0.3,
          maxSentences: options.maxSentences || 10
        });
        break;
      case 'translate':
        result = await translate(text, options.from || 'en', options.to || 'es');
        break;
      case 'intent':
        result = detectIntent(text);
        break;
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
  } catch (err) {
    logger.error(`${type} analysis failed`, { error: err.message });
    throw err;
  }

  const elapsed = Math.round(performance.now() - startTime);
  logger.info(`${type} analysis complete in ${elapsed}ms`);

  return {
    type,
    result,
    timestamp: new Date().toISOString(),
    processingTime: elapsed,
    inputLength: text.length
  };
}

/**
 * Run full analysis pipeline — all engines at once
 */
export async function runFullPipeline(text, options = {}) {
  const startTime = performance.now();
  logger.info('Running full NLP pipeline', { textLength: text.length });

  const results = {};
  const errors = [];

  // Run independent analyses in parallel
  const analyses = [
    runAnalysis('sentiment', text).then(r => { results.sentiment = r; }).catch(e => errors.push({ type: 'sentiment', error: e.message })),
    runAnalysis('ner', text).then(r => { results.ner = r; }).catch(e => errors.push({ type: 'ner', error: e.message })),
    runAnalysis('summary', text, options).then(r => { results.summary = r; }).catch(e => errors.push({ type: 'summary', error: e.message })),
    runAnalysis('intent', text).then(r => { results.intent = r; }).catch(e => errors.push({ type: 'intent', error: e.message }))
  ];

  // Translation is optional — only if target language provided
  if (options.to) {
    analyses.push(
      runAnalysis('translate', text, options)
        .then(r => { results.translate = r; })
        .catch(e => errors.push({ type: 'translate', error: e.message }))
    );
  }

  await Promise.all(analyses);

  const elapsed = Math.round(performance.now() - startTime);
  logger.info(`Full pipeline complete in ${elapsed}ms`, { errors: errors.length });

  return {
    results,
    errors,
    totalTime: elapsed,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get word and sentence statistics
 */
export function getTextStats(text) {
  if (!text) return { characters: 0, words: 0, sentences: 0, paragraphs: 0, avgWordLength: 0 };

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const avgWordLength = words.length > 0
    ? Math.round(words.reduce((sum, w) => sum + w.length, 0) / words.length * 10) / 10
    : 0;

  return {
    characters: text.length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgWordLength
  };
}
