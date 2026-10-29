import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Download,
  Tag,
  Clock,
  BookOpen,
  Video,
  Copy,
  Check,
  ExternalLink,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStore } from '../stores/useStore'

export interface UserNote {
  id: string
  title: string
  content: string
  sourceType: 'lecture' | 'ebook' | 'live' | 'general'
  sourceTitle: string
  courseId?: string
  lessonId?: string
  timestampSeconds?: number
  tags: string[]
  updatedAt: string
}

const LOCAL_STORAGE_KEY = 'learninghub_user_notes_v1'

const DEFAULT_NOTES: UserNote[] = [
  {
    id: 'n-1',
    title: 'Raft Consensus: Leader Election & Log Replication Invariants',
    content: `Key properties to verify during Raft failovers:
1. Election Safety: At most one leader can be elected in a given term.
2. Leader Append-Only: A leader never overwrites or truncates its log; it only appends new entries.
3. Log Matching Property: If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.
4. Leader Completeness: If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.`,
    sourceType: 'lecture',
    sourceTitle: 'Distributed Systems & Fault-Tolerant Architectures',
    courseId: 'distributed-systems',
    lessonId: 'raft-consensus',
    timestampSeconds: 842,
    tags: ['Distributed Systems', 'Consensus', 'Architecture'],
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'n-2',
    title: 'Monotonic Stack Paradigm: Next Greater Element in O(N)',
    content: `Template for Next Greater Element:
- Maintain stack of indices.
- While stack is non-empty and nums[stack.peek()] < nums[i]:
    pop index and assign result[index] = nums[i].
- Push i onto stack.
Time Complexity: O(N) as each index is pushed and popped at most once.`,
    sourceType: 'lecture',
    sourceTitle: 'Supreme Data Structures & Algorithms Masterclass',
    courseId: 'dsa-masterclass',
    lessonId: 'monotonic-stack',
    timestampSeconds: 315,
    tags: ['DSA', 'Stack', 'Algorithms'],
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'n-3',
    title: 'PostgreSQL MVCC & VACUUM Mechanics',
    content: `Notes from Chapter 4 of Ebook:
- Each tuple header contains xmin (creating transaction) and xmax (deleting/updating transaction).
- Dead tuples are not immediately removed upon DELETE or UPDATE; they remain on disk until autovacuum runs.
- Prevent Transaction ID Wraparound (freeze_max_age = 200,000,000).`,
    sourceType: 'ebook',
    sourceTitle: 'Database Internals & High-Throughput Engines',
    tags: ['Databases', 'PostgreSQL', 'Internals'],
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

export default function NotesStudioPage() {
  const addToast = useStore(s => s.addToast)
  const navigate = useNavigate()
  const [notes, setNotes] = useState<UserNote[]>([])
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [copied, setCopied] = useState(false)

  // Edit / Create modal state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setNotes(parsed)
        if (parsed.length > 0) setSelectedNote(parsed[0])
      } else {
        setNotes(DEFAULT_NOTES)
        setSelectedNote(DEFAULT_NOTES[0])
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_NOTES))
      }
    } catch {
      setNotes(DEFAULT_NOTES)
      setSelectedNote(DEFAULT_NOTES[0])
    }
  }, [])

  const saveNotes = (updated: UserNote[]) => {
    setNotes(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const allTags = ['All', ...Array.from(new Set(notes.flatMap(n => n.tags)))]

  const filteredNotes = notes.filter(n => {
    const matchesQuery =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = selectedTag === 'All' || n.tags.includes(selectedTag)
    return matchesQuery && matchesTag
  })

  const handleOpenNewNote = () => {
    setEditTitle('')
    setEditContent('')
    setEditTags('General, Notes')
    setIsEditing(true)
  }

  const handleSaveNote = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      addToast({ message: 'Title and content cannot be empty.', type: 'warning' })
      return
    }

    const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const newNote: UserNote = {
      id: `note-${Date.now()}`,
      title: editTitle.trim(),
      content: editContent.trim(),
      sourceType: 'general',
      sourceTitle: 'Student Notes Studio',
      tags: tagsArray.length > 0 ? tagsArray : ['General'],
      updatedAt: new Date().toISOString(),
    }

    const updated = [newNote, ...notes]
    saveNotes(updated)
    setSelectedNote(newNote)
    setIsEditing(false)
    addToast({ message: 'Note created successfully!', type: 'success' })
  }

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    saveNotes(updated)
    if (selectedNote?.id === id) {
      setSelectedNote(updated[0] || null)
    }
    addToast({ message: 'Note deleted.', type: 'info' })
  }

  const handleCopyMarkdown = () => {
    if (!selectedNote) return
    const text = `# ${selectedNote.title}\nSource: ${selectedNote.sourceTitle}\n\n${selectedNote.content}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast({ message: 'Copied markdown to clipboard!', type: 'success' })
  }

  const handleExportMarkdown = () => {
    if (!selectedNote) return
    const text = `# ${selectedNote.title}\nSource: ${selectedNote.sourceTitle}\nTags: ${selectedNote.tags.join(', ')}\n\n${selectedNote.content}`
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedNote.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ message: 'Markdown file downloaded!', type: 'info' })
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-primary-950 to-slate-950 p-8 sm:p-10 border border-amber-900/40 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Centralized Student Notes & Scratchpad Studio
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Knowledge Notes & Synthesis Hub
          </h1>
          <p className="text-base sm:text-lg text-amber-100/90 leading-relaxed">
            All your timestamped video notes, ebook highlights, and algorithm insights aggregated
            into a searchable personal knowledge base.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={handleOpenNewNote}
              className="rounded-xl px-5 py-2.5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Quick Note
            </Button>
            <Button
              onClick={() => {
                const allMd = notes
                  .map(n => `# ${n.title}\nSource: ${n.sourceTitle}\n\n${n.content}\n---\n`)
                  .join('\n')
                const blob = new Blob([allMd], { type: 'text/markdown;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `learninghub-all-notes-${new Date().toISOString().split('T')[0]}.md`
                a.click()
                URL.revokeObjectURL(url)
                addToast({ message: 'Exported all notes into a single Markdown archive!', type: 'success' })
              }}
              variant="outline"
              className="rounded-xl px-5 py-2.5 font-bold text-white border-amber-400/40 hover:bg-amber-800/40"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All Notes (.md)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout: 2-column Split Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Notes Catalog & Search (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search notes, algorithms, lectures..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 text-xs">
                No notes found matching your search.
              </div>
            ) : (
              filteredNotes.map(n => {
                const isSelected = selectedNote?.id === n.id
                return (
                  <Card
                    key={n.id}
                    onClick={() => setSelectedNote(n)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          {n.sourceType === 'lecture' && <Video className="w-3 h-3" />}
                          {n.sourceType === 'ebook' && <BookOpen className="w-3 h-3" />}
                          {n.sourceType}
                        </span>
                        {n.timestampSeconds !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {formatTimestamp(n.timestampSeconds)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                        {n.title}
                      </h4>

                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                        <span className="truncate max-w-[180px]">{n.sourceTitle}</span>
                        <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Note Detail / Markdown Viewer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedNote ? (
            <Card className="p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-6 shadow-sm min-h-[500px]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {selectedNote.sourceType}
                    </span>
                    {selectedNote.timestampSeconds !== undefined && (
                      <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(selectedNote.timestampSeconds)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    {selectedNote.title}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Source: <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedNote.sourceTitle}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyMarkdown}
                    className="rounded-xl text-xs font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportMarkdown}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download .md
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 hover:border-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedNote.tags.map(t => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 text-amber-500" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Content Body */}
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans bg-gray-50/50 dark:bg-gray-950/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                {selectedNote.content}
              </div>

              {/* Navigation jump back to course if linked */}
              {selectedNote.courseId && (
                <div className="pt-2 flex items-center justify-between bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/40">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Linked to video lesson: <strong className="text-gray-900 dark:text-white">{selectedNote.lessonId || 'Lecture'}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/lesson-player/${selectedNote.courseId}/${selectedNote.lessonId || ''}`)}
                    className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Jump to Lecture
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-400">
              Select a note on the left or click "Create Quick Note" to start.
            </div>
          )}
        </div>
      </div>

      {/* Create Note Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Scratchpad Studio
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                Create New Knowledge Note
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Note Title
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Byzantine Fault Tolerance Proof Notes"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Tags (comma separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Distributed Systems, Algorithms, Security"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Markdown Content
                </label>
                <textarea
                  placeholder="Write your notes, formulas, code snippets, or thoughts..."
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
