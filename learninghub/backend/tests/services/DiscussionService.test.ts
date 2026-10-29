/**
 * DiscussionService — Unit Tests
 * Tests the community discussion features: threads, replies, voting, bookmarking
 */
import { discussionService } from '../../src/services/DiscussionService'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

describe('DiscussionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getThreads', () => {
    it('should return paginated threads with metadata', async () => {
      const result = await discussionService.getThreads({ page: 1, limit: 10 })

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.meta).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          page: 1,
          limit: 10,
          pages: expect.any(Number),
          hasNext: expect.any(Boolean),
          hasPrev: expect.any(Boolean),
        })
      )
    })

    it('should filter threads by search query', async () => {
      const result = await discussionService.getThreads({ search: 'Dynamic Programming', page: 1, limit: 10 })

      expect(result.data.every(d =>
        d.title.toLowerCase().includes('dynamic programming') ||
        d.content.toLowerCase().includes('dynamic programming') ||
        d.tags.some(t => t.toLowerCase().includes('dynamic programming'))
      )).toBe(true)
    })

    it('should sort by popular when ordering is "popular"', async () => {
      const result = await discussionService.getThreads({ ordering: 'popular', page: 1, limit: 10 })

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].like_count).toBeGreaterThanOrEqual(result.data[i].like_count)
      }
    })

    it('should clamp page and limit to valid ranges', async () => {
      const result = await discussionService.getThreads({ page: -5, limit: 1000 })

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50) // max limit
    })

    it('should filter by course when course parameter provided', async () => {
      const result = await discussionService.getThreads({ course: 'cs-101', page: 1, limit: 10 })

      expect(result.data).toBeDefined()
    })
  })

  describe('getTrending', () => {
    it('should return trending threads sorted by engagement', async () => {
      const threads = await discussionService.getTrending(5)

      expect(Array.isArray(threads)).toBe(true)
      expect(threads.length).toBeLessThanOrEqual(5)

      // Should be sorted by engagement (likes + views * 0.1)
      for (let i = 1; i < threads.length; i++) {
        const prevEngagement = threads[i - 1].like_count + threads[i - 1].view_count * 0.1
        const currEngagement = threads[i].like_count + threads[i].view_count * 0.1
        expect(prevEngagement).toBeGreaterThanOrEqual(currEngagement)
      }
    })

    it('should clamp limit to valid range', async () => {
      const threads = await discussionService.getTrending(1000)
      expect(threads.length).toBeLessThanOrEqual(50)
    })
  })

  describe('getThreadById', () => {
    it('should return thread and increment view_count', async () => {
      const thread = await discussionService.getThreadById('disc-1')

      expect(thread).toBeDefined()
      expect(thread?.id).toBe('disc-1')
      expect(thread?.view_count).toBeGreaterThan(520) // Original was 520, should increment
    })

    it('should return null for non-existent thread', async () => {
      const thread = await discussionService.getThreadById('non-existent')
      expect(thread).toBeNull()
    })
  })

  describe('createThread', () => {
    it('should create new thread with user data', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-1',
        username: 'test_user',
        xp: 100,
        avatar: 'avatar.png',
      })

      const thread = await discussionService.createThread({
        title: 'Test Thread',
        content: 'Test content',
        userId: 'usr-1',
        username: 'test_user',
        tags: ['Test', 'Discussion'],
      })

      expect(thread.id).toMatch(/^disc-\d+$/)
      expect(thread.title).toBe('Test Thread')
      expect(thread.content).toBe('Test content')
      expect(thread.author.username).toBe('test_user')
      expect(thread.tags).toEqual(['Test', 'Discussion'])
      expect(thread.like_count).toBe(0)
      expect(thread.reply_count).toBe(0)
    })

    it('should fallback to default values when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const thread = await discussionService.createThread({
        title: 'Test Thread',
        content: 'Test content',
        userId: 'unknown-user',
      })

      expect(thread.author.username).toBe('student')
      expect(thread.author.reputation).toBe(50)
    })
  })

  describe('addReply', () => {
    it('should add reply to existing thread', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-2',
        username: 'reply_user',
        xp: 200,
      })

      const reply = await discussionService.addReply('disc-1', {
        content: 'This is a reply',
        userId: 'usr-2',
        username: 'reply_user',
      })

      expect(reply).toBeDefined()
      expect(reply?.id).toMatch(/^reply-\d+$/)
      expect(reply?.content).toBe('This is a reply')
      expect(reply?.author.username).toBe('reply_user')
    })

    it('should return null for non-existent thread', async () => {
      const reply = await discussionService.addReply('non-existent', {
        content: 'Reply',
        userId: 'usr-1',
      })

      expect(reply).toBeNull()
    })
  })

  describe('voteThread', () => {
    it('should increment like_count for upvote', async () => {
      const initialThread = await discussionService.getThreadById('disc-1')
      const initialLikes = initialThread?.like_count || 0

      const result = await discussionService.voteThread('disc-1', 1)

      expect(result.like_count).toBe(initialLikes + 1)
      expect(result.user_vote).toBe(1)
    })

    it('should decrement like_count for downvote', async () => {
      const result = await discussionService.voteThread('disc-1', -1)

      expect(result.like_count).toBeGreaterThanOrEqual(0)
      expect(result.user_vote).toBe(-1)
    })

    it('should clamp to 0 when downvoting below zero', async () => {
      // First get current like count
      const thread = await discussionService.getThreadById('disc-1')
      const initialLikes = thread?.like_count || 0

      // Downvote enough times to go below zero
      for (let i = 0; i < initialLikes + 5; i++) {
        await discussionService.voteThread('disc-1', -1)
      }

      const result = await discussionService.voteThread('disc-1', -1)
      expect(result.like_count).toBe(0)
    })

    it('should return defaults for non-existent thread', async () => {
      const result = await discussionService.voteThread('non-existent', 1)
      expect(result).toEqual({ like_count: 0, user_vote: 0 })
    })
  })

  describe('voteReply', () => {
    it('should vote on existing reply', async () => {
      // First add a reply to have something to vote on
      await discussionService.addReply('disc-1', {
        content: 'Reply to vote on',
        userId: 'usr-3',
      })

      // Get the reply ID
      const thread = await discussionService.getThreadById('disc-1')
      const replyId = thread?.replies?.[0]?.id

      if (replyId) {
        const result = await discussionService.voteReply(replyId, 1)
        expect(result.like_count).toBeGreaterThanOrEqual(1)
        expect(result.user_vote).toBe(1)
      }
    })

    it('should return defaults for non-existent reply', async () => {
      const result = await discussionService.voteReply('non-existent', 1)
      expect(result).toEqual({ like_count: 0, user_vote: 0 })
    })
  })

  describe('getReplies', () => {
    it('should return replies for existing thread', async () => {
      const replies = await discussionService.getReplies('disc-1')

      expect(Array.isArray(replies)).toBe(true)
      expect(replies.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existent thread', async () => {
      const replies = await discussionService.getReplies('non-existent')
      expect(replies).toEqual([])
    })
  })

  describe('pinThread', () => {
    it('should toggle pin status', async () => {
      const thread = await discussionService.getThreadById('disc-1')
      const initialPin = thread?.is_pinned

      const result = await discussionService.pinThread('disc-1')
      expect(result.is_pinned).toBe(!initialPin)

      // Toggle back
      const result2 = await discussionService.pinThread('disc-1')
      expect(result2.is_pinned).toBe(initialPin)
    })

    it('should return false for non-existent thread', async () => {
      const result = await discussionService.pinThread('non-existent')
      expect(result.is_pinned).toBe(false)
    })
  })

  describe('resolveThread', () => {
    it('should toggle resolved status', async () => {
      const thread = await discussionService.getThreadById('disc-1')
      const initialResolved = thread?.is_resolved

      const result = await discussionService.resolveThread('disc-1')
      expect(result.is_resolved).toBe(!initialResolved)

      // Toggle back
      const result2 = await discussionService.resolveThread('disc-1')
      expect(result2.is_resolved).toBe(initialResolved)
    })

    it('should return false for non-existent thread', async () => {
      const result = await discussionService.resolveThread('non-existent')
      expect(result.is_resolved).toBe(false)
    })
  })

  describe('acceptReply', () => {
    it('should toggle accepted answer status', async () => {
      const thread = await discussionService.getThreadById('disc-1')
      const replyId = thread?.replies?.[0]?.id

      if (replyId) {
        const initialStatus = thread.replies?.find(r => r.id === replyId)?.is_accepted_answer

        const result = await discussionService.acceptReply('disc-1', replyId)
        expect(result.is_accepted_answer).toBe(!initialStatus)
      }
    })

    it('should return false for non-existent thread/reply', async () => {
      const result = await discussionService.acceptReply('non-existent', 'reply-1')
      expect(result.is_accepted_answer).toBe(false)
    })
  })

  describe('summarizeThread', () => {
    it('should return summary for existing thread', async () => {
      const summary = await discussionService.summarizeThread('disc-1')

      expect(summary.summary).toContain('Key Takeaways')
      expect(summary.summary).toContain('Dynamic Programming') // Thread title
    })

    it('should return not found message for non-existent thread', async () => {
      const summary = await discussionService.summarizeThread('non-existent')
      expect(summary.summary).toBe('Thread not found.')
    })
  })

  describe('bookmarkThread', () => {
    it('should toggle bookmark status', async () => {
      const result1 = await discussionService.bookmarkThread('disc-1', 'usr-1')
      expect(result1.bookmarked).toBe(true)

      const result2 = await discussionService.bookmarkThread('disc-1', 'usr-1')
      expect(result2.bookmarked).toBe(false)
    })

    it('should return true for non-existent thread', async () => {
      const result = await discussionService.bookmarkThread('non-existent', 'usr-1')
      expect(result.bookmarked).toBe(true)
    })
  })
})