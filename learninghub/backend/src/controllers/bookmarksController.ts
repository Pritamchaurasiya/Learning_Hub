import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

/**
 * Bookmark Controller - RESTful endpoints for bookmark management
 * Base route: /users/bookmarks
 */

export const getBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            difficulty: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    sendSuccess(
      res,
      bookmarks.map(b => ({
        id: b.course.id,
        title: b.course.title,
        description: b.course.description,
        thumbnail: b.course.thumbnail,
        level: b.course.difficulty,
        duration: b.course.duration,
        bookmarked_at: b.createdAt,
      }))
    )
  } catch (error) {
    logger.error(
      '[BookmarksController] getBookmarks error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const createBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const { course_id, notes } = req.body

    if (!course_id) {
      sendValidationError(res, 'Course ID is required')
      return
    }

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: course_id } })
    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    // Check if bookmark already exists
    const existing = await prisma.bookmark.findUnique({
      where: {
        idx_unique_user_course_bookmark: { userId, courseId: course_id },
      },
    })
    if (existing) {
      sendConflict(res, 'Course is already bookmarked')
      return
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: { userId, courseId: course_id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            difficulty: true,
            duration: true,
          },
        },
      },
    })

    // If notes provided, also create/update a Note
    if (notes?.trim()) {
      const existingNote = await prisma.note.findFirst({
        where: { userId, courseId: course_id, lessonId: null },
      })
      if (existingNote) {
        await prisma.note.update({
          where: { id: existingNote.id },
          data: { content: notes, updatedAt: new Date() },
        })
      } else {
        await prisma.note.create({
          data: { userId, courseId: course_id, content: notes },
        })
      }
    }

    sendCreated(
      res,
      {
        id: bookmark.course.id,
        title: bookmark.course.title,
        description: bookmark.course.description,
        thumbnail: bookmark.course.thumbnail,
        level: bookmark.course.difficulty,
        duration: bookmark.course.duration,
        bookmarked_at: bookmark.createdAt,
      },
      'Bookmark added successfully'
    )
  } catch (error) {
    logger.error(
      '[BookmarksController] createBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, courseId: req.body?.course_id }
    )
    sendInternalError(res)
  }
}

export const deleteBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }
    const courseId = req.params.courseId as string

    const deleted = await prisma.bookmark.deleteMany({
      where: { userId, courseId },
    })

    if (deleted.count === 0) {
      sendNotFound(res, 'Bookmark not found')
      return
    }

    sendSuccess(res, null, 'Bookmark removed successfully')
  } catch (error) {
    logger.error(
      '[BookmarksController] deleteBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId, courseId: req.params?.courseId }
    )
    sendInternalError(res)
  }
}
