import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { EdgeAIPage } from './EdgeAIPage'
import { edgeAIService } from '../services/edgeAIService'

describe('EdgeAIPage (Milestone 13 Edge AI Offline Studio)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders page header, title, and welcome assistant message', async () => {
    render(
      <BrowserRouter>
        <EdgeAIPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Edge AI Offline Tutor & Local WebGPU Studio')).toBeInTheDocument()
    expect(screen.getByText('Air-Gapped Mode')).toBeInTheDocument()
    expect(screen.getByText(/Welcome to the/i)).toBeInTheDocument()
    expect(screen.getByText('Quantized Edge Models Library')).toBeInTheDocument()
  })

  it('allows switching tutor personas and toggling code scratchpad', async () => {
    render(
      <BrowserRouter>
        <EdgeAIPage />
      </BrowserRouter>
    )

    const codeReviewerBtn = screen.getByRole('button', { name: /Code Reviewer/i })
    fireEvent.click(codeReviewerBtn)

    const toggleCodeBtn = screen.getByRole('button', { name: /Attach Code Snippet/i })
    fireEvent.click(toggleCodeBtn)

    expect(screen.getByPlaceholderText(/Paste your algorithm or data structure/i)).toBeInTheDocument()
  })

  it('submits a prompt and displays simulated edge micro-inference response', async () => {
    vi.spyOn(edgeAIService, 'generateStreamingResponse').mockImplementation(
      async (_params, onChunk) => {
        onChunk({
          token: 'Result',
          accumulatedText: 'Edge Response Analyzed',
          done: true,
          metrics: {
            ttftMs: 30,
            tokensPerSec: 60,
            totalTokensGenerated: 10,
            elapsedMs: 200,
            peakMemoryMB: 300,
            engineMode: 'WEBGPU_SHADERS',
            modelId: 'qwen2.5-coder-0.5b',
          },
        })
        return 'Edge Response Analyzed'
      }
    )

    render(
      <BrowserRouter>
        <EdgeAIPage />
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText(/Ask anything about algorithms/i)
    fireEvent.change(input, { target: { value: 'Explain Quicksort' } })

    const sendBtn = screen.getByRole('button', { name: /Send prompt/i })
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText('Explain Quicksort')).toBeInTheDocument()
      expect(screen.getByText('Edge Response Analyzed')).toBeInTheDocument()
    })
  })
})
