import { userNotesService } from '../../src/services/UserNotesService'

describe('UserNotesService', () => {
  it('should list notes and support tag/query filtering', async () => {
    const notes = await userNotesService.getNotes()
    expect(Array.isArray(notes)).toBe(true)
    expect(notes.length).toBeGreaterThan(0)

    const filtered = await userNotesService.getNotes(undefined, 'PostgreSQL')
    expect(filtered.some(n => n.title.includes('PostgreSQL'))).toBe(true)
  })

  it('should create, update, and delete user notes', async () => {
    const created = await userNotesService.createNote({
      title: 'Dijkstra Priority Queue Optimization',
      content: 'Store (distance, vertex) tuples in min-heap to achieve O((V + E) log V).',
      sourceType: 'lecture',
      sourceTitle: 'Graph Algorithms Masterclass',
      tags: ['DSA', 'Graphs', 'Dijkstra'],
    }, 'user-test-notes')

    expect(created.id).toBeDefined()
    expect(created.userId).toBe('user-test-notes')

    const updated = await userNotesService.updateNote(created.id, {
      title: 'Dijkstra Algorithm with Binary Heap',
    })
    expect(updated.title).toBe('Dijkstra Algorithm with Binary Heap')

    const deleted = await userNotesService.deleteNote(created.id)
    expect(deleted).toBe(true)
  })
})
