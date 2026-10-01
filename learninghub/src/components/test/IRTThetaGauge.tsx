import { Activity } from 'lucide-react'

interface Props {
  theta: number // Latent ability score (-3.0 to +3.0)
  sem?: number // Standard Error of Measurement (e.g. 0.28)
}

export function IRTThetaGauge({ theta = 1.25, sem = 0.24 }: Props) {
  // Normalize theta (-3 to +3) into 0 to 100 percentage for visual gauge
  const clampedTheta = Math.max(-3.0, Math.min(3.0, theta))
  const gaugePercent = Math.round(((clampedTheta + 3.0) / 6.0) * 100)

  // Determine Mastery Band
  const tier =
    theta >= 2.0
      ? { name: 'Master / Top 1%', color: 'text-cyan-400', bg: 'bg-cyan-500/20' }
      : theta >= 1.0
        ? { name: 'Advanced / Top 10%', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
        : theta >= 0.0
          ? { name: 'Proficient / Median', color: 'text-indigo-400', bg: 'bg-indigo-500/20' }
          : { name: 'Developing Foundation', color: 'text-amber-400', bg: 'bg-amber-500/20' }

  return (
    <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-2 px-3 text-white shadow-md">
      <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
        <Activity className="w-4 h-4" />
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Adaptive Ability θ
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${tier.bg} ${tier.color}`}>
            {tier.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black font-mono tracking-tight text-white">
            {theta > 0 ? `+${theta.toFixed(2)}` : theta.toFixed(2)}
          </span>
          <span className="text-[10px] font-mono text-slate-400">± {sem.toFixed(2)} SEM</span>

          {/* Mini progress bar */}
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
