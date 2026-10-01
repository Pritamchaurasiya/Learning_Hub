import { Request, Response } from 'express'
import { studyPlannerService } from '../services/StudyPlannerService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound } from '../utils/responseHelper'

// Tasks
export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const { date, status } = req.query
  const data = await studyPlannerService.getTasks(userId, {
    date: date as string,
    status: status as string,
  })
  sendSuccess(res, data, undefined, 200, { count: data.length })
})

export const getTodayTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const data = await studyPlannerService.getTodayTasks(userId)
  sendSuccess(res, data, undefined, 200, { count: data.length })
})

export const getUpcomingTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const data = await studyPlannerService.getUpcomingTasks(userId)
  sendSuccess(res, data, undefined, 200, { count: data.length })
})

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const task = await studyPlannerService.createTask(userId, req.body)
  sendSuccess(res, task, 'Task created successfully', 201)
})

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const task = await studyPlannerService.updateTask(userId, id, req.body)
  if (!task) {
    sendNotFound(res, 'Study task not found')
    return
  }
  sendSuccess(res, task, 'Task updated successfully')
})

export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const notes = req.body?.notes
  const task = await studyPlannerService.completeTask(userId, id, notes)
  if (!task) {
    sendNotFound(res, 'Study task not found')
    return
  }
  sendSuccess(res, task, 'Task marked as completed')
})

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const deleted = await studyPlannerService.deleteTask(userId, id)
  if (!deleted) {
    sendNotFound(res, 'Study task not found')
    return
  }
  sendSuccess(res, { deleted: true }, 'Task deleted successfully')
})

// Schedule
export const getMySchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const schedule = await studyPlannerService.getSchedule(userId)
  sendSuccess(res, schedule)
})

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const schedule = await studyPlannerService.updateSchedule(userId, req.body)
  sendSuccess(res, schedule, 'Schedule updated successfully')
})

export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7
  const progress = await studyPlannerService.getProgress(userId, days)
  sendSuccess(res, progress)
})

// Goals
export const listGoals = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const category = req.query.category as string
  const goals = await studyPlannerService.getGoals(userId, category)
  sendSuccess(res, goals, undefined, 200, { count: goals.length })
})

export const getGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const id = req.params.id as string
  const goal = await studyPlannerService.getGoal(userId, id)
  if (!goal) {
    sendNotFound(res, 'Study goal not found')
    return
  }
  sendSuccess(res, goal)
})

export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const goal = await studyPlannerService.createGoal(userId, req.body)
  sendSuccess(res, goal, 'Goal created successfully', 201)
})

export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const goal = await studyPlannerService.updateGoal(userId, id, req.body)
  if (!goal) {
    sendNotFound(res, 'Study goal not found')
    return
  }
  sendSuccess(res, goal, 'Goal updated successfully')
})

export const updateGoalProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const progress = typeof req.body.progress === 'number' ? req.body.progress : 0
  const goal = await studyPlannerService.updateGoalProgress(userId, id, progress)
  if (!goal) {
    sendNotFound(res, 'Study goal not found')
    return
  }
  sendSuccess(res, goal, 'Goal progress updated')
})

export const deleteGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const id = req.params.id as string
  const deleted = await studyPlannerService.deleteGoal(userId, id)
  if (!deleted) {
    sendNotFound(res, 'Study goal not found')
    return
  }
  sendSuccess(res, { deleted: true }, 'Goal deleted successfully')
})
