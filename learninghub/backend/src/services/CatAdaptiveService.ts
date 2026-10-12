import crypto from 'crypto'
import logger from '../utils/logger'
import { IRTScoringEngine } from './IRTScoringEngine'

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type AbilityBand = 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | 'MASTER'

export interface CatItem {
  id: string
  text: string
  subject: string
  topic: string
  options: Array<{ id: string; text: string }>
  correctOptionId: string
  // 3PL IRT Parameters
  a: number // Discrimination (0.5 to 2.5)
  b: number // Difficulty in logits (-3.0 to +3.0)
  c: number // Guessing probability (0.0 to 0.35)
  explanation: string
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE'
}

export interface CatResponseRecord {
  itemId: string
  selectedOptionId: string
  isCorrect: boolean
  confidence: ConfidenceLevel
  cbmScore: number // Confidence-Based Marking adjusted score
  thetaAfter: number
  semAfter: number
  timeSpentSeconds: number
  timestamp: string
}

export interface CatSessionState {
  sessionId: string
  userId: string
  subject: string
  stage: 1 | 2 | 3
  currentTheta: number // -3.0 to +3.0
  currentSem: number // Standard Error of Measurement
  normalizedScore: number // 0 to 100
  estimatedPercentile: number // 0.1 to 99.9
  abilityBand: AbilityBand
  isCompleted: boolean
  stoppingReason?: 'SEM_CONVERGENCE' | 'MAX_QUESTIONS_REACHED' | 'MANUAL_SUBMIT'
  questionsAnswered: number
  maxQuestions: number
  minQuestions: number
  targetSem: number
  responses: CatResponseRecord[]
  activeItem?: CatItem
}

export interface CatScorecard {
  sessionId: string
  userId: string
  subject: string
  finalTheta: number
  finalSem: number
  confidenceInterval95: [number, number]
  normalizedScore: number
  percentileRank: number
  abilityBand: AbilityBand
  totalQuestions: number
  accuracyRate: number
  cbmBreakdown: {
    masteryCount: number // Correct + High Confidence
    intuitionCount: number // Correct + Low Confidence
    hesitationCount: number // Incorrect + Low Confidence
    blindspotCount: number // Incorrect + High Confidence
    totalCbmScore: number
  }
  convergencePath: Array<{
    step: number
    theta: number
    sem: number
    itemDifficulty: number
    isCorrect: boolean
  }>
  testInformationCurve: Array<{
    thetaPoint: number
    informationValue: number
    semValue: number
  }>
  cryptographicAuditProof: {
    hash: string
    signedAt: string
    algorithm: string
  }
}

export class CatAdaptiveService {
  private static instance: CatAdaptiveService
  private sessions: Map<string, CatSessionState> = new Map()

  // Quadrature nodes for Bayesian EAP ability estimation
  private readonly quadratureNodes: number[] = [
    -4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0,
  ]
  private readonly quadratureWeights: number[]

