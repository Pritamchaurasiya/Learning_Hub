/**
 * Extractive Text Summarizer — TF-IDF sentence scoring
 * Produces concise summaries by extracting the most important sentences
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'him',
  'her', 'his', 'they', 'them', 'their', 'this', 'that', 'these',
  'those', 'which', 'who', 'whom', 'what', 'where', 'when', 'how',
  'if', 'then', 'than', 'so', 'no', 'not', 'only', 'very', 'just',
  'about', 'also', 'more', 'some', 'any', 'such', 'each', 'every',
  'all', 'both', 'few', 'most', 'other', 'into', 'over', 'after',
  'before', 'between', 'under', 'above', 'up', 'down', 'out', 'off',
  'through', 'during', 'until', 'while', 'because', 'since', 'there',
  'here', 'own', 'same', 'too', 'well', 'back', 'even', 'still',
  'new', 'one', 'two', 'first', 'last', 'long', 'great', 'little',
  'much', 'many', 'old', 'right', 'big', 'high', 'small', 'large',
  'next', 'early', 'young', 'important', 'public', 'able', 'get',
  'got', 'go', 'went', 'come', 'came', 'make', 'made', 'take',
  'took', 'know', 'knew', 'see', 'saw', 'say', 'said', 'think',
  'thought', 'give', 'gave', 'tell', 'told', 'work', 'call',
  'try', 'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep',
  'let', 'begin', 'seem', 'help', 'show', 'hear', 'play', 'run',
  'move', 'live', 'believe'
]);

/**
 * Split text into sentences
 */
function splitSentences(text) {
  // Handle common abbreviations
  const cleaned = text
    .replace(/Mr\./g, 'Mr')
    .replace(/Mrs\./g, 'Mrs')
    .replace(/Dr\./g, 'Dr')
    .replace(/Prof\./g, 'Prof')
    .replace(/Inc\./g, 'Inc')
    .replace(/Ltd\./g, 'Ltd')
    .replace(/vs\./g, 'vs')
    .replace(/etc\./g, 'etc')
    .replace(/i\.e\./g, 'ie')
    .replace(/e\.g\./g, 'eg');

  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

/**
 * Tokenize sentence into words
 */
function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Calculate Term Frequency (TF) for a document
 */
function calculateTF(words) {
  const tf = {};
  const total = words.length || 1;
  for (const word of words) {
    tf[word] = (tf[word] || 0) + 1;
  }
  for (const word in tf) {
    tf[word] /= total;
  }
  return tf;
}

/**
 * Calculate Inverse Document Frequency (IDF)
 */
function calculateIDF(sentences) {
  const idf = {};
  const N = sentences.length;
  const docFreq = {};

  for (const sentence of sentences) {
    const words = new Set(tokenize(sentence));
    for (const word of words) {
      docFreq[word] = (docFreq[word] || 0) + 1;
    }
  }

  for (const word in docFreq) {
    idf[word] = Math.log(N / (docFreq[word] || 1)) + 1;
  }

  return idf;
}

/**
 * Score sentences using TF-IDF with position bias
 */
function scoreSentences(sentences, idf) {
  return sentences.map((sentence, index) => {
    const words = tokenize(sentence);
    const tf = calculateTF(words);
    let score = 0;

    for (const word of words) {
      score += (tf[word] || 0) * (idf[word] || 1);
    }

    // Normalize by sentence length
    score /= Math.sqrt(words.length || 1);

    // Position bias — first and last sentences are often important
    const positionWeight =
      index === 0 ? 1.3 :
      index === sentences.length - 1 ? 1.1 :
      index < sentences.length * 0.3 ? 1.1 :
      1.0;

    score *= positionWeight;

    // Length bias — prefer medium-length sentences
    const wordCount = words.length;
    const lengthWeight =
      wordCount < 5 ? 0.5 :
      wordCount > 30 ? 0.8 :
      1.0;

    score *= lengthWeight;

    return { sentence, score, index };
  });
}

/**
 * Summarize text using extractive TF-IDF approach
 * @param {string} text - Input text to summarize
 * @param {Object} options
 * @param {number} options.ratio - Proportion of sentences to keep (0.1 - 0.9)
 * @param {number} options.minSentences - Minimum sentences in summary
 * @param {number} options.maxSentences - Maximum sentences in summary
 * @returns {{ summary: string, originalLength: number, summaryLength: number, compressionRatio: number, sentenceCount: number, topSentences: Array }}
 */
export function summarize(text, { ratio = 0.3, minSentences = 1, maxSentences = 10 } = {}) {
  if (!text || typeof text !== 'string') {
    return {
      summary: '', originalLength: 0, summaryLength: 0,
      compressionRatio: 0, sentenceCount: 0, topSentences: []
    };
  }

  const sentences = splitSentences(text);

  if (sentences.length <= 2) {
    return {
      summary: text.trim(),
      originalLength: text.length,
      summaryLength: text.length,
      compressionRatio: 1,
      sentenceCount: sentences.length,
      topSentences: sentences.map((s, i) => ({ sentence: s, score: 1, index: i }))
    };
  }

  const idf = calculateIDF(sentences);
  const scored = scoreSentences(sentences, idf);

  // Determine number of sentences to extract
  let numSentences = Math.ceil(sentences.length * ratio);
  numSentences = Math.max(minSentences, Math.min(maxSentences, numSentences));
  numSentences = Math.min(numSentences, sentences.length);

  // Get top N sentences by score
  const topSentences = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, numSentences);

  // Reorder by original position for coherence
  topSentences.sort((a, b) => a.index - b.index);

  const summary = topSentences.map(s => s.sentence).join(' ');

  return {
    summary,
    originalLength: text.length,
    summaryLength: summary.length,
    compressionRatio: Math.round((1 - summary.length / text.length) * 100) / 100,
    sentenceCount: topSentences.length,
    topSentences
  };
}
