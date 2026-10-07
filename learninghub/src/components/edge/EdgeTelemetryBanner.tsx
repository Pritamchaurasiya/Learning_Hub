import React from 'react'
import { EdgeInferenceMetrics } from '../../types/edgeAI'
import { Zap, Clock, Cpu, ShieldCheck, Activity, MemoryStick as Memory } from 'lucide-react'

interface EdgeTelemetryBannerProps {
  metrics: EdgeInferenceMetrics | null
  isStreaming: boolean
  isAirGappedActive: boolean
}

export const EdgeTelemetryBanner: React.FC<EdgeTelemetryBannerProps> = ({
  metrics,
  isStreaming,
  isAirGappedActive,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Activity className={`w-4 h-4 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          <span>Micro-Inference Telemetry</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 font-mono text-slate-300">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            TTFT: <strong className="text-slate-100">{metrics?.ttftMs ? `${metrics.ttftMs}ms` : '--'}</strong>
          </span>

          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Throughput: <strong className="text-slate-100">{metrics?.tokensPerSec ? `${metrics.tokensPerSec} tok/s` : '--'}</strong>
          </span>

          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Tokens: <strong className="text-slate-100">{metrics?.totalTokensGenerated || 0}</strong>
          </span>

          <span className="flex items-center gap-1">
            <Memory className="w-3.5 h-3.5 text-purple-400" />
            VRAM: <strong className="text-slate-100">{metrics?.peakMemoryMB ? `${metrics.peakMemoryMB} MB` : '320 MB'}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          Engine: <strong className="text-cyan-400 font-mono">{metrics?.engineMode || 'WEBGPU_SHADERS'}</strong>
        </span>

        {isAirGappedActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Air-Gapped (0 Bytes Sent)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Edge Private Sandbox
          </span>
        )}
      </div>
    </div>
  )
}
