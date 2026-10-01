import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess } from '../utils/responseHelper'

// Bounded in-memory store for unauthenticated guest fallback (LRU eviction)
const guestBookmarks = new Map<string, any[]>()
const MAX_GUEST_ENTRIES = 500

function resolveUserId(req: Request): { userId: string; isGuest: boolean } {
  if (req.user?.userId) return { userId: req.user.userId, isGuest: false }
  const guestHeader = req.headers['x-guest-id']
  if (typeof guestHeader === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(guestHeader.trim())) {
    return { userId: `guest_${guestHeader.trim()}`, isGuest: true }
  }
  const cleanIp = (req.ip || 'anonymous').replace(/[^a-zA-Z0-9_.-]/g, '')
  return { userId: `guest_${cleanIp}`, isGuest: true }
}

export const getBookmarks = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isGuest } = resolveUserId(req)

  if (!isGuest) {
    // Authenticated user: retrieve persistent question bookmarks from database
    const qBookmarks = await prisma.questionBookmark.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true,
            difficulty: true,
            marks: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (qBookmarks.length > 0) {
      const formatted = qBookmarks.map((b: any) => ({
        id: b.questionId,
        bookmarkId: b.id,
        title: b.question.text.substring(0, 100),
        type: b.question.type,
        difficulty: b.question.difficulty,
        totalMarks: b.question.marks,
        notes: b.notes,
        createdAt: b.createdAt,
      }))
      sendSuccess(res, formatted, undefined, 200, { count: formatted.length })
      return
    }
  }

  // Fallback / guest or initial recommendations
  const guestList = guestBookmarks.get(userId)
  if (guestList && guestList.length > 0) {
    sendSuccess(res, guestList, undefined, 200, { count: guestList.length })
    return
  }

  // Retrieve published tests as initial catalog bookmarks
  const tests = await prisma.test.findMany({
    where: { isPublished: true, deletedAt: null },
    take: 3,
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      timeLimit: true,
      totalMarks: true,
      createdAt: true,
    },
  })

  if (isGuest) {
    if (guestBookmarks.size >= MAX_GUEST_ENTRIES) {
      const oldestKey = guestBookmarks.keys().next().value
      if (oldestKey) guestBookmarks.delete(oldestKey)
    }
    guestBookmarks.set(userId, tests)
  }

  sendSuccess(res, tests, undefined, 200, { count: tests.length })
})

export const addBookmark = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isGuest } = resolveUserId(req)
  const { courseId, testId, questionId, course_id, question_id, notes } = req.body
  const targetId = questionId || question_id || testId || courseId || course_id

  if (!targetId) {
    sendSuccess(res, { bookmarked: false }, 'Target ID is required', 400)
    return
  }

  if (!isGuest) {
    // If target is a question, persist in Prisma QuestionBookmark
    const question = await prisma.question.findUnique({
      where: { id: targetId },
      select: { id: true },
    })

    if (question) {
      await prisma.questionBookmark.upsert({
        where: {
          userId_questionId: {
            userId,
            questionId: targetId,
          },
        },
        create: {
          userId,
          questionId: targetId,
          notes: notes || null,
        },
        update: {
          notes: notes || null,
        },
      })
      sendSuccess(res, { bookmarked: true }, 'Bookmark saved to database')
      return
    }
  }

  // Guest fallback or non-question test bookmark
  if (!guestBookmarks.has(userId)) {
    if (guestBookmarks.size >= MAX_GUEST_ENTRIES) {
      const oldestKey = guestBookmarks.keys().next().value
      if (oldestKey) guestBookmarks.delete(oldestKey)
    }
    guestBookmarks.set(userId, [])
  }
  const list = guestBookmarks.get(userId)!
  if (!list.some(b => b.id === targetId)) {
    const test = await prisma.test.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        timeLimit: true,
        totalMarks: true,
      },
    })
    if (test) {
      list.push(test)
    } else {
      list.push({
        id: targetId,
        title: 'Bookmarked Item',
        difficulty: 'MEDIUM',
        timeLimit: 30,
        totalMarks: 100,
      })
    }
  }

  sendSuccess(res, { bookmarked: true }, 'Bookmark added')
})

export const removeBookmark = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isGuest } = resolveUserId(req)
  const id = req.params.id as string

  if (!isGuest) {
    await prisma.questionBookmark.deleteMany({
      where: {
        userId,
        questionId: id,
      },
    })
  }

  if (guestBookmarks.has(userId)) {
    const list = guestBookmarks.get(userId)!
    guestBookmarks.set(
      userId,
      list.filter(b => b.id !== id)
    )
  }

  sendSuccess(res, { bookmarked: false }, 'Bookmark removed')
})
