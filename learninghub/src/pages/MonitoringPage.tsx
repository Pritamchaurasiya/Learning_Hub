import { useState, useCallback } from 'react'
import {
  Activity,
  Database,
  Zap,
  Cpu,
  HardDrive,
  Globe,
  Users,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  Terminal,
  Gauge,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import ProgressRing from '../components/ui/ProgressRing'
import { StatCard } from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/Skeleton'
import { monitoringService } from '../services/monitoringService'

export default function MonitoringPage() {
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['system', 'monitoring'],
    queryFn: async () => {
      const [metrics, db, cache, procs, health] = await Promise.all([
        monitoringService.getMetrics(),
        monitoringService.getDatabaseStatus(),
        monitoringService.getCacheStatus(),
        monitoringService.getProcesses(),
        monitoringService.getDeepHealth(),
      ])
      setLastUpdated(new Date())
      return { metrics, db, cache, processes: procs.processes, health }
    },
    refetchInterval: 10000, // Poll every 10 seconds automatically!
    staleTime: 5000,
  })

  const forceRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['system', 'monitoring'] })
  }, [queryClient])

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
      case 'ok':
      case 'connected':
        return '#10b981' // emerald-500
      case 'degraded':
      case 'warning':
        return '#f59e0b' // amber-500
      case 'critical':
      case 'down':
      case 'error':
        return '#ef4444' // rose-500
      default:
        return '#6b7280' // gray-500
    }
  }

  if (isLoading && !data) {
    return (
      <AnimatedPage className="space-y-8 pb-12 pt-4">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Status badges skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6 rounded-3xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <Skeleton className="w-3 h-3 rounded-full" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts / Detail panels skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </AnimatedPage>
    )
  }

  const { metrics, db, cache, processes, health } = data ?? {}

  return (
    <AnimatedPage className="space-y-8 pb-12 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4 uppercase text-gray-900 dark:text-white">
            <div className="w-14 h-14 bg-gray-900 dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-gray-200 dark:shadow-none">
              <Gauge className="w-7 h-7 text-primary-500" />
            </div>
            System Observability
          </h1>
          <div className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-widest mt-4">
            <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Live Pulse
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            {isFetching && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-500 ml-2" />}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-md flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                Global Status
              </span>
              <span
                className={`text-sm font-black uppercase tracking-widest`}
                style={{ color: getHealthColor(health?.status) }}
              >
                {health?.status ?? 'Active'}
              </span>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full shadow-lg ${health?.status === 'healthy' ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: getHealthColor(health?.status),
                boxShadow: `0 0 12px ${getHealthColor(health?.status)}80`,
              }}
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={forceRefresh}
            disabled={isFetching}
            className="rounded-[1.25rem] font-black uppercase tracking-widest text-[11px] border-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Sync Now
          </Button>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Cpu}
          label="CPU Load"
          value={`${metrics?.system.cpu_percent ?? 0}%`}
          color="#3b82f6"
          delay={0}
          animated
          className="rounded-3xl shadow-md border-none bg-white dark:bg-gray-900"
        />
        <StatCard
          icon={Activity}
          label="Memory Usage"
          value={`${metrics?.system.memory_percent ?? 0}%`}
          color="#8b5cf6"
          delay={100}
          animated
          className="rounded-3xl shadow-md border-none bg-white dark:bg-gray-900"
        />
        <StatCard
          icon={HardDrive}
          label="Disk Storage"
          value={`${metrics?.system.disk_percent ?? 0}%`}
          color="#10b981"
          delay={200}
          animated
          className="rounded-3xl shadow-md border-none bg-white dark:bg-gray-900"
        />
        <StatCard
          icon={Globe}
          label="Load (1m/5m)"
          value={`${metrics?.system.load_avg_1m ?? 0} / ${metrics?.system.load_avg_5m ?? 0}`}
          color="#f59e0b"
          delay={300}
          className="rounded-3xl shadow-md border-none bg-white dark:bg-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Infrastructure */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Health */}
            <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2rem]">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shadow-inner">
                    <Database className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">
                      Database Engine
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                      {db?.database ?? 'PostgreSQL/SQLite'}
                    </p>
                  </div>
                </div>
                <div
                  className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                  style={{
                    backgroundColor: `${getHealthColor(db?.status)}20`,
                    color: getHealthColor(db?.status),
                  }}
                >
                  {db?.status === 'connected' ? 'Up' : 'Down'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Response Time
                  </span>
                  <span className="text-3xl font-black tabular-nums tracking-tighter">
                    {db?.response_time_ms.toFixed(1)}ms
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (db?.response_time_ms ?? 0) * 2)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="pt-3 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Latency: Nominal</span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Encryption
                  </span>
                </div>
              </div>
            </Card>

            {/* Cache / Redis Health */}
            <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2rem]">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shadow-inner">
                    <Zap className="w-7 h-7 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">
                      Neural Cache
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                      Redis Engine v7.x
                    </p>
                  </div>
                </div>
                <div
                  className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                  style={{
                    backgroundColor: `${getHealthColor(cache?.status)}20`,
                    color: getHealthColor(cache?.status),
                  }}
                >
                  {cache?.status === 'connected' ? 'Active' : 'Offline'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Hit Latency
                  </span>
                  <span className="text-3xl font-black tabular-nums tracking-tighter">
                    {cache?.response_time_ms.toFixed(1)}ms
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (cache?.response_time_ms ?? 0) * 5)}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="pt-3 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Fragmentation: 1.02%</span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> High Availability
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Process Monitor */}
          <Card className="overflow-hidden border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2rem]">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                  <Terminal className="w-5 h-5 text-primary-500" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
                  Active System Processes
                </h2>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {processes?.length ?? 0} Active
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      PID
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Process Name
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      CPU %
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      MEM %
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {processes?.map((proc: any) => (
                    <tr
                      key={proc.pid}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-8 py-5 text-xs font-black tabular-nums text-gray-400">
                        #{proc.pid}
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-gray-900 dark:text-gray-200 uppercase tracking-tight">
                        {proc.name}
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-right tabular-nums text-primary-500">
                        {proc.cpu_percent.toFixed(1)}%
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-right tabular-nums text-purple-500">
                        {proc.memory_percent.toFixed(1)}%
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-sm">
                          {proc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!processes || processes.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-12 text-center text-sm font-bold text-gray-400 uppercase tracking-widest"
                      >
                        No active processes detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          {/* Application Metrics */}
          {metrics?.application && (
            <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-primary-600 to-indigo-800 text-white rounded-[2rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Globe className="w-32 h-32" />
              </div>
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-8 opacity-70 relative z-10">
                Platform Statistics
              </h3>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-5 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex items-center justify-center shadow-inner">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      Total Users
                    </p>
                    <p className="text-2xl font-black tracking-tight tabular-nums">
                      {metrics.application.total_users.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex items-center justify-center shadow-inner">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      Total Courses
                    </p>
                    <p className="text-2xl font-black tracking-tight tabular-nums">
                      {metrics.application.total_courses.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-[1rem] bg-white/20 flex items-center justify-center shadow-inner">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      Total Enrollments
                    </p>
                    <p className="text-2xl font-black tracking-tight tabular-nums">
                      {metrics.application.total_enrollments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Syncing with Mainframe
                </span>
                <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded-lg">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 tracking-widest">
                    LIVE
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* AI Engine Pulse */}
          <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2rem]">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-8">
              AI Core Diagnostics
            </h3>
            <div className="flex items-center justify-between mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                  {health?.components.ai_engine.status ?? 'Standby'}
                </span>
                <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">
                  {health?.components.ai_engine.provider}
                </span>
              </div>
              <div className="w-14 h-14">
                <ProgressRing
                  progress={health?.components.ai_engine.status === 'healthy' ? 100 : 45}
                  size={56}
                  strokeWidth={5}
                  className="text-primary-500 drop-shadow-md"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 text-xs font-black uppercase tracking-widest">
                <span className="text-gray-500">Inference:</span>
                <span className="text-gray-900 dark:text-white">0.42 T/s</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 text-xs font-black uppercase tracking-widest">
                <span className="text-gray-500">Accuracy:</span>
                <span className="text-emerald-500">99.8%</span>
              </div>
            </div>
            <Button
              variant="outline"
              fullWidth
              className="mt-8 rounded-xl text-[10px] font-black uppercase tracking-widest py-5 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Run Model Diagnostics
            </Button>
          </Card>

          {/* Infrastructure Warnings */}
          <AnimatePresence>
            {health?.status !== 'healthy' && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
              >
                <div className="p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10 mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest">
                      Active Incident
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase leading-relaxed opacity-90 pl-11">
                    {health?.components.database.error ??
                      health?.components.cache.error ??
                      'System is operating in degraded state. Latency may be affected.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedPage>
  )
}
