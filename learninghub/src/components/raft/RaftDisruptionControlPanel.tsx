import { useState, type FC, type FormEvent } from 'react'
import {
  Play,
  Pause,
  FastForward,
  Split,
  RefreshCw,
  Send,
  Sliders,
} from 'lucide-react'

interface RaftDisruptionControlPanelProps {
  isPlaying: boolean
  networkPartitionActive: boolean
  isSubmitting: boolean
  onTogglePlay: () => void
  onStepTick: () => void
  onResetCluster: (nodeCount: number) => void
  onInjectSplitBrain: () => void
  onHealPartition: () => void
  onSubmitClientCommand: (command: string) => void
}

export const RaftDisruptionControlPanel: FC<RaftDisruptionControlPanelProps> = ({
  isPlaying,
  networkPartitionActive,
  isSubmitting,
  onTogglePlay,
  onStepTick,
  onResetCluster,
  onInjectSplitBrain,
  onHealPartition,
  onSubmitClientCommand,
}) => {
  const [commandText, setCommandText] = useState('SET user_session = active')

  const handleCommandSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!commandText.trim()) return
    onSubmitClientCommand(commandText.trim())
  }

  const handlePresetCommand = (preset: string) => {
    setCommandText(preset)
    onSubmitClientCommand(preset)
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <Sliders className="w-5 h-5 text-amber-400" />
        <h3 className="text-base font-bold text-white tracking-wide">
          Interactive Consensus Lab & Chaos Disruptions
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Simulation Clock Controls */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            1. Cluster Clock & Heartbeats
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition shadow-md ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Clock
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Auto-Tick Clock
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onStepTick}
              disabled={isPlaying}
              className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <FastForward className="w-3.5 h-3.5" /> Step Tick (50ms)
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Cluster Size:</span>
            {[3, 5, 7].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => onResetCluster(count)}
                className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
              >
                {count} Nodes
              </button>
            ))}
          </div>
        </div>

        {/* Network Partition & Split-Brain Chaos */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            2. Network Partition (Split-Brain)
          </span>
          {networkPartitionActive ? (
            <button
              type="button"
              onClick={onHealPartition}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className="w-4 h-4" /> Heal Partition (Reconcile Cluster)
            </button>
          ) : (
            <button
              type="button"
              onClick={onInjectSplitBrain}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white transition shadow-lg shadow-rose-950/40"
            >
              <Split className="w-4 h-4" /> Inject Split-Brain (Minority vs Majority)
            </button>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {networkPartitionActive
              ? 'Cluster is split into Group A {node-1, node-2} and Group B {node-3, node-4, node-5}. Notice how Group A cannot commit writes without majority quorum.'
              : 'Simulates a real-world network partition. Separates 5 nodes into {1, 2} (minority) and {3, 4, 5} (majority).'}
          </p>
        </div>

        {/* Client Write Command Ingestion */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            3. Client Write Execution
          </span>
          <form onSubmit={handleCommandSubmit} className="flex gap-2">
            <input
              type="text"
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              placeholder="e.g. SET balance = 5000"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !commandText.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handlePresetCommand('SET balance = 10000')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-indigo-300"
            >
              + SET balance = 10000
            </button>
            <button
              type="button"
              onClick={() => handlePresetCommand('SET lock = acquired')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-indigo-300"
            >
              + SET lock = acquired
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
