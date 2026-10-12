import {
  AutonomousSweStudioService,
  SWE_BENCHMARK_PRESETS,
} from '../../services/AutonomousSweStudioService'

describe('AutonomousSweStudioService', () => {
  describe('getBenchmarkPresets', () => {
    it('returns pre-configured benchmark issues', () => {
      const presets = AutonomousSweStudioService.getBenchmarkPresets()
      expect(Array.isArray(presets)).toBe(true)
      expect(presets.length).toBeGreaterThanOrEqual(5)

      const swe101 = presets.find(p => p.id === 'SWE-101')
      expect(swe101).toBeDefined()
      expect(swe101?.category).toBe('CONCURRENCY_RACE')
      expect(swe101?.severity).toBe('HIGH')
    })
  })

  describe('Spectrum-Based Fault Localization (SBFL)', () => {
    it('calculates Ochiai coefficient correctly', () => {
      // Ochiai: failed / sqrt(total_failed * (failed + passed))
      // failed = 18, passed = 2, total_failed = 20
      // sqrt(20 * (18 + 2)) = sqrt(400) = 20
      // 18 / 20 = 0.9
      const score = AutonomousSweStudioService.calculateOchiaiSuspiciousness(18, 2, 20)
      expect(score).toBe(0.9)
    })

    it('returns 0.0 for zero failures in Ochiai', () => {
      expect(AutonomousSweStudioService.calculateOchiaiSuspiciousness(0, 5, 20)).toBe(0.0)
      expect(AutonomousSweStudioService.calculateOchiaiSuspiciousness(5, 5, 0)).toBe(0.0)
    })

    it('calculates Tarantula metric correctly', () => {
      const score = AutonomousSweStudioService.calculateTarantulaScore(10, 10, 20, 40)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1.0)
    })
  })

  describe('runAutonomousResolution', () => {
    it('resolves preset SWE-101 with complete thought stream, diffs and signed PR', async () => {
      const result = await AutonomousSweStudioService.runAutonomousResolution({ id: 'SWE-101' })

      expect(result).toBeDefined()
      expect(result.issue.id).toBe('SWE-101')

      // Thought stream phases
      expect(result.agentThoughtStream.length).toBe(6)
      const steps = result.agentThoughtStream.map(s => s.step)
      expect(steps).toContain('INGESTION_AND_TRIAGE')
      expect(steps).toContain('FAULT_LOCALIZATION')
      expect(steps).toContain('REPRODUCTION_TEST_SYNTHESIS')
      expect(steps).toContain('PATCH_GENERATION')
      expect(steps).toContain('REGRESSION_AND_VERIFICATION')
      expect(steps).toContain('PR_SYNTHESIS')

      // Suspicious locations
      expect(result.suspiciousLocations.length).toBeGreaterThan(0)
      expect(result.suspiciousLocations[0]?.ochiaiSuspiciousnessScore).toBeGreaterThan(0.5)

      // Patches
      expect(result.patches.length).toBeGreaterThan(0)
      expect(result.patches[0]?.unifiedDiff).toContain('--- a/')
      expect(result.patches[0]?.unifiedDiff).toContain('+++ b/')

      // Verification
      expect(result.verification.reproductionTestPassed).toBe(true)
      expect(result.verification.reproductionTestDetails.patchedResult).toBe('PASSED')
      expect(result.verification.regressionsCount).toBe(0)
      expect(result.verification.securityScanPassed).toBe(true)

      // Pull Request & Cryptographic seal
      expect(result.pullRequest.readyToMerge).toBe(true)
      expect(result.pullRequest.cryptographicPatchSeal).toBeDefined()
      expect(result.pullRequest.cryptographicPatchSeal.length).toBe(64) // SHA256 hex string
    })

    it('handles SWE-103 prototype pollution security challenge correctly', async () => {
      const result = await AutonomousSweStudioService.runAutonomousResolution({ id: 'SWE-103' })

      expect(result.issue.category).toBe('SECURITY_EXPLOIT')
      expect(result.patches.length).toBeGreaterThan(0)
      const diff = result.patches[0]?.unifiedDiff || ''
      expect(diff).toContain('FORBIDDEN_KEYS')
      expect(result.verification.securityScanPassed).toBe(true)
    })

    it('gracefully resolves custom input issues', async () => {
      const customResult = await AutonomousSweStudioService.runAutonomousResolution({
        id: 'CUSTOM-99',
        title: 'Transient Database Socket Disconnect',
        description: 'Connection resets in connection pool',
        category: 'DISTRIBUTED_RESILIENCE',
        severity: 'MEDIUM',
        affectedFiles: ['src/db/Pool.ts'],
        expectedBehavior: 'Re-establishes pool connection',
        actualBehavior: 'Throws SocketError',
      })

      expect(customResult.issue.id).toBe('CUSTOM-99')
      expect(customResult.pullRequest.prTitle).toContain('resolve CUSTOM-99')
      expect(customResult.pullRequest.readyToMerge).toBe(true)
    })

    it('verifies valid PR cryptographic seals and rejects tampered seals', async () => {
      const res = await AutonomousSweStudioService.runAutonomousResolution({ id: 'SWE-101' })
      const pr = res.pullRequest

      const isValid = AutonomousSweStudioService.verifyPatchSeal(
        pr.id,
        pr.issueId,
        pr.branchName,
        pr.patches,
        pr.verification.reproductionTestPassed,
        pr.cryptographicPatchSeal
      )
      expect(isValid).toBe(true)

      const isInvalid = AutonomousSweStudioService.verifyPatchSeal(
        pr.id,
        pr.issueId,
        pr.branchName,
        pr.patches,
        pr.verification.reproductionTestPassed,
        'deadbeef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
      )
      expect(isInvalid).toBe(false)
    })
  })
})

