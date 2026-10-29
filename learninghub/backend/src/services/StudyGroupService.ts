import crypto from 'crypto'

export interface StudyGroupMember {
  id: string
  name: string
  avatar?: string
  role: 'admin' | 'moderator' | 'member'
  joinedAt: string
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  category: 'DSA' | 'System Design' | 'AI & ML' | 'Competitive Programming' | 'Web3' | 'General'
  examTarget?: string
  memberCount: number
  maxMembers: number
  isPrivate: boolean
  isJoined: boolean
  avatarUrl?: string
  createdBy: string
  createdAt: string
  topics: string[]
  recentActivity: string
}

const initialGroups: StudyGroup[] = [
  {
    id: 'sg-1',
    name: 'LeetCode & FAANG DSA Sprint',
    description: 'Daily grinding of hard DP, graphs, and system design mock interviews.',
    category: 'DSA',
    examTarget: 'SDE II / Senior FAANG Interviews',
    memberCount: 142,
    maxMembers: 200,
    isPrivate: false,
    isJoined: true,
    createdBy: 'Pritam Chaurasiya',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    topics: ['Dynamic Programming', 'Monotonic Stack', 'Graph DFS/BFS', 'Trie'],
    recentActivity: 'Active 5m ago - 14 members in live voice room',
  },
  {
    id: 'sg-2',
    name: 'Distributed Systems & Cloud Architecture',
    description: 'Deep dive into Raft consensus, Kafka event streaming, and LSM storage engines.',
    category: 'System Design',
    examTarget: 'Distributed Systems & Staff Eng',
    memberCount: 88,
    maxMembers: 100,
    isPrivate: false,
    isJoined: false,
    createdBy: 'Vikram Mehta',
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    topics: ['Consensus Protocols', 'Event Sourcing', 'PostgreSQL Internals', 'Redis Clustered'],
    recentActivity: 'Active 22m ago - New architecture diagram shared',
  },
  {
    id: 'sg-3',
    name: 'Generative AI & LLM Systems Research',
    description: 'Fine-tuning, LoRA, RLHF, multi-agent orchestrations, and vector retrieval pipelines.',
    category: 'AI & ML',
    examTarget: 'AI/ML Engineering & Research',
    memberCount: 175,
    maxMembers: 250,
    isPrivate: false,
    isJoined: true,
    createdBy: 'Elena Rostova',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    topics: ['Transformer Attention', 'LoRA / QLoRA', 'LangChain & Agentic DAGs', 'FlashAttention'],
    recentActivity: 'Active 1h ago - Benchmark results discussion',
  },
]

export class StudyGroupService {
  private groups: StudyGroup[] = [...initialGroups]

  async getGroups(filter?: { category?: string; query?: string }): Promise<StudyGroup[]> {
    let result = [...this.groups]
    if (filter?.category && filter.category !== 'All') {
      result = result.filter(g => g.category.toLowerCase() === filter.category?.toLowerCase())
    }
    if (filter?.query?.trim()) {
      const q = filter.query.trim().toLowerCase()
      result = result.filter(
        g =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.topics.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }

  async getGroupById(id: string): Promise<StudyGroup | null> {
    return this.groups.find(g => g.id === id) || null
  }

  async joinGroup(id: string, _userId?: string): Promise<StudyGroup> {
    const group = this.groups.find(g => g.id === id)
    if (!group) throw new Error('Study group not found')
    group.isJoined = true
    group.memberCount = Math.min(group.maxMembers, group.memberCount + 1)
    group.recentActivity = 'Active now - Member joined'
    return group
  }

  async leaveGroup(id: string, _userId?: string): Promise<StudyGroup> {
    const group = this.groups.find(g => g.id === id)
    if (!group) throw new Error('Study group not found')
    group.isJoined = false
    group.memberCount = Math.max(0, group.memberCount - 1)
    return group
  }

  async createGroup(
    data: Omit<StudyGroup, 'id' | 'memberCount' | 'isJoined' | 'createdAt' | 'recentActivity' | 'createdBy'>,
    creatorName = 'Learner'
  ): Promise<StudyGroup> {
    const newGroup: StudyGroup = {
      ...data,
      id: `sg-${crypto.randomUUID().slice(0, 8)}`,
      createdBy: creatorName,
      memberCount: 1,
      isJoined: true,
      createdAt: new Date().toISOString(),
      recentActivity: 'Created just now',
    }
    this.groups.unshift(newGroup)
    return newGroup
  }
}

export const studyGroupService = new StudyGroupService()
