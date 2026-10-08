import React, { useRef, useState, useEffect } from 'react'
import { CanvasStroke, DrawingTool, ParsedMathEquation } from '../../types/multimodal'
import {
  PenTool,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  Calculator,
  Highlighter,
  Check,
} from 'lucide-react'

interface CanvasWhiteboardProps {
  strokes: CanvasStroke[]
  onStrokesChange: (strokes: CanvasStroke[]) => void
  onParseMath: () => Promise<void>
  isParsing: boolean
  parsedEquation: ParsedMathEquation | null
}

const COLORS = [
  { label: 'Sky', hex: '#38bdf8' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Purple', hex: '#a855f7' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'White', hex: '#f8fafc' },
]

const WIDTHS = [2, 4, 8]

export const CanvasWhiteboard: React.FC<CanvasWhiteboardProps> = ({
  strokes,
  onStrokesChange,
  onParseMath,
  isParsing,
  parsedEquation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen')
  const [currentColor, setCurrentColor] = useState<string>('#38bdf8')
  const [currentWidth, setCurrentWidth] = useState<number>(3)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentStroke, setCurrentStroke] = useState<CanvasStroke | null>(null)
  const [history, setHistory] = useState<CanvasStroke[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Render canvas strokes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    const gridSize = 24
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

    // Render strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

    allStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }

      ctx.strokeStyle = stroke.tool === 'eraser' ? '#020617' : stroke.color
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 3 : stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.35 : 1.0
      ctx.stroke()
      ctx.globalAlpha = 1.0
    })
  }, [strokes, currentStroke])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    const newStroke: CanvasStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tool: currentTool,
      color: currentColor,
      width: currentWidth,
      points: [{ x, y, timestampMs: Date.now() }],
    }
    setCurrentStroke(newStroke)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentStroke(prev =>
      prev
        ? {
            ...prev,
            points: [...prev.points, { x, y, timestampMs: Date.now() }],
          }
        : null
    )
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentStroke) return
    setIsDrawing(false)
    const updated = [...strokes, currentStroke]
    onStrokesChange(updated)
    setCurrentStroke(null)

    // Update history
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(updated)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      onStrokesChange(prev)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      onStrokesChange(next)
    }
  }

  const handleClear = () => {
    onStrokesChange([])
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push([])
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Pen tool"
            onClick={() => setCurrentTool('pen')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              currentTool === 'pen'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" /> Pen
          </button>
          <button
            type="button"
            aria-label="Highlighter tool"
            onClick={() => setCurrentTool('highlighter')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              currentTool === 'highlighter'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Highlighter className="w-4 h-4" /> Highlight
          </button>
          <button
            type="button"
            aria-label="Eraser tool"
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              currentTool === 'eraser'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Eraser className="w-4 h-4" /> Eraser
          </button>
        </div>

        {/* Colors & Widths */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                aria-label={`Color ${c.label}`}
                onClick={() => {
                  setCurrentColor(c.hex)
                  if (currentTool === 'eraser') setCurrentTool('pen')
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  currentColor === c.hex ? 'scale-125 border-white' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-1">
            {WIDTHS.map(w => (
              <button
                key={w}
                type="button"
                aria-label={`Stroke width ${w}px`}
                onClick={() => setCurrentWidth(w)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  currentWidth === w
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Undo stroke"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Redo stroke"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Clear canvas"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={onParseMath}
            disabled={isParsing || strokes.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Recognizing...
              </>
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" /> Parse Math (LaTeX)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="relative w-full h-[400px] bg-slate-950 cursor-crosshair overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block"
        />

        {strokes.length === 0 && !isDrawing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-600 space-y-2">
            <PenTool className="w-8 h-8 opacity-40" />
            <p className="text-xs">Draw mathematical equations, tree graphs, or state machines here</p>
          </div>
        )}
      </div>

      {/* Recognized Equation Banner */}
      {parsedEquation && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" /> LaTeX Recognized ({Math.round(parsedEquation.confidence * 100)}%)
              </span>
              <span className="text-xs font-mono text-slate-400">{parsedEquation.complexityCategory}</span>
            </div>
            <div className="font-mono text-cyan-300 text-sm font-semibold select-all">
              {parsedEquation.recognizedLatex}
            </div>
          </div>

          <div className="text-xs text-slate-400 max-w-sm italic">
            "{parsedEquation.socraticSuggestions[0]}"
          </div>
        </div>
      )}
    </div>
  )
}
