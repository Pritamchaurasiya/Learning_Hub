import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  FileText,
  Sliders,
  Volume2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { useStore } from '../stores/useStore'
import { ebookService } from '../services/ebookService'
import { useEbookReader } from '../hooks/useEbookReader'
import { useEbookTTS } from '../hooks/useEbookTTS'
import { useEbookAnnotations } from '../hooks/useEbookAnnotations'
import { EbookViewer } from '../components/ebook/EbookViewer'
import { EbookSettingsModal } from '../components/ebook/EbookSettingsModal'
import { EbookTOCDrawer } from '../components/ebook/EbookTOCDrawer'
import { EbookNotesDrawer } from '../components/ebook/EbookNotesDrawer'
import { EbookSelectionMenu } from '../components/ebook/EbookSelectionMenu'
import { EbookAIStudyTools } from '../components/ebook/EbookAIStudyTools'
import { EbookFlashcardDeck } from '../components/ebook/EbookFlashcardDeck'
import { EbookTTSPlayerBar } from '../components/ebook/EbookTTSPlayerBar'

export default function EbookReaderPage() {
  const { id = 'ebook-dsa-handbook', chapterId } = useParams<{ id: string; chapterId?: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const [activeChapterId, setActiveChapterId] = useState<string>(chapterId || 'ch-dsa-1')
  const [selectedTextPopover, setSelectedTextPopover] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [isTTSActive, setIsTTSActive] = useState(false)

  const {
    settings,
    updateSetting,
    isTOCOpen,
    setIsTOCOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isNotesOpen,
    setIsNotesOpen,
    isAIToolsOpen,
    setIsAIToolsOpen,
    isFlashcardsOpen,
    setIsFlashcardsOpen,
  } = useEbookReader()

  const { data: ebook } = useQuery({
    queryKey: ['ebook-details', id],
    queryFn: () => ebookService.getEbookById(id),
  })

  const { data: chapters = [] } = useQuery({
    queryKey: ['ebook-chapters', id],
    queryFn: () => ebookService.getChapters(id),
  })

  useEffect(() => {
    if (chapterId) {
      setActiveChapterId(chapterId)
    } else if (chapters.length > 0 && !chapterId) {
      setActiveChapterId(chapters[0].id)
    }
  }, [chapterId, chapters])

  const currentChapter = chapters.find(c => c.id === activeChapterId) ||
    chapters[0] || {
      id: 'ch-dsa-1',
      ebookId: id,
      title: '1. Introduction to Algorithms',
      order: 1,
      contentMarkdown: '# Welcome to Interactive Ebook\n\nLoading content...',
      estimatedReadTimeMins: 15,
    }

  const {
    highlights,
    bookmarks,
    isBookmarked,
    addHighlight,
    removeHighlight,
    updateHighlightNote,
    toggleBookmark,
    exportStudyGuideMarkdown,
  } = useEbookAnnotations(id, currentChapter.id)

  const tts = useEbookTTS(currentChapter.contentMarkdown)

  const currentChapterIdx = chapters.findIndex(c => c.id === currentChapter.id)
  const prevChapter = currentChapterIdx > 0 ? chapters[currentChapterIdx - 1] : null
  const nextChapter =
    currentChapterIdx < chapters.length - 1 ? chapters[currentChapterIdx + 1] : null

  const handleSelectChapter = (newChapterId: string) => {
    setActiveChapterId(newChapterId)
    navigate(`/ebooks/${id}/${newChapterId}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExportGuide = () => {
    const md = exportStudyGuideMarkdown(ebook?.title || 'Ebook')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(ebook?.title || 'study-guide').toLowerCase().replace(/\s+/g, '-')}-notes.md`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ message: 'Study guide exported successfully!', type: 'success' })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col">
      <SEO title={`${currentChapter.title} | ${ebook?.title || 'Interactive Ebook'}`} />

      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/library')}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xs font-bold text-gray-400 truncate max-w-xs">
              {ebook?.title || 'Interactive Reader'}
            </h2>
            <h1 className="text-sm font-black text-gray-900 dark:text-white truncate max-w-md">
              {currentChapter.title}
            </h1>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsTOCOpen(true)}
            className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-bold transition-colors"
            title="Table of Contents"
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <button
            onClick={() => {
              toggleBookmark(currentChapter.title)
              addToast({
                message: isBookmarked ? 'Bookmark removed' : 'Chapter bookmarked!',
                type: 'info',
              })
            }}
            className={`p-2.5 rounded-xl text-xs font-bold transition-colors ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            title="Bookmark this chapter"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsNotesOpen(true)}
            className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold relative transition-colors"
            title="View Highlights & Notes"
          >
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">Notes</span>
            {highlights.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-2 right-2" />
            )}
          </button>

          <button
            onClick={() => setIsAIToolsOpen(true)}
            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1.5 text-xs font-black shadow-sm transition-colors"
            title="AI Study Tools & Summarizer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Suite</span>
          </button>

          <button
            onClick={() => setIsTTSActive(!isTTSActive)}
            className={`p-2.5 rounded-xl text-xs font-bold transition-colors ${
              isTTSActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            title="Audio Narration (TTS)"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Reader Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reading Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <EbookViewer
          contentMarkdown={currentChapter.contentMarkdown}
          settings={settings}
          highlights={highlights}
          onTextSelected={setSelectedTextPopover}
        />

        {/* Chapter Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-800 pb-20">
          {prevChapter ? (
            <button
              onClick={() => handleSelectChapter(prevChapter.id)}
              className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white font-bold text-xs flex items-center gap-2 hover:border-indigo-500 shadow-sm transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="text-left">
                <span className="text-[10px] text-gray-400 block font-normal">
                  Previous Chapter
                </span>
                <span className="truncate max-w-[160px] block">{prevChapter.title}</span>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextChapter && (
            <button
              onClick={() => handleSelectChapter(nextChapter.id)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <div className="text-right">
                <span className="text-[10px] text-indigo-200 block font-normal">Next Chapter</span>
                <span className="truncate max-w-[160px] block">{nextChapter.title}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Floating Selection Tooltip */}
      <EbookSelectionMenu
        position={
          selectedTextPopover ? { x: selectedTextPopover.x, y: selectedTextPopover.y } : null
        }
        onHighlight={color => {
          if (selectedTextPopover) {
            addHighlight(selectedTextPopover.text, color)
            addToast({ message: 'Highlight saved!', type: 'success' })
            setSelectedTextPopover(null)
          }
        }}
        onExplainAI={async () => {
          if (selectedTextPopover) {
            const exp = await ebookService.explainParagraphAI(
              selectedTextPopover.text,
              currentChapter.contentMarkdown
            )
            addToast({
              message: `💡 AI Insight: ${exp.explanation.slice(0, 100)}...`,
              type: 'info',
            })
            setSelectedTextPopover(null)
          }
        }}
        onAddNote={() => {
          if (selectedTextPopover) {
            addHighlight(selectedTextPopover.text, 'yellow', 'Personal Note')
            setIsNotesOpen(true)
            setSelectedTextPopover(null)
          }
        }}
        onTTSSelection={() => {
          if (selectedTextPopover) {
            const utterance = new SpeechSynthesisUtterance(selectedTextPopover.text)
            window.speechSynthesis.speak(utterance)
            setSelectedTextPopover(null)
          }
        }}
        onClose={() => setSelectedTextPopover(null)}
      />

      {/* Overlays & Drawers */}
      <EbookSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSetting={updateSetting}
      />

      <EbookTOCDrawer
        isOpen={isTOCOpen}
        onClose={() => setIsTOCOpen(false)}
        chapters={chapters}
        activeChapterId={currentChapter.id}
        onSelectChapter={handleSelectChapter}
        bookmarks={bookmarks}
        onSelectBookmark={handleSelectChapter}
      />

      <EbookNotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        ebookTitle={ebook?.title || 'Ebook'}
        highlights={highlights}
        onRemoveHighlight={removeHighlight}
        onUpdateNote={updateHighlightNote}
        onExportGuide={handleExportGuide}
      />

      <EbookAIStudyTools
        isOpen={isAIToolsOpen}
        onClose={() => setIsAIToolsOpen(false)}
        chapter={currentChapter}
        onOpenFlashcards={() => setIsFlashcardsOpen(true)}
      />

      <EbookFlashcardDeck
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        flashcards={[
          {
            id: 'card-1',
            chapterId: currentChapter.id,
            front: 'What is Asymptotic Notation?',
            back: 'A mathematical description of runtime growth rate as input tends to infinity.',
            explanation: 'It abstracts machine constants and OS variances.',
          },
          {
            id: 'card-2',
            chapterId: currentChapter.id,
            front: 'What is the Master Theorem formula?',
            back: 'T(n) = aT(n/b) + f(n)',
            explanation: 'Used for solving divide-and-conquer recurrence relations.',
          },
        ]}
      />

      {isTTSActive && (
        <EbookTTSPlayerBar
          isPlaying={tts.isPlaying}
          isPaused={tts.isPaused}
          currentSentence={tts.currentSentenceIndex}
          totalSentences={tts.totalSentences}
          rate={tts.rate}
          ambientNoise={tts.ambientNoise}
          onPlay={tts.play}
          onPause={tts.pause}
          onStop={() => {
            tts.stop()
            setIsTTSActive(false)
          }}
          onJump={tts.jump}
          onChangeRate={tts.setRate}
          onChangeAmbient={tts.setAmbientNoise}
        />
      )}
    </div>
  )
}
