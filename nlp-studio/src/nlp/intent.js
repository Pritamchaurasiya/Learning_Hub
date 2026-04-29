/**
 * Intent Detection Engine — Pattern-based intent classification
 * Uses keyword matching with confidence scoring for common intents
 */

/**
 * Intent definitions with keywords and patterns
 */
const INTENT_PATTERNS = {
  greeting: {
    label: 'Greeting',
    keywords: ['hello', 'hi', 'hey', 'greetings', 'howdy', 'good morning', 'good afternoon', 'good evening', 'welcome'],
    patterns: [/^(hi|hey|hello|greetings)\b/i, /\bgood\s+(morning|afternoon|evening|day)\b/i],
    weight: 1.0
  },
  farewell: {
    label: 'Farewell',
    keywords: ['bye', 'goodbye', 'see you', 'farewell', 'take care', 'later', 'goodnight'],
    patterns: [/\b(bye|goodbye|farewell)\b/i, /\bsee\s+you\b/i, /\btake\s+care\b/i],
    weight: 1.0
  },
  question: {
    label: 'Question',
    keywords: ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'could', 'would', 'can', 'does', 'is', 'are'],
    patterns: [/^(what|why|how|when|where|who|which|can|could|would|does|is|are)\b/i, /\?$/],
    weight: 0.8
  },
  request: {
    label: 'Request',
    keywords: ['please', 'help', 'need', 'want', 'require', 'looking for', 'search', 'find', 'get', 'give', 'show', 'send', 'provide'],
    patterns: [/\b(please|help me|i need|i want|looking for|can you)\b/i],
    weight: 1.0
  },
  complaint: {
    label: 'Complaint',
    keywords: ['problem', 'issue', 'broken', 'not working', 'error', 'bug', 'wrong', 'failed', 'complaint', 'disappointed', 'terrible', 'worst', "doesn't work", 'frustrated'],
    patterns: [/\b(not working|doesn't work|broken|failed|error|issue|problem)\b/i],
    weight: 1.2
  },
  appreciation: {
    label: 'Appreciation',
    keywords: ['thank', 'thanks', 'appreciate', 'grateful', 'awesome', 'amazing', 'excellent', 'perfect', 'wonderful', 'great job', 'well done'],
    patterns: [/\b(thank|thanks|appreciate|grateful|great job|well done)\b/i],
    weight: 1.0
  },
  opinion: {
    label: 'Opinion',
    keywords: ['think', 'believe', 'feel', 'opinion', 'view', 'perspective', 'consider', 'suppose', 'imagine', 'seems'],
    patterns: [/\b(i think|i believe|in my opinion|i feel|it seems)\b/i],
    weight: 0.9
  },
  information: {
    label: 'Information',
    keywords: ['information', 'detail', 'explain', 'describe', 'tell me about', 'learn', 'understand', 'know', 'definition', 'meaning'],
    patterns: [/\b(tell me about|explain|what is|define|meaning of)\b/i],
    weight: 1.0
  },
  command: {
    label: 'Command',
    keywords: ['do', 'make', 'create', 'delete', 'remove', 'update', 'change', 'add', 'set', 'start', 'stop', 'open', 'close', 'run', 'execute'],
    patterns: [/^(do|make|create|delete|remove|update|change|add|set|start|stop|open|close|run)\b/i],
    weight: 1.1
  },
  comparison: {
    label: 'Comparison',
    keywords: ['compare', 'difference', 'versus', 'vs', 'better', 'worse', 'prefer', 'rather', 'alternative', 'between'],
    patterns: [/\b(compare|difference between|vs|versus|better than|worse than)\b/i],
    weight: 1.0
  }
};

/**
 * Tokenize and normalize text
 */
function normalize(text) {
  return text.toLowerCase().trim();
}

/**
 * Detect intents in text with confidence scoring
 * @param {string} text - Input text
 * @returns {{ intents: Array<{intent: string, label: string, confidence: number}>, primaryIntent: {intent: string, label: string, confidence: number}, text: string }}
 */
export function detectIntent(text) {
  if (!text || typeof text !== 'string') {
    return {
      intents: [],
      primaryIntent: { intent: 'unknown', label: 'Unknown', confidence: 0 },
      text: ''
    };
  }

  const normalized = normalize(text);
  const words = normalized.split(/\s+/);
  const wordCount = words.length || 1;
  const results = [];

  for (const [intentKey, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;

    // Keyword matching
    let keywordMatches = 0;
    for (const keyword of config.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword
        if (normalized.includes(keyword)) {
          keywordMatches += 2; // Multi-word matches are more significant
        }
      } else {
        if (words.includes(keyword)) {
          keywordMatches += 1;
        }
      }
    }

    // Pattern matching
    let patternMatches = 0;
    for (const pattern of config.patterns) {
      if (pattern.test(normalized)) {
        patternMatches += 1;
      }
    }

    // Calculate score
    const keywordScore = (keywordMatches / (config.keywords.length || 1));
    const patternScore = patternMatches > 0 ? 0.4 : 0;
    score = (keywordScore * 0.6 + patternScore) * config.weight;

    // Only include if score is meaningful
    if (score > 0.05) {
      results.push({
        intent: intentKey,
        label: config.label,
        confidence: Math.min(0.99, Math.round(score * 100) / 100)
      });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  // Convert confidences to a true probability distribution using Softmax function (Industry Standard for Classifiers)
  // 1. Find max confidence for numerical stability
  const maxConf = results.length > 0 ? results[0].confidence : 0;
  
  // 2. Compute exponential values
  let sumExp = 0;
  for (const r of results) {
    r.expVal = Math.exp(r.confidence - maxConf);
    sumExp += r.expVal;
  }
  
  // 3. Normalize into probabilities
  for (const r of results) {
    r.confidence = Math.round((r.expVal / sumExp) * 100) / 100;
    delete r.expVal; // cleanup temporary variable
  }

  // Sort again in case probabilities shifted rounding
  results.sort((a, b) => b.confidence - a.confidence);

  const primaryIntent = results[0] || { intent: 'unknown', label: 'Unknown', confidence: 0 };

  return {
    intents: results.slice(0, 5), // Top 5 intents
    primaryIntent,
    text: text.trim()
  };
}
