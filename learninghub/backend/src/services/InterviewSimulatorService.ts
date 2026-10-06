import crypto from 'crypto'
import logger from '../utils/logger'

export type InterviewTrack =
  | 'ALGORITHM_CODING'
  | 'SYSTEM_DESIGN'
  | 'FULLSTACK_LIVE'
  | 'BEHAVIORAL_STAR'
  | 'QUANT_PROBLEM_SOLVING'

export type InterviewDifficulty = 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL'

export type InterviewPersona = 'ALEX_STAFF_ARCHITECT' | 'SOPHIA_ALGO_SPECIALIST'

export type TurnStage =
  | 'GREETING'
  | 'CLARIFICATION'
  | 'HIGH_LEVEL_DESIGN'
  | 'IMPLEMENTATION'
  | 'OPTIMIZATION_EDGE_CASES'
  | 'BEHAVIORAL_FOLLOWUP'
  | 'WRAPUP'
  | 'COMPLETED'

export interface InterviewMessage {
  id: string
  sender: 'interviewer' | 'candidate' | 'system'
  persona?: InterviewPersona
  text: string
  timestamp: string
  codeSnippet?: string
  suggestedAction?: 'ask_clarification' | 'sketch_approach' | 'write_code' | 'test_edge_cases' | 'submit_solution'
}

export interface ProgressiveHint {
  level: 1 | 2 | 3
  type: 'nudge' | 'structural_hint' | 'code_skeleton'
  text: string
  unlockedAt?: string
}

export interface RubricFactorScore {
  name: string
  factor: 'PROBLEM_SOLVING' | 'ALGORITHMIC_EFFICIENCY' | 'TECHNICAL_COMMUNICATION' | 'CODE_QUALITY' | 'SYSTEM_SCALABILITY'
  score: number // 0 - 100
  weight: number
  feedback: string
  positiveSignals: string[]
  growthAreas: string[]
}

export interface InterviewEvaluationReport {
  sessionId: string
  overallScore: number // 0 - 100
  percentileRanking: number
  hiringRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEANING_HIRE' | 'LEANING_NO_HIRE' | 'NO_HIRE'
  executiveSummary: string
  factorScores: RubricFactorScore[]
  starAnalysis?: {
    situation: string
    task: string
    action: string
    result: string
  }
  strengths: string[]
  weaknesses: string[]
  recommendedRevisionTopics: string[]
  curriculumModuleIds: string[]
  generatedAt: string
}

export interface InterviewQuestionItem {
  id: string
  title: string
  track: InterviewTrack
  difficulty: InterviewDifficulty
  targetRole: string
  companyStyle: 'GOOGLE' | 'META' | 'AMAZON' | 'UBER' | 'STRIPE' | 'CITADEL'
  problemStatement: string
  starterCode: {
    javascript: string
    python: string
    typescript: string
  }
  clarificationAnswers: Record<string, string>
  testCases: Array<{
    input: string
    expected: string
    explanation?: string
  }>
  hints: ProgressiveHint[]
}

export interface InterviewSession {
  id: string
  userId: string
  track: InterviewTrack
  difficulty: InterviewDifficulty
  persona: InterviewPersona
  question: InterviewQuestionItem
  currentStage: TurnStage
  transcript: InterviewMessage[]
  candidateCode: string
  whiteboardNotes: string
  activeLanguage: 'javascript' | 'python' | 'typescript'
  hintsRequested: number
  unlockedHints: ProgressiveHint[]
  startedAt: string
  completedAt?: string
  evaluation?: InterviewEvaluationReport
}

