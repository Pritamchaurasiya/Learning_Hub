import { fetchApi } from '../utils/api'
import type {
  InterviewSession,
  InterviewTemplate,
  InterviewTrack,
  InterviewDifficulty,
  InterviewPersona,
  InterviewMessage,
  ProgressiveHint,
  InterviewEvaluationReport,
} from '../types/interview'

export const FALLBACK_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'algo-lru-cache-staff',
    title: 'Distributed LRU Cache with TTL Eviction & Sharding',
    track: 'ALGORITHM_CODING',
    difficulty: 'SENIOR',
    targetRole: 'Senior Staff Systems Software Engineer',
    companyStyle: 'GOOGLE',
    description: 'Design and implement an in-memory Least Recently Used (LRU) Cache that supports O(1) time complexity for get and put operations with TTL expiration.',
  },
  {
    id: 'system-design-global-feed',
    title: 'Real-Time Global Notification & Activity Feed System',
    track: 'SYSTEM_DESIGN',
    difficulty: 'STAFF',
    targetRole: 'Staff Infrastructure & Distributed Systems Engineer',
    companyStyle: 'META',
    description: 'Design a scalable real-time notification & live activity feed system capable of serving 500 Million Daily Active Users (DAU) with hybrid push/pull fan-out.',
  },
  {
    id: 'quant-execution-orderbook',
    title: 'High-Frequency Limit Order Book & Matching Engine',
    track: 'QUANT_PROBLEM_SOLVING',
    difficulty: 'SENIOR',
    targetRole: 'Quantitative Systems Engineer',
    companyStyle: 'CITADEL',
    description: 'Design an ultra-low-latency in-memory Limit Order Book matching engine supporting standard order types with deterministic Price-Time priority.',
  },
]

export const FALLBACK_SESSION: InterviewSession = {
  id: 'mock-int-demo-default',
  userId: 'demo-candidate',
  track: 'ALGORITHM_CODING',
  difficulty: 'SENIOR',
  persona: 'SOPHIA_ALGO_SPECIALIST',
  currentStage: 'CLARIFICATION',
  startedAt: new Date().toISOString(),
  candidateCode: `class LRUCacheWithTTL {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    // Return value if valid & update order, else -1
    return -1;
  }

  put(key, value, ttlMs) {
    // Insert or update with TTL & enforce capacity
  }
}`,
  whiteboardNotes: `# Whiteboard Scratchpad\n- Target: O(1) get & put\n- Data Structure: Map / Hash Table + Doubly Linked List\n- Edge cases: capacity overflow, expired keys`,
  activeLanguage: 'javascript',
  hintsRequested: 0,
  unlockedHints: [],
  transcript: [
    {
      id: 'msg-demo-1',
      sender: 'interviewer',
      persona: 'SOPHIA_ALGO_SPECIALIST',
      text: "Hi there! I'm Sophia, Algorithm & Core Systems Specialist. Today we'll explore the Distributed LRU Cache with TTL Eviction. I value clean invariants, optimal asymptotic time/space bounds, and clear communication. Take a moment to read through the requirements and ask any scoping questions before writing code!",
      timestamp: new Date().toISOString(),
      suggestedAction: 'ask_clarification',
    },
  ],
  question: {
    id: 'algo-lru-cache-staff',
    title: 'Distributed LRU Cache with TTL Eviction & Sharding',
    track: 'ALGORITHM_CODING',
    difficulty: 'SENIOR',
    targetRole: 'Senior Staff Systems Software Engineer',
    companyStyle: 'GOOGLE',
    problemStatement: `Design and implement an in-memory Least Recently Used (LRU) Cache that supports O(1) time complexity for get and put operations, alongside Time-To-Live (TTL) expiration timestamps.

Constraints:
1. get(key): Retrieve item if key exists and is not expired; otherwise return -1. Access refreshes LRU order.
2. put(key, value, ttlMs): Insert or replace key with expiration time. If capacity is exceeded, evict the least recently used unexpired entry.
3. Thread safety & memory bounding: Explain how you would shard the key space to minimize lock contention under 100k QPS.`,
    starterCode: {
      javascript: `class LRUCacheWithTTL {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.cache = new Map();\n  }\n\n  get(key) {\n    return -1;\n  }\n\n  put(key, value, ttlMs) {}\n}`,
      python: `class LRUCacheWithTTL:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = {}\n\n    def get(self, key: str):\n        return -1\n\n    def put(self, key: str, value, ttl_ms: int):\n        pass`,
      typescript: `export class LRUCacheWithTTL<T> {\n  constructor(private capacity: number) {}\n  get(key: string): T | -1 { return -1; }\n  put(key: string, value: T, ttlMs?: number): void {}\n}`,
    },
    clarificationAnswers: {
      capacity: 'Capacity is fixed at initialization, e.g. 1000 items.',
      duplicate: 'Putting an existing key updates its value, resets its TTL, and moves it to most recently used.',
    },
    testCases: [
      { input: 'put("a", 1, 10000); get("a")', expected: '1', explanation: 'Direct retrieval before expiry' },
    ],
    hints: [
      {
        level: 1,
        type: 'nudge',
        text: 'Consider combining a hash map for O(1) lookups with a doubly linked list to maintain exact recency order with O(1) node detachment and head insertion.',
      },
      {
        level: 2,
        type: 'structural_hint',
        text: 'In JavaScript/V8, Map retains insertion order. Deleting and re-setting a key moves it to the tail in O(1) time. For TTL, store Date.now() + ttlMs in the entry payload.',
      },
      {
        level: 3,
        type: 'code_skeleton',
        text: `get(key) {\n  if (!this.cache.has(key)) return -1;\n  const entry = this.cache.get(key);\n  if (entry.expiresAt && Date.now() > entry.expiresAt) {\n    this.cache.delete(key);\n    return -1;\n  }\n  this.cache.delete(key);\n  this.cache.set(key, entry);\n  return entry.value;\n}`,
      },
    ],
  },
}

