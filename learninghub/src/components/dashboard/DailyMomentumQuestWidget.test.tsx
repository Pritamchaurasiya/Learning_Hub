import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { DailyMomentumQuestWidget } from './DailyMomentumQuestWidget'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('DailyMomentumQuestWidget', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders daily quests and reward status', () => {
    render(<DailyMomentumQuestWidget />)

    expect(screen.getByTestId('daily-momentum-quest-widget')).toBeInTheDocument()
    expect(screen.getByText(/Daily Momentum Quests/i)).toBeInTheDocument()
    expect(screen.getByText(/Run 1 Adaptive Diagnostic Test/i)).toBeInTheDocument()
    expect(screen.getByText(/Complete 1 Pomodoro Deep Work Sprint/i)).toBeInTheDocument()
    expect(screen.getByText(/Review 1 Flagged Problem or Concept/i)).toBeInTheDocument()
  })

  it('adapts first quest to calibrated weak topic when provided', () => {
    render(<DailyMomentumQuestWidget weakTopic="Dynamic Programming" />)

    expect(screen.getByText(/Run 1 Adaptive Diagnostic Test \(Dynamic Programming\)/i)).toBeInTheDocument()
    expect(screen.getByTestId('ai-target-badge')).toBeInTheDocument()
  })

  it('toggles quest completion status on click', () => {
    render(<DailyMomentumQuestWidget />)

    const questCard = screen.getByText(/Run 1 Adaptive Diagnostic Test/i).closest('[role="button"]')
    expect(questCard).not.toBeNull()

    if (questCard) {
      fireEvent.click(questCard)
      expect(screen.getByText('33%')).toBeInTheDocument()
      expect(
        screen.getByText((_content, element) => {
          return (
            element?.tagName.toLowerCase() === 'span' &&
            /1\s*\/\s*3\s*Done/.test(element.textContent || '')
          )
        })
      ).toBeInTheDocument()
    }
  })

  it('triggers onActionClick callback when clicking action button', () => {
    const handleActionClick = vi.fn()
    render(<DailyMomentumQuestWidget onActionClick={handleActionClick} />)

    const actionButton = screen.getByRole('button', { name: /Launch Test/i })
    fireEvent.click(actionButton)

    expect(handleActionClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'q-1',
        actionLabel: 'Launch Test',
      })
    )
  })
})
