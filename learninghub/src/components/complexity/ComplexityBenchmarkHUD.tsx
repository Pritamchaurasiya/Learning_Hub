import React from 'react'
import { AlgorithmPreset, ProfilerResultPayload } from '../../types/complexity'
import { Play, RefreshCw, Cpu, Database, Zap, Gauge } from 'lucide-react'

interface ComplexityBenchmarkHUDProps {
  presets: AlgorithmPreset[]
  selectedPresetId: string
  onSelectPreset: (presetId: string) => void
  onRunBenchmark: () => void
  isRunning: boolean
  result: ProfilerResultPayload | null
}

export const ComplexityBenchmarkHUD: React.FC<ComplexityBenchmarkHUDProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  onRunBenchmark,
  isRunning,
  result,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Top Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-400" />
            Empirical Complexity & Asymptotic Profiler
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Execute algorithms across multi-scale input sets to empirically deduce asymptotic Big-O growth curves and bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRunBenchmark}
            disabled={isRunning}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all ${
              isRunning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                Benchmarking Multi-Scale Inputs...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Empirical Benchmark
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Select Benchmark Preset or Algorithm Family
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => {
            const isSelected = preset.id === selectedPresetId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500 shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span>{preset.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                  {preset.complexity}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Metrics Row */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Classified Complexity
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {result.classifiedClass}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">
              {result.confidenceScore}% Statistical Confidence
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Regression Determination
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              R² = {result.primaryModel.rSquared.toFixed(3)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
              {result.primaryModel.formula}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Primary Bound Limiter
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-1">
              {result.bottleneckAnalysis.primaryLimiter.replace(/_/g, ' ')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {result.empiricalData.length} multi-scale tests
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              Peak Scale Measured
            </div>
            <div className="text-lg font-bold font-mono text-slate-100">
              N = {Math.max(...result.empiricalData.map(d => d.n)).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Total runtime: {result.empiricalData.reduce((acc, d) => acc + d.executionTimeMicros, 0).toFixed(1)} μs
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
