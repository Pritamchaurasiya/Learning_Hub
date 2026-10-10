import React from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Lock,
  Layers,
  Terminal,
  Sparkles,
} from 'lucide-react'
import { ZkAttestationProofPayload, VerifyProofResponse } from '../../types/zkp'

interface ZkProofVerificationHUDProps {
  proof: ZkAttestationProofPayload | null
  verificationResult: VerifyProofResponse | null
  isVerifying: boolean
  onVerify: () => void
  onMintSbt?: () => void
  isMintingSbt?: boolean
}

export const ZkProofVerificationHUD: React.FC<ZkProofVerificationHUDProps> = ({
  proof,
  verificationResult,
  isVerifying,
  onVerify,
  onMintSbt,
  isMintingSbt,
}) => {
  if (!proof) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <Lock className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-300">No ZK Proof Generated Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Configure circuit thresholds in the Prover Studio above and generate a Groth16 proof to inspect mathematical invariants and on-chain verification.
        </p>
      </div>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text)
  }

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Proof Active
            </span>
            <span className="text-xs text-slate-400 font-mono">{proof.proofId}</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">{proof.circuitName}</h3>
          <p className="text-xs text-slate-400">{proof.statement}</p>
        </div>

        <div className="flex items-center gap-2">
          {onMintSbt && (
            <button
              type="button"
              onClick={onMintSbt}
              disabled={isMintingSbt}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isMintingSbt ? 'Minting SBT...' : 'Mint Soulbound SBT'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-sm transition-all"
          >
            {isVerifying ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Verify Proof</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            verificationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">
                {verificationResult.isValid
                  ? 'Cryptographic Verification Passed (O(1) Pairing Check Valid)'
                  : 'Proof Verification Failed'}
              </div>
              <div className="text-[11px] text-slate-400">
                {verificationResult.failureReason ||
                  'The elliptic curve pairing equation e(A, B) = e(α, β) · e(γ, δ) holds.'}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-slate-200">
              {verificationResult.verificationTimeMs} ms
            </span>
            <div className="text-[10px] text-slate-500">Latency</div>
          </div>
        </div>
      )}

      {/* Public Inputs Matrix */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          Public Inputs Digest
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase">Public Threshold</span>
            <span className="text-emerald-400 font-bold">{proof.publicInputs.thresholdValue}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 overflow-hidden">
            <span className="text-[10px] text-slate-500 block uppercase">Issuer DID</span>
            <span className="text-slate-300 truncate block text-[11px]">{proof.publicInputs.issuerDid}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 overflow-hidden sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 block uppercase">Salted Poseidon Commitment Hash</span>
              <button
                type="button"
                onClick={() => copyToClipboard(proof.publicInputs.commitmentHash)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Copy hash"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <span className="text-purple-400 text-[11px] break-all block">{proof.publicInputs.commitmentHash}</span>
          </div>
        </div>
      </div>

      {/* Groth16 Curve Coordinates */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          BN128 Elliptic Curve Pairing Points
        </h4>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-2 text-slate-400 overflow-x-auto">
          <div>
            <span className="text-indigo-400 font-bold">π_A (G1):</span> [{proof.proof.piA[0].slice(0, 16)}..., {proof.proof.piA[1].slice(0, 16)}...]
          </div>
          <div>
            <span className="text-purple-400 font-bold">π_B (G2):</span> [[{proof.proof.piB[0][0].slice(0, 12)}..., {proof.proof.piB[0][1].slice(0, 12)}...], [...]]
          </div>
          <div>
            <span className="text-emerald-400 font-bold">π_C (G1):</span> [{proof.proof.piC[0].slice(0, 16)}..., {proof.proof.piC[1].slice(0, 16)}...]
          </div>
        </div>
      </div>

      {/* Proof Performance Telemetry Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
        <div>
          <span className="text-slate-500 block text-[10px]">Proving Time</span>
          <span className="text-slate-200">{proof.metadata.provingTimeMs} ms</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Verify Latency</span>
          <span className="text-slate-200">{proof.metadata.verificationTimeMs} ms</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">R1CS Constraints</span>
          <span className="text-slate-200">{proof.metadata.constraintCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Curve Protocol</span>
          <span className="text-slate-200 uppercase">{proof.proof.protocol}</span>
        </div>
      </div>
    </div>
  )
}
