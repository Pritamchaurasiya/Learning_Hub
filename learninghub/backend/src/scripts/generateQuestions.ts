import { PrismaClient } from '@prisma/client'
import { AIServiceFactory } from '../services/ai/AIServiceFactory'

const prisma = new PrismaClient()

async function generateAndSeed(
  topicName: string,
  subjectSlug: string,
  count: number,
  examName: string
) {
  // eslint-disable-next-line no-console
  console.log(`Generating ${count} questions for ${topicName} (${examName})...`)

  const prompt = `You are an expert exam question designer specializing in ${examName}.

Generate ${count} original multiple-choice questions for the topic: ${topicName}.

STRICT REQUIREMENTS:
1. Questions MUST mirror the style, format, and difficulty of ${examName}
2. Questions MUST be 100% original
3. Each question must have exactly 4 options labeled a, b, c, d
4. Exactly ONE option must be correct
5. Provide detailed explanations
6. Include mathematical/chemical formulas in LaTeX format $...$ where necessary.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "text": "Question text here",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correct_option_id": "b",
      "explanation": "Explanation",
      "difficulty": "MEDIUM",
      "tags": ["${topicName}"]
    }
  ]
}`

  const ai = AIServiceFactory.getAgent()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = await ai.generateJSON<{ questions: any[] }>(prompt, { model: 'gemini-2.0-flash' })

  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    include: { exam: true },
  })
  if (!subject) throw new Error(`Subject ${subjectSlug} not found`)

  // eslint-disable-next-line no-console
  console.log(`Generated ${parsed.questions.length} questions. Saving to database...`)

  for (let i = 0; i < parsed.questions.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const q = parsed.questions[i]
    await prisma.pYQ.create({
      data: {
        examType:
          subject.exam.slug === 'jee-mains'
            ? 'JEE_MAIN'
            : subject.exam.slug === 'neet'
              ? 'NEET'
              : 'UPSC',
        examId: subject.examId,
        subjectId: subject.id,
        year: 2024,
        paper: `Mock ${examName} - ${topicName}`,
        question: q.text,
        marks: 4,
        tags: q.tags ?? [topicName],
        answer:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          q.options.find((o: any) => o.id === q.correct_option_id)?.text ?? q.correct_option_id,
        explanation: q.explanation,
        difficulty: q.difficulty ?? 'MEDIUM',
      },
    })
  }

  // eslint-disable-next-line no-console
  console.log(`Successfully saved ${parsed.questions.length} questions for ${topicName}.`)
}

async function main() {
  try {
    // Ensure exams and subjects exist
    const india = await prisma.country.upsert({
      where: { code: 'IN' },
      update: {},
      create: { code: 'IN', name: 'India', flagEmoji: '🇮🇳' },
    })

    const jee = await prisma.exam.upsert({
      where: { slug: 'jee-mains' },
      update: {},
      create: {
        countryId: india.id,
        name: 'JEE Mains',
        slug: 'jee-mains',
        description: 'Joint Entrance Examination',
      },
    })

    const neet = await prisma.exam.upsert({
      where: { slug: 'neet' },
      update: {},
      create: {
        countryId: india.id,
        name: 'NEET',
        slug: 'neet',
        description: 'National Eligibility cum Entrance Test',
      },
    })

    await prisma.subject.upsert({
      where: { slug: 'jee-physics' },
      update: {},
      create: { examId: jee.id, name: 'Physics', slug: 'jee-physics' },
    })

    await prisma.subject.upsert({
      where: { slug: 'neet-biology' },
      update: {},
      create: { examId: neet.id, name: 'Biology', slug: 'neet-biology' },
    })

    // Generate 5 questions at a time to avoid timeout/payload issues
    await generateAndSeed('Mechanics', 'jee-physics', 10, 'JEE Mains')
    await generateAndSeed('Electromagnetism', 'jee-physics', 10, 'JEE Mains')
    await generateAndSeed('Human Physiology', 'neet-biology', 10, 'NEET')
    await generateAndSeed('Genetics', 'neet-biology', 10, 'NEET')
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

void main()
