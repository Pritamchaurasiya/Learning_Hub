import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import {
  BookOpen,
  Trophy,
  Target,
  Zap,
  Flame,
  ArrowRight,
  GraduationCap,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Plus
} from 'lucide-react'
import { homeService, type DashboardStats, type UserProgress } from '../services/homeService'
import { userService, type Achievement } from '../services/userService'
import { CourseCardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { CourseCard } from '../components/ui/CourseCard'
import { StatCard } from '../components/ui/StatCard'

export default function HomePage() {
  const navigate = useNavigate()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    enrolled_courses: 0,
    completed_courses: 0,
    hours_spent: 0,
    current_streak: 0,
    xp_points: 0,
    level: 1,
    next_level_xp: 100
  })

  const [phases, setPhases] = useState<any[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [recentProgress, setRecentProgress] = useState<UserProgress[]>([])

  const fetchHomeData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [homeData, achievementsData] = await Promise.all([
        homeService.getHomeData(),
        userService.getAchievements()
      ])
      setStats(homeData.stats)
      setAchievements(achievementsData.data)
      setRecentProgress(homeData.recent_progress)

      // Map featured courses to phases
      const updatedPhases = [
        { id: '1', name: 'Phase 1: Fundamentals', color: '#3b82f6', courses: homeData.featured_courses.slice(0, 3).map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration: c.duration,
          level: c.level
        })) },
        { id: '2', name: 'Phase 2: Frontend', color: '#8b5cf6', courses: homeData.featured_courses.slice(3, 6).map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration: c.duration,
          level: c.level
        })) },
        { id: '3', name: 'Phase 3: Backend', color: '#10b981', courses: homeData.featured_courses.slice(6, 9).map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration: c.duration,
          level: c.level
        })) },
        { id: '4', name: 'Phase 4: Advanced', color: '#f59e0b', courses: homeData.featured_courses.slice(9, 12).map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          duration: c.duration,
          level: c.level
        })) },
      ]
      setPhases(updatedPhases)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard. Please try again.')
      if (import.meta.env.DEV) {
        console.error('[HomePage] Failed to fetch home data:', err);
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHomeData()
  }, [fetchHomeData])

  const derivedStats = useMemo(() => {
    const completedCount = stats.completed_courses
    const totalCount = stats.enrolled_courses
    const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    
    // Get current course from recent progress
    const currentCourse = recentProgress.length > 0 ? {
      id: recentProgress[0].course_id,
      title: recentProgress[0].course_title,
      progress: recentProgress[0].progress_percent
    } : null
    
    return {
      completedCount,
      totalCount,
      overallProgress,
      currentCourse
    }
  }, [stats, recentProgress])

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-72 md:h-96 w-full rounded-3xl bg-gray-100 dark:bg-gray-800/50 animate-pulse relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 w-64 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse" />
            <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <CourseCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchHomeData}
          className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="space-y-10 pb-12">
      <SEO />
      
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-purple-600 to-indigo-600 text-white p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl shadow-primary-500/20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-24 -right-24 w-[30rem] h-[30rem] rounded-full bg-white/5 blur-[100px]"
            animate={{
              x: [0, 40, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 -left-24 w-[25rem] h-[25rem] rounded-full bg-indigo-400/10 blur-[100px]"
            animate={{
              x: [0, -30, 0],
              y: [0, 40, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="relative z-10 max-w-4xl">
          <motion.div 
            className="flex items-center gap-2.5 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/90">Personal Learning Hub</span>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Master Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-100 to-indigo-200">
              Future Today.
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            A personalized engineering path designed for the next generation of software experts.
            Scale your skills from zero to enterprise-grade.
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {derivedStats.currentCourse ? (
              <motion.div 
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 flex-1 w-full sm:w-auto shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Resume Study</p>
                    <p className="font-bold truncate max-w-[200px] text-lg">{derivedStats.currentCourse.title}</p>
                  </div>
                  <motion.button
                    onClick={() => navigate(`/course/${derivedStats.currentCourse?.id}`)}
                    className="w-12 h-12 bg-white text-primary-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white" 
                      initial={{ width: 0 }}
                      animate={{ width: `${derivedStats.currentCourse.progress}%` }}
                      transition={{ delay: 1, duration: 1 }}
                    />
                  </div>
                  <span className="text-[10px] font-black tabular-nums">{derivedStats.currentCourse.progress}%</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 flex items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="w-14 h-14 bg-emerald-400/20 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-emerald-300" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">All Paths Completed!</p>
                  <p className="text-sm text-white/70">You're ready for new challenges.</p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col items-center gap-1 shrink-0 px-4">
              <div className="text-4xl font-black">{Math.round(derivedStats.overallProgress)}%</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/60">Total Done</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Courses Done"
          value={stats.completed_courses}
          color="#10b981"
          delay={0}
          animated
        />
        <StatCard
          icon={Zap}
          label="XP Earned"
          value={stats.xp_points}
          color="#f59e0b"
          delay={100}
          animated
        />
        <StatCard
          icon={Trophy}
          label="Current Level"
          value={stats.level}
          color="#8b5cf6"
          delay={200}
          animated
        />
        <StatCard
          icon={Flame}
          label="Daily Streak"
          value={stats.current_streak}
          color="#ef4444"
          delay={300}
          animated
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Goal & Recent */}
        <div className="lg:col-span-1 space-y-8">
          <section className="card-static p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="font-bold text-base tracking-tight">Level Progress</h3>
              </div>
              <span className="text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">
                {stats.xp_points}/{stats.next_level_xp} XP
              </span>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.next_level_xp > 0 ? Math.min((stats.xp_points / stats.next_level_xp) * 100, 100) : 0}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                >
                  <div className="absolute inset-0 shimmer opacity-30" />
                </motion.div>
              </div>
              {stats.xp_points >= stats.next_level_xp ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30"
                >
                  <Sparkles className="w-4 h-4" /> 
                  <span>LEVEL UP! NEXT LEVEL UNLOCKED.</span>
                </motion.div>
              ) : (
                <p className="text-xs text-gray-500 font-medium">
                  Earn <span className="text-primary-600 font-bold">{stats.next_level_xp - stats.xp_points} more XP</span> to level up.
                </p>
              )}
            </div>
          </section>

          <section className="card-static p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-base mb-6 tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-500" />
              Achievements
            </h3>
            <div className="space-y-4">
              {achievements.slice(0, 3).map((ach) => (
              <motion.div
                key={ach.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-2xl border-2 transition-all duration-300 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50"
              >
                <div className="text-3xl mb-3">{ach.icon}</div>
                <h3 className="font-bold text-sm mb-1">{ach.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ach.description}</p>
                {ach.unlocked_at && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}
                  </p>
                )}
              </motion.div>
            ))}
              <button
                onClick={() => navigate('/achievements')}
                className="w-full py-3 text-xs font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
              >
                View All Achievements
              </button>
            </div>
          </section>
        </div>

        {/* Learning Path Main */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Learning Path</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Mastery Progress</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/search')}
                className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                Browse All <Search className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            <div className="space-y-12">
              {phases.map((phase, phaseIndex) => (
                <motion.div 
                  key={phase.id} 
                  className="space-y-6 relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: phaseIndex * 0.1 + 0.5 }}
                >
                  {phaseIndex < phases.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -mb-12" />
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg relative z-10"
                        style={{ backgroundColor: phase.color }}
                      >
                        {phaseIndex + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-0.5">
                          <h3 className="text-lg font-black tracking-tight">{phase.name}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {phase.courses.length} Courses
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-0 sm:pl-16">
                    {phase.courses.length > 0 ? (
                      phase.courses.slice(0, 2).map((course: any, idx: number) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          phaseColor={phase.color}
                          index={idx}
                        />
                      ))
                    ) : (
                      <div className="col-span-full py-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-center px-6">
                        <BookOpen className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                        <p className="text-sm font-bold text-gray-400">No courses available in this phase yet.</p>
                      </div>
                    )}
                    {phase.courses.length > 2 && (
                      <button
                        onClick={() => navigate('/search')}
                        className="flex items-center justify-center gap-3 group p-6 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800 hover:border-primary-500/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-400 group-hover:text-primary-600 transition-colors">
                          View {phase.courses.length - 2} More
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
               ))}
             </div>
           </section>
         </div>
       </div>
     </AnimatedPage>
  )
}

