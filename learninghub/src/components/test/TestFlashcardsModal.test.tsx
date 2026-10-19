import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TestFlashcardsModal } from './TestFlashcardsModal'

describe('TestFlashcardsModal Component', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TestFlashcardsModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders active flashcard prompt and subject badge when open', () => {
    render(<TestFlashcardsModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('3D Spaced Flashcards')).toBeInTheDocument()
    expect(screen.getByText(/DSA/)).toBeInTheDocument()
    expect(
      screen.getByText(/Why does an Inorder traversal on a Binary Search Tree/i)
    ).toBeInTheDocument()
  })

  it('reveals answer when card flip or reveal button is clicked', () => {
    render(<TestFlashcardsModal isOpen={true} onClose={vi.fn()} />)

    const revealBtn = screen.getByText('Reveal Answer')
    fireEvent.click(revealBtn)

    expect(
      screen.getByText(/all keys in the left subtree are smaller than the root/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Again \(1d\)/)).toBeInTheDocument()
    expect(screen.getByText(/Good \(7d\)/)).toBeInTheDocument()
    expect(screen.getByText(/Easy \(14d\)/)).toBeInTheDocument()
  })

  it('navigates to next card when next button is clicked', () => {
    render(<TestFlashcardsModal isOpen={true} onClose={vi.fn()} />)

    const nextBtn = screen.getByText(/Next/i)
    fireEvent.click(nextBtn)

    // Should now show card 2 (Physics)
    expect(screen.getByText(/Physics/)).toBeInTheDocument()
    expect(
      screen.getByText(/How is Impulse mathematically related to Momentum/i)
    ).toBeInTheDocument()
  })

  it('calls onClose when close icon is clicked', () => {
    const onClose = vi.fn()
    render(<TestFlashcardsModal isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
