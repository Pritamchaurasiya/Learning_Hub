import React, { useState, useEffect } from 'react'
import { ShieldCheck, Lock, Sparkles, Award, Layers, Cpu } from 'lucide-react'
import {
  ZkCircuitPreset,
  ZkAttestationProofPayload,
  VerifyProofResponse,
  SoulboundTokenMetadata,
} from '../types/zkp'
import { zkpService } from '../services/zkpService'
import { ZkProofGeneratorCard } from '../components/zkp/ZkProofGeneratorCard'
import { ZkProofVerificationHUD } from '../components/zkp/ZkProofVerificationHUD'
import { SoulboundTokenBadge } from '../components/zkp/SoulboundTokenBadge'

export const ZkAttestationPage: React.FC = () => {
  const [presets, setPresets] = useState<ZkCircuitPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<ZkCircuitPreset | null>(null)
  const [proof, setProof] = useState<ZkAttestationProofPayload | null>(null)
  const [verificationResult, setVerificationResult] = useState<VerifyProofResponse | null>(null)
  const [sbt, setSbt] = useState<SoulboundTokenMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<'prover' | 'verifier' | 'sbt' | 'circuits'>('prover')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [isMintingSbt, setIsMintingSbt] = useState<boolean>(false)
  const [isLoadingPresets, setIsLoadingPresets] = useState<boolean>(true)

  const defaultUserDid = 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7'

  useEffect(() => {
    let isMounted = true
    setIsLoadingPresets(true)

    zkpService
      .getCircuitPresets()
      .then(res => {
        if (isMounted) {
          setPresets(res)
          if (res.length > 0) setSelectedPreset(res[0])
          setIsLoadingPresets(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingPresets(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleGenerateProof = async (params: {
    circuitType: any
    thresholdValue: number
    actualScoreOrElo: number
  }) => {
    setIsGenerating(true)
    try {
      const generated = await zkpService.generateProof({
        userDid: defaultUserDid,
        circuitType: params.circuitType,
        thresholdValue: params.thresholdValue,
        actualScoreOrElo: params.actualScoreOrElo,
      })
      setProof(generated)
      setVerificationResult(null)
      setActiveTab('prover')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVerifyProof = async () => {
    if (!proof) return
    setIsVerifying(true)
    try {
      const result = await zkpService.verifyProof(proof)
      setVerificationResult(result)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleMintSbt = async () => {
    if (!proof) return
    setIsMintingSbt(true)
    try {
      const minted = await zkpService.mintSoulboundToken({
        userDid: defaultUserDid,
        zkProofId: proof.proofId,
        circuitType: proof.circuitType,
        thresholdValue: proof.publicInputs.thresholdValue,
      })
      setSbt(minted)
      setActiveTab('sbt')
    } finally {
      setIsMintingSbt(false)
    }
  }

  if (isLoadingPresets || !selectedPreset) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading Zero-Knowledge Circuits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 18
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Zero-Knowledge SNARK & SBT Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Zero-Knowledge Skill Attestation & Soulbound Tokens
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Prove threshold mastery, competitive Elo, and psychometric percentiles with BN128
            Groth16 zk-SNARKs. Mint non-transferable ERC-5192 Soulbound Tokens anchored to Polygon
            PoS without disclosing private scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate max-w-[150px]">{defaultUserDid}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('prover')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'prover'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ZK Prover Studio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('verifier')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'verifier'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Public Verifier</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sbt')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sbt'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Soulbound Token (ERC-5192)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('circuits')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'circuits'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Circuit Architecture & Math</span>
        </button>
      </div>

      {/* Main Tab Content Panels */}
      {activeTab === 'prover' && (
        <div className="space-y-6">
          <ZkProofGeneratorCard
            presets={presets}
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            onProofGenerated={setProof}
            isGenerating={isGenerating}
            onGenerateProof={handleGenerateProof}
          />

          <ZkProofVerificationHUD
            proof={proof}
            verificationResult={verificationResult}
            isVerifying={isVerifying}
            onVerify={handleVerifyProof}
            onMintSbt={handleMintSbt}
            isMintingSbt={isMintingSbt}
          />
        </div>
      )}

      {activeTab === 'verifier' && (
        <div className="space-y-6">
          <ZkProofVerificationHUD
            proof={proof}
            verificationResult={verificationResult}
            isVerifying={isVerifying}
            onVerify={handleVerifyProof}
            onMintSbt={handleMintSbt}
            isMintingSbt={isMintingSbt}
          />
        </div>
      )}

      {activeTab === 'sbt' && (
        <div className="space-y-6">
          {sbt ? (
            <SoulboundTokenBadge sbt={sbt} />
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No Soulbound Token Minted</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate a verified ZK proof in the Prover Studio and click &quot;Mint Soulbound
                SBT&quot; to anchor your non-transferable token to Polygon PoS.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'circuits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>Arithmetic Circuit Constraint Formulation</span>
            </h3>
            <p className="text-xs text-slate-400">
              Each circuit maps private student metrics into Rank-1 Constraint Systems (R1CS):
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
              <div>L(x) · R(x) = O(x)</div>
              <div>ActualScore - ThresholdValue = Delta</div>
              <div>Delta &ge; 0 (via 16-bit binary decomposition)</div>
              <div>H(ActualScore || Salt || UserDID) == CommitmentHash</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Elliptic Curve Bilinear Pairing Invariant</span>
            </h3>
            <p className="text-xs text-slate-400">
              Groth16 on the BN128 curve achieves O(1) constant-time verification:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
              <div>e(π_A, π_B) = e(α, β) · e(x · γ, δ) · e(π_C, δ)</div>
              <div>Proof Size: 128 bytes (2 G1 points, 1 G2 point)</div>
              <div>Verification Complexity: 3 bilinear pairings (&lt;3ms)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ZkAttestationPage
