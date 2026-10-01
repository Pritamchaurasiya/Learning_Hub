import { X, BookOpen, Bookmark, Clock, CheckCircle2 } from 'lucide-react'
import type { EbookChapter, EbookBookmark } from '../../types/ebook'

interface Props {
  isOpen: boolean
  onClose: () => void
  chapters: EbookChapter[]
  activeChapterId: string
  onSelectChapter: (chapterId: string) => void
  bookmarks: EbookBookmark[]
  onSelectBookmark: (chapterId: string) => void
}

export function EbookTOCDrawer({
  isOpen,
  onClose,
  chapters,
  activeChapterId,
  onSelectChapter,
  bookmarks,
  onSelectBookmark,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl h-full flex flex-col z-10 border-r border-gray-200 dark:border-slate-800">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-base">Table of Contents</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Chapter List */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 block">
              Chapters ({chapters.length})
            </span>
            {chapters.map(ch => {
              const isActive = ch.id === activeChapterId
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    onSelectChapter(ch.id)
                    onClose()
                  }}
                  className={`w-full text-left p-3 rounded-2xl flex items-start justify-between gap-3 transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300 font-medium'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs line-clamp-2">{ch.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{ch.estimatedReadTimeMins || 15} mins</span>
                    </div>
                  </div>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}
                </button>
              )
            })}
          </div>

          {/* Bookmarks Section */}
          {bookmarks.length > 0 && (
            <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 px-2 block flex items-center gap-1">
                <Bookmark className="w-3 h-3" />
                Bookmarked Sections ({bookmarks.length})
              </span>
              {bookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => {
                    onSelectBookmark(bm.chapterId)
                    onClose()
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/10 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{bm.chapterTitle}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(bm.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
