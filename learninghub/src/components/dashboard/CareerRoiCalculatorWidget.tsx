import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Briefcase, DollarSign, Award, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

interface RoleBenchmark {
  id: string
  title: string
  medianSalary: string
  salaryBoost: string
  readinessScore: number
  offerVelocity: string
  inDemandTopics: string[]
}

const BENCHMARKS: RoleBenchmark[] = [
  {
    id: 'swe-senior',
    title: 'Senior Full-Stack Engineer',
    medianSalary: '$148,000',
    salaryBoost: '+38% Uplift',
    readinessScore: 84,
    offerVelocity: '3.2x Faster Placement',
    inDemandTopics: ['System Design', 'React & Vite Architecture', 'Relational DBs'],
  },
  {
    id: 'staff-architect',
    title: 'Staff Systems Architect',
    medianSalary: '$195,000',
    salaryBoost: '+56% Uplift',
    readinessScore: 78,
    offerVelocity: '4.1x Faster Placement',
    inDemandTopics: ['Distributed Consensus', 'Event Streams', 'High Availability'],
  },
  {
    id: 'ai-engineer',
    title: 'AI & ML Systems Engineer',
    medianSalary: '$178,000',
    salaryBoost: '+46% Uplift',
    readinessScore: 82,
    offerVelocity: '3.8x Faster Placement',
    inDemandTopics: ['LLM Orchestration', 'Vector Indexing', 'Quantization'],
  },
  {
    id: 'lead-devops',
    title: 'Lead Cloud Infrastructure',
    medianSalary: '$162,000',
    salaryBoost: '+42% Uplift',
    readinessScore: 88,
    offerVelocity: '3.5x Faster Placement',
    inDemandTopics: ['Kubernetes Orch', 'Chaos Engineering', 'Terraform GitOps'],
  },
]

export function CareerRoiCalculatorWidget() {
  const navigate = useNavigate()
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)

  const activeRole = BENCHMARKS[selectedRoleIndex]

  return (
    <Card
      className="p-6 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 text-white border border-indigo-500/20 shadow-2xl"
      data-testid="career-roi-calculator-widget"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                Career ROI & Placement Value Calculator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live FAANG Index
              </span>
            </div>
            <p className="text-xs text-indigo-200/70">
              Measure your skill acquisition trajectory against verified industry compensation tiers
            </p>
          </div>
        </div>
      </div>

      {/* Role Pill Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none relative z-10">
        {BENCHMARKS.map((role, idx) => (
          <button
            key={role.id}
            onClick={() => setSelectedRoleIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              idx === selectedRoleIndex
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {role.title}
          </button>
        ))}
      </div>

      {/* 3 Metric Value Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
        {/* Median Salary */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Projected Median Comp
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {activeRole.medianSalary}
          </div>
          <span className="text-[11px] font-extrabold text-emerald-400 mt-1 inline-block">
            {activeRole.salaryBoost}
          </span>
        </div>

        {/* Readiness Index */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Interview Readiness
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {activeRole.readinessScore}%
          </div>
          <div className="mt-2">
            <ProgressBar progress={activeRole.readinessScore} className="h-1.5" />
          </div>
        </div>

        {/* Offer Velocity */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            Placement Velocity
          </div>
          <div className="text-base font-black text-white tracking-tight mt-1">
            {activeRole.offerVelocity}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Based on completed mock drills
          </span>
        </div>
      </div>

      {/* Target Skills in Demand */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-300">Competencies Evaluated:</span>
          {activeRole.inDemandTopics.map((topic, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 text-[11px] font-semibold"
            >
              {topic}
            </span>
          ))}
        </div>

        <button
          onClick={() => navigate('/tests-a')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <span>Accelerate Readiness</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  )
}
