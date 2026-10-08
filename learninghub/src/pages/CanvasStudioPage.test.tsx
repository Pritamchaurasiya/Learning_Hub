import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { CanvasStudioPage } from './CanvasStudioPage'
import { proctoringService } from '../services/proctoringService'

describe('CanvasStudioPage (Milestone 14 Interactive Canvas & AI Proctor Studio)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(proctoringService, 'startSession').mockResolvedValue({
      sessionId: 'sess-canvas-test',
      userId: 'test-user',
      testAttemptId: 'test-canvas-attempt',
      examTitle: 'Algorithmic Scratchpad Exam',
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      integrityScore: 100,
      totalFramesAnalyzed: 0,
      incidents: [],
      averageGazeDeviation: 0.05,
      averageNoiseDecibels: 25,
    })
  })

  it('renders Canvas Studio page header, title, and canvas element', async () => {
    render(
      <BrowserRouter>
        <CanvasStudioPage />
      </BrowserRouter>
    )

    expect(
      screen.getByText('Interactive Blackboard & AI Proctoring Studio')
    ).toBeInTheDocument()
    expect(screen.getByText('Milestone 14')).toBeInTheDocument()
    expect(screen.getByText('Pen')).toBeInTheDocument()
    expect(screen.getByText(/vector strokes/i)).toBeInTheDocument()
  })

  it('toggles Graph DSA panel and Equation Recognizer drawers', async () => {
    render(
      <BrowserRouter>
        <CanvasStudioPage />
      </BrowserRouter>
    )

    // Toggle Graph DSA Panel
    const graphBtn = screen.getByRole('button', { name: /Graph DSA Panel/i })
    fireEvent.click(graphBtn)
    expect(screen.getByText('DSA Graph Inspector')).toBeInTheDocument()

    // Toggle Formula Drawer
    const formulaBtn = screen.getByRole('button', { name: /Recognize LaTeX/i })
    fireEvent.click(formulaBtn)
    expect(screen.getByText('LaTeX Formula Recognizer')).toBeInTheDocument()
  })

  it('toggles AI Proctoring HUD on and off', async () => {
    render(
      <BrowserRouter>
        <CanvasStudioPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('AI Vision & Audio Proctor HUD')).toBeInTheDocument()
    })

    const proctorToggleBtn = screen.getByRole('button', { name: /Proctoring HUD On/i })
    fireEvent.click(proctorToggleBtn)
    expect(screen.queryByText('AI Vision & Audio Proctor HUD')).not.toBeInTheDocument()
  })
})
