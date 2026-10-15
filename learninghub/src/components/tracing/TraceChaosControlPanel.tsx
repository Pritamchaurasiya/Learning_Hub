import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
  Play,
  CheckCircle2,
  Trash2,
  Sliders,
} from 'lucide-react'
import type {
  ChaosRule,
  LatencyDistribution,
  TraceAggregate,
} from '../../types/distributedTracing'
import { distributedTracingService } from '../../services/distributedTracingService'

interface TraceChaosControlPanelProps {
  onSimulateWithChaos: (newTrace: TraceAggregate) => void
}

const AVAILABLE_SERVICES = [
  'api-gateway',
  'auth-service',
  'course-service',
  'postgres-db',
  'payment-service',
  'notification-worker',
]

export const TraceChaosControlPanel: React.FC<TraceChaosControlPanelProps> = ({
  onSimulateWithChaos,
}) => {
  const [targetService, setTargetService] = useState('postgres-db')
  const [additionalLatencyMs, setAdditionalLatencyMs] = useState(250)
  const [injectError, setInjectError] = useState(false)
  const [errorRate, setErrorRate] = useState(1.0)
  const [activeRules, setActiveRules] = useState<ChaosRule[]>([])
  const [distributions, setDistributions] = useState<LatencyDistribution[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadDistributions()
  }, [])

  const loadDistributions = async () => {
    try {
      const data = await distributedTracingService.getLatencyDistributions()
      setDistributions(data)
    } catch {
      setDistributions(distributedTracingService.getMockDistributions())
    }
  }

  const handleAddRule = async () => {
    const newRule: ChaosRule = {
      targetService,
      additionalLatencyMs,
      injectError,
      errorRate: injectError ? errorRate : 0,
    }

    await distributedTracingService.setChaosRule(newRule)
    setActiveRules((prev) => {
      const filtered = prev.filter((r) => r.targetService !== targetService)
      return [...filtered, newRule]
    })

    setSuccessMessage(`Chaos rule configured for ${targetService}!`)
    setTimeout(() => setSuccessMessage(null), 3000)
    await loadDistributions()
  }

  const handleClearRules = async () => {
    await distributedTracingService.clearChaosRules()
    setActiveRules([])
    setSuccessMessage('Cleared all chaos injection rules.')
    setTimeout(() => setSuccessMessage(null), 3000)
    await loadDistributions()
  }

  const handleTriggerSimulation = async () => {
    setIsSimulating(true)
    try {
      const delays: Record<string, number> = {}
      let forceErrorService: string | undefined = undefined

      activeRules.forEach((r) => {
        if (r.additionalLatencyMs > 0) delays[r.targetService] = r.additionalLatencyMs
        if (r.injectError) forceErrorService = r.targetService
      })

      const newTrace = await distributedTracingService.simulateRequest({
        scenarioName: 'Chaos Injection Test Run',
        customDelays: delays,
        forceErrorOnService: forceErrorService,
      })
      onSimulateWithChaos(newTrace)
      await loadDistributions()
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Chaos Engineering & Latency Injection Lab
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Simulate network degradation, database query spikes, and service failure cascades to observe tracepropagation.
          </p>
        </div>

        {successMessage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            {successMessage}
          </div>
        )}
      </div>

      {/* Control Form */}
      <div className="p-5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-indigo-500" />
          Inject Fault or Latency
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Service */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Target Microservice
            </label>
            <select
              value={targetService}
              onChange={(e) => setTargetService(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 font-mono"
            >
              {AVAILABLE_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Latency Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Added Latency (ms)
              </label>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                +{additionalLatencyMs} ms
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1500}
              step={25}
              value={additionalLatencyMs}
              onChange={(e) => setAdditionalLatencyMs(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex gap-2 mt-1.5">
              {[0, 100, 300, 800].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAdditionalLatencyMs(preset)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-200 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  +{preset}ms
                </button>
              ))}
            </div>
          </div>

          {/* Error Injection */}
          <div className="flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inject-error-toggle"
                checked={injectError}
                onChange={(e) => setInjectError(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
              />
              <label
                htmlFor="inject-error-toggle"
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Simulate 500 Failure / Timeout
              </label>
            </div>

            {injectError && (
              <div className="mt-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-500">Error Probability</span>
                  <span className="font-mono font-bold text-rose-600">
                    {(errorRate * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={errorRate}
                  onChange={(e) => setErrorRate(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAddRule}
              className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Apply Chaos Rule
            </button>
          </div>
        </div>
      </div>

      {/* Active Rules List */}
      {activeRules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Active Chaos Overrides ({activeRules.length})</span>
            <button
              onClick={handleClearRules}
              className="text-rose-600 hover:underline flex items-center gap-1 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Rules
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeRules.map((rule) => (
              <div
                key={rule.targetService}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-mono font-medium"
              >
                <span>{rule.targetService}</span>
                {rule.additionalLatencyMs > 0 && (
                  <span className="bg-rose-200 dark:bg-rose-900 px-1.5 py-0.5 rounded text-[10px]">
                    +{rule.additionalLatencyMs}ms
                  </span>
                )}
                {rule.injectError && (
                  <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                    ERR ({rule.errorRate * 100}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resimulate Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTriggerSimulation}
          disabled={isSimulating}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSimulating ? (
            <Activity className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>Execute Simulation with Chaos</span>
        </button>

        <button
          type="button"
          onClick={handleClearRules}
          className="py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Defaults
        </button>
      </div>

      {/* Latency Percentiles Distribution Table */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-500" />
          Microservice Latency Distributions (p50 / p90 / p95 / p99)
        </h4>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-750">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-750">
              <tr>
                <th className="px-4 py-3">Microservice</th>
                <th className="px-4 py-3 text-right">Samples</th>
                <th className="px-4 py-3 text-right">p50 (Median)</th>
                <th className="px-4 py-3 text-right">p90</th>
                <th className="px-4 py-3 text-right">p95</th>
                <th className="px-4 py-3 text-right">p99 (Tail)</th>
                <th className="px-4 py-3 text-right">Error Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-750 font-mono">
              {distributions.map((dist) => (
                <tr
                  key={dist.serviceName}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold font-sans text-gray-900 dark:text-gray-100">
                    {dist.serviceName}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {dist.sampleCount}
                  </td>
                  <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                    {dist.p50Ms.toFixed(1)} ms
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                    {dist.p90Ms.toFixed(1)} ms
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                    {dist.p95Ms.toFixed(1)} ms
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                    {dist.p99Ms.toFixed(1)} ms
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        dist.errorRate > 0
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {(dist.errorRate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
