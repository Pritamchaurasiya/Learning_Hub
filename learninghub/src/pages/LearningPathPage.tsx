import { useState } from 'react'
import {
  Route,
  MapPin,
  Clock,
  BookOpen,
  CheckCircle,
  Lock,
  Play,
  ChevronRight,
  Target,
  Award,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { learningPathService, type LearningPath } from '../services/learningPathService'
import { useStore } from '../stores/useStore'
import { Skeleton } from '../components/ui/Skeleton'

const levels = ['All', 'Beginner', 'Intermediate', 'Advanced']

export default function LearningPathPage() {
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [showEnrolled] = useState(false)
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  const {
    data: paths = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['learningPaths'],
    queryFn: async () => {
      const res = await learningPathService.getLearningPaths()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const enrollMutation = useMutation({
    mutationFn: (pathId: string) => learningPathService.enrollInPath(pathId),
    onSuccess: (_, pathId) => {
      addToast({ message: 'Successfully enrolled in curriculum path.', type: 'success' })
      queryClient.setQueryData(['learningPaths'], (old: LearningPath[] | undefined) => {
        if (!old) return old
        return old.map(p =>
          p.id === pathId ? { ...p, enrolled: true, progress: 0, completed_courses: 0 } : p
        )
      })
    },
    onError: () => {
      addToast({ message: 'Enrollment sequence failed.', type: 'error' })
    },
  })

  const filteredPaths = paths.filter(path => {
    const matchesLevel = selectedLevel === 'All' || path.level === selectedLevel
    const matchesEnrolled = !showEnrolled || path.enrolled
    return matchesLevel && matchesEnrolled
  })

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      case 'intermediate':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      case 'advanced':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    }
  }

  return (
    <AnimatedPage className="max-w-[1400px] mx-auto space-y-8 pb-12 pt-4 px-2">
      <SEO
        title="Learning Paths - LearningHub"
        description="Structured learning paths to achieve your career goals"
        keywords="learning paths, career, roadmap"
      />

      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.25rem] bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
            <Route className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Curriculum Paths
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              Structured roadmaps for career acceleration
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="max-w-md mx-auto p-12 text-center border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-900">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black mb-3 tracking-tight text-gray-900 dark:text-white uppercase">
            Fetch Failed
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
            {error instanceof Error ? error.message : 'Failed to retrieve learning paths.'}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['learningPaths'] })}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-96 rounded-[2.5rem] w-full" />
          ))}
        </div>
      ) : (
        !error && (
          <>
            {/* Filters */}
            <Card className="p-4 rounded-[2rem] border-none shadow-md bg-white dark:bg-gray-900">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between px-2">
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  {levels.map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedLevel === level
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-3 cursor-pointer group bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-xl w-full lg:w-auto transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative ${showEnrolled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showEnrolled ? 'left-5' : 'left-1'}`}
                    />
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Active Enrollments Only
                  </span>
                </label>
              </div>
            </Card>

            {/* Paths Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredPaths.map((path, idx) => (
                  <motion.div
                    key={path.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900 rounded-[2.5rem] group h-full flex flex-col">
                      {/* Header */}
                      <div className="h-40 bg-gray-900 dark:bg-gray-800 p-8 relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                          <Route className="w-40 h-40" />
                        </div>
                        <div className="relative z-10 flex items-start justify-between">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Route className="w-8 h-8 text-white" />
                          </div>
                          {path.enrolled && (
                            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md">
                              <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="mb-6 flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span
                              className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border ${getLevelColor(path.level)}`}
                            >
                              {path.level}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5" /> {path.duration}
                            </div>
                          </div>
                          <h3 className="font-black text-2xl text-gray-900 dark:text-white mb-3 tracking-tight group-hover:text-primary-600 transition-colors">
                            {path.title}
                          </h3>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                            {path.description}
                          </p>
                        </div>

                        {/* Skills */}
                        <div className="mb-8">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Core Competencies
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {path.skills.slice(0, 4).map(skill => (
                              <span
                                key={skill}
                                className="px-3 py-1.5 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg uppercase tracking-wider"
                              >
                                {skill}
                              </span>
                            ))}
                            {path.skills.length > 4 && (
                              <span className="px-3 py-1.5 text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg uppercase tracking-wider">
                                +{path.skills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats & Progress */}
                        <div className="mt-auto">
                          {path.enrolled ? (
                            <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl">
                              <div className="flex items-end justify-between">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                  {path.completed_courses}/{path.courses} Nodes Complete
                                </span>
                                <span className="text-xl font-black text-primary-600 tabular-nums leading-none">
                                  {path.progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${path.progress}%` }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                  className="bg-primary-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-[11px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary-500" />
                                <span>{path.courses} Course Nodes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span>Career Track</span>
                              </div>
                            </div>
                          )}

                          {/* Action */}
                          <div className="pt-6">
                            {path.enrolled ? (
                              <Button
                                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20"
                                rightIcon={<ChevronRight className="w-4 h-4" />}
                              >
                                Resume Trajectory
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                isLoading={enrollMutation.isPending}
                                onClick={() => enrollMutation.mutate(path.id)}
                                className="w-full py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px]"
                                leftIcon={<Lock className="w-4 h-4" />}
                              >
                                Unlock Protocol
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* No Paths */}
            {filteredPaths.length === 0 && (
              <Card className="p-20 text-center border-none shadow-xl bg-white dark:bg-gray-900 rounded-[3rem]">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Route className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-3">
                  No Trajectories Found
                </h3>
                <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                  No curriculum paths match your current filter parameters.
                </p>
              </Card>
            )}

            {/* Benefits Section */}
            <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-primary-600 to-indigo-800 text-white relative overflow-hidden mt-8">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Award className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <h3 className="font-black text-xl mb-8 flex items-center gap-3 uppercase tracking-tight">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <Award className="w-6 h-6" />
                  </div>
                  Strategic Advantages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: MapPin,
                      title: 'Structured Roadmap',
                      desc: 'Clear trajectory from novice to expert',
                      color: 'text-blue-400',
                      bg: 'bg-blue-500/20',
                    },
                    {
                      icon: Target,
                      title: 'Career Focused',
                      desc: 'Skills mapped directly to job requirements',
                      color: 'text-emerald-400',
                      bg: 'bg-emerald-500/20',
                    },
                    {
                      icon: Play,
                      title: 'Self-Paced Execution',
                      desc: 'Learn and adapt at your own velocity',
                      color: 'text-purple-400',
                      bg: 'bg-purple-500/20',
                    },
                  ].map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl ${b.bg} flex items-center justify-center shrink-0`}
                      >
                        <b.icon className={`w-6 h-6 ${b.color}`} />
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-widest text-xs mb-1.5">
                          {b.title}
                        </p>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-relaxed">
                          {b.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </>
        )
      )}
    </AnimatedPage>
  )
}
