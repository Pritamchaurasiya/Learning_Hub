import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExamScientificCalculatorModal } from './ExamScientificCalculatorModal'

describe('ExamScientificCalculatorModal Component', () => {
  it('renders the scientific calculator with digital display when isOpen is true', () => {
    render(<ExamScientificCalculatorModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('CBT Virtual Scientific Calculator')).toBeInTheDocument()
    expect(screen.getByText('DEG')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '= Evaluate' })).toBeInTheDocument()
    expect(screen.getByTestId('calc-display')).toHaveTextContent('0')
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ExamScientificCalculatorModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('performs arithmetic calculations accurately', () => {
    render(<ExamScientificCalculatorModal isOpen={true} onClose={vi.fn()} />)

    const btn7 = screen.getByRole('button', { name: '7' })
    const btn8 = screen.getByRole('button', { name: '8' })
    const btnMul = screen.getByRole('button', { name: '×' })
    const btnEq = screen.getByRole('button', { name: '= Evaluate' })

    fireEvent.click(btn7)
    fireEvent.click(btnMul)
    fireEvent.click(btn8)
    fireEvent.click(btnEq)

    // Result 7 * 8 = 56
    expect(screen.getByTestId('calc-display')).toHaveTextContent('56')
  })

  it('handles square root and trigonometric functions', () => {
    render(<ExamScientificCalculatorModal isOpen={true} onClose={vi.fn()} />)

    const btn9 = screen.getByRole('button', { name: '9' })
    const btnSqrt = screen.getByRole('button', { name: '√x' })

    fireEvent.click(btn9)
    fireEvent.click(btnSqrt)

    // sqrt(9) = 3
    expect(screen.getByTestId('calc-display')).toHaveTextContent('3')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ExamScientificCalculatorModal isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: 'Close calculator' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
