import React from 'react'
import { GpuDeviceInfo, EdgeHardwareBenchmark } from '../../types/edgeAI'
import { Cpu, Zap, Activity, HardDrive, ShieldCheck, CheckCircle2 } from 'lucide-react'

interface GpuHardwareMeterProps {
  gpuInfo: GpuDeviceInfo
  benchmark: EdgeHardwareBenchmark | null
  isBenchmarking: boolean
  onRunBenchmark: () => void
}

export const GpuHardwareMeter: React.FC<GpuHardwareMeterProps> = ({
  gpuInfo,
  benchmark,
  isBenchmarking,
  onRunBenchmark,
}) => {
  const getTierBadge = () => {
    switch (gpuInfo.tier) {
      case 'TIER_1_WEBGPU_FULL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" /> Tier 1: Dedicated WebGPU (High Performance)
          </span>
        )
      case 'TIER_2_WEBGPU_LITE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> Tier 2: Integrated WebGPU (Standard)
          </span>
        )
      case 'TIER_3_WASM_CPU_FALLBACK':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-amber-400" /> Tier 3: CPU SIMD Quantized Engine
          </span>
        )
    }
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Hardware Accelerator Telemetry
              </h3>
              {gpuInfo.isSupported ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> WebGPU Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <Activity className="w-3 h-3" /> WASM Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md">
              {gpuInfo.adapterName} • {gpuInfo.vendor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getTierBadge()}
          <button
            onClick={onRunBenchmark}
            disabled={isBenchmarking}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isBenchmarking ? 'animate-spin' : ''}`} />
            {isBenchmarking ? 'Benchmarking...' : 'Test Speed'}
          </button>
        </div>
      </div>

      {/* Hardware Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> Estimated VRAM
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            ~{Math.round(gpuInfo.vramEstimateMB / 1024 * 10) / 10} GB
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Shader f16
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            {gpuInfo.f16Supported ? 'Supported (Fast)' : 'Emulated FP32'}
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Benchmark Tok/s
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {benchmark ? `${benchmark.tokensPerSec} tok/s` : 'Run test'}
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Latency (TTFT)
          </div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">
            {benchmark ? `${benchmark.ttftMs} ms` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
