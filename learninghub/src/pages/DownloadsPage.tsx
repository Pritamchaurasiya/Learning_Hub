import { useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  Play,
  Pause,
  HardDrive,
  CheckCircle,
  X,
  Download as DownloadIcon,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  downloadService,
  type Download as DownloadType,
  type DownloadStats,
} from '../services/downloadService'

const storageTotal = 32 // GB (could be fetched from user settings)

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  // eslint-disable-next-line security/detect-object-injection
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadType[]>([])
  const [stats, setStats] = useState<DownloadStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'downloading' | 'completed'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDownloads = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      setError(null)

      const [downloadsRes, statsRes] = await Promise.all([
        downloadService.getDownloads({ signal }),
        downloadService.getStats({ signal }),
      ])

      if (!signal?.aborted) {
        setDownloads(downloadsRes.data)
        setStats(statsRes.data)
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load downloads')
        if (import.meta.env.DEV) {
          console.error('[DownloadsPage] Error fetching downloads:', err)
        }
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchDownloads(controller.signal)
    return () => controller.abort()
  }, [fetchDownloads])

  const filteredDownloads = downloads.filter(download => {
    if (filter === 'all') return true
    if (filter === 'downloading')
      return download.status === 'downloading' || download.status === 'paused'
    if (filter === 'completed') return download.status === 'completed'
    return true
  })

  const pauseDownload = async (id: string) => {
    try {
      await downloadService.pauseDownload(id)
      setDownloads(prev => prev.map(d => (d.id === id ? { ...d, status: 'paused' } : d)))
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[DownloadsPage] Failed to pause download:', err)
      }
    }
  }

  const resumeDownload = async (id: string) => {
    try {
      await downloadService.resumeDownload(id)
      setDownloads(prev => prev.map(d => (d.id === id ? { ...d, status: 'downloading' } : d)))
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[DownloadsPage] Failed to resume download:', err)
      }
    }
  }

  const cancelDownload = async (id: string) => {
    try {
      await downloadService.deleteDownload(id)
      setDownloads(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[DownloadsPage] Failed to cancel download:', err)
      }
    }
  }

  const deleteDownload = async (id: string) => {
    try {
      await downloadService.deleteDownload(id)
      setDownloads(prev => prev.filter(d => d.id !== id))
      // Refresh stats
      const statsRes = await downloadService.getStats()
      setStats(statsRes.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[DownloadsPage] Failed to delete download:', err)
      }
    }
  }

  const retryDownload = (id: string) => {
    setDownloads(prev =>
      prev.map(d =>
        d.id === id ? { ...d, status: 'downloading' as const, progress_percent: 0 } : d
      )
    )
  }
  const storageUsedMB = stats?.total_size_mb ?? 0
  const storageUsedGB = storageUsedMB / 1024
  const storagePercentage = (storageUsedGB / storageTotal) * 100

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
    <>
      <SEO
        title="Downloads - LearningHub"
        description="Manage your offline content"
        keywords="downloads, offline, content"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Downloads</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your offline content</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => fetchDownloads()}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Storage Info */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Storage Used</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {storageUsedGB.toFixed(2)} GB of {storageTotal} GB
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage Storage
            </Button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {storagePercentage.toFixed(1)}% used
          </p>
        </Card>

        {/* Filter */}
        <Card className="p-4">
          <div className="flex gap-2">
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
                            onClick={() => pauseDownload(download.id)}
                          />
                        )}
                        {download.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Play className="w-4 h-4" />}
                            onClick={() => resumeDownload(download.id)}
                          />
                        )}
                        {download.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryDownload(download.id)}
                          >
                            Retry
                          </Button>
                        )}
                        {(download.status === 'downloading' || download.status === 'paused') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<X className="w-4 h-4" />}
                            onClick={() => cancelDownload(download.id)}
                          />
                        )}
                        {download.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            onClick={() => deleteDownload(download.id)}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No downloads
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'completed' ? 'No completed downloads yet' : 'No active downloads'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
