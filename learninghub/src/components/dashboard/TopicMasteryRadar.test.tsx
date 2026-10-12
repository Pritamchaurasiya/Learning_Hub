import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { TopicMasteryRadar } from './TopicMasteryRadar'

// Mock recharts
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    RadarChart: ({ children }: { children: ReactNode }) => (
      <div data-testid="radar-chart">{children}</div>
    ),
    Radar: () => null,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
  }
})

describe('TopicMasteryRadar', () => {
  const mockTopicMastery = {
    'Binary Trees': { topicName: 'Binary Trees', accuracy: 92, totalAttempts: 45 },
    'Graph Algorithms': { topicName: 'Graph Algorithms', accuracy: 68, totalAttempts: 38 },
    'Dynamic Programming': { topicName: 'Dynamic Programming', accuracy: 61, totalAttempts: 52 },
    'System Design': { topicName: 'System Design', accuracy: 85, totalAttempts: 30 },
  }

  it('renders the radar chart widget with title and average accuracy', () => {
    render(<TopicMasteryRadar topicMastery={mockTopicMastery} />)

    expect(screen.getByTestId('topic-mastery-radar')).toBeInTheDocument()
    expect(screen.getByText('Topic Mastery Radar')).toBeInTheDocument()
    // Average: (92 + 68 + 61 + 85) / 4 = 76.5 → 77% avg
    expect(screen.getByText('77% avg')).toBeInTheDocument()
  })

  it('renders weak topic warnings for topics below 70%', () => {
    render(<TopicMasteryRadar topicMastery={mockTopicMastery} />)

    expect(screen.getByText(/Needs Attention/)).toBeInTheDocument()
    expect(screen.getByText(/Dynamic Programming \(61%\)/)).toBeInTheDocument()
    expect(screen.getByText(/Graph Algorithms \(68%\)/)).toBeInTheDocument()
  })

  it('renders strong topic badges for topics at 85%+', () => {
    render(<TopicMasteryRadar topicMastery={mockTopicMastery} />)

    expect(screen.getByText(/Strong/)).toBeInTheDocument()
    expect(screen.getByText(/Binary Trees \(92%\)/)).toBeInTheDocument()
    expect(screen.getByText(/System Design \(85%\)/)).toBeInTheDocument()
  })

  it('renders nothing when given empty topic mastery', () => {
    const { container } = render(<TopicMasteryRadar topicMastery={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the recharts RadarChart component', () => {
    render(<TopicMasteryRadar topicMastery={mockTopicMastery} />)
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })
})
