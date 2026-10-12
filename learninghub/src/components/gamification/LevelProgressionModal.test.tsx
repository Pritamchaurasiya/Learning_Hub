import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { LevelProgressionModal } from './LevelProgressionModal'

describe('LevelProgressionModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LevelProgressionModal isOpen={false} onClose={vi.fn()} currentXp={500} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with correct tier information and stats when open', () => {
    render(
      <LevelProgressionModal
        isOpen={true}
        onClose={vi.fn()}
        currentXp={650} // Level 2: 400 base, 900 threshold
        streak={5}
      />
    )

    expect(screen.getByText('Cognitive Mastery Matrix')).toBeInTheDocument()
    expect(screen.getAllByText('Code Navigator').length).toBeGreaterThan(0)
    expect(screen.getByText('Tier Level 2 Scholar')).toBeInTheDocument()
    expect(screen.getByText(/650 Lifetime XP/i)).toBeInTheDocument()
    expect(screen.getByText(/5d \(1.3x\)/i)).toBeInTheDocument()
  })

  it('displays unlocked perks and next tier preview', () => {
    render(
      <LevelProgressionModal
        isOpen={true}
        onClose={vi.fn()}
        currentXp={200} // Level 1
      />
    )

    expect(screen.getByText(/Active Tier Perks Unlocked \(Level 1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Standard DSA Practice/i)).toBeInTheDocument()
    expect(screen.getByText(/Live Class Studio & Chat/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocks at Next Level \(Level 2\)/i)).toBeInTheDocument()
  })

  it('calls onClose when close button or Got It button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <LevelProgressionModal
        isOpen={true}
        onClose={handleClose}
        currentXp={500}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Got It/i }))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <LevelProgressionModal
        isOpen={true}
        onClose={handleClose}
        currentXp={500}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalled()
  })
})