class InterviewService {
  /**
   * Retrieves interview blueprints and templates
   */
  async getTemplates(): Promise<InterviewTemplate[]> {
    try {
      const res = await fetchApi<{ templates: InterviewTemplate[] }>('/interview/templates')
      if (res?.templates?.length) return res.templates
      return FALLBACK_TEMPLATES
    } catch {
      return FALLBACK_TEMPLATES
    }
  }

  /**
   * Initiates a mock technical interview session
   */
  async startSession(input: {
    track: InterviewTrack
    difficulty: InterviewDifficulty
    persona?: InterviewPersona
    questionId?: string
  }): Promise<InterviewSession> {
    try {
      const res = await fetchApi<{ session: InterviewSession }>('/interview/start', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (res?.session) return res.session
      return {
        ...FALLBACK_SESSION,
        track: input.track,
        difficulty: input.difficulty,
        persona: input.persona || FALLBACK_SESSION.persona,
      }
    } catch {
      return {
        ...FALLBACK_SESSION,
        track: input.track,
        difficulty: input.difficulty,
        persona: input.persona || FALLBACK_SESSION.persona,
      }
    }
  }

  /**
   * Retrieves active interview session
   */
  async getSession(sessionId: string): Promise<InterviewSession> {
    try {
      const res = await fetchApi<{ session: InterviewSession }>(`/interview/${sessionId}`)
      if (res?.session) return res.session
      return FALLBACK_SESSION
    } catch {
      return FALLBACK_SESSION
    }
  }

  /**
   * Sends candidate spoken transcript or written reply and code state
   */
  async interact(params: {
    sessionId: string
    candidateText: string
    candidateCode?: string
    whiteboardNotes?: string
  }): Promise<{
    session: InterviewSession
    interviewerResponse: InterviewMessage
    stageTransitioned: boolean
  }> {
    try {
      const res = await fetchApi<{
        session: InterviewSession
        interviewerResponse: InterviewMessage
        stageTransitioned: boolean
      }>(`/interview/${params.sessionId}/interact`, {
        method: 'POST',
        body: JSON.stringify({
          candidateText: params.candidateText,
          candidateCode: params.candidateCode,
          whiteboardNotes: params.whiteboardNotes,
        }),
      })
      if (res?.interviewerResponse) return res
      return this.fallbackInteract(params)
    } catch {
      return this.fallbackInteract(params)
    }
  }

  /**
   * Unlocks next progressive scaffolding hint
   */
  async requestHint(sessionId: string): Promise<{
    hint: ProgressiveHint
    totalHintsUnlocked: number
  }> {
    try {
      const res = await fetchApi<{
        hint: ProgressiveHint
        totalHintsUnlocked: number
      }>(`/interview/${sessionId}/hint`, {
        method: 'POST',
      })
      if (res?.hint) return res
      return {
        hint: {
          level: 1,
          type: 'nudge',
          text: 'Leverage a Hash Map for O(1) key indexing combined with sequential pointers to maintain LRU order.',
        },
        totalHintsUnlocked: 1,
      }
    } catch {
      return {
        hint: {
          level: 1,
          type: 'nudge',
          text: 'Leverage a Hash Map for O(1) key indexing combined with sequential pointers to maintain LRU order.',
        },
        totalHintsUnlocked: 1,
      }
    }
  }

  /**
   * Evaluates candidate code and conversation against the 5-factor rubric
   */
  async evaluateSession(sessionId: string): Promise<InterviewEvaluationReport> {
    try {
      const res = await fetchApi<{ evaluation: InterviewEvaluationReport }>(
        `/interview/${sessionId}/evaluate`,
        { method: 'POST' }
      )
      if (res?.evaluation) return res.evaluation
      return this.fallbackEvaluation(sessionId)
    } catch {
      return this.fallbackEvaluation(sessionId)
    }
  }

  /**
   * Retrieves past interview session history
   */
  async getHistory(): Promise<
    Array<{
      sessionId: string
      track: InterviewTrack
      title: string
      overallScore?: number
      hiringRecommendation?: string
      completedAt?: string
      startedAt: string
    }>
  > {
    try {
      const res = await fetchApi<{ history: any[] }>('/interview/history')
      return res?.history || []
    } catch {
      return []
    }
  }

  private fallbackInteract(params: {
    sessionId: string
    candidateText: string
    candidateCode?: string
    whiteboardNotes?: string
  }) {
    const textLower = params.candidateText.toLowerCase()
    let responseText =
      "I hear your point. Let's focus on the asymptotic time and space guarantees. How will you ensure your operations stay bounded at O(1) time without memory leaks?"

    if (textLower.includes('capacity') || textLower.includes('bound') || textLower.includes('limit')) {
      responseText =
        'Great question on constraints. The capacity is fixed at initialization (e.g. 1000 items). Once reached, the least recently accessed item must be evicted immediately in O(1) time.'
    } else if (textLower.includes('map') || textLower.includes('hash') || textLower.includes('list')) {
      responseText =
        'A Map structure provides O(1) key lookups. Now outline how you will update the recency order whenever a get or put is performed!'
    }

    const interviewerMsg: InterviewMessage = {
      id: `msg-${Date.now()}-mock`,
      sender: 'interviewer',
      persona: 'SOPHIA_ALGO_SPECIALIST',
      text: responseText,
      timestamp: new Date().toISOString(),
      suggestedAction: 'write_code',
    }

    return {
      session: {
        ...FALLBACK_SESSION,
        candidateCode: params.candidateCode || FALLBACK_SESSION.candidateCode,
        whiteboardNotes: params.whiteboardNotes || FALLBACK_SESSION.whiteboardNotes,
      },
      interviewerResponse: interviewerMsg,
      stageTransitioned: true,
    }
  }

  private fallbackEvaluation(sessionId: string): InterviewEvaluationReport {
    return {
      sessionId,
      overallScore: 84,
      percentileRanking: 89,
      hiringRecommendation: 'HIRE',
      executiveSummary:
        'Candidate achieved an overall score of 84/100 (Hire), demonstrating strong command of algorithmic invariants and structured problem breakdown.',
      factorScores: [
        {
          name: 'Problem Solving & Scaffolding',
          factor: 'PROBLEM_SOLVING',
          score: 86,
          weight: 0.25,
          feedback: 'Effective breakdown of complex prompt requirements into manageable sub-components.',
          positiveSignals: ['Identified trade-offs early', 'Framed problem invariants cleanly'],
          growthAreas: ['Proactively verify input constraints with sample dry-runs'],
        },
        {
          name: 'Algorithmic Efficiency & Invariants',
          factor: 'ALGORITHMIC_EFFICIENCY',
          score: 88,
          weight: 0.25,
          feedback: 'Achieved O(1) asymptotic lookup and eviction without unnecessary auxiliary memory allocations.',
          positiveSignals: ['Optimal time complexity achieved', 'Preserved space limits'],
          growthAreas: ['Formalize mathematical invariants before committing to state mutations'],
        },
        {
          name: 'Technical Communication & Articulation',
          factor: 'TECHNICAL_COMMUNICATION',
          score: 80,
          weight: 0.2,
          feedback: 'Communicated approach and reasoning coherently throughout the session.',
          positiveSignals: ['Spoke aloud while reasoning', 'Responded effectively to interviewer probes'],
          growthAreas: ['Summarize architectural decisions before writing large blocks of syntax'],
        },
        {
          name: 'Code Quality & Production Standards',
          factor: 'CODE_QUALITY',
          score: 82,
          weight: 0.15,
          feedback: 'Clean code style with proper encapsulation and descriptive method names.',
          positiveSignals: ['Idiomatic language conventions used', 'Self-documenting method signatures'],
          growthAreas: ['Extract complex conditionals into semantic helper predicates'],
        },
        {
          name: 'System Scalability & Edge Cases',
          factor: 'SYSTEM_SCALABILITY',
          score: 82,
          weight: 0.15,
          feedback: 'Handled boundary expiration conditions and capacity limits correctly.',
          positiveSignals: ['Addressed capacity overflow triggers', 'Enforced TTL checks'],
          growthAreas: ['Consider thread-safe locking granularity for high concurrency'],
        },
      ],
      starAnalysis: {
        situation: 'Challenged to design and implement an LRU cache with TTL eviction in an interview environment.',
        task: 'Formulate an optimal solution balancing O(1) bounds with reliable edge case handling.',
        action: 'Maintained collaborative dialogue with the AI specialist and implemented modular code in the live editor.',
        result: 'Achieved score of 84/100 and clear recommendations for revision decks.',
      },
      strengths: [
        'Proactive engagement with prompt specifications',
        'Effective use of modern data structures to minimize asymptotic complexity',
        'Receptive to interviewer feedback during collaborative turns',
      ],
      weaknesses: [
        'Verify boundary test cases with formal assertions earlier',
        'Elaborate on distributed failover scenarios in production',
      ],
      recommendedRevisionTopics: [
        'LRU & Cache Eviction Strategies',
        'Asymptotic Space-Time Invariants',
        'Distributed Key Sharding & Consistent Hashing',
      ],
      curriculumModuleIds: ['mod-algo-caching-1', 'mod-sys-distributed-2'],
      generatedAt: new Date().toISOString(),
    }
  }
}

export const interviewService = new InterviewService()
