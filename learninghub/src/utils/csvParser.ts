import { RawQuestionInput, RawOptionInput } from '../services/questionBankService'

/**
 * RFC-4180 Compliant CSV Line/Row Parser
 * Handles quotes, commas within quoted cells, double-quote escaping (""), and newlines.
 */
export function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  // Strip UTF-8 BOM if present
  const sanitized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i]
    const nextChar = sanitized[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip CRLF
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  // Push final cell and row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

export interface CSVParseResult {
  questions: RawQuestionInput[]
  errors: Array<{ row: number; error: string }>
}

/**
 * Parses CSV content into Question Bank RawQuestionInput items with strict validation
 */
export function parseQuestionsCSV(csvContent: string): CSVParseResult {
  const rows = parseCSVToRows(csvContent)
  const result: CSVParseResult = {
    questions: [],
    errors: [],
  }

  if (rows.length < 2) {
    result.errors.push({
      row: 0,
      error: 'CSV must contain at least a header row and one question row.',
    })
    return result
  }

  const headerRow = rows[0].map(h => h.toLowerCase().replace(/[\s_-]+/g, ''))
  const getColIdx = (aliases: string[]): number => {
    return headerRow.findIndex(h => aliases.includes(h))
  }

  const textIdx = getColIdx(['text', 'question', 'questiontext', 'title'])
  const typeIdx = getColIdx(['type', 'questiontype'])
  const diffIdx = getColIdx(['difficulty', 'diff', 'level'])
  const bloomIdx = getColIdx(['bloom', 'bloomlevel', 'bloomstaxonomy'])
  const pointsIdx = getColIdx(['points', 'marks', 'score'])
  const explIdx = getColIdx(['explanation', 'solution', 'rationale'])
  const tagsIdx = getColIdx(['tags', 'topics', 'keywords'])
  const correctIdx = getColIdx(['correct', 'correctoption', 'answer', 'correctanswer'])

  if (textIdx === -1) {
    result.errors.push({
      row: 1,
      error: 'Header must contain a "Question" or "Text" column.',
    })
    return result
  }

  // Discover option columns (e.g. option1, option2, option_a, opt1...)
  const optionIndices: Array<{ label: string; index: number }> = []
  headerRow.forEach((col, idx) => {
    const match = col.match(/^(?:option|opt|choice)([0-9a-z])$/i)
    if (match) {
      optionIndices.push({ label: match[1].toUpperCase(), index: idx })
    }
  })

  // Fallback: If no option columns found, check columns named a, b, c, d
  if (optionIndices.length === 0) {
    ;['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
      const idx = headerRow.indexOf(letter)
      if (idx !== -1) {
        optionIndices.push({ label: letter.toUpperCase(), index: idx })
      }
    })
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const rowNum = r + 1
    const text = row[textIdx]?.trim() || ''

    if (!text) {
      continue // Skip empty row
    }

    if (text.length < 3) {
      result.errors.push({ row: rowNum, error: 'Question text must be at least 3 characters long.' })
      continue
    }

    const rawType = (row[typeIdx]?.trim() || 'MCQ').toUpperCase()
    const validTypes: Array<RawQuestionInput['type']> = [
      'MCQ',
      'MSQ',
      'TRUE_FALSE',
      'NUMERICAL',
      'SHORT_ANSWER',
      'SUBJECTIVE',
      'CODING',
    ]
    const type: RawQuestionInput['type'] = validTypes.includes(
      rawType as RawQuestionInput['type']
    )
      ? (rawType as RawQuestionInput['type'])
      : 'MCQ'

    const diffRaw = parseFloat(row[diffIdx] || '0.5')
    const difficulty = isNaN(diffRaw) ? 0.5 : Math.min(5, Math.max(0, diffRaw))

    const bloomRaw = (row[bloomIdx]?.trim() || 'UNDERSTAND').toUpperCase()
    const validBlooms: Array<RawQuestionInput['bloomLevel']> = [
      'REMEMBER',
      'UNDERSTAND',
      'APPLY',
      'ANALYZE',
      'EVALUATE',
      'CREATE',
    ]
    const bloomLevel: RawQuestionInput['bloomLevel'] = validBlooms.includes(
      bloomRaw as RawQuestionInput['bloomLevel']
    )
      ? (bloomRaw as RawQuestionInput['bloomLevel'])
      : 'UNDERSTAND'

    const pointsRaw = parseInt(row[pointsIdx] || '10', 10)
    const points = isNaN(pointsRaw) || pointsRaw <= 0 ? 10 : pointsRaw

    const explanation = explIdx !== -1 ? row[explIdx]?.trim() || undefined : undefined
    const tagsRaw = tagsIdx !== -1 ? row[tagsIdx]?.trim() || '' : ''
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,;|]+/)
          .map(t => t.trim())
          .filter(Boolean)
      : []

    // Parse options
    const options: RawOptionInput[] = []
    const rawCorrect = (correctIdx !== -1 ? row[correctIdx]?.trim() || '' : '').toUpperCase()
    const correctTokens = rawCorrect
      .split(/[,;|]+/)
      .map(t => t.trim())
      .filter(Boolean)

    if (type === 'TRUE_FALSE') {
      const isTrueCorrect =
        rawCorrect === 'TRUE' ||
        rawCorrect === 'T' ||
        rawCorrect === '1' ||
        rawCorrect === 'A'
      options.push(
        { text: 'True', isCorrect: isTrueCorrect, order: 0 },
        { text: 'False', isCorrect: !isTrueCorrect, order: 1 }
      )
    } else if (type === 'MCQ' || type === 'MSQ') {
      optionIndices.forEach((optInfo, optIdx) => {
        const optText = row[optInfo.index]?.trim() || ''
        if (optText) {
          // Check correctness: by 1-based index (e.g. "1"), letter (e.g. "A"), or matching text
          const optLetter = String.fromCharCode(65 + optIdx) // A, B, C, D
          const optNumber = String(optIdx + 1) // 1, 2, 3, 4
          const isCorrect =
            correctTokens.includes(optLetter) ||
            correctTokens.includes(optNumber) ||
            correctTokens.includes(optInfo.label) ||
            correctTokens.some(tok => tok.toLowerCase() === optText.toLowerCase())

          options.push({
            text: optText,
            isCorrect,
            order: optIdx,
          })
        }
      })

      if (options.length < 2) {
        result.errors.push({
          row: rowNum,
          error: `${type} requires at least 2 non-empty options.`,
        })
        continue
      }

      const correctCount = options.filter(o => o.isCorrect).length
      if (type === 'MCQ' && correctCount !== 1) {
        result.errors.push({
          row: rowNum,
          error: `MCQ requires exactly 1 correct option (found ${correctCount}). Check the "Correct" column.`,
        })
        continue
      }
      if (type === 'MSQ' && correctCount < 1) {
        result.errors.push({
          row: rowNum,
          error: `MSQ requires at least 1 correct option.`,
        })
        continue
      }
    }

    result.questions.push({
      text,
      type,
      difficulty,
      bloomLevel,
      points,
      explanation,
      tags,
      options,
    })
  }

  return result
}

