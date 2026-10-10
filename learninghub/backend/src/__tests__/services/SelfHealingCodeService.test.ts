import {
  SelfHealingCodeService,
  selfHealingCodeService,
} from '../../services/SelfHealingCodeService'

describe('SelfHealingCodeService (Milestone 20)', () => {
  let service: SelfHealingCodeService

  beforeEach(() => {
    service = new SelfHealingCodeService()
  })

  it('provides vulnerable code presets across performance, security, and memory vectors', () => {
    const n1 = service.getPresetCode('N_PLUS_ONE_QUERY_LOOP')
    expect(n1.code).toContain('prisma.user.findUnique')

    const sqli = service.getPresetCode('SQL_INJECTION_CONCATENATION')
    expect(sqli.code).toContain('SELECT id, email')

    const leak = service.getPresetCode('REACT_MEMORY_LEAK_INTERVAL')
    expect(leak.code).toContain('setInterval')

    const syncIo = service.getPresetCode('EVENT_LOOP_SYNC_BLOCKING')
    expect(syncIo.code).toContain('readFileSync')
  })

  it('identifies and patches N+1 database queries into batch aggregated queries', () => {
    const preset = service.getPresetCode('N_PLUS_ONE_QUERY_LOOP')
    const analysis = service.analyzeAndGeneratePatch({
      code: preset.code,
      fileName: preset.fileName,
    })

    expect(analysis.detectedIssues.length).toBeGreaterThan(0)
    expect(analysis.detectedIssues[0].category).toBe('PERFORMANCE_N_PLUS_ONE')
    expect(analysis.recommendedPatch.patchedCode).toContain('findMany({ where: { id: { in: userIds } } })')
    expect(analysis.recommendedPatch.estimatedLatencyReductionPct).toBeGreaterThan(70)
    expect(analysis.overallHealthScoreAfter).toBeGreaterThan(analysis.overallHealthScoreBefore)
  })

  it('identifies and patches SQL injection into parameterized prepared statements', () => {
    const preset = service.getPresetCode('SQL_INJECTION_CONCATENATION')
    const analysis = service.analyzeAndGeneratePatch({
      code: preset.code,
      fileName: preset.fileName,
    })

    expect(analysis.detectedIssues[0].category).toBe('SECURITY_INJECTION')
    expect(analysis.detectedIssues[0].severity).toBe('CRITICAL')
    expect(analysis.recommendedPatch.patchedCode).toContain('username = $1 AND password = $2')
    expect(analysis.recommendedPatch.securityPostureImprovementPct).toBeGreaterThan(90)
  })

  it('identifies and patches React component memory leaks with clearInterval teardowns', () => {
    const preset = service.getPresetCode('REACT_MEMORY_LEAK_INTERVAL')
    const analysis = service.analyzeAndGeneratePatch({
      code: preset.code,
      fileName: preset.fileName,
    })

    expect(analysis.detectedIssues[0].category).toBe('MEMORY_RESOURCE_LEAK')
    expect(analysis.recommendedPatch.patchedCode).toContain('clearInterval(timerId)')
    expect(analysis.recommendedPatch.safetyVerdict).toBe('SAFE_TO_APPLY')
  })

  it('identifies and patches event-loop blocking synchronous file I/O', () => {
    const preset = service.getPresetCode('EVENT_LOOP_SYNC_BLOCKING')
    const analysis = service.analyzeAndGeneratePatch({
      code: preset.code,
      fileName: preset.fileName,
    })

    expect(analysis.detectedIssues[0].category).toBe('ASYNC_EVENT_LOOP_BLOCKING')
    expect(analysis.recommendedPatch.patchedCode).toContain('fs.promises.readFile')
  })
})
