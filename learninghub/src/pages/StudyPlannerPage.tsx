import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Target,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Flame,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  studyPlannerService,
  type StudyTask,
  type CreateTaskRequest,
} from '../services/studyPlannerService'
import { studyGoalsService, type StudyGoal } from '../services/studyGoalsService'
import { useStore } from '../stores/useStore'

export default function StudyPlannerPage() {
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [_isGoalsLoading, setIsGoalsLoading] = useState(true)
  const [_goalsError, setGoalsError] = useState<string | null>(null)
  const { addToast } = useStore()

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      let res
      if (filter === 'today') {
        res = await studyPlannerService.getTodayTasks()
      } else if (filter === 'upcoming') {
        res = await studyPlannerService.getUpcomingTasks()
      } else {
        res = await studyPlannerService.getTasks()
      }
      setTasks(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[StudyPlannerPage] Failed to fetch tasks:', err)
      }
      // Mock for development if needed
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  // Fetch goals from API
  const fetchGoals = useCallback(async () => {
    try {
      setIsGoalsLoading(true)
      setGoalsError(null)
      const res = await studyGoalsService.getGoals()
      setGoals(res.data)
    } catch (err) {
      setGoalsError('Failed to load goals')
      if (import.meta.env.DEV) {
        console.error('[StudyPlannerPage] Failed to fetch goals:', err)
      }
      // Fallback: keep empty array
      setGoals([])
    } finally {
      setIsGoalsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTasks()
    void fetchGoals()
  }, [fetchTasks, fetchGoals])

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await studyPlannerService.deleteTask(id)
      addToast({ message: 'Task purged from schedule', type: 'success' })
      void fetchTasks()
    } catch {
      addToast({ message: 'Neural command failed', type: 'error' })
    }
  }

  const toggleTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const newStatus = task.status === 'completed' ? 'pending' : 'completed'

    // Optimistic UI update
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus as 'pending' | 'completed' } : t))
    )

    try {
      if (newStatus === 'completed') {
        await studyPlannerService.completeTask(id)
      } else {
        await studyPlannerService.updateTask(id, {
          status: newStatus,
        } as unknown as { status: 'pending' | 'completed' } & Partial<CreateTaskRequest>)
      }
      addToast({ message: 'Neural state updated', type: 'success' })
    } catch (err) {
      // Revert optimistic update on failure
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: task.status } : t)))
      addToast({ message: 'Failed to sync with server', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[StudyPlannerPage] toggleTask error:', err)
      }
    }
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800'
      case 'medium':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800'
      case 'low':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100'
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Goals now fetched from API via fetchGoals

  return (
    <AnimatedPage className="space-y-8 pb-12">
      <SEO title="Study Planner - Strategic Hub" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-gray-900 flex items-center justify-center shadow-2xl">
            <Calendar className="w-7 h-7 text-primary-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none text-gray-900 dark:text-white">
              Strategy Planner
            </h1>
            <p className="text-gray-500 font-medium mt-2">Orchestrate your cognitive trajectory</p>
          </div>
        </div>
        <Button
          size="lg"
          className="rounded-2xl font-black shadow-xl shadow-primary-500/20"
          leftIcon={<Plus className="w-5 h-5" />}
        >
          New Study Protocol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Goals */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform">
              <Flame className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                Weekly Momentum
              </p>
              <h3 className="text-4xl font-black mt-2 mb-1">
                12.5h <span className="text-xl opacity-60">/ 20h</span>
              </h3>
              <div className="flex items-center gap-2 mt-6">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold">+2.4h vs last cycle</span>
              </div>
              <div className="mt-8 h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '62.5%' }}
                  className="h-full bg-white"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-white dark:bg-gray-900">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" /> Neural Goals
            </h3>
            <div className="space-y-8">
              {goals.map(goal => (
                <div key={goal.id} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                        {goal.title}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">
                        Expires: {goal.deadline}
                      </p>
                    </div>
                    <span className="text-xs font-black tabular-nums text-primary-500">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      className="h-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-6 rounded-xl font-bold text-xs uppercase tracking-widest"
            >
              Modify Targets
            </Button>
          </Card>
        </div>

        {/* Right Column: Tasks Command Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card className="p-4 border-none shadow-sm bg-white dark:bg-gray-900/50 backdrop-blur-md">
            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl">
              {(['all', 'today', 'upcoming', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f
                      ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-md'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-24 w-full bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-[2rem]"
                />
              ))
            ) : tasks.length === 0 ? (
              <Card className="p-20 text-center border-none shadow-sm bg-white dark:bg-gray-900/30">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                  Neural Workspace Clear
                </h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
                  All protocols executed. Initialize new study tasks to continue trajectory.
                </p>
                <Button variant="outline" className="mt-8 rounded-xl font-bold border-2">
                  Add Protocol
                </Button>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                {tasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`p-6 border-none shadow-sm hover:shadow-xl transition-all cursor-pointer group bg-white dark:bg-gray-900/80 ${task.status === 'completed' ? 'opacity-50 grayscale' : ''}`}
                      onClick={e => toggleTask(task.id, e)}
                    >
                      <div className="flex items-center gap-6">
                        <div
                          className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all ${
                            task.status === 'completed'
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-200 dark:border-gray-700 text-transparent group-hover:border-primary-500'
                          }`}
                        >
                          <CheckCircle className="w-6 h-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4
                                className={`text-lg font-bold tracking-tight truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
                              >
                                {task.title}
                              </h4>
                              {task.course && (
                                <p className="text-[10px] font-black uppercase text-primary-500 mt-1 flex items-center gap-1.5">
                                  <Layers className="w-3 h-3" /> {task.course.title}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={e => handleDeleteTask(task.id, e)}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-gray-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mt-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getPriorityStyles(task.priority)}`}
                            >
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(task.scheduled_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{task.duration_minutes}m Session</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
