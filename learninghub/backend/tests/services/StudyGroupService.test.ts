import { studyGroupService } from '../../src/services/StudyGroupService'

describe('StudyGroupService', () => {
  it('should list all study groups', async () => {
    const groups = await studyGroupService.getGroups()
    expect(Array.isArray(groups)).toBe(true)
    expect(groups.length).toBeGreaterThan(0)
  })

  it('should filter groups by category and search query', async () => {
    const dsaGroups = await studyGroupService.getGroups({ category: 'DSA' })
    expect(dsaGroups.every(g => g.category === 'DSA')).toBe(true)

    const queried = await studyGroupService.getGroups({ query: 'Raft' })
    expect(queried.length).toBeGreaterThan(0)
  })

  it('should allow joining and leaving a group', async () => {
    const joined = await studyGroupService.joinGroup('sg-2')
    expect(joined.isJoined).toBe(true)

    const left = await studyGroupService.leaveGroup('sg-2')
    expect(left.isJoined).toBe(false)
  })

  it('should create a new study group', async () => {
    const created = await studyGroupService.createGroup(
      {
        name: 'Quantum Computing Study Circle',
        description: 'Qubits, quantum circuits, and Shor algorithm.',
        category: 'General',
        maxMembers: 50,
        isPrivate: false,
        topics: ['Quantum Gates', 'Superposition'],
      },
      'QuantumLead'
    )
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Quantum Computing Study Circle')
    expect(created.createdBy).toBe('QuantumLead')
  })
})
