import { prisma } from '../prismaClient'

export interface DiscussionThread {
  id: string
  title: string
  content: string
  author: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
    reputation?: number
  }
  course?: {
    id: string
    title: string
  }
  tags: string[]
  like_count: number
  reply_count: number
  view_count: number
  created_at: string
  updated_at: string
  is_resolved: boolean
  is_pinned: boolean
  user_vote?: number
  is_bookmarked?: boolean
  replies?: DiscussionReply[]
}

export interface DiscussionReply {
  id: string
  content: string
  author: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
    reputation?: number
  }
  created_at: string
  updated_at: string
  like_count: number
  is_accepted_answer: boolean
  user_vote?: number
  nested_replies?: DiscussionReply[]
}

// In-memory store fallback with seed data for fast, rich community interactions
const fallbackDiscussions: DiscussionThread[] = [
  {
    id: 'disc-1',
    title: 'How to master Dynamic Programming for JEE Advanced & Coding Contests?',
    content:
      'Dynamic Programming often feels tricky when identifying state transitions. What is the most structured approach to break down 2D DP problems and state compression?',
    author: {
      id: 'usr-prof-1',
      username: 'shivam_dev',
      display_name: 'Shivam Sharma',
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      reputation: 480,
    },
    tags: ['DSA', 'Dynamic Programming', 'JEE Advanced', 'Algorithms'],
    like_count: 42,
    reply_count: 3,
    view_count: 520,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    is_resolved: true,
    is_pinned: true,
    user_vote: 1,
    replies: [
      {
        id: 'reply-1',
        content:
          'Start with recursive top-down memoization, define exact state parameters `(i, j)`, identify base cases, and then translate into bottom-up iterative table to optimize space!',
        author: {
          id: 'usr-mentor-1',
          username: 'dr_arjun',
          display_name: 'Dr. Arjun Verma (IIT-D)',
          avatar_url:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
          reputation: 1250,
        },
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
        like_count: 28,
        is_accepted_answer: true,
        user_vote: 1,
      },
      {
        id: 'reply-2',
        content:
          'Also practice standard problem categories: Knapsack variations, Longest Common Subsequence, Matrix Chain Multiplication, and Digit DP.',
        author: {
          id: 'usr-student-2',
          username: 'ananya_k',
          display_name: 'Ananya Kapoor',
          avatar_url:
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
          reputation: 310,
        },
        created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        like_count: 14,
        is_accepted_answer: false,
        user_vote: 0,
      },
    ],
  },
  {
    id: 'disc-2',
    title: 'Rotational Motion: Angular Momentum Conservation Shortcut Techniques',
    content:
      'When solving complex rolling without slipping questions with varying torque, what coordinate frame choice minimizes calculation errors?',
    author: {
      id: 'usr-student-3',
      username: 'rahul_phy',
      display_name: 'Rahul Mehra',
      avatar_url:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
      reputation: 215,
    },
    tags: ['Physics', 'Rotational Motion', 'JEE Main', 'Mechanics'],
    like_count: 31,
    reply_count: 2,
    view_count: 380,
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    is_resolved: false,
    is_pinned: false,
    user_vote: 0,
    replies: [
      {
        id: 'reply-3',
        content:
          'Calculate angular momentum about the instantaneous axis of zero velocity (IAOR) — this eliminates torque from friction forces directly!',
        author: {
          id: 'usr-mentor-2',
          username: 'priya_prof',
          display_name: 'Prof. Priya Nair',
          avatar_url:
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
          reputation: 920,
        },
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        like_count: 19,
        is_accepted_answer: false,
        user_vote: 1,
      },
    ],
  },
  {
    id: 'disc-3',
    title: 'Organic Chemistry: Reaction Mechanisms & Electrophilic Aromatic Substitution',
    content:
      'How to easily predict ortho/para vs meta directing strength when activating groups have competing resonance and inductive effects?',
    author: {
      id: 'usr-student-4',
      username: 'sneha_chem',
      display_name: 'Sneha Patel',
      avatar_url:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
      reputation: 340,
    },
    tags: ['Chemistry', 'Organic Chemistry', 'NEET', 'Reaction Mechanisms'],
    like_count: 27,
    reply_count: 1,
    view_count: 290,
    created_at: new Date(Date.now() - 3600000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_resolved: true,
    is_pinned: false,
    user_vote: 0,
    replies: [],
  },
]

export class DiscussionService {
  // NOTE: This service currently serves an in-memory fallback store (seeded
  // threads + locally created ones) — there is no `Discussion` Prisma model, so
  // DB-level skip/take is not applicable yet. Pagination below is still enforced
  // in-service with clamped page/limit and full meta (total/page/limit/pages/
  // hasNext/hasPrev) so callers never fan out. When a persistent model lands,
  // replace the filter+slice with `findMany({ where, skip, take, orderBy })` +
  // `count({ where })` and keep this same return shape.
  async getThreads(params?: {
    course?: string
    search?: string
    ordering?: string
    page?: number
    limit?: number
    userId?: string
  }): Promise<{
    data: DiscussionThread[]
    meta: { total: number; page: number; limit: number; pages: number; hasNext: boolean; hasPrev: boolean }
  }> {
    const rawPage = params?.page ?? 1
    const rawLimit = params?.limit ?? 20
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1
    const limit = Number.isFinite(rawLimit)
      ? Math.min(50, Math.max(1, Math.floor(rawLimit)))
      : 20
    const search = params?.search?.toLowerCase()

    let results = [...fallbackDiscussions]

    if (search) {
      results = results.filter(
        d =>
          d.title.toLowerCase().includes(search) ||
          d.content.toLowerCase().includes(search) ||
          d.tags.some(t => t.toLowerCase().includes(search))
      )
    }

    if (params?.ordering === 'popular' || params?.ordering === '-like_count') {
      results.sort((a, b) => b.like_count - a.like_count)
    } else {
      results.sort(
        (a, b) =>
          (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    const total = results.length
    // In-memory equivalent of DB skip/take: slice exactly one clamped page.
    const skip = (page - 1) * limit
    const paginated = results.slice(skip, skip + limit)
    const pages = Math.ceil(total / limit)

    return {
      data: paginated,
      meta: { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 },
    }
  }

  async getTrending(limit = 10): Promise<DiscussionThread[]> {
    const safeLimit = Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.floor(limit))) : 10
    return [...fallbackDiscussions]
      .sort((a, b) => b.like_count + b.view_count * 0.1 - (a.like_count + a.view_count * 0.1))
      .slice(0, safeLimit)
  }

  async getThreadById(id: string, _userId?: string): Promise<DiscussionThread | null> {
    const found = fallbackDiscussions.find(d => d.id === id)
    if (!found) return null
    found.view_count += 1
    return found
  }

  async createThread(input: {
    title: string
    content: string
    course_id?: string
    tags?: string[]
    userId: string
    username?: string
  }): Promise<DiscussionThread> {
    let authorUser = null
    try {
      authorUser = await prisma.user.findUnique({ where: { id: input.userId } })
    } catch {
      // fallback
    }

    const newThread: DiscussionThread = {
      id: `disc-${Date.now()}`,
      title: input.title,
      content: input.content,
      author: {
        id: input.userId,
        username: authorUser?.username || input.username || 'student',
        display_name: authorUser?.username || input.username || 'Learning Member',
        avatar_url: authorUser?.avatar || undefined,
        reputation: authorUser?.xp || 50,
      },
      tags: input.tags || ['Discussion'],
      like_count: 0,
      reply_count: 0,
      view_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_resolved: false,
      is_pinned: false,
      user_vote: 0,
      replies: [],
    }

    fallbackDiscussions.unshift(newThread)
    return newThread
  }

  async addReply(
    threadId: string,
    input: {
      content: string
      parent_id?: string
      userId: string
      username?: string
    }
  ): Promise<DiscussionReply | null> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (!thread) return null

    let authorUser = null
    try {
      authorUser = await prisma.user.findUnique({ where: { id: input.userId } })
    } catch {
      // fallback
    }

    const reply: DiscussionReply = {
      id: `reply-${Date.now()}`,
      content: input.content,
      author: {
        id: input.userId,
        username: authorUser?.username || input.username || 'student',
        display_name: authorUser?.username || input.username || 'Learning Member',
        avatar_url: authorUser?.avatar || undefined,
        reputation: authorUser?.xp || 50,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      like_count: 0,
      is_accepted_answer: false,
      user_vote: 0,
    }

    if (!thread.replies) thread.replies = []
    thread.replies.push(reply)
    thread.reply_count += 1
    thread.updated_at = new Date().toISOString()
    return reply
  }

  async voteThread(
    threadId: string,
    vote: number
  ): Promise<{ like_count: number; user_vote: number }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (!thread) return { like_count: 0, user_vote: 0 }
    thread.like_count = Math.max(0, thread.like_count + (vote > 0 ? 1 : -1))
    thread.user_vote = vote
    return { like_count: thread.like_count, user_vote: vote }
  }

  async voteReply(
    replyId: string,
    vote: number
  ): Promise<{ like_count: number; user_vote: number }> {
    for (const thread of fallbackDiscussions) {
      const reply = thread.replies?.find(r => r.id === replyId)
      if (reply) {
        reply.like_count = Math.max(0, reply.like_count + (vote > 0 ? 1 : -1))
        reply.user_vote = vote
        return { like_count: reply.like_count, user_vote: vote }
      }
    }
    return { like_count: 0, user_vote: 0 }
  }

  async getReplies(threadId: string): Promise<DiscussionReply[]> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    return thread?.replies || []
  }

  async pinThread(threadId: string): Promise<{ is_pinned: boolean }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (thread) {
      thread.is_pinned = !thread.is_pinned
      return { is_pinned: thread.is_pinned }
    }
    return { is_pinned: false }
  }

  async resolveThread(threadId: string): Promise<{ is_resolved: boolean }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (thread) {
      thread.is_resolved = !thread.is_resolved
      return { is_resolved: thread.is_resolved }
    }
    return { is_resolved: false }
  }

  async acceptReply(threadId: string, replyId: string): Promise<{ is_accepted_answer: boolean }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (thread && thread.replies) {
      for (const r of thread.replies) {
        if (r.id === replyId) {
          r.is_accepted_answer = !r.is_accepted_answer
          return { is_accepted_answer: r.is_accepted_answer }
        }
      }
    }
    return { is_accepted_answer: false }
  }

  async summarizeThread(threadId: string): Promise<{ summary: string }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (!thread) {
      return { summary: 'Thread not found.' }
    }
    const replyPoints = (thread.replies || []).map((r, i) => `${i + 1}. ${r.content}`).join(' ')
    const summary = `**Key Takeaways from "${thread.title}"**:\n\n- The main discussion centers around structured preparation, step-by-step problem breakdown, and rigorous practice.\n- Community recommendations: ${replyPoints || 'Focus on foundational concepts and standard patterns.'}`
    return { summary }
  }

  async bookmarkThread(threadId: string, _userId: string): Promise<{ bookmarked: boolean }> {
    const thread = fallbackDiscussions.find(d => d.id === threadId)
    if (thread) {
      thread.is_bookmarked = !thread.is_bookmarked
      return { bookmarked: thread.is_bookmarked }
    }
    return { bookmarked: true }
  }
}

export const discussionService = new DiscussionService()
