import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

/**
 * Bookmark Controller - RESTful endpoints for bookmark management
 * Base route: /users/bookmarks
 */

export const getBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

    res.json({
      status: 'success',
      count: bookmarks.length,
      data: bookmarks.map(b => ({
        id: b.course.id,
        title: b.course.title,
        description: b.course.description,
        thumbnail: b.course.thumbnail,
        level: b.course.difficulty,
        duration: b.course.duration,
        bookmarked_at: b.createdAt,
      })),
    })
  } catch (error) {
    logger.error(
      '[BookmarksController] getBookmarks error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const createBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const { course_id, notes } = req.body

    if (!course_id) {
      res.status(400).json({ status: 'error', message: 'Course ID is required' })
      return
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: course_id },
    })
    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    // Check if bookmark already exists
    const existing = await prisma.bookmark.findUnique({
      where: {
        idx_unique_user_course_bookmark: {
          userId,
          courseId: course_id,
        },
      },
    })

    if (existing) {
      res.status(409).json({ status: 'error', message: 'Course is already bookmarked' })
      return
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        courseId: course_id,
      },
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
      await prisma.note.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course_id,
          },
        },
        update: {
          content: notes,
          updatedAt: new Date(),
        },
        create: {
          userId,
          courseId: course_id,
          content: notes,
        },
      })
    }

    res.status(201).json({
      status: 'success',
      message: 'Bookmark added successfully',
      data: {
        id: bookmark.course.id,
        title: bookmark.course.title,
        description: bookmark.course.description,
        thumbnail: bookmark.course.thumbnail,
        level: bookmark.course.difficulty,
        duration: bookmark.course.duration,
        bookmarked_at: bookmark.createdAt,
      },
    })
  } catch (error) {
    logger.error(
      '[BookmarksController] createBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.body?.course_id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const deleteBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    const courseId = req.params.courseId as string

    const deleted = await prisma.bookmark.deleteMany({
      where: {
        userId,
        courseId,
      },
    })

    if (deleted.count === 0) {
      res.status(404).json({ status: 'error', message: 'Bookmark not found' })
      return
    }

    res.json({
      status: 'success',
      message: 'Bookmark removed successfully',
    })
  } catch (error) {
    logger.error(
      '[BookmarksController] deleteBookmark error',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: req.user?.userId,
        courseId: req.params?.courseId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
