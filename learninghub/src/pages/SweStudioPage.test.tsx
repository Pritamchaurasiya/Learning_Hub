import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SweStudioPage } from './SweStudioPage'

vi.mock('../services/sweStudioService', async () => {
  const actual = await vi.importActual<any>('../services/sweStudioService')
  return {
    ...actual,
    SweStudioService: {
      ...actual.SweStudioService,
      getPresets: vi.fn().mockResolvedValue(actual.FALLBACK_SWE_PRESETS),
      resolveIssue: vi.fn().mockImplementation(async (issue: any) => {
        return actual.SweStudioService.createSimulatedResolution(issue)
      }),
    },
  }
})

describe('SweStudioPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page header, Milestone 24 banner, and preset issue selectors', async () => {
    render(
      <BrowserRouter>
        <SweStudioPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/Autonomous SWE Studio & Software Agent Arena/i)).toBeInTheDocument()
    expect(screen.getByText(/Milestone 24/i)).toBeInTheDocument()
    expect(screen.getAllByText('SWE-101').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SWE-102').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SWE-103').length).toBeGreaterThan(0)
  })

  it('allows switching between benchmark issues', async () => {
    render(
      <BrowserRouter>
        <SweStudioPage />
      </BrowserRouter>
    )

    const swe102Btn = screen.getByRole('button', { name: /SWE-102/i })
    fireEvent.click(swe102Btn)

    await waitFor(() => {
      expect(screen.getAllByText('SWE-102').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('switches between Thought Stream, Unified Patches, SBFL, and PR tabs', async () => {
    render(
      <BrowserRouter>
        <SweStudioPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Unified Patches/i })).toBeInTheDocument()
    })

    const patchesTab = screen.getByRole('button', { name: /Unified Patches/i })
    fireEvent.click(patchesTab)
    expect(screen.getByRole('button', { name: /Copy Unified Diff/i })).toBeInTheDocument()

    const sbflTab = screen.getByRole('button', { name: /SBFL Localization/i })
    fireEvent.click(sbflTab)
    expect(screen.getByText(/Spectrum-Based Fault Localization Rankings/i)).toBeInTheDocument()

    const prTab = screen.getByRole('button', { name: /Synthesized PR/i })
    fireEvent.click(prTab)
    expect(screen.getByText(/Ready for Merge/i)).toBeInTheDocument()

    const streamTab = screen.getByRole('button', { name: /Thought Stream/i })
    fireEvent.click(streamTab)
    expect(screen.getByText(/Autonomous Agent Execution Stream/i)).toBeInTheDocument()
  })
})