// Built-in Question Blueprints covering algorithms, distributed architectures, and quant logic
export const INTERVIEW_BLUEPRINTS: InterviewQuestionItem[] = [
  {
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
      javascript: `class LRUCacheWithTTL {
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
      python: `import time

class LRUCacheWithTTL:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}

    def get(self, key: str):
        # Return value if valid & update order, else -1
        return -1

    def put(self, key: str, value, ttl_ms: int):
        # Insert or update with TTL & enforce capacity
        pass`,
      typescript: `interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCacheWithTTL<T> {
  private capacity: number;
  private cache: Map<string, CacheEntry<T>> = new Map();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): T | -1 {
    return -1;
  }

  put(key: string, value: T, ttlMs?: number): void {
  }
}`,
    },
    clarificationAnswers: {
      'capacity limits': 'Capacity is fixed at initialization, e.g., 1000 items. Memory footprint is strictly bounded.',
      'duplicate keys': 'Putting an existing key updates its value, resets its TTL, and moves it to most recently used.',
      'negative ttl': 'Keys with negative or zero TTL expire immediately and should not be returned by get.',
    },
    testCases: [
      { input: 'put("a", 1, 10000); get("a")', expected: '1', explanation: 'Direct retrieval before expiry' },
      { input: 'put("a", 1); put("b", 2); put("c", 3); get("a")', expected: '-1', explanation: 'Key a evicted when capacity is 2' },
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
        text: `// V8 Map-based O(1) recency trick:
get(key) {
  if (!this.cache.has(key)) return -1;
  const entry = this.cache.get(key);
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    this.cache.delete(key);
    return -1;
  }
  this.cache.delete(key);
  this.cache.set(key, entry);
  return entry.value;
}`,
      },
    ],
  },
  {
    id: 'system-design-global-feed',
    title: 'Real-Time Global Notification & Activity Feed System',
    track: 'SYSTEM_DESIGN',
    difficulty: 'STAFF',
    targetRole: 'Staff Infrastructure & Distributed Systems Engineer',
    companyStyle: 'META',
    problemStatement: `Design a scalable real-time notification & live activity feed system capable of serving 500 Million Daily Active Users (DAU).

Key Requirements:
1. High-throughput fan-out: When a creator with 50M followers posts an update, notifications must reach subscribers within < 500ms.
2. Deduplication & grouping: Collapse multiple similar events ("Alice and 4 others liked your post") into atomic feed units.
3. Multi-region low latency: Sub-100ms feed fetch latency across APAC, EU, and US regions.
4. Edge offline sync: Support read-while-offline and incremental sync upon reconnection.`,
    starterCode: {
      javascript: `// Architectural Interface Specification
class FeedDistributionBroker {
  async publishActivity(event) {
    // 1. Fan-out on write vs fan-out on read decision
    // 2. Hybrid push/pull pipeline
  }

  async fetchUserFeed(userId, cursor, limit = 20) {
    // Return aggregated paginated feed
  }
}`,
      python: `class FeedDistributionBroker:
    async def publish_activity(self, event: dict):
        # 1. Fan-out on write vs fan-out on read decision
        # 2. Redis/Kafka streaming pipeline
        pass

    async def fetch_user_feed(self, user_id: str, cursor: str = None, limit: int = 20):
        # Return aggregated paginated feed
        return []`,
      typescript: `export interface ActivityEvent {
  id: string;
  actorId: string;
  verb: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'BROADCAST';
  targetId: string;
  timestamp: number;
}

export class FeedDistributionBroker {
  async publishActivity(event: ActivityEvent): Promise<void> {}
  async fetchUserFeed(userId: string, cursor?: string): Promise<ActivityEvent[]> { return []; }
}`,
    },
    clarificationAnswers: {
      celebrity: 'Celebrity accounts (>500k followers) must use fan-out on read (pull) to prevent write amplification. Regular accounts use fan-out on write (push).',
      consistency: 'Eventual consistency within 1 second is acceptable; feed ordering must respect Lamport logical timestamps.',
      storage: 'Hot feed (last 30 days) stored in Redis Sorted Sets; cold feed archived in ScyllaDB/Cassandra.',
    },
    testCases: [
      { input: 'publishActivity({actorId: "u1", verb: "LIKE", targetId: "post_9"})', expected: 'Delivered', explanation: 'Atomic event broadcast' },
    ],
    hints: [
      {
        level: 1,
        type: 'nudge',
        text: 'Analyze the trade-off between Fan-out-on-Write (Push) and Fan-out-on-Read (Pull). How does follower count change the write amplification equation?',
      },
      {
        level: 2,
        type: 'structural_hint',
        text: 'Propose a Hybrid Architecture: regular users push into followers Redis ZSets ($O(1)$ read), while verified/high-follower users fan out to a message queue where followers pull during feed generation and merge in memory.',
      },
      {
        level: 3,
        type: 'code_skeleton',
        text: `// High-level pipeline:
