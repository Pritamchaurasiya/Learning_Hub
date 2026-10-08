import { multiModalStudioService } from '../../services/MultiModalStudioService'

describe('MultiModalStudioService (Milestone 14 Multi-Modal Voice & Vision AI Studio)', () => {
  describe('Vision Telemetry Ingestion & Gaze Attention Analysis', () => {
    it('evaluates focused candidate with optimal gaze alignment and high attentiveness', () => {
      const result = multiModalStudioService.processVisionTelemetry({
        sessionId: 'sess-vision-001',
        userId: 'user-alex',
        timestamp: new Date().toISOString(),
        gazeX: 0.05,
        gazeY: -0.02,
        faceCount: 1,
        headPitchDeg: 2,
        headYawDeg: 3,
        headRollDeg: 1,
        lightingQuality: 'OPTIMAL',
      })

      expect(result.sessionId).toBe('sess-vision-001')
      expect(result.gazeDirection).toBe('FOCUSED_CENTER')
      expect(result.faceState).toBe('SINGLE_FACE_FOCUSED')
      expect(result.attentivenessScore).toBeGreaterThanOrEqual(90)
      expect(result.isAttentionFlagged).toBe(false)
      expect(result.warningAlert).toBeUndefined()
      expect(result.auditEventId).toBeDefined()
    })

    it('detects and flags candidate looking away horizontally', () => {
      const result = multiModalStudioService.processVisionTelemetry({
        sessionId: 'sess-vision-002',
        userId: 'user-alex',
        timestamp: new Date().toISOString(),
        gazeX: 0.75,
        gazeY: 0.1,
        faceCount: 1,
        headPitchDeg: 0,
        headYawDeg: 35,
        headRollDeg: 0,
        lightingQuality: 'OPTIMAL',
      })

      expect(result.gazeDirection).toBe('LOOKING_RIGHT')
      expect(result.isAttentionFlagged).toBe(true)
      expect(result.attentivenessScore).toBeLessThan(70)
    })

    it('triggers security flag when multiple faces or zero faces are present in frame', () => {
      const zeroFace = multiModalStudioService.processVisionTelemetry({
        sessionId: 'sess-vision-003',
        userId: 'user-alex',
        timestamp: new Date().toISOString(),
        gazeX: 0,
        gazeY: 0,
        faceCount: 0,
        headPitchDeg: 0,
        headYawDeg: 0,
        headRollDeg: 0,
        lightingQuality: 'OPTIMAL',
      })
      expect(zeroFace.faceState).toBe('NO_FACE_DETECTED')
      expect(zeroFace.isAttentionFlagged).toBe(true)
      expect(zeroFace.attentivenessScore).toBe(0)

      const multiFace = multiModalStudioService.processVisionTelemetry({
        sessionId: 'sess-vision-004',
        userId: 'user-alex',
        timestamp: new Date().toISOString(),
        gazeX: 0,
        gazeY: 0,
        faceCount: 2,
        headPitchDeg: 0,
        headYawDeg: 0,
        headRollDeg: 0,
        lightingQuality: 'OPTIMAL',
      })
      expect(multiFace.faceState).toBe('MULTIPLE_FACES_FLAGGED')
      expect(multiFace.isAttentionFlagged).toBe(true)
      expect(multiFace.warningAlert).toContain('Multiple faces detected')
    })
  })

  describe('Canvas Vector Stroke Handwritten Math Parsing', () => {
    it('parses mathematical vector strokes into structured LaTeX and AST representation', () => {
      const result = multiModalStudioService.parseCanvasStrokes({
        sessionId: 'sess-canvas-001',
        strokes: [
          {
            id: 'stroke-1',
            color: '#38bdf8',
            width: 3,
            tool: 'pen',
            points: [
              { x: 10, y: 50, timestampMs: 100 },
              { x: 15, y: 70, timestampMs: 150 },
            ],
          },
          {
            id: 'stroke-2',
            color: '#38bdf8',
            width: 3,
            tool: 'pen',
            points: [
              { x: 30, y: 50, timestampMs: 200 },
              { x: 40, y: 55, timestampMs: 250 },
            ],
          },
        ],
        contextDomain: 'CALCULUS',
      })

      expect(result.recognizedLatex).toContain('\\int')
      expect(result.displayKaTeX).toContain('$')
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.astTree).toBeDefined()
      expect(result.astTree.type).toBe('RELATION')
      expect(result.socraticSuggestions.length).toBeGreaterThanOrEqual(1)
    })

    it('honors context domain and raw equation hints', () => {
      const result = multiModalStudioService.parseCanvasStrokes({
        sessionId: 'sess-canvas-002',
        strokes: [],
        rawEquationHint: 'E = mc^2',
      })

      expect(result.recognizedLatex).toBe('E = mc^2')
    })
  })

  describe('Real-Time Voice Turn Analysis & Audio Latency Benchmark', () => {
    it('processes student speech turn with sub-300ms latency and Socratic response', () => {
      const response = multiModalStudioService.processVoiceTurn({
        sessionId: 'sess-voice-001',
        userId: 'user-alex',
        transcriptText: 'I think we can use a min-heap to keep track of the k smallest elements.',
        audioDurationMs: 3200,
      })

      expect(response.turnId).toBeDefined()
      expect(response.latencyMs).toBeLessThanOrEqual(300)
      expect(response.latencyMs).toBeGreaterThan(100)
      expect(response.speakingRateWpm).toBeGreaterThan(0)
      expect(response.synthesizedResponseText).toBeDefined()
      expect(response.followUpQuestions.length).toBeGreaterThan(0)
    })

    it('adapts tone and audio cues when student expresses uncertainty or confusion', () => {
      const confused = multiModalStudioService.processVoiceTurn({
        sessionId: 'sess-voice-002',
        userId: 'user-alex',
        transcriptText: 'I am stuck and confused why the tree height is not log N here.',
        audioDurationMs: 4000,
      })

      expect(confused.studentSentiment).toBe('CONFUSED')
      expect(confused.audioCue).toBe('NUDGE_INVARIANT')
      expect(confused.synthesizedResponseText).toContain('break this down')
    })

    it('celebrates breakthroughs with excited audio cue and challenges edge cases', () => {
      const breakthrough = multiModalStudioService.processVoiceTurn({
        sessionId: 'sess-voice-003',
        userId: 'user-alex',
        transcriptText: 'Aha! I finally see how the memoization table prevents duplicate subproblems!',
        audioDurationMs: 3500,
      })

      expect(breakthrough.studentSentiment).toBe('EXCITED')
      expect(breakthrough.audioCue).toBe('AHA_MOMENT')
      expect(breakthrough.synthesizedResponseText).toContain('breakthrough')
    })
  })
})
