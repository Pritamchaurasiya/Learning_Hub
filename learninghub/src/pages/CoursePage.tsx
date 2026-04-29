import { useParams, useNavigate } from 'react-router-dom'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Clock,
  ChevronRight,
  PlayCircle,
  BookOpen,
  Share2,
  Layers,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { courseService, type CourseDetails, type CourseSection } from '../services/courseService'
import { userService } from '../services/userService'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const LessonItem = React.memo(({ lesson, courseId, navigate, isEnrolled }: any) => (
  <button 
    key={lesson.id}
    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
      isEnrolled 
        ? 'hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer border-transparent bg-white dark:bg-gray-900/50 shadow-sm' 
        : 'opacity-75 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20'
    }`}
    onClick={() => isEnrolled && navigate(`/course/${courseId}/lesson/${lesson.id}`)}
    disabled={!isEnrolled}
  >
    <div className="flex items-center gap-4 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lesson.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
        {lesson.completed ? <CheckCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{lesson.title}</p>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{lesson.duration} mins</p>
      </div>
    </div>
    {isEnrolled && <ChevronRight className="w-4 h-4 text-gray-300" />}
  </button>
));

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { addToast } = useStore()
  
    const [course, setCourse] = useState<CourseDetails | null>(null)
    const [sections, setSections] = useState<CourseSection[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEnrolling, setIsEnrolling] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)


    const totalLessons = useMemo(() => {
      return sections.reduce((sum, section) => sum + section.lessons.length, 0)
    }, [sections])

  const fetchCourseData = useCallback(async () => {
    if (!courseId) return
    try {
      setIsLoading(true)
      setError(null)
      const [courseRes, lessonsRes] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getCourseLessons(courseId)
      ])
      setCourse(courseRes.data)
      setSections(lessonsRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course details. Please try again.')
      console.error('[CoursePage] Failed to fetch course:', err)
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchCourseData()
  }, [fetchCourseData])

  const checkBookmarkStatus = useCallback(async () => {
    if (!courseId) return
    try {
      const res = await userService.getBookmarks()
      const bookmarks = res.data || []
      const isBookmarked = bookmarks.some((b: any) => b.id === courseId)
      setIsBookmarked(isBookmarked)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[CoursePage] Failed to check bookmark status:', err);
      }
    }
  }, [courseId])

  const handleBookmark = useCallback(async () => {
    if (!courseId || isBookmarkLoading) return
    setIsBookmarkLoading(true)
    try {
      if (isBookmarked) {
        await userService.removeBookmark(courseId)
        addToast({ message: 'Bookmark removed', type: 'success' })
        setIsBookmarked(false)
      } else {
        await userService.addBookmark(courseId)
        addToast({ message: 'Added to bookmarks', type: 'success' })
        setIsBookmarked(true)
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[CoursePage] Bookmark toggle failed:', err);
      }
      addToast({ message: 'Failed to update bookmark', type: 'error' })
    } finally {
      setIsBookmarkLoading(false)
    }
  }, [courseId, isBookmarked, isBookmarkLoading, addToast])

  useEffect(() => {
    checkBookmarkStatus()
  }, [checkBookmarkStatus])

  const handleEnroll = useCallback(async () => {
    if (!courseId) return
    try {
      setIsEnrolling(true)
      await courseService.enroll(courseId)
      addToast({ message: 'Welcome to the course! Enrollment successful.', type: 'success' })
      fetchCourseData()
    } catch (err) {
      addToast({ message: 'Could not complete enrollment. Please try again.', type: 'error' })
    } finally {
      setIsEnrolling(false)
    }
  }, [courseId, addToast, fetchCourseData])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full"
          />
          <BookOpen className="w-6 h-6 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-bold text-lg tracking-tight">Preparing Course Material</p>
          <p className="text-sm text-gray-500 animate-pulse">Fetching latest updates...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      >
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-[2rem] flex items-center justify-center mb-8">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black mb-4 tracking-tighter">{error || 'Course Unavailable'}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
          The requested course could not be loaded. It might be private or currently undergoing maintenance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button onClick={fetchCourseData} className="flex-1 px-8 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button onClick={() => navigate('/')} className="flex-1 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 hover:bg-primary-700 transition-all">
            Go Home
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="max-w-5xl mx-auto space-y-8 pb-12">
      <SEO title={course.title} description={course.description} type="article" />
      
      {/* Breadcrumb / Back */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Path
      </button>

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gray-900 text-white p-8 md:p-12 shadow-2xl">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none overflow-hidden">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-500 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-12 w-48 h-48 bg-purple-500 rounded-full blur-[60px]" />
         </div>

         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-wrap gap-3">
                   <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-primary-300">
                     {course.level} Engineering
                   </span>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      {totalLessons} Modules
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1]">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                  {course.description}
                </p>

                {course.is_enrolled && (
                  <div className="space-y-2 max-w-md">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-primary-400">
                      <span>Overall Progress</span>
                      <span>{course.progress_percent || 0}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress_percent || 0}%` }}
                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500" 
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  {!course.is_enrolled ? (
                    <Button 
                      size="lg" 
                      onClick={handleEnroll} 
                      isLoading={isEnrolling}
                      className="px-10 py-6 rounded-2xl shadow-xl shadow-primary-500/20 font-black text-xs uppercase tracking-widest"
                    >
                      Enroll in Course
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={() => {
                        const firstLesson = sections[0]?.lessons[0]?.id;
                        navigate(`/course/${courseId}/lesson/${firstLesson}`);
                      }}
                      className="px-10 py-6 rounded-2xl shadow-xl shadow-primary-500/20 font-black text-xs uppercase tracking-widest"
                    >
                      Resume Mastery
                    </Button>
                  )}
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBookmark}
                    className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                      isBookmarked 
                        ? 'bg-primary-600 border-primary-600 text-white' 
                        : 'border-white/20 hover:border-white/40 text-white'
                    }`}
                  >
                    {isBookmarked ? <BookmarkCheck className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
                  </motion.button>
                </div>
            </div>

            <div className="hidden lg:block">
               <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-8 space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Curriculum Coverage</p>
                    <div className="space-y-3">
                       {[
                         { label: 'Core Theory', val: 85 },
                         { label: 'Practical Labs', val: 92 },
                         { label: 'Production Design', val: 78 }
                       ].map(s => (
                         <div key={s.label} className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                               <span className="text-white/60">{s.label}</span>
                               <span className="text-primary-400">{s.val}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.val}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center font-bold">JD</div>
                       <div>
                          <p className="text-sm font-bold">James Doe</p>
                          <p className="text-[10px] text-white/40">Lead Engineer • Meta</p>
                       </div>
                    </div>
                  </div>
               </Card>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Content */}
         <div className="lg:col-span-2 space-y-10">
            <section className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <Layers className="w-6 h-6 text-primary-600" />
                Course Curriculum
              </h2>
              
              <div className="space-y-4">
                {sections.map((section, sIdx) => (
                  <div key={section.id} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <span className="text-xs font-black text-primary-500 tabular-nums">0{sIdx + 1}</span>
                       <h3 className="font-bold text-gray-900 dark:text-white">{section.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {section.lessons.map(lesson => (
                        <LessonItem 
                          key={lesson.id} 
                          lesson={lesson} 
                          courseId={courseId} 
                          navigate={navigate} 
                          isEnrolled={course.is_enrolled} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
         </div>

         {/* Sidebar Stats */}
         <div className="space-y-8">
            <Card className="p-6 space-y-6 border-none shadow-xl">
               <h3 className="font-black text-sm uppercase tracking-widest text-gray-400">Course Outcome</h3>
               <div className="space-y-4">
                  {[
                    { icon: CheckCircle, text: 'Industry Standard Certification', color: 'text-emerald-500' },
                    { icon: PlayCircle, text: '12+ Practical Exercises', color: 'text-blue-500' },
                    { icon: Clock, text: 'Lifetime Resource Access', color: 'text-purple-500' },
                    { icon: Layers, text: 'Advanced Production Patterns', color: 'text-amber-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                       <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
                       <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.text}</span>
                    </div>
                  ))}
               </div>
               <Button variant="outline" className="w-full py-4 rounded-xl font-bold border-2" leftIcon={<Share2 className="w-4 h-4" />}>
                 Share Progress
               </Button>
            </Card>

            <Card className="p-6 bg-primary-600 text-white border-none shadow-2xl overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-24 h-24" />
               </div>
               <div className="relative z-10 space-y-4">
                  <h3 className="font-black text-lg">Next Step Mastery</h3>
                  <p className="text-sm text-primary-100/80 leading-relaxed font-medium">
                    This course is part of the "Full-Stack Architect" path. Complete this to unlock Cloud Scaling.
                  </p>
                  <Button variant="secondary" className="w-full bg-white text-primary-600 border-none shadow-lg">
                    View Path Detail
                  </Button>
               </div>
            </Card>
         </div>
      </div>
    </AnimatedPage>
  )
}
