import { Router } from 'express'
import {
  listStudyGroups,
  getStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  createStudyGroup,
} from '../../controllers/studyGroupController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listStudyGroups)
router.post('/', optionalAuth, createStudyGroup)
router.get('/:id', optionalAuth, getStudyGroup)
router.post('/:id/join', optionalAuth, joinStudyGroup)
router.post('/:id/leave', optionalAuth, leaveStudyGroup)

export default router
