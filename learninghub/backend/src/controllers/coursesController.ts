import { Request, Response } from 'express'
import { PrismaClient, CoursePhase, DifficultyLevel } from '@prisma/client'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'
import { CourseService } from '../services/CourseService'

const courseService = new CourseService(prisma as PrismaClient)

const phaseMap: Record<string, string> = {
  foundation: 'FOUNDATION',
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  advanced: 'ADVANCED',
  expert: 'EXPERT',
}

const difficultyMap: Record<string, string> = {
  easy: 'BEGINNER',
  beginner: 'BEGINNER',
  medium: 'INTERMEDIATE',
  intermediate: 'INTERMEDIATE',
  hard: 'ADVANCED',
  advanced: 'ADVANCED',
  expert: 'EXPERT',
}

export const listCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phase, difficulty, category } = req.query
    const search = typeof req.query.search === 'string' ? req.query.search : req.query.q
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '20', 10)

    const filters = {
      phase:
        phase && typeof phase === 'string'
          ? (phaseMap[phase.toLowerCase()] as CoursePhase)
          : undefined,
      difficulty:
        difficulty && typeof difficulty === 'string'
          ? (difficultyMap[difficulty.toLowerCase()] as DifficultyLevel)
          : undefined,
      category: category && typeof category === 'string' ? category : undefined,
      search: search && typeof search === 'string' ? search : undefined,
      page,
      limit,
    }

    const { courses, pagination } = await courseService.listCourses(filters)
    sendSuccess(res, courses, undefined, 200, pagination)
  } catch (error) {
    logger.error(
      '[CoursesController] listCourses error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getCourseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const userId = req.user?.userId

    const course = await courseService.getCourse(id, userId)

    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    // Transform modules to sections format expected by frontend
    const sections = (course.modules ?? []).map(mod => ({
      id: mod.id,
      title: mod.title,
      lessons: (mod.lessons ?? []).map(les => ({
        id: les.id,
        title: les.title,
        description: les.description ?? null,
        duration: Math.round(les.duration / 60), // Convert seconds to minutes
        video_url: les.videoUrl,
        completed: false,
        order: les.order,
        is_free: les.isFree,
      })),
    }))

    // Build response matching CourseDetails interface
    const responseData = {
      id: course.id,
      title: course.title,
      description: course.description,
      short_description: course.shortDescription,
      thumbnail: course.thumbnail,
      trailer_video: course.trailerVideo,
      instructor: {
        id: course.instructor?.id ?? 'instructor-1',
        display_name: course.instructor?.username ?? 'Expert Instructor',
        avatar: course.instructor?.avatar ?? null,
        bio: course.instructor?.bio ?? null,
        total_students: course.studentCount,
        total_courses: 1,
      },
      price: course.price ?? 0,
      original_price: course.originalPrice,
      rating: course.rating,
      review_count: course.reviewCount,
      student_count: course.studentCount,
      duration: course.duration.toString(),
      level: course.difficulty as 'beginner' | 'intermediate' | 'advanced',
      language: course.language,
      last_updated: course.lastUpdated?.toISOString() ?? new Date().toISOString(),
      certificate: course.certificate,
      sections,
      learning_outcomes: [],
      prerequisites: [],
      tags: course.category ? [course.category] : [],
      is_enrolled: !!course.userProgress,
      progress_percent: course.userProgress?.progress ?? null,
    }

    sendSuccess(res, responseData)
  } catch (error) {
    logger.error(
      '[CoursesController] getCourseDetails error',
      error instanceof Error ? error : new Error(String(error)),
      {
        courseId: req.params.id,
      }
    )
    sendInternalError(res)
  }
}

export const enrollInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { courseId } = req.body

    if (!courseId) {
      sendValidationError(res, 'Course ID is required')
      return
    }

    await courseService.enroll({ userId, courseId })
    sendCreated(res, { status: 'enrolled' })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('[CoursesController] enrollInCourse error', err, {
      userId: req.user?.userId,
      courseId: req.body?.courseId,
    })
    if (err.message === 'Already enrolled in this course') {
      sendSuccess(res, { status: 'already_enrolled' }, 'Already enrolled')
      return
    }
    if (err.message === 'Course not found or not available') {
      sendNotFound(res, 'Course not found')
      return
    }
    sendInternalError(res)
  }
}

export const updateCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { courseId, progress } = req.body
    const normalizedProgress = Math.max(0, Math.min(100, Number(progress)))
    if (!courseId || Number.isNaN(normalizedProgress)) {
      sendValidationError(res, 'Course ID and valid progress are required')
      return
    }

    await courseService.updateProgress({ userId, courseId, progress: normalizedProgress })
    sendSuccess(res, { progress: normalizedProgress })
  } catch (error) {
    logger.error(
      '[CoursesController] updateProgress error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.courseId,
      }
    )
    sendInternalError(res)
  }
}
