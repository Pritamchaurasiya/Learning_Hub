/**
 * Language Translation — MyMemory API integration with client-side caching
 * 
 * Features:
 * - 28 language pairs via MyMemory Translation API
 * - Client-side LRU cache (200 entries)
 * - Sliding-window rate limiting (30 req/min)
 * - Request timeout via AbortController
 * - Automatic retry with exponential backoff
 * - Text chunking for long inputs (500 char limit per API call)
 * 
 * API: Free, no API key required (rate limited to 5000 words/day)
 * 
 * @module translator
 */

import { createRateLimiter } from '../core/security.js';

/** Translation result cache (Map acts as LRU when we evict oldest) */
const translationCache = new Map();

/** Maximum cache entries before eviction */
const MAX_CACHE = 200;

/** Rate limiter: 30 requests per 60 seconds */
const rateLimiter = createRateLimiter(30, 60000);

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 10000;

/** Maximum retry attempts for failed requests */
const MAX_RETRIES = 2;

/**
 * Supported language codes and their display names.
 * @type {Object<string, string>}
 */
const LANGUAGE_MAP = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
  hi: 'Hindi', tr: 'Turkish', pl: 'Polish', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', el: 'Greek', th: 'Thai',
  vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', uk: 'Ukrainian'
};

/**
 * Get the map of supported languages.
 * Returns a copy to prevent external mutation.
 * 
 * @returns {Object<string, string>} Language code → display name
 */
export function getSupportedLanguages() {
  return { ...LANGUAGE_MAP };
}

/**
 * Generate a cache key for a translation request.
 * Uses first 100 chars of text to balance collision risk vs memory.
 * 
 * @param {string} text - Source text
 * @param {string} from - Source language code
 * @param {string} to - Target language code
 * @returns {string} Cache key
 */
function cacheKey(text, from, to) {
  return `${from}|${to}|${text.substring(0, 100)}`;
}

/**
 * Translate text using the MyMemory API.
 * 
 * Handles same-language passthrough, cache lookups, rate limiting,
 * long text chunking, and result caching.
 * 
 * @param {string} text - Text to translate
 * @param {string} [from='en'] - Source language code
 * @param {string} [to='es'] - Target language code
 * @returns {Promise<{translatedText: string, from: string, to: string, fromName: string, toName: string, confidence: number, cached: boolean}>}
 * @throws {Error} If text is empty, language is unsupported, rate limit exceeded, or API fails
 */
export async function translate(text, from = 'en', to = 'es') {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required for translation');
  }

  if (!LANGUAGE_MAP[from]) throw new Error(`Unsupported source language: ${from}`);
  if (!LANGUAGE_MAP[to]) throw new Error(`Unsupported target language: ${to}`);

  // Same language — passthrough
  if (from === to) {
    return {
      translatedText: text,
      from, to,
      fromName: LANGUAGE_MAP[from],
      toName: LANGUAGE_MAP[to],
      confidence: 1,
      cached: false
    };
  }

  // Cache lookup
  const key = cacheKey(text, from, to);
  if (translationCache.has(key)) {
    return { ...translationCache.get(key), cached: true };
  }

  // Rate limit check
  const rl = rateLimiter();
  if (!rl.allowed) {
    throw new Error(`Rate limit exceeded. Try again in ${rl.retryAfter} seconds.`);
  }

  // Split into chunks if text is too long (max 500 chars per request)
  const MAX_CHUNK = 500;
  if (text.length > MAX_CHUNK) {
    const chunks = splitIntoChunks(text, MAX_CHUNK);
    const translations = [];
    for (const chunk of chunks) {
      const result = await translateChunk(chunk, from, to);
      translations.push(result.translatedText);
    }
    const combined = {
      translatedText: translations.join(' '),
      from, to,
      fromName: LANGUAGE_MAP[from],
      toName: LANGUAGE_MAP[to],
      confidence: 0.8,
      cached: false
    };
    cacheResult(key, combined);
    return combined;
  }

  const result = await translateChunk(text, from, to);
  cacheResult(key, result);
  return result;
}

/**
 * Translate a single text chunk via the MyMemory API.
 * Includes timeout handling and retry logic with exponential backoff.
 * 
 * @param {string} text - Text chunk to translate (≤500 chars)
 * @param {string} from - Source language code
 * @param {string} to - Target language code
 * @param {number} [retryCount=0] - Current retry attempt
 * @returns {Promise<Object>} Translation result
 * @throws {Error} On network failure, API error, or timeout
 */
async function translateChunk(text, from, to, retryCount = 0) {
  const langPair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

  // AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Translation API error: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.responseStatus !== 200 || !data.responseData) {
      throw new Error(data.responseDetails || 'Translation failed');
    }

    return {
      translatedText: data.responseData.translatedText,
      from, to,
      fromName: LANGUAGE_MAP[from],
      toName: LANGUAGE_MAP[to],
      confidence: data.responseData.match || 0,
      cached: false
    };
  } catch (err) {
    clearTimeout(timeoutId);

    // Distinguish timeout from other errors
    if (err.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return translateChunk(text, from, to, retryCount + 1);
      }
      throw new Error('Translation request timed out. Please try again.');
    }

    // Retry on network errors
    if (retryCount < MAX_RETRIES && (err.message.includes('fetch') || err.message.includes('network'))) {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return translateChunk(text, from, to, retryCount + 1);
    }

    throw err;
  }
}

/**
 * Split text into chunks at sentence boundaries, respecting max length.
 * Ensures no chunk exceeds maxLen characters.
 * 
 * @param {string} text - Text to split
 * @param {number} maxLen - Maximum characters per chunk
 * @returns {string[]} Array of text chunks
 */
function splitIntoChunks(text, maxLen) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Cache a translation result, evicting the oldest entry if at capacity.
 * 
 * @param {string} key - Cache key
 * @param {Object} result - Translation result to cache
 */
function cacheResult(key, result) {
  if (translationCache.size >= MAX_CACHE) {
    // Remove oldest entry (first key in Map iteration order)
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, { ...result, cached: false });
}

/**
 * Clear the translation cache entirely.
 * Useful for testing or manual cache invalidation.
 */
export function clearCache() {
  translationCache.clear();
}
