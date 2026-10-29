with open(r'learninghub/backend/src/services/TestScoringService.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Include sections in test lookup
old_include = """      include: {
        questions: {
          include: { options: true },
        },
      },"""

new_include = """      include: {
        sections: true,
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' },
        },
      },"""

if old_include in code:
    code = code.replace(old_include, new_include, 1)
    print("Test lookup include updated")

# 2. Add section cap tracking and scoring rules
old_loop_start = """    let score = 0
    let correctCount = 0
    let incorrectCount = 0

    const questionResults = await Promise.all("""

new_loop_start = """    let score = 0
    let correctCount = 0
    let incorrectCount = 0

    const sectionAnsweredCounts: Record<string, number> = {}
    const sectionAttemptCaps: Record<string, number> = {}
    if (test.sections) {
      for (const sec of test.sections) {
        if (sec.maxQuestionsToAttempt && sec.maxQuestionsToAttempt > 0) {
          sectionAttemptCaps[sec.id] = sec.maxQuestionsToAttempt
          sectionAnsweredCounts[sec.id] = 0
        }
      }
    }

    const questionResults = await Promise.all("""

if old_loop_start in code:
    code = code.replace(old_loop_start, new_loop_start, 1)
    print("Section tracking logic added")

# 3. Add section cap enforcement inside question loop
old_has_answer = """        const hasAnswer =
          submittedIds.length > 0 ||
          (typeof userAnswerId === 'string' && userAnswerId.trim().length > 0)

        let isCorrect: boolean | null = false"""

new_has_answer = """        const hasAnswer =
          submittedIds.length > 0 ||
          (typeof userAnswerId === 'string' && userAnswerId.trim().length > 0)

        let isExceededSectionCap = false
        if (hasAnswer && q.sectionId && sectionAttemptCaps[q.sectionId] !== undefined) {
          sectionAnsweredCounts[q.sectionId] = (sectionAnsweredCounts[q.sectionId] || 0) + 1
          if (sectionAnsweredCounts[q.sectionId] > sectionAttemptCaps[q.sectionId]) {
            isExceededSectionCap = true
          }
        }

        const isGateExam = (test as any).markingScheme && ((test as any).markingScheme as any).examType === 'GATE'
        const qTypeUpper = String(q.type).toUpperCase()
        const isZeroNegative = isGateExam && (qTypeUpper === 'MSQ' || qTypeUpper === 'MULTIPLE_SELECT' || qTypeUpper === 'NUMERICAL')
        const currentNegativePenalty = isZeroNegative ? 0 : Math.abs(test.negativeMarks ?? 0)

        let isCorrect: boolean | null = false"""

if old_has_answer in code:
    code = code.replace(old_has_answer, new_has_answer, 1)
    print("Section cap and GATE negative rules added")

# 4. Use currentNegativePenalty in question scoring
old_neg_calc = "-Math.abs(test.negativeMarks ?? 0)"
new_neg_calc = "-currentNegativePenalty"
code = code.replace(old_neg_calc, new_neg_calc)

# 5. Handle isExceededSectionCap override
old_score_add = """        if (q.type !== 'SUBJECTIVE') {
          score += marksObtained"""

new_score_add = """        if (isExceededSectionCap) {
          marksObtained = 0
          isCorrect = null
          aiFeedback = `Exceeded section attempt limit of ${sectionAttemptCaps[q.sectionId!]} questions. Response not counted.`
        }

        if (q.type !== 'SUBJECTIVE') {
          score += marksObtained"""

if old_score_add in code:
    code = code.replace(old_score_add, new_score_add, 1)
    print("Cap override added")

# 6. Total possible score calculation respecting section caps
old_total_possible = """    const totalPossibleScore = test.questions.reduce((acc: number, q: any) => acc + q.points, 0)"""

new_total_possible = """    let totalPossibleScore = 0
    if (test.sections && test.sections.length > 0) {
      for (const sec of test.sections) {
        const secQuestions = test.questions.filter((q: any) => q.sectionId === sec.id)
        if (sec.maxQuestionsToAttempt && sec.maxQuestionsToAttempt < secQuestions.length) {
          const sortedPts = secQuestions.map((q: any) => q.points).sort((a: number, b: number) => b - a)
          totalPossibleScore += sortedPts.slice(0, sec.maxQuestionsToAttempt).reduce((a: number, b: number) => a + b, 0)
        } else {
          totalPossibleScore += secQuestions.reduce((acc: number, q: any) => acc + q.points, 0)
        }
      }
      const unsectioned = test.questions.filter((q: any) => !q.sectionId)
      totalPossibleScore += unsectioned.reduce((acc: number, q: any) => acc + q.points, 0)
    } else {
      totalPossibleScore = test.questions.reduce((acc: number, q: any) => acc + q.points, 0)
    }

    if (!(test as any).isPYQ && test.mode !== 'PYQ') {
      score = Math.max(0, score)
    }"""

if old_total_possible in code:
    code = code.replace(old_total_possible, new_total_possible, 1)
    print("Total possible score calculation updated")

with open(r'learninghub/backend/src/services/TestScoringService.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("TestScoringService.ts successfully updated!")
