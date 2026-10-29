/**
 * Peer Review Service
 * Manages collaborative peer evaluations, assignments, rubric scoring, and feedback history.
 * Replaces legacy Flutter peer_review_service.dart with complete TypeScript implementation.
 */

import { fetchApi } from '../utils/api'

export type PeerReviewStatus = 'pending' | 'submitted' | 'graded' | 'disputed'

export interface RubricCriterion {
  id: string
  label: string
  maxScore: number
  description: string
}

export interface PeerReviewFeedback {
  id?: string
  assignmentId: string
  comments: string
  score: number // 0 - 100
  criteriaScores: Record<string, number>
  submittedAt: string
}

export interface PeerReviewAssignment {
  id: string
  submissionId: string
  submissionTitle: string
  authorName: string
  courseTitle: string
  language?: string
  codeSnippet?: string
  assignedAt: string
  dueBy: string
  status: PeerReviewStatus
  rubric: RubricCriterion[]
  feedback?: PeerReviewFeedback
}

export interface SubmitReviewPayload {
  assignmentId: string
  comments: string
  criteriaScores: Record<string, number>
  score: number
}

const LOCAL_STORAGE_KEY = 'learninghub_peer_reviews_v1'

const DEFAULT_RUBRIC: RubricCriterion[] = [
  {
    id: 'correctness',
    label: 'Algorithmic Correctness & Logic',
    maxScore: 35,
    description: 'Does the implementation solve all boundary constraints and corner cases?',
  },
  {
    id: 'code_quality',
    label: 'Code Cleanliness & Style',
    maxScore: 25,
    description: 'Idiomatic naming conventions, modular functions, and clean abstractions.',
  },
  {
    id: 'performance',
    label: 'Time & Space Efficiency',
    maxScore: 25,
    description: 'Optimal computational complexity without memory leaks or redundant work.',
  },
  {
    id: 'test_coverage',
    label: 'Testing & Robustness',
    maxScore: 15,
    description: 'Defensive validation, error boundaries, and assertions.',
  },
]

const MOCK_ASSIGNMENTS: PeerReviewAssignment[] = [
  {
    id: 'pra-101',
    submissionId: 'sub-901',
    submissionTitle: 'Optimized LRU Cache Implementation with O(1) Eviction',
    authorName: 'Alex Chen',
    courseTitle: 'Advanced Data Structures & High-Performance Systems',
    language: 'typescript',
    codeSnippet: `class Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;
  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private capacity: number;
  private map = new Map<K, Node<K, V>>();
  private head = new Node<any, any>(null, null);
  private tail = new Node<any, any>(null, null);

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }
}`,
    assignedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueBy: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'pending',
    rubric: DEFAULT_RUBRIC,
  },
  {
    id: 'pra-102',
    submissionId: 'sub-902',
    submissionTitle: 'Concurrent Rate Limiter using Token Bucket Algorithm',
    authorName: 'Priya Sharma',
    courseTitle: 'Distributed Systems & Microservices Architecture',
    language: 'python',
    codeSnippet: `import time
from threading import Lock

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()
        self.lock = Lock()

    def consume(self, tokens: int = 1) -> bool:
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False`,
    assignedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    dueBy: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'submitted',
    rubric: DEFAULT_RUBRIC,
    feedback: {
      assignmentId: 'pra-102',
      score: 94,
      comments:
        'Excellent thread-safe synchronization. The monotonically increasing clock avoids NTP jump regressions. Consider adding batch consumption support.',
      criteriaScores: {
        correctness: 35,
        code_quality: 24,
        performance: 22,
        test_coverage: 13,
      },
      submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  },
]

function getLocalData(): PeerReviewAssignment[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // ignore
  }
  return MOCK_ASSIGNMENTS
}

function saveLocalData(data: PeerReviewAssignment[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export const peerReviewService = {
  getPendingReviews: async (): Promise<PeerReviewAssignment[]> => {
    try {
      const res = await fetchApi<{ status: string; data: PeerReviewAssignment[] }>(
        '/peer-reviews/pending'
      )
      if (res?.data) return res.data
    } catch {
      // fallback to persistent local store
    }
    return getLocalData().filter(item => item.status === 'pending')
  },

  getAllReviews: async (): Promise<PeerReviewAssignment[]> => {
    try {
      const res = await fetchApi<{ status: string; data: PeerReviewAssignment[] }>(
        '/peer-reviews/all'
      )
      if (res?.data) return res.data
    } catch {
      // fallback to persistent local store
    }
    return getLocalData()
  },

  getMyFeedback: async (): Promise<PeerReviewAssignment[]> => {
    try {
      const res = await fetchApi<{ status: string; data: PeerReviewAssignment[] }>(
        '/peer-reviews/feedback'
      )
      if (res?.data) return res.data
    } catch {
      // fallback
    }
    return getLocalData().filter(item => item.status === 'submitted' || item.status === 'graded')
  },

  submitReview: async (payload: SubmitReviewPayload): Promise<PeerReviewAssignment> => {
    try {
      const res = await fetchApi<{ status: string; data: PeerReviewAssignment }>(
        '/peer-reviews/submit',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
      if (res?.data) return res.data
    } catch {
      // local optimistic update
    }

    const items = getLocalData()
    const target = items.find(i => i.id === payload.assignmentId)
    if (target) {
      target.status = 'submitted'
      target.feedback = {
        assignmentId: payload.assignmentId,
        score: payload.score,
        comments: payload.comments,
        criteriaScores: payload.criteriaScores,
        submittedAt: new Date().toISOString(),
      }
      saveLocalData(items)
      return target
    }
    throw new Error('Assignment not found')
  },
}
