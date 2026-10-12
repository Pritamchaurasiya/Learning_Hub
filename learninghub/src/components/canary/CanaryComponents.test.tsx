import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanaryTrafficGauge } from './CanaryTrafficGauge'
import { SloHealthMatrix } from './SloHealthMatrix'
import { CanaryPipelineStepper } from './CanaryPipelineStepper'
import { FALLBACK_CANARY_DEPLOYMENTS } from '../../services/canaryDeploymentService'
import { CanaryRelease } from '../../types/canary'

describe('Canary Subcomponents (Milestone 26 GitOps Progressive Delivery)', () => {
  const sampleDeployment: CanaryRelease = FALLBACK_CANARY_DEPLOYMENTS[0]

  describe('CanaryTrafficGauge', () => {
    it('renders baseline vs canary traffic weights and throughput', () => {
      render(<CanaryTrafficGauge deployment={sampleDeployment} />)

      expect(screen.getByText(/Live Traffic Weight Shifter/i)).toBeInTheDocument()
      expect(screen.getByText(/Active Split: 90% \/ 10%/i)).toBeInTheDocument()

      const baselineBar = screen.getByTestId('traffic-baseline-bar')
      const canaryBar = screen.getByTestId('traffic-canary-bar')

      expect(baselineBar).toHaveStyle({ width: '90%' })
      expect(canaryBar).toHaveStyle({ width: '10%' })
      expect(screen.getByText('1420 req/s')).toBeInTheDocument()
      expect(screen.getByText('158 req/s')).toBeInTheDocument()
    })

    it('displays rolled back badge when deployment is rolled back', () => {
      const rolledBackDeployment: CanaryRelease = {
        ...sampleDeployment,
        stage: 'ROLLED_BACK',
        status: 'ROLLED_BACK',
        trafficWeightCanary: 0,
        trafficWeightBaseline: 100,
      }

      render(<CanaryTrafficGauge deployment={rolledBackDeployment} />)
      expect(screen.getByText(/Diverted to Baseline \(Rolled Back\)/i)).toBeInTheDocument()
    })
  })

  describe('SloHealthMatrix', () => {
    it('renders SLI indicators, latency cards, and verdict badge', () => {
      render(<SloHealthMatrix deployment={sampleDeployment} />)

      expect(screen.getByText(/Service Level Indicator \(SLI\) Health Matrix/i)).toBeInTheDocument()
      expect(screen.getByTestId('slo-verdict-badge')).toHaveTextContent('Verdict: HEALTHY')
      expect(screen.getByText('P99 Latency')).toBeInTheDocument()
      expect(screen.getByText('5xx Error Rate')).toBeInTheDocument()
      expect(screen.getByText('0.01%')).toBeInTheDocument()
      expect(screen.getByText(/76ms/)).toBeInTheDocument()
    })

    it('renders breached invariants banner when critical errors are flagged', () => {
      const breachedDeployment: CanaryRelease = {
        ...sampleDeployment,
        lastEvaluation: {
          isAnomaly: true,
          zScore: 3.42,
          latencyDegradationRatio: 1.85,
          errorRateDelta: 0.95,
          errorBudgetConsumedPercent: 100,
          breachedSloInvariants: [
            'Canary Error Rate (0.95%) breached SLO threshold (0.1%)',
            'Latency Degradation Ratio (1.85x) exceeded max ratio threshold (1.25x)',
          ],
          verdict: 'CRITICAL_BREACH',
          recommendation: 'TRIGGER_ROLLBACK',
        },
      }

      render(<SloHealthMatrix deployment={breachedDeployment} />)
      expect(screen.getByTestId('slo-verdict-badge')).toHaveTextContent('Verdict: CRITICAL_BREACH')
      expect(screen.getByTestId('breached-invariants-banner')).toBeInTheDocument()
      expect(screen.getByText(/Canary Error Rate \(0.95%\) breached SLO threshold/i)).toBeInTheDocument()
    })
  })

  describe('CanaryPipelineStepper', () => {
    it('renders pipeline stages, provenance digest, and triggers actions', () => {
      const onAdvance = vi.fn()
      const onRollback = vi.fn()

      render(
        <CanaryPipelineStepper
          deployment={sampleDeployment}
          onAdvanceStage={onAdvance}
          onRollback={onRollback}
        />
      )

      expect(screen.getByText(/Progressive Delivery Staircase Pipeline/i)).toBeInTheDocument()
      expect(screen.getByText('Pre-flight Check')).toBeInTheDocument()
      expect(screen.getByText('Canary Tier 1')).toBeInTheDocument()
      expect(screen.getByText('Canary Tier 2')).toBeInTheDocument()
      expect(screen.getByText('Production')).toBeInTheDocument()

      const advanceBtn = screen.getByRole('button', { name: /Advance Stage/i })
      fireEvent.click(advanceBtn)
      expect(onAdvance).toHaveBeenCalledTimes(1)

      const rollbackBtn = screen.getByRole('button', { name: /Emergency Rollback/i })
      fireEvent.click(rollbackBtn)
      expect(onRollback).toHaveBeenCalledTimes(1)
    })

    it('shows rollback status banner when stage is ROLLED_BACK', () => {
      const rolledBackDeployment: CanaryRelease = {
        ...sampleDeployment,
        stage: 'ROLLED_BACK',
      }

      render(<CanaryPipelineStepper deployment={rolledBackDeployment} />)
      expect(screen.getByTestId('rollback-status-banner')).toBeInTheDocument()
      expect(screen.getByText(/Deployment aborted/i)).toBeInTheDocument()
    })
  })
})
