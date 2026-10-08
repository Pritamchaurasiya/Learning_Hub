import { describe, it, expect, beforeEach, vi } from 'vitest'
import { multiModalService } from './multimodalService'
import { api } from '../utils/api'

vi.mock('../utils/api')

describe('multimodalService (Milestone 14 Multi-Modal Studio)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses canvas strokes via API when available', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          sessionId: 'test-session-1',
          recognizedLatex: '\\int x dx = \\frac{x^2}{2}',
          displayKaTeX: '$\\int x dx = \\frac{x^2}{2}$',
          confidence: 0.94,
          astTree: { type: 'RELATION', value: '=' },
          complexityCategory: 'INTERMEDIATE',
          socraticSuggestions: ['Check the constant of integration.'],
        },
      },
    } as any)

    const result = await multiModalService.parseCanvasStrokes('test-session-1', [], 'CALCULUS')
    expect(result.recognizedLatex).toContain('\\int')
    expect(result.confidence).toBe(0.94)
    expect(result.complexityCategory).toBe('INTERMEDIATE')
  })

  it('gracefully falls back to offline math parsing on network error', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'))

    const result = await multiModalService.parseCanvasStrokes('test-session-2', [], 'LINEAR_ALGEBRA')
    expect(result.recognizedLatex).toBe('A \\mathbf{x} = \\lambda \\mathbf{x}')
    expect(result.displayKaTeX).toContain('$')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('submits vision telemetry and returns attentiveness score', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          sessionId: 'test-session-3',
          timestamp: new Date().toISOString(),
          gazeDirection: 'FOCUSED_CENTER',
          faceState: 'SINGLE_FACE_FOCUSED',
          attentivenessScore: 98,
          isAttentionFlagged: false,
          confidenceScore: 0.96,
          auditEventId: 'audit-001',
        },
      },
    } as any)

    const result = await multiModalService.submitVisionTelemetry('test-session-3', {
      gazeX: 0.05,
      gazeY: 0.02,
      faceCount: 1,
    })

    expect(result.attentivenessScore).toBe(98)
    expect(result.faceState).toBe('SINGLE_FACE_FOCUSED')
    expect(result.isAttentionFlagged).toBe(false)
  })

  it('submits voice conversational turn and returns sub-300ms latency guidance', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          sessionId: 'test-session-4',
          turnId: 'turn-001',
          latencyMs: 195,
          studentSentiment: 'CONFIDENT',
          speakingRateWpm: 130,
          synthesizedResponseText: 'Excellent insight on time complexity.',
          audioCue: 'PROMPT_CONTINUE',
          followUpQuestions: ['What about auxiliary space?'],
        },
      },
    } as any)

    const result = await multiModalService.submitVoiceTurn(
      'test-session-4',
      'The time complexity is O(N log N).'
    )

    expect(result.turnId).toBe('turn-001')
    expect(result.latencyMs).toBeLessThanOrEqual(300)
    expect(result.synthesizedResponseText).toContain('Excellent')
  })

  it('provides curated canvas preset templates', () => {
    const presets = multiModalService.getPresetTemplates()
    expect(presets.length).toBeGreaterThanOrEqual(3)
    expect(presets.some(p => p.domain === 'CALCULUS')).toBe(true)
    expect(presets.some(p => p.domain === 'LINEAR_ALGEBRA')).toBe(true)
  })
})