// Client -> Envoy Global API Gateway -> Feed Ingestion Worker -> Kafka Partitioned Topic -> Consumer -> Redis In-Memory Timeline (ZADD timestamp payload)`,
      },
    ],
  },
  {
    id: 'quant-execution-orderbook',
    title: 'High-Frequency Limit Order Book & Matching Engine',
    track: 'QUANT_PROBLEM_SOLVING',
    difficulty: 'SENIOR',
    targetRole: 'Quantitative Systems Engineer',
    companyStyle: 'CITADEL',
    problemStatement: `Design an ultra-low-latency in-memory Limit Order Book matching engine supporting standard order types (LIMIT_BUY, LIMIT_SELL, CANCEL).

Requirements:
1. Price-Time Priority (FIFO at the same price point).
2. Deterministic execution: Support crossing orders with partial fills.
3. Time complexity: O(1) best bid/ask lookup, O(1) order cancellation by ID, O(M) order insertion where M is distinct price levels.`,
    starterCode: {
      javascript: `class OrderBook {
  constructor(symbol) {
    this.symbol = symbol;
    this.bids = []; // Sorted descending
    this.asks = []; // Sorted ascending
    this.ordersMap = new Map();
  }

  placeOrder(order) {
    // Cross orders and match or rest on book
  }

  cancelOrder(orderId) {
    // Remove order in O(1)
  }
}`,
      python: `class OrderBook:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.bids = {}
        self.asks = {}
        self.order_map = {}

    def place_order(self, order: dict):
        pass

    def cancel_order(self, order_id: str):
        pass`,
      typescript: `export interface Order {
  id: string;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  timestamp: number;
}

export class OrderBook {
  constructor(public symbol: string) {}
  placeOrder(order: Order): { matched: number; resting: Order | null } {
    return { matched: 0, resting: null };
  }
}`,
    },
    clarificationAnswers: {
      ties: 'When prices are identical, the earliest timestamp has priority (Price-Time FIFO).',
      cancellation: 'Order cancellation by ID must unlink from doubly-linked list bucket without scanning entire book.',
    },
    testCases: [
      { input: 'placeOrder(BUY, 100, 10); placeOrder(SELL, 99, 5)', expected: 'Matched 5 at 100', explanation: 'Aggressive crossing order execution' },
    ],
    hints: [
      {
        level: 1,
        type: 'nudge',
        text: 'A combination of Red-Black Tree / B-Tree for price levels and Doubly Linked Lists at each price node achieves deterministic O(log P) insertion and O(1) match/cancel.',
      },
      {
        level: 2,
        type: 'structural_hint',
        text: 'Index orders by orderId in a hash table pointing directly to the linked list node. When cancelOrder is called, unlink the node in O(1) and decrement price level volume.',
      },
      {
        level: 3,
        type: 'code_skeleton',
        text: `// Structure:
// Map<orderId, OrderNode>
// PriceLevel: { price, totalVolume, headNode, tailNode }`,
      },
    ],
  },
]

export class InterviewSimulatorService {
  private static instance: InterviewSimulatorService
  private sessions: Map<string, InterviewSession> = new Map()

  private constructor() {
    logger.info('[InterviewSimulatorService] Initialized AI Interview Simulator Engine.')
  }

  public static getInstance(): InterviewSimulatorService {
    if (!InterviewSimulatorService.instance) {
      InterviewSimulatorService.instance = new InterviewSimulatorService()
    }
    return InterviewSimulatorService.instance
  }

