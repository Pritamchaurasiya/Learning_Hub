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

export const createCourseReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const courseId = req.params.id as string

    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const { rating, title, content } = req.body

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      sendValidationError(res, 'Rating must be between 1 and 5')
      return
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    })

    if (!course?.isPublished) {
      sendNotFound(res, 'Course not found')
      return
    }

    const existing = await prisma.courseReview.findUnique({
      where: { courseId_userId: { courseId, userId } },
    })

    let review
    if (existing) {
      review = await prisma.courseReview.update({
        where: { courseId_userId: { courseId, userId } },
        data: {
          rating,
          title: title ?? existing.title,
          content: content ?? existing.content,
          updatedAt: new Date(),
        },
      })
    } else {
      review = await prisma.courseReview.create({
        data: {
          courseId,
          userId,
          rating,
          title,
          content,
          isVerified: true,
        },
      })
    }

    const stats = await prisma.courseReview.aggregate({
      where: { courseId, isVisible: true },
      _avg: { rating: true },
      _count: { id: true },
    })

    await prisma.course.update({
      where: { id: courseId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count.id,
      },
    })

    sendSuccess(res, review, existing ? 'Review updated' : 'Review created', existing ? 200 : 201)
  } catch (error) {
    logger.error(
      '[CourseReviews] createCourseReview error',
      error instanceof Error ? error : new Error(String(error)),
      { courseId: req.params.id, userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

export const getCourseReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const courseId = req.params.id as string
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))
    const skip = (page - 1) * limit

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { reviewCount: true, rating: true },
    })

    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    const [reviews, total] = await Promise.all([
      prisma.courseReview.findMany({
        where: { courseId, isVisible: true },
        skip,
        take: limit,
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseReview.count({ where: { courseId, isVisible: true } }),
    ])

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      is_verified: r.isVerified,
      helpful_count: r.helpfulCount,
      created_at: r.createdAt,
      reviewer: {
        id: r.reviewer.id,
        username: r.reviewer.username,
        avatar: r.reviewer.avatar,
      },
    }))

    sendSuccess(res, formattedReviews, undefined, 200, {
      total,
      average_rating: course.rating,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    logger.error(
      '[CourseReviews] getCourseReviews error',
      error instanceof Error ? error : new Error(String(error)),
      { courseId: req.params.id }
    )
    sendInternalError(res)
  }
}

export const markReviewHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const reviewId = req.params.reviewId as string

    const review = await prisma.courseReview.findUnique({
      where: { id: reviewId },
      select: { id: true },
    })
    if (!review) {
      sendNotFound(res, 'Review not found')
      return
    }

    await prisma.courseReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    })

    sendSuccess(res, null, 'Review marked as helpful')
  } catch (error) {
    logger.error(
      '[CourseReviews] markReviewHelpful error',
      error instanceof Error ? error : new Error(String(error)),
      { reviewId: req.params.reviewId }
    )
    sendInternalError(res)
  }
}
