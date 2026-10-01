import { socraticDiagnosticService } from '../../services/ai/SocraticDiagnosticService'

describe('SocraticDiagnosticService', () => {
  it('provides comprehensive misconception diagnosis with fallback', async () => {
    const diagnosis = await socraticDiagnosticService.diagnoseMisconception({
      questionText: 'What happens to pressure when volume halves at constant temperature?',
      selectedOptionText: 'Pressure halves',
      correctOptionText: 'Pressure doubles',
      topic: 'Thermodynamics',
    })

    expect(diagnosis.misconceptionAnalysis).toBeDefined()
    expect(diagnosis.misconceptionAnalysis.length).toBeGreaterThan(10)
    expect(diagnosis.underlyingConcept).toContain('Thermodynamics')
    expect(Array.isArray(diagnosis.scaffoldedHints)).toBe(true)
    expect(diagnosis.scaffoldedHints.length).toBeGreaterThanOrEqual(2)
  })
})
