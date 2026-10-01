import { Sparkles, MessageSquare, Volume2 } from 'lucide-react'
import type { HighlightColor } from '../../types/ebook'

interface Props {
  position: { x: number; y: number } | null
  onHighlight: (color: HighlightColor) => void
  onExplainAI: () => void
  onAddNote: () => void
  onTTSSelection: () => void
  onClose: () => void
}

const COLORS: Array<{ id: HighlightColor; bg: string; title: string }> = [
  { id: 'yellow', bg: 'bg-amber-400', title: 'Core Insight' },
  { id: 'green', bg: 'bg-emerald-400', title: 'Definition & Formula' },
  { id: 'blue', bg: 'bg-sky-400', title: 'Implementation Detail' },
  { id: 'coral', bg: 'bg-rose-400', title: 'Exam Trap' },
  { id: 'purple', bg: 'bg-purple-400', title: 'Open Question' },
]

export function EbookSelectionMenu({
  position,
  onHighlight,
  onExplainAI,
  onAddNote,
  onTTSSelection,
}: Props) {
  if (!position) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
      className="z-50 bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl border border-slate-700 flex items-center gap-1.5 animate-in fade-in zoom-in-95 backdrop-blur-md"
    >
      {/* Color Swatches */}
      <div className="flex items-center gap-1 px-1 border-r border-slate-700">
        {COLORS.map(c => (
          <button
            key={c.id}
            title={c.title}
            onClick={() => onHighlight(c.id)}
            className={`w-5 h-5 rounded-full ${c.bg} hover:scale-125 transition-transform shadow-sm`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <button
        onClick={onExplainAI}
        className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 transition-colors"
        title="Explain selected paragraph with AI"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Explain AI</span>
      </button>

      <button
        onClick={onAddNote}
        className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        title="Attach note"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      <button
        onClick={onTTSSelection}
        className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        title="Read aloud"
      >
        <Volume2 className="w-4 h-4" />
      </button>
    </div>
  )
}
