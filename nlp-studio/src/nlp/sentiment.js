/**
 * Sentiment Analysis Engine — AFINN-based lexicon approach
 * Features: negation detection, emoji handling, intensifiers, confidence scoring
 */

// Compact AFINN-165 subset (most common words)
const LEXICON = {
  // Strongly positive
  'love': 3, 'excellent': 3, 'amazing': 3, 'awesome': 3, 'outstanding': 3,
  'fantastic': 3, 'wonderful': 3, 'brilliant': 3, 'superb': 3, 'perfect': 3,
  'magnificent': 3, 'incredible': 3, 'exceptional': 3, 'remarkable': 3,
  'extraordinary': 3, 'phenomenal': 3, 'spectacular': 3, 'marvelous': 3,

  // Positive
  'good': 2, 'great': 2, 'happy': 2, 'best': 2, 'beautiful': 2,
  'like': 1, 'nice': 2, 'enjoy': 2, 'glad': 2, 'pleased': 2,
  'fun': 2, 'delightful': 2, 'grateful': 2, 'thankful': 2, 'warm': 1,
  'kind': 2, 'generous': 2, 'helpful': 2, 'friendly': 2, 'cheerful': 2,
  'optimistic': 2, 'enthusiastic': 2, 'excited': 2, 'positive': 2,
  'impressive': 2, 'elegant': 2, 'successful': 2, 'effective': 2,
  'efficient': 1, 'innovative': 2, 'inspiring': 2, 'motivating': 2,
  'creative': 2, 'smart': 2, 'wise': 2, 'brave': 2, 'strong': 1,
  'peaceful': 2, 'calm': 1, 'relaxed': 1, 'comfortable': 1,
  'satisfying': 2, 'rewarding': 2, 'fulfilling': 2, 'joyful': 3,
  'triumph': 3, 'victory': 3, 'win': 2, 'won': 2, 'gain': 1,
  'profit': 1, 'benefit': 2, 'improve': 1, 'upgrade': 1, 'better': 1,
  'approve': 1, 'recommend': 2, 'endorse': 2, 'praise': 2, 'admire': 2,
  'respect': 2, 'trust': 2, 'support': 1, 'encourage': 2,

  // Mildly positive
  'ok': 1, 'okay': 1, 'fine': 1, 'decent': 1, 'fair': 1,
  'adequate': 1, 'acceptable': 1, 'reasonable': 1, 'interesting': 1,

  // Mildly negative
  'bad': -2, 'poor': -2, 'wrong': -2, 'boring': -2, 'ugly': -2,
  'annoying': -2, 'difficult': -1, 'hard': -1, 'complicated': -1,
  'confusing': -2, 'disappointing': -2, 'frustrating': -2,
  'mediocre': -1, 'average': -1, 'ordinary': -1, 'bland': -1,
  'dull': -2, 'slow': -1, 'weak': -1, 'lack': -1, 'lacking': -1,
  'miss': -1, 'missing': -1, 'fail': -2, 'failure': -2, 'failed': -2,
  'problem': -2, 'issue': -1, 'bug': -1, 'error': -2, 'broken': -2,
  'damage': -2, 'damaged': -2, 'hurt': -2, 'pain': -2, 'loss': -2,
  'lost': -1, 'waste': -2, 'wasted': -2, 'useless': -2,
  'unnecessary': -1, 'irrelevant': -1, 'outdated': -1,
  'decline': -1, 'decrease': -1, 'reduce': -1, 'limit': -1,
  'restrict': -1, 'block': -1, 'deny': -2, 'reject': -2,
  'complain': -2, 'complaint': -2, 'concern': -1, 'worry': -2,
  'stress': -2, 'anxiety': -2, 'nervous': -2, 'tense': -1,

  // Strongly negative
  'terrible': -3, 'horrible': -3, 'awful': -3, 'worst': -3, 'hate': -3,
  'disgusting': -3, 'dreadful': -3, 'pathetic': -3, 'atrocious': -3,
  'abysmal': -3, 'catastrophic': -3, 'disastrous': -3, 'tragic': -3,
  'devastating': -3, 'nightmare': -3, 'toxic': -3, 'vile': -3,
  'repulsive': -3, 'horrendous': -3, 'appalling': -3, 'abhorrent': -3,
  'outrageous': -3, 'furious': -3, 'livid': -3, 'enraged': -3,
  'infuriating': -3, 'despicable': -3, 'contemptible': -3,
  'destroy': -3, 'destroyed': -3, 'ruin': -3, 'ruined': -3, 'crash': -3,
  'scam': -3, 'fraud': -3, 'lie': -3, 'cheat': -3, 'steal': -3
};

