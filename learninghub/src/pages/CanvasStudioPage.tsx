import React, { useRef, useState, useEffect } from 'react'
import {
  CanvasToolType,
  DrawingElement,
  GraphNode,
  GraphEdge,
  Point,
  LatexRecognitionResult,
} from '../types/canvasStudio'
import { ProctoringSession } from '../types/proctoring'
import { canvasStudioService } from '../services/canvasStudioService'
import { proctoringService } from '../services/proctoringService'
import { CanvasToolbar } from '../components/canvas/CanvasToolbar'
import { GraphInspectorPanel } from '../components/canvas/GraphInspectorPanel'
import { EquationRecognizerDrawer } from '../components/canvas/EquationRecognizerDrawer'
import { AIProctoringHUD } from '../components/proctoring/AIProctoringHUD'
import { ProctoringReportModal } from '../components/proctoring/ProctoringReportModal'
import {
  Network,
  Binary,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react'

export const CanvasStudioPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [activeTool, setActiveTool] = useState<CanvasToolType>('PEN')
  const [activeColor, setActiveColor] = useState<string>('#38bdf8')
  const [strokeWidth, setStrokeWidth] = useState<number>(4)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [history, setHistory] = useState<DrawingElement[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState<number>(0)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([
    { id: 'node-1', label: 'A', x: 200, y: 150, radius: 24, color: '#38bdf8' },
    { id: 'node-2', label: 'B', x: 400, y: 150, radius: 24, color: '#34d399' },
    { id: 'node-3', label: 'C', x: 300, y: 300, radius: 24, color: '#fbbf24' },
  ])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([
    { id: 'edge-1', fromNodeId: 'node-1', toNodeId: 'node-2', weight: 4, directed: true },
    { id: 'edge-2', fromNodeId: 'node-2', toNodeId: 'node-3', weight: 2, directed: true },
    { id: 'edge-3', fromNodeId: 'node-1', toNodeId: 'node-3', weight: 7, directed: false },
  ])

  // Formula state
  const [ocrResult, setOcrResult] = useState<LatexRecognitionResult | null>(null)
  const [showGraphPanel, setShowGraphPanel] = useState<boolean>(false)
  const [showFormulaDrawer, setShowFormulaDrawer] = useState<boolean>(false)

  // Proctoring state
  const [isProctoringEnabled, setIsProctoringEnabled] = useState<boolean>(true)
  const [proctorSession, setProctorSession] = useState<ProctoringSession | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false)

  // Initialize Proctoring session
  useEffect(() => {
    proctoringService
      .startSession({
        testAttemptId: 'canvas-dsa-scratchpad-01',
        examTitle: 'Algorithmic Systems & Mathematical Proofs',
      })
      .then(sess => setProctorSession(sess))
      .catch(() => {})
  }, [])

  // Redraw canvas whenever elements change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#090d16'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Render Grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Render Graph Edges
    graphEdges.forEach(edge => {
      const fromNode = graphNodes.find(n => n.id === edge.fromNodeId)
      const toNode = graphNodes.find(n => n.id === edge.toNodeId)
      if (!fromNode || !toNode) return

      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)
      ctx.stroke()

      // Render weight
      if (edge.weight) {
        const midX = (fromNode.x + toNode.x) / 2
        const midY = (fromNode.y + toNode.y) / 2
        ctx.fillStyle = '#94a3b8'
        ctx.font = '12px monospace'
        ctx.fillText(`w=${edge.weight}`, midX + 6, midY - 6)
      }
    })

    // Render Graph Nodes
    graphNodes.forEach(node => {
      ctx.fillStyle = node.color || '#38bdf8'
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#090d16'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
    })

    // Render Drawn Elements
    elements.forEach(el => {
      if (el.points.length < 2) return
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = el.tool === 'HIGHLIGHTER' ? 0.35 : 1.0

      if (el.tool === 'RECTANGLE') {
        const [p1, p2] = el.points
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        )
      } else if (el.tool === 'CIRCLE') {
        const [p1, p2] = el.points
        const r = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        ctx.beginPath()
        ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        el.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0
    })
  }, [elements, graphNodes, graphEdges])

  // Mouse / Touch Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    if (activeTool === 'GRAPH_NODE') {
      const nextLabel = String.fromCharCode(65 + graphNodes.length)
      setGraphNodes(prev => [
        ...prev,
        {
          id: `node-${Date.now()}`,
          label: nextLabel,
          x: point.x,
          y: point.y,
          radius: 24,
          color: activeColor,
        },
      ])
      return
    }

    setIsDrawing(true)
    setCurrentPoints([point])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    setCurrentPoints(prev => [...prev, point])

    // Real-time canvas render of active stroke
    const ctx = canvas.getContext('2d')
    if (ctx && currentPoints.length > 0) {
      ctx.strokeStyle = activeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      const prev = currentPoints[currentPoints.length - 1]
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentPoints.length > 1) {
      const newElement: DrawingElement = {
        id: `el-${Date.now()}`,
        tool: activeTool,
        points: currentPoints,
        color: activeTool === 'ERASER' ? '#090d16' : activeColor,
        strokeWidth: activeTool === 'ERASER' ? strokeWidth * 3 : strokeWidth,
      }

      const updated = [...elements, newElement]
      setElements(updated)

      // Record History
      const nextHistory = history.slice(0, historyIndex + 1)
      nextHistory.push(updated)
      setHistory(nextHistory)
      setHistoryIndex(nextHistory.length - 1)

      // If Formula tool active, perform OCR
      if (activeTool === 'FORMULA_RECOGNIZER') {
        const result = canvasStudioService.recognizeEquation(updated)
        setOcrResult(result)
        setShowFormulaDrawer(true)
      }
    }

    setCurrentPoints([])
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1
      setHistoryIndex(nextIdx)
      setElements(history[nextIdx])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1
      setHistoryIndex(nextIdx)
      setElements(history[nextIdx])
    }
  }

  const handleClear = () => {
    setElements([])
    const nextHistory = [...history, []]
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const handleExportSvg = () => {
    const svg = canvasStudioService.exportToSVG(elements)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-blackboard-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddGraphNode = (label: string) => {
    setGraphNodes(prev => [
      ...prev,
      {
        id: `node-${Date.now()}`,
        label,
        x: 150 + Math.random() * 300,
        y: 150 + Math.random() * 200,
        radius: 24,
        color: activeColor,
      },
    ])
  }

  const handleAddGraphEdge = (fromId: string, toId: string, directed: boolean) => {
    setGraphEdges(prev => [
      ...prev,
      {
        id: `edge-${Date.now()}`,
        fromNodeId: fromId,
        toNodeId: toId,
        weight: Math.floor(Math.random() * 9) + 1,
        directed,
      },
    ])
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 14
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Multi-Modal Vision & Interactive Canvas Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Interactive Blackboard & AI Proctoring Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Vector canvas scratchpad with mathematical LaTeX OCR recognition, DSA graph algorithm
            deconstruction, and real-time AI vision & audio exam proctoring telemetry.
          </p>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGraphPanel(!showGraphPanel)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              showGraphPanel
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Graph DSA Panel</span>
          </button>
          <button
            onClick={() => {
              const res = canvasStudioService.recognizeEquation(elements)
              setOcrResult(res)
              setShowFormulaDrawer(true)
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-sky-400 border border-slate-800 flex items-center gap-1.5 transition-all"
          >
            <Binary className="w-4 h-4" />
            <span>Recognize LaTeX</span>
          </button>
          <button
            onClick={() => setIsProctoringEnabled(!isProctoringEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isProctoringEnabled
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isProctoringEnabled ? 'Proctoring HUD On' : 'Proctoring HUD Off'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Canvas Toolbar */}
          <CanvasToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            activeColor={activeColor}
            onChangeColor={setActiveColor}
            strokeWidth={strokeWidth}
            onChangeStrokeWidth={setStrokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onExportSvg={handleExportSvg}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />

          {/* Canvas Drawing Area */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
            <canvas
              ref={canvasRef}
              width={1000}
              height={550}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-[550px] cursor-crosshair block"
            />

            {/* Quick Helper Badge */}
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-800 text-[11px] font-mono text-slate-400 pointer-events-none flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{elements.length} vector strokes | {graphNodes.length} vertices</span>
            </div>
          </div>
        </div>

        {/* Right Side Panels: Proctoring HUD & Graph/Formula Panels */}
        <div className="space-y-4">
          {/* AI Proctoring Live HUD */}
          {isProctoringEnabled && proctorSession && (
            <AIProctoringHUD
              session={proctorSession}
              onSessionUpdate={setProctorSession}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {/* Equation Recognizer Drawer */}
          {showFormulaDrawer && (
            <EquationRecognizerDrawer
              result={ocrResult}
              onInsertLatex={_latex => {
                // Add text element onto canvas
                setShowFormulaDrawer(false)
              }}
            />
          )}

          {/* Graph Inspector Panel */}
          {showGraphPanel && (
            <GraphInspectorPanel
              nodes={graphNodes}
              edges={graphEdges}
              onAddNode={handleAddGraphNode}
              onAddEdge={handleAddGraphEdge}
            />
          )}
        </div>
      </div>

      {/* Proctoring Verification Report Modal */}
      {proctorSession && (
        <ProctoringReportModal
          sessionId={proctorSession.sessionId}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  )
}

export default CanvasStudioPage
