import React, { useState } from 'react'
import {
  Flame,
  RotateCcw,
  Sliders,
  AlertOctagon,
  WifiOff,
  Clock,
  Radio,
  Zap,
  Cpu,
} from 'lucide-react'
import {
  ClusterTopology,
  ChaosExperimentConfig,
  ChaosFaultType,
} from '../../types/chaosCluster'

interface ChaosExperimentControlPanelProps {
  topology: ClusterTopology
  isSimulating: boolean
  onRunExperiment: (config: ChaosExperimentConfig) => Promise<void>
  onResetCluster: () => Promise<void>
}

interface ChaosPreset {
  label: string
  description: string
  config: ChaosExperimentConfig
}

export const ChaosExperimentControlPanel: React.FC<ChaosExperimentControlPanelProps> = ({
  topology,
  isSimulating,
  onRunExperiment,
  onResetCluster,
}) => {
  const [faultType, setFaultType] = useState<ChaosFaultType>('NETWORK_PARTITION')
  const [targetNodeId, setTargetNodeId] = useState<string>(topology.nodes[1]?.id || 'svc-auth')
  const [targetLinkId, setTargetLinkId] = useState<string>(topology.links[0]?.id || 'link-gw-auth')
  const [latencyMs, setLatencyMs] = useState<number>(1200)
  const [packetLossPercent, setPacketLossPercent] = useState<number>(35)
  const [durationSeconds, setDurationSeconds] = useState<number>(15)

  const presets: ChaosPreset[] = [
    {
      label: 'Cascading DB Crash',
      description: 'Terminates primary database process to test read-replica failover & circuit breaker isolation.',
      config: {
        faultType: 'PROCESS_CRASH',
        targetNodeId: 'svc-db-primary',
        durationSeconds: 15,
      },
    },
    {
      label: 'Payment Latency Storm',
      description: 'Injects 2,000ms latency into 3rd-party payment gateway to verify fast-fail timeout shedding.',
      config: {
        faultType: 'LATENCY_SPIKE',
        targetNodeId: 'svc-payment-ext',
        injectedLatencyMs: 2000,
        durationSeconds: 20,
      },
    },
    {
      label: 'Gateway Partition Blackhole',
      description: 'Severs network connection between API Gateway and Core Auth service.',
      config: {
        faultType: 'NETWORK_PARTITION',
        targetLinkId: 'link-gw-auth',
        durationSeconds: 15,
      },
    },
    {
      label: 'Event Bus Thread Saturation',
      description: 'Exhausts worker threads on Event Bus to verify backpressure and circuit tripping.',
      config: {
        faultType: 'THREAD_POOL_SATURATION',
        targetNodeId: 'svc-event-bus',
        durationSeconds: 12,
      },
    },
    {
      label: 'Lossy Network Flap (45% Drop)',
      description: 'Injects severe packet drop between Auth service and DB storage layer.',
      config: {
        faultType: 'PACKET_LOSS',
        targetLinkId: 'link-auth-db',
        injectedPacketLossPercent: 45,
        durationSeconds: 18,
      },
    },
  ]

  const handleApplyPreset = (preset: ChaosPreset) => {
    setFaultType(preset.config.faultType)
    if (preset.config.targetNodeId) setTargetNodeId(preset.config.targetNodeId)
    if (preset.config.targetLinkId) setTargetLinkId(preset.config.targetLinkId)
    if (preset.config.injectedLatencyMs) setLatencyMs(preset.config.injectedLatencyMs)
    if (preset.config.injectedPacketLossPercent) setPacketLossPercent(preset.config.injectedPacketLossPercent)
    if (preset.config.durationSeconds) setDurationSeconds(preset.config.durationSeconds)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const config: ChaosExperimentConfig = {
      faultType,
      durationSeconds,
      ...(faultType === 'PROCESS_CRASH' || faultType === 'THREAD_POOL_SATURATION' || faultType === 'LATENCY_SPIKE'
        ? { targetNodeId }
        : {}),
      ...(faultType === 'NETWORK_PARTITION' || faultType === 'PACKET_LOSS' || faultType === 'LATENCY_SPIKE'
        ? { targetLinkId }
        : {}),
      ...(faultType === 'LATENCY_SPIKE' ? { injectedLatencyMs: latencyMs } : {}),
      ...(faultType === 'PACKET_LOSS' ? { injectedPacketLossPercent: packetLossPercent } : {}),
    }

    onRunExperiment(config)
  }

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-500" />
            Chaos Experiment Injection Console
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject stochastic failure modes to validate system resilience & circuit breaker thresholds.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetCluster}
          disabled={isSimulating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          Reset Cluster
        </button>
      </div>

      {/* Quick Chaos Presets */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Recommended Failure Scenarios
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 rounded-xl text-left bg-slate-950/60 border border-slate-800/80 hover:border-rose-500/50 hover:bg-slate-800/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                  {preset.label}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {preset.config.faultType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Fault Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              Fault Mode
            </label>
            <select
              value={faultType}
              onChange={(e) => setFaultType(e.target.value as ChaosFaultType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="NETWORK_PARTITION">NETWORK_PARTITION (Sever Link)</option>
              <option value="LATENCY_SPIKE">LATENCY_SPIKE (Simulate Slowness)</option>
              <option value="PACKET_LOSS">PACKET_LOSS (Drop Packets)</option>
              <option value="PROCESS_CRASH">PROCESS_CRASH (Kernel SIGKILL)</option>
              <option value="THREAD_POOL_SATURATION">THREAD_POOL_SATURATION (Exhaustion)</option>
            </select>
          </div>

          {/* Target Service Node */}
          {(faultType === 'PROCESS_CRASH' ||
            faultType === 'THREAD_POOL_SATURATION' ||
            faultType === 'LATENCY_SPIKE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                Target Microservice
              </label>
              <select
                value={targetNodeId}
                onChange={(e) => setTargetNodeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                {topology.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} ({node.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Network Link */}
          {(faultType === 'NETWORK_PARTITION' ||
            faultType === 'PACKET_LOSS' ||
            faultType === 'LATENCY_SPIKE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-cyan-400" />
                Target Network Link
              </label>
              <select
                value={targetLinkId}
                onChange={(e) => setTargetLinkId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                {topology.links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.sourceNodeId.replace('svc-', '')} → {link.targetNodeId.replace('svc-', '')} ({link.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Latency Dial */}
          {faultType === 'LATENCY_SPIKE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Injected Latency
                </span>
                <span className="font-mono text-amber-400 font-bold">{latencyMs} ms</span>
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-950"
              />
            </div>
          )}

          {/* Packet Loss Dial */}
          {faultType === 'PACKET_LOSS' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400" /> Packet Drop Rate
                </span>
                <span className="font-mono text-rose-400 font-bold">{packetLossPercent}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={packetLossPercent}
                onChange={(e) => setPacketLossPercent(Number(e.target.value))}
                className="w-full accent-rose-500 bg-slate-950"
              />
            </div>
          )}

          {/* Duration Dial */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Duration Window
              </span>
              <span className="font-mono text-indigo-400 font-bold">{durationSeconds}s</span>
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="w-full accent-rose-500 bg-slate-950"
            />
          </div>
        </div>

        {/* Submit Execution Action */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSimulating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Simulating Chaos Cascade...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Inject Chaos Fault & Trigger Breakers</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
