import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

/**
 * POST /api/v1/courses/:id/reviews
 * Create or update a course review.
 */
export const createCourseReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const courseId = req.params.id as string

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { rating, title, content } = req.body

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5' })
      return
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    })

    if (!course?.isPublished) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
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

    // Update course aggregate stats
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

    res.status(existing ? 200 : 201).json({
      status: 'success',
      message: existing ? 'Review updated' : 'Review created',
      data: review,
    })
  } catch (error) {
    logger.error(
      '[CourseReviews] createCourseReview error',
      error instanceof Error ? error : new Error(String(error)),
      { courseId: req.params.id, userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * GET /api/v1/courses/:id/reviews
 * Get paginated reviews for a course.
 */
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
      res.status(404).json({ status: 'error', message: 'Course not found' })
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

    res.json({
      status: 'success',
      data: reviews.map(r => ({
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
      })),
      meta: {
        total,
        average_rating: course.rating,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error(
      '[CourseReviews] getCourseReviews error',
      error instanceof Error ? error : new Error(String(error)),
      { courseId: req.params.id }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * PUT /api/v1/courses/:courseId/reviews/:reviewId/helpful
 * Mark a review as helpful. Authenticated users only.
 * Uses a simple session-based deduplication to prevent spam.
 */
const helpfulVotes = new Map<string, Set<string>>() // userId -> Set of reviewIds

export const markReviewHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const reviewId = req.params.reviewId as string

    // Check if review exists
    const review = await prisma.courseReview.findUnique({
      where: { id: reviewId },
      select: { id: true },
    })
    if (!review) {
      res.status(404).json({ status: 'error', message: 'Review not found' })
      return
    }

    // Check if user already voted (in-memory deduplication)
    const userVotes = helpfulVotes.get(userId) ?? new Set()
    if (userVotes.has(reviewId)) {
      res.status(409).json({ status: 'error', message: 'Already marked as helpful' })
      return
    }

    // Increment helpfulCount
    await prisma.courseReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    })

    // Record the vote
    userVotes.add(reviewId)
    helpfulVotes.set(userId, userVotes)

    res.json({ status: 'success', message: 'Review marked as helpful' })
  } catch (error) {
    logger.error(
      '[CourseReviews] markReviewHelpful error',
      error instanceof Error ? error : new Error(String(error)),
      { reviewId: req.params.reviewId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
