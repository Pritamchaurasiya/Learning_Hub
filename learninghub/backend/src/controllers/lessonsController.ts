import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

const parseResources = (resources: string | null): unknown[] => {
  if (!resources) {
    return []
  }
  try {
    const parsed = JSON.parse(resources)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const toMinutes = (durationSeconds: number): number => Math.max(1, Math.round(durationSeconds / 60))

export const getCourseLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = (req.params.courseId ?? req.params.id) as string
    const userId = req.user?.userId

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, content: true },
    })

    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    // Get modules with lessons ordered properly
    const modules = await prisma.module.findMany({
      where: { courseId },
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
    })

    const completedLessonIds = new Set<string>()
    if (userId) {
      const completions = await prisma.lessonCompletion.findMany({
        where: { userId, lesson: { module: { courseId } } },
        select: { lessonId: true },
      })
      completions.forEach(c => completedLessonIds.add(c.lessonId))
    }

    // Transform to CourseSection shape expected by frontend
    const sections = modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map(les => ({
        id: les.id,
        title: les.title,
        description: les.description ?? '',
        duration: toMinutes(les.duration), // convert seconds to minutes
        video_url: les.videoUrl,
        completed: completedLessonIds.has(les.id),
        order: les.order,
        is_free: les.isFree,
      })),
    }))

    sendSuccess(res, sections)
  } catch (error) {
    logger.error(
      'GetCourseLessons error',
      error instanceof Error ? error : new Error(String(error)),
      {
        courseId: req.params.id,
      }
    )
    sendInternalError(res)
  }
}

export const getLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = (req.params.courseId ?? req.params.id) as string
    const lessonId = req.params.lessonId as string
    const userId = req.user?.userId

    // Find the lesson with its module and course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
            course: {
              select: { id: true, title: true, content: true },
            },
          },
        },
      },
    })

    if (lesson?.module.courseId !== courseId) {
      sendNotFound(res, 'Lesson not found in this course')
      return
    }

    let isCompleted = false
    if (userId) {
      const completion = await prisma.lessonCompletion.findUnique({
        where: { idx_unique_user_lesson: { userId, lessonId } },
      })
      isCompleted = !!completion
    }

    sendSuccess(res, {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description ?? '',
      video_url: lesson.videoUrl,
      duration: toMinutes(lesson.duration),
      order: lesson.order,
      is_free: lesson.isFree,
      transcript: lesson.transcript ?? (lesson.module.course.content || ''),
      resources: parseResources(lesson.resources),
      completed: isCompleted,
    })
  } catch (error) {
    logger.error('GetLesson error', error instanceof Error ? error : new Error(String(error)), {
      courseId: req.params.id,
      lessonId: req.params.lessonId,
    })
    sendInternalError(res)
  }
}

export const getCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const courseId = (req.params.courseId ?? req.params.id) as string

    // Run all 3 queries concurrently instead of sequentially
    const [progress, completedLessons, totalLessons] = await Promise.all([
      prisma.userProgress.findUnique({
        where: { idx_unique_user_course: { userId, courseId } },
      }),
      prisma.lessonCompletion.count({
        where: { userId, lesson: { module: { courseId } } },
      }),
      prisma.lesson.count({
        where: { module: { courseId } },
      }),
    ])

    if (!progress) {
      sendSuccess(res, {
        course_id: courseId,
        enrollment_id: '',
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        progress_percent: 0,
        is_completed: false,
        completed_at: null,
        last_accessed_at: new Date().toISOString(),
      })
      return
    }

    sendSuccess(res, {
      course_id: courseId,
      enrollment_id: progress.id,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      progress_percent: progress.progress,
      is_completed: progress.status === 'COMPLETED',
      completed_at: progress.status === 'COMPLETED' ? progress.updatedAt.toISOString() : null,
      last_accessed_at: progress.updatedAt.toISOString(),
    })
  } catch (error) {
    logger.error(
      'GetCourseProgress error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.params.id,
      }
    )
    sendInternalError(res)
  }
}

export const updateLessonProgress = async (req: Request, res: Response): Promise<void> => {
  const courseId = (req.params.courseId ?? req.params.id) as string
  const { progress_percent, completed } = req.body
  const userId = req.user?.userId
  if (!userId) {
    sendUnauthorized(res)
    return
  }

  try {
    const lessonId = req.params.lessonId as string
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    })
    if (lesson?.module.courseId !== courseId) {
      sendNotFound(res, 'Lesson not found in this course')
      return
    }

    const normalizedProgress = Math.max(0, Math.min(100, Number(progress_percent)))
    if (Number.isNaN(normalizedProgress)) {
      sendValidationError(res, 'Invalid progress percent')
      return
    }

    await prisma.userProgress.upsert({
      where: { idx_unique_user_course: { userId, courseId } },
      update: {
        progress: normalizedProgress,
        status: completed || normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        updatedAt: new Date(),
      },
      create: {
        userId,
        courseId,
        progress: normalizedProgress,
        status: completed || normalizedProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
      },
    })
    sendSuccess(res, {
      lesson_id: req.params.lessonId,
      progress_percent: normalizedProgress,
      completed: Boolean(completed ?? normalizedProgress === 100),
    })
  } catch (error) {
    logger.error(
      'UpdateLessonProgress error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        lessonId: req.params.lessonId,
      }
    )
    sendInternalError(res)
  }
}

