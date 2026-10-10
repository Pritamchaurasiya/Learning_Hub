import React from 'react'
import {
  Lock,
  ExternalLink,
  Sparkles,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { SoulboundTokenMetadata } from '../../types/zkp'

interface SoulboundTokenBadgeProps {
  sbt: SoulboundTokenMetadata
}

export const SoulboundTokenBadge: React.FC<SoulboundTokenBadgeProps> = ({ sbt }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-6 shadow-2xl space-y-5">
      {/* Background Holographic Glow Effect */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 shadow-sm">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Soulbound (Non-Transferable)</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">{sbt.standard}</span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Anchored on {sbt.networkName}</span>
        </div>
      </div>

      {/* Central Visual Icon & Claim */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Zero-Knowledge Verified Attestation Token
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">{sbt.attestationClaim}</p>
          </div>
        </div>
      </div>

      {/* Token Identifiers & Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono relative z-10">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Token ID</span>
          <span className="text-purple-300 font-bold truncate block">{sbt.tokenId}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Chain ID & Network</span>
          <span className="text-slate-200 block">{sbt.chainId} ({sbt.networkName})</span>
        </div>
        <div className="sm:col-span-2 overflow-hidden">
          <span className="text-[10px] text-slate-500 block uppercase">Smart Contract Address</span>
          <span className="text-indigo-300 truncate block">{sbt.contractAddress}</span>
        </div>
        <div className="sm:col-span-2 overflow-hidden">
          <span className="text-[10px] text-slate-500 block uppercase">Owner Soulbound DID</span>
          <span className="text-emerald-400 truncate block">{sbt.ownerAddressOrDid}</span>
        </div>
      </div>

      {/* Footer Explorer Deep Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 relative z-10">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Proof Ref: {sbt.zkProofRef}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={sbt.polygonscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
          >
            <span>Polygonscan</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href={sbt.openseaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <span>OpenSea</span>
            <ExternalLink className="w-3 h-3 text-white/80" />
          </a>
        </div>
      </div>
    </div>
  )
}
