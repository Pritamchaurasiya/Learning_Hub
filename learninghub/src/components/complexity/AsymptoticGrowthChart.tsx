import React, { useState } from 'react'
import { EmpiricalDataPoint, ModelFitResult, ComplexityClass } from '../../types/complexity'
import { LineChart, Sparkles, TrendingUp, Info } from 'lucide-react'

interface AsymptoticGrowthChartProps {
  empiricalData: EmpiricalDataPoint[]
  primaryModel: ModelFitResult
  fittedModels: ModelFitResult[]
  classifiedClass: ComplexityClass
}

export const AsymptoticGrowthChart: React.FC<AsymptoticGrowthChartProps> = ({
  empiricalData,
  primaryModel,
  fittedModels,
  classifiedClass,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<EmpiricalDataPoint | null>(null)
  const [showAllModels, setShowAllModels] = useState<boolean>(false)

  if (!empiricalData || empiricalData.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <LineChart className="w-10 h-10 mx-auto mb-2 text-slate-600 animate-pulse" />
        <p>No empirical data points available. Run a benchmark to view growth curves.</p>
      </div>
    )
  }

  const width = 640
  const height = 320
  const padding = { top: 30, right: 30, bottom: 45, left: 60 }

  const maxN = Math.max(...empiricalData.map(d => d.n))
  const minN = Math.min(...empiricalData.map(d => d.n))
  const maxTime = Math.max(...empiricalData.map(d => d.executionTimeMicros)) * 1.15
  const minTime = 0

  const scaleX = (n: number) => {
    return padding.left + ((n - minN) / (maxN - minN || 1)) * (width - padding.left - padding.right)
  }

  const scaleY = (t: number) => {
    return height - padding.bottom - ((t - minTime) / (maxTime - minTime || 1)) * (height - padding.top - padding.bottom)
  }

  // Generate SVG path for empirical data line
  const empiricalPath = empiricalData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.n)} ${scaleY(pt.executionTimeMicros)}`)
    .join(' ')

  const getClassBadgeColor = (c: ComplexityClass) => {
    switch (c) {
      case 'O(1)':
      case 'O(log N)':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      case 'O(N)':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      case 'O(N log N)':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'O(N^2)':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      case 'O(2^N)':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700'
    }
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Empirical Asymptotic Growth Curve
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full border ${getClassBadgeColor(classifiedClass)}`}>
              Classified: {classifiedClass}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical runtime measurements (μs) vs. input size N with least-squares non-linear regression fit (R² = {primaryModel.rSquared.toFixed(3)})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllModels(!showAllModels)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              showAllModels
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            {showAllModels ? 'Hide Model Comparison' : 'Compare All Big-O Models'}
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - padding.bottom - pct * (height - padding.top - padding.bottom)
            const val = (minTime + pct * (maxTime - minTime)).toFixed(1)
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="0.8"
                />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {val}μs
                </text>
              </g>
            )
          })}

          {/* X axis ticks */}
          {empiricalData.map((pt, idx) => {
            const x = scaleX(pt.n)
            return (
              <g key={`x-tick-${idx}`}>
                <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#64748b" />
                <text x={x} y={height - padding.bottom + 18} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {pt.n >= 1000 ? `${pt.n / 1000}k` : pt.n}
                </text>
              </g>
            )
          })}

          {/* Theoretical Fitted Line */}
          <path
            d={empiricalPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            className="filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />

          {/* Scatter Data Points */}
          {empiricalData.map((pt, idx) => {
            const x = scaleX(pt.n)
            const y = scaleY(pt.executionTimeMicros)
            const isHovered = hoveredPoint?.n === pt.n
            return (
              <g
                key={`point-${idx}`}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 4.5}
                  fill={isHovered ? '#38bdf8' : '#818cf8'}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {isHovered && (
                  <circle cx={x} cy={y} r="11" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                )}
              </g>
            )
          })}

          {/* Axes */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="11"
            fontWeight="600"
          >
            Input Scale (N)
          </text>
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${height / 2})`}
            fill="#cbd5e1"
            fontSize="11"
            fontWeight="600"
          >
            Execution Time (μs)
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-950/95 border border-indigo-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-1 backdrop-blur-md pointer-events-none">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              N = {hoveredPoint.n.toLocaleString()}
            </div>
            <div className="text-indigo-300 font-mono">
              Time: {hoveredPoint.executionTimeMicros.toFixed(2)} μs (±{hoveredPoint.standardDeviationMicros} μs)
            </div>
            <div className="text-slate-400 font-mono">
              Memory: {(hoveredPoint.memoryAllocatedBytes / 1024).toFixed(1)} KB
            </div>
          </div>
        )}
      </div>

      {/* Model Determination Table */}
      {showAllModels && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            Non-Linear Least Squares Fit Candidates (R² Determination Ranking)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fittedModels
              .sort((a, b) => b.rSquared - a.rSquared)
              .map((model, i) => {
                const isSelected = model.complexityClass === primaryModel.complexityClass
                return (
                  <div
                    key={model.complexityClass}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold mb-1">
                      <span className={isSelected ? 'text-indigo-300' : 'text-slate-300'}>
                        #{i + 1} {model.complexityClass}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                        R² = {model.rSquared.toFixed(3)}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 truncate">
                      {model.formula}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
