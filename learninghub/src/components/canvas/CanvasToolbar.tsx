import React from 'react'
import { CanvasToolType } from '../../types/canvasStudio'
import {
  PenTool,
  Eraser,
  Highlighter,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Network,
  Binary,
  Undo2,
  Redo2,
  Trash2,
  Download,
} from 'lucide-react'

interface CanvasToolbarProps {
  activeTool: CanvasToolType
  onSelectTool: (tool: CanvasToolType) => void
  activeColor: string
  onChangeColor: (color: string) => void
  strokeWidth: number
  onChangeStrokeWidth: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExportSvg: () => void
  canUndo: boolean
  canRedo: boolean
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool,
  onSelectTool,
  activeColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  onUndo,
  onRedo,
  onClear,
  onExportSvg,
  canUndo,
  canRedo,
}) => {
  const tools: { tool: CanvasToolType; label: string; icon: React.ReactNode }[] = [
    { tool: 'PEN', label: 'Pen', icon: <PenTool className="w-4 h-4" /> },
    { tool: 'HIGHLIGHTER', label: 'Highlighter', icon: <Highlighter className="w-4 h-4" /> },
    { tool: 'ERASER', label: 'Eraser', icon: <Eraser className="w-4 h-4" /> },
    { tool: 'LINE', label: 'Line', icon: <Minus className="w-4 h-4" /> },
    { tool: 'ARROW', label: 'Vector Arrow', icon: <ArrowUpRight className="w-4 h-4" /> },
    { tool: 'RECTANGLE', label: 'Rectangle', icon: <Square className="w-4 h-4" /> },
    { tool: 'CIRCLE', label: 'Circle', icon: <Circle className="w-4 h-4" /> },
    { tool: 'GRAPH_NODE', label: 'Graph Vertex', icon: <Network className="w-4 h-4" /> },
    { tool: 'FORMULA_RECOGNIZER', label: 'LaTeX OCR', icon: <Binary className="w-4 h-4" /> },
  ]

  const palette = [
    '#38bdf8', // sky
    '#34d399', // emerald
    '#fbbf24', // amber
    '#f87171', // red
    '#a78bfa', // purple
    '#ffffff', // white
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
      {/* Tool Selection Group */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {tools.map(t => (
          <button
            key={t.tool}
            onClick={() => onSelectTool(t.tool)}
            title={t.label}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === t.tool
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {t.icon}
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Colors and Stroke Settings */}
      <div className="flex items-center gap-3">
        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {palette.map(color => (
            <button
              key={color}
              onClick={() => onChangeColor(color)}
              aria-label={`Select color ${color}`}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                activeColor === color
                  ? 'border-white scale-110 shadow-sm'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Stroke Weight */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          {[2, 4, 8].map(w => (
            <button
              key={w}
              onClick={() => onChangeStrokeWidth(w)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                strokeWidth === w
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>

        {/* History & Actions */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            title="Clear Canvas"
            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onExportSvg}
            title="Export Vector SVG"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export SVG</span>
          </button>
        </div>
      </div>
    </div>
  )
}
