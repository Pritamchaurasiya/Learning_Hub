import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FileText, Download, Trash2, Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/Button'

export interface LiveNote {
  id: string
  text: string
  timestamp: string
  elapsedLabel: string
}

interface Props {
  sessionId: string
  sessionTitle: string
}

const STORAGE_KEY_PREFIX = 'lh_live_notes_'

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function LiveSessionNotesPanel({ sessionId, sessionTitle }: Props) {
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`
  const sessionStartRef = useRef<number>(Date.now())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load persisted notes
  const [notes, setNotes] = useState<LiveNote[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [inputText, setInputText] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)

  // Persist notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes))
    } catch {}
  }, [notes, storageKey])

  const addNote = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    const now = Date.now()
    const elapsed = now - sessionStartRef.current

    const newNote: LiveNote = {
      id: `note_${now}`,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      elapsedLabel: formatElapsed(elapsed),
    }

    setNotes(prev => [newNote, ...prev])
    setInputText('')

    // Refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [inputText])

  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }, [])

  const clearAllNotes = useCallback(() => {
    setNotes([])
  }, [])

  const exportAsMarkdown = useCallback(() => {
    const header = `# Live Class Notes\n## ${sessionTitle}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`
    const body = notes
      .slice()
      .reverse()
      .map(n => `### [${n.elapsedLabel}] — ${n.timestamp}\n${n.text}\n`)
      .join('\n')

    const markdown = header + body
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `live-notes-${sessionId}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [notes, sessionId, sessionTitle])

  const noteCount = useMemo(() => notes.length, [notes])

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-testid="live-session-notes-panel"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200">
            Session Notes
          </span>
          {noteCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9px] font-black tabular-nums">
              {noteCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {noteCount > 0 && (
            <>
              <button
                onClick={exportAsMarkdown}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                title="Export notes as Markdown"
                aria-label="Export notes"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearAllNotes}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Clear all notes"
                aria-label="Clear all notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse notes' : 'Expand notes'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Note Input */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 space-y-2">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  addNote()
                }
              }}
              placeholder="Take a quick note... (Ctrl+Enter to save)"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              rows={2}
            />
            <Button
              size="sm"
              onClick={addNote}
              disabled={!inputText.trim()}
              className="w-full rounded-xl text-[10px] font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              Add Timestamped Note
            </Button>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No notes yet</p>
                <p className="text-[10px] mt-1">
                  Capture key insights as the session progresses
                </p>
              </div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  className="group p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/30 transition-colors space-y-1.5"
                  data-testid="live-note-item"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span className="font-mono font-bold text-indigo-300">
                        {note.elapsedLabel}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span>{note.timestamp}</span>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-rose-400 transition-all"
                      title="Delete note"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
