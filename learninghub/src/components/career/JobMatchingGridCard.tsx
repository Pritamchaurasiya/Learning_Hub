import React from 'react'
import { SimulatedJobListing } from '../../types/career'
import { Building2, MapPin, Sparkles, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'

interface JobMatchingGridCardProps {
  job: SimulatedJobListing
  isSelected: boolean
  onSelect: (job: SimulatedJobListing) => void
}

export const JobMatchingGridCard: React.FC<JobMatchingGridCardProps> = ({
  job,
  isSelected,
  onSelect,
}) => {
  const getAffinityColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (score >= 75) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  }

  return (
    <div
      onClick={() => onSelect(job)}
      className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
        isSelected
          ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
      }`}
    >
      {/* Top Banner: Company, Tier, and Affinity Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">{job.company}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700/60">
              {job.tier.replace(/_/g, ' ')}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
            {job.title}
          </h3>
        </div>

        <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${getAffinityColor(job.matchAffinityScore)}`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{job.matchAffinityScore}% Match</span>
        </div>
      </div>

      {/* Location, Work Type, Compensation */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span>{job.location}</span>
        </div>
        <span className="text-slate-600">•</span>
        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] font-medium">
          {job.workplaceType}
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-emerald-400 font-semibold font-mono">
          ${(job.baseSalaryMin / 1000).toFixed(0)}k - ${(job.baseSalaryMax / 1000).toFixed(0)}k Base + ${(job.equityAnnualUsd / 1000).toFixed(0)}k RSU
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
        {job.description}
      </p>

      {/* Matched vs Missing Skills */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1">Matched:</span>
          {job.matchedSkills.slice(0, 3).map(skill => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1"
            >
              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
              {skill}
            </span>
          ))}
          {job.matchedSkills.length > 3 && (
            <span className="text-[10px] text-slate-500">+{job.matchedSkills.length - 3}</span>
          )}
        </div>

        {job.missingSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 mr-1">Skill Gap:</span>
            {job.missingSkills.slice(0, 2).map(skill => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1"
              >
                <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Telemetry Verification Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Min Elo: {job.minimumElo}</span>
          {job.telemetryAlignment.eloRatingMatch ? (
            <span className="text-emerald-400 font-bold">✓ Qualified</span>
          ) : (
            <span className="text-amber-400 font-bold">In Training</span>
          )}
        </div>

        <button
          type="button"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
        >
          <span>{isSelected ? 'Active Simulation' : 'Engage Recruiter'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
