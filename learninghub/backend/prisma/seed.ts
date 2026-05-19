import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...\n')

  await prisma.pYQ.deleteMany()
  await prisma.formula.deleteMany()
  await prisma.revisionNote.deleteMany()
  await prisma.problemSubmission.deleteMany()
  await prisma.problem.deleteMany()
  await prisma.testResult.deleteMany()
  await prisma.question.deleteMany()
  await prisma.test.deleteMany()
  await prisma.lessonCompletion.deleteMany()
  await prisma.note.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.module.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.userAchievement.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.dailyGoal.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  const adminPassword = await bcrypt.hash('admin123', 12)
  const studentPassword = await bcrypt.hash('student123', 12)

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

  const [course1, course2] = await Promise.all([
    prisma.course.create({
      data: {
        id: 'course-001',
        title: 'Introduction to Web Development',
        description: 'Learn HTML, CSS, and JavaScript fundamentals.',
        shortDescription: 'Build your first website',
        phase: 'BEGINNER',
        duration: 480,
        difficulty: 'BEGINNER',
        category: 'development',
        content: '# Web Development Basics',
        instructorId: admin.id,
        rating: 4.8,
        reviewCount: 320,
        studentCount: 1200,
        price: 0,
      },
    }),
    prisma.course.create({
      data: {
        id: 'course-002',
        title: 'React.js Fundamentals',
        description: 'Master React components, hooks, and routing.',
        shortDescription: 'Modern frontend development',
        phase: 'INTERMEDIATE',
        duration: 720,
        difficulty: 'INTERMEDIATE',
        category: 'development',
        content: '# React Fundamentals',
        instructorId: admin.id,
        rating: 4.9,
        reviewCount: 210,
        studentCount: 860,
        price: 49,
      },
    }),
  ])

  const [module1, module2] = await Promise.all([
    prisma.module.create({
      data: {
        id: 'module-001',
        courseId: course1.id,
        title: 'HTML Fundamentals',
        order: 1,
      },
    }),
    prisma.module.create({
      data: {
        id: 'module-002',
        courseId: course2.id,
        title: 'React Basics',
        order: 1,
      },
    }),
  ])

  await Promise.all([
    prisma.lesson.create({
      data: {
        id: 'lesson-001',
        moduleId: module1.id,
        title: 'Introduction to HTML',
        content: 'HTML is the standard markup language for web pages.',
        duration: 45,
        order: 1,
        isFree: true,
      },
    }),
    prisma.lesson.create({
      data: {
        id: 'lesson-002',
        moduleId: module2.id,
        title: 'What is JSX?',
        content: 'JSX lets you write UI markup inside JavaScript.',
        duration: 60,
        order: 1,
        isFree: true,
      },
    }),
  ])

  const [test1, test2] = await Promise.all([
    prisma.test.create({
      data: {
        id: 'test-001',
        courseId: course1.id,
        title: 'HTML Basics Quiz',
        description: 'Quick test on HTML basics',
        timeLimit: 20,
        passingScore: 60,
      },
    }),
    prisma.test.create({
      data: {
        id: 'test-002',
        courseId: course2.id,
        title: 'React Basics Quiz',
        description: 'Quick test on React basics',
        timeLimit: 25,
        passingScore: 65,
      },
    }),
  ])

  await Promise.all([
    prisma.question.create({
      data: {
        testId: test1.id,
        text: 'What does HTML stand for?',
        type: 'mcq',
        points: 10,
        order: 1,
        explanation: 'HTML stands for Hyper Text Markup Language.',
        options: {
          create: [
            { text: 'Hyper Text Markup Language', isCorrect: true, order: 0 },
            { text: 'High Text Machine Language', isCorrect: false, order: 1 },
            { text: 'Hyperlink and Text Markup Language', isCorrect: false, order: 2 },
            { text: 'Home Tool Markup Language', isCorrect: false, order: 3 },
          ],
        },
      },
    }),
    prisma.question.create({
      data: {
        testId: test2.id,
        text: 'JSX is primarily used with which library?',
        type: 'mcq',
        points: 10,
        order: 1,
        explanation: 'JSX is most commonly used in React applications.',
        options: {
          create: [
            { text: 'Angular', isCorrect: false, order: 0 },
            { text: 'Vue', isCorrect: false, order: 1 },
            { text: 'React', isCorrect: true, order: 2 },
            { text: 'Svelte', isCorrect: false, order: 3 },
          ],
        },
      },
    }),
  ])

  await prisma.userProgress.create({
    data: {
      userId: student.id,
      courseId: course1.id,
      progress: 35,
      status: 'IN_PROGRESS',
    },
  })

  await prisma.bookmark.create({
    data: {
      userId: student.id,
      courseId: course2.id,
    },
  })

  await prisma.testResult.create({
    data: {
      userId: student.id,
      testId: test1.id,
      score: 10,
      totalPoints: 10,
      percentage: 100,
      passed: true,
      timeTaken: 600,
      answers: JSON.stringify({}),
      completedAt: new Date(),
    },
  })

  await prisma.notification.create({
    data: {
      userId: student.id,
      type: 'course_complete',
      title: 'Welcome to LearningHub!',
      message: 'Start with your first lesson today.',
      isRead: false,
      actionUrl: '/course/course-001',
    },
  })

  await prisma.userAchievement.create({
    data: {
      userId: student.id,
      achievementId: 'first-login',
      name: 'First Login',
      description: 'You logged in successfully for the first time.',
      icon: '🎯',
    },
  })

  await prisma.problem.create({
    data: {
      id: 'problem-001',
      title: 'Two Sum',
      description: 'Find two indices whose values add up to target.',
      difficulty: 'easy',
      category: 'algorithms',
      tags: 'array,hash-table',
      starterCode: 'function twoSum(nums, target) {\n  return [];\n}',
      testCases: JSON.stringify([{ input: [[2, 7, 11, 15], 9], output: [0, 1] }]),
    },
  })

  // Seed PYQs for UPSC
  await prisma.pYQ.createMany({
    data: [
      {
        examType: 'UPSC',
        year: 2023,
        paper: 'Prelims',
        subject: 'History',
        question: 'Which of the following was the first battle fought by the East India Company?',
        options: [
          'Battle of Plassey',
          'Battle of Buxar',
          'Battle of Wandiwash',
          'Battle of Carnatic',
        ],
        answer: 'Battle of Plassey',
        explanation:
          'The Battle of Plassey was fought in 1757 between the East India Company and Siraj-ud-Daulah, the Nawab of Bengal.',
        difficulty: 'MEDIUM',
        marks: 2,
        negativeMarks: 0.66,
        tags: ['modern-history', 'colonialism'],
      },
      {
        examType: 'UPSC',
        year: 2023,
        paper: 'Prelims',
        subject: 'Geography',
        question: 'Which of the following is the highest peak in the Western Ghats?',
        options: ['Anamudi', 'Doddabetta', 'Kalsubai', 'Mullayanagiri'],
        answer: 'Anamudi',
        explanation:
          'Anamudi is the highest peak in the Western Ghats at 2,695 meters (8,842 ft) above sea level.',
        difficulty: 'EASY',
        marks: 2,
        negativeMarks: 0.66,
        tags: ['geography', 'western-ghats'],
      },
    ],
  })

  // Seed Formulas for JEE
  await prisma.formula.createMany({
    data: [
      {
        examType: 'JEE_MAIN',
        subject: 'Physics',
        topic: 'Mechanics',
        name: "Newton's Second Law",
        formula: 'F = ma',
        description: 'Force equals mass times acceleration',
        variables: JSON.stringify({ F: 'Force (N)', m: 'Mass (kg)', a: 'Acceleration (m/s²)' }),
        examples: ['Example 1: A 5kg object accelerating at 2m/s² experiences F = 5 × 2 = 10N'],
        tags: ['newton-laws', 'force', 'mechanics'],
      },
      {
        examType: 'JEE_MAIN',
        subject: 'Chemistry',
        topic: 'Thermodynamics',
        name: 'Ideal Gas Law',
        formula: 'PV = nRT',
        description: 'Pressure times volume equals moles times gas constant times temperature',
        variables: JSON.stringify({
          P: 'Pressure (Pa)',
          V: 'Volume (m³)',
          n: 'Moles',
          R: 'Gas constant',
          T: 'Temperature (K)',
        }),
        examples: ['Example: Calculate pressure of 2 moles at 300K in 0.1m³'],
        tags: ['gases', 'thermodynamics', 'equations'],
      },
    ],
  })

  // Seed Revision Notes for NEET
  await prisma.revisionNote.createMany({
    data: [
      {
        examType: 'NEET',
        subject: 'Biology',
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

  console.log('✅ Seed complete')
  console.log(`Admin: admin@learninghub.com / admin123`)
  console.log(`Student: student@learninghub.com / student123`)
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
