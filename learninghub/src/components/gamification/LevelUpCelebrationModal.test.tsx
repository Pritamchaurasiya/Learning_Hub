import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { LevelUpCelebrationModal } from './LevelUpCelebrationModal'
import { useStore } from '../../stores/useStore'

describe('LevelUpCelebrationModal Component', () => {
  beforeEach(() => {
    useStore.setState({
      levelUpState: null,
    })
  })

  it('renders nothing when levelUpState is null or isOpen is false', () => {
    const { container } = render(<LevelUpCelebrationModal />)
    expect(container.firstChild).toBeNull()
  })

  it('renders celebration modal when levelUpState is active', () => {
    useStore.setState({
      levelUpState: {
        isOpen: true,
        previousLevel: 1,
        newLevel: 2,
        xpGained: 150,
      },
    })

    render(<LevelUpCelebrationModal />)

    expect(screen.getByText('LEVEL UP!')).toBeInTheDocument()
    expect(screen.getByText(/You advanced to/i)).toBeInTheDocument()
    expect(screen.getByText(/Level 2: Code Navigator/i)).toBeInTheDocument()
    expect(screen.getByText('Lv.1')).toBeInTheDocument()
    expect(screen.getByText('Lv.2')).toBeInTheDocument()
    expect(screen.getByText('+150 XP')).toBeInTheDocument()
    expect(screen.getByText(/Claim & Continue Learning/i)).toBeInTheDocument()
  })

  it('closes celebration modal when claim button is clicked', () => {
    useStore.setState({
      levelUpState: {
        isOpen: true,
        previousLevel: 1,
        newLevel: 2,
        xpGained: 100,
      },
    })

    render(<LevelUpCelebrationModal />)

    const claimButton = screen.getByRole('button', { name: /Claim & Continue Learning/i })
    fireEvent.click(claimButton)

    expect(useStore.getState().levelUpState).toBeNull()
  })

  it('closes celebration modal when Escape key is pressed', () => {
    useStore.setState({
      levelUpState: {
        isOpen: true,
        previousLevel: 2,
        newLevel: 3,
        xpGained: 200,
      },
    })

    render(<LevelUpCelebrationModal />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useStore.getState().levelUpState).toBeNull()
  })
})