export const completeLesson = async (req: Request, res: Response): Promise<void> => {
  const courseId = (req.params.courseId ?? req.params.id) as string
  const lessonId = req.params.lessonId as string
  const userId = req.user?.userId
  if (!userId) {
    sendUnauthorized(res)
    return
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    })
    if (lesson?.module.courseId !== courseId) {
      sendNotFound(res, 'Lesson not found in this course')
      return
    }

    const alreadyCompleted = await prisma.lessonCompletion.findUnique({
      where: { idx_unique_user_lesson: { userId, lessonId } },
      select: { id: true },
    })

    await prisma.lessonCompletion.upsert({
      where: { idx_unique_user_lesson: { userId, lessonId } },
      update: {},
      create: { userId, lessonId },
    })

    const [completedLessons, totalLessons] = await Promise.all([
      prisma.lessonCompletion.count({
        where: {
          userId,
          lesson: { module: { courseId } },
        },
      }),
      prisma.lesson.count({
        where: { module: { courseId } },
      }),
    ])

    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    const isCourseCompleted = totalLessons > 0 && completedLessons >= totalLessons
    const awardedXP = alreadyCompleted ? 0 : 25

    const [progress, updatedUser] = await prisma.$transaction([
      prisma.userProgress.upsert({
        where: { idx_unique_user_course: { userId, courseId } },
        update: {
          progress: progressPercent,
          status: isCourseCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        },
        create: {
          userId,
          courseId,
          progress: progressPercent,
          status: isCourseCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(awardedXP > 0 ? { xp: { increment: awardedXP } } : {}),
        },
        select: { xp: true, level: true },
      }),
    ])

    if (awardedXP > 0) {
      const computedLevel = Math.floor(updatedUser.xp / 100) + 1
      if (computedLevel !== updatedUser.level) {
        await prisma.user.update({
          where: { id: userId },
          data: { level: computedLevel },
        })
      }
    }

    sendSuccess(
      res,
      {
        course_id: courseId,
        lesson_id: lessonId,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        progress_percent: progress.progress,
        is_course_completed: progress.status === 'COMPLETED',
        xp_awarded: awardedXP,
      },
      alreadyCompleted ? 'Lesson was already completed' : 'Lesson completed'
    )
  } catch (error) {
    logger.error(
      'CompleteLesson error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        lessonId: req.params.lessonId,
      }
    )
    sendInternalError(res)
  }
}

export const getLessonNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const courseId = (req.params.courseId ?? req.params.id) as string
    const lessonId = req.params.lessonId as string | undefined

    const note = await prisma.note.findFirst({
      where: { userId, courseId, lessonId: lessonId ?? null },
      select: { content: true, updatedAt: true },
    })

    sendSuccess(res, {
      notes: note?.content ?? '',
      updated_at: note?.updatedAt ?? null,
    })
  } catch (error) {
    logger.error(
      'GetLessonNotes error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.params?.id,
      }
    )
    sendInternalError(res)
  }
}

export const saveLessonNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const courseId = (req.params.courseId ?? req.params.id) as string
    const lessonId = (req.params.lessonId as string | undefined) ?? null
    const notes = typeof req.body.notes === 'string' ? req.body.notes : ''

    if (lessonId !== null) {
      await prisma.note.upsert({
        where: {
          userId_courseId_lessonId: {
            userId,
            courseId,
            lessonId,
          },
        },
        update: { content: notes, updatedAt: new Date() },
        create: { userId, courseId, lessonId, content: notes },
      })
    } else {
      const existing = await prisma.note.findFirst({
        where: { userId, courseId, lessonId: null },
        select: { id: true },
      })
      if (existing) {
        await prisma.note.update({
          where: { id: existing.id },
          data: { content: notes, updatedAt: new Date() },
        })
      } else {
        await prisma.note.create({
          data: { userId, courseId, lessonId: null, content: notes },
        })
      }
    }

    sendSuccess(res, null, 'Notes saved')
  } catch (error) {
    logger.error(
      'SaveLessonNotes error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.params?.id,
      }
    )
    sendInternalError(res)
  }
}

