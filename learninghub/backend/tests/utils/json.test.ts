import { parseJsonArray, parseJsonObject } from '../../src/utils/json'

describe('json utilities', () => {
  describe('parseJsonObject', () => {
    it('returns objects unchanged', () => {
      expect(parseJsonObject({ questionId: 'optionId' })).toEqual({ questionId: 'optionId' })
    })

    it('parses legacy stringified objects', () => {
      expect(parseJsonObject('{"questionId":"optionId"}')).toEqual({ questionId: 'optionId' })
    })

    it('returns an empty object for invalid object values', () => {
      expect(parseJsonObject('not-json')).toEqual({})
      expect(parseJsonObject(['not', 'object'])).toEqual({})
    })
  })

  describe('parseJsonArray', () => {
    it('returns arrays unchanged', () => {
      expect(parseJsonArray([{ question_id: 'q1' }])).toEqual([{ question_id: 'q1' }])
    })

    it('parses legacy stringified arrays', () => {
      expect(parseJsonArray('[{"question_id":"q1"}]')).toEqual([{ question_id: 'q1' }])
    })

    it('returns an empty array for invalid array values', () => {
      expect(parseJsonArray('not-json')).toEqual([])
      expect(parseJsonArray({ not: 'array' })).toEqual([])
    })
  })
})