  /**
   * Retrieves all available interview templates and role tracks
   */
  public getTemplates(): Array<{
    id: string
    title: string
    track: InterviewTrack
    difficulty: InterviewDifficulty
    targetRole: string
    companyStyle: string
    description: string
  }> {
    return INTERVIEW_BLUEPRINTS.map(q => ({
      id: q.id,
      title: q.title,
      track: q.track,
      difficulty: q.difficulty,
      targetRole: q.targetRole,
      companyStyle: q.companyStyle,
      description: q.problemStatement.slice(0, 180) + '...',
    }))
  }

  /**
   * Initializes a new live AI mock interview session
   */
  public startSession(params: {
    userId: string
    track: InterviewTrack
    difficulty: InterviewDifficulty
    persona?: InterviewPersona
    questionId?: string
  }): InterviewSession {
    const question =
      (params.questionId && INTERVIEW_BLUEPRINTS.find(q => q.id === params.questionId)) ||
      INTERVIEW_BLUEPRINTS.find(q => q.track === params.track) ||
      INTERVIEW_BLUEPRINTS[0]

    const persona: InterviewPersona =
      params.persona ||
      (params.track === 'SYSTEM_DESIGN' || params.track === 'BEHAVIORAL_STAR'
        ? 'ALEX_STAFF_ARCHITECT'
        : 'SOPHIA_ALGO_SPECIALIST')

    const sessionId = `mock-int-${crypto.randomBytes(6).toString('hex')}`

    const greetingText =
      persona === 'ALEX_STAFF_ARCHITECT'
        ? `Hello! I'm Alex, Senior Staff Systems Architect. Welcome to today's ${question.targetRole} mock interview. We'll be tackling "${question.title}". Before you jump straight into code, I'd like you to frame your understanding, ask any clarifying questions, and outline your high-level architectural trade-offs. Whenever you're ready, tell me how you'd like to approach this!`
        : `Hi there! I'm Sophia, Algorithm & Core Systems Specialist. Today we'll explore "${question.title}". I value clean invariants, optimal asymptotic time/space bounds, and clear communication. Take a moment to read through the requirements and ask any scoping questions before writing code!`

    const initialMessage: InterviewMessage = {
      id: `msg-${Date.now()}-0`,
      sender: 'interviewer',
      persona,
      text: greetingText,
      timestamp: new Date().toISOString(),
      suggestedAction: 'ask_clarification',
    }

    const session: InterviewSession = {
      id: sessionId,
      userId: params.userId,
      track: params.track,
      difficulty: params.difficulty,
      persona,
      question,
      currentStage: 'CLARIFICATION',
      transcript: [initialMessage],
      candidateCode: question.starterCode.javascript,
      whiteboardNotes: `# Whiteboard Notes\n- Problem: ${question.title}\n- Target bounds: O(1) lookup\n- Clarifications:`,
      activeLanguage: 'javascript',
      hintsRequested: 0,
      unlockedHints: [],
      startedAt: new Date().toISOString(),
    }

    this.sessions.set(sessionId, session)
    logger.info(`[InterviewSimulatorService] Session ${sessionId} started for user ${params.userId}.`)
    return session
  }

