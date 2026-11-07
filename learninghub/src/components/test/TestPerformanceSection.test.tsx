import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TestPerformanceSection } from './TestPerformanceSection'

// Mock ResponsiveContainer so recharts renders cleanly in JSDOM
vi.mock('recharts', async importOriginal => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
  }
})

describe('TestPerformanceSection Component', () => {
  it('renders overall band, radar chart, and score trajectory headers', () => {
    render(<TestPerformanceSection />)

    expect(screen.getByText(/Performance & Mastery Diagnostics/i)).toBeInTheDocument()
    expect(screen.getByText(/Overall Band: Elite/i)).toBeInTheDocument()
    expect(screen.getByText('Subject Mastery Radar')).toBeInTheDocument()
    expect(screen.getByText('Score Trajectory')).toBeInTheDocument()
    expect(screen.getByText('Exam Readiness Index')).toBeInTheDocument()
  })

  it('renders accuracy by subject with goal benchmarks', () => {
    render(<TestPerformanceSection />)

    expect(screen.getByText(/Accuracy by Subject/i)).toBeInTheDocument()
    expect(screen.getByText('Mathematics & Calculus')).toBeInTheDocument()
    expect(screen.getByText('Data Structures & Algorithms')).toBeInTheDocument()
  })

  it('renders 12-week study heatmap and responds to day cell clicks', () => {
    render(<TestPerformanceSection />)

    expect(screen.getByText('12-Week Study Heatmap')).toBeInTheDocument()
    expect(screen.getByText('54 Days Active')).toBeInTheDocument()

    // Find and click any day button in the heatmap
    const dayButtons = screen.getAllByRole('button', { name: /tests solved/i })
    expect(dayButtons.length).toBe(84) // 12 weeks * 7 days

    fireEvent.click(dayButtons[0])
    expect(screen.getByText(/Week 1, Day 1:/i)).toBeInTheDocument()
  })

  it('renders Pacing & Timing Velocity Index with empirical metrics', () => {
    render(<TestPerformanceSection />)

    expect(screen.getByText(/Pacing & Timing Velocity Index/i)).toBeInTheDocument()
    expect(screen.getByText(/Master Pacer/i)).toBeInTheDocument()
    expect(screen.getByText(/Avg Solve Speed/i)).toBeInTheDocument()
    expect(screen.getByText(/Speed Advantage/i)).toBeInTheDocument()
    expect(screen.getByText(/Sinkhole Resistance/i)).toBeInTheDocument()
    expect(screen.getByText('+18.4m')).toBeInTheDocument()
    expect(screen.getByText('91.2%')).toBeInTheDocument()
  })

  it('renders skeleton loader when isLoading is true and attempts are empty', () => {
    render(<TestPerformanceSection isLoading={true} attempts={[]} />)
    expect(screen.getByTestId('performance-skeleton')).toBeInTheDocument()
  })

  it('computes personalized metrics and displays Personalized History badge when attempts are provided', () => {
    const mockAttempts: any[] = [
      {
        id: 'att-1',
        test_id: 't-1',
        percentage: 75,
        passed: true,
        started_at: '2026-10-01T10:00:00Z',
        time_taken_seconds: 600,
        answers: [
          { topic: 'Calculus', is_correct: true, time_spent: 45 },
          { topic: 'Mechanics', is_correct: false, time_spent: 140 },
        ],
      },
      {
        id: 'att-2',
        test_id: 't-2',
        percentage: 95,
        passed: true,
        started_at: '2026-10-05T10:00:00Z',
        time_taken_seconds: 400,
        answers: [
          { topic: 'Calculus', is_correct: true, time_spent: 40 },
          { topic: 'Mechanics', is_correct: true, time_spent: 55 },
        ],
      },
    ]

    render(<TestPerformanceSection attempts={mockAttempts} />)

    expect(screen.getByText('Personalized History')).toBeInTheDocument()
    expect(screen.getByText(/Last 2 Tests/i)).toBeInTheDocument()
    expect(screen.getByText('Baseline: 75%')).toBeInTheDocument()
    expect(screen.getByText('Peak: 95%')).toBeInTheDocument()
  })
})
