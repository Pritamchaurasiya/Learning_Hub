/**
 * NLP Studio — Unit Tests for Named Entity Recognition Engine
 */
import { describe, it, expect } from 'vitest';
import { extractEntities, ENTITY_TYPES } from '../../src/nlp/ner.js';

describe('Named Entity Recognition', () => {
  describe('Entity type definitions', () => {
    it('has all 5 entity types', () => {
      expect(Object.keys(ENTITY_TYPES)).toHaveLength(5);
      expect(ENTITY_TYPES).toHaveProperty('person');
      expect(ENTITY_TYPES).toHaveProperty('place');
      expect(ENTITY_TYPES).toHaveProperty('organization');
      expect(ENTITY_TYPES).toHaveProperty('date');
      expect(ENTITY_TYPES).toHaveProperty('value');
    });

    it('each type has label, color, and cssClass', () => {
      for (const [, val] of Object.entries(ENTITY_TYPES)) {
        expect(val).toHaveProperty('label');
        expect(val).toHaveProperty('color');
        expect(val).toHaveProperty('cssClass');
        expect(typeof val.label).toBe('string');
        expect(typeof val.color).toBe('string');
      }
    });
  });

  describe('Entity extraction', () => {
    it('extracts people names', async () => {
      const result = await extractEntities('John Smith went to the store');
      const people = result.entities.filter(e => e.type === 'person');
      expect(people.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts places', async () => {
      const result = await extractEntities('She traveled to Paris and London');
      const places = result.entities.filter(e => e.type === 'place');
      expect(places.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts dates via regex patterns', async () => {
      const result = await extractEntities('The meeting is on January 15th 2024');
      const dates = result.entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts relative dates', async () => {
      const result = await extractEntities('I will do it tomorrow or next week');
      const dates = result.entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });

    it('deduplicates entities (case-insensitive)', async () => {
      const result = await extractEntities('John met John at the park');
      const johns = result.entities.filter(e => e.text.toLowerCase() === 'john');
      expect(johns.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Output structure', () => {
    it('returns correct structure', async () => {
      const result = await extractEntities('Hello world');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('counts');
      expect(result).toHaveProperty('annotatedText');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(typeof result.counts).toBe('object');
      expect(typeof result.annotatedText).toBe('string');
    });

    it('entities have text, type, and label', async () => {
      const result = await extractEntities('John Smith lives in New York');
      for (const entity of result.entities) {
        expect(entity).toHaveProperty('text');
        expect(entity).toHaveProperty('type');
        expect(entity).toHaveProperty('label');
      }
    });

    it('entities are sorted by position', async () => {
      const result = await extractEntities('John went to Paris on Monday');
      for (let i = 1; i < result.entities.length; i++) {
        if (result.entities[i].start !== undefined && result.entities[i - 1].start !== undefined) {
          expect(result.entities[i].start).toBeGreaterThanOrEqual(result.entities[i - 1].start);
        }
      }
    });

    it('counts matches entity list', async () => {
      const result = await extractEntities('John Smith visited Paris');
      const countTotal = Object.values(result.counts).reduce((a, b) => a + b, 0);
      expect(countTotal).toBe(result.entities.length);
    });
  });

  describe('Annotated text', () => {
    it('contains entity spans', async () => {
      const result = await extractEntities('John went to Paris');
      if (result.entities.length > 0) {
        expect(result.annotatedText).toContain('class="entity');
      }
    });

    it('escapes HTML in annotations', async () => {
      const result = await extractEntities('Hello <script> world');
      expect(result.annotatedText).not.toContain('<script>');
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', async () => {
      const result = await extractEntities('');
      expect(result.entities).toHaveLength(0);
      expect(result.annotatedText).toBe('');
    });

    it('handles null', async () => {
      const result = await extractEntities(null);
      expect(result.entities).toHaveLength(0);
    });

    it('handles text with no entities', async () => {
      const result = await extractEntities('the quick brown fox jumps');
      expect(result.entities).toHaveLength(0);
    });
  });
});
