import { Router, Request, Response } from 'express'
import { courseService } from '../../services/CourseService'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncHandler } from '../../utils/errorHandler'
import { sendSuccess, sendError, sendNotFound } from '../../utils/responseHelper'

const router = Router()

// GET /api/v1/courses (course listing)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const results = await courseService.getCourses(req.query)
    sendSuccess(res, results.data, undefined, 200, results.meta)
  })
)

// POST /api/v1/courses/enroll (enrollment)
// Needs to be before /:id so 'enroll' isn't treated as an id
router.post(
  '/enroll',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.body
    if (!courseId) {
      sendError(res, 'courseId is required', 400)
      return
    }
    const result = await courseService.enroll(req.user?.userId, courseId)
    sendSuccess(res, result, result.message)
  })
)

// GET /api/v1/courses/:id (course detail)
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string
    const course = await courseService.getCourse(id)
    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }
    sendSuccess(res, course)
  })
)

export default router
