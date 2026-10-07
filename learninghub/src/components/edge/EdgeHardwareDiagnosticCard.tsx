import React, { useState } from 'react'
import { GpuDeviceInfo, EdgeHardwareBenchmark } from '../../types/edgeAI'
import { Cpu, Zap, Activity, CheckCircle2, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react'

interface EdgeHardwareDiagnosticCardProps {
  deviceInfo: GpuDeviceInfo | null
  onRunBenchmark: () => Promise<EdgeHardwareBenchmark>
  lastBenchmark?: EdgeHardwareBenchmark | null
}

export const EdgeHardwareDiagnosticCard: React.FC<EdgeHardwareDiagnosticCardProps> = ({
  deviceInfo,
  onRunBenchmark,
  lastBenchmark,
}) => {
  const [isRunningBench, setIsRunningBench] = useState(false)
  const [currentBench, setCurrentBench] = useState<EdgeHardwareBenchmark | null>(lastBenchmark || null)

  const handleBenchmarkClick = async () => {
    setIsRunningBench(true)
    try {
      const res = await onRunBenchmark()
      setCurrentBench(res)
    } finally {
      setIsRunningBench(false)
    }
  }

  const getTierBadge = () => {
    if (!deviceInfo) return null

    switch (deviceInfo.tier) {
      case 'TIER_1_WEBGPU_FULL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tier 1 Dedicated WebGPU
          </span>
        )
      case 'TIER_2_WEBGPU_LITE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Zap className="w-3.5 h-3.5" /> Tier 2 Integrated WebGPU
          </span>
        )
      case 'TIER_3_WASM_CPU_FALLBACK':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Tier 3 CPU / WASM SIMD Fallback
          </span>
        )
    }
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Hardware WebGPU Diagnostics
              <span className="inline-flex items-center text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                <ShieldCheck className="w-3 h-3 mr-1" /> 100% On-Device
              </span>
            </h3>
            <p className="text-xs text-slate-400">Direct-to-metal shader micro-inference pipeline</p>
          </div>
        </div>

        <div>{getTierBadge()}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400 block mb-0.5">GPU Device</span>
          <span className="text-slate-200 font-medium truncate block" title={deviceInfo?.adapterName}>
            {deviceInfo?.adapterName || 'Detecting...'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400 block mb-0.5">Est. VRAM Capacity</span>
          <span className="text-slate-200 font-medium font-mono">
            {deviceInfo?.vramEstimateMB ? `${(deviceInfo.vramEstimateMB / 1024).toFixed(1)} GB` : '--'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400 block mb-0.5">FP16 Shaders</span>
          <span
            className={`font-medium ${deviceInfo?.f16Supported ? 'text-emerald-400' : 'text-slate-300'}`}
          >
            {deviceInfo?.f16Supported ? 'Supported (shader-f16)' : 'Emulated FP32'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400 block mb-0.5">Max Buffer Bound</span>
          <span className="text-slate-200 font-medium font-mono">
            {deviceInfo?.maxBufferSizeMB ? `${deviceInfo.maxBufferSizeMB} MB` : '256 MB'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBenchmarkClick}
            disabled={isRunningBench}
            aria-label="Run Micro-Benchmark"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
          >
            <Gauge className={`w-3.5 h-3.5 ${isRunningBench ? 'animate-spin' : ''}`} />
            {isRunningBench ? 'Benchmarking Shaders...' : 'Run Micro-Benchmark'}
          </button>

          {currentBench && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Speed: <strong className="text-slate-200 font-mono">{currentBench.tokensPerSec} tok/s</strong>
              </span>
              <span className="text-slate-400">
                TTFT: <strong className="text-slate-200 font-mono">{currentBench.ttftMs}ms</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentBench.grade === 'EXCELLENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                Grade: {currentBench.grade}
              </span>
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-500">
          Privacy Mode: Zero network requests during generation
        </span>
      </div>
    </div>
  )
}
