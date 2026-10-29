with open(r'learninghub/backend/src/controllers/testsController.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add pyqPaperService import
if 'import { pyqPaperService }' not in code:
    code = "import { pyqPaperService, HISTORICAL_BENCHMARKS } from '../services/PyqPaperService'\n" + code

# 2. Add query params in listTests
old_params = "const { mode, difficulty, search, examId, countryId, exam, country, subjectId, subjectIds, includeGeneral } = req.query"
new_params = "const { mode, difficulty, search, examId, countryId, exam, country, subjectId, subjectIds, includeGeneral, isPYQ, year, shift, paper } = req.query"
if old_params in code:
    code = code.replace(old_params, new_params, 1)

# 3. Add filters in listTests
old_filter_insert = "  const difficultyFilter = normalizeEnumFilter(difficulty, TEST_DIFFICULTIES)\n  if (difficultyFilter) filters.difficulty = difficultyFilter as TestDifficulty"
new_filter_insert = """  const difficultyFilter = normalizeEnumFilter(difficulty, TEST_DIFFICULTIES)
  if (difficultyFilter) filters.difficulty = difficultyFilter as TestDifficulty

  if (String(isPYQ) === 'true' || modeFilter === 'PYQ') {
    filters.isPYQ = true
  } else if (String(isPYQ) === 'false') {
    filters.isPYQ = false
  }

  if (year && !isNaN(Number(year))) {
    filters.pyqYear = Number(year)
  }

  if (typeof shift === 'string' && shift.trim()) {
    filters.pyqShift = { contains: shift.trim(), mode: 'insensitive' }
  }

  if (typeof paper === 'string' && paper.trim()) {
    filters.pyqPaperName = { contains: paper.trim(), mode: 'insensitive' }
  }"""
if old_filter_insert in code:
    code = code.replace(old_filter_insert, new_filter_insert, 1)

# 4. Add select fields in listTests
old_test_select = """        negativeMarks: true,
        isAiGenerated: true,
        createdAt: true,"""
new_test_select = """        negativeMarks: true,
        isAiGenerated: true,
        isPYQ: true,
        pyqYear: true,
        pyqShift: true,
        pyqPaperName: true,
        markingScheme: true,
        createdAt: true,"""
if old_test_select in code:
    code = code.replace(old_test_select, new_test_select, 1)

# 5. Add transformedTests fields in listTests
old_transformed = """    is_ai_generated: t.isAiGenerated,
    created_at: t.createdAt.toISOString(),"""
new_transformed = """    is_ai_generated: t.isAiGenerated,
    is_pyq: (t as any).isPYQ ?? false,
    pyq_year: (t as any).pyqYear ?? null,
    pyq_shift: (t as any).pyqShift ?? null,
    pyq_paper_name: (t as any).pyqPaperName ?? null,
    marking_scheme: (t as any).markingScheme ?? null,
    created_at: t.createdAt.toISOString(),"""
if old_transformed in code:
    code = code.replace(old_transformed, new_transformed, 1)

# 6. Add getTestDetails select fields
old_details_select = """      negativeMarks: true,
      isAiGenerated: true,
      sections: {"""
new_details_select = """      negativeMarks: true,
      isAiGenerated: true,
      isPYQ: true,
      pyqYear: true,
      pyqShift: true,
      pyqPaperName: true,
      markingScheme: true,
      sections: {"""
if old_details_select in code:
    code = code.replace(old_details_select, new_details_select, 1)

old_sec_select = """          isTimed: true,
          cutOffMarks: true,
        },"""
new_sec_select = """          isTimed: true,
          cutOffMarks: true,
          maxQuestionsToAttempt: true,
          sectionType: true,
        },"""
if old_sec_select in code:
    code = code.replace(old_sec_select, new_sec_select)

# 7. Add quizData in getTestDetails
old_quiz_data = """    is_ai_generated: test.isAiGenerated,
    shuffle_questions: (test as any).shuffleQuestions ?? false,"""
new_quiz_data = """    is_ai_generated: test.isAiGenerated,
    is_pyq: (test as any).isPYQ ?? false,
    pyq_year: (test as any).pyqYear ?? null,
    pyq_shift: (test as any).pyqShift ?? null,
    pyq_paper_name: (test as any).pyqPaperName ?? null,
    marking_scheme: (test as any).markingScheme ?? null,
    shuffle_questions: (test as any).shuffleQuestions ?? false,"""
if old_quiz_data in code:
    code = code.replace(old_quiz_data, new_quiz_data, 1)

# 8. Add startTest select fields
old_start_select = """      mode: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      sections: {"""
new_start_select = """      mode: true,
      isPYQ: true,
      pyqYear: true,
      pyqShift: true,
      pyqPaperName: true,
      markingScheme: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      sections: {"""
if old_start_select in code:
    code = code.replace(old_start_select, new_start_select, 1)

# 9. Add new PYQ endpoints at the bottom
new_endpoints = """
export const getPyqCatalog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tests = await prisma.test.findMany({
    where: { isPublished: true, deletedAt: null, isPYQ: true },
    orderBy: [{ pyqYear: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      description: true,
      examId: true,
      timeLimit: true,
      totalMarks: true,
      negativeMarks: true,
      difficulty: true,
      isPYQ: true,
      pyqYear: true,
      pyqShift: true,
      pyqPaperName: true,
      markingScheme: true,
      exam: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          maxQuestionsToAttempt: true,
          sectionType: true,
        },
      },
      _count: { select: { questions: true } },
    },
  })

  const benchmarks = Object.entries(HISTORICAL_BENCHMARKS).map(([key, val]) => ({
    key,
    ...val,
  }))

  sendSuccess(res, {
    papers: tests.map(t => ({
      ...t,
      question_count: t._count.questions,
    })),
    benchmarks,
  })
})

export const getPyqPercentilePrediction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { rawScore, benchmarkKey } = req.body
  if (typeof rawScore !== 'number' || !benchmarkKey) {
    sendValidationError(res, 'rawScore (number) and benchmarkKey (string) are required')
    return
  }

  const prediction = pyqPaperService.calculateShiftPercentile(rawScore, benchmarkKey)
  sendSuccess(res, prediction)
})
"""

if 'export const getPyqCatalog' not in code:
    code += new_endpoints

with open(r'learninghub/backend/src/controllers/testsController.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("testsController.ts successfully updated!")
