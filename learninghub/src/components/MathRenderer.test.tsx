import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MathRenderer } from './MathRenderer'

describe('MathRenderer', () => {
  it('renders plain text without math syntax', () => {
    render(<MathRenderer text="What is the speed of light?" />)
    expect(screen.getByText('What is the speed of light?')).toBeInTheDocument()
  })

  it('renders inline LaTeX formulas using KaTeX', () => {
    const { container } = render(<MathRenderer text="Given $E = mc^2$, calculate energy." />)
    expect(screen.getByText('Given')).toBeInTheDocument()
    expect(screen.getByText(', calculate energy.')).toBeInTheDocument()
    const katexEl = container.querySelector('.katex')
    expect(katexEl).toBeInTheDocument()
  })

  it('renders block LaTeX formulas using KaTeX displayMode', () => {
    const { container } = render(
      <MathRenderer text="Evaluate the following integral: $$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$" />
    )
    const blockEl = container.querySelector('.katex-display')
    expect(blockEl).toBeInTheDocument()
  })
})
