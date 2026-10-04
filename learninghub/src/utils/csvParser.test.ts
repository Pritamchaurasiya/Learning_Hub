import { describe, it, expect } from 'vitest'
import {
  parseCSVToRows,
  parseQuestionsCSV,
  generateSampleQuestionsCSV,
  generateSampleQuestionsJSON,
} from './csvParser'

describe('csvParser Utility', () => {
  describe('parseCSVToRows', () => {
    it('parses basic unquoted comma separated values', () => {
      const csv = 'col1,col2,col3\nval1,val2,val3'
      const rows = parseCSVToRows(csv)
      expect(rows).toEqual([
        ['col1', 'col2', 'col3'],
        ['val1', 'val2', 'val3'],
      ])
    })

    it('handles commas within quoted fields and escaped quotes', () => {
      const csv = 'Name,Bio\n"John ""The Great"", Doe","Software, ML & Data"\nJane,Dev'
      const rows = parseCSVToRows(csv)
      expect(rows).toHaveLength(3)
      expect(rows[1][0]).toBe('John "The Great", Doe')
      expect(rows[1][1]).toBe('Software, ML & Data')
      expect(rows[2][0]).toBe('Jane')
    })

    it('handles Windows CRLF line breaks and strips UTF-8 BOM', () => {
      const csv = '\uFEFFA,B\r\n1,2\r\n3,4'
      const rows = parseCSVToRows(csv)
      expect(rows).toEqual([
        ['A', 'B'],
        ['1', '2'],
        ['3', '4'],
      ])
    })
  })

  describe('parseQuestionsCSV', () => {
    it('returns error if CSV has fewer than 2 rows', () => {
      const res = parseQuestionsCSV('Question,Type')
      expect(res.questions).toHaveLength(0)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0].error).toContain('at least a header row')
    })

    it('returns error if required Question/Text column is missing', () => {
      const res = parseQuestionsCSV('Foo,Bar\n1,2')
      expect(res.errors[0].error).toContain('Header must contain')
    })

    it('correctly parses valid MCQ questions with letter answer key', () => {
      const csv = [
        'Question,Type,Difficulty,BloomLevel,Points,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Tags',
        '"What is 2+2?",MCQ,0.5,REMEMBER,10,3,4,5,6,B,"Basic arithmetic","math,addition"',
      ].join('\n')

      const res = parseQuestionsCSV(csv)
      expect(res.errors).toHaveLength(0)
      expect(res.questions).toHaveLength(1)
      const q = res.questions[0]
      expect(q.text).toBe('What is 2+2?')
      expect(q.type).toBe('MCQ')
      expect(q.difficulty).toBe(0.5)
      expect(q.bloomLevel).toBe('REMEMBER')
      expect(q.points).toBe(10)
      expect(q.tags).toEqual(['math', 'addition'])
      expect(q.options).toHaveLength(4)
      expect(q.options[1].text).toBe('4')
      expect(q.options[1].isCorrect).toBe(true)
      expect(q.options[0].isCorrect).toBe(false)
    })

    it('correctly parses MSQ with multiple correct answers', () => {
      const csv = [
        'Question,Type,OptionA,OptionB,OptionC,OptionD,CorrectOption',
        '"Select prime numbers",MSQ,2,3,4,6,"A,B"',
      ].join('\n')

      const res = parseQuestionsCSV(csv)
      expect(res.errors).toHaveLength(0)
      expect(res.questions).toHaveLength(1)
      const q = res.questions[0]
      expect(q.type).toBe('MSQ')
      const correctOpts = q.options.filter(o => o.isCorrect)
      expect(correctOpts).toHaveLength(2)
      expect(correctOpts.map(o => o.text)).toEqual(['2', '3'])
    })

    it('correctly parses TRUE_FALSE questions', () => {
      const csv = [
        'Question,Type,CorrectOption',
        '"Earth is the third planet from the sun.",TRUE_FALSE,True',
      ].join('\n')

      const res = parseQuestionsCSV(csv)
      expect(res.errors).toHaveLength(0)
      expect(res.questions).toHaveLength(1)
      const q = res.questions[0]
      expect(q.type).toBe('TRUE_FALSE')
      expect(q.options).toEqual([
        { text: 'True', isCorrect: true, order: 0 },
        { text: 'False', isCorrect: false, order: 1 },
      ])
    })

    it('reports row validation errors for invalid MCQ lacking correct option', () => {
      const csv = [
        'Question,Type,OptionA,OptionB,CorrectOption',
        '"Broken Question?",MCQ,Yes,No,C',
      ].join('\n')

      const res = parseQuestionsCSV(csv)
      expect(res.questions).toHaveLength(0)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0].row).toBe(2)
      expect(res.errors[0].error).toContain('requires exactly 1 correct option')
    })
  })

  describe('template generators', () => {
    it('generates non-empty valid sample CSV template', () => {
      const template = generateSampleQuestionsCSV()
      expect(template).toContain('Question,Type')
      const parsed = parseQuestionsCSV(template)
      expect(parsed.errors).toHaveLength(0)
      expect(parsed.questions.length).toBeGreaterThan(0)
    })

    it('generates valid sample JSON template', () => {
      const json = generateSampleQuestionsJSON()
      const data = JSON.parse(json)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data[0].text).toContain('quickselect')
    })
  })
})
