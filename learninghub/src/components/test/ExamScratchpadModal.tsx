import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  PenTool,
  Eraser,
  RotateCcw,
  Trash2,
  Highlighter,
  Maximize2,
  Minimize2,
  FileText,
} from 'lucide-react'

export interface ExamScratchpadModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}

export const ExamScratchpadModal = memo(function ExamScratchpadModal({
  isOpen,
  onClose,
}: ExamScratchpadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen')
  const [penColor, setPenColor] = useState('#3b82f6')
  const [strokeWidth, setStrokeWidth] = useState(2.5)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const redrawCanvas = useCallback(
    (allStrokes: Stroke[], inProgress?: Stroke | null) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const renderStroke = (s: Stroke) => {
        if (s.points.length < 2) return
        ctx.beginPath()
        ctx.moveTo(s.points[0].x, s.points[0].y)
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y)
        }

        if (s.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.lineWidth = s.width * 3
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
          ctx.globalCompositeOperation = 'source-over'
        } else if (s.tool === 'highlighter') {
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = s.color
          ctx.lineWidth = s.width * 4
          ctx.lineCap = 'square'
          ctx.lineJoin = 'round'
          ctx.stroke()
          ctx.globalAlpha = 1.0
        } else {
          ctx.strokeStyle = s.color
          ctx.lineWidth = s.width
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
        }
      }

      allStrokes.forEach(renderStroke)
      if (inProgress) renderStroke(inProgress)
    },
    []
  )

  // Adjust canvas size on open / resize
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    redrawCanvas(strokes)
  }, [isOpen, isExpanded, redrawCanvas, strokes])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    const newStroke: Stroke = {
      tool: currentTool,
      color: penColor,
      width: strokeWidth,
      points: [{ x, y }],
    }
    setCurrentStroke(newStroke)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    const updated: Stroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y }],
    }
    setCurrentStroke(updated)
    redrawCanvas(strokes, updated)
  }

  const stopDrawing = () => {
    if (isDrawing && currentStroke && currentStroke.points.length > 1) {
      const next = [...strokes, currentStroke]
      setStrokes(next)
      redrawCanvas(next)
    }
    setCurrentStroke(null)
    setIsDrawing(false)
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    const next = strokes.slice(0, -1)
    setStrokes(next)
    redrawCanvas(next)
  }

  const handleClear = () => {
    setStrokes([])
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className={`w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ${
            isExpanded ? 'max-w-5xl h-[85vh]' : 'max-w-2xl h-[520px]'
          }`}
          role="dialog"
          aria-labelledby="scratchpad-dialog-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600/30 text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span id="scratchpad-dialog-title" className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Digital Rough Sheet / Scratchpad
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Scribble formulas, rough steps & equations without leaving the exam station.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close scratchpad"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Working Surface */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full block touch-none"
            />
            {strokes.length === 0 && !isDrawing && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600 font-mono text-xs select-none">
                Draw or scribble calculations here using mouse or touch...
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Tools & Colors */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${
                  currentTool === 'pen'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pen</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool('highlighter')}
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${
                  currentTool === 'highlighter'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Highlight</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${
                  currentTool === 'eraser'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                {[
                  { color: '#ffffff', label: 'White' },
                  { color: '#38bdf8', label: 'Sky Blue' },
                  { color: '#34d399', label: 'Emerald' },
                  { color: '#fbbf24', label: 'Amber' },
                  { color: '#f87171', label: 'Rose' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setPenColor(color)
                      if (currentTool === 'eraser') setCurrentTool('pen')
                    }}
                    title={label}
                    className={`w-5 h-5 rounded-full border-2 transition ${
                      penColor === color && currentTool !== 'eraser'
                        ? 'border-white scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Stroke Width Selector */}
              <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                {[
                  { width: 1.5, label: 'Fine' },
                  { width: 3.0, label: 'Medium' },
                  { width: 5.5, label: 'Bold' },
                ].map(({ width, label }) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() => setStrokeWidth(width)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                      strokeWidth === width
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Undo / Clear / Done */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                title="Undo last stroke"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={strokes.length === 0}
                className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                title="Clear all strokes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})
