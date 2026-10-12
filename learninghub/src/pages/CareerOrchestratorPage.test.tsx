import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../test/test-utils'
import { CareerOrchestratorPage } from './CareerOrchestratorPage'

vi.mock('../services/careerService', async () => {
  const actual = await vi.importActual<any>('../services/careerService')
  return {
    ...actual,
    careerService: {
      ...actual.careerService,
      getMatchedJobs: vi.fn().mockImplementation(async (params?: any) => {
        return actual.careerService.getFallbackJobs(params)
      }),
      sendDialogueTurn: vi.fn().mockImplementation(async (params: any) => {
        return actual.careerService.getFallbackDialogue(params)
      }),
      submitCounterOffer: vi.fn().mockImplementation(async (params: any) => {
        const total =
          params.counterOffer.baseSalary +
          params.counterOffer.equityValueUsd +
          params.counterOffer.signingBonus
        return {
          verdict: 'ACCEPTED',
          revisedPackage: {
            ...params.counterOffer,
            totalTargetCompensation: total,
            acceptedStatus: 'ACCEPTED',
          },
          feedbackNote: 'Full executive committee acceptance',
          deltaUsd: 15000,
        }
      }),
    },
  }
})

describe('CareerOrchestratorPage (Milestone 26 Anti-Gravity Career Orchestrator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page header, title, and initial matched jobs', async () => {
    render(<CareerOrchestratorPage />)

    expect(screen.getByText(/Autonomous Job Matching & Recruiter Simulation Grid/i)).toBeInTheDocument()
    expect(screen.getByText(/Milestone 26/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText(/Novacloud Systems/i).length).toBeGreaterThan(0)
    })
  })

  it('allows filtering by career tracks and remote toggle', async () => {
    render(<CareerOrchestratorPage />)

    await waitFor(() => {
      expect(screen.getByText(/AI Inference & Lab/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/AI Inference & Lab/i))

    await waitFor(() => {
      expect(screen.getAllByText(/Hyperion Intelligence Lab/i).length).toBeGreaterThan(0)
    })
  })

  it('switches between recruiter personas when clicked', async () => {
    render(<CareerOrchestratorPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Counter Offer/i })).toBeInTheDocument()
    })

    expect(screen.getAllByText(/Sarah Lin/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/David Vance/i).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText(/David Vance/i)[0])
  })

  it('opens and closes compensation negotiator modal', async () => {
    render(<CareerOrchestratorPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Counter Offer/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Counter Offer/i }))

    await waitFor(() => {
      expect(screen.getByText(/Compensation & Equity Negotiator/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }))

    await waitFor(() => {
      expect(screen.queryByText(/Compensation & Equity Negotiator/i)).not.toBeInTheDocument()
    })
  })
})