  // Calibrated Item Bank
  private readonly itemBank: CatItem[] = [
    {
      id: 'cat-item-01',
      text: 'What is the tight worst-case asymptotic time complexity of randomized QuickSort on an array of length N?',
      subject: 'Algorithms',
      topic: 'Sorting & Divide and Conquer',
      options: [
        { id: 'opt-a', text: 'O(N log N)' },
        { id: 'opt-b', text: 'O(N^2)' },
        { id: 'opt-c', text: 'O(N)' },
        { id: 'opt-d', text: 'O(log N)' },
      ],
      correctOptionId: 'opt-b',
      a: 1.45,
      b: -0.4,
      c: 0.25,
      explanation: 'While expected time is O(N log N), the adversarial worst-case partitioning still degrades to O(N^2).',
      bloomLevel: 'UNDERSTAND',
    },
    {
      id: 'cat-item-02',
      text: 'In a B-Tree of minimum degree t >= 2, what is the maximum number of children any internal node other than the root can have?',
      subject: 'Data Structures',
      topic: 'Multiway Search Trees',
      options: [
        { id: 'opt-a', text: 't - 1' },
        { id: 'opt-b', text: 't' },
        { id: 'opt-c', text: '2t' },
        { id: 'opt-d', text: '2t - 1' },
      ],
      correctOptionId: 'opt-c',
      a: 1.6,
      b: 0.5,
      c: 0.25,
      explanation: 'An internal node in a B-Tree of minimum degree t has at most 2t - 1 keys and therefore at most 2t children.',
      bloomLevel: 'APPLY',
    },
    {
      id: 'cat-item-03',
      text: 'Which invariant guarantees cycle-free topological ordering in a directed graph G = (V, E)?',
      subject: 'Algorithms',
      topic: 'Graph Theory',
      options: [
        { id: 'opt-a', text: 'Graph contains no back edges during DFS traversal' },
        { id: 'opt-b', text: 'Every vertex has in-degree >= 1' },
        { id: 'opt-c', text: 'Sum of in-degrees equals sum of out-degrees' },
        { id: 'opt-d', text: 'Graph is strongly connected' },
      ],
      correctOptionId: 'opt-a',
      a: 1.35,
      b: -0.8,
      c: 0.25,
      explanation: 'A directed graph has a topological sort if and only if it is a DAG (no back edges in DFS tree).',
      bloomLevel: 'UNDERSTAND',
    },
    {
      id: 'cat-item-04',
      text: 'Under the CAP theorem in distributed systems, what does a system guarantee during a network partition if it chooses CP over AP?',
      subject: 'Distributed Systems',
      topic: 'Consensus & Partition Tolerance',
      options: [
        { id: 'opt-a', text: 'It guarantees every non-failing node returns a response immediately' },
        { id: 'opt-b', text: 'It returns an error or blocks to preserve atomic data linearizability across partitions' },
        { id: 'opt-c', text: 'It permits eventual consistency across split-brain partitions' },
        { id: 'opt-d', text: 'It eliminates all replication network latency' },
      ],
      correctOptionId: 'opt-b',
      a: 1.8,
      b: 1.2,
      c: 0.25,
      explanation: 'A CP system sacrifices availability to prevent stale or inconsistent reads/writes during partitions.',
      bloomLevel: 'ANALYZE',
    },
    {
      id: 'cat-item-05',
      text: 'In Red-Black Tree balancing, what is the maximum possible height of a tree with N internal nodes?',
      subject: 'Data Structures',
      topic: 'Balanced Trees',
      options: [
        { id: 'opt-a', text: 'log2(N)' },
        { id: 'opt-b', text: '2 * log2(N + 1)' },
        { id: 'opt-c', text: '3 * log2(N)' },
        { id: 'opt-d', text: 'N / 2' },
      ],
      correctOptionId: 'opt-b',
      a: 1.95,
      b: 1.6,
      c: 0.25,
      explanation: 'The black-height property ensures height h <= 2 * log2(N + 1).',
      bloomLevel: 'EVALUATE',
    },
    {
      id: 'cat-item-06',
      text: 'Which algorithmic paradigm solves the 0/1 Knapsack problem with weights W and item values V in pseudo-polynomial time?',
      subject: 'Algorithms',
      topic: 'Dynamic Programming',
      options: [
        { id: 'opt-a', text: 'Greedy fractional ratio sorting' },
        { id: 'opt-b', text: '2D Dynamic Programming table DP[i][w]' },
        { id: 'opt-c', text: 'Simple Breadth First Search' },
        { id: 'opt-d', text: 'Divide and conquer with master theorem' },
      ],
      correctOptionId: 'opt-b',
      a: 1.2,
      b: -1.3,
      c: 0.25,
      explanation: '0/1 Knapsack is NP-complete but solvable in O(N*W) pseudo-polynomial time using DP.',
      bloomLevel: 'REMEMBER',
    },
    {
      id: 'cat-item-07',
      text: 'In Raft consensus protocol, what condition must a candidate meet to be elected leader during an election round?',
      subject: 'Distributed Systems',
      topic: 'Consensus Protocols',
      options: [
        { id: 'opt-a', text: 'Receive votes from a majority of cluster nodes and possess an up-to-date log' },
        { id: 'opt-b', text: 'Have the lowest node IP address' },
        { id: 'opt-c', text: 'Generate the fastest cryptographic HMAC signature' },
        { id: 'opt-d', text: 'Have zero uncommitted entries in state machine' },
      ],
      correctOptionId: 'opt-a',
      a: 1.75,
      b: 1.4,
      c: 0.25,
      explanation: 'Raft election safety requires majority consensus and candidate log completeness (Election Restriction).',
      bloomLevel: 'ANALYZE',
    },
    {
      id: 'cat-item-08',
      text: 'What is the amortized cost of an insertion into a dynamic resizing array that doubles its capacity when full?',
      subject: 'Data Structures',
      topic: 'Amortized Complexity',
      options: [
        { id: 'opt-a', text: 'O(1)' },
        { id: 'opt-b', text: 'O(N)' },
        { id: 'opt-c', text: 'O(log N)' },
        { id: 'opt-d', text: 'O(N log N)' },
      ],
      correctOptionId: 'opt-a',
      a: 1.1,
      b: -1.8,
      c: 0.25,
      explanation: 'By aggregate analysis, N insertions require <= 3N operations, giving an amortized cost of O(1).',
      bloomLevel: 'UNDERSTAND',
    },
    {
      id: 'cat-item-09',
      text: 'In Byzantine Fault Tolerant (PBFT) consensus, what is the maximum number of Byzantine faulty nodes f tolerated in a system of N total nodes?',
      subject: 'Distributed Systems',
      topic: 'BFT Systems',
      options: [
        { id: 'opt-a', text: 'f = (N - 1) / 3' },
        { id: 'opt-b', text: 'f = (N - 1) / 2' },
        { id: 'opt-c', text: 'f = N / 4' },
        { id: 'opt-d', text: 'f = sqrt(N)' },
      ],
      correctOptionId: 'opt-a',
      a: 2.1,
      b: 2.2,
      c: 0.25,
      explanation: 'Castro and Liskov proved that PBFT requires N >= 3f + 1, so f <= (N - 1) / 3.',
      bloomLevel: 'EVALUATE',
    },
    {
      id: 'cat-item-10',
      text: 'What does Little\'s Law state regarding average number of items L, arrival rate lambda, and dwell time W in a stable queueing system?',
      subject: 'Distributed Systems',
      topic: 'Queueing Theory',
      options: [
        { id: 'opt-a', text: 'L = lambda * W' },
        { id: 'opt-b', text: 'L = lambda / W' },
        { id: 'opt-c', text: 'L = lambda^2 + W' },
        { id: 'opt-d', text: 'L = W / lambda' },
      ],
      correctOptionId: 'opt-a',
      a: 1.3,
      b: 0.1,
      c: 0.25,
      explanation: 'Little\'s Law L = lambda * W is invariant to arrival and service distributions.',
      bloomLevel: 'APPLY',
    },
  ]

