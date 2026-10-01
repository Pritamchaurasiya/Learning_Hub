import React from 'react'
import { ShieldCheck, Award } from 'lucide-react'

interface Props {
  issuerDid?: string
  isValid?: boolean
  achievementType?: string
  onClick?: () => void
}

export const W3CCredentialBadge: React.FC<Props> = ({
  issuerDid = 'did:polygon:0x71C6...9B7',
  isValid = true,
  achievementType = 'Academic Mastery',
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-xs ${
        isValid
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:bg-rose-500/20'
      }`}
      title={`Verified by ${issuerDid}`}
    >
      {isValid ? (
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Award className="w-3.5 h-3.5 text-rose-500" />
      )}
      <span>W3C DID Verified</span>
      <span className="opacity-60 text-[10px] font-mono">({achievementType})</span>
    </button>
  )
}
