import crypto from 'crypto'

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
    description: 'Is the code clean, modular, well-named, and easily readable?',
  },
  {
    id: 'time_complexity',
    label: 'Time & Space Efficiency',
    maxScore: 25,
    description: 'Is asymptotic complexity optimal without memory leaks?',
  },
  {
    id: 'documentation',
    label: 'Inline Comments & Reasoning',
    maxScore: 15,
    description: 'Are non-obvious steps explained clearly?',
  },
]

const initialAssignments: PeerReviewAssignment[] = [
  {
    id: 'pr-assign-1',
    submissionId: 'sub-dsa-401',
    submissionTitle: 'LRU Cache using Doubly-Linked List & Hash Map',
    authorName: 'Aarav Patel',
    courseTitle: 'Advanced Data Structures & High-Throughput Systems',
    language: 'typescript',
    codeSnippet: `class DLinkedNode {
  key: number;
  val: number;
  prev: DLinkedNode | null = null;
  next: DLinkedNode | null = null;
  constructor(key = 0, val = 0) {
    this.key = key;
    this.val = val;
  }
}

export class LRUCache {
  private capacity: number;
  private cache = new Map<number, DLinkedNode>();
  private head = new DLinkedNode();
  private tail = new DLinkedNode();

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    const node = this.cache.get(key);
    if (!node) return -1;
    this.moveToHead(node);
    return node.val;
  }

  put(key: number, value: number): void {
    const node = this.cache.get(key);
    if (!node) {
      const newNode = new DLinkedNode(key, value);
      this.cache.set(key, newNode);
      this.addNode(newNode);
      if (this.cache.size > this.capacity) {
        const tailNode = this.popTail();
        this.cache.delete(tailNode.key);
      }
    } else {
      node.val = value;
      this.moveToHead(node);
    }
  }

  private addNode(node: DLinkedNode) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: DLinkedNode) {
    const prev = node.prev!;
    const next = node.next!;
    prev.next = next;
    next.prev = prev;
  }

  private moveToHead(node: DLinkedNode) {
    this.removeNode(node);
    this.addNode(node);
  }

  private popTail(): DLinkedNode {
    const res = this.tail.prev!;
    this.removeNode(res);
    return res;
  }
}`,
    assignedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    dueBy: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'pending',
    rubric: DEFAULT_RUBRIC,
  },
  {
    id: 'pr-assign-2',
    submissionId: 'sub-sys-204',
    submissionTitle: 'Token Bucket Rate Limiter with Sliding Window Counter',
    authorName: 'Sneha Krishnan',
    courseTitle: 'System Design: Distributed Microservices & Resilience',
    language: 'python',
    codeSnippet: `import time
import threading

class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec
        self.tokens = capacity
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def allow_request(self, tokens_needed: int = 1) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            if self.tokens >= tokens_needed:
                self.tokens -= tokens_needed
                return True
            return False`,
    assignedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    dueBy: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'submitted',
    rubric: DEFAULT_RUBRIC,
    feedback: {
      id: 'fb-204',
      assignmentId: 'pr-assign-2',
      comments:
        'Clean thread-safe token bucket implementation! Space complexity is strictly O(1) and locks prevent race conditions under high concurrent bursts.',
      score: 92,
      criteriaScores: {
        correctness: 35,
        code_quality: 24,
        time_complexity: 23,
        documentation: 10,
      },
      submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  },
]

export class PeerReviewService {
  private assignments: PeerReviewAssignment[] = [...initialAssignments]

  async getAssignments(status?: PeerReviewStatus): Promise<PeerReviewAssignment[]> {
    if (status) {
      return this.assignments.filter(a => a.status === status)
    }
    return this.assignments
  }

  async getAssignmentById(id: string): Promise<PeerReviewAssignment | null> {
    return this.assignments.find(a => a.id === id) || null
  }

  async submitReview(
    assignmentId: string,
    data: {
      comments: string
      criteriaScores: Record<string, number>
      score: number
    }
  ): Promise<PeerReviewAssignment> {
    const assign = this.assignments.find(a => a.id === assignmentId)
    if (!assign) throw new Error('Peer review assignment not found')

    const feedback: PeerReviewFeedback = {
      id: `fb-${crypto.randomUUID()}`,
      assignmentId,
      comments: data.comments,
      score: data.score,
      criteriaScores: data.criteriaScores,
      submittedAt: new Date().toISOString(),
    }

    assign.status = 'submitted'
    assign.feedback = feedback
    return assign
  }

  async disputeReview(assignmentId: string, reason: string): Promise<PeerReviewAssignment> {
    const assign = this.assignments.find(a => a.id === assignmentId)
    if (!assign) throw new Error('Peer review assignment not found')
    assign.status = 'disputed'
    if (assign.feedback) {
      assign.feedback.comments += `\n[Disputed: ${reason}]`
    }
    return assign
  }
}

export const peerReviewService = new PeerReviewService()
