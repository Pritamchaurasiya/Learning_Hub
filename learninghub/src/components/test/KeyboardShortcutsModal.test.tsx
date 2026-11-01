import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

describe('KeyboardShortcutsModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />)
    expect(container.querySelector('[data-testid="keyboard-shortcuts-modal"]')).toBeNull()
  })

  it('renders correctly when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByTestId('keyboard-shortcuts-modal')).toBeInTheDocument()
    expect(screen.getByText('Examination Keyboard Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Save & Next question')).toBeInTheDocument()
    expect(screen.getByText('Navigate to previous question')).toBeInTheDocument()
  })

  it('calls onClose when close button or Got It button is clicked', () => {
    const handleClose = vi.fn()
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />)

    const gotItBtn = screen.getByRole('button', { name: /Got It, Resume Test/i })
    fireEvent.click(gotItBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByLabelText(/Close shortcuts dialog/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(2)
  })
})
