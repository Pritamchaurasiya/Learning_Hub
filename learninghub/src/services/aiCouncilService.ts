import { fetchApi } from '../utils/api'

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

export interface ConsultCouncilRequest {
  query: string
  codeSnippet?: string
  language?: string
  problemTitle?: string
  problemDescription?: string
  studentLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export class AICouncilService {
  /**
   * Consults the full 3-Agent Collaborative Council
   */
  async consultCouncil(params: ConsultCouncilRequest): Promise<CouncilConsultationResult> {
    const res = await fetchApi('/api/v1/ai/council/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.data as CouncilConsultationResult
  }

  /**
   * Consults a specific specialist agent
   */
  async consultSpecialist(
    role: AgentRole,
    params: ConsultCouncilRequest
  ): Promise<AgentPerspective> {
    const res = await fetchApi('/api/v1/ai/council/specialist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, role }),
    })
    return res.data as AgentPerspective
  }
}

export const aiCouncilService = new AICouncilService()