  /**
   * Fetches an existing interview session
   */
  public getSession(sessionId: string): InterviewSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Processes candidate input (voice transcript or text message + current code state)
   * and synthesizes the interviewer's conversational response.
   */
  public interact(params: {
    sessionId: string
    candidateText: string
    candidateCode?: string
    whiteboardNotes?: string
  }): {
    session: InterviewSession
    interviewerResponse: InterviewMessage
    stageTransitioned: boolean
  } {
    const session = this.sessions.get(params.sessionId)
    if (!session) {
      throw new Error(`Interview session ${params.sessionId} not found.`)
    }

    if (params.candidateCode !== undefined) {
      session.candidateCode = params.candidateCode
    }
    if (params.whiteboardNotes !== undefined) {
      session.whiteboardNotes = params.whiteboardNotes
    }

    // 1. Record candidate message
    const candidateMsg: InterviewMessage = {
      id: `msg-${Date.now()}-c`,
      sender: 'candidate',
      text: params.candidateText.trim(),
      timestamp: new Date().toISOString(),
      codeSnippet: params.candidateCode,
    }
    session.transcript.push(candidateMsg)

    // 2. Synthesize AI response based on persona and conversation heuristics
    const { responseText, nextStage, suggestedAction } = this.synthesizePersonaResponse({
      session,
      candidateText: params.candidateText,
      code: session.candidateCode,
    })

    const stageTransitioned = session.currentStage !== nextStage
    session.currentStage = nextStage

    const interviewerMsg: InterviewMessage = {
      id: `msg-${Date.now()}-i`,
      sender: 'interviewer',
      persona: session.persona,
      text: responseText,
      timestamp: new Date().toISOString(),
      suggestedAction,
    }
    session.transcript.push(interviewerMsg)

    return {
      session,
      interviewerResponse: interviewerMsg,
      stageTransitioned,
    }
  }

