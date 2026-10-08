export type CanvasToolType =
  | 'PEN'
  | 'HIGHLIGHTER'
  | 'ERASER'
  | 'LINE'
  | 'ARROW'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'GRAPH_NODE'
  | 'GRAPH_EDGE'
  | 'FORMULA_RECOGNIZER'

export interface Point {
  x: number
  y: number
}

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  radius: number
  color?: string
}

export interface GraphEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  weight?: number
  directed: boolean
}

export interface DrawingElement {
  id: string
  tool: CanvasToolType
  points: Point[]
  color: string
  strokeWidth: number
  opacity?: number
  label?: string
  recognizedLatex?: string
}

export interface CanvasHistoryState {
  elements: DrawingElement[]
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
}

export interface LatexRecognitionResult {
  rawStrokeCount: number
  latexString: string
  confidence: number
  formulaName?: string
  suggestedSteps?: string[]
}
