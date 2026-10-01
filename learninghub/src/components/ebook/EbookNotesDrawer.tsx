import { useState } from 'react'
import { X, Download, Trash2, Edit3, Check, FileText } from 'lucide-react'
import type { EbookHighlight, HighlightColor } from '../../types/ebook'

interface Props {
  isOpen: boolean
  onClose: () => void
  ebookTitle?: string
  highlights: EbookHighlight[]
  onRemoveHighlight: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
  onExportGuide: () => void
}

const COLOR_MAP: Record<HighlightColor, { bg: string; text: string; border: string }> = {
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700/60',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700/60',
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-800 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700/60',
  },
  coral: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700/60',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700/60',
  },
}

export function EbookNotesDrawer({
  isOpen,
  onClose,
  ebookTitle = 'Ebook',
  highlights,
  onRemoveHighlight,
  onUpdateNote,
  onExportGuide,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl h-full flex flex-col z-10 border-l border-gray-200 dark:border-slate-800">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-black text-base">Highlights & Notes ({highlights.length})</h3>
              <p className="text-[10px] text-gray-400 truncate max-w-xs">{ebookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {highlights.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-gray-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-400">No highlights or notes yet.</p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Highlight text in the chapter to add color tags, attach sticky notes, and build an
                exportable study guide.
              </p>
            </div>
          ) : (
            highlights.map(hl => {
              const colors = COLOR_MAP[hl.color] || COLOR_MAP.yellow
              const isEditing = editingId === hl.id

              return (
                <div
                  key={hl.id}
                  className={`p-4 rounded-2xl border ${colors.border} ${colors.bg} space-y-3 transition-all`}
                >
                  <p className={`text-xs font-serif leading-relaxed italic ${colors.text}`}>
                    "{hl.text}"
                  </p>

                  {/* Note Section */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add personal study note..."
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateNote(hl.id, noteText)
                            setEditingId(null)
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" /> Save Note
                        </button>
                      </div>
                    </div>
                  ) : hl.note ? (
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/50 dark:border-slate-800/50 text-xs font-medium text-gray-800 dark:text-gray-200">
                      <span className="font-bold text-[10px] uppercase text-indigo-500 block mb-0.5">
                        Note:
                      </span>
                      {hl.note}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                    <span>{new Date(hl.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(hl.id)
                          setNoteText(hl.note || '')
                        }}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{hl.note ? 'Edit Note' : 'Add Note'}</span>
                      </button>
                      <button
                        onClick={() => onRemoveHighlight(hl.id)}
                        className="hover:text-rose-500 flex items-center gap-1 text-gray-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {highlights.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={onExportGuide}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Custom Study Guide (.md)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
