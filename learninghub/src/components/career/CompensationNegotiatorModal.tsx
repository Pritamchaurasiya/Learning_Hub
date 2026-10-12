import React, { useState } from 'react'
import {
  CompensationPackage,
  SimulatedJobListing,
} from '../../types/career'
import { careerService } from '../../services/careerService'
import {
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sliders,
} from 'lucide-react'

interface CompensationNegotiatorModalProps {
  isOpen: boolean
  job: SimulatedJobListing
  currentOffer: CompensationPackage
  leverageScore: number
  onClose: () => void
  onOfferUpdated: (updatedOffer: CompensationPackage) => void
}

export const CompensationNegotiatorModal: React.FC<CompensationNegotiatorModalProps> = ({
  isOpen,
  job,
  currentOffer,
  leverageScore,
  onClose,
  onOfferUpdated,
}) => {
  const [baseSalary, setBaseSalary] = useState<number>(currentOffer.baseSalary || job.baseSalaryMin)
  const [equityValueUsd, setEquityValueUsd] = useState<number>(currentOffer.equityValueUsd || job.equityAnnualUsd)
  const [signingBonus, setSigningBonus] = useState<number>(currentOffer.signingBonus || job.signingBonusUsd)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [evaluationResult, setEvaluationResult] = useState<{
    verdict: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED'
    feedbackNote: string
    deltaUsd: number
  } | null>(null)

  if (!isOpen) return null

  const totalCompensation = baseSalary + equityValueUsd + signingBonus

  const handleProposeCounterOffer = async () => {
    setIsSubmitting(true)
    try {
      const result = await careerService.submitCounterOffer({
        jobId: job.id,
        leverageScore,
        counterOffer: {
          baseSalary,
          equityValueUsd,
          signingBonus,
        },
      })

      setEvaluationResult({
        verdict: result.verdict,
        feedbackNote: result.feedbackNote,
        deltaUsd: result.deltaUsd,
      })
      onOfferUpdated(result.revisedPackage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Offer Calibration
              </span>
              <span className="text-xs text-slate-400 font-mono">{job.company}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Compensation & Equity Negotiator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Calibrate compensation levers supported by your verifiable platform leverage score ({leverageScore}/100).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Compensation Overview Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Total Target Annual Package</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-0.5">
              ${(totalCompensation / 1000).toFixed(0)}k <span className="text-xs text-slate-400 font-sans font-normal">/ year</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
              Base: ${(baseSalary / 1000).toFixed(0)}k
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
              Equity: ${(equityValueUsd / 1000).toFixed(0)}k
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              Sign: ${(signingBonus / 1000).toFixed(0)}k
            </div>
          </div>
        </div>

        {/* Sliders: Base, Equity, Signing Bonus */}
        <div className="space-y-5">
          {/* Base Salary Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Base Salary (USD / Year)</span>
              <span className="font-mono text-emerald-400 font-bold">${baseSalary.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={job.baseSalaryMin}
              max={Math.round(job.baseSalaryMax * 1.15)}
              step={5000}
              value={baseSalary}
              onChange={e => setBaseSalary(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Band Min: ${(job.baseSalaryMin / 1000).toFixed(0)}k</span>
              <span>Band Max: ${(job.baseSalaryMax / 1000).toFixed(0)}k</span>
            </div>
          </div>

          {/* Annual Equity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Annual Equity RSU Value (USD / Year)</span>
              <span className="font-mono text-purple-400 font-bold">${equityValueUsd.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={Math.round(job.equityAnnualUsd * 0.7)}
              max={Math.round(job.equityAnnualUsd * 1.4)}
              step={5000}
              value={equityValueUsd}
              onChange={e => setEquityValueUsd(Number(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Standard Grant: ${(job.equityAnnualUsd / 1000).toFixed(0)}k</span>
              <span>Ceiling: ${(job.equityAnnualUsd * 1.4 / 1000).toFixed(0)}k</span>
            </div>
          </div>

          {/* Upfront Signing Bonus Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Upfront Signing Incentive (USD)</span>
              <span className="font-mono text-cyan-400 font-bold">${signingBonus.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={20000}
              max={Math.round(job.signingBonusUsd * 1.6)}
              step={5000}
              value={signingBonus}
              onChange={e => setSigningBonus(Number(e.target.value))}
              className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Standard: ${(job.signingBonusUsd / 1000).toFixed(0)}k</span>
              <span>Outlier Max: ${(job.signingBonusUsd * 1.6 / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>

        {/* Evaluation Verdict Result Alert if evaluated */}
        {evaluationResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              evaluationResult.verdict === 'ACCEPTED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : evaluationResult.verdict === 'PARTIALLY_ACCEPTED'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
              {evaluationResult.verdict === 'ACCEPTED' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-blue-400" />
              )}
              <span>Verdict: {evaluationResult.verdict.replace(/_/g, ' ')}</span>
            </div>
            <p className="leading-relaxed">{evaluationResult.feedbackNote}</p>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleProposeCounterOffer}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Simulating Committee Vote...</span>
              </>
            ) : (
              <>
                <span>Submit Counter-Offer</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
