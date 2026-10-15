import { useState, useEffect, useCallback, type FC } from 'react'
import {
  Layers,
  Sliders,
  Cpu,
  Gauge,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import type {
  RateLimitVerdict,
  RaceConditionSimResult,
  AdaptiveConcurrencyState,
  RateLimiterAuditSnapshot,
} from '../types/distributedRateLimiter'
import { distributedRateLimiterService } from '../services/distributedRateLimiterService'
import { TokenBucketVisualizer } from '../components/rateLimiter/TokenBucketVisualizer'
import { AlgorithmComparisonSandbox } from '../components/rateLimiter/AlgorithmComparisonSandbox'
import { DistributedLuaAtomicityHUD } from '../components/rateLimiter/DistributedLuaAtomicityHUD'
import { AdaptiveConcurrencyLimitCard } from '../components/rateLimiter/AdaptiveConcurrencyLimitCard'
import { RateLimitAuditScorecard } from '../components/rateLimiter/RateLimitAuditScorecard'

export type RateLimiterTab = 'ALL' | 'TOKEN_BUCKET' | 'COMPARISON' | 'RACE_LUA' | 'ADAPTIVE' | 'RFC_AUDIT'

export const DistributedRateLimiterStudioPage: FC = () => {
  const [activeTab, setActiveTab] = useState<RateLimiterTab>('ALL')
  const [capacity] = useState<number>(20)
  const [refillRate] = useState<number>(5)
  const [remainingTokens, setRemainingTokens] = useState<number>(20)
  const [lastVerdict, setLastVerdict] = useState<RateLimitVerdict | null>(null)
  const [raceResult, setRaceResult] = useState<RaceConditionSimResult | null>(null)
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveConcurrencyState | null>(null)
  const [auditSnapshot, setAuditSnapshot] = useState<RateLimiterAuditSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  const loadInitialData = useCallback(async () => {
    try {
      const [adaptive, audit, initialRace] = await Promise.all([
        distributedRateLimiterService.getAdaptiveState(),
        distributedRateLimiterService.getAuditSnapshot(),
        distributedRateLimiterService.simulateRaceCondition(100, 15),
      ])
      setAdaptiveState(adaptive)
      setAuditSnapshot(audit)
      setRaceResult(initialRace)
    } catch (err) {
      console.error('Failed to load Rate Limiter studio data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Continuous Token Refill ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTokens((prev) => {
        if (prev < capacity) {
          const nextVal = Math.min(capacity, prev + refillRate * 0.5)
          return Math.round(nextVal * 10) / 10
        }
        return prev
      })
    }, 500)
    return () => clearInterval(timer)
  }, [capacity, refillRate])

  const handleConsume = async (cost: number) => {
    try {
      const verdict = await distributedRateLimiterService.evaluateRequest({
        algorithm: 'TOKEN_BUCKET',
        capacity,
        refillRate,
        cost,
      })
      setLastVerdict(verdict)
      if (verdict.allowed) {
        setRemainingTokens(verdict.remainingTokens)
        showNotification(`HTTP 200: Consumed ${cost} token(s). Remaining: ${verdict.remainingTokens}`)
      } else {
        showNotification(`HTTP 429: Rate limit exceeded! Retry after ${verdict.retryAfterSeconds}s`)
      }
      const updatedAudit = await distributedRateLimiterService.getAuditSnapshot()
      setAuditSnapshot(updatedAudit)
    } catch (err: any) {
      showNotification(`Consumption error: ${err.message}`)
    }
  }

  const handleSimulateRace = async (concurrency: number, bucketCapacity: number) => {
    try {
      const result = await distributedRateLimiterService.simulateRaceCondition(concurrency, bucketCapacity)
      setRaceResult(result)
      showNotification(`Simulated ${concurrency} concurrent requests with capacity ${bucketCapacity}`)
    } catch (err: any) {
      showNotification(`Simulation error: ${err.message}`)
    }
  }

  const handleUpdateRtt = async (rttMs: number) => {
    try {
      const state = await distributedRateLimiterService.updateAdaptiveConcurrency(rttMs)
      setAdaptiveState(state)
      showNotification(`Adaptive limiter calibrated: RTT ${rttMs}ms -> New limit: ${state.currentLimit}`)
    } catch (err: any) {
      showNotification(`Adaptive calibration error: ${err.message}`)
    }
  }

  const handleReset = async () => {
    try {
      const resetSnapshot = await distributedRateLimiterService.reset()
      setAuditSnapshot(resetSnapshot)
      setRemainingTokens(capacity)
      setLastVerdict(null)
      const freshAdaptive = await distributedRateLimiterService.getAdaptiveState()
      setAdaptiveState(freshAdaptive)
      showNotification('Rate limiter simulation and token buckets reset successfully')
    } catch (err: any) {
      showNotification(`Reset failed: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Milestone 37 • Production Distributed Systems
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Traffic Shaping & Concurrency Control
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Distributed Rate Limiting & Traffic Shaping Studio
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore high-throughput token bucket reservoirs, leaky bucket traffic shaping, sliding window counters,
              Redis single-threaded Lua script atomicity TOCTOU defense, and Netflix-grade adaptive concurrency limiting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mt-4 p-3 bg-cyan-950/60 border border-cyan-800/80 rounded-xl text-xs text-cyan-200 animate-fadeIn flex items-center justify-between">
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Modules', icon: Layers },
            { id: 'TOKEN_BUCKET', label: 'Token Bucket Reservoir', icon: Layers },
            { id: 'COMPARISON', label: 'Algorithm Sandbox', icon: Sliders },
            { id: 'RACE_LUA', label: 'Lua Race Condition', icon: Cpu },
            { id: 'ADAPTIVE', label: 'Adaptive Concurrency', icon: Gauge },
            { id: 'RFC_AUDIT', label: 'RFC 6585 Audit', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as RateLimiterTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400 font-mono">Initializing distributed rate limiter cluster...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Module 1: Token Bucket Reservoir */}
          {(activeTab === 'ALL' || activeTab === 'TOKEN_BUCKET') && (
            <TokenBucketVisualizer
              capacity={capacity}
              refillRate={refillRate}
              remainingTokens={remainingTokens}
              onConsume={handleConsume}
              lastVerdict={lastVerdict}
            />
          )}

          {/* Module 2: Algorithm Comparison Sandbox */}
          {(activeTab === 'ALL' || activeTab === 'COMPARISON') && (
            <AlgorithmComparisonSandbox
              onSimulateComplete={() => {
                showNotification('Traffic blast completed across all 3 rate limiting algorithms')
              }}
            />
          )}

          {/* Module 3: Distributed Race Condition & Redis Lua Atomicity HUD */}
          {(activeTab === 'ALL' || activeTab === 'RACE_LUA') && (
            <DistributedLuaAtomicityHUD
              onSimulate={handleSimulateRace}
              result={raceResult}
            />
          )}

          {/* Module 4: Adaptive Concurrency Limit Card */}
          {(activeTab === 'ALL' || activeTab === 'ADAPTIVE') && adaptiveState && (
            <AdaptiveConcurrencyLimitCard
              state={adaptiveState}
              onUpdateRtt={handleUpdateRtt}
            />
          )}

          {/* Module 5: Rate Limit RFC Compliance & Audit Scorecard */}
          {(activeTab === 'ALL' || activeTab === 'RFC_AUDIT') && (
            <RateLimitAuditScorecard
              snapshot={auditSnapshot}
              lastVerdict={lastVerdict}
              onReset={handleReset}
            />
          )}

          {/* Micro-Curriculum Pedagogical Deep Dive */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Distributed Rate Limiting & Concurrency Control Engineering Curriculum
                </h3>
                <p className="text-xs text-slate-400">
                  Architectural masterclass on traffic shaping, Redis atomicity, and self-tuning systems
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 text-sm">1. Token Bucket vs Leaky Bucket</h4>
                <p className="leading-relaxed text-slate-400">
                  <span className="text-slate-200 font-semibold">Token Bucket</span> allows momentary bursts up to capacity while refilling continuously. In contrast, <span className="text-slate-200 font-semibold">Leaky Bucket</span> holds requests in a FIFO queue and emits them at a fixed uniform rate, ideal for traffic smoothing against volatile databases.
                </p>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-rose-400 text-sm">2. Race Conditions & Lua Atomicity</h4>
                <p className="leading-relaxed text-slate-400">
                  Naïve rate limiting executes two Redis network round-trips: GET key then SET key. Under high concurrency, hundreds of goroutines inspect the same un-decremented counter simultaneously, causing massive over-admission breaches. Redis <span className="text-slate-200 font-semibold">EVAL Lua scripts</span> execute as a single atomic transaction on the Redis thread.
                </p>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-amber-400 text-sm">3. Little's Law & Adaptive Limits</h4>
                <p className="leading-relaxed text-slate-400">
                  Static limits break during downstream degraded states. Under Little's Law (L = λ * W), as latency W balloons, static limiters allow excessive work into the pipeline, causing cascading failure. <span className="text-slate-200 font-semibold">Adaptive Concurrency</span> uses gradient RTT feedback to dynamically lower max concurrent in-flight requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default DistributedRateLimiterStudioPage
