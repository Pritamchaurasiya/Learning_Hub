import React, { useState } from 'react'
import { Sliders, Play, CheckCircle2, XCircle, Activity, Info } from 'lucide-react'
import type { RateLimiterAlgorithm } from '../../types/distributedRateLimiter'
import { distributedRateLimiterService } from '../../services/distributedRateLimiterService'

interface AlgorithmComparisonSandboxProps {
  onSimulateComplete?: () => void
}

interface SimResultSummary {
  algorithm: RateLimiterAlgorithm
  title: string
  admitted: number
  throttled: number
  passRate: number
  characteristic: string
  pros: string
  cons: string
}

export const AlgorithmComparisonSandbox: React.FC<AlgorithmComparisonSandboxProps> = ({
  onSimulateComplete,
}) => {
  const [burstSize, setBurstSize] = useState<number>(25)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [comparisonResults, setComparisonResults] = useState<SimResultSummary[] | null>(null)

  const runTrafficComparison = async () => {
    setIsSimulating(true)
    try {
      // Concurrently evaluate requests across all 3 algorithms to simulate authentic burst concurrency
      const [tbVerdicts, lbVerdicts, swcVerdicts] = await Promise.all([
        Promise.all(
          Array.from({ length: burstSize }, () =>
            distributedRateLimiterService.evaluateRequest({
              algorithm: 'TOKEN_BUCKET',
              key: `sim:tb:${Date.now()}`,
              capacity: 15,
              refillRate: 5,
              cost: 1,
            })
          )
        ),
        Promise.all(
          Array.from({ length: burstSize }, () =>
            distributedRateLimiterService.evaluateRequest({
              algorithm: 'LEAKY_BUCKET',
              key: `sim:lb:${Date.now()}`,
              capacity: 15,
              refillRate: 5,
            })
          )
        ),
        Promise.all(
          Array.from({ length: burstSize }, () =>
            distributedRateLimiterService.evaluateRequest({
              algorithm: 'SLIDING_WINDOW_COUNTER',
              key: `sim:swc:${Date.now()}`,
              capacity: 15,
              windowSeconds: 60,
            })
          )
        ),
      ])

      const tbAdmitted = tbVerdicts.filter((v) => v.allowed).length
      const tbThrottled = burstSize - tbAdmitted

      const lbAdmitted = lbVerdicts.filter((v) => v.allowed).length
      const lbThrottled = burstSize - lbAdmitted

      const swcAdmitted = swcVerdicts.filter((v) => v.allowed).length
      const swcThrottled = burstSize - swcAdmitted

      setComparisonResults([
        {
          algorithm: 'TOKEN_BUCKET',
          title: 'Token Bucket',
          admitted: tbAdmitted,
          throttled: tbThrottled,
          passRate: Math.round((tbAdmitted / burstSize) * 100),
          characteristic: 'Bursty Outflow (Allows momentary spikes up to bucket capacity)',
          pros: 'Low memory (2 fields in Redis: count + last_refill). Accommodates natural traffic bursts.',
          cons: 'Downstream services can still be momentarily overwhelmed during sudden spikes.',
        },
        {
          algorithm: 'LEAKY_BUCKET',
          title: 'Leaky Bucket',
          admitted: lbAdmitted,
          throttled: lbThrottled,
          passRate: Math.round((lbAdmitted / burstSize) * 100),
          characteristic: 'Uniform Smooth Outflow (Shapes traffic into strictly constant rate)',
          pros: 'Ideal for protecting sensitive backends, payment gateways, and databases.',
          cons: 'Bursts are strictly queued or rejected; increases perceived latency for clients.',
        },
        {
          algorithm: 'SLIDING_WINDOW_COUNTER',
          title: 'Sliding Window Counter',
          admitted: swcAdmitted,
          throttled: swcThrottled,
          passRate: Math.round((swcAdmitted / burstSize) * 100),
          characteristic: 'Boundary-Smoothed Window (Eliminates fixed-window 2x burst boundary exploits)',
          pros: 'Fixed memory O(1) approximation with 99.8% accuracy vs expensive sliding logs.',
          cons: 'Assumes uniform request distribution across previous window interval.',
        },
      ])

      onSimulateComplete?.()
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              Rate Limiting Algorithm Comparison Sandbox
            </h3>
            <p className="text-xs text-slate-400">
              Benchmark Token Bucket, Leaky Bucket, and Sliding Window Counter under concurrent traffic bursts
            </p>
          </div>
        </div>

        {/* Burst Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[10, 25, 50].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBurstSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  burstSize === size
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {size} reqs
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runTrafficComparison}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Injecting...' : 'Simulate Blast'}</span>
          </button>
        </div>
      </div>

      {/* Results Matrix */}
      {comparisonResults ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {comparisonResults.map((res) => (
            <div
              key={res.algorithm}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-white">{res.title}</h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {res.passRate}% Pass
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">{res.characteristic}</p>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex mb-3">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${res.passRate}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${100 - res.passRate}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admitted: {res.admitted}
                  </span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Throttled: {res.throttled}
                  </span>
                </div>
              </div>

              {/* Architectural Trade-offs */}
              <div className="pt-3 border-t border-slate-800/80 text-[11px] space-y-2">
                <div>
                  <span className="text-emerald-400 font-semibold">Advantage: </span>
                  <span className="text-slate-300">{res.pros}</span>
                </div>
                <div>
                  <span className="text-amber-400 font-semibold">Trade-off: </span>
                  <span className="text-slate-400">{res.cons}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Sandbox Ready for Load Blast</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select burst volume and click "Simulate Blast" to benchmark how each algorithm handles identical instantaneous concurrency spikes.
            </p>
          </div>
        </div>
      )}

      {/* Pedagogical Note */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-purple-300 font-semibold">Sliding Window Counter Formula: </span>
          <span>
            Approximates rolling window load without logging timestamps: Requests = Current_Window + Previous_Window * (1 - Elapsed_Time / Window_Size).
          </span>
        </div>
      </div>
    </div>
  )
}
