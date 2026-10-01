import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import KnowledgeGraphVisualizer from '../components/KnowledgeGraphVisualizer'
import { studyPlannerService, type CreateTaskRequest } from '../services/studyPlannerService'
import { studyGoalsService } from '../services/studyGoalsService'
import { useStore } from '../stores/useStore'

function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880, now + 0.15) // A5

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.6)
  } catch {
    // fallback
  }
}

export default function StudyPlannerPage() {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all')
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus')
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()
  const pomodoroTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const syncUpdate = searchParams.get('syncUpdate')
  const syncTitle = searchParams.get('title')
  const syncDeadline = searchParams.get('deadline')
  const syncInstitution = searchParams.get('institution')

  // Task creation modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskDuration, setNewTaskDuration] = useState(45)
  const [newTaskType, setNewTaskType] = useState<CreateTaskRequest['task_type']>('assignment')

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskRequest) => studyPlannerService.createTask(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['study', 'tasks'] })
      addToast({ message: 'Study task added to schedule!', type: 'success' })
      setIsCreateTaskModalOpen(false)
      setNewTaskTitle('')
    },
    onError: () => addToast({ message: 'Failed to create study task', type: 'error' }),
  })

  // Auto-sync notice deadline when arriving via URL parameters
  const syncedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!syncUpdate && !syncTitle) return
    const syncKey = syncUpdate || syncTitle
    if (syncedRef.current === syncKey) return
    syncedRef.current = syncKey

    const title = syncTitle || `[${syncInstitution || 'Exam Notice'}] Preparation Task`
    const scheduledDate = syncDeadline
      ? new Date(syncDeadline).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    const importTask = async () => {
      try {
        await studyPlannerService.createTask({
          title,
          description: `Imported from verified student update circular.`,
          task_type: 'assignment',
          scheduled_date: scheduledDate,
          priority: 'high',
          duration_minutes: 60,
        })
        void queryClient.invalidateQueries({ queryKey: ['study', 'tasks'] })
        addToast({
          message: `🎯 Synced "${title}" deadline into Study Planner!`,
          type: 'success',
        })
        setSearchParams({}, { replace: true })
      } catch {
        addToast({
          message: 'Could not auto-sync notice to study tasks.',
          type: 'error',
        })
      }
    }
    void importTask()
  }, [syncUpdate, syncTitle, syncDeadline, syncInstitution, addToast, queryClient, setSearchParams])

  useEffect(() => {
    if (isPomodoroRunning) {
      pomodoroTimerRef.current = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            playChime()
            setIsPomodoroRunning(false)
            if (pomodoroMode === 'focus') {
              setPomodoroMode('break')
              addToast({ message: '🎯 Focus session complete! Take a 5m break.', type: 'success' })
              return 5 * 60
            } else {
              setPomodoroMode('focus')
              addToast({ message: '⚡ Break over! Ready to focus?', type: 'info' })
              return 25 * 60
            }
          }
          return prev - 1
        })
      }, 1000)
    } else if (pomodoroTimerRef.current) {
      clearInterval(pomodoroTimerRef.current)
    }
    return () => {
      if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current)
    }
  }, [isPomodoroRunning, pomodoroMode, addToast])

  const formatPomoTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Goals Query
  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    isError: isGoalsError,
    error: goalsError,
    refetch: refetchGoals,
  } = useQuery({
    queryKey: ['study', 'goals'],
    queryFn: () => studyGoalsService.getGoals().then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Tasks Query
  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['study', 'tasks', filter],
    queryFn: async () => {
      let res
      if (filter === 'today') res = await studyPlannerService.getTodayTasks()
      else if (filter === 'upcoming') res = await studyPlannerService.getUpcomingTasks()
      else res = await studyPlannerService.getTasks()

      // Filter out completed client-side if it's 'all' or 'today' etc?
      // Actually backend just returns them. If filter is 'completed', we filter client side if backend doesn't support it,
      // but let's assume backend returns all and we can filter, or backend handles it.
      const data = res.data
      if (filter === 'completed') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.filter((t: any) => t.status === 'completed')
      }
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studyPlannerService.deleteTask(id),
    onSuccess: (_, deletedId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['study', 'tasks', filter], (old: any) =>
        Array.isArray(old) ? old.filter(t => t.id !== deletedId) : old
      )
      void queryClient.invalidateQueries({ queryKey: ['study', 'tasks'] })
      addToast({ message: 'Task purged from schedule', type: 'success' })
    },
    onError: () => addToast({ message: 'Neural command failed', type: 'error' }),
  })

  // Toggle Task Mutation
  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; newStatus: 'pending' | 'completed' }) => {
      if (data.newStatus === 'completed') {
        return studyPlannerService.completeTask(data.id)
      } else {
        return studyPlannerService.updateTask(data.id, { status: data.newStatus } as unknown as {
          status: 'pending' | 'completed'
        } & Partial<CreateTaskRequest>)
      }
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['study', 'tasks', filter] })
      const previousTasks = queryClient.getQueryData(['study', 'tasks', filter])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['study', 'tasks', filter], (old: any) =>
        Array.isArray(old) ? old.map(t => (t.id === id ? { ...t, status: newStatus } : t)) : old
      )
      return { previousTasks }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['study', 'tasks', filter], context.previousTasks)
      }
      addToast({ message: 'Failed to sync with server', type: 'error' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['study', 'tasks'] })
    },
  })

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }

  const toggleTask = (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    toggleMutation.mutate({ id, newStatus })
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-100 dark:border-rose-800'
      case 'medium':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800'
      case 'low':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:border-gray-700'
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

  return (
    <AnimatedPage className="space-y-8 pb-12 pt-4">
      <SEO title="Study Planner - Strategic Hub" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-gray-900 dark:bg-gray-800 flex items-center justify-center shadow-xl shadow-gray-200 dark:shadow-none">
            <Calendar className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none text-gray-900 dark:text-white uppercase">
              Strategy Planner
            </h1>
            <p className="text-gray-500 font-bold mt-2 text-sm uppercase tracking-widest">
              Orchestrate your cognitive trajectory
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="rounded-2xl font-black shadow-xl shadow-primary-500/30 hover:scale-105 transition-transform"
          leftIcon={<Plus className="w-5 h-5" />}
        >
          New Protocol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Goals */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white overflow-hidden relative group rounded-3xl">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform duration-500">
              <Flame className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                Weekly Momentum
              </p>
              <h3 className="text-5xl font-black tabular-nums">
                12.5h <span className="text-2xl opacity-60">/ 20h</span>
              </h3>
              <div className="flex items-center gap-2 mt-6 bg-white/20 w-max px-3 py-1.5 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold">+2.4h vs last cycle</span>
              </div>
              <div className="mt-8 h-3 bg-white/20 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '62.5%' }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          </Card>

          {/* Pomodoro Focus Station */}
          <Card className="p-6 border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" /> Focus Engine
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  pomodoroMode === 'focus'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                }`}
              >
                {pomodoroMode === 'focus' ? 'Deep Work' : 'Break'}
              </span>
            </div>

            <div className="text-center py-2">
              <div className="text-4xl font-black font-mono tracking-tight text-gray-900 dark:text-white">
                {formatPomoTime(pomodoroSeconds)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {pomodoroMode === 'focus' ? '25 min focus interval' : '5 min rest interval'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isPomodoroRunning ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                className="flex-1 rounded-xl text-xs font-bold"
                leftIcon={
                  isPomodoroRunning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )
                }
              >
                {isPomodoroRunning ? 'Pause' : 'Start Focus'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPomodoroRunning(false)
                  setPomodoroSeconds(pomodoroMode === 'focus' ? 25 * 60 : 5 * 60)
                }}
                className="rounded-xl px-3"
                title="Reset timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>

          <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-3">
              <Target className="w-5 h-5 text-primary-500" /> Neural Goals
            </h3>
            <div className="space-y-8">
              {isGoalsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))
              ) : isGoalsError ? (
                <ErrorState
                  title="Failed to Load Goals"
                  message={goalsError?.message ?? 'Could not load your goals.'}
                  onRetry={() => void refetchGoals()}
                  showHome={false}
                />
              ) : goals.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                goals.map((goal: any) => (
                  <div key={goal.id} className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                          {goal.title}
                        </p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                          Expires: {goal.deadline}
                        </p>
                      </div>
                      <span className="text-xs font-black tabular-nums text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-md">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress}%` }}
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm font-bold text-gray-500">
                  No active goals found.
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-8 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Modify Targets
            </Button>
          </Card>
        </div>

        {/* Right Column: Tasks Command Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Card className="flex-1 p-2 border-none shadow-md bg-white dark:bg-gray-900 rounded-2xl">
              <div className="flex flex-wrap md:flex-nowrap bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl gap-1">
                {(['all', 'today', 'upcoming', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                      filter === f
                        ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Card>
            <Button
              onClick={() => setIsCreateTaskModalOpen(true)}
              variant="primary"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </Button>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {isTasksLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <Skeleton key={i} className="h-32 w-full rounded-3xl" />
              ))
            ) : isTasksError ? (
              <Card className="p-12 text-center border-none shadow-sm bg-white dark:bg-gray-900/50 rounded-3xl">
                <ErrorState
                  title="Failed to Load Tasks"
                  message={tasksError?.message ?? 'Could not load your tasks.'}
                  onRetry={() => void refetchTasks()}
                  showHome={false}
                />
              </Card>
            ) : tasks.length === 0 ? (
              <Card className="p-20 text-center border-none shadow-sm bg-white dark:bg-gray-900/50 rounded-3xl">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-3">
                  Neural Workspace Clear
                </h3>
                <p className="text-gray-500 font-medium text-sm max-w-sm mx-auto leading-relaxed">
                  All protocols executed for this view. Initialize new study tasks to continue
                  trajectory.
                </p>
                <Button
                  onClick={() => setIsCreateTaskModalOpen(true)}
                  variant="outline"
                  className="mt-8 rounded-xl font-black uppercase tracking-widest border-2"
                >
                  Add Protocol
                </Button>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                {tasks.map((task: any, idx: number) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`p-6 border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white dark:bg-gray-900 rounded-3xl ${task.status === 'completed' ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}
                      onClick={e => toggleTask(task.id, task.status, e)}
                    >
                      <div className="flex items-center gap-6">
                        <div
                          className={`w-12 h-12 rounded-[1.25rem] border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                            task.status === 'completed'
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : 'border-gray-200 dark:border-gray-700 text-transparent group-hover:border-primary-500/50 group-hover:bg-primary-50/50 dark:group-hover:bg-primary-900/10'
                          }`}
                        >
                          <CheckCircle className="w-6 h-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4
                                className={`text-lg font-black tracking-tight truncate transition-colors ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white group-hover:text-primary-600'}`}
                              >
                                {task.title}
                              </h4>
                              {task.course && (
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 mt-2 flex items-center gap-1.5">
                                  <Layers className="w-3 h-3" /> {task.course.title}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-blue-500 transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={e => handleDeleteTask(task.id, e)}
                                className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-gray-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-5">
                            <span
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getPriorityStyles(task.priority)}`}
                            >
                              {task.priority} Priority
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{formatDate(task.scheduled_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
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

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        title="Add Study Task / Goal"
        description="Schedule a focused preparation protocol or assignment."
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!newTaskTitle.trim()) return
            createTaskMutation.mutate({
              title: newTaskTitle.trim(),
              task_type: newTaskType,
              scheduled_date: newTaskDate,
              priority: newTaskPriority,
              duration_minutes: newTaskDuration,
            })
          }}
          className="space-y-4 py-2"
        >
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1.5">
              Task Title *
            </label>
            <Input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Revise Computer Networks Chapter 3"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1.5">
                Scheduled Date
              </label>
              <Input
                type="date"
                value={newTaskDate}
                onChange={e => setNewTaskDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1.5">
                Duration (mins)
              </label>
              <Input
                type="number"
                min="15"
                step="15"
                value={newTaskDuration}
                onChange={e => setNewTaskDuration(Number(e.target.value) || 45)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1.5">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-1.5">
                Category
              </label>
              <select
                value={newTaskType}
                onChange={e => setNewTaskType(e.target.value as CreateTaskRequest['task_type'])}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold outline-none"
              >
                <option value="assignment">Assignment / Exam</option>
                <option value="review">Revision</option>
                <option value="reading">Reading Ebook</option>
                <option value="practice">Practice MCQs</option>
                <option value="video">Video Lecture</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateTaskModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
            >
              {createTaskMutation.isPending ? 'Saving...' : 'Add to Schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Neural Concept Knowledge Graph Visualizer */}
      <KnowledgeGraphVisualizer />
    </AnimatedPage>
  )
}
