import { prisma } from '../prismaClient'

export interface StudyTask {
  id: string
  title: string
  description?: string
  course?: {
    id: string
    title: string
  }
  task_type: 'reading' | 'video' | 'quiz' | 'assignment' | 'practice' | 'review'
  scheduled_date: string
  scheduled_time?: string
  duration_minutes: number
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface StudySchedule {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  daily_goal_minutes: number
  preferred_study_times: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StudyGoal {
  id: string
  title: string
  target: string
  deadline: string
  progress: number
  color: string
  description?: string
  category?: string
  created_at?: string
  updated_at?: string
}

const mockTasks: Map<string, StudyTask[]> = new Map()
const mockSchedules: Map<string, StudySchedule> = new Map()
const mockGoals: Map<string, StudyGoal[]> = new Map()

// Helper to seed initial user tasks
function getUserTasks(userId: string): StudyTask[] {
  if (!mockTasks.has(userId)) {
    const today = new Date().toISOString().split('T')[0]
    mockTasks.set(userId, [
      {
        id: `task-${Date.now()}-1`,
        title: 'Master Binary Search on Answer',
        description:
          'Solve 3 advanced problems on finding minimum maximums and predicate functions',
        task_type: 'practice',
        scheduled_date: today,
        scheduled_time: '10:00 AM',
        duration_minutes: 45,
        priority: 'high',
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `task-${Date.now()}-2`,
        title: 'Organic Chemistry Revision: Aldehydes & Ketones',
        description: 'Review Nucleophilic Addition reactions, Cannizzaro and Aldol condensations',
        task_type: 'review',
        scheduled_date: today,
        scheduled_time: '02:30 PM',
        duration_minutes: 60,
        priority: 'medium',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `task-${Date.now()}-3`,
        title: 'Physics Mock Test: Electrostatics & Current Electricity',
        description: 'Timed full-length sectional test with immediate AI breakdown',
        task_type: 'quiz',
        scheduled_date: today,
        scheduled_time: '06:00 PM',
        duration_minutes: 90,
        priority: 'high',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }
  return mockTasks.get(userId)!
}

function getUserGoals(userId: string): StudyGoal[] {
  if (!mockGoals.has(userId)) {
    const nextMonth = new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0]
    mockGoals.set(userId, [
      {
        id: `goal-${Date.now()}-1`,
        title: 'Solve 100 LeetCode / DSA Problems',
        target: '100 Problems',
        deadline: nextMonth,
        progress: 68,
        color: '#3b82f6',
        description: 'Focus on Graphs, Dynamic Programming, and Trees',
        category: 'Algorithms',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `goal-${Date.now()}-2`,
        title: 'Complete Full Syllabus Mock Series',
        target: '15 Mocks',
        deadline: nextMonth,
        progress: 40,
        color: '#10b981',
        description: 'Score above 85% in all test series',
        category: 'Exams',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `goal-${Date.now()}-3`,
        title: 'Maintain 30-Day Learning Streak',
        target: '30 Days',
        deadline: nextMonth,
        progress: 80,
        color: '#f59e0b',
        description: 'Study at least 60 minutes daily',
        category: 'Habits',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }
  return mockGoals.get(userId)!
}

export class StudyPlannerService {
  async getTasks(
    userId: string,
    filters?: { date?: string; status?: string }
  ): Promise<StudyTask[]> {
    let tasks = getUserTasks(userId)
    if (filters?.date) {
      tasks = tasks.filter(t => t.scheduled_date === filters.date)
    }
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status)
    }
    return tasks
  }

  async getTodayTasks(userId: string): Promise<StudyTask[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getTasks(userId, { date: today })
  }

  async getUpcomingTasks(userId: string): Promise<StudyTask[]> {
    const today = new Date().toISOString().split('T')[0]
    const tasks = getUserTasks(userId)
    return tasks.filter(t => t.scheduled_date >= today && t.status !== 'completed')
  }

  async createTask(userId: string, input: Partial<StudyTask>): Promise<StudyTask> {
    const tasks = getUserTasks(userId)
    const newTask: StudyTask = {
      id: `task-${Date.now()}`,
      title: input.title || 'Study Session',
      description: input.description,
      task_type: input.task_type || 'practice',
      scheduled_date: input.scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: input.scheduled_time,
      duration_minutes: input.duration_minutes || 45,
      priority: input.priority || 'medium',
      status: 'pending',
      notes: input.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    tasks.unshift(newTask)
    return newTask
  }

  async updateTask(
    userId: string,
    taskId: string,
    input: Partial<StudyTask>
  ): Promise<StudyTask | null> {
    const tasks = getUserTasks(userId)
    const task = tasks.find(t => t.id === taskId)
    if (!task) return null

    Object.assign(task, input, { updated_at: new Date().toISOString() })
    return task
  }

  async completeTask(userId: string, taskId: string, notes?: string): Promise<StudyTask | null> {
    const tasks = getUserTasks(userId)
    const task = tasks.find(t => t.id === taskId)
    if (!task) return null

    task.status = 'completed'
    task.completed_at = new Date().toISOString()
    task.updated_at = new Date().toISOString()
    if (notes) task.notes = notes

    // Update DailyGoal in database if exists
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      await prisma.dailyGoal.upsert({
        where: { userId_date: { userId, date: today } },
        update: { completedMinutes: { increment: task.duration_minutes } },
        create: { userId, date: today, targetMinutes: 60, completedMinutes: task.duration_minutes },
      })
    } catch {
      // ignore
    }

    return task
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const tasks = getUserTasks(userId)
    const index = tasks.findIndex(t => t.id === taskId)
    if (index === -1) return false
    tasks.splice(index, 1)
    return true
  }

  async getSchedule(userId: string): Promise<StudySchedule> {
    if (!mockSchedules.has(userId)) {
      mockSchedules.set(userId, {
        id: `sched-${userId}`,
        title: 'Ultimate Exam Mastery Routine',
        description: 'High-intensity morning practice and evening mock tests',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 3600000).toISOString().split('T')[0],
        daily_goal_minutes: 120,
        preferred_study_times: ['08:00 - 10:00', '16:00 - 18:00', '20:00 - 22:00'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    return mockSchedules.get(userId)!
  }

  async updateSchedule(userId: string, input: Partial<StudySchedule>): Promise<StudySchedule> {
    const schedule = await this.getSchedule(userId)
    Object.assign(schedule, input, { updated_at: new Date().toISOString() })
    mockSchedules.set(userId, schedule)
    return schedule
  }

  async getProgress(
    userId: string,
    days = 7
  ): Promise<
    {
      date: string
      total_minutes: number
      tasks_completed: number
      tasks_total: number
      streak_days: number
    }[]
  > {
    const results = []
    const now = Date.now()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().split('T')[0]
      results.push({
        date: d,
        total_minutes: 45 + Math.floor(Math.sin(i) * 30 + 40),
        tasks_completed: 2 + (i % 3),
        tasks_total: 4,
        streak_days: 7 - i,
      })
    }
    return results
  }

  // Goals
  async getGoals(userId: string, category?: string): Promise<StudyGoal[]> {
    let goals = getUserGoals(userId)
    if (category) {
      goals = goals.filter(g => g.category?.toLowerCase() === category.toLowerCase())
    }
    return goals
  }

  async getGoal(userId: string, goalId: string): Promise<StudyGoal | null> {
    const goals = getUserGoals(userId)
    return goals.find(g => g.id === goalId) || null
  }

  async createGoal(userId: string, input: Partial<StudyGoal>): Promise<StudyGoal> {
    const goals = getUserGoals(userId)
    const newGoal: StudyGoal = {
      id: `goal-${Date.now()}`,
      title: input.title || 'Master New Topic',
      target: input.target || '100%',
      deadline: input.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      progress: input.progress || 0,
      color: input.color || '#3b82f6',
      description: input.description,
      category: input.category || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    goals.unshift(newGoal)
    return newGoal
  }

  async updateGoal(
    userId: string,
    goalId: string,
    input: Partial<StudyGoal>
  ): Promise<StudyGoal | null> {
    const goals = getUserGoals(userId)
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return null
    Object.assign(goal, input, { updated_at: new Date().toISOString() })
    return goal
  }

  async updateGoalProgress(
    userId: string,
    goalId: string,
    progress: number
  ): Promise<StudyGoal | null> {
    return this.updateGoal(userId, goalId, { progress: Math.min(100, Math.max(0, progress)) })
  }

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    const goals = getUserGoals(userId)
    const index = goals.findIndex(g => g.id === goalId)
    if (index === -1) return false
    goals.splice(index, 1)
    return true
  }
}

export const studyPlannerService = new StudyPlannerService()
