import React, { useState } from 'react'
import {
  ShieldCheck,
  Lock,
  Cpu,
  Sparkles,
  ArrowRight,
  EyeOff,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { ZkCircuitPreset, ZkAttestationProofPayload } from '../../types/zkp'

interface ZkProofGeneratorCardProps {
  presets: ZkCircuitPreset[]
  selectedPreset: ZkCircuitPreset
  onSelectPreset: (preset: ZkCircuitPreset) => void
  onProofGenerated: (proof: ZkAttestationProofPayload) => void
  isGenerating: boolean
  onGenerateProof: (params: {
    circuitType: any
    thresholdValue: number
    actualScoreOrElo: number
  }) => Promise<void>
}

export const ZkProofGeneratorCard: React.FC<ZkProofGeneratorCardProps> = ({
  presets,
  selectedPreset,
  onSelectPreset,
  isGenerating,
  onGenerateProof,
}) => {
  const [threshold, setThreshold] = useState<number>(selectedPreset.defaultThreshold)
  const [actualValue, setActualValue] = useState<number>(selectedPreset.defaultThreshold + 5)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePresetChange = (preset: ZkCircuitPreset) => {
    onSelectPreset(preset)
    setThreshold(preset.defaultThreshold)
    setActualValue(preset.defaultThreshold + 5)
    setErrorMsg(null)
  }

  const handleProve = async () => {
    if (actualValue < threshold) {
      setErrorMsg(`Cannot generate proof: actual value (${actualValue}) must satisfy threshold (${threshold}).`)
      return
    }
    setErrorMsg(null)
    try {
      await onGenerateProof({
        circuitType: selectedPreset.id,
        thresholdValue: threshold,
        actualScoreOrElo: actualValue,
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'Proof synthesis failed.')
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Lock className="w-3 h-3" /> ZK-SNARK Circuit
            </span>
            <span className="text-xs text-slate-400 font-mono">Groth16 on BN128</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">Zero-Knowledge Prover Studio</h2>
          <p className="text-xs text-slate-400">
            Generate mathematical proofs of your achievements without revealing underlying scores, match logs, or personal data.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Constraints: {selectedPreset.constraints.toLocaleString()}</span>
        </div>
      </div>

      {/* Preset Selector Chips */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Select Attestation Circuit
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {presets.map(preset => {
            const isSelected = preset.id === selectedPreset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/40'
                    : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                  <span>{preset.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  Default Threshold: {preset.defaultThreshold} {preset.metricLabel}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Parameters Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Public Threshold ({selectedPreset.metricLabel})
            </span>
            <span className="font-mono text-emerald-400">{threshold}</span>
          </label>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
          />
          <span className="text-[10px] text-slate-500">
            Verifier checks: Metric &ge; {threshold}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-purple-400" />
              Private Student Metric (Secret Witness)
            </span>
            <span className="font-mono text-purple-400">{actualValue}</span>
          </label>
          <input
            type="number"
            value={actualValue}
            onChange={e => setActualValue(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
          />
          <span className="text-[10px] text-slate-500">
            Never leaves your device. Only Poseidon commitment is broadcast.
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero Knowledge: Raw score will NOT be revealed</span>
        </div>

        <button
          type="button"
          onClick={handleProve}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-purple-600/20 transition-all"
        >
          {isGenerating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Groth16 Witness...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate ZK Proof</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