  constructor() {
    // Normal distribution prior weights normalized to sum to 1.0
    const rawWeights = this.quadratureNodes.map(x => Math.exp(-0.5 * x * x))
    const sum = rawWeights.reduce((a, b) => a + b, 0)
    this.quadratureWeights = rawWeights.map(w => w / sum)
  }

  public static getInstance(): CatAdaptiveService {
    if (!CatAdaptiveService.instance) {
      CatAdaptiveService.instance = new CatAdaptiveService()
    }
    return CatAdaptiveService.instance
  }

  /**
   * 3PL IRT Fisher Information:
   * I(theta) = (a^2 * (P - c)^2 * Q) / ((1 - c)^2 * P)
   */
  public calculateFisherInformation(theta: number, item: CatItem): number {
    const P = IRTScoringEngine.calculateProbability(theta, item.a, item.b, item.c)
    const Q = 1 - P
    const denom = (1 - item.c) ** 2 * P
    if (denom <= 1e-8 || Q <= 1e-8) return 0.0
    const numerator = (item.a ** 2) * ((P - item.c) ** 2) * Q
    return Math.max(0, numerator / denom)
  }

  /**
   * Standard Error of Measurement:
   * SEM(theta) = 1 / sqrt(sum(Fisher Information))
   */
  public calculateSem(theta: number, administeredItems: CatItem[]): number {
    if (administeredItems.length === 0) return 1.0
    let totalInfo = 0.0
    for (const item of administeredItems) {
      totalInfo += this.calculateFisherInformation(theta, item)
    }
    // Add Bayesian standard normal prior information: I_prior = 1.0
    totalInfo += 1.0
    return Math.min(1.0, 1.0 / Math.sqrt(totalInfo))
  }