// Emoji sentiment map
const EMOJI_SCORES = {
  '😀': 2, '😃': 2, '😄': 2, '😁': 2, '😆': 2, '😊': 2, '🥰': 3,
  '😍': 3, '🤩': 3, '😘': 2, '❤️': 3, '💕': 2, '💖': 3, '✨': 1,
  '🎉': 2, '🎊': 2, '👍': 1, '👏': 2, '🙌': 2, '💪': 1, '🔥': 1,
  '⭐': 2, '🌟': 2, '💯': 3, '✅': 1, '🏆': 2,
  '😢': -2, '😭': -3, '😡': -3, '🤬': -3, '😤': -2, '💔': -3,
  '👎': -2, '❌': -1, '😰': -2, '😱': -2, '🤮': -3, '💀': -2,
  '😞': -2, '😔': -2, '😟': -2, '😩': -2, '😫': -2, '🙁': -1,
  '😐': 0, '😑': -1, '🤔': 0, '😶': 0
};

const NEGATION_WORDS = new Set([
  'not', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't",
  "couldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't",
  'no', 'never', 'neither', 'nor', 'nothing', 'nowhere', 'nobody',
  'hardly', 'barely', 'scarcely', 'seldom', 'rarely', 'without'
]);

const INTENSIFIERS = {
  'very': 1.5, 'really': 1.5, 'extremely': 2.0, 'incredibly': 2.0,
  'absolutely': 2.0, 'totally': 1.8, 'completely': 1.8, 'highly': 1.5,
  'utterly': 2.0, 'quite': 1.3, 'rather': 1.2, 'somewhat': 0.7,
  'slightly': 0.5, 'barely': 0.3, 'so': 1.5, 'super': 1.8,
  'most': 1.5, 'especially': 1.5
};

const BUT_WORDS = new Set(['but', 'however', 'although', 'though', 'yet', 'nevertheless']);

/**
 * Tokenize text into words (lowercase, stripped of punctuation)
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Extract emojis from text
 */
function extractEmojis(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{FE0F}\u{200D}\u{2600}-\u{26FF}\u{2700}-\u{27BF}❤️✨✅❌⭐]/gu;
  return text.match(emojiRegex) || [];
}

/**
 * Analyze sentiment of text
 * @param {string} text - Input text
 * @returns {{ score: number, comparative: number, label: string, confidence: number, positive: string[], negative: string[], tokens: number }}
 */
export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return {
      score: 0, comparative: 0, label: 'neutral',
      confidence: 0, positive: [], negative: [], tokens: 0
    };
  }

  const tokens = tokenize(text);
  const emojis = extractEmojis(text);
  let totalScore = 0;
  let wordCount = 0;
  const positive = [];
  const negative = [];
  let intensifier = 1;
  let butIndex = -1;
  let lastNegationIndex = -1;

  // Find last "but" — words after "but" carry more weight
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (BUT_WORDS.has(tokens[i])) {
      butIndex = i;
      break;
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];

    // Check negation
    if (NEGATION_WORDS.has(word)) {
      lastNegationIndex = i;
      continue;
    }

    // Check intensifier
    if (INTENSIFIERS[word]) {
      intensifier = INTENSIFIERS[word];
      continue;
    }

    // Look up score
    if (LEXICON[word] !== undefined) {
      let score = LEXICON[word] * intensifier;

      // Apply negation — flip the score if negation occurred within the last 3 words
      if (lastNegationIndex !== -1 && i - lastNegationIndex <= 3) {
        score *= -0.75;
        lastNegationIndex = -1; // Consume the negation
      }

      // Words after "but" carry 1.5x weight
      if (butIndex >= 0 && i > butIndex) {
        score *= 1.5;
      }

      totalScore += score;
      wordCount++;

      if (score > 0) positive.push(word);
      else if (score < 0) negative.push(word);
    }

    // Reset intensifier after use
    intensifier = 1;
  }

  // Add emoji scores
  for (const emoji of emojis) {
    if (EMOJI_SCORES[emoji] !== undefined) {
      totalScore += EMOJI_SCORES[emoji];
      wordCount++;
      if (EMOJI_SCORES[emoji] > 0) positive.push(emoji);
      else if (EMOJI_SCORES[emoji] < 0) negative.push(emoji);
    }
  }

  const tokenCount = tokens.length || 1;
  const comparative = totalScore / tokenCount;

  // Determine label
  let label;
  if (comparative > 0.1) label = comparative > 0.5 ? 'very positive' : 'positive';
  else if (comparative < -0.1) label = comparative < -0.5 ? 'very negative' : 'negative';
  else label = 'neutral';

  // Confidence — based on how many sentiment words found relative to total
  const coverage = wordCount / tokenCount;
  const confidence = Math.min(0.99, Math.max(0.1, coverage * 2 + Math.abs(comparative) * 0.3));

  return {
    score: Math.round(totalScore * 100) / 100,
    comparative: Math.round(comparative * 1000) / 1000,
    label,
    confidence: Math.round(confidence * 100) / 100,
    positive: [...new Set(positive)],
    negative: [...new Set(negative)],
    tokens: tokenCount
  };
}
