import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  VolumeX,
  RotateCcw,
  AlertCircle,
  Bookmark,
  PlayCircle,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { lessonService } from '../services/lessonService'
import { useStore } from '../stores/useStore'
import { useVideoPlayer } from '../hooks/useVideoPlayer'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  // UI states
  const [showTranscript, setShowTranscript] = useState(false)
  const [showResources, setShowResources] = useState(true)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [notes, setNotes] = useState('')
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedRef = useRef(false)

  // Fetch Current Lesson
  const {
    data: lesson,
    isLoading: isLoadingLesson,
    error: lessonError,
  } = useQuery({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: async () => {
      if (!courseId || !lessonId) throw new Error('Missing IDs')
      const res = await lessonService.getLesson(courseId, lessonId)
      return res.data
    },
    enabled: !!courseId && !!lessonId,
  })

  // Fetch Course Lessons List
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('Missing Course ID')
      const res = await lessonService.getLessons(courseId)
      return res.data
    },
    enabled: !!courseId,
  })

  // Initialize notes when lesson loads
  useEffect(() => {
    if (lesson) {
      setNotes(lesson.progress?.notes ?? '')
    }
  }, [lesson])

  // Reset completion tracker when lesson changes
  useEffect(() => {
    completedRef.current = false
  }, [lesson])

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!courseId || !lessonId) throw new Error('Missing IDs')
      return lessonService.markComplete(courseId, lessonId)
    },
    onSuccess: () => {
      // Optimistically update caches
      queryClient.setQueryData(['lesson', courseId, lessonId], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          completed: true,
          progress: {
            ...oldData.progress,
            completed: true,
            progress_percent: 100,
            completed_at: new Date().toISOString(),
          },
        }
      })
      queryClient.setQueryData(['lessons', courseId], (oldData: any) => {
        if (!oldData) return oldData
        return oldData.map((l: any) => (l.id === lessonId ? { ...l, completed: true } : l))
      })
      addToast({ message: 'Module marked as complete.', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to update module status.', type: 'error' })
    },
  })

  const saveNotesMutation = useMutation({
    mutationFn: async (notesContent: string) => {
      if (!courseId || !lessonId) throw new Error('Missing IDs')
      return lessonService.saveNotes(courseId, lessonId, notesContent)
    },
    onSuccess: () => {
      addToast({ message: 'Telemetry notes synced.', type: 'success' })
    },
  })

  // Video player hook with progress tracking
  const {
    videoRef,
    state: videoState,
    controls: videoControls,
    bookmarks,
    addBookmark,
    removeBookmark,
    goToBookmark,
    formatTime,
  } = useVideoPlayer(
    useCallback(
      (currentTime: number, duration: number) => {
        // Progress callback - called every 5 seconds
        if (courseId && lessonId) {
          const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
          const completed = progressPercent >= 90

          void lessonService.updateProgress(courseId, lessonId, {
            progress_percent: progressPercent,
            watch_time_seconds: Math.floor(currentTime),
            completed,
          })

          if (completed && lesson && !lesson.progress?.completed && !completedRef.current) {
            completedRef.current = true
            markCompleteMutation.mutate()
          }
        }
      },
      [courseId, lessonId, lesson, markCompleteMutation]
    )
  )

  const { isPlaying, currentTime, duration, volume, isMuted, playbackRate } = videoState
  const { togglePlay, skip } = videoControls

  // Debounced save notes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (lesson && notes !== (lesson.progress?.notes ?? '')) {
        saveNotesMutation.mutate(notes)
      }
    }, 2000)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]) // intentional minimal deps to only trigger on notes change

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration
    videoControls.seek(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    videoControls.setVolume(vol)
  }

  const handleMouseMove = () => {
    setIsControlsVisible(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setIsControlsVisible(false)
    }, 3000)
  }

  const goToLesson = (id: string) => {
    navigate(`/course/${courseId}/lesson/${id}`)
  }

  const isLoading = isLoadingLesson || isLoadingLessons
  const error = lessonError ? (lessonError instanceof Error ? lessonError.message : 'Error') : null

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-[2rem] flex items-center justify-center shadow-inner"
        >
          <PlayCircle className="w-12 h-12 text-primary-500" />
        </motion.div>
        <p className="font-black text-primary-500 tracking-[0.2em] uppercase text-[10px] animate-pulse">
          Buffering Content Stream...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <AnimatedPage className="pt-20">
        <Card className="max-w-md mx-auto p-12 text-center border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-900">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black mb-3 tracking-tight text-gray-900 dark:text-white uppercase">
            Playback Error
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {error}
          </p>
          <div className="flex gap-4 flex-col">
            <Button
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20"
            >
              Retry Connection
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/course/${courseId}`)}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2"
            >
              Return to Directory
            </Button>
          </div>
        </Card>
      </AnimatedPage>
    )
  }

  if (!lesson) return null

  const currentLessonIndex = lessons.findIndex(l => l.id === lessonId)
  const nextLesson = lessons[currentLessonIndex + 1]
  const prevLesson = lessons[currentLessonIndex - 1]
  const isCompleted = lesson.progress?.completed ?? lesson.completed ?? false
  const videoProgress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <AnimatedPage className="pb-12 pt-4 px-2 max-w-[1400px] mx-auto">
      <SEO
        title={`${lesson.title} - LearningHub`}
        description={lesson.description}
        keywords="lesson, video, course, learning"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/course/${courseId}`)}
              className="rounded-[1.25rem] w-12 h-12 border-2 shrink-0 hidden sm:flex"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 rounded-[1.25rem] bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30 shrink-0">
              <PlayCircle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate tracking-tight uppercase leading-none mb-1.5">
                {lesson.title}
              </h1>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
                {lesson.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!isCompleted && (
              <Button
                isLoading={markCompleteMutation.isPending}
                onClick={() => markCompleteMutation.mutate()}
                className="rounded-xl px-5 py-2.5 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 border-none text-white flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/settings')}
              className="rounded-xl border-2 w-10 h-10"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <Card
              className="overflow-hidden border-none shadow-2xl bg-black relative group rounded-[2.5rem]"
              onMouseMove={handleMouseMove}
            >
              {/* Video Container */}
              <div className="relative aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={lesson.video_url}
                  className="w-full h-full max-h-[75vh]"
                  onClick={videoControls.togglePlay}
                  onDoubleClick={videoControls.toggleFullscreen}
                />

                {/* Big Play Overlay */}
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={videoControls.togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-all z-10 backdrop-blur-[2px]"
                    >
                      <div className="w-24 h-24 rounded-[2rem] bg-primary-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                        <Play className="w-12 h-12 ml-1 fill-current" />
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Video Controls Overlay */}
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-6 pt-24 transition-opacity duration-300 z-20 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  {/* Progress Bar */}
                  <div className="relative group/progress h-2 mb-6 cursor-pointer">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={videoProgress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 relative transition-all duration-100 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${videoProgress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 sm:gap-6">
                      <button
                        onClick={togglePlay}
                        className="p-3 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-md"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 fill-current" />
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => skip(-10)}
                          className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
                          title="Back 10s"
                        >
                          <SkipBack className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => skip(10)}
                          className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
                          title="Forward 10s"
                        >
                          <SkipForward className="w-5 h-5" />
                        </button>
                      </div>

                      <span className="text-[11px] font-black uppercase tracking-widest ml-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 hidden sm:block">
                        {formatTime(currentTime)} <span className="text-white/40 mx-1">/</span>{' '}
                        {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                      <button
                        onClick={() => addBookmark(`Bookmark at ${formatTime(currentTime)}`)}
                        className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
                        title="Add Bookmark (Ctrl+B)"
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>

                      <div className="relative group/speed">
                        <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors uppercase tracking-widest border border-white/10">
                          {playbackRate}x
                        </button>
                        <div className="absolute bottom-full right-0 mb-3 p-2 bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover/speed:opacity-100 group-hover/speed:visible transition-all flex flex-col gap-1 w-20">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => videoControls.setPlaybackRate(speed)}
                              className={`block w-full text-center px-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${playbackRate === speed ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 group/volume bg-white/5 rounded-xl border border-white/5 pr-3 hover:bg-white/10 transition-colors">
                        <button
                          onClick={videoControls.toggleMute}
                          className="p-2.5 rounded-xl transition-colors"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>
                        <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={videoControls.toggleFullscreen}
                        className="p-2.5 hover:bg-white/20 rounded-xl transition-colors bg-white/10 border border-white/10"
                        title="Toggle Fullscreen"
                      >
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 md:p-8 flex flex-col h-full rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    Telemetry Notes
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotes('')
                      localStorage.removeItem(`notes-${courseId}-${lessonId}`)
                    }}
                    className="rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </div>
                <textarea
                  rows={6}
                  placeholder="Record insights during module execution..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="flex-1 w-full p-5 border-2 border-gray-100 dark:border-gray-800 rounded-[1.5rem] bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none text-sm font-medium leading-relaxed transition-all placeholder:text-gray-400"
                />
              </Card>

              <div className="space-y-6">
                <Card className="p-6 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
                  <button
                    className="w-full flex items-center justify-between group"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                      </div>
                      Transcript Log
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <ChevronRight
                        className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showTranscript ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>
                  <AnimatePresence>
                    {showTranscript && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-6 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto pr-4 scrollbar-thin bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                          {lesson.transcript ?? 'No transcript sequence found.'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                {lesson.resources && lesson.resources.length > 0 && (
                  <Card className="p-6 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
                    <button
                      className="w-full flex items-center justify-between group"
                      onClick={() => setShowResources(!showResources)}
                    >
                      <span className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        Assets
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <ChevronRight
                          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showResources ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>
                    <AnimatePresence>
                      {showResources && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-6 space-y-3">
                            {lesson.resources.map(resource => (
                              <a
                                key={resource.id}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 rounded-[1.25rem] bg-gray-50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-all group/res border border-transparent hover:border-primary-100 dark:hover:border-primary-900/50"
                              >
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover/res:scale-110 transition-transform border border-gray-100 dark:border-gray-700">
                                  <FileText className="w-4 h-4 text-gray-400 group-hover/res:text-primary-500" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">
                                  {resource.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-8rem)] sticky top-24 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex gap-2">
                <button
                  onClick={() => setShowBookmarks(false)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!showBookmarks ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  Playlist
                </button>
                <button
                  onClick={() => setShowBookmarks(true)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${showBookmarks ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  Pins
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {showBookmarks ? (
                  bookmarks.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center h-full opacity-50">
                      <Bookmark className="w-12 h-12 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No Pins Secured
                      </p>
                      <p className="text-[9px] font-bold mt-2">CTRL + B to pin</p>
                    </div>
                  ) : (
                    bookmarks.map((bookmark: { id: string; time: number; label: string }) => (
                      <button
                        key={bookmark.id}
                        onClick={() => goToBookmark(bookmark.time)}
                        className="w-full text-left p-4 rounded-[1.25rem] hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group border border-transparent hover:border-primary-100 dark:hover:border-primary-900/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 shrink-0">
                            <Bookmark className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                              {bookmark.label}
                            </p>
                            <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">
                              TS: {formatTime(bookmark.time)}
                            </p>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              removeBookmark(bookmark.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-all text-gray-400"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  lessons.map((l, index) => (
                    <button
                      key={l.id}
                      onClick={() => goToLesson(l.id)}
                      className={`w-full text-left p-4 rounded-[1.25rem] transition-all group border ${
                        l.id === lessonId
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-xl'
                          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-colors ${
                            l.id === lessonId
                              ? 'bg-primary-600 text-white shadow-inner'
                              : l.completed
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                          }`}
                        >
                          {l.completed && l.id !== lessonId ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-black truncate leading-tight ${l.id === lessonId ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}
                          >
                            {l.title}
                          </p>
                          <p
                            className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${l.id === lessonId ? 'text-white/60 dark:text-gray-500' : 'text-gray-400'}`}
                          >
                            {formatTime(l.duration)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Navigation buttons */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 bg-gray-50 dark:bg-gray-900/50">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)}
                  className="flex-1 rounded-xl py-6 border-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  disabled={!nextLesson}
                  onClick={() => nextLesson && goToLesson(nextLesson.id)}
                  className="flex-1 rounded-xl py-6 shadow-lg shadow-primary-500/20"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}

export default memo(LessonPlayerPage)