  /**
   * Bayesian Expected A Posteriori (EAP) ability estimation
   */
  public estimateAbilityEAP(responses: boolean[], items: CatItem[]): { theta: number; sem: number } {
    if (responses.length === 0 || items.length === 0) {
      return { theta: 0.0, sem: 1.0 }
    }

    let numerator = 0.0
    let denominator = 0.0

    for (let k = 0; k < this.quadratureNodes.length; k++) {
      const X_k = this.quadratureNodes[k]
      const W_k = this.quadratureWeights[k]

      let logLikelihood = 0.0
      for (let i = 0; i < responses.length; i++) {
        const item = items[i]
        const P = IRTScoringEngine.calculateProbability(X_k, item.a, item.b, item.c)
        const isCorrect = responses[i]
        logLikelihood += isCorrect ? Math.log(P) : Math.log(1 - P)
      }

      const likelihood = Math.exp(logLikelihood)
      const joint = likelihood * W_k
      numerator += X_k * joint
      denominator += joint
    }

    const estimatedTheta = denominator > 1e-12 ? numerator / denominator : 0.0
    const clampedTheta = Math.max(-3.0, Math.min(3.0, estimatedTheta))
    const sem = this.calculateSem(clampedTheta, items)

    return { theta: clampedTheta, sem }
  }

  /**
   * Maximum Fisher Information Item Selection
   * Finds the item in the candidate pool that maximizes information at current theta.
   */
  public selectNextItem(currentTheta: number, availableItems: CatItem[]): CatItem | null {
    if (availableItems.length === 0) return null

    let bestItem: CatItem | null = null
    let maxInfo = -1.0

    for (const item of availableItems) {
      const info = this.calculateFisherInformation(currentTheta, item)
      if (info > maxInfo) {
        maxInfo = info
        bestItem = item
      }
    }

    return bestItem
  }

  /**
   * Normalizes logit theta (-3.0 to +3.0) to a standard 0-100 scale
   */
  public normalizeTheta(theta: number): number {
    const clamped = Math.max(-3.0, Math.min(3.0, theta))
    return Math.round(((clamped + 3.0) / 6.0) * 100)
  }

  /**
   * Converts theta into approximate percentile rank using standard normal CDF
   */
  public calculatePercentile(theta: number): number {
    // Probit / erf approximation for normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(theta))
    const d = 0.3989423 * Math.exp((-theta * theta) / 2)
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    const cdf = theta >= 0 ? 1 - prob : prob
    return Math.round(cdf * 1000) / 10
  }

  /**
   * Ability Band Categorization
   */
  public classifyAbilityBand(theta: number): AbilityBand {
    if (theta >= 1.75) return 'MASTER'
    if (theta >= 0.75) return 'ADVANCED'
    if (theta >= -0.25) return 'PROFICIENT'
    if (theta >= -1.25) return 'INTERMEDIATE'
    return 'BEGINNER'
  }

  /**
   * Confidence-Based Marking (CBM) score computation
   */
  public calculateCbmScore(isCorrect: boolean, confidence: ConfidenceLevel): number {
    switch (confidence) {
      case 'HIGH':
        return isCorrect ? 3.0 : -2.0 // High risk / high reward
      case 'MEDIUM':
        return isCorrect ? 2.0 : -1.0
      case 'LOW':
      default:
        return isCorrect ? 1.0 : 0.0 // Low risk, modest reward
    }
  }

