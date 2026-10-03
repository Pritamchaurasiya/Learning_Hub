import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ExamReadinessGauge } from './ExamReadinessGauge'
import type { ExamReadinessBreakdown } from '../../types/bkt'

const MOCK_READINESS: ExamReadinessBreakdown = {
  compositeScore: 84,
  readinessLevel: 'COMPETITIVE',
  syllabusMastery: 88,
  mockScore: 80,
  speedAccuracy: 85,
  retentionRate: 82,
  strengths: ['Broad curriculum topic coverage', 'High memory retention'],
  weaknesses: ['Pacing on graph algorithms'],
  recommendation: 'Solid competitive foundation. Continue daily revision drills.',
}

describe('ExamReadinessGauge', () => {
  it('renders readiness score, badge, and breakdown metrics', () => {
    render(<ExamReadinessGauge readiness={MOCK_READINESS} />)

    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByText('Competitive Ready')).toBeInTheDocument()
    expect(screen.getByText('Syllabus Knowledge (35%)')).toBeInTheDocument()
    expect(screen.getByText('Full Mock Stamina (30%)')).toBeInTheDocument()
    expect(screen.getByText('Pacing & Speed (20%)')).toBeInTheDocument()
    expect(screen.getByText('Forgetting Curve Resistance (15%)')).toBeInTheDocument()
    expect(screen.getByText('Broad curriculum topic coverage')).toBeInTheDocument()
  })
})
