import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { lessonService, type Lesson } from '../services/lessonService'
import { useStore } from '../stores/useStore'

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>()
  const navigate = useNavigate()
  const { addToast } = useStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showResources, setShowResources] = useState(true)
  const [notes, setNotes] = useState('')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // API states
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const progressUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch lesson data
  useEffect(() => {
    if (!courseId || !lessonId) {
      setError('Invalid course or lesson ID')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [lessonRes, lessonsRes] = await Promise.all([
          lessonService.getLesson(courseId, lessonId, { signal: controller.signal }),
          lessonService.getLessons(courseId, { signal: controller.signal })
        ])

        if (controller.signal.aborted) return

        setLesson(lessonRes.data)
        setLessons(lessonsRes.data)
        setNotes(lessonRes.data.progress?.notes || '')
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load lesson')
        if (import.meta.env.DEV) {
          console.error('[LessonPlayerPage] Failed to fetch lesson:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => controller.abort()
  }, [courseId, lessonId])

  // Update progress periodically
  const updateProgress = useCallback(async () => {
    if (!courseId || !lessonId || !videoRef.current) return

    const video = videoRef.current
    const progressPercent = duration > 0 ? (video.currentTime / duration) * 100 : 0
    const completed = progressPercent >= 90

    try {
      await lessonService.updateProgress(courseId, lessonId, {
        progress_percent: progressPercent,
        watch_time_seconds: Math.floor(video.currentTime),
        completed
      })

      if (completed && lesson && !lesson.progress?.completed) {
        addToast({ message: 'Lesson completed!', type: 'success' })
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[LessonPlayerPage] Failed to update progress:', err);
      }
    }
  }, [courseId, lessonId, duration, lesson, addToast])

  // Auto-save progress every 10 seconds while playing
  useEffect(() => {
    if (isPlaying) {
      progressUpdateRef.current = setInterval(updateProgress, 10000)
    } else {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current)
        progressUpdateRef.current = null
        // Save final progress when pausing
        updateProgress()
      }
    }

    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current)
        progressUpdateRef.current = null
      }
    }
  }, [isPlaying, updateProgress])

  // Cleanup all timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current)
        progressUpdateRef.current = null
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = null
      }
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current)
        progressSaveTimeoutRef.current = null
      }
      // Final progress save
      updateProgress()
    }
  }, [])

  // Save notes
  const saveNotes = useCallback(async () => {
    if (!courseId || !lessonId) return

    try {
      await lessonService.saveNotes(courseId, lessonId, notes)
      addToast({ message: 'Notes saved', type: 'success' })
    } catch (err) {
      addToast({ message: 'Failed to save notes', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[LessonPlayerPage] Failed to save notes:', err);
      }
    }
  }, [courseId, lessonId, notes, addToast])

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsPlaying(true)).catch(() => {
            // Silent fail - video play error is not critical
          });
        } else {
          setIsPlaying(true);
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration)
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { /* Silent fail */ });
      } else {
        videoRef.current.parentElement?.requestFullscreen().catch(() => { /* Silent fail */ });
      }
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          skip(-10);
          break;
        case 'l':
          skip(10);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'arrowleft':
          skip(-5);
          break;
        case 'arrowright':
          skip(5);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(1, prev + 0.1);
            if (videoRef.current) {
               videoRef.current.volume = newVol;
               videoRef.current.muted = newVol === 0;
               setIsMuted(newVol === 0);
            }
            return newVol;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(0, prev - 0.1);
            if (videoRef.current) {
               videoRef.current.volume = newVol;
               videoRef.current.muted = newVol === 0;
               setIsMuted(newVol === 0);
            }
            return newVol;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleMute, toggleFullscreen]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  // Debounced save notes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (notes !== (lesson?.progress?.notes || '')) {
        saveNotes();
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [notes, lesson, saveNotes]);

  const videoProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (videoRef.current) {
      videoRef.current.volume = vol
      videoRef.current.muted = vol === 0
      setIsMuted(vol === 0)
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }

  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setIsControlsVisible(false);
    }, 3000);
  };

  const markAsComplete = async () => {
    if (!courseId || !lessonId) return;
    try {
      await lessonService.completeLesson(courseId, lessonId);
      addToast({ message: 'Lesson completed!', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to mark complete', type: 'error' });
    }
  }

  const goToLesson = (id: string) => {
    navigate(`/course/${courseId}/lesson/${id}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading lesson...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 dark:text-red-400 text-center max-w-md">{error}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <Button onClick={() => navigate(`/course/${courseId}`)}>Back to Course</Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-xl font-bold mb-4">Lesson not found</h2>
        <Button onClick={() => navigate(`/course/${courseId}`)}>Back to Course</Button>
      </div>
    );
  }

  const currentLessonIndex = lessons.findIndex(l => l.id === lessonId)
  const nextLesson = lessons[currentLessonIndex + 1]
  const prevLesson = lessons[currentLessonIndex - 1]
  const isCompleted = lesson.progress?.completed || false;

  return (
    <>
      <SEO
        title={`${lesson.title} - LearningHub`}
        description={lesson.description}
        keywords="lesson, video, course, learning"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/course/${courseId}`)}
              className="px-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {lesson.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {lesson.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={markAsComplete}
              >
                Complete
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="overflow-hidden border-0 shadow-2xl bg-black relative group" onMouseMove={handleMouseMove}>
              {/* Video Container */}
              <div className="relative aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={lesson.video_url}
                  className="w-full h-full max-h-[70vh]"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                  onDoubleClick={toggleFullscreen}
                />

                {/* Big Play Overlay */}
                {!isPlaying && (
                  <button 
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all z-10"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary-600/90 text-white flex items-center justify-center shadow-2xl scale-100 hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 ml-1 fill-current" />
                    </div>
                  </button>
                )}

                {/* Video Controls Overlay */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 z-20 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  {/* Progress Bar */}
                  <div className="relative group/progress h-1.5 mb-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={videoProgress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-gray-600/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 relative transition-all duration-100"
                        style={{ width: `${videoProgress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-1 sm:gap-4">
                      <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>
                      
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <button onClick={() => skip(-10)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Back 10s">
                          <SkipBack className="w-5 h-5" />
                        </button>
                        <button onClick={() => skip(10)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Forward 10s">
                          <SkipForward className="w-5 h-5" />
                        </button>
                      </div>

                      <span className="text-[13px] font-mono tabular-nums ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Playback Speed */}
                      <div className="relative group/speed">
                        <button className="text-xs font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors uppercase tracking-wider">
                          {playbackSpeed}x
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 p-1 bg-gray-900 rounded-lg shadow-xl opacity-0 invisible group-hover/speed:opacity-100 group-hover/speed:visible transition-all">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={`block w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-white/10 ${playbackSpeed === speed ? 'text-primary-400 font-bold' : 'text-white'}`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Volume */}
                      <div className="flex items-center gap-2 group/volume">
                        <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 flex items-center">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                        </div>
                      </div>

                      <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Toggle Fullscreen">
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    Notes
                  </h3>
                  <Button variant="ghost" size="xs" onClick={() => { setNotes(''); localStorage.removeItem(`notes-${courseId}-${lessonId}`); }}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                </div>
                <textarea
                  rows={6}
                  placeholder="Take notes while watching... (Auto-saves locally)"
                  value={notes}
                  onChange={handleNotesChange}
                  className="flex-1 w-full p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none text-sm leading-relaxed transition-all"
                />
              </Card>

              <div className="space-y-4">
                 <Card className="p-4">
                  <button
                    className="w-full flex items-center justify-between group"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      Transcript
                    </span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showTranscript ? 'rotate-90' : ''}`} />
                  </button>
                  {showTranscript && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto pr-2 scrollbar-thin">
                      {lesson.transcript || "No transcript available for this lesson."}
                    </div>
                  )}
                </Card>

                {lesson.resources && lesson.resources.length > 0 && (
                  <Card className="p-4">
                    <button
                      className="w-full flex items-center justify-between group"
                      onClick={() => setShowResources(!showResources)}
                    >
                      <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        Resources
                      </span>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showResources ? 'rotate-90' : ''}`} />
                    </button>
                    {showResources && (
                      <div className="mt-4 space-y-2">
                        {lesson.resources.map(resource => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 dark:hover:text-primary-400 transition-all group/res"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover/res:scale-110 transition-transform">
                               <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">{resource.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden flex flex-col h-full max-h-[calc(100vh-10rem)] sticky top-20">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary-500" />
                  Lessons
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {lessons.map((l, index) => (
                  <button
                    key={l.id}
                    onClick={() => goToLesson(l.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all group ${
                      l.id === lessonId
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                        l.id === lessonId 
                          ? 'bg-white text-primary-600' 
                          : l.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}>
                        {l.completed ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${l.id === lessonId ? 'text-white' : ''}`}>
                          {l.title}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${l.id === lessonId ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatTime(l.duration)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && goToLesson(nextLesson.id)}
                  className="flex-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function GraduationCap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v5" />
    </svg>
  )
}
