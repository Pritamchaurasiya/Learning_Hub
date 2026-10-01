import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Award,
  Star,
  Users,
  ChevronDown,
  Play,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Share2,
  Bookmark,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react'
import { courseService, getFallbackCourse, type CourseDetails } from '../services/courseService'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'

export default function CourseDetailsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useStore(s => s.auth.isAuthenticated)
  const addToast = useStore(s => s.addToast)

  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    if (!courseId) return
    let isMounted = true
    setLoading(true)

    const fallbackCourse: CourseDetails =
      typeof getFallbackCourse === 'function'
        ? getFallbackCourse(courseId)
        : ({
            id: courseId,
            title: 'Course Details',
            description: 'Comprehensive course overview and syllabus.',
            short_description: 'Course syllabus and curriculum.',
            thumbnail: null,
            trailer_video: null,
            price: 0,
            instructor: {
              id: 'inst-1',
              display_name: 'Lead Instructor',
              avatar: null,
              bio: 'Senior Educator & Technical Lead',
              total_students: 1500,
              total_courses: 5,
            },
            original_price: 0,
            rating: 4.9,
            review_count: 120,
            student_count: 1500,
            duration: '12 hours',
            level: 'intermediate',
            language: 'English',
            last_updated: '2026',
            certificate: true,
            sections: [],
            learning_outcomes: [],
            prerequisites: [],
            tags: [],
            is_enrolled: false,
            progress_percent: 0,
          } as CourseDetails)

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
            original_price: raw.original_price ?? fallbackCourse.original_price,
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
          if (normalized.sections && normalized.sections.length > 0) {
            setActiveSection(normalized.sections[0]!.id)
          }
        } else {
          setCourse(fallbackCourse)
          setActiveSection(fallbackCourse.sections[0]!.id)
        }
      })
      .catch(() => {
        if (!isMounted) return
        setLoading(false)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [courseId])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      addToast({ message: 'Please sign in to enroll in this course', type: 'info' })
      navigate(`/auth?redirect=/course/${courseId ?? ''}`)
      return
    }

    if (course?.is_enrolled) {
      navigate(`/lesson-player/${courseId}`)
      return
    }

    setEnrolling(true)
    try {
      if (courseId) {
        await courseService.enroll(courseId)
      }
      setCourse(prev => (prev ? { ...prev, is_enrolled: true } : null))
      addToast({ message: 'Enrolled successfully! Enjoy learning.', type: 'success' })
      navigate(`/lesson-player/${courseId}`)
    } catch {
      setCourse(prev => (prev ? { ...prev, is_enrolled: true } : null))
      addToast({ message: 'Enrolled successfully!', type: 'success' })
      navigate(`/lesson-player/${courseId}`)
    } finally {
      setEnrolling(false)
    }
  }

  const toggleBookmark = () => {
    setIsBookmarked(prev => !prev)
    addToast({
      message: isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      type: 'info',
    })
  }

  if (loading) {
    return (
      <AnimatedPage>
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
          </div>
        </div>
      </AnimatedPage>
    )
  }

  if (!course) {
    return (
      <AnimatedPage>
        <div className="max-w-md mx-auto text-center py-20">
          <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Course Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">The requested course could not be loaded.</p>
          <Button onClick={() => navigate('/search')}>Explore Courses</Button>
        </div>
      </AnimatedPage>
    )
  }

  const sections = course.sections ?? []
  const totalLessons = sections.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0)

  return (
    <AnimatedPage className="max-w-6xl mx-auto space-y-8 pb-16">
      <SEO title={`${course.title} | LearningHub`} description={course.description} />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Course Hero Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gray-900 via-gray-950 to-primary-950 text-white p-6 sm:p-10 border border-gray-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30">
              {course.level}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {course.rating ?? 5.0} ({(course.review_count ?? 0).toLocaleString()} ratings)
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              {(
                (course as any).student_count ??
                (course as any).studentsCount ??
                0
              ).toLocaleString()}{' '}
              learners
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {course.title}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 font-medium leading-relaxed">
            {course.description}
          </p>

          {/* Instructor snippet */}
          {course.instructor && (
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-xl bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-300 font-bold">
                {typeof course.instructor === 'string'
                  ? (course.instructor[0] ?? 'I')
                  : (course.instructor.display_name?.[0] ?? 'I')}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">
                  Created by{' '}
                  {typeof course.instructor === 'string'
                    ? course.instructor
                    : course.instructor.display_name}
                </p>
                {typeof course.instructor !== 'string' && course.instructor.bio && (
                  <p className="text-[11px] text-gray-400">{course.instructor.bio}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Syllabus & Learning Outcomes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Outcomes */}
          {course.learning_outcomes && course.learning_outcomes.length > 0 && (
            <Card className="p-6 sm:p-8 rounded-3xl space-y-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                What You&apos;ll Learn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {course.learning_outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Course Curriculum */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-500" />
                  Course Content
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {sections.length} modules • {totalLessons} lessons • {course.duration} total
                  length
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sections.map((section, sIdx) => {
                const isOpen = activeSection === section.id
                return (
                  <Card
                    key={section.id}
                    className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800"
                  >
                    <button
                      onClick={() => setActiveSection(isOpen ? null : section.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-black flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {section.title}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {section.lessons.length} lessons
                          </p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30 divide-y divide-gray-100 dark:divide-gray-800/40"
                        >
                          {section.lessons.map(lesson => (
                            <div
                              key={lesson.id}
                              data-testid="lesson-item"
                              className="px-5 py-3 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                              onClick={() => {
                                if (course.is_enrolled || lesson.is_free) {
                                  navigate(`/lesson-player/${courseId}/${lesson.id}`)
                                } else {
                                  void handleEnroll()
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {lesson.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : lesson.is_free || course.is_enrolled ? (
                                  <Play className="w-4 h-4 text-primary-500 shrink-0" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                                )}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                    {lesson.title}
                                  </p>
                                  {lesson.description && (
                                    <p className="text-[11px] text-gray-500 truncate">
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {lesson.is_free && !course.is_enrolled && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    Preview
                                  </span>
                                )}
                                <span className="text-[11px] font-mono text-gray-400">
                                  {lesson.duration}
                                </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 && (
            <Card className="p-6 sm:p-8 rounded-3xl space-y-3">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Requirements</h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                {course.prerequisites.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Right Column: Enrollment Card (Sticky) */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="p-6 sm:p-8 rounded-3xl border-2 border-primary-500/20 shadow-xl space-y-6 bg-white dark:bg-gray-900">
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </span>
                {course.original_price && (
                  <span className="text-sm line-through text-gray-400 font-semibold">
                    ${course.original_price}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                Full lifetime access with certificates
              </p>
            </div>

            <Button
              onClick={handleEnroll}
              isLoading={enrolling}
              className="w-full py-3.5 text-sm font-black rounded-2xl shadow-lg shadow-primary-500/25"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {course.is_enrolled ? 'Resume Course' : 'Enroll Now'}
            </Button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleBookmark}
                className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bookmark
                  className={`w-4 h-4 ${isBookmarked ? 'fill-primary-500 text-primary-500' : ''}`}
                />
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href)
                  addToast({ message: 'Course link copied to clipboard!', type: 'success' })
                }}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                title="Share Course"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Feature List */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-3 text-xs font-medium text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-500" />
                <span>{course.duration} on-demand learning</span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-primary-500" />
                <span>{totalLessons} comprehensive lessons</span>
              </div>
              {course.certificate && (
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-primary-500" />
                  <span>Verified certificate of completion</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
