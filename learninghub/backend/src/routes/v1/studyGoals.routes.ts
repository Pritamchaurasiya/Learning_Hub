import { Router } from 'express'
import {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
} from '../../controllers/studyPlannerController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listGoals)
router.get('/:id', optionalAuth, getGoal)
router.post('/', authenticate, createGoal)
router.put('/:id', authenticate, updateGoal)
router.post('/:id/progress', authenticate, updateGoalProgress)
router.delete('/:id', authenticate, deleteGoal)

export default router
