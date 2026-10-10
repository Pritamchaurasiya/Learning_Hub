import React from 'react'
import {
  ArchitecturePresetId,
  ChaosFaultType,
} from '../../types/systemDesign'
import {
  Flame,
  Zap,
  Sliders,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'

interface ChaosControlPanelProps {
  selectedPreset: ArchitecturePresetId
  onSelectPreset: (preset: ArchitecturePresetId) => void
  currentQps: number
  onChangeQps: (qps: number) => void
  activeFault: ChaosFaultType
  onSelectFault: (fault: ChaosFaultType) => void
  isSimulating: boolean
  onRunSimulation: () => void
  onResetNominal: () => void
}

export const ChaosControlPanel: React.FC<ChaosControlPanelProps> = ({
  selectedPreset,
  onSelectPreset,
  currentQps,
  onChangeQps,
  activeFault,
  onSelectFault,
  isSimulating,
  onRunSimulation,
  onResetNominal,
}) => {
  const presets: { id: ArchitecturePresetId; label: string; desc: string }[] = [
    {
      id: 'URL_SHORTENER_TINYURL',
      label: 'TinyURL / Bitly',
      desc: 'High read-to-write ratio, Redis cache-aside, Base62 encoding, and SQL replication.',
    },
    {
      id: 'GLOBAL_CHAT_MESSENGER',
      label: 'Global Chat (WhatsApp)',
      desc: 'Persistent WebSockets, Kafka partition streams, and ScyllaDB message logs.',
    },
    {
      id: 'DISTRIBUTED_RATE_LIMITER',
      label: 'Distributed Rate Limiter',
      desc: 'Token-bucket algorithms, sliding-window Redis logs, and DDoS edge absorption.',
    },
    {
      id: 'VIDEO_STREAMING_PLATFORM',
      label: 'Video Streaming (Netflix)',
      desc: 'Multi-CDN distribution, S3 video chunks, metadata caches, and transcode queues.',
    },
  ]

  const chaosFaults: { id: ChaosFaultType; label: string; badge: string; color: string }[] = [
    { id: 'NONE', label: 'Nominal Health (0 Faults)', badge: 'STABLE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'PRIMARY_DB_CRASH', label: 'Primary DB Node Crash', badge: 'CRITICAL', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { id: 'CACHE_THUNDERING_HERD', label: 'Cache Thundering Herd', badge: 'HIGH LATENCY', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'NETWORK_PARTITION_SPLIT_BRAIN', label: 'Cross-Region Partition', badge: 'SPLIT-BRAIN', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'HIGH_PACKET_LOSS', label: 'WAN Packet Degradation', badge: '5X JITTER', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  ]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Chaos Engineering & Traffic Controller</h3>
            <p className="text-xs text-slate-400">Configure real-time synthetic load and inject infrastructure faults.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetNominal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Restore nominal cluster state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Preset Architecture Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Target System Architecture Design
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedPreset === p.id
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-xs text-indigo-300">{p.label}</div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Target QPS Traffic Slider */}
      <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Synthetic Load Injection (QPS)</span>
          </div>
          <span className="text-sm font-mono font-bold text-sky-400">
            {currentQps.toLocaleString()} QPS
          </span>
        </div>

        <input
          type="range"
          min="1000"
          max="100000"
          step="1000"
          value={currentQps}
          onChange={e => onChangeQps(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>1,000 QPS (Low)</span>
          <span>25,000 QPS (Medium)</span>
          <span>50,000 QPS (High)</span>
          <span>100,000 QPS (Surge)</span>
        </div>
      </div>

      {/* Chaos Monkey Fault Injections */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Chaos Monkey Fault Injection</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chaosFaults.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFault(f.id)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                activeFault === f.id
                  ? 'bg-rose-950/40 border-rose-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-medium truncate">{f.label}</div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap ${f.color}`}>
                {f.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Trigger Button */}
      <button
        type="button"
        onClick={onRunSimulation}
        disabled={isSimulating}
        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSimulating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Simulating Architecture Dynamics...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Execute Discrete-Event Simulation</span>
          </>
        )}
      </button>
    </div>
  )
}
