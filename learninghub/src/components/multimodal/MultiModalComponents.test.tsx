import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CanvasWhiteboard } from './CanvasWhiteboard'
import { VisionTelemetryHUD } from './VisionTelemetryHUD'
import { VoiceConversationBar } from './VoiceConversationBar'
import { VisionTelemetryFrame, VoiceTurnResponse } from '../../types/multimodal'

describe('MultiModal Components (Milestone 14)', () => {
  describe('CanvasWhiteboard', () => {
    it('renders toolbar buttons, color selectors, and triggers LaTeX parsing', async () => {
      const onStrokesChange = vi.fn()
      const onParseMath = vi.fn().mockResolvedValue(undefined)

      render(
        <CanvasWhiteboard
          strokes={[
            {
              id: 's-1',
              color: '#38bdf8',
              width: 3,
              tool: 'pen',
              points: [
                { x: 10, y: 10, timestampMs: 1 },
                { x: 20, y: 20, timestampMs: 2 },
              ],
            },
          ]}
          onStrokesChange={onStrokesChange}
          onParseMath={onParseMath}
          isParsing={false}
          parsedEquation={null}
        />
      )

      expect(screen.getByRole('button', { name: /Pen tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Highlighter tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Eraser tool/i })).toBeInTheDocument()

      const parseBtn = screen.getByRole('button', { name: /Parse Math/i })
      fireEvent.click(parseBtn)

      await waitFor(() => {
        expect(onParseMath).toHaveBeenCalled()
      })
    })

    it('renders recognized equation banner when parsedEquation is provided', () => {
      render(
        <CanvasWhiteboard
          strokes={[]}
          onStrokesChange={vi.fn()}
          onParseMath={vi.fn()}
          isParsing={false}
          parsedEquation={{
            sessionId: 'sess-1',
            recognizedLatex: '\\int e^{-x^2} dx',
            displayKaTeX: '$\\int e^{-x^2} dx$',
            confidence: 0.95,
            astTree: { type: 'RELATION', value: '=' },
            complexityCategory: 'ADVANCED',
            socraticSuggestions: ['Consider polar symmetry'],
          }}
        />
      )

      expect(screen.getByText(/LaTeX Recognized/i)).toBeInTheDocument()
      expect(screen.getByText('\\int e^{-x^2} dx')).toBeInTheDocument()
    })
  })

  describe('VisionTelemetryHUD', () => {
    it('renders vision metrics, gaze direction, and triggers simulation', () => {
      const mockTelemetry: VisionTelemetryFrame = {
        sessionId: 'sess-v-1',
        timestamp: new Date().toISOString(),
        gazeDirection: 'FOCUSED_CENTER',
        faceState: 'SINGLE_FACE_FOCUSED',
        attentivenessScore: 94,
        isAttentionFlagged: false,
        confidenceScore: 0.95,
        auditEventId: 'audit-001',
      }

      const onSimulate = vi.fn()

      render(
        <VisionTelemetryHUD
          telemetry={mockTelemetry}
          isCameraActive={true}
          onToggleCamera={vi.fn()}
          onSimulateAnomaly={onSimulate}
        />
      )

      expect(screen.getByText('Vision AI Telemetry & Gaze HUD')).toBeInTheDocument()
      expect(screen.getByText('94%')).toBeInTheDocument()
      expect(screen.getByText('FOCUSED_CENTER')).toBeInTheDocument()
      expect(screen.getByText(/1 Verified/i)).toBeInTheDocument()

      const lookAwayBtn = screen.getByRole('button', { name: /Look Away/i })
      fireEvent.click(lookAwayBtn)
      expect(onSimulate).toHaveBeenCalledWith('LOOKING_AWAY')
    })
  })

  describe('VoiceConversationBar', () => {
    it('renders push to talk, latency badge, and submits spoken response', async () => {
      const mockVoiceTurn: VoiceTurnResponse = {
        sessionId: 'sess-voice-1',
        turnId: 'turn-001',
        latencyMs: 180,
        studentSentiment: 'CONFIDENT',
        speakingRateWpm: 135,
        synthesizedResponseText: 'What is the base case invariant?',
        audioCue: 'PROMPT_CONTINUE',
        followUpQuestions: ['Does N=0 terminate?'],
      }

      const onSend = vi.fn().mockResolvedValue(undefined)

      render(
        <VoiceConversationBar
          lastVoiceTurn={mockVoiceTurn}
          isListening={false}
          onToggleListening={vi.fn()}
          onSendSpokenPrompt={onSend}
          isProcessing={false}
        />
      )

      expect(screen.getByText('Bi-Directional Voice Studio')).toBeInTheDocument()
      expect(screen.getByText(/180ms Latency/i)).toBeInTheDocument()
      expect(screen.getByText(/What is the base case invariant?/i)).toBeInTheDocument()

      const input = screen.getByPlaceholderText(/Simulate spoken response/i)
      fireEvent.change(input, { target: { value: 'Base case returns 0.' } })

      const sendBtn = screen.getByRole('button', { name: /Send Speech/i })
      fireEvent.click(sendBtn)

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Base case returns 0.')
      })
    })
  })
})
