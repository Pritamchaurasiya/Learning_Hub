import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import StudyGroupsPage from './StudyGroupsPage'

vi.mock('../services/studyGroupService', () => ({
  studyGroupService: {
    getGroups: vi.fn().mockResolvedValue([
      {
        id: 'sg-1',
        name: 'Distributed Systems & Cloud Architecture',
        description: 'Deep dive into Raft consensus and Kafka.',
        category: 'System Design',
        memberCount: 88,
        maxMembers: 100,
        isPrivate: false,
        isJoined: false,
        createdBy: 'Vikram Mehta',
        createdAt: new Date().toISOString(),
        topics: ['Consensus', 'Kafka'],
        recentActivity: 'Active 20m ago',
      },
    ]),
    joinGroup: vi.fn().mockResolvedValue({
      id: 'sg-1',
      name: 'Distributed Systems & Cloud Architecture',
      description: 'Deep dive into Raft consensus and Kafka.',
      category: 'System Design',
      memberCount: 89,
      maxMembers: 100,
      isPrivate: false,
      isJoined: true,
      createdBy: 'Vikram Mehta',
      createdAt: new Date().toISOString(),
      topics: ['Consensus', 'Kafka'],
      recentActivity: 'Active just now',
    }),
    leaveGroup: vi.fn().mockResolvedValue({
      id: 'sg-1',
      isJoined: false,
      memberCount: 88,
    }),
    createGroup: vi.fn().mockResolvedValue({
      id: 'sg-new',
      name: 'New Pod',
      isJoined: true,
      memberCount: 1,
    }),
  },
}))

describe('StudyGroupsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders study groups banner and category filters', async () => {
    render(<StudyGroupsPage />)
    expect(screen.getByText(/Live Collaborative Study Rooms/i)).toBeInTheDocument()
    expect(screen.getByText(/Peer Study Groups & Sprint Pods/i)).toBeInTheDocument()
  })

  it('renders group card and join button', async () => {
    render(<StudyGroupsPage />)
    await waitFor(() => {
      expect(screen.getByText('Distributed Systems & Cloud Architecture')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Join Room/i })).toBeInTheDocument()
  })
})
