/**
 * Study Groups Service
 * Enables collaborative student study groups, topic-based rooms, and member management.
 * Ports functionality from legacy Flutter study_groups_screen.dart to TypeScript.
 */

import { fetchApi } from '../utils/api'

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

const LOCAL_STORAGE_KEY = 'learninghub_study_groups_v1'

const MOCK_GROUPS: StudyGroup[] = [
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
    examTarget: 'Applied AI & ML Research',
    memberCount: 215,
    maxMembers: 250,
    isPrivate: false,
    isJoined: true,
    createdBy: 'Dr. Aris Vance',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    topics: ['RAG Architectures', 'KV Cache Optimization', 'Agent Tool Calling', 'PyTorch'],
    recentActivity: 'Active 1h ago - 3 new benchmark notebooks posted',
  },
  {
    id: 'sg-4',
    name: 'JEE Advanced Physics & Mathematics Club',
    description: 'Rigorous problem solving from Irodov, Krotov, and past 20-year JEE papers.',
    category: 'General',
    examTarget: 'JEE Advanced / Olympiads',
    memberCount: 310,
    maxMembers: 500,
    isPrivate: false,
    isJoined: false,
    createdBy: 'Aman Verma',
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    topics: ['Electrodynamics', 'Calculus', 'Thermodynamics', 'Rigid Body Dynamics'],
    recentActivity: 'Active 3h ago - Daily problem challenge concluded',
  },
]

function getLocalGroups(): StudyGroup[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return MOCK_GROUPS
}

function saveLocalGroups(groups: StudyGroup[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // fallback
  }
}

export const studyGroupService = {
  getGroups: async (filter?: { category?: string; query?: string }): Promise<StudyGroup[]> => {
    try {
      const res = await fetchApi<{ status: string; data: StudyGroup[] }>('/study-groups')
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    let groups = getLocalGroups()
    if (filter?.category && filter.category !== 'All') {
      groups = groups.filter(g => g.category.toLowerCase() === filter.category?.toLowerCase())
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase()
      groups = groups.filter(
        g =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.topics.some(t => t.toLowerCase().includes(q))
      )
    }
    return groups
  },

  joinGroup: async (groupId: string): Promise<StudyGroup> => {
    try {
      const res = await fetchApi<{ status: string; data: StudyGroup }>(
        `/study-groups/${groupId}/join`,
        {
          method: 'POST',
        }
      )
      if (res?.data) return res.data
    } catch {
      // optimistic update
    }
    const groups = getLocalGroups()
    const target = groups.find(g => g.id === groupId)
    if (target) {
      target.isJoined = true
      target.memberCount += 1
      saveLocalGroups(groups)
      return target
    }
    throw new Error('Group not found')
  },

  leaveGroup: async (groupId: string): Promise<StudyGroup> => {
    try {
      const res = await fetchApi<{ status: string; data: StudyGroup }>(
        `/study-groups/${groupId}/leave`,
        {
          method: 'POST',
        }
      )
      if (res?.data) return res.data
    } catch {
      // optimistic update
    }
    const groups = getLocalGroups()
    const target = groups.find(g => g.id === groupId)
    if (target) {
      target.isJoined = false
      target.memberCount = Math.max(1, target.memberCount - 1)
      saveLocalGroups(groups)
      return target
    }
    throw new Error('Group not found')
  },

  createGroup: async (
    payload: Omit<StudyGroup, 'id' | 'memberCount' | 'isJoined' | 'createdAt' | 'recentActivity'>
  ): Promise<StudyGroup> => {
    try {
      const res = await fetchApi<{ status: string; data: StudyGroup }>('/study-groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    const groups = getLocalGroups()
    const newGroup: StudyGroup = {
      ...payload,
      id: `sg-${Date.now()}`,
      memberCount: 1,
      isJoined: true,
      createdAt: new Date().toISOString(),
      recentActivity: 'Created just now',
    }
    groups.unshift(newGroup)
    saveLocalGroups(groups)
    return newGroup
  },
}
