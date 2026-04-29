import { fetchApi } from '../utils/api'

export interface Author {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  reputation?: number
}

export interface Discussion {
  id: string
  title: string
  content: string
  author: Author
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
  user_vote?: number // 1, -1, or 0
  is_bookmarked?: boolean
}

export interface DiscussionReply {
  id: string
  content: string
  author: Author
  created_at: string
  updated_at: string
  like_count: number
  is_accepted_answer: boolean
  user_vote?: number
  nested_replies?: DiscussionReply[]
}

export interface DiscussionThreadDetail extends Discussion {
  replies: DiscussionReply[]
}

export interface CreateDiscussionInput {
  title: string
  content: string
  course_id?: string
  tags?: string[]
}

export interface CreateReplyInput {
  content: string
  parent_id?: string
}

export const discussionService = {
  // Get all discussion threads
  async getDiscussions(params?: {
    course?: string
    search?: string
    ordering?: string
    page?: number
    signal?: AbortSignal
  }): Promise<{ status: string; data: Discussion[]; meta?: { count: number; next?: string; previous?: string } }> {
    const queryParams = new URLSearchParams()
    if (params?.course) queryParams.append('course', params.course)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.ordering) queryParams.append('ordering', params.ordering)
    if (params?.page) queryParams.append('page', String(params.page))

    const query = queryParams.toString()
    return fetchApi(`/discussions/threads/${query ? `?${query}` : ''}`, { signal: params?.signal })
  },

  // Get trending discussions
  async getTrending(limit: number = 10, signal?: AbortSignal): Promise<{ status: string; data: Discussion[] }> {
    return fetchApi(`/discussions/trending/?limit=${limit}`, { signal })
  },

  // Search discussions
  async searchDiscussions(query: string, limit: number = 20): Promise<{ status: string; data: Discussion[]; meta: { query: string; count: number } }> {
    return fetchApi(`/discussions/threads/search/?q=${encodeURIComponent(query)}&limit=${limit}`)
  },

  // Get single discussion with replies
  async getDiscussion(id: string): Promise<{ status: string; data: DiscussionThreadDetail }> {
    return fetchApi(`/discussions/threads/${id}`)
  },

  // Create new discussion
  async createDiscussion(input: CreateDiscussionInput): Promise<{ status: string; data: Discussion }> {
    return fetchApi('/discussions/threads', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  },

  // Vote on discussion (1 for upvote, -1 for downvote, 0 to remove)
  async voteDiscussion(id: string, value: 1 | -1 | 0): Promise<{ status: string; like_count: number; user_vote: number }> {
    return fetchApi(`/discussions/threads/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value })
    })
  },

  // Pin/unpin discussion
  async pinDiscussion(id: string): Promise<{ status: string; is_pinned: boolean }> {
    return fetchApi(`/discussions/threads/${id}/pin`, {
      method: 'POST'
    })
  },

  // Mark as resolved
  async resolveDiscussion(id: string): Promise<{ status: string; is_resolved: boolean }> {
    return fetchApi(`/discussions/threads/${id}/resolve`, {
      method: 'POST'
    })
  },

  // Get replies for a discussion
  async getReplies(threadId: string): Promise<{ status: string; data: DiscussionReply[] }> {
    return fetchApi(`/discussions/threads/${threadId}/replies`)
  },

  // Create reply
  async createReply(threadId: string, input: CreateReplyInput): Promise<{ status: string; data: DiscussionReply }> {
    return fetchApi(`/discussions/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify(input)
    })
  },

  // Vote on reply
  async voteReply(threadId: string, replyId: string, value: 1 | -1 | 0): Promise<{ status: string; like_count: number; user_vote: number }> {
    return fetchApi(`/discussions/threads/${threadId}/replies/${replyId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value })
    })
  },

  // Accept reply as answer
  async acceptReply(threadId: string, replyId: string): Promise<{ status: string; is_accepted_answer: boolean }> {
    return fetchApi(`/discussions/threads/${threadId}/replies/${replyId}/accept`, {
      method: 'POST'
    })
  },

  // Get AI summary of discussion
  async getSummary(threadId: string): Promise<{ status: string; data: { summary: string; key_points: string[] } }> {
    return fetchApi(`/discussions/threads/${threadId}/summarize`)
  }
}