  /**
   * Requests progressive scaffolding hint (1: Nudge, 2: Structural, 3: Skeleton)
   */
  public requestHint(sessionId: string): {
    hint: ProgressiveHint
    totalHintsUnlocked: number
  } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Interview session ${sessionId} not found.`)
    }

    const nextLevel = (session.hintsRequested + 1) as 1 | 2 | 3
    const availableHint = session.question.hints.find(h => h.level === nextLevel)

    if (!availableHint) {
      const fallbackHint: ProgressiveHint = {
        level: 3,
        type: 'structural_hint',
        text: 'All formal hints have been unlocked. Focus on writing clean test cases and walking through sample inputs with a debugger tracing variable states.',
        unlockedAt: new Date().toISOString(),
      }
      return { hint: fallbackHint, totalHintsUnlocked: session.unlockedHints.length }
    }

    const unlocked: ProgressiveHint = {
      ...availableHint,
      unlockedAt: new Date().toISOString(),
    }

    session.hintsRequested += 1
    session.unlockedHints.push(unlocked)

    // Add hint notification to transcript
    session.transcript.push({
      id: `msg-${Date.now()}-sys`,
      sender: 'system',
      text: `[HINT LEVEL ${unlocked.level} UNLOCKED]: ${unlocked.text}`,
      timestamp: new Date().toISOString(),
    })

    return {
      hint: unlocked,
      totalHintsUnlocked: session.unlockedHints.length,
    }
  }

  /**
   * Evaluates the candidate's full interview performance across the 5-factor rubric
   */
  public evaluateSession(sessionId: string): InterviewEvaluationReport {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Interview session ${sessionId} not found.`)
    }

    session.completedAt = new Date().toISOString()
    session.currentStage = 'COMPLETED'

    const codeLen = session.candidateCode.length
    const starterLen = session.question.starterCode.javascript.length
    const codeModified = Math.abs(codeLen - starterLen) > 30
    const turnsCount = session.transcript.filter(m => m.sender === 'candidate').length
    const hintsPenalty = session.hintsRequested * 7

    // 1. Problem Solving (0-100)
    const problemSolvingScore = Math.max(
      45,
      Math.min(96, (codeModified ? 82 : 55) + Math.min(15, turnsCount * 3) - hintsPenalty)
    )

    // 2. Algorithmic Efficiency (0-100)
    const hasHashOrMap = /Map|hash|dict|\{\}/i.test(session.candidateCode)
    const hasLinkedOrRecency = /next|prev|delete|expiresAt|order/i.test(session.candidateCode)
    const algoScore = Math.max(
      40,
      Math.min(98, 70 + (hasHashOrMap ? 15 : 0) + (hasLinkedOrRecency ? 12 : 0) - hintsPenalty * 0.5)
    )

    // 3. Technical Communication (0-100)
    const totalCandidateWords = session.transcript
      .filter(m => m.sender === 'candidate')
      .reduce((acc, m) => acc + m.text.split(/\s+/).length, 0)
    const commScore = Math.max(50, Math.min(95, 60 + Math.min(35, totalCandidateWords / 8)))

    // 4. Code Quality & Modularity (0-100)
    const hasComments = /\/\/|\/\*|#/i.test(session.candidateCode)
    const hasFunctions = /function|def|class|return/i.test(session.candidateCode)
    const codeScore = Math.max(
      45,
      Math.min(94, 65 + (hasFunctions ? 15 : 0) + (hasComments ? 10 : 0) + (codeModified ? 10 : 0))
    )

    // 5. System Scalability & Edge Handling (0-100)
    const mentionsEdgeCases = /capacity|null|undefined|expire|-1|bound|error|limit/i.test(session.candidateCode)
    const scaleScore = Math.max(
      40,
      Math.min(92, 60 + (mentionsEdgeCases ? 22 : 5) - (session.hintsRequested > 2 ? 10 : 0))
    )

    const factorScores: RubricFactorScore[] = [
      {
        name: 'Problem Solving & Scaffolding',
        factor: 'PROBLEM_SOLVING',
        score: Math.round(problemSolvingScore),
        weight: 0.25,
        feedback:
          problemSolvingScore >= 80
            ? 'Strong structured breakdown from conceptual requirements down to concrete data structures.'
            : 'Good initial understanding; would benefit from validating edge case boundaries before implementing core loops.',
        positiveSignals: ['Asked clarifying scope questions', 'Identified primary trade-offs early'],
        growthAreas: ['Proactively verify input constraints with sample dry-runs'],
      },
      {
        name: 'Algorithmic Efficiency & Invariants',
        factor: 'ALGORITHMIC_EFFICIENCY',
        score: Math.round(algoScore),
        weight: 0.25,
        feedback:
          algoScore >= 80
            ? 'Demonstrated strong asymptotic discipline, achieving optimal time bounds without extraneous allocations.'
            : 'Asymptotics are viable, but intermediate collections could be streamlined to preserve O(1) amortized bounds.',
        positiveSignals: ['Leveraged appropriate indexing structure', 'Avoided O(N) linear scans on hot paths'],
        growthAreas: ['Formalize mathematical invariants before committing to state mutations'],
      },
      {
        name: 'Technical Communication & Articulation',
        factor: 'TECHNICAL_COMMUNICATION',
        score: Math.round(commScore),
        weight: 0.2,
        feedback:
          commScore >= 80
            ? 'Articulate reasoning. Kept the interviewer actively engaged throughout the thought process.'
            : 'Communicated key insights, but speaking out loud while writing loops will elevate collaborative signaling.',
        positiveSignals: ['Maintained active conversational dialogue', 'Clearly explained rationale for data structures'],
        growthAreas: ['Summarize architectural decisions before writing large blocks of syntax'],
      },
      {
        name: 'Code Quality & Production Standards',
        factor: 'CODE_QUALITY',
        score: Math.round(codeScore),
        weight: 0.15,
        feedback:
          codeScore >= 80
            ? 'Clean, idiomatic structure with meaningful naming and modular decomposition.'
            : 'Readable implementation. Adding explicit error bounds and helper extractions will improve modularity.',
        positiveSignals: ['Idiomatic language conventions used', 'Self-documenting method signatures'],
        growthAreas: ['Extract complex conditionals into semantic helper predicates'],
      },
      {
        name: 'System Scalability & Edge Cases',
        factor: 'SYSTEM_SCALABILITY',
        score: Math.round(scaleScore),
        weight: 0.15,
        feedback:
          scaleScore >= 80
            ? 'Addressed concurrency, capacity overflow, and expiration boundaries thoroughly.'
            : 'Handled fundamental paths; ensure boundary checks (e.g. capacity = 0, TTL expiration races) are prioritized.',
        positiveSignals: ['Accounted for memory bounding and eviction triggers'],
        growthAreas: ['Consider thread-safe locking granularity or read-write locks for high concurrency'],
      },
    ]

    const overallScore = Math.round(
      factorScores.reduce((acc, f) => acc + f.score * f.weight, 0)
    )

    let hiringRecommendation: InterviewEvaluationReport['hiringRecommendation'] = 'LEANING_HIRE'
    if (overallScore >= 88) hiringRecommendation = 'STRONG_HIRE'
    else if (overallScore >= 78) hiringRecommendation = 'HIRE'
    else if (overallScore >= 65) hiringRecommendation = 'LEANING_HIRE'
    else if (overallScore >= 52) hiringRecommendation = 'LEANING_NO_HIRE'
    else hiringRecommendation = 'NO_HIRE'

    const percentileRanking = Math.min(99, Math.max(12, Math.round(overallScore * 1.08)))

    const report: InterviewEvaluationReport = {
      sessionId,
      overallScore,
      percentileRanking,
      hiringRecommendation,
      executiveSummary: `Candidate achieved an overall score of ${overallScore}/100 (${hiringRecommendation.replace(/_/g, ' ')}), performing in the top ${100 - percentileRanking}% of peer benchmarks. Displayed strong competence in ${session.question.track.toLowerCase().replace(/_/g, ' ')} with effective ${session.persona === 'ALEX_STAFF_ARCHITECT' ? 'architectural trade-off assessment' : 'algorithmic precision'}.`,
      factorScores,
      starAnalysis: {
        situation: `Challenged to design and implement ${session.question.title} under realistic interview time constraints.`,
        task: 'Formulate an optimal solution balancing O(1) time bounds with reliable edge case handling.',
        action: `Engaged in ${turnsCount} collaborative turns with ${session.persona === 'ALEX_STAFF_ARCHITECT' ? 'Interviewer Alex' : 'Interviewer Sophia'}, writing code and reasoning through invariants.`,
        result: `Delivered working solution with score of ${overallScore}/100 and clear recommendations for revision.`,
      },
      strengths: [
        'Proactive engagement with prompt specifications',
        'Effective use of modern data structures to minimize asymptotic complexity',
        'Receptive to interviewer feedback during collaborative turns',
      ],
      weaknesses: [
        session.hintsRequested > 1 ? `Relied on ${session.hintsRequested} hints during implementation phase` : 'Could verify boundary test cases with formal assertions earlier',
        'Consider elaborating on distributed failover scenarios in production',
      ],
      recommendedRevisionTopics: [
        'LRU & Cache Eviction Strategies',
        'Asymptotic Space-Time Invariants',
        'Distributed Key Sharding & Consistent Hashing',
      ],
      curriculumModuleIds: ['mod-algo-caching-1', 'mod-sys-distributed-2'],
      generatedAt: new Date().toISOString(),
    }

    session.evaluation = report
    logger.info(`[InterviewSimulatorService] Session ${sessionId} evaluated. Overall score: ${overallScore}. Recommendation: ${hiringRecommendation}`)
    return report
  }

  /**
   * Retrieves past interview history for a user
   */
  public getUserHistory(userId: string): Array<{
    sessionId: string
    track: InterviewTrack
    title: string
    overallScore?: number
    hiringRecommendation?: string
    completedAt?: string
    startedAt: string
  }> {
    const list: Array<{
      sessionId: string
      track: InterviewTrack
      title: string
      overallScore?: number
      hiringRecommendation?: string
      completedAt?: string
      startedAt: string
    }> = []

    for (const s of this.sessions.values()) {
      if (s.userId === userId) {
        list.push({
          sessionId: s.id,
          track: s.track,
          title: s.question.title,
          overallScore: s.evaluation?.overallScore,
          hiringRecommendation: s.evaluation?.hiringRecommendation,
          completedAt: s.completedAt,
          startedAt: s.startedAt,
        })
      }
    }

    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }

  // --- Internal Conversational Synthesizer ---
  private synthesizePersonaResponse(params: {
    session: InterviewSession
    candidateText: string
    code: string
  }): {
    responseText: string
    nextStage: TurnStage
    suggestedAction: InterviewMessage['suggestedAction']
  } {
    const { session, candidateText, code } = params
    const textLower = candidateText.toLowerCase()
    const stage = session.currentStage
    const persona = session.persona

    // Check for explicit clarification questions
    for (const [key, answer] of Object.entries(session.question.clarificationAnswers)) {
      if (textLower.includes(key.toLowerCase()) || textLower.includes('how many') || textLower.includes('capacity') || textLower.includes('bound')) {
        return {
          responseText: `Great question regarding ${key}. ${answer}. How does that constraint influence your choice of data structure?`,
          nextStage: 'HIGH_LEVEL_DESIGN',
          suggestedAction: 'sketch_approach',
        }
      }
    }

    // Stage progression logic
    if (stage === 'CLARIFICATION' || stage === 'GREETING') {
      if (textLower.includes('approach') || textLower.includes('map') || textLower.includes('hash') || textLower.includes('tree') || textLower.includes('list')) {
        return {
          responseText:
            persona === 'ALEX_STAFF_ARCHITECT'
              ? `That's a sound architectural direction. A Hash Map combined with sequential pointers is classic for O(1) eviction. Walk me through the write path: what happens when the cache reaches capacity and a new item arrives?`
              : `I like that approach. Using a Map gives O(1) lookups. What is your plan for keeping the eviction order in O(1) time without scanning? Let's start sketching that out in the editor!`,
          nextStage: 'IMPLEMENTATION',
          suggestedAction: 'write_code',
        }
      }

      return {
        responseText: `Understood. Make sure to consider the constraints on capacity and concurrency. When you're ready, describe the high-level algorithm or start writing the core methods in the code editor!`,
        nextStage: 'HIGH_LEVEL_DESIGN',
        suggestedAction: 'sketch_approach',
      }
    }

    if (stage === 'HIGH_LEVEL_DESIGN' || stage === 'IMPLEMENTATION') {
      if (code.includes('class') || code.includes('def') || code.includes('function') || code.length > 120) {
        return {
          responseText:
            persona === 'ALEX_STAFF_ARCHITECT'
              ? `Your implementation is taking shape nicely. Looking closely at your eviction logic: what edge cases might occur if two threads access the same expired key simultaneously? Let's add test assertions for that.`
              : `Good progress on the code. Let's trace through a case where capacity is 2 and we insert three items. Does your eviction correctly remove the oldest unexpired key? Test your logic!`,
          nextStage: 'OPTIMIZATION_EDGE_CASES',
          suggestedAction: 'test_edge_cases',
        }
      }

      return {
        responseText: `I see your thoughts. Go ahead and implement the methods in the editor on your right. Remember to keep operations within O(1) time complexity!`,
        nextStage: 'IMPLEMENTATION',
        suggestedAction: 'write_code',
      }
    }

    // Optimization & edge cases
    if (stage === 'OPTIMIZATION_EDGE_CASES') {
      return {
        responseText:
          persona === 'ALEX_STAFF_ARCHITECT'
            ? `Excellent consideration of boundary conditions. You've demonstrated solid systems intuition here. If you are satisfied with this code, go ahead and click "Submit & Evaluate" to view your full 5-factor rubric scorecard!`
            : `Cleanly handled. Your edge case verification looks solid. When you're ready, hit "Submit & Evaluate" so we can review your performance scorecard and personalized study recommendations!`,
        nextStage: 'WRAPUP',
        suggestedAction: 'submit_solution',
      }
    }

    return {
      responseText: `Great session! Feel free to ask any final questions or submit your code for immediate feedback.`,
      nextStage: 'WRAPUP',
      suggestedAction: 'submit_solution',
    }
  }
}

export const interviewSimulatorService = InterviewSimulatorService.getInstance()
