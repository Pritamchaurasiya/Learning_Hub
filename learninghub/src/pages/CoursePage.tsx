import { useParams, useNavigate } from 'react-router-dom'
import React, { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Share2,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { courseService, type CourseLesson } from '../services/courseService'
import { userService } from '../services/userService'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'

interface LessonItemProps {
  lesson: CourseLesson
  courseId: string
  navigate: (path: string) => void
  isEnrolled: boolean
}

const LessonItem = React.memo(({ lesson, courseId, navigate, isEnrolled }: LessonItemProps) => (
  <motion.button
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    }}
    key={lesson.id}
    data-testid="lesson-item"
    className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] border-2 transition-all duration-300 text-left group ${
      isEnrolled
        ? 'hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer border-transparent hover:border-primary-100 dark:hover:border-primary-900 bg-white dark:bg-gray-900/50 shadow-sm hover:shadow-md'
        : 'opacity-75 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20'
    }`}
    onClick={() => isEnrolled && navigate(`/course/${courseId}/lesson/${lesson.id}`)}
    disabled={!isEnrolled}
  >
    <div className="flex items-center gap-5 min-w-0">
      <div
        className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 transition-all duration-300 ${lesson.completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 group-hover:text-primary-500'}`}
      >
        {lesson.completed ? (
          <CheckCircle className="w-6 h-6" />
        ) : (
          <PlayCircle className="w-6 h-6 ml-0.5" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-base font-black truncate transition-colors ${lesson.completed ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200 group-hover:text-primary-600'}`}
        >
          {lesson.title}
        </p>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
          {lesson.duration} mins
        </p>
      </div>
    </div>
    {isEnrolled && (
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
    )}
  </motion.button>
))

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  // Course Data Query
  const {
    data,
    isLoading: isCourseLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('No course ID provided')
      const [courseRes, lessonsRes] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getCourseLessons(courseId),
      ])
      return { course: courseRes.data, sections: lessonsRes.data }
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })

  // Bookmark Status Query
  const { data: isBookmarked = false } = useQuery({
    queryKey: ['course', courseId, 'bookmark'],
    queryFn: async () => {
      const res = await userService.getBookmarks()
      const bookmarks = (res.data ?? []) as Array<{ course_id: string }>
      return bookmarks.some(b => b.course_id === courseId)
    },
    enabled: !!courseId,
  })

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (currentlyBookmarked: boolean) => {
      if (!courseId) throw new Error('No course ID')
      if (currentlyBookmarked) {
        return userService.removeBookmark(courseId)
      } else {
        return userService.addBookmark(courseId)
      }
    },
    onMutate: async currentlyBookmarked => {
      await queryClient.cancelQueries({ queryKey: ['course', courseId, 'bookmark'] })
      const previous = queryClient.getQueryData(['course', courseId, 'bookmark'])
      queryClient.setQueryData(['course', courseId, 'bookmark'], !currentlyBookmarked)
      return { previous, currentlyBookmarked }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['course', courseId, 'bookmark'], context.previous)
      }
      addToast({ message: 'Failed to update bookmark', type: 'error' })
    },
    onSuccess: (_, currentlyBookmarked) => {
      addToast({
        message: currentlyBookmarked ? 'Bookmark removed' : 'Added to bookmarks',
        type: 'success',
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['course', courseId, 'bookmark'] })
    },
  })

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!courseId) throw new Error('No course ID')
      return courseService.enroll(courseId)
    },
    onSuccess: () => {
      addToast({ message: 'Welcome to the course! Enrollment successful.', type: 'success' })
      // Invalidating refetches the data ensuring latest server state
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    },
    onError: () => {
      addToast({ message: 'Could not complete enrollment. Please try again.', type: 'error' })
    },
  })

  const handleBookmark = useCallback(() => {
    if (bookmarkMutation.isPending) return
    bookmarkMutation.mutate(isBookmarked)
  }, [bookmarkMutation, isBookmarked])

  const handleEnroll = useCallback(() => {
    if (enrollMutation.isPending) return
    enrollMutation.mutate()
  }, [enrollMutation])

  const { course, sections = [] } = data ?? {}

  const totalLessons = useMemo(() => {
    return sections.reduce((sum: number, section: any) => sum + section.lessons.length, 0)
  }, [sections])

  if (isCourseLoading) {
    return (
      <AnimatedPage className="max-w-5xl mx-auto space-y-8 pb-12 pt-4">
        <Skeleton className="h-5 w-32 mb-4 rounded-lg" />
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex gap-3">
                <Skeleton className="h-6 w-24 rounded-lg bg-gray-800" />
                <Skeleton className="h-6 w-24 rounded-lg bg-gray-800" />
              </div>
              <Skeleton className="h-14 w-3/4 rounded-2xl bg-gray-800" />
              <Skeleton className="h-24 w-full rounded-2xl bg-gray-800" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-16 w-48 rounded-[1.25rem] bg-gray-800" />
                <Skeleton className="h-16 w-16 rounded-[1.25rem] bg-gray-800" />
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/5 rounded-3xl p-8 space-y-8">
                <Skeleton className="h-4 w-1/2 bg-gray-800" />
                <div className="space-y-4">
                  <Skeleton className="h-3 w-full bg-gray-800" />
                  <Skeleton className="h-3 w-5/6 bg-gray-800" />
                  <Skeleton className="h-3 w-4/6 bg-gray-800" />
                </div>
                <div className="flex gap-4 pt-6 border-t border-gray-800">
                  <Skeleton className="h-12 w-12 rounded-[1rem] bg-gray-800" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4 w-1/2 bg-gray-800" />
                    <Skeleton className="h-3 w-1/3 bg-gray-800" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-48 mb-6 rounded-lg" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="p-5 rounded-[1.5rem] border-2 border-gray-100 dark:border-gray-800 flex gap-5"
                >
                  <Skeleton className="w-12 h-12 rounded-[1rem] shrink-0" />
                  <div className="space-y-3 flex-1 py-1">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <div className="p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900 space-y-8">
              <Skeleton className="h-4 w-40 rounded-md" />
              <div className="space-y-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="w-6 h-6 rounded-[0.5rem]" />
                    <Skeleton className="h-4 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  if (error || !course) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      >
        <div className="w-32 h-32 bg-rose-50 dark:bg-rose-950/30 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner shadow-rose-500/20">
          <AlertCircle className="w-16 h-16 text-rose-500" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tight uppercase">
          {error?.message ?? 'Course Unavailable'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-12 max-w-md mx-auto leading-relaxed">
          The requested neural module could not be loaded. It might be classified or currently
          undergoing maintenance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={() => refetch()}
            className="flex-1 px-8 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
            Re-Sync
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105"
          >
            Abort Protocol
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="max-w-5xl mx-auto space-y-8 pb-12 pt-4">
      <SEO
        title={course.title}
        description={course.description ?? undefined}
        image={course.thumbnail ?? undefined}
        type="article"
      />

      <button
        onClick={() => navigate('/')}
        className="group flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors w-max"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Return to Dashboard
      </button>

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white p-8 md:p-14 shadow-2xl">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none overflow-hidden mix-blend-screen">
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-primary-600 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-12 w-64 h-64 bg-purple-600 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-primary-300 shadow-sm border border-white/5">
                {course.level} Engineering
              </span>
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-300 shadow-sm border border-white/5">
                {totalLessons} Modules
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-300">
              {course.title}
            </h1>

            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl font-medium">
              {course.description}
            </p>

            {course.is_enrolled && (
              <div className="space-y-3 max-w-md bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary-300">
                  <span>Acquisition Progress</span>
                  <span className="text-white text-sm">{course.progress_percent ?? 0}%</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${course.progress_percent ?? 0}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary-400 to-indigo-400 rounded-full"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-4">
              {!course.is_enrolled ? (
                <Button
                  size="lg"
                  onClick={handleEnroll}
                  isLoading={enrollMutation.isPending}
                  className="px-10 py-6 rounded-[1.25rem] shadow-2xl shadow-primary-500/30 font-black text-xs uppercase tracking-widest w-full sm:w-auto hover:scale-105 transition-transform"
                >
                  Initiate Sequence
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    const firstLesson = sections[0]?.lessons[0]?.id
                    navigate(`/course/${courseId}/lesson/${firstLesson}`)
                  }}
                  className="px-10 py-6 rounded-[1.25rem] shadow-2xl shadow-primary-500/30 font-black text-xs uppercase tracking-widest w-full sm:w-auto hover:scale-105 transition-transform bg-white text-gray-900 hover:bg-gray-100"
                >
                  Resume Mastery
                </Button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBookmark}
                disabled={bookmarkMutation.isPending}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                className={`w-14 h-14 rounded-[1.25rem] border-2 flex items-center justify-center transition-all ${
                  isBookmarked
                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'border-white/20 hover:border-white/40 text-white hover:bg-white/10'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-6 h-6" />
                ) : (
                  <Bookmark className="w-6 h-6" />
                )}
              </motion.button>
            </div>
          </div>

          <div className="hidden lg:block">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-8 space-y-8 rounded-[2rem] shadow-2xl">
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 border-b border-white/10 pb-4">
                  Curriculum Matrix
                </p>
                <div className="space-y-4">
                  {[
                    { label: 'Core Theory', val: 85 },
                    { label: 'Practical Labs', val: 92 },
                    { label: 'Production Design', val: 78 },
                  ].map(s => (
                    <div key={s.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/70">{s.label}</span>
                        <span className="text-primary-300">{s.val}%</span>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-indigo-400 rounded-full"
                          style={{ width: `${s.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-[1.25rem] border border-white/5">
                  <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-black">James Doe</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">
                      Lead Architect
                    </p>
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
          <section className="space-y-8">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4 text-gray-900 dark:text-white uppercase">
              <div className="w-12 h-12 rounded-[1rem] bg-gray-900 dark:bg-gray-800 flex items-center justify-center shadow-xl shadow-gray-200 dark:shadow-none">
                <Layers className="w-6 h-6 text-primary-500" />
              </div>
              Course Curriculum
            </h2>

            <div className="space-y-6">
              {sections.map((section: any, sIdx: number) => (
                <div
                  key={section.id}
                  className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-4 px-2 mb-2">
                    <span className="w-10 h-10 rounded-[1rem] bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-sm font-black text-primary-600 tabular-nums">
                      0{sIdx + 1}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                  </div>
                  <motion.div 
                    className="grid grid-cols-1 gap-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    {section.lessons.map((lesson: CourseLesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        courseId={courseId as string}
                        navigate={navigate}
                        isEnrolled={course.is_enrolled}
                      />
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-8">
          <Card className="p-8 space-y-8 border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2.5rem]">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">
              Module Outcomes
            </h3>
            <div className="space-y-5">
              {[
                {
                  icon: CheckCircle,
                  text: 'Industry Standard Certification',
                  color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
                },
                {
                  icon: PlayCircle,
                  text: '12+ Practical Exercises',
                  color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
                },
                {
                  icon: Clock,
                  text: 'Lifetime Resource Access',
                  color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
                },
                {
                  icon: Layers,
                  text: 'Advanced Production Patterns',
                  color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div
                    className={`w-12 h-12 rounded-[1rem] ${item.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              leftIcon={<Share2 className="w-4 h-4" />}
            >
              Broadcast Progress
            </Button>
          </Card>

          <Card className="p-8 bg-gradient-to-br from-primary-600 to-indigo-700 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <PlayCircle className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="font-black text-xl tracking-tight leading-tight">Next Step Mastery</h3>
              <p className="text-xs text-primary-100/90 leading-relaxed font-bold uppercase tracking-widest">
                This course is part of the &quot;Full-Stack Architect&quot; path. Complete this to
                unlock Cloud Scaling protocols.
              </p>
              <Button
                variant="secondary"
                className="w-full bg-white text-primary-600 hover:bg-gray-100 border-none shadow-xl shadow-black/20 font-black uppercase tracking-widest text-[10px] py-4 rounded-[1.25rem]"
              >
                Access Details
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
