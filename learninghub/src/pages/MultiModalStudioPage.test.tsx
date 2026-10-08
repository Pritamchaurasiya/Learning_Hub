import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { MultiModalStudioPage } from './MultiModalStudioPage'
import { multiModalService } from '../services/multimodalService'

describe('MultiModalStudioPage (Milestone 14 Voice, Vision & Canvas Studio)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders page header, title, and initial status badges', async () => {
    render(
      <BrowserRouter>
        <MultiModalStudioPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Voice, Vision & Interactive Canvas Studio')).toBeInTheDocument()
    expect(screen.getByText('Milestone 14')).toBeInTheDocument()
    expect(screen.getByText(/300ms Voice Turn/i)).toBeInTheDocument()
    expect(screen.getByText('Vision AI Telemetry & Gaze HUD')).toBeInTheDocument()
  })

  it('allows applying preset sketch templates onto canvas', async () => {
    render(
      <BrowserRouter>
        <MultiModalStudioPage />
      </BrowserRouter>
    )

    const presetBtn = screen.getByRole('button', { name: /Gaussian Integral/i })
    fireEvent.click(presetBtn)

    expect(screen.getByText(/LaTeX Recognized/i)).toBeInTheDocument()
    expect(screen.getAllByText(/\\int_{-\\infty}/i).length).toBeGreaterThanOrEqual(1)
  })

  it('simulates spoken prompt submission and renders audio feedback', async () => {
    vi.spyOn(multiModalService, 'submitVoiceTurn').mockResolvedValueOnce({
      sessionId: 'sess-test',
      turnId: 'turn-999',
      latencyMs: 175,
      studentSentiment: 'CONFIDENT',
      speakingRateWpm: 140,
      synthesizedResponseText: 'What invariant must remain true after the swap?',
      audioCue: 'PROMPT_CONTINUE',
      followUpQuestions: ['Does the pivot stay in place?'],
    })

    render(
      <BrowserRouter>
        <MultiModalStudioPage />
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText(/Simulate spoken response/i)
    fireEvent.change(input, { target: { value: 'Partitioning places the pivot in its final position.' } })

    const sendBtn = screen.getByRole('button', { name: /Send Speech/i })
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText(/What invariant must remain true after the swap?/i)).toBeInTheDocument()
      expect(screen.getByText(/175ms Latency/i)).toBeInTheDocument()
    })
  })
})
