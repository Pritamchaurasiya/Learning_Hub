import { Router } from 'express'
import {
  listTasks,
  getTodayTasks,
  getUpcomingTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getMySchedule,
  updateSchedule,
  getProgress,
} from '../../controllers/studyPlannerController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

// Tasks
router.get('/tasks', optionalAuth, listTasks)
router.get('/tasks/today', optionalAuth, getTodayTasks)
router.get('/tasks/upcoming', optionalAuth, getUpcomingTasks)
router.post('/tasks', authenticate, createTask)
router.put('/tasks/:id', authenticate, updateTask)
router.patch('/tasks/:id', authenticate, updateTask)
router.post('/tasks/:id/complete', authenticate, completeTask)
router.delete('/tasks/:id', authenticate, deleteTask)

// Schedules
router.get('/schedules/my-schedule', optionalAuth, getMySchedule)
router.post('/schedules', authenticate, updateSchedule)
router.put('/schedules/:id', authenticate, updateSchedule)
router.patch('/schedules/:id', authenticate, updateSchedule)

// Progress
router.get('/progress', optionalAuth, getProgress)

export default router
