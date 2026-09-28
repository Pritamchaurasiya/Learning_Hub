import logger from '../../utils/logger'
import { AIServiceFactory } from './AIServiceFactory'
import { TokenTrimmer } from '../../utils/TokenTrimmer'

export type AgentRole = 'socratic_guide' | 'code_reviewer' | 'motivational_coach'

export interface AgentPerspective {
  role: AgentRole
  name: string
  avatar: string
  badge: string
  recommendation: string
  keyObservations: string[]
  suggestedAction: string
  confidenceScore: number
}

export interface CouncilConsultationResult {
  topic: string
  studentLevel: string
  councilSummary: string
  perspectives: Record<AgentRole, AgentPerspective>
  actionPlan: string[]
  sentimentDetected: 'confident' | 'neutral' | 'frustrated' | 'fatigued'
  aiPowered: boolean
}

export interface ConsultCouncilParams {
  userId: string
  query: string
  codeSnippet?: string
  language?: string
  problemTitle?: string
  problemDescription?: string
  studentLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export class MultiAgentCouncilService {
  /**
   * Detects student sentiment and frustration markers to tailor coaching tone
   */
  public detectFrustrationSignals(text: string): 'confident' | 'neutral' | 'frustrated' | 'fatigued' {
    const lower = text.toLowerCase()
    const frustrationWords = [
      'stuck', 'hate', 'impossible', 'give up', 'broken', 'wrong', 'failing', 'why does this not work',
      'stupid', 'confused', 'lost', 'waste of time', 'frustrated'
    ]
    const fatigueWords = ['tired', 'sleepy', 'headache', 'burned out', 'brain melted', 'late night', 'exhausted']
    const confidentWords = ['solved', 'easy', 'figured out', 'works', 'optimized', 'mastered', 'clean']

    if (frustrationWords.some(w => lower.includes(w))) return 'frustrated'
    if (fatigueWords.some(w => lower.includes(w))) return 'fatigued'
    if (confidentWords.some(w => lower.includes(w))) return 'confident'
    return 'neutral'
  }

  /**
   * Consults the 3-Agent Collaborative Council
   */
  public async consultCouncil(params: ConsultCouncilParams): Promise<CouncilConsultationResult> {
    const studentLevel = params.studentLevel || 'intermediate'
    const sentiment = this.detectFrustrationSignals(params.query)
    const topic = params.problemTitle || 'Software Architecture & Problem Solving'

    try {
      const adapter = AIServiceFactory.getAgent()

      const safeQuery = TokenTrimmer.escapeXML(params.query.substring(0, 1500))
      const safeCode = params.codeSnippet ? TokenTrimmer.escapeXML(params.codeSnippet.substring(0, 2500)) : ''
      const safeProblem = params.problemDescription ? TokenTrimmer.escapeXML(params.problemDescription.substring(0, 1000)) : ''

      const prompt = `
<trusted_instructions>
You are the Executive Council Coordinator of the LearningHub 3-Agent AI Collaborative Tutor.
Your council consists of three specialized autonomous agents collaborating on behalf of a student:

1. SOCRATIC GUIDE:
   - Diagnoses mental models and fundamental misconceptions.
   - Provides conceptual framing and targeted scaffolding questions. Never reveals raw answers.
2. CODE REVIEWER:
   - Evaluates asymptotic Time (Big-O) and Space (Big-O) complexity bounds.
   - Highlights logical edge cases, boundary conditions, off-by-one errors, and anti-patterns.
3. MOTIVATIONAL COACH:
   - Assesses emotional sentiment (${sentiment}) and cognitive fatigue.
   - Provides strategic morale reinforcement, deliberate study pacing, and growth-mindset anchoring.

Student Query: ${safeQuery}
Topic: ${topic}
Student Level: ${studentLevel}
${safeProblem ? `Problem Context: ${safeProblem}` : ''}
${safeCode ? `Code (${params.language || 'code'}):\n${safeCode}` : ''}

Respond STRICTLY in valid JSON matching this schema:
{
  "councilSummary": "Executive synthesis unifying all three agents into one coherent strategic direction.",
  "socraticGuide": {
    "recommendation": "Conceptual diagnosis and guidance",
    "keyObservations": ["Observation 1", "Observation 2"],
    "suggestedAction": "Targeted cognitive question to think about",
    "confidenceScore": 0.95
  },
  "codeReviewer": {
    "recommendation": "Algorithmic review and asymptotic bounds",
    "keyObservations": ["Observation 1", "Observation 2"],
    "suggestedAction": "Concrete structural code or testcase step",
    "confidenceScore": 0.92
  },
  "motivationalCoach": {
    "recommendation": "Mindset appraisal and pacing encouragement",
    "keyObservations": ["Observation 1", "Observation 2"],
    "suggestedAction": "Productive study habit or break reminder",
    "confidenceScore": 0.98
  },
  "actionPlan": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ]
}
</trusted_instructions>
`

      const raw = await adapter.generateJSON<any>(prompt, {
        model: 'gemini-2.0-flash',
        temperature: 0.3,
        maxTokens: 1500,
      })

      if (raw && raw.socraticGuide && raw.codeReviewer && raw.motivationalCoach) {
        return {
          topic,
          studentLevel,
          sentimentDetected: sentiment,
          councilSummary: raw.councilSummary || 'The AI Council has analyzed your challenge and formulated a multi-tier roadmap.',
          perspectives: {
            socratic_guide: {
              role: 'socratic_guide',
              name: 'Dr. Socratic',
              avatar: '🦉',
              badge: 'Conceptual Architect',
              recommendation: raw.socraticGuide.recommendation,
              keyObservations: raw.socraticGuide.keyObservations || [],
              suggestedAction: raw.socraticGuide.suggestedAction,
              confidenceScore: raw.socraticGuide.confidenceScore || 0.95,
            },
            code_reviewer: {
              role: 'code_reviewer',
              name: 'Staff Reviewer',
              avatar: '⚡',
              badge: 'Complexity & Security',
              recommendation: raw.codeReviewer.recommendation,
              keyObservations: raw.codeReviewer.keyObservations || [],
              suggestedAction: raw.codeReviewer.suggestedAction,
              confidenceScore: raw.codeReviewer.confidenceScore || 0.92,
            },
            motivational_coach: {
              role: 'motivational_coach',
              name: 'Coach Maya',
              avatar: '🌟',
              badge: 'Performance & Mindset',
              recommendation: raw.motivationalCoach.recommendation,
              keyObservations: raw.motivationalCoach.keyObservations || [],
              suggestedAction: raw.motivationalCoach.suggestedAction,
              confidenceScore: raw.motivationalCoach.confidenceScore || 0.98,
            },
          },
          actionPlan: Array.isArray(raw.actionPlan) ? raw.actionPlan : [
            'Break down problem constraints into baseline examples.',
            'Audit asymptotic complexity bounds before writing nested loops.',
            'Take a brief 3-minute breather if hitting cognitive blocks.',
          ],
          aiPowered: true,
        }
      }
    } catch (error) {
      logger.warn(
        '[MultiAgentCouncilService] AI model call failed or timed out. Falling back to deterministic council.',
        error instanceof Error ? { message: error.message } : { error: String(error) }
      )
    }

    // Deterministic fallback
    return this.buildDeterministicCouncil(params, sentiment, topic, studentLevel)
  }

  /**
   * Deterministic council formulation when AI services are offline, rate-limited, or mocked
   */
  private buildDeterministicCouncil(
    params: ConsultCouncilParams,
    sentiment: 'confident' | 'neutral' | 'frustrated' | 'fatigued',
    topic: string,
    studentLevel: string
  ): CouncilConsultationResult {
    const hasCode = !!params.codeSnippet && params.codeSnippet.trim().length > 0

    return {
      topic,
      studentLevel,
      sentimentDetected: sentiment,
      councilSummary: `Collaborative Council consensus for ${topic}: Balance conceptual clarity with structural algorithmic efficiency, while pacing cognitive load.`,
      perspectives: {
        socratic_guide: {
          role: 'socratic_guide',
          name: 'Dr. Socratic',
          avatar: '🦉',
          badge: 'Conceptual Architect',
          recommendation: `Examine the problem invariants. Before committing to an implementation, verify what property must hold true at every iteration or recursive step.`,
          keyObservations: [
            `Question assumptions regarding edge cases and constraints.`,
            `Check whether an auxiliary data structure or pointer pattern simplifies the state transition.`,
          ],
          suggestedAction: `What sub-problem solution can be reused rather than recomputed from scratch?`,
          confidenceScore: 0.94,
        },
        code_reviewer: {
          role: 'code_reviewer',
          name: 'Staff Reviewer',
          avatar: '⚡',
          badge: 'Complexity & Security',
          recommendation: hasCode
            ? `Code submission inspected. Verify worst-case Time Complexity $O(N)$ and ensure no unhandled null or out-of-bounds pointer dereferences.`
            : `Analyze potential asymptotic bottlenecks. Aim for $O(N \\log N)$ or $O(N)$ time with minimal additional space allocation.`,
          keyObservations: [
            `Check boundary conditions (empty inputs, single elements, integer overflow).`,
            `Avoid redundant nested traversals where a hash set or frequency map suffices.`,
          ],
          suggestedAction: `Implement unit testcases for boundary conditions before running against full problem suite.`,
          confidenceScore: 0.91,
        },
        motivational_coach: {
          role: 'motivational_coach',
          name: 'Coach Maya',
          avatar: '🌟',
          badge: 'Performance & Mindset',
          recommendation: sentiment === 'frustrated'
            ? `Feeling blocked is an indicator of active neural adaptation. Take a 2-minute break, hydrate, and re-approach with fresh eyes.`
            : `You are making steady conceptual progress. Focus on incremental correctness over instant perfection.`,
          keyObservations: [
            `Cognitive load is highest during the initial representation phase.`,
            `Every failed testcase gives exact diagnostic data for refinement.`,
          ],
          suggestedAction: `Celebrate small milestones: achieving passing tests on base examples is 50% of the battle.`,
          confidenceScore: 0.97,
        },
      },
      actionPlan: [
        'Phase 1: Validate problem inputs against boundary constraints.',
        'Phase 2: Formalize state transitions or algorithmic invariant.',
        'Phase 3: Verify time/space complexity bounds with benchmark examples.',
      ],
      aiPowered: false,
    }
  }

  /**
   * Consult a single specialist agent directly
   */
  public async consultSpecialist(
    role: AgentRole,
    params: ConsultCouncilParams
  ): Promise<AgentPerspective> {
    const council = await this.consultCouncil(params)
    return council.perspectives[role]
  }
}

export const multiAgentCouncilService = new MultiAgentCouncilService()
