/**
 * Named Entity Recognition (NER) — Uses compromise.js for entity extraction
 * 
 * Extracts: People, Places, Organizations, Dates (via pattern matching), Values
 * 
 * compromise.js v14 API:
 * - doc.people() — names of people
 * - doc.places() — geographic locations
 * - doc.organizations() — company/org names
 * - doc.values() / doc.numbers() / doc.money() — numeric values
 * - Date extraction via regex patterns (compromise v14 has no .dates() method)
 * 
 * @module ner
 */

let nlp = null;

/**
 * Lazily load compromise.js (code-split for performance).
 * @returns {Promise<function>} The compromise constructor
 */
async function loadNLP() {
  if (!nlp) {
    const module = await import('compromise');
    nlp = module.default;
  }
  return nlp;
}

/**
 * Entity type definitions for consistent handling across the application.
 * Each type has a label, color (hex), and CSS class for annotation styling.
 * 
 * @type {Object<string, {label: string, color: string, cssClass: string}>}
 */
const ENTITY_TYPES = {
  person: { label: 'Person', color: '#6c63ff', cssClass: 'entity--person' },
  place: { label: 'Place', color: '#00d4aa', cssClass: 'entity--place' },
  organization: { label: 'Organization', color: '#ff6b9d', cssClass: 'entity--org' },
  date: { label: 'Date', color: '#ffb347', cssClass: 'entity--date' },
  value: { label: 'Value', color: '#54a0ff', cssClass: 'entity--value' }
};

/**
 * Date patterns for extraction (compromise v14 doesn't have .dates())
 * Matches common date formats in English text.
 */
const DATE_PATTERNS = [
  // Month Day, Year: "January 15, 2024" or "Jan 15th 2024"
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}\b/gi,
  // Day Month Year: "15 January 2024"
  /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  // Relative dates: "yesterday", "today", "tomorrow", "last week", etc.
  /\b(?:yesterday|today|tomorrow|last\s+(?:week|month|year)|next\s+(?:week|month|year)|this\s+(?:week|month|year))\b/gi,
  // Day names: "Monday", "on Tuesday"
  /\b(?:on\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
  // Relative: "in January", "during March"
  /\b(?:in|during)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
  // At time: "at noon", "at midnight", "at 3pm"
  /\bat\s+(?:noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\b/gi
];

/**
 * Extract named entities from text using compromise.js and custom patterns.
 * 
 * @param {string} text - Input text to analyze
 * @returns {Promise<{entities: Array<{text: string, type: string, label: string, start?: number, end?: number}>, counts: Object<string, number>, annotatedText: string}>}
 * 
 * @example
 * const result = await extractEntities('John Smith visited Paris on Monday');
 * // result.entities: [{text: 'John Smith', type: 'person', ...}, {text: 'Paris', type: 'place', ...}, ...]
 */
export async function extractEntities(text) {
  if (!text || typeof text !== 'string') {
    return { entities: [], counts: {}, annotatedText: '' };
  }

  const compromise = await loadNLP();
  const doc = compromise(text);

  const entities = [];
  const seen = new Set();

  // Helper to add unique entities
  function addEntity(t, type) {
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      entities.push({ text: t, type, label: ENTITY_TYPES[type].label });
    }
  }

  // Extract people
  doc.people().forEach((match) => {
    addEntity(match.text().trim(), 'person');
  });

  // Extract places
  doc.places().forEach((match) => {
    addEntity(match.text().trim(), 'place');
  });

  // Extract organizations
  doc.organizations().forEach((match) => {
    addEntity(match.text().trim(), 'organization');
  });

  // Extract dates via regex patterns (compromise v14 lacks .dates())
  for (const pattern of DATE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addEntity(match[0].trim(), 'date');
    }
  }

  // Extract values (money, numbers, percentages)
  doc.values().forEach((match) => {
    addEntity(match.text().trim(), 'value');
  });

  // Calculate positions in original text
  for (const entity of entities) {
    const idx = text.indexOf(entity.text);
    if (idx !== -1) {
      entity.start = idx;
      entity.end = idx + entity.text.length;
    }
  }

  // Sort by position in text
  entities.sort((a, b) => (a.start || 0) - (b.start || 0));

  // Count entities by type
  const counts = {};
  for (const e of entities) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }

  // Create annotated HTML with highlighted entities
  const annotatedText = createAnnotatedText(text, entities);

  return { entities, counts, annotatedText };
}

/**
 * Create HTML string with inline-highlighted entities.
 * Non-entity text is HTML-escaped; entities are wrapped in styled spans.
 * 
 * @param {string} text - Original text
 * @param {Array} entities - Extracted entities with start/end positions
 * @returns {string} HTML string with entity annotations
 */
function createAnnotatedText(text, entities) {
  if (entities.length === 0) return escapeForHtml(text);

  let result = '';
  let lastEnd = 0;

  for (const entity of entities) {
    if (entity.start === undefined) continue;

    // Add text before entity (escaped)
    result += escapeForHtml(text.slice(lastEnd, entity.start));

    // Add highlighted entity span
    const typeInfo = ENTITY_TYPES[entity.type];
    result += `<span class="entity ${typeInfo.cssClass}" title="${typeInfo.label}" role="mark" aria-label="${typeInfo.label}: ${escapeForHtml(entity.text)}">${escapeForHtml(entity.text)}</span>`;

    lastEnd = entity.end;
  }

  // Add remaining text after last entity
  result += escapeForHtml(text.slice(lastEnd));

  return result;
}

/**
 * Simple HTML escape for entity display safety.
 * 
 * @param {string} str - String to escape
 * @returns {string} HTML-escaped string
 */
function escapeForHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { ENTITY_TYPES };
