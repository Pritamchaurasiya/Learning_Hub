import { memo } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export interface OfflineStationBannerProps {
  isOnline: boolean
  offlineBundlesCount: number
  localPendingSyncCount: number
  isSyncingQueue: boolean
  onSync: () => void
}

export const OfflineStationBanner = memo(function OfflineStationBanner({
  isOnline,
  offlineBundlesCount,
  localPendingSyncCount,
  isSyncingQueue,
  onSync,
}: OfflineStationBannerProps) {
  if (localPendingSyncCount <= 0 && offlineBundlesCount <= 0 && isOnline) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Offline Assessment Station"
      className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <WifiOff className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Offline Assessment Station
            {offlineBundlesCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40 text-[10px]">
                {offlineBundlesCount} Bundles Cached
              </Badge>
            )}
          </h4>
          <p className="text-xs text-gray-600 dark:text-slate-300">
            {localPendingSyncCount > 0
              ? `${localPendingSyncCount} completed assessment submissions buffered locally, awaiting server reconciliation.`
              : 'Download assessments now to practice or test on the go with zero network latency.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {localPendingSyncCount > 0 && (
          <Button
            onClick={onSync}
            disabled={isSyncingQueue || !isOnline}
            size="sm"
            variant="primary"
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Sync Now ({localPendingSyncCount})</span>
          </Button>
        )}
      </div>
    </div>
  )
})
