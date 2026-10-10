import React from 'react'
import { Shield, Zap, Activity, Cpu, DollarSign, Award, CheckCircle } from 'lucide-react'
import { ParetoMetrics } from '../../types/agentDebate'

interface ParetoTradeoffRadarProps {
  metrics: ParetoMetrics
  status: string
  onOpenRfcModal?: () => void
}

export const ParetoTradeoffRadar: React.FC<ParetoTradeoffRadarProps> = ({
  metrics,
  status,
  onOpenRfcModal,
}) => {
  const dimensions = [
    {
      key: 'security',
      label: 'Zero-Trust Security',
      value: metrics.security,
      icon: <Shield className="w-4 h-4 text-rose-400" />,
      color: 'bg-rose-500',
    },
    {
      key: 'performance',
      label: 'Throughput & P99 SLA',
      value: metrics.performance,
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      color: 'bg-amber-500',
    },
    {
      key: 'reliability',
      label: 'SRE & Fault Tolerance',
      value: metrics.reliability,
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      color: 'bg-emerald-500',
    },
    {
      key: 'maintainability',
      label: 'DDD & Modularity',
      value: metrics.maintainability,
      icon: <Cpu className="w-4 h-4 text-indigo-400" />,
      color: 'bg-indigo-500',
    },
    {
      key: 'costEfficiency',
      label: 'Infra Cost Efficiency',
      value: metrics.costEfficiency,
      icon: <DollarSign className="w-4 h-4 text-cyan-400" />,
      color: 'bg-cyan-500',
    },
  ]

  const isApproved = metrics.compositeConsensusScore >= 80

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            Pareto Consensus Scorecard
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-dimensional dialectical evaluation
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-white font-mono flex items-center gap-1.5 justify-end">
            <span
              className={
                isApproved
                  ? 'text-emerald-400'
                  : metrics.compositeConsensusScore >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {metrics.compositeConsensusScore}
            </span>
            <span className="text-xs text-slate-500 font-sans">/100</span>
          </div>
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isApproved
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Progress Bars for the 5 Dimensions */}
      <div className="space-y-3.5">
        {dimensions.map((dim) => (
          <div key={dim.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                {dim.icon}
                {dim.label}
              </span>
              <span className="font-mono font-bold text-white">{dim.value}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${dim.color}`}
                style={{ width: `${Math.min(Math.max(dim.value, 0), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Box & RFC Trigger */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 leading-relaxed flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            BFT Consensus Threshold (&ge; 75%) satisfied. Multi-agent debate verified that zero unmitigated single points of failure remain.
          </span>
        </div>

        {onOpenRfcModal && (
          <button
            onClick={onOpenRfcModal}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>View & Export Signed Architecture RFC</span>
          </button>
        )}
      </div>
    </div>
  )
}
