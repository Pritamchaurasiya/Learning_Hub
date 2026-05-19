import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination'
import logger from '../utils/logger'

export const listCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phase, difficulty, category, search } = req.query
    const { page, limit, skip } = getPaginationParams(req.query)

    const filters: Prisma.CourseWhereInput = {}
    if (phase && typeof phase === 'string') filters.phase = phase as Prisma.EnumCoursePhaseFilter
    if (difficulty && typeof difficulty === 'string')
      filters.difficulty = difficulty as Prisma.EnumDifficultyLevelFilter
    if (category && typeof category === 'string') filters.category = category

    // Add search by title or description
    if (search && typeof search === 'string') {
      filters.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Parallelize count + findMany for performance
    const [total, courses] = await Promise.all([
      prisma.course.count({ where: filters }),
      prisma.course.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { progress: true, bookmarks: true },
          },
        },
      }),
    ])

    res.status(200).json(createPaginatedResponse(courses, total, page, limit))
  } catch (error) {
    logger.error(
      '[CoursesController] listCourses error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getCourseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        tests: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            timeLimit: true,
            _count: { select: { questions: true } },
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                order: true,
                isFree: true,
                videoUrl: true,
                transcript: true,
                resources: true,
              },
            },
          },
        },
        instructor: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
          },
        },
      },
    })

    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    // Transform modules to sections format expected by frontend
    const sections = (course.modules || []).map(mod => ({
      id: mod.id,
      title: mod.title,
      lessons: (mod.lessons || []).map(les => ({
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

    // Check enrollment status if user is authenticated
    let isEnrolled = false
    let progressPercent: number | null = null
    const userId = req.user?.userId
    if (userId) {
      const enrollment = await prisma.userProgress.findUnique({
        where: { idx_unique_user_course: { userId, courseId: id } },
      })
      if (enrollment) {
        isEnrolled = true
        progressPercent = enrollment.progress
      }
    }

    // Build response matching CourseDetails interface
    const instructor = course.instructor
    const responseData = {
      id: course.id,
      title: course.title,
      description: course.description,
      short_description: course.shortDescription,
      thumbnail: course.thumbnail,
      trailer_video: course.trailerVideo,
      instructor: {
        id: instructor?.id ?? 'instructor-1',
        display_name: instructor?.username ?? 'Expert Instructor',
        avatar: instructor?.avatar ?? null,
        bio: instructor?.bio ?? null,
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
      is_enrolled: isEnrolled,
      progress_percent: progressPercent,
    }

    res.status(200).json({ status: 'success', data: responseData })
  } catch (error) {
    logger.error(
      '[CoursesController] getCourseDetails error',
      error instanceof Error ? error : new Error(String(error)),
      {
        courseId: req.params.id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getCourseReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string
    const course = await prisma.course.findUnique({
      where: { id },
      select: { reviewCount: true, rating: true },
    })
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    res.status(200).json({
      status: 'success',
      data: [],
      meta: {
        total: course.reviewCount,
        average_rating: course.rating,
        page: 1,
        pages: 0,
      },
    })
  } catch (error) {
    logger.error(
      '[CoursesController] getCourseReviews error',
      error instanceof Error ? error : new Error(String(error)),
      {
        courseId: req.params.id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const enrollInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { courseId } = req.body

    if (!courseId) {
      res.status(400).json({ status: 'error', message: 'Course ID is required' })
      return
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    const enrollment = await prisma.userProgress.upsert({
      where: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        idx_unique_user_course: { userId: userId!, courseId },
      },
      update: {},
      create: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userId: userId!,
        courseId,
        status: 'IN_PROGRESS',
        progress: 0,
      },
    })

    res.status(201).json({ status: 'success', data: enrollment })
  } catch (error) {
    logger.error(
      '[CoursesController] enrollInCourse error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.courseId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const updateCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { courseId, progress } = req.body
    const normalizedProgress = Math.max(0, Math.min(100, Number(progress)))
    if (!courseId || Number.isNaN(normalizedProgress)) {
      res
        .status(400)
        .json({ status: 'error', message: 'Course ID and valid progress are required' })
      return
    }

    const updated = await prisma.userProgress.upsert({
      where: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        idx_unique_user_course: { userId: userId!, courseId },
      },
      update: {
        progress: normalizedProgress,
        status: normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        updatedAt: new Date(),
      },
      create: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userId: userId!,
        courseId,
        progress: normalizedProgress,
        status: normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
      },
    })

    res.status(200).json({ status: 'success', data: updated })
  } catch (error) {
    logger.error(
      '[CoursesController] updateProgress error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.courseId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
