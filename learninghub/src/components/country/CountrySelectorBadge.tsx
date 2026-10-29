import React from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useCountry } from '../../hooks/useCountry'

interface CountrySelectorBadgeProps {
  className?: string
  showName?: boolean
  compact?: boolean
}

export const CountrySelectorBadge: React.FC<CountrySelectorBadgeProps> = ({
  className = '',
  showName = true,
  compact = false,
}) => {
  const { activeCountry, flagEmoji, openCountrySelector, isFeatureEnabled } = useCountry()

  if (!isFeatureEnabled) return null

  const displayName = activeCountry?.name || 'Global'
  const displayCode = activeCountry?.code || 'ALL'

  return (
    <button
      onClick={openCountrySelector}
      type="button"
      className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all hover:border-blue-400 dark:hover:border-blue-500 shadow-sm active:scale-95 ${className}`}
      title={`Current Region: ${displayName} (Click to change)`}
      aria-label={`Region: ${displayName}. Click to change country`}
    >
      <span className="text-base select-none leading-none" role="img" aria-label={displayName}>
        {flagEmoji || <Globe className="w-3.5 h-3.5 text-slate-400" />}
      </span>

      {!compact && (
        <span className="text-xs font-semibold tracking-wide text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
          {showName ? displayName : displayCode}
        </span>
      )}

      {compact && (
        <span className="text-[11px] font-bold font-mono tracking-wider text-slate-700 dark:text-slate-300">
          {displayCode}
        </span>
      )}

      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
    </button>
  )
}