/**
 * Returns a ready-to-download CSV template
 */
export function generateSampleQuestionsCSV(): string {
  return [
    'Question,Type,Difficulty,BloomLevel,Points,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Tags',
    '"What is the time complexity of binary search on a sorted array of size $N$?",MCQ,1.5,UNDERSTAND,10,"$O(1)$","$O(\\log N)$","$O(N)$","$O(N \\log N)$",B,"Binary search halves the search space each step: $O(\\log N)$","algorithms,dsa,binary-search"',
    '"Which of the following are ACID properties in relational database management systems?",MSQ,2.0,REMEMBER,15,"Atomicity","Concurrency","Isolation","Durability","A,C,D","ACID stands for Atomicity, Consistency, Isolation, Durability.","databases,sql,acid"',
    '"In JavaScript, `null == undefined` evaluates to true.",TRUE_FALSE,0.5,REMEMBER,5,True,False,,,"A","Loose equality coerces null and undefined to be equal.","javascript,web-dev"',
    '"Solve the recurrence relation $T(n) = 2T(n/2) + O(n)$.",MCQ,2.5,APPLY,20,"$O(n)$","$O(n \\log n)$","$O(n^2)$","$O(2^n)$",B,"Master Theorem Case 2: $a=2, b=2, d=1 \\implies O(n \\log n)$","algorithms,math,master-theorem"',
  ].join('\r\n')
}

/**
 * Returns a ready-to-download JSON template
 */
export function generateSampleQuestionsJSON(): string {
  const sample: RawQuestionInput[] = [
    {
      text: 'What is the time complexity of quickselect on average?',
      type: 'MCQ',
      difficulty: 2.0,
      bloomLevel: 'APPLY',
      points: 10,
      explanation: 'Average case time complexity for quickselect is linear $O(N)$.',
      tags: ['algorithms', 'quickselect'],
      options: [
        { text: '$O(1)$', isCorrect: false, order: 0 },
        { text: '$O(N)$', isCorrect: true, order: 1 },
        { text: '$O(N \\log N)$', isCorrect: false, order: 2 },
        { text: '$O(N^2)$', isCorrect: false, order: 3 },
      ],
    },
    {
      text: 'Which protocols operate at the Transport Layer of the OSI model?',
      type: 'MSQ',
      difficulty: 1.5,
      bloomLevel: 'REMEMBER',
      points: 15,
      explanation: 'TCP and UDP are layer 4 transport protocols.',
      tags: ['networking', 'osi'],
      options: [
        { text: 'TCP', isCorrect: true, order: 0 },
        { text: 'IP', isCorrect: false, order: 1 },
        { text: 'UDP', isCorrect: true, order: 2 },
        { text: 'HTTP', isCorrect: false, order: 3 },
      ],
    },
  ]
  return JSON.stringify(sample, null, 2)
}
