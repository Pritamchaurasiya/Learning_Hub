import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  CheckCircle2,
  Circle,
  Menu,
  X,
  FileText,
  Code2,
  MessageSquare,
  Bookmark,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react'
import { courseService, getFallbackCourse, type CourseDetails, type CourseLesson } from '../services/courseService'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SEO } from '../components/SEO'

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const navigate = useNavigate()
  const addToast = useStore(s => s.addToast)

  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null)
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'code' | 'qa'>('overview')
  const [notes, setNotes] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [sandboxCode, setSandboxCode] = useState(
    '// Write your scratch code here\nconsole.warn("Hello from Lesson Player!");\n'
  )
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Load Course & Lesson Data
  useEffect(() => {
    if (!courseId) return
    let isMounted = true

    const fallbackCourse: CourseDetails = getFallbackCourse(courseId)

    courseService
      .getCourse(courseId)
      .then(res => {
        if (!isMounted) return
        const raw = res?.data ?? (res as unknown as CourseDetails)
        if (raw && (raw.id || raw.title)) {
          const normalized: CourseDetails = {
            id: raw.id ?? courseId,
            title: raw.title ?? fallbackCourse.title,
            description: raw.description || fallbackCourse.description,
            short_description: raw.short_description || fallbackCourse.short_description,
            thumbnail: raw.thumbnail ?? null,
            trailer_video: raw.trailer_video ?? null,
            instructor: raw.instructor ?? fallbackCourse.instructor,
            price: typeof raw.price === 'number' ? raw.price : 0,
            original_price: raw.original_price ?? null,
            rating: raw.rating ?? 4.9,
            review_count: raw.review_count ?? 1280,
            student_count: (raw as any).student_count ?? (raw as any).studentsCount ?? 14200,
            duration: raw.duration || fallbackCourse.duration,
            level: (raw.level ?? 'intermediate') as any,
            language: raw.language ?? 'English',
            last_updated: raw.last_updated ?? '2026',
            certificate: raw.certificate ?? true,
            sections:
              Array.isArray(raw.sections) && raw.sections.length > 0
                ? raw.sections
                : fallbackCourse.sections,
            learning_outcomes:
              Array.isArray(raw.learning_outcomes) && raw.learning_outcomes.length > 0
                ? raw.learning_outcomes
                : fallbackCourse.learning_outcomes,
            prerequisites:
              Array.isArray(raw.prerequisites) && raw.prerequisites.length > 0
                ? raw.prerequisites
                : fallbackCourse.prerequisites,
            tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : fallbackCourse.tags,
            is_enrolled: Boolean(raw.is_enrolled),
            progress_percent: raw.progress_percent ?? 0,
          }
          setCourse(normalized)
          const allLessons = (normalized.sections ?? []).flatMap(s => s.lessons ?? [])
          const target = lessonId
            ? (allLessons.find(l => l.id === lessonId) ?? allLessons[0])
            : allLessons[0]
          setCurrentLesson(target ?? null)

          // Load completed set
          const completed = new Set(allLessons.filter(l => l.completed).map(l => l.id))
          setCompletedLessonIds(completed)
        } else {
          setCourse(fallbackCourse)
          setCurrentLesson(fallbackCourse.sections[0]!.lessons[0]!)
          setCompletedLessonIds(new Set(['les-1']))
        }
      })
      .catch(() => {
        if (!isMounted) return
      })

    return () => {
      isMounted = false
    }
  }, [courseId, lessonId])

  // Load Saved Notes
  useEffect(() => {
    if (courseId && currentLesson?.id) {
      const savedNotes = localStorage.getItem(`notes_${courseId}_${currentLesson.id}`)
      setNotes(savedNotes ?? '')
    }
  }, [courseId, currentLesson?.id])

  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (courseId && currentLesson?.id) {
      localStorage.setItem(`notes_${courseId}_${currentLesson.id}`, val)
    }
  }

  const allLessons = (course?.sections ?? []).flatMap(s => s.lessons ?? [])
  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const toggleComplete = (lId: string) => {
    setCompletedLessonIds(prev => {
      const next = new Set(prev)
      if (next.has(lId)) {
        next.delete(lId)
        addToast({ message: 'Marked lesson as uncompleted', type: 'info' })
      } else {
        next.add(lId)
        addToast({ message: 'Lesson completed! +25 XP', type: 'success' })
      }

      // Sync progress percent
      if (allLessons.length > 0 && courseId) {
        const pct = Math.round((next.size / allLessons.length) * 100)
        courseService.updateProgress(courseId, pct).catch(() => {})
      }
      return next
    })
  }

  const runSandboxCode = () => {
    try {
      const logs: string[] = []
      const customConsole = {
        log: (...args: unknown[]) =>
          logs.push(
            args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
          ),
        error: (...args: unknown[]) => logs.push(`ERROR: ${args.join(' ')}`),
      }
      // eslint-disable-next-line no-new-func
      const runner = new Function('console', sandboxCode)
      runner(customConsole)
      setSandboxOutput(logs.join('\n') || 'Program executed successfully (no output).')
    } catch (err) {
      setSandboxOutput(`Execution Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const progressPercent =
    allLessons.length > 0 ? Math.round((completedLessonIds.size / allLessons.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col overflow-hidden select-none">
      <SEO title={`${currentLesson?.title ?? 'Lesson'} | ${course?.title ?? 'Player'}`} />

      {/* Top Bar */}
      <header className="h-14 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
            aria-label="Back to course overview"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-xs sm:text-sm font-bold text-gray-100 truncate">
              {course?.title ?? 'Course'}
            </h1>
            <p className="text-[10px] text-gray-400 truncate">
              {currentLesson?.title ?? 'Lesson Player'}
            </p>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-gray-300">{progressPercent}%</span>
          </div>

          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle Curriculum"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left: Video / Content Stage & Tab Views */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
          {/* Video Player Theater */}
          <div className="w-full bg-black flex items-center justify-center relative aspect-video max-h-[560px] group border-b border-gray-800">
            {currentLesson?.video_url ? (
              <video
                ref={videoRef}
                src={currentLesson.video_url}
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-xl shadow-primary-500/10">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-100">{currentLesson?.title}</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-md">
                    {currentLesson?.description ?? 'Interactive video lesson stream.'}
                  </p>
                </div>
              </div>
            )}

            {/* Floating Quick Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-800/80">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-white"
                  aria-label="Play/Pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsMuted(m => !m)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-white"
                  aria-label="Mute/Unmute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-xs font-mono text-gray-400">{currentLesson?.duration}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={playbackSpeed}
                  onChange={e => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded-md border border-gray-700 outline-none"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {})
                    } else {
                      document.exitFullscreen().catch(() => {})
                    }
                  }}
                  className="p-1.5 hover:bg-gray-800 rounded-lg text-white"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div className="p-4 bg-gray-900/40 border-b border-gray-800/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevLesson}
                onClick={() => {
                  if (prevLesson) {
                    setCurrentLesson(prevLesson)
                    navigate(`/lesson-player/${courseId}/${prevLesson.id}`)
                  }
                }}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextLesson}
                onClick={() => {
                  if (nextLesson) {
                    setCurrentLesson(nextLesson)
                    navigate(`/lesson-player/${courseId}/${nextLesson.id}`)
                  }
                }}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => currentLesson && toggleComplete(currentLesson.id)}
              className={
                currentLesson && completedLessonIds.has(currentLesson.id)
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-primary-600 hover:bg-primary-500 text-white'
              }
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {currentLesson && completedLessonIds.has(currentLesson.id)
                ? 'Completed'
                : 'Mark as Complete'}
            </Button>
          </div>

          {/* Lesson Interactive Tabs */}
          <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'code'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code Sandbox
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'notes'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Notes
              </button>
              <button
                onClick={() => setActiveTab('qa')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'qa'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Q&A
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-100">{currentLesson?.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {currentLesson?.description ??
                    'This lecture provides hands-on instructions and architectural deep-dives into industry best practices.'}
                </p>
                <Card className="p-5 rounded-2xl bg-gray-900/60 border-gray-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Key Takeaways
                  </h4>
                  <ul className="list-disc list-inside text-xs text-gray-400 space-y-1.5">
                    <li>
                      Understand core structural principles and production reliability patterns.
                    </li>
                    <li>Hands-on code implementations with zero runtime latency bottlenecks.</li>
                    <li>Complete the interactive exercise in the Code Sandbox tab.</li>
                  </ul>
                </Card>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400">JavaScript Scratchpad</span>
                  <Button
                    size="sm"
                    onClick={runSandboxCode}
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Run Code
                  </Button>
                </div>
                <textarea
                  value={sandboxCode}
                  onChange={e => setSandboxCode(e.target.value)}
                  className="w-full h-48 bg-gray-900 border border-gray-800 rounded-2xl p-4 font-mono text-xs text-gray-200 focus:ring-2 focus:ring-primary-500/50 outline-none custom-scrollbar resize-none"
                  spellCheck={false}
                />
                {sandboxOutput && (
                  <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Output
                    </span>
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                      {sandboxOutput}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Your Lecture Notes</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Auto-saved</span>
                </div>
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Type your notes for this lesson..."
                  className="w-full h-64 bg-gray-900 border border-gray-800 rounded-2xl p-4 text-xs text-gray-200 focus:ring-2 focus:ring-primary-500/50 outline-none custom-scrollbar resize-none"
                />
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-200">Community Discussion</h4>
                  <Button
                    size="sm"
                    onClick={() => addToast({ message: 'Discussion post opened', type: 'info' })}
                  >
                    Ask Question
                  </Button>
                </div>
                <div className="space-y-3">
                  <Card className="p-4 rounded-2xl bg-gray-900/60 border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200">Sarah Jenkins</span>
                      <span className="text-[10px] text-gray-500">2 hours ago</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Great explanation of the async processing queues! Is it better to set
                      exponential backoff on network timeouts?
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Collapsible Curriculum Drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full border-l border-gray-800/80 bg-gray-950 flex flex-col shrink-0 overflow-hidden z-10"
            >
              <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Curriculum
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {completedLessonIds.size} of {allLessons.length} completed
                  </p>
                </div>
                {progressPercent === 100 && (
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1 font-bold">
                    <Award className="w-3.5 h-3.5" />
                    Done
                  </span>
                )}
              </div>

              {/* Sections & Lesson List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-800/60">
                {course?.sections.map((section, sIdx) => (
                  <div key={section.id} className="p-3 space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 py-1">
                      Module {sIdx + 1}: {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.lessons.map(lesson => {
                        const isCurrent = lesson.id === currentLesson?.id
                        const isDone = completedLessonIds.has(lesson.id)

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              setCurrentLesson(lesson)
                              navigate(`/lesson-player/${courseId}/${lesson.id}`)
                            }}
                            className={`px-3 py-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                                : 'hover:bg-gray-900 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  toggleComplete(lesson.id)
                                }}
                                className="shrink-0 text-gray-500 hover:text-emerald-400"
                                aria-label="Toggle Complete"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              <span
                                className={`truncate font-medium ${isCurrent ? 'font-bold text-white' : ''}`}
                              >
                                {lesson.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 shrink-0 ml-2">
                              {lesson.duration}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
