import { z } from 'zod'

export const GeneratedOptionSchema = z.object({
  id: z.string().describe('Option identifier, e.g., a, b, c, d'),
  text: z.string().describe('The text for the option'),
})

export const GeneratedQuestionSchema = z.object({
  text: z.string().describe('The question text'),
  options: z.array(GeneratedOptionSchema).length(4).describe('Exactly 4 multiple choice options'),
  correct_option_id: z.string().describe('The ID of the correct option'),
  explanation: z.string().describe('Detailed explanation of the correct answer'),
  difficulty: z
    .enum(['EASY', 'MEDIUM', 'HARD', 'ADAPTIVE'])
    .describe('Difficulty level of the question'),
  bloom_level: z
    .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
    .describe('Blooms taxonomy level'),
  tags: z.array(z.string()).optional().describe('Relevant topic tags for the question'),
})

export const TestGenerationSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).describe('Array of generated questions'),
})

export type ZodGeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>
export type ZodTestGeneration = z.infer<typeof TestGenerationSchema>

// Phase 26 ML Schemas
export const LearningPathAnalysisSchema = z.object({
  strengths: z.array(z.string()).describe('List of up to 3 identified strengths'),
  weaknesses: z.array(z.string()).describe('List of up to 3 identified weaknesses'),
  recommendation: z.string().describe('One actionable sentence for learning focus'),
  next_steps: z.array(z.string()).describe('List of 3 concrete next steps to take'),
})

export const LessonGenerationSchema = z.object({
  title: z.string(),
  description: z.string().describe('Brief lesson description'),
  content: z
    .string()
    .describe(
      'Extremely detailed Markdown content for the lesson, minimum 500 words, including examples, code snippets if technical, and formatting'
    ),
  duration: z.number().describe('Estimated duration in minutes'),
})

export const ModuleGenerationSchema = z.object({
  title: z.string(),
  lessons: z.array(LessonGenerationSchema).describe('Array of comprehensive lessons'),
})

export const CourseGenerationSchema = z.object({
  title: z.string(),
  description: z.string().describe('Engaging, 3-4 paragraphs'),
  shortDescription: z.string().describe('1 sentence summary'),
  category: z.string().describe('e.g. Programming, Marketing, Design'),
  duration: z.number().describe('Total minutes estimated'),
  price: z.number().describe('Number (e.g. 0, 49.99)'),
  modules: z.array(ModuleGenerationSchema).describe('Array of course modules'),
})

export const CodeReviewSchema = z.object({
  timeComplexity: z.string().describe('Big-O notation, e.g. O(N)'),
  spaceComplexity: z.string().describe('Big-O notation, e.g. O(1)'),
  vulnerabilities: z
    .array(z.string())
    .describe('List of potential vulnerabilities or logical edge cases'),
  optimizationHints: z.array(z.string()).describe('List of actionable optimization hints'),
  overallFeedback: z.string().describe('Concise overall feedback paragraph'),
})
