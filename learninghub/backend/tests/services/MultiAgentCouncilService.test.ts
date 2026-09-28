import { multiAgentCouncilService } from '../../src/services/ai/MultiAgentCouncilService'

describe('MultiAgentCouncilService', () => {
  it('detects frustration signals accurately', () => {
    expect(multiAgentCouncilService.detectFrustrationSignals('I am completely stuck and confused')).toBe('frustrated')
    expect(multiAgentCouncilService.detectFrustrationSignals('I am so tired and burned out tonight')).toBe('fatigued')
    expect(multiAgentCouncilService.detectFrustrationSignals('I solved and optimized the solution')).toBe('confident')
    expect(multiAgentCouncilService.detectFrustrationSignals('Explain dynamic programming')).toBe('neutral')
  })

  it('generates a complete 3-agent council consultation result', async () => {
    const result = await multiAgentCouncilService.consultCouncil({
      userId: 'user-test-1',
      query: 'How do I optimize two sum problem from O(N^2) to O(N)?',
      problemTitle: 'Two Sum',
      language: 'typescript',
      studentLevel: 'intermediate',
    })

    expect(result).toBeDefined()
    expect(result.topic).toBe('Two Sum')
    expect(result.perspectives.socratic_guide).toBeDefined()
    expect(result.perspectives.socratic_guide.name).toBe('Dr. Socratic')
    expect(result.perspectives.code_reviewer).toBeDefined()
    expect(result.perspectives.code_reviewer.name).toBe('Staff Reviewer')
    expect(result.perspectives.motivational_coach).toBeDefined()
    expect(result.perspectives.motivational_coach.name).toBe('Coach Maya')
    expect(Array.isArray(result.actionPlan)).toBe(true)
    expect(result.actionPlan.length).toBeGreaterThan(0)
  })

  it('allows consulting an individual specialist', async () => {
    const reviewer = await multiAgentCouncilService.consultSpecialist('code_reviewer', {
      userId: 'user-test-2',
      query: 'Check my nested loop complexity',
      codeSnippet: 'for (let i=0; i<n; i++) for (let j=0; j<n; j++) {}',
      language: 'javascript',
    })

    expect(reviewer).toBeDefined()
    expect(reviewer.role).toBe('code_reviewer')
    expect(reviewer.recommendation).toBeDefined()
    expect(reviewer.confidenceScore).toBeGreaterThan(0.5)
  })
})