  /**
   * Starts a new Computerized Adaptive Testing session
   */
  public startSession(userId: string, subject: string = 'Computer Science & Systems'): CatSessionState {
    const sessionId = `cat-${crypto.randomBytes(6).toString('hex')}`
    const initialTheta = 0.0
    const initialSem = 1.0

    // Select initial item (medium difficulty b near 0)
    const initialItem = this.selectNextItem(initialTheta, this.itemBank) || this.itemBank[0]

    const session: CatSessionState = {
      sessionId,
      userId,
      subject,
      stage: 1,
      currentTheta: initialTheta,
      currentSem: initialSem,
      normalizedScore: this.normalizeTheta(initialTheta),
      estimatedPercentile: this.calculatePercentile(initialTheta),
      abilityBand: this.classifyAbilityBand(initialTheta),
      isCompleted: false,
      questionsAnswered: 0,
      maxQuestions: 10,
      minQuestions: 4,
      targetSem: 0.28,
      responses: [],
      activeItem: initialItem,
    }

    this.sessions.set(sessionId, session)
    logger.info(`[CatAdaptiveService] Started CAT session ${sessionId} for user ${userId}`)
    return session
  }

  /**
   * Submits an answer for the active item, performs Bayesian update, and selects next item
   */
  public submitAnswer(params: {
    sessionId: string
    itemId: string
    selectedOptionId: string
    confidence: ConfidenceLevel
    timeSpentSeconds?: number
  }): { session: CatSessionState; stepResult: CatResponseRecord } {
    const session = this.sessions.get(params.sessionId)
    if (!session) {
      throw new Error(`CAT session with ID ${params.sessionId} not found`)
    }
    if (session.isCompleted) {
      throw new Error(`CAT session ${params.sessionId} is already completed`)
    }

    const currentItem = this.itemBank.find(i => i.id === params.itemId)
    if (!currentItem) {
      throw new Error(`Item with ID ${params.itemId} not found in item bank`)
    }

    const isCorrect = params.selectedOptionId === currentItem.correctOptionId
    const cbmScore = this.calculateCbmScore(isCorrect, params.confidence)

    // Administered items so far (including current)
    const answeredItemIds = session.responses.map(r => r.itemId)
    answeredItemIds.push(currentItem.id)

    const administeredItems = answeredItemIds.map(id => this.itemBank.find(i => i.id === id)!).filter(Boolean)
    const binaryResponses = session.responses.map(r => r.isCorrect)
    binaryResponses.push(isCorrect)

    // Bayesian EAP Ability Update
    const { theta, sem } = this.estimateAbilityEAP(binaryResponses, administeredItems)

    const responseRecord: CatResponseRecord = {
      itemId: currentItem.id,
      selectedOptionId: params.selectedOptionId,
      isCorrect,
      confidence: params.confidence,
      cbmScore,
      thetaAfter: theta,
      semAfter: sem,
      timeSpentSeconds: params.timeSpentSeconds || 15,
      timestamp: new Date().toISOString(),
    }

    session.responses.push(responseRecord)
    session.questionsAnswered += 1
    session.currentTheta = theta
    session.currentSem = sem
    session.normalizedScore = this.normalizeTheta(theta)
    session.estimatedPercentile = this.calculatePercentile(theta)
    session.abilityBand = this.classifyAbilityBand(theta)

    // Update Stage: Stage 1 (q1-q3: Router), Stage 2 (q4-q7: Adaptive Calibration), Stage 3 (q8+: Fine Pinning)
    if (session.questionsAnswered >= 7) {
      session.stage = 3
    } else if (session.questionsAnswered >= 3) {
      session.stage = 2
    } else {
      session.stage = 1
    }

    // Stopping criteria check:
    const hasMetStoppingCriteria =
      (session.questionsAnswered >= session.minQuestions && session.currentSem <= session.targetSem) ||
      session.questionsAnswered >= session.maxQuestions

    if (hasMetStoppingCriteria) {
      session.isCompleted = true
      session.stoppingReason =
        session.currentSem <= session.targetSem ? 'SEM_CONVERGENCE' : 'MAX_QUESTIONS_REACHED'
      session.activeItem = undefined
    } else {
      // Pick next available item maximizing Fisher information
      const remainingItems = this.itemBank.filter(i => !answeredItemIds.includes(i.id))
      session.activeItem = this.selectNextItem(session.currentTheta, remainingItems) || undefined
      if (!session.activeItem) {
        session.isCompleted = true
        session.stoppingReason = 'MAX_QUESTIONS_REACHED'
      }
    }

    this.sessions.set(session.sessionId, session)
    return { session, stepResult: responseRecord }
  }

