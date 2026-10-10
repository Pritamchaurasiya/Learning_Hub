import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlowStateGauge } from './FlowStateGauge'
import { BiofeedbackAlertBanner } from './BiofeedbackAlertBanner'
import { CognitiveLoadHeatmapCard } from './CognitiveLoadHeatmapCard'

describe('Neuro-Adaptive UI Components', () => {
  describe('FlowStateGauge', () => {
    it('renders flow state gauge with peak flow badge', () => {
      render(
        <FlowStateGauge
          flowScore={88}
          fatigueScore={18}
          cognitiveLoad={52}
          state="OPTIMAL_FLOW"
        />
      )

      expect(screen.getByText('Neuro-Adaptive Flow Index')).toBeInTheDocument()
      expect(screen.getByText('Peak Flow State')).toBeInTheDocument()
      expect(screen.getByText('88')).toBeInTheDocument()
      expect(screen.getByText('52 / 100')).toBeInTheDocument()
      expect(screen.getByText('18 / 100')).toBeInTheDocument()
    })

    it('renders fatigue overload badge when exhausted', () => {
      render(
        <FlowStateGauge
          flowScore={22}
          fatigueScore={85}
          cognitiveLoad={75}
          state="FATIGUE_OVERLOAD"
        />
      )

      expect(screen.getByText('Fatigue Overload')).toBeInTheDocument()
      expect(screen.getByText('22')).toBeInTheDocument()
    })
  })

  describe('BiofeedbackAlertBanner', () => {
    it('returns null when action is maintain pace and no intervention exists', () => {
      const { container } = render(
        <BiofeedbackAlertBanner action="MAINTAIN_CURRENT_PACE" />
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('renders intervention banner and triggers callbacks', () => {
      const onApply = vi.fn()
      const onDismiss = vi.fn()

      render(
        <BiofeedbackAlertBanner
          action="SUGGEST_MICRO_BREAK"
          intervention={{
            type: 'EYE_RESET_20_20_20',
            message: 'Take a 20-20-20 visual rest.',
            durationSec: 120,
          }}
          onApplyIntervention={onApply}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByText('Biofeedback Study Optimizer')).toBeInTheDocument()
      expect(screen.getByText('120s Intervention')).toBeInTheDocument()
      expect(screen.getByText('Take a 20-20-20 visual rest.')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Start Intervention'))
      expect(onApply).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByText('Dismiss'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('CognitiveLoadHeatmapCard', () => {
    it('renders telemetry matrix values correctly', () => {
      render(
        <CognitiveLoadHeatmapCard
          activeDurationMinutes={45}
          keystroke={{
            flightTimeMeanMs: 165,
            flightTimeVarianceMs2: 3200,
            backspaceCountPerMinute: 12,
            pauseCountAboveTwoSec: 4,
          }}
          ocular={{
            blinkRatePerMinute: 16,
            averageFixationDurationMs: 380,
            saccadeVelocityScore: 0.88,
          }}
        />
      )

      expect(screen.getByText('Biometric & Keystroke Telemetry')).toBeInTheDocument()
      expect(screen.getByText('45m')).toBeInTheDocument()
      expect(screen.getByText('12/m')).toBeInTheDocument()
      expect(screen.getByText('165ms')).toBeInTheDocument()
      expect(screen.getByText('16/m')).toBeInTheDocument()
    })
  })
})
