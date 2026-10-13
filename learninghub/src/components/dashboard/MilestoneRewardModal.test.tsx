import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { MilestoneRewardModal } from './MilestoneRewardModal'

describe('MilestoneRewardModal', () => {
  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn()
    render(<MilestoneRewardModal isOpen={false} onClose={handleClose} currentLevel={5} />)

    expect(screen.queryByTestId('milestone-reward-modal')).not.toBeInTheDocument()
  })

  it('renders milestone rewards when isOpen is true', () => {
    const handleClose = vi.fn()
    render(
      <MilestoneRewardModal
        isOpen={true}
        onClose={handleClose}
        currentLevel={7}
        bonusXp={350}
      />
    )

    expect(screen.getByTestId('milestone-reward-modal')).toBeInTheDocument()
    expect(screen.getByText(/Level 7 Milestone Unlocked/i)).toBeInTheDocument()
    expect(screen.getByText('Scholar Prestige Rewards')).toBeInTheDocument()
    expect(screen.getByText('+350 Scholar XP')).toBeInTheDocument()
  })

  it('calls onClose when clicking Equip Rewards & Continue button', () => {
    const handleClose = vi.fn()
    render(<MilestoneRewardModal isOpen={true} onClose={handleClose} currentLevel={5} />)

    const claimBtn = screen.getByRole('button', { name: /Equip Rewards & Continue/i })
    fireEvent.click(claimBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking close icon button', () => {
    const handleClose = vi.fn()
    render(<MilestoneRewardModal isOpen={true} onClose={handleClose} currentLevel={5} />)

    const closeBtn = screen.getByRole('button', { name: /Close milestone modal/i })
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
