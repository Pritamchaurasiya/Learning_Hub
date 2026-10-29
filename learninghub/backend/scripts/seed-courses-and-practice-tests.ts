import { PrismaClient, TestMode, TestDifficulty, QuestionType, BloomLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding comprehensive mock tests and curriculum courses...')

  // Ensure India & Global countries
  const india = await prisma.country.upsert({
    where: { code: 'IN' },
    update: {},
    create: { code: 'IN', name: 'India', flagEmoji: '🇮🇳', isActive: true },
  })

  const globalCountry = await prisma.country.upsert({
    where: { code: 'GLOBAL' },
    update: {},
    create: { code: 'GLOBAL', name: 'Global / Tech & Software', flagEmoji: '🌐', isActive: true },
  })

  // Ensure Exams
  const dsaExam = await prisma.exam.upsert({
    where: { slug: 'dsa-software-engineering' },
    update: {},
    create: {
      name: 'Software Engineering & DSA',
      slug: 'dsa-software-engineering',
      description: 'Comprehensive software engineering, algorithms, system design, and coding interviews.',
      countryId: globalCountry.id,
      isActive: true,
    },
  })

  const gateExam = await prisma.exam.upsert({
    where: { slug: 'gate-cse' },
    update: {},
    create: {
      name: 'GATE Computer Science',
      slug: 'gate-cse',
      description: 'Graduate Aptitude Test in Engineering for Computer Science and Information Technology.',
      countryId: india.id,
      isActive: true,
    },
  })

  const jeeExam = await prisma.exam.upsert({
    where: { slug: 'jee-main' },
    update: {},
    create: {
      name: 'JEE Main',
      slug: 'jee-main',
      description: 'National Testing Agency CBT for Engineering Admissions (NITs, IIITs, CFTIs)',
      countryId: india.id,
      isActive: true,
    },
  })

  // Ensure Subject & Topics
  const dsaSubject = await prisma.subject.upsert({
    where: { slug: 'dsa-core' },
    update: {},
    create: {
      name: 'Data Structures & Algorithms',
      slug: 'dsa-core',
      examId: dsaExam.id,
    },
  })

  const dpTopic = await prisma.topic.upsert({
    where: { slug: 'dynamic-programming-advanced' },
    update: {},
    create: {
      name: 'Dynamic Programming & State Compression',
      slug: 'dynamic-programming-advanced',
      subjectId: dsaSubject.id,
      order: 1,
    },
  })

  const graphTopic = await prisma.topic.upsert({
    where: { slug: 'graph-algorithms-traversal' },
    update: {},
    create: {
      name: 'Graph Traversal, TopoSort & Shortest Paths',
      slug: 'graph-algorithms-traversal',
      subjectId: dsaSubject.id,
      order: 2,
    },
  })

  // Define Mock Tests / Courses to seed
  const mockTestsToSeed = [
    {
      id: 'course-dsa-mastery-401',
      title: 'Full-Stack SDE II Algorithms & High-Scale Systems',
      description: 'Masterclass covering amortized analysis, monotonic stacks, graph algorithms, and distributed caching.',
      examId: dsaExam.id,
      mode: TestMode.MOCK,
      difficulty: TestDifficulty.HARD,
      timeLimit: 120,
      totalMarks: 100,
      passingScore: 60,
      negativeMarks: 1,
      isPublished: true,
      isAiGenerated: false,
      isPYQ: false,
      sections: [
        {
          title: 'Section A: Algorithmic Foundations',
          order: 1,
          durationMinutes: 60,
          maxQuestionsToAttempt: 5,
          sectionType: 'MANDATORY',
        },
        {
          title: 'Section B: Distributed Systems Design',
          order: 2,
          durationMinutes: 60,
          maxQuestionsToAttempt: 5,
          sectionType: 'ELECTIVE',
        },
      ],
      questions: [
        {
          text: 'What is the tight worst-case time complexity to search an element in a Skip List with N elements and maximum level L = O(log N)?',
          type: QuestionType.MCQ,
          difficulty: 0.65,
          bloomLevel: BloomLevel.ANALYZE,
          points: 10,
          explanation: 'With randomized balancing, expected time is O(log N), but adversarial worst-case with all elements on bottom level is O(N).',
          topicId: dpTopic.id,
          options: [
            { text: 'O(log N)', isCorrect: false },
            { text: 'O(N)', isCorrect: true },
            { text: 'O(1)', isCorrect: false },
            { text: 'O(N log N)', isCorrect: false },
          ],
        },
        {
          text: 'Which of the following guarantees linearizability in a distributed key-value store across network partitions?',
          type: QuestionType.MCQ,
          difficulty: 0.8,
          bloomLevel: BloomLevel.EVALUATE,
          points: 10,
          explanation: 'Raft consensus with leader leases or read-index verification guarantees strict linearizability by consulting majority quorum.',
          topicId: graphTopic.id,
          options: [
            { text: 'Quorum reads (R + W > N) with Raft leader confirmation', isCorrect: true },
            { text: 'Eventual consistency with vector clocks alone', isCorrect: false },
            { text: 'Client-side sticky routing with read replicas', isCorrect: false },
            { text: 'DNS round-robin with multi-master replication', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'course-gate-algorithms-2026',
      title: 'GATE CS 2026: Algorithms, Discrete Math & Theory of Computation',
      description: 'Comprehensive exam course featuring recurrence relations, asymptotic notations, Turing completeness, and DAG topological sorting.',
      examId: gateExam.id,
      mode: TestMode.TIMED,
      difficulty: TestDifficulty.HARD,
      timeLimit: 180,
      totalMarks: 100,
      passingScore: 65,
      negativeMarks: 0.33,
      isPublished: true,
      isAiGenerated: false,
      isPYQ: false,
      sections: [
        {
          title: 'General Aptitude (GA)',
          order: 1,
          durationMinutes: 30,
          maxQuestionsToAttempt: 5,
          sectionType: 'MANDATORY',
        },
        {
          title: 'Computer Science Core',
          order: 2,
          durationMinutes: 150,
          maxQuestionsToAttempt: 20,
          sectionType: 'MANDATORY',
        },
      ],
      questions: [
        {
          text: 'Using Master Theorem, what is the asymptotic solution of the recurrence T(N) = 4T(N/2) + N^2?',
          type: QuestionType.MCQ,
          difficulty: 0.5,
          bloomLevel: BloomLevel.APPLY,
          points: 5,
          explanation: 'Here a = 4, b = 2. log_b(a) = log_2(4) = 2. f(N) = N^2 = Theta(N^{log_b a}). By Master Theorem Case 2, T(N) = Theta(N^2 log N).',
          topicId: dpTopic.id,
          options: [
            { text: 'Theta(N^2 log N)', isCorrect: true },
            { text: 'Theta(N^2)', isCorrect: false },
            { text: 'Theta(N^3)', isCorrect: false },
            { text: 'Theta(N log N)', isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'course-jee-mechanics-speed',
      title: 'JEE Advanced Mechanics, Electromagnetism & Calculus Marathon',
      description: 'High-speed problem-solving module for national top-100 aspirants with multi-concept application problems.',
      examId: jeeExam.id,
      mode: TestMode.PRACTICE,
      difficulty: TestDifficulty.HARD,
      timeLimit: 180,
      totalMarks: 300,
      passingScore: 70,
      negativeMarks: 1,
      isPublished: true,
      isAiGenerated: false,
      isPYQ: false,
      sections: [
        {
          title: 'Physics Section 1: Single Correct',
          order: 1,
          durationMinutes: 60,
          sectionType: 'MANDATORY',
        },
      ],
      questions: [
        {
          text: 'A uniform disc of mass M and radius R rolls without slipping down an inclined plane of angle theta. What is the linear acceleration of its center of mass?',
          type: QuestionType.MCQ,
          difficulty: 0.6,
          bloomLevel: BloomLevel.APPLY,
          points: 4,
          explanation: 'a = g * sin(theta) / (1 + I / (M * R^2)). For a disc, I = 0.5 * M * R^2, so a = (2/3) * g * sin(theta).',
          options: [
            { text: '(2/3) g sin(theta)', isCorrect: true },
            { text: '(1/2) g sin(theta)', isCorrect: false },
            { text: '(5/7) g sin(theta)', isCorrect: false },
            { text: 'g sin(theta)', isCorrect: false },
          ],
        },
      ],
    },
  ]

  for (const t of mockTestsToSeed) {
    const existing = await prisma.test.findUnique({ where: { id: t.id } })
    if (existing) {
      console.log(`- Test ${t.id} already exists, skipping.`)
      continue
    }

    const createdTest = await prisma.test.create({
      data: {
        id: t.id,
        title: t.title,
        description: t.description,
        examId: t.examId,
        mode: t.mode,
        difficulty: t.difficulty,
        timeLimit: t.timeLimit,
        totalMarks: t.totalMarks,
        passingScore: t.passingScore,
        negativeMarks: t.negativeMarks,
        isPublished: t.isPublished,
        isAiGenerated: t.isAiGenerated,
        isPYQ: t.isPYQ,
        sections: {
          create: t.sections.map((s, idx) => ({
            title: s.title,
            order: s.order || idx + 1,
            durationMinutes: s.durationMinutes,
            maxQuestionsToAttempt: s.maxQuestionsToAttempt,
            sectionType: s.sectionType,
          })),
        },
      },
      include: { sections: true },
    })

    // Seed questions
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i]
      await prisma.question.create({
        data: {
          testId: createdTest.id,
          sectionId: createdTest.sections[0]?.id,
          topicId: q.topicId,
          text: q.text,
          type: q.type,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
          points: q.points,
          explanation: q.explanation,
          order: i + 1,
          options: {
            create: q.options.map((opt, oIdx) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: oIdx + 1,
            })),
          },
        },
      })
    }

    console.log(`✅ Seeded test/course: ${t.title} (${createdTest.id})`)
  }

  console.log('🎉 Seeding completed successfully!')
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Seeding error:', err)
  process.exit(1)
})