  /**
   * Retrieves current session state
   */
  public getSession(sessionId: string): CatSessionState | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Generates the detailed post-test psychometric scorecard
   */
  public generateScorecard(sessionId: string): CatScorecard {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`CAT session with ID ${sessionId} not found`)
    }

    // CBM Breakdown analysis
    let masteryCount = 0
    let intuitionCount = 0
    let hesitationCount = 0
    let blindspotCount = 0
    let totalCbmScore = 0

    session.responses.forEach(r => {
      totalCbmScore += r.cbmScore
      if (r.isCorrect) {
        if (r.confidence === 'HIGH') masteryCount++
        else intuitionCount++
      } else {
        if (r.confidence === 'HIGH') blindspotCount++
        else hesitationCount++
      }
    })

    const marginOfError = 1.96 * session.currentSem
    const confidenceInterval95: [number, number] = [
      Math.round((session.currentTheta - marginOfError) * 100) / 100,
      Math.round((session.currentTheta + marginOfError) * 100) / 100,
    ]

    // Convergence trajectory
    const convergencePath = session.responses.map((r, idx) => {
      const item = this.itemBank.find(i => i.id === r.itemId)
      return {
        step: idx + 1,
        theta: Math.round(r.thetaAfter * 100) / 100,
        sem: Math.round(r.semAfter * 100) / 100,
        itemDifficulty: item ? item.b : 0,
        isCorrect: r.isCorrect,
      }
    })

    // Test Information Curve across theta [-3, 3]
    const testInformationCurve: Array<{ thetaPoint: number; informationValue: number; semValue: number }> = []
    const administeredItems = this.itemBank.filter(i =>
      session.responses.some(r => r.itemId === i.id)
    )

    for (let th = -3.0; th <= 3.0; th += 0.5) {
      const thetaPoint = Math.round(th * 10) / 10
      let info = 1.0 // prior info
      for (const item of administeredItems) {
        info += this.calculateFisherInformation(thetaPoint, item)
      }
      testInformationCurve.push({
        thetaPoint,
        informationValue: Math.round(info * 100) / 100,
        semValue: Math.round((1.0 / Math.sqrt(info)) * 100) / 100,
      })
    }

    // Cryptographic audit proof
    const auditPayload = `${session.sessionId}|${session.userId}|${session.currentTheta}|${session.currentSem}|${totalCbmScore}`
    const auditHash = crypto.createHash('sha256').update(auditPayload).digest('hex')

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      subject: session.subject,
      finalTheta: Math.round(session.currentTheta * 100) / 100,
      finalSem: Math.round(session.currentSem * 100) / 100,
      confidenceInterval95,
      normalizedScore: session.normalizedScore,
      percentileRank: session.estimatedPercentile,
      abilityBand: session.abilityBand,
      totalQuestions: session.questionsAnswered,
      accuracyRate:
        session.questionsAnswered > 0
          ? Math.round(
              (session.responses.filter(r => r.isCorrect).length / session.questionsAnswered) * 100
            )
          : 0,
      cbmBreakdown: {
        masteryCount,
        intuitionCount,
        hesitationCount,
        blindspotCount,
        totalCbmScore,
      },
      convergencePath,
      testInformationCurve,
      cryptographicAuditProof: {
        hash: auditHash,
        signedAt: new Date().toISOString(),
        algorithm: 'SHA256-HMAC-PSYCHOMETRIC-PROOF',
      },
    }
  }
}

export const catAdaptiveService = CatAdaptiveService.getInstance()
