export type DrawingTool = 'pen' | 'highlighter' | 'eraser'

export interface CanvasPoint {
  x: number
  y: number
  pressure?: number
  timestampMs: number
}

export interface CanvasStroke {
  id: string
  points: CanvasPoint[]
  color: string
  width: number
  tool: DrawingTool
}

export interface MathASTNode {
  type: 'OPERATOR' | 'OPERAND' | 'FUNCTION' | 'VARIABLE' | 'RELATION'
  value: string
  children?: MathASTNode[]
}

export interface ParsedMathEquation {
  sessionId: string
  recognizedLatex: string
  displayKaTeX: string
  confidence: number
  astTree: MathASTNode
  complexityCategory: 'ELEMENTARY' | 'INTERMEDIATE' | 'ADVANCED'
  socraticSuggestions: string[]
}

export type GazeDirection = 'FOCUSED_CENTER' | 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'LOOKING_DOWN' | 'LOOKING_AWAY'
export type FacePresenceState = 'SINGLE_FACE_FOCUSED' | 'MULTIPLE_FACES_FLAGGED' | 'NO_FACE_DETECTED' | 'PARTIALLY_OCCLUDED'

export interface VisionTelemetryFrame {
  sessionId: string
  timestamp: string
  gazeDirection: GazeDirection
  faceState: FacePresenceState
  attentivenessScore: number // 0 - 100
  isAttentionFlagged: boolean
  warningAlert?: string
  confidenceScore: number
  auditEventId: string
}

export interface VoiceTurnResponse {
  sessionId: string
  turnId: string
  latencyMs: number // Target < 300ms
  studentSentiment: 'CONFIDENT' | 'UNCERTAIN' | 'CONFUSED' | 'EXCITED'
  speakingRateWpm: number
  synthesizedResponseText: string
  audioCue: 'PROMPT_CONTINUE' | 'AHA_MOMENT' | 'NUDGE_INVARIANT' | 'CHALLENGE_EDGE_CASE'
  followUpQuestions: string[]
}

export interface CanvasPresetTemplate {
  id: string
  title: string
  domain: 'CALCULUS' | 'LINEAR_ALGEBRA' | 'DATA_STRUCTURES' | 'GENERAL_MATH'
  description: string
  initialLatex: string
  initialStrokes: CanvasStroke[]
}
