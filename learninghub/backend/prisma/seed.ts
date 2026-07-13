import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  // Clean old data in dependency order
  await prisma.testAttemptAnswer.deleteMany()
  await prisma.testResult.deleteMany()
  await prisma.question.deleteMany()
  await prisma.test.deleteMany()
  await prisma.topicPerformance.deleteMany()
  await prisma.pYQ.deleteMany()
  await prisma.formula.deleteMany()
  await prisma.revisionNote.deleteMany()
  await prisma.problemSubmission.deleteMany()
  await prisma.problem.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.dailyGoal.deleteMany()
  await prisma.userAchievement.deleteMany()
  await prisma.userExamPreference.deleteMany()
  await prisma.user.deleteMany()
  await prisma.exam.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.country.deleteMany()

  const adminPassword = await bcrypt.hash('Admin@123!', 12)
  const studentPassword = await bcrypt.hash('Student@123!', 12)

  const [admin, student] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@learninghub.com',
        password: adminPassword,
        username: 'admin',
        role: 'ADMIN',
        bio: 'System Administrator',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student@learninghub.com',
        password: studentPassword,
        username: 'student',
        role: 'STUDENT',
        xp: 420,
        level: 5,
        streak: 3,
        bio: 'Demo student account',
      },
    }),
  ])

  // 1. Seed Countries
  const uk = await prisma.country.create({
    data: { code: 'GB', name: 'United Kingdom', flagEmoji: '🇬🇧' },
  })

  const us = await prisma.country.create({
    data: { code: 'US', name: 'United States', flagEmoji: '🇺🇸' },
  })

  const india = await prisma.country.create({
    data: { code: 'IN', name: 'India', flagEmoji: '🇮🇳' },
  })

  // 2. Seed Exams
  const gcse = await prisma.exam.create({
    data: {
      countryId: uk.id,
      name: 'GCSE',
      slug: 'gcse',
      description: 'General Certificate of Secondary Education',
    },
  })

  const aLevel = await prisma.exam.create({
    data: {
      countryId: uk.id,
      name: 'A-Level',
      slug: 'a-level',
      description: 'Advanced Level Qualifications',
    },
  })

  const sat = await prisma.exam.create({
    data: {
      countryId: us.id,
      name: 'SAT',
      slug: 'sat',
      description: 'Scholastic Assessment Test',
    },
  })

  const jee = await prisma.exam.create({
    data: {
      countryId: india.id,
      name: 'JEE Mains',
      slug: 'jee-mains',
      description: 'Joint Entrance Examination',
    },
  })

  const neet = await prisma.exam.create({
    data: {
      countryId: india.id,
      name: 'NEET',
      slug: 'neet',
      description: 'National Eligibility cum Entrance Test',
    },
  })

  // 3. Seed Subjects for A-Level
  const mathALevel = await prisma.subject.create({
    data: {
      examId: aLevel.id,
      name: 'Mathematics',
      slug: 'a-level-mathematics',
      topics: {
        create: [
          { name: 'Pure Mathematics', slug: 'pure-mathematics' },
          { name: 'Mechanics', slug: 'mechanics' },
          { name: 'Statistics', slug: 'statistics' },
        ],
      },
    },
  })

  const physicsALevel = await prisma.subject.create({
    data: {
      examId: aLevel.id,
      name: 'Physics',
      slug: 'a-level-physics',
      topics: {
        create: [
          { name: 'Mechanics', slug: 'physics-mechanics' },
          { name: 'Waves', slug: 'waves' },
          { name: 'Electricity', slug: 'electricity' },
          { name: 'Quantum Physics', slug: 'quantum-physics' },
        ],
      },
    },
  })

  const physicsJEE = await prisma.subject.create({
    data: { examId: jee.id, name: 'Physics', slug: 'jee-physics' },
  })

  const bioNEET = await prisma.subject.create({
    data: { examId: neet.id, name: 'Biology', slug: 'neet-biology' },
  })

  // 4. Seed PYQs (Previous Year Questions) for A-Level Math
  await prisma.pYQ.create({
    data: {
      examType: 'A_LEVEL',
      examId: aLevel.id,
      subjectId: mathALevel.id,
      year: 2023,
      paper: 'Paper 1: Pure Mathematics',
      question: 'Find the derivative of $f(x) = x^3 - 4x^2 + 5x - 2$.',
      marks: 3,
      tags: ['Calculus', 'Differentiation'],
      answer: "$f'(x) = 3x^2 - 8x + 5$",
      explanation: 'Use power rule on each term separately.',
      difficulty: 'MEDIUM',
    },
  })

  // 5. Seed PYQs for JEE Mains Physics
  const jeePhysicsQuestions = [
    {
      question:
        'A particle moves along the x-axis from x=0 to x=5m under the influence of a force given by F = 7 - 2x + 3x^2. The work done in the process is:',
      options: ['135 J', '235 J', '85 J', '15 J'],
      correctOption: '135 J',
      explanation:
        'Work done W = \\int F dx = \\int_0^5 (7 - 2x + 3x^2) dx = [7x - x^2 + x^3]_0^5 = 35 - 25 + 125 = 135 J.',
      difficulty: 'MEDIUM',
      tags: ['Work, Energy and Power', 'Integration'],
    },
    {
      question:
        'Two coherent point sources S1 and S2 are separated by a small distance d. The fringes obtained on the screen will be:',
      options: ['Straight lines', 'Concentric circles', 'Hyperbolas', 'Parabolas'],
      correctOption: 'Hyperbolas',
      explanation:
        'For two coherent point sources, the locus of points with a constant path difference is a hyperbola.',
      difficulty: 'HARD',
      tags: ['Wave Optics', 'Interference'],
    },
  ]

  for (const q of jeePhysicsQuestions) {
    await prisma.pYQ.create({
      data: {
        examType: 'JEE_MAIN',
        examId: jee.id,
        subjectId: physicsJEE.id,
        year: 2023,
        paper: 'JEE Main 2023 Shift 1',
        question: q.question,
        options: q.options,
        marks: 4,
        tags: q.tags,
        answer: q.correctOption,
        explanation: q.explanation,
        difficulty: q.difficulty,
      },
    })
  }

  // 6. Seed PYQs for NEET Biology
  const neetBioQuestions = [
    {
      question:
        'Which of the following represents the correct sequence of phases in the cell cycle?',
      options: [
        'G1 -> S -> G2 -> M',
        'G1 -> G2 -> S -> M',
        'M -> G1 -> G2 -> S',
        'S -> G1 -> G2 -> M',
      ],
      correctOption: 'G1 -> S -> G2 -> M',
      explanation:
        'The correct sequence of the cell cycle is G1 (Gap 1), S (Synthesis), G2 (Gap 2), and M (Mitosis).',
      difficulty: 'EASY',
      tags: ['Cell Cycle', 'Cell Division'],
    },
  ]

  for (const q of neetBioQuestions) {
    await prisma.pYQ.create({
      data: {
        examType: 'NEET',
        examId: neet.id,
        subjectId: bioNEET.id,
        year: 2023,
        paper: 'NEET 2023',
        question: q.question,
        options: q.options,
        marks: 4,
        tags: q.tags,
        answer: q.correctOption,
        explanation: q.explanation,
        difficulty: q.difficulty,
      },
    })
  }

  // 7. Seed Formulas
  await prisma.formula.createMany({
    data: [
      {
        examType: 'JEE_MAIN',
        subjectId: physicsJEE.id,
        topic: 'Mechanics',
        name: "Newton's Second Law",
        formula: 'F = ma',
        description: 'Force equals mass times acceleration',
        variables: JSON.stringify({ F: 'Force (N)', m: 'Mass (kg)', a: 'Acceleration (m/s²)' }),
        examples: ['Example 1: A 5kg object accelerating at 2m/s² experiences F = 5 × 2 = 10N'],
        tags: ['newton-laws', 'force', 'mechanics'],
      },
    ],
  })

  // 8. Seed Revision Notes
  await prisma.revisionNote.createMany({
    data: [
      {
        examType: 'NEET',
        subjectId: bioNEET.id,
        topic: 'Cell Structure',
        content:
          '# Cell Structure\n\n## Prokaryotic vs Eukaryotic Cells\n\n### Prokaryotic Cells:\n- No membrane-bound nucleus\n- No organelles\n- Single circular chromosome\n- Examples: Bacteria, Archaea\n\n### Eukaryotic Cells:\n- Membrane-bound nucleus\n- Contains organelles\n- Linear chromosomes\n- Examples: Plant, Animal, Fungi cells',
        keyPoints: [
          'Nucleus presence defines cell type',
          'Organelles only in eukaryotes',
          'Ribosomes present in both',
        ],
        tags: ['cell-biology', 'anatomy'],
      },
    ],
  })

  // 9. Seed a default practice test
  const defaultTest = await prisma.test.create({
    data: {
      examId: jee.id,
      title: 'JEE Physics Mechanics Kickstart',
      description: 'Test your understanding of basic kinematics and Newton laws.',
      timeLimit: 15,
      passingScore: 60,
      mode: 'PRACTICE',
      difficulty: 'MEDIUM',
      totalMarks: 20,
      negativeMarks: 1.0,
      isPublished: true,
      questions: {
        create: [
          {
            text: 'A car starts from rest and accelerates uniformly at 2 m/s² for 10 seconds. The distance traveled is:',
            type: 'MCQ',
            difficulty: 0.3,
            bloomLevel: 'APPLY',
            explanation: 'Using s = ut + 0.5at², s = 0 + 0.5 * 2 * (10)^2 = 100 meters.',
            points: 10,
            order: 1,
            tags: ['kinematics', 'mechanics'],
            options: {
              create: [
                { text: '50 m', isCorrect: false, order: 0 },
                { text: '100 m', isCorrect: true, order: 1 },
                { text: '200 m', isCorrect: false, order: 2 },
                { text: '150 m', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            text: 'What force is required to accelerate a 5 kg mass at 4 m/s²?',
            type: 'MCQ',
            difficulty: 0.2,
            bloomLevel: 'APPLY',
            explanation: 'F = ma = 5 kg * 4 m/s² = 20 N.',
            points: 10,
            order: 2,
            tags: ['newton-laws', 'mechanics'],
            options: {
              create: [
                { text: '10 N', isCorrect: false, order: 0 },
                { text: '20 N', isCorrect: true, order: 1 },
                { text: '30 N', isCorrect: false, order: 2 },
                { text: '40 N', isCorrect: false, order: 3 },
              ],
            },
          },
        ],
      },
    },
  })

  // 10. Seed a mock test result
  await prisma.testResult.create({
    data: {
      userId: student.id,
      testId: defaultTest.id,
      score: 20,
      totalPoints: 20,
      percentage: 100,
      passed: true,
      timeTaken: 120,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })

  console.log('✅ Seed complete')
  console.log(`Admin: admin@learninghub.com / Admin@123!`)
  console.log(`Student: student@learninghub.com / Student@123!`)
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
