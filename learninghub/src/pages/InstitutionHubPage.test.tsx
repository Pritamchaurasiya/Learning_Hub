import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { InstitutionHubPage } from './InstitutionHubPage'

describe('InstitutionHubPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders institution portal title, tenant badge, and telemetry cards', async () => {
    render(<InstitutionHubPage />)
    
    expect(await screen.findByText(/Enterprise Institution Portal/i)).toBeInTheDocument()
    expect(screen.getByText(/1EdTech LTI 1.3 Advantage & Multi-Tenant Hub/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Learners/i)).toBeInTheDocument()
    expect(screen.getByText(/Faculty & Instructors/i)).toBeInTheDocument()
    expect(screen.getByText(/Average Cohort Score/i)).toBeInTheDocument()
  })

  it('allows switching between Gateway, Cohort Breakdown, and Grade Passback tabs', async () => {
    render(<InstitutionHubPage />)
    
    // Default tab: Gateway
    expect(await screen.findByText(/LMS Registration Endpoints/i)).toBeInTheDocument()
    
    // Switch to Cohort breakdown
    const cohortTab = screen.getByText(/Cohort Exam Breakdown/i)
    fireEvent.click(cohortTab)
    expect(await screen.findByText(/Institutional Cohort Performance/i)).toBeInTheDocument()

    // Switch to Live Grade Passback log
    const passbackTab = screen.getByText(/Live Grade Passback \(AGS\) Log/i)
    fireEvent.click(passbackTab)
    expect(await screen.findByText(/Assignment & Grade Services \(AGS\) Passback Telemetry/i)).toBeInTheDocument()
  })

  it('runs the interactive LTI 1.3 launch simulator and displays established session HUD', async () => {
    render(<InstitutionHubPage />)

    const simButton = await screen.findByRole('button', { name: /Simulate Incoming LTI 1.3 Launch/i })
    fireEvent.click(simButton)

    await waitFor(() => {
      expect(screen.getByText(/✅ LTI Session Established/i)).toBeInTheDocument()
      expect(screen.getByText(/Alex Mercer/i)).toBeInTheDocument()
    })
  })
})
