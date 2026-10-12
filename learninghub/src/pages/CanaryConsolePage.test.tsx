import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CanaryConsolePage } from './CanaryConsolePage'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../services/canaryDeploymentService', async () => {
  const actual = await vi.importActual<any>('../services/canaryDeploymentService')
  const baseDeployments = actual.FALLBACK_CANARY_DEPLOYMENTS.map((d: any) => ({ ...d }))

  return {
    ...actual,
    CanaryDeploymentService: {
      fetchDeployments: vi.fn().mockImplementation(async () => {
        return baseDeployments.map((d: any) => ({ ...d }))
      }),
      getDeployment: vi.fn().mockImplementation(async (id: string) => {
        return baseDeployments.find((d: any) => d.id === id) || baseDeployments[0]
      }),
      startRollout: vi.fn().mockImplementation(async (params: any) => {
        const newDep = {
          ...baseDeployments[0],
          id: `dep-${Date.now()}`,
          serviceName: params.serviceName,
          version: params.version,
          stage: 'CANARY_10_PERCENT',
          status: 'RUNNING',
        }
        return newDep
      }),
      advanceStage: vi.fn().mockImplementation(async (id: string) => {
        const dep = baseDeployments.find((d: any) => d.id === id) || baseDeployments[0]
        return {
          ...dep,
          stage: 'CANARY_25_PERCENT',
          trafficWeightCanary: 25,
          trafficWeightBaseline: 75,
        }
      }),
      triggerRollback: vi.fn().mockImplementation(async (id: string, _reason?: string) => {
        const dep = baseDeployments.find((d: any) => d.id === id) || baseDeployments[0]
        return {
          ...dep,
          stage: 'ROLLED_BACK',
          status: 'ROLLED_BACK',
          trafficWeightCanary: 0,
          trafficWeightBaseline: 100,
        }
      }),
      simulateTrafficLoad: vi.fn().mockImplementation(async (id: string, params: any) => {
        const dep = baseDeployments.find((d: any) => d.id === id) || baseDeployments[0]
        const isSpike = (params.injectErrorRatePercent || 0) > 0.5
        return {
          ...dep,
          stage: isSpike ? 'ROLLED_BACK' : dep.stage,
          status: isSpike ? 'ROLLED_BACK' : dep.status,
          trafficWeightCanary: isSpike ? 0 : dep.trafficWeightCanary,
          trafficWeightBaseline: isSpike ? 100 : dep.trafficWeightBaseline,
        }
      }),
    },
  }
})

describe('CanaryConsolePage (Milestone 26 GitOps Progressive Delivery Studio)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithRouter = () => {
    return render(
      <BrowserRouter>
        <CanaryConsolePage />
      </BrowserRouter>
    )
  }

  it('renders page header, title, and initial deployment details', async () => {
    renderWithRouter()

    expect(
      screen.getByText(/Autonomous GitOps Progressive Delivery Studio/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /New Canary Rollout/i })
    ).toBeInTheDocument()

    // Deployments tabs should be rendered
    await waitFor(() => {
      expect(screen.getAllByText('API Gateway & Edge Router').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Zero-Trust Auth & Session Guardian').length).toBeGreaterThan(0)
    })
  })

  it('switches between deployment tabs', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getAllByText('Zero-Trust Auth & Session Guardian').length).toBeGreaterThan(0)
    })

    const authTabs = screen.getAllByText('Zero-Trust Auth & Session Guardian')
    fireEvent.click(authTabs[0])

    await waitFor(() => {
      expect(screen.getAllByText('v3.2.0').length).toBeGreaterThan(0)
    })
  })

  it('opens and submits new canary rollout modal', async () => {
    renderWithRouter()

    const newBtn = screen.getByRole('button', { name: /New Canary Rollout/i })
    fireEvent.click(newBtn)

    expect(screen.getByText(/Initiate New Canary Rollout/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. Catalog Service/i)).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Launch 10% Canary/i })
    fireEvent.submit(submitBtn.closest('form')!)

    await waitFor(() => {
      expect(screen.queryByText(/Initiate New Canary Rollout/i)).not.toBeInTheDocument()
    })
  })

  it('triggers synthetic traffic load simulation', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/Inject Synthetic Traffic Load/i)).toBeInTheDocument()
    })

    const injectBtn = screen.getByRole('button', { name: /Inject Synthetic Traffic Load/i })
    fireEvent.click(injectBtn)

    await waitFor(() => {
      const terminal = screen.getByTestId('gitops-log-terminal')
      expect(terminal).toBeInTheDocument()
    })
  })

  it('triggers automated anomaly rollback spike', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Trigger Anomaly Spike \(Auto-Rollback\)/i })).toBeInTheDocument()
    })

    const anomalyBtn = screen.getByRole('button', { name: /Trigger Anomaly Spike \(Auto-Rollback\)/i })
    fireEvent.click(anomalyBtn)

    await waitFor(() => {
      expect(screen.getByTestId('rollback-status-banner')).toBeInTheDocument()
    })
  })
})
