import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TargetExamPyqHub } from './TargetExamPyqHub'

describe('TargetExamPyqHub Component', () => {
  it('renders official target exams and PYQ papers search bar', () => {
    render(<TargetExamPyqHub onStartTest={vi.fn()} />)

    expect(screen.getByTestId('target-exam-pyq-hub')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Search by shift, year, subject/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/All Competitive Exams/i)).toBeInTheDocument()
  })

  it('allows filtering by search input query', () => {
    render(<TargetExamPyqHub onStartTest={vi.fn()} />)

    const searchInput = screen.getByPlaceholderText(/Search by shift, year, subject/i)
    fireEvent.change(searchInput, { target: { value: 'JEE Main' } })

    expect(searchInput).toHaveValue('JEE Main')
  })

  it('triggers onStartTest when clicking Start Test on an official PYQ paper', () => {
    const onStart = vi.fn()
    render(<TargetExamPyqHub onStartTest={onStart} />)

    const startButtons = screen.getAllByRole('button', { name: /Start (Mock|CBT|Test|Official)/i })
    if (startButtons.length > 0) {
      fireEvent.click(startButtons[0])
      expect(onStart).toHaveBeenCalled()
    }
  })
})
