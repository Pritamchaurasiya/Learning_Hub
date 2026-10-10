import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TestCatalogCardGrid } from './TestCatalogCardGrid'
import { TestA } from '../../services/testsAService'

const mockTests: TestA[] = [
  {
    id: 'test-1',
    title: 'Thermodynamics Mock Exam',
    description: 'Comprehensive thermodynamics drill',
    exam_name: 'JEE Advanced',
    exam_code: 'JEE_ADV',
    country_name: 'India',
    difficulty: 'medium',
    mode: 'mock',
    question_count: 30,
    time_limit_minutes: 60,
    passing_score: 50,
    total_marks: 100,
    negative_marks_per_question: 1,
    is_ai_generated: false,
    is_featured: true,
    attempt_count: 120,
    created_at: '2026-01-01',
  },
  {
    id: 'test-2',
    title: 'Adaptive Calculus Battery',
    description: 'IRT calibrated test',
    exam_name: 'SAT Subject Math',
    exam_code: 'SAT_MATH',
    country_name: 'USA',
    difficulty: 'adaptive',
    mode: 'adaptive',
    question_count: 20,
    time_limit_minutes: 45,
    passing_score: 50,
    total_marks: 100,
    negative_marks_per_question: 0,
    is_ai_generated: true,
    is_featured: false,
    attempt_count: 85,
    created_at: '2026-01-01',
  },
]

describe('TestCatalogCardGrid Component', () => {
  it('renders empty state when test list is empty', () => {
    render(
      <TestCatalogCardGrid
        tests={[]}
        offlineBundles={[]}
        downloadingTestIds={new Set()}
        onStartTest={vi.fn()}
        onDownloadOffline={vi.fn()}
      />
    )

    expect(screen.getByText(/No tests found/i)).toBeInTheDocument()
    expect(screen.getByText(/Try adjusting your filters or search query/i)).toBeInTheDocument()
  })

  it('renders cards for each test in the list', () => {
    render(
      <TestCatalogCardGrid
        tests={mockTests}
        offlineBundles={[]}
        downloadingTestIds={new Set()}
        onStartTest={vi.fn()}
        onDownloadOffline={vi.fn()}
      />
    )

    expect(screen.getByText(/Thermodynamics Mock Exam/i)).toBeInTheDocument()
    expect(screen.getByText(/Adaptive Calculus Battery/i)).toBeInTheDocument()
  })

  it('calls onStartTest when card action is triggered', () => {
    const handleStart = vi.fn()
    render(
      <TestCatalogCardGrid
        tests={mockTests}
        offlineBundles={[]}
        downloadingTestIds={new Set()}
        onStartTest={handleStart}
        onDownloadOffline={vi.fn()}
      />
    )

    const startButtons = screen.getAllByRole('button', { name: /Start Test|Take Test|Start/i })
    if (startButtons.length > 0) {
      fireEvent.click(startButtons[0])
      expect(handleStart).toHaveBeenCalledWith(mockTests[0])
    }
  })
})
