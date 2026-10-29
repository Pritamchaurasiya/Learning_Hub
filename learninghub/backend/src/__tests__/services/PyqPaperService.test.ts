import { pyqPaperService, HISTORICAL_BENCHMARKS } from '../../services/PyqPaperService'

describe('PyqPaperService (Milestone 31 Multi-National PYQ Archive & Cutoff Engine)', () => {
  it('should retrieve official benchmark data for registered shifts', () => {
    const jeeBenchmark = pyqPaperService.getHistoricalBenchmark('jee-main-2024-jan-27-s1')
    expect(jeeBenchmark).toBeDefined()
    expect(jeeBenchmark?.examSlug).toBe('jee-mains')
    expect(jeeBenchmark?.year).toBe(2024)
    expect(jeeBenchmark?.totalMarks).toBe(300)
    expect(jeeBenchmark?.categoryCutoffs.general).toBe(132)

    const neetBenchmark = pyqPaperService.getHistoricalBenchmark('neet-ug-2023-official')
    expect(neetBenchmark).toBeDefined()
    expect(neetBenchmark?.examSlug).toBe('neet')
    expect(neetBenchmark?.totalMarks).toBe(720)

    const gateBenchmark = pyqPaperService.getHistoricalBenchmark('gate-cs-2024-official')
    expect(gateBenchmark).toBeDefined()
    expect(gateBenchmark?.difficultyRating).toBe('TOUGH')
  })

  it('should return null for unknown benchmark keys', () => {
    const unknown = pyqPaperService.getHistoricalBenchmark('unknown-paper-key-999')
    expect(unknown).toBeNull()
  })

  it('should calculate top percentiles and AIR for high raw scores', () => {
    const result = pyqPaperService.calculateShiftPercentile(280, 'jee-main-2024-jan-27-s1')
    expect(result.percentile).toBeGreaterThanOrEqual(99.9)
    expect(result.estimatedAir).toBeLessThanOrEqual(1200)
    expect(result.clearedCutoff).toBe(true)
    expect(result.targetCollegeTiers).toContain('Tier-1 Institutes (Top 3 NITs / IITs CSE / AI)')
  })

  it('should interpolate percentile and AIR accurately between intermediate anchors', () => {
    // 205 is 98.2 percentile, 240 is 99.15 percentile in JEE Main 2024 Jan 27 S1
    const result = pyqPaperService.calculateShiftPercentile(220, 'jee-main-2024-jan-27-s1')
    expect(result.percentile).toBeGreaterThan(98.2)
    expect(result.percentile).toBeLessThan(99.15)
    expect(result.estimatedAir).toBeGreaterThan(12000)
    expect(result.estimatedAir).toBeLessThan(25000)
    expect(result.clearedCutoff).toBe(true)
  })

  it('should evaluate cutoff status correctly against General category benchmark', () => {
    // Cutoff for General is 132 in Jan 27 S1
    const passed = pyqPaperService.calculateShiftPercentile(140, 'jee-main-2024-jan-27-s1')
    expect(passed.clearedCutoff).toBe(true)

    const failed = pyqPaperService.calculateShiftPercentile(110, 'jee-main-2024-jan-27-s1')
    expect(failed.clearedCutoff).toBe(false)
  })

  it('should handle bottom scores gracefully without negative numbers or division by zero', () => {
    const lowScore = pyqPaperService.calculateShiftPercentile(20, 'jee-main-2024-jan-27-s1')
    expect(lowScore.percentile).toBeGreaterThan(0)
    expect(lowScore.percentile).toBeLessThan(62.0)
    expect(lowScore.clearedCutoff).toBe(false)
    expect(lowScore.targetCollegeTiers).toContain('Foundation Revision & Focused PYQ Re-attempt recommended')
  })

  it('should provide fallback estimation for unregistered benchmark keys', () => {
    const fallback = pyqPaperService.calculateShiftPercentile(180, 'non-existent-benchmark')
    expect(fallback.percentile).toBeGreaterThan(0)
    expect(fallback.percentile).toBeLessThanOrEqual(99.9)
    expect(fallback.clearedCutoff).toBe(true)
    expect(fallback.difficultyRating).toBe('MODERATE')
  })
})
