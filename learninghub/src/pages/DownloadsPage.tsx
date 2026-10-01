import { useState, useEffect } from 'react'
import {
  Trash2,
  Play,
  Pause,
  HardDrive,
  CheckCircle,
  X,
  Download as DownloadIcon,
  Sparkles,
  FileText,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import AnimatedPage from '../components/AnimatedPage'
import { downloadService, type Download } from '../services/downloadService'
import { useStore } from '../stores/useStore'

const storageTotal = 32

const OFFLINE_REVISION_KITS = [
  {
    id: 'kit-dsa-matrix',
    title: 'DSA & Big-O Complexity Master Reference',
    type: 'document' as const,
    file_size: 4.2 * 1024 * 1024,
    description: 'Time & Space complexities for 25+ sorting, tree, graph, and DP patterns.',
  },
  {
    id: 'kit-math-formulas',
    title: 'Calculus, Vectors & Algebra Formula Handbook',
    type: 'document' as const,
    file_size: 6.8 * 1024 * 1024,
    description: 'High-yield calculus derivatives, integrals, and linear algebra transformations.',
  },
  {
    id: 'kit-system-design',
    title: 'System Design & Scalability Architecture Primer',
    type: 'document' as const,
    file_size: 8.5 * 1024 * 1024,
    description: 'Caching hierarchies, message brokers, load balancing, and consensus protocols.',
  },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  // eslint-disable-next-line security/detect-object-injection
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`
}

export default function DownloadsPage() {
  const [filter, setFilter] = useState<'all' | 'downloading' | 'completed'>('all')
  const [localKits, setLocalKits] = useState<Download[]>([])
  const [realStorage, setRealStorage] = useState<{ usedGB: number; quotaGB: number } | null>(null)
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then(estimate => {
          if (estimate.usage !== undefined && estimate.quota !== undefined) {
            setRealStorage({
              usedGB: estimate.usage / (1024 * 1024 * 1024),
              quotaGB: estimate.quota / (1024 * 1024 * 1024),
            })
          }
        })
        .catch(() => {})
    }
  }, [])

  const {
    data: downloads = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['downloads'],
    queryFn: async () => {
      const res = await downloadService.getDownloads()
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ['download-stats'],
    queryFn: async () => {
      const res = await downloadService.getStats()
      return res.data
    },
    staleTime: 60 * 1000,
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => downloadService.pauseDownload(id),
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: ['downloads'] })
      const previous = queryClient.getQueryData(['downloads'])
      queryClient.setQueryData(['downloads'], (old: typeof downloads) =>
        old.map(d => (d.id === id ? { ...d, status: 'paused' as const } : d))
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['downloads'], context.previous)
      }
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => downloadService.resumeDownload(id),
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: ['downloads'] })
      const previous = queryClient.getQueryData(['downloads'])
      queryClient.setQueryData(['downloads'], (old: typeof downloads) =>
        old.map(d => (d.id === id ? { ...d, status: 'downloading' as const } : d))
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['downloads'], context.previous)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => downloadService.deleteDownload(id),
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: ['downloads'] })
      const previous = queryClient.getQueryData(['downloads'])
      queryClient.setQueryData(['downloads'], (old: typeof downloads) =>
        old.filter(d => d.id !== id)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['downloads'], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['download-stats'] })
    },
  })

  const handleSaveOfflineKit = (kit: (typeof OFFLINE_REVISION_KITS)[number]) => {
    if (localKits.some(k => k.id === kit.id)) {
      addToast({ message: `${kit.title} is already saved for offline study.`, type: 'info' })
      return
    }

    const newDownload: Download = {
      id: kit.id,
      title: kit.title,
      type: kit.type,
      file_size: kit.file_size,
      progress_percent: 100,
      status: 'completed',
      is_expired: false,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }

    setLocalKits(prev => [newDownload, ...prev])
    addToast({
      message: `📥 Saved "${kit.title}" for offline revision!`,
      type: 'success',
      duration: 4000,
    })
  }

  const allDownloads = [...localKits, ...downloads]

  const filteredDownloads = allDownloads.filter(download => {
    if (filter === 'all') return true
    if (filter === 'downloading')
      return download.status === 'downloading' || download.status === 'paused'
    if (filter === 'completed') return download.status === 'completed'
    return true
  })

  const effectiveUsedGB = realStorage ? realStorage.usedGB : (stats?.total_size_mb ?? 0) / 1024
  const effectiveQuotaGB = realStorage ? realStorage.quotaGB : storageTotal
  const storagePercentage = Math.min(100, (effectiveUsedGB / Math.max(1, effectiveQuotaGB)) * 100)

  const typeIcons: Record<'video' | 'course' | 'document', React.ElementType> = {
    video: Play,
    course: DownloadIcon,
    document: HardDrive,
  }

  const typeColors: Record<'video' | 'course' | 'document', string> = {
    video: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    course: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    document: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  }

  return (
    <AnimatedPage className="space-y-6">
      <SEO
        title="Downloads - LearningHub"
        description="Manage your offline content and revision kits"
        keywords="downloads, offline, content, revision, notes"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Offline Learning & Downloads
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Access lecture notes, formula sheets, and cached learning materials offline
          </p>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <ErrorState
          title="Failed to load downloads"
          message={error?.message ?? 'Could not load downloads.'}
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Storage Info */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Storage Quota</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {effectiveUsedGB.toFixed(2)} GB used of {effectiveQuotaGB.toFixed(1)} GB available
                {realStorage && ' (Browser Cache & IndexedDB)'}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-primary-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.max(2, storagePercentage)}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {storagePercentage.toFixed(1)}% quota utilized
        </p>
      </Card>

      {/* High-Yield Offline Revision Kits */}
      <Card className="p-6 bg-gradient-to-br from-primary-500/5 via-indigo-500/5 to-purple-500/5 border-primary-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Instant Offline Revision Kits
            </h2>
          </div>
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-full border border-primary-500/20">
            Available Offline
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OFFLINE_REVISION_KITS.map(kit => {
            const isSaved = allDownloads.some(d => d.id === kit.id)
            return (
              <div
                key={kit.id}
                className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      PDF Reference
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1.5 leading-snug">
                    {kit.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                    {kit.description}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 mt-auto">
                  <span className="text-xs font-medium text-gray-400">
                    {formatBytes(kit.file_size)}
                  </span>
                  <Button
                    size="sm"
                    variant={isSaved ? 'outline' : 'primary'}
                    onClick={() => handleSaveOfflineKit(kit)}
                    disabled={isSaved}
                    className="text-xs rounded-xl"
                  >
                    {isSaved ? 'Saved Offline' : 'Save Offline'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({downloads.length})
          </button>
          <button
            onClick={() => setFilter('downloading')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'downloading'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Downloading (
            {downloads.filter(d => d.status === 'downloading' || d.status === 'paused').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Completed ({downloads.filter(d => d.status === 'completed').length})
          </button>
        </div>
      </Card>

      {/* Downloads List */}
      <div className="space-y-3">
        {filteredDownloads.map(download => {
          const Icon = typeIcons[download.type as 'video' | 'course' | 'document']
          const colorClass = typeColors[download.type as 'video' | 'course' | 'document']

          return (
            <Card key={download.id} className="p-4">
              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {download.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatBytes(download.file_size)}</span>
                        {download.status === 'downloading' && (
                          <span>• {download.progress_percent}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {download.status === 'downloading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pause className="w-4 h-4" />}
                          onClick={() => pauseMutation.mutate(download.id)}
                        />
                      )}
                      {download.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Play className="w-4 h-4" />}
                          onClick={() => resumeMutation.mutate(download.id)}
                        />
                      )}
                      {download.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resumeMutation.mutate(download.id)}
                        >
                          Retry
                        </Button>
                      )}
                      {(download.status === 'downloading' || download.status === 'paused') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<X className="w-4 h-4" />}
                          onClick={() => deleteMutation.mutate(download.id)}
                        />
                      )}
                      {download.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={() => deleteMutation.mutate(download.id)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {download.status !== 'completed' && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            download.status === 'failed' ? 'bg-red-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${download.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatBytes(
                            Math.round(download.file_size * (download.progress_percent / 100))
                          )}{' '}
                          / {formatBytes(download.file_size)}
                        </span>
                        <span
                          className={`font-medium ${
                            download.status === 'failed'
                              ? 'text-red-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {download.status === 'failed'
                            ? 'Failed'
                            : `${download.progress_percent}%`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Completed */}
                  {download.status === 'completed' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Downloaded</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* No Downloads */}
      {!isLoading && filteredDownloads.length === 0 && (
        <div className="text-center py-12">
          <DownloadIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No downloads</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'completed' ? 'No completed downloads yet' : 'No active downloads'}
          </p>
        </div>
      )}
    </AnimatedPage>
  )
}
