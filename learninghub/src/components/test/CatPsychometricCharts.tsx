import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Activity, BarChart2, CheckCircle2, XCircle } from 'lucide-react'
import { CatScorecard } from '../../services/catService'

interface CatPsychometricChartsProps {
  scorecard: CatScorecard
}

type ChartTab = 'bell_curve' | 'trajectory' | 'information_curve'

export const CatPsychometricCharts: React.FC<CatPsychometricChartsProps> = ({ scorecard }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('bell_curve')

  // 1. Generate Gaussian Standard Normal Distribution Data (-3.5 to +3.5)
  const bellCurveData = React.useMemo(() => {
    const points = []
    const userTheta = scorecard.finalTheta
    const [ciMin, ciMax] = scorecard.confidenceInterval95

    for (let th = -3.5; th <= 3.5; th += 0.1) {
      const thetaVal = Math.round(th * 10) / 10
      // Standard normal PDF: f(x) = (1 / sqrt(2 * pi)) * exp(-0.5 * x^2)
      const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * thetaVal * thetaVal)
      const isInsideCI = thetaVal >= ciMin && thetaVal <= ciMax

      points.push({
        theta: thetaVal,
        density: Math.round(pdf * 1000) / 1000,
        ciDensity: isInsideCI ? Math.round(pdf * 1000) / 1000 : 0,
        isUserPoint: Math.abs(thetaVal - userTheta) < 0.08,
      })
    }
    return points
  }, [scorecard.finalTheta, scorecard.confidenceInterval95])

  // 2. Convergence Path Data
  const trajectoryData = React.useMemo(() => {
    return scorecard.convergencePath.map(step => ({
      step: `Q${step.step}`,
      stepNumber: step.step,
      theta: step.theta,
      difficulty: step.itemDifficulty,
      sem: step.sem,
      isCorrect: step.isCorrect,
    }))
  }, [scorecard.convergencePath])

  // 3. Test Information Curve Data
  const informationData = React.useMemo(() => {
    return scorecard.testInformationCurve.map(pt => ({
      theta: pt.thetaPoint,
      info: pt.informationValue,
      sem: pt.semValue,
    }))
  }, [scorecard.testInformationCurve])

  return (
    <div className="space-y-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('bell_curve')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'bell_curve'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Population Distribution</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trajectory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'trajectory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Adaptive Trajectory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('information_curve')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'information_curve'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Test Information (TIC)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          θ = <strong className="text-cyan-400">{scorecard.finalTheta > 0 ? `+${scorecard.finalTheta}` : scorecard.finalTheta}</strong> | SEM = ±{scorecard.finalSem}
        </div>
      </div>

      {/* Tab 1: Normal Distribution Bell Curve */}
      {activeTab === 'bell_curve' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>
              Standard normal latent ability distribution ($\mu=0, \sigma=1$). The shaded band marks your 95% Confidence Interval.
            </p>
            <span className="text-indigo-400 font-bold whitespace-nowrap">
              Percentile Rank: {scorecard.percentileRank.toFixed(1)}%
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bellCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bellTotalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ciHighlightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="theta"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}`, 'Cohort Density']}
                  labelFormatter={lbl => `Ability θ: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="density"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#bellTotalGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="ciDensity"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#ciHighlightGradient)"
                />
                <ReferenceLine
                  x={scorecard.finalTheta}
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `You (θ=${scorecard.finalTheta})`,
                    fill: '#22d3ee',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Adaptive Calibration Trajectory */}
      {activeTab === 'trajectory' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Real-time Bayesian EAP progression showing question difficulty ($b$) targeting your converging ability score ($\theta$).
          </p>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="step" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                <YAxis domain={[-3, 3]} tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="theta"
                  name="Ability θ After Step"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#22d3ee' }}
                />
                <Line
                  type="monotone"
                  dataKey="difficulty"
                  name="Item Difficulty (b)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#a855f7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Question Steps:</span>
            {trajectoryData.map(step => (
              <span
                key={step.step}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono ${
                  step.isCorrect
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {step.isCorrect ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                {step.step}: b={step.difficulty}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Test Information Curve (TIC) */}
      {activeTab === 'information_curve' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Fisher Test Information $I(\theta)$. Peak curvature demonstrates where the assessment provides maximum measurement confidence.
          </p>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={informationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="infoCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="theta" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#334155" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#334155" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}`, 'Fisher Information']}
                  labelFormatter={lbl => `Theta Point: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="info"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#infoCurveGradient)"
                />
                <ReferenceLine
                  x={scorecard.finalTheta}
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Your θ',
                    fill: '#22d3ee',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
