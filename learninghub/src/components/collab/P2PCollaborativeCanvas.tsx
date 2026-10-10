import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  Grid,
  Trash2,
  Maximize2,
  MousePointer2,
} from 'lucide-react'
import {
  CrdtStroke,
  CollabPeer,
  CanvasToolType,
  ShapeKind,
  CanvasPoint,
} from '../../types/crdtCollab'

interface P2PCollaborativeCanvasProps {
  strokes: CrdtStroke[]
  peers: CollabPeer[]
  currentPeerId: string
  onAddStroke: (stroke: CrdtStroke) => void
  onDeleteStroke: (strokeId: string) => void
  onClearCanvas: () => void
  onCursorMove: (x: number, y: number, tool: CanvasToolType) => void
}

const COLOR_PALETTE = [
  '#FFFFFF',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#EC4899',
  '#06B6D4',
]

export const P2PCollaborativeCanvas: React.FC<P2PCollaborativeCanvasProps> = ({
  strokes,
  peers,
  currentPeerId,
  onAddStroke,
  onDeleteStroke,
  onClearCanvas,
  onCursorMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [activeTool, setActiveTool] = useState<CanvasToolType>('pen')
  const [activeShape, setActiveShape] = useState<ShapeKind>('rectangle')
  const [selectedColor, setSelectedColor] = useState<string>('#3B82F6')
  const [strokeWidth, setStrokeWidth] = useState<number>(3)
  const [showGrid, setShowGrid] = useState<boolean>(true)

  const isDrawingRef = useRef<boolean>(false)
  const currentPointsRef = useRef<CanvasPoint[]>([])

  // Canvas redraw whenever strokes, size, or grid change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear background
    ctx.fillStyle = '#0B1120'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = 1
      const gridSize = 32
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
      }
      ctx.stroke()
    }

    // Render non-deleted CRDT strokes
    const visibleStrokes = strokes.filter((s) => !s.isDeleted)
    for (const stroke of visibleStrokes) {
      if (stroke.points.length === 0) continue

      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.fillStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.35
      } else {
        ctx.globalAlpha = 1.0
      }

      if (stroke.tool === 'shape') {
        const p1 = stroke.points[0]
        const p2 = stroke.points[stroke.points.length - 1] || p1
        const minX = Math.min(p1.x, p2.x)
        const minY = Math.min(p1.y, p2.y)
        const w = Math.abs(p2.x - p1.x)
        const h = Math.abs(p2.y - p1.y)

        if (stroke.shapeType === 'circle') {
          const r = Math.max(w, h) / 2
          ctx.beginPath()
          ctx.arc(minX + r, minY + r, r, 0, Math.PI * 2)
          ctx.stroke()
        } else if (stroke.shapeType === 'line' || stroke.shapeType === 'arrow') {
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.rect(minX, minY, w, h)
          ctx.stroke()
        }
      } else {
        if (stroke.points.length === 1) {
          ctx.beginPath()
          ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
          }
          ctx.stroke()
        }
      }
      ctx.restore()
    }
  }, [strokes, showGrid])

  // Resize observer to keep canvas resolution crisp
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      renderCanvas()
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderCanvas])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): CanvasPoint => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoordinates(e)

    if (activeTool === 'eraser') {
      // Find stroke near point and delete
      const hitRadius = 15
      const hitStroke = strokes.find((s) =>
        s.points.some(
          (p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= hitRadius && !s.isDeleted
        )
      )
      if (hitStroke) {
        onDeleteStroke(hitStroke.id)
      }
      return
    }

    isDrawingRef.current = true
    currentPointsRef.current = [pt]
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoordinates(e)
    onCursorMove(pt.x, pt.y, activeTool)

    if (!isDrawingRef.current) return

    currentPointsRef.current.push(pt)

    // Intermediate render for low-latency live preview
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const pts = currentPointsRef.current
      if (pts.length > 1) {
        ctx.save()
        ctx.strokeStyle = selectedColor
        ctx.lineWidth = strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        if (activeTool === 'highlighter') ctx.globalAlpha = 0.35

        ctx.beginPath()
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
        ctx.restore()
      }
    } else if (activeTool === 'shape') {
      renderCanvas()
      const pts = currentPointsRef.current
      const p1 = pts[0]
      const p2 = pts[pts.length - 1]

      ctx.save()
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = strokeWidth
      ctx.setLineDash([4, 4])
      const minX = Math.min(p1.x, p2.x)
      const minY = Math.min(p1.y, p2.y)
      const w = Math.abs(p2.x - p1.x)
      const h = Math.abs(p2.y - p1.y)

      if (activeShape === 'circle') {
        const r = Math.max(w, h) / 2
        ctx.beginPath()
        ctx.arc(minX + r, minY + r, r, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.rect(minX, minY, w, h)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const pts = [...currentPointsRef.current]
    if (pts.length === 0) return

    const newStroke: CrdtStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      peerId: currentPeerId,
      color: selectedColor,
      width: strokeWidth,
      tool: activeTool,
      shapeType: activeTool === 'shape' ? activeShape : undefined,
      points: pts,
      createdAt: Date.now(),
      lamportClock: 1, // Will be incremented by parent with state vector
    }

    onAddStroke(newStroke)
    currentPointsRef.current = []
  }

  // Active remote peers with cursors
  const remotePeers = peers.filter(
    (p) => p.peerId !== currentPeerId && p.cursor && p.cursor.x > 0
  )

  return (
    <div className="relative flex flex-col w-full h-[620px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Top Floating Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl">
        {/* Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
          <button
            onClick={() => setActiveTool('pen')}
            title="Pen (P)"
            className={`p-2 rounded-xl text-xs transition ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('highlighter')}
            title="Highlighter (H)"
            className={`p-2 rounded-xl text-xs transition ${
              activeTool === 'highlighter'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('shape')}
            title="Shapes"
            className={`p-2 rounded-xl text-xs transition ${
              activeTool === 'shape'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {activeShape === 'circle' ? <Circle className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            title="Eraser (E)"
            className={`p-2 rounded-xl text-xs transition ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Shape Sub-selector */}
        {activeTool === 'shape' && (
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            <button
              onClick={() => setActiveShape('rectangle')}
              className={`p-1.5 rounded-lg text-xs ${activeShape === 'rectangle' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
              title="Rectangle"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveShape('circle')}
              className={`p-1.5 rounded-lg text-xs ${activeShape === 'circle' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
              title="Circle"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveShape('line')}
              className={`p-1.5 rounded-lg text-xs ${activeShape === 'line' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}
              title="Line"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Color Palette */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              className={`w-5 h-5 rounded-full transition-transform ${
                selectedColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Stroke Width Slider */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <input
            type="range"
            min="2"
            max="16"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-[10px] font-mono text-slate-400 w-4">{strokeWidth}px</span>
        </div>

        {/* Grid & Clear Canvas */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            className={`p-2 rounded-xl text-xs transition ${
              showGrid ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={onClearCanvas}
            title="Clear Canvas"
            className="p-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Drawing Element */}
      <div ref={containerRef} className="relative w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full block"
        />

        {/* Peer Remote Cursor Beacons */}
        {remotePeers.map((peer) => {
          if (!peer.cursor) return null
          return (
            <div
              key={peer.peerId}
              className="absolute pointer-events-none transition-all duration-75 flex items-start gap-1 z-30"
              style={{
                left: `${peer.cursor.x}px`,
                top: `${peer.cursor.y}px`,
                transform: 'translate(-2px, -2px)',
              }}
            >
              <MousePointer2
                className="w-4 h-4 drop-shadow-md"
                style={{ color: peer.color, fill: peer.color }}
              />
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap"
                style={{ backgroundColor: peer.color }}
              >
                {peer.displayName}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom Status bar */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[11px] text-slate-500 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 font-mono">
            CRDT Strokes: {strokes.filter((s) => !s.isDeleted).length}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 font-mono">
            Active Tool: {activeTool.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Low-Latency HTML5 60FPS Surface</span>
        </div>
      </div>
    </div>
  )
}
