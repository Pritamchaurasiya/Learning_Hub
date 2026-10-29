import crypto from 'crypto'

export interface UserNote {
  id: string
  userId?: string
  title: string
  content: string
  sourceType: 'lecture' | 'ebook' | 'live' | 'general'
  sourceTitle: string
  courseId?: string
  lessonId?: string
  timestampSeconds?: number
  tags: string[]
  createdAt?: string
  updatedAt: string
}

const initialNotes: UserNote[] = [
  {
    id: 'n-1',
    title: 'Raft Consensus: Leader Election & Log Replication Invariants',
    content: `Key properties to verify during Raft failovers:
1. Election Safety: At most one leader can be elected in a given term.
2. Leader Append-Only: A leader never overwrites or truncates its log; it only appends new entries.
3. Log Matching Property: If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.
4. Leader Completeness: If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.`,
    sourceType: 'lecture',
    sourceTitle: 'Distributed Systems & Fault-Tolerant Architectures',
    courseId: 'distributed-systems',
    lessonId: 'raft-consensus',
    timestampSeconds: 842,
    tags: ['Distributed Systems', 'Consensus', 'Architecture'],
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'n-2',
    title: 'Monotonic Stack Paradigm: Next Greater Element in O(N)',
    content: `Template for Next Greater Element:
- Maintain stack of indices.
- While stack is non-empty and nums[stack.peek()] < nums[i]:
    pop index, and result[popped] = nums[i].
- Push current index i to stack.
Guarantee: Elements are pushed and popped at most once -> O(N) linear time.`,
    sourceType: 'general',
    sourceTitle: 'DSA Mastery: Monotonic Queues and Stacks',
    tags: ['DSA', 'Stack', 'Algorithms', 'Interview Prep'],
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'n-3',
    title: 'PostgreSQL MVCC & VACUUM Internals',
    content: `In PostgreSQL, row updates create new tuple versions with xmin and xmax transaction IDs.
Dead tuples consume disk pages until reclaimed by autovacuum.
To prevent transaction ID wraparound:
- Freeze threshold triggers aggressive VACUUM FREEZE.
- Visibility map tracks all-visible pages for index-only scans.`,
    sourceType: 'ebook',
    sourceTitle: 'High Performance PostgreSQL Systems',
    tags: ['Database', 'PostgreSQL', 'Internals', 'Storage'],
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
]

export class UserNotesService {
  private notes: UserNote[] = [...initialNotes]

  async getNotes(userId?: string, query?: string, tag?: string): Promise<UserNote[]> {
    let result = [...this.notes]
    if (userId) {
      result = result.filter(n => !n.userId || n.userId === userId)
    }
    if (tag && tag !== 'All') {
      result = result.filter(n => n.tags.some(t => t.toLowerCase() === tag.toLowerCase()))
    }
    if (query?.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.sourceTitle.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }

  async getNoteById(id: string): Promise<UserNote | null> {
    return this.notes.find(n => n.id === id) || null
  }

  async createNote(
    data: Omit<UserNote, 'id' | 'updatedAt'>,
    userId?: string
  ): Promise<UserNote> {
    const newNote: UserNote = {
      ...data,
      id: `n-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.notes.unshift(newNote)
    return newNote
  }

  async updateNote(id: string, updates: Partial<UserNote>): Promise<UserNote> {
    const note = this.notes.find(n => n.id === id)
    if (!note) throw new Error('Note not found')
    Object.assign(note, updates, { updatedAt: new Date().toISOString() })
    return note
  }

  async deleteNote(id: string): Promise<boolean> {
    const index = this.notes.findIndex(n => n.id === id)
    if (index === -1) return false
    this.notes.splice(index, 1)
    return true
  }
}

export const userNotesService = new UserNotesService()
