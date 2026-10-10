import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NeuroStudyOptimizerPage } from './NeuroStudyOptimizerPage'

vi.mock('../components/SEO', () => ({
  SEO: () => null,
}))

describe('NeuroStudyOptimizerPage (Milestone 15 Biofeedback Optimizer)', () => {
  it('renders page header, title, and flow state gauge', () => {
    render(
      <MemoryRouter>
        <NeuroStudyOptimizerPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText('Neuro-Adaptive Study State Optimizer')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Milestone 15 Biofeedback Engine')
    ).toBeInTheDocument()
    expect(screen.getByText('Neuro-Adaptive Flow Index')).toBeInTheDocument()
    expect(screen.getByText('Flow Session Timer')).toBeInTheDocument()
  })

  it('toggles session active state and ocular tracking', () => {
    render(
      <MemoryRouter>
        <NeuroStudyOptimizerPage />
      </MemoryRouter>
    )

    const sessionBtn = screen.getByText('Start Flow Session')
    fireEvent.click(sessionBtn)
    expect(screen.getByText('Pause Session')).toBeInTheDocument()

    const cameraBtn = screen.getByText('Webcam Biomarkers: OFF')
    fireEvent.click(cameraBtn)
    expect(screen.getByText('Ocular Tracking: ON')).toBeInTheDocument()
  })

  it('records keystrokes into live cognitive scratchpad', () => {
    render(
      <MemoryRouter>
        <NeuroStudyOptimizerPage />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(/Solve or reason here/i)
    fireEvent.change(textarea, { target: { value: 'const x = 42;' } })
    expect(screen.getByText(/Words Typed: 4/)).toBeInTheDocument()
  })
})
