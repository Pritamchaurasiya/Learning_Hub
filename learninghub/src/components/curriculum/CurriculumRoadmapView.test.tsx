import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CurriculumRoadmapView } from './CurriculumRoadmapView'
import { FALLBACK_DEMO_PLAN } from '../../services/curriculumService'

describe('CurriculumRoadmapView Component', () => {
  const mockToggleConcept = vi.fn().mockResolvedValue(undefined)
  const mockOpenGenerator = vi.fn()
  const mockOpenRecalibrate = vi.fn()
  const mockSyncToPlanner = vi.fn()

  it('renders curriculum roadmap header, readiness score, and pacing', () => {
    render(
      <CurriculumRoadmapView
        plan={FALLBACK_DEMO_PLAN}
        onToggleConcept={mockToggleConcept}
        onOpenGenerator={mockOpenGenerator}
        onOpenRecalibrate={mockOpenRecalibrate}
        onSyncToPlanner={mockSyncToPlanner}
      />
    )

    expect(screen.getByText(FALLBACK_DEMO_PLAN.title)).toBeDefined()
    expect(screen.getByText('Exam Readiness Score')).toBeDefined()
    expect(screen.getByText('Curriculum Progress')).toBeDefined()
    expect(screen.getByText('12 Weeks')).toBeDefined()
  })

  it('triggers onOpenGenerator when clicking New Syllabus button', () => {
    render(
      <CurriculumRoadmapView
        plan={FALLBACK_DEMO_PLAN}
        onToggleConcept={mockToggleConcept}
        onOpenGenerator={mockOpenGenerator}
        onOpenRecalibrate={mockOpenRecalibrate}
        onSyncToPlanner={mockSyncToPlanner}
      />
    )

    const newBtn = screen.getByText('New Syllabus')
    fireEvent.click(newBtn)
    expect(mockOpenGenerator).toHaveBeenCalled()
  })

  it('triggers onOpenRecalibrate when clicking Recalibrate Pacing button', () => {
    render(
      <CurriculumRoadmapView
        plan={FALLBACK_DEMO_PLAN}
        onToggleConcept={mockToggleConcept}
        onOpenGenerator={mockOpenGenerator}
        onOpenRecalibrate={mockOpenRecalibrate}
        onSyncToPlanner={mockSyncToPlanner}
      />
    )

    const recalibBtn = screen.getByText('Recalibrate Pacing')
    fireEvent.click(recalibBtn)
    expect(mockOpenRecalibrate).toHaveBeenCalled()
  })

  it('renders concepts in expanded module and triggers toggle concept', () => {
    render(
      <CurriculumRoadmapView
        plan={FALLBACK_DEMO_PLAN}
        onToggleConcept={mockToggleConcept}
        onOpenGenerator={mockOpenGenerator}
        onOpenRecalibrate={mockOpenRecalibrate}
        onSyncToPlanner={mockSyncToPlanner}
      />
    )

    const conceptName = screen.getByText('Master Theorem for Divide-and-Conquer Recurrences')
    expect(conceptName).toBeDefined()

    fireEvent.click(conceptName)
    expect(mockToggleConcept).toHaveBeenCalledWith('mod-w1', 'c-1-1')
  })
})