export const getNextLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = (req.params.courseId ?? req.params.id) as string
    const currentLessonId = req.params.lessonId as string
    const userId = req.user?.userId

    // Find current lesson order
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: currentLessonId },
      include: { module: true },
    })

    if (!currentLesson) {
      sendNotFound(res, 'Current lesson not found')
      return
    }
    if (currentLesson.module.courseId !== courseId) {
      sendNotFound(res, 'Lesson not found in this course')
      return
    }

    // Find next lesson in same module
    const nextLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: currentLesson.moduleId,
        order: { gt: currentLesson.order },
      },
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
    })

    if (!nextLesson) {
      // Check next module's first lesson
      const nextModule = await prisma.module.findFirst({
        where: {
          courseId,
          order: { gt: currentLesson.module.order },
        },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            take: 1,
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
      })

      if (!nextModule || nextModule.lessons.length === 0) {
        sendSuccess(res, null, 'This is the last lesson')
        return
      }

      const firstNextLesson = nextModule.lessons[0]
      let isCompleted = false
      if (userId) {
        const completion = await prisma.lessonCompletion.findUnique({
          where: { idx_unique_user_lesson: { userId, lessonId: firstNextLesson.id } },
        })
        isCompleted = !!completion
      }
      sendSuccess(res, {
        id: firstNextLesson.id,
        title: firstNextLesson.title,
        description: firstNextLesson.description ?? '',
        video_url: firstNextLesson.videoUrl,
        duration: toMinutes(firstNextLesson.duration),
        order: firstNextLesson.order,
        is_free: firstNextLesson.isFree,
        transcript: firstNextLesson.transcript ?? '',
        resources: parseResources(firstNextLesson.resources),
        completed: isCompleted,
      })
      return
    }

    let isCompleted = false
    if (userId) {
      const completion = await prisma.lessonCompletion.findUnique({
        where: { idx_unique_user_lesson: { userId, lessonId: nextLesson.id } },
      })
      isCompleted = !!completion
    }
    sendSuccess(res, {
      id: nextLesson.id,
      title: nextLesson.title,
      description: nextLesson.description ?? '',
      video_url: nextLesson.videoUrl,
      duration: toMinutes(nextLesson.duration),
      order: nextLesson.order,
      is_free: nextLesson.isFree,
      transcript: nextLesson.transcript ?? '',
      resources: parseResources(nextLesson.resources),
      completed: isCompleted,
    })
  } catch (error) {
    logger.error('GetNextLesson error', error instanceof Error ? error : new Error(String(error)), {
      courseId: req.params.id,
      lessonId: req.params.lessonId,
    })
    sendInternalError(res)
  }
}

export const getPreviousLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = (req.params.courseId ?? req.params.id) as string
    const currentLessonId = req.params.lessonId as string
    const userId = req.user?.userId

    const currentLesson = await prisma.lesson.findUnique({
      where: { id: currentLessonId },
      include: { module: true },
    })

    if (!currentLesson) {
      sendNotFound(res, 'Current lesson not found')
      return
    }
    if (currentLesson.module.courseId !== courseId) {
      sendNotFound(res, 'Lesson not found in this course')
      return
    }

    // Find previous lesson in same module
    const prevLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: currentLesson.moduleId,
        order: { lt: currentLesson.order },
      },
      orderBy: { order: 'desc' },
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
    })

    if (!prevLesson) {
      // Check previous module's last lesson
      const prevModule = await prisma.module.findFirst({
        where: {
          courseId,
          order: { lt: currentLesson.module.order },
        },
        orderBy: { order: 'desc' },
        include: {
          lessons: {
            orderBy: { order: 'desc' },
            take: 1,
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
      })

      if (!prevModule || prevModule.lessons.length === 0) {
        sendSuccess(res, null, 'This is the first lesson')
        return
      }

      const lastPrevLesson = prevModule.lessons[0]
      let isCompleted = false
      if (userId) {
        const completion = await prisma.lessonCompletion.findUnique({
          where: { idx_unique_user_lesson: { userId, lessonId: lastPrevLesson.id } },
        })
        isCompleted = !!completion
      }
      sendSuccess(res, {
        id: lastPrevLesson.id,
        title: lastPrevLesson.title,
        description: lastPrevLesson.description ?? '',
        video_url: lastPrevLesson.videoUrl,
        duration: toMinutes(lastPrevLesson.duration),
        order: lastPrevLesson.order,
        is_free: lastPrevLesson.isFree,
        transcript: lastPrevLesson.transcript ?? '',
        resources: parseResources(lastPrevLesson.resources),
        completed: isCompleted,
      })
      return
    }

    let isCompleted = false
    if (userId) {
      const completion = await prisma.lessonCompletion.findUnique({
        where: { idx_unique_user_lesson: { userId, lessonId: prevLesson.id } },
      })
      isCompleted = !!completion
    }
    sendSuccess(res, {
      id: prevLesson.id,
      title: prevLesson.title,
      description: prevLesson.description ?? '',
      video_url: prevLesson.videoUrl,
      duration: toMinutes(prevLesson.duration),
      order: prevLesson.order,
      is_free: prevLesson.isFree,
      transcript: prevLesson.transcript ?? '',
      resources: parseResources(prevLesson.resources),
      completed: isCompleted,
    })
  } catch (error) {
    logger.error(
      'GetPreviousLesson error',
      error instanceof Error ? error : new Error(String(error)),
      {
        courseId: req.params.id,
        lessonId: req.params.lessonId,
      }
    )
    sendInternalError(res)
  }
}
