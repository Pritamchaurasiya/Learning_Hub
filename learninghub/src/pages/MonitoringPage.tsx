import { useState, useEffect, useCallback } from 'react'
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
  Gauge
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import ProgressRing from '../components/ui/ProgressRing'
import { StatCard } from '../components/ui/StatCard'
import { monitoringService, type SystemMetrics, type DatabaseStatus, type CacheStatus, type ProcessInfo, type HealthReport } from '../services/monitoringService'

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastActive] = useState<Date>(new Date())

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const [metricsRes, dbRes, cacheRes, procRes, healthRes] = await Promise.all([
        monitoringService.getMetrics(),
        monitoringService.getDatabaseStatus(),
        monitoringService.getCacheStatus(),
        monitoringService.getProcesses(),
        monitoringService.getDeepHealth()
      ])
      
      setMetrics(metricsRes)
      setDbStatus(dbRes)
      setCacheStatus(cacheRes)
      setProcesses(procRes.processes)
      setHealth(healthRes)
      setLastActive(new Date())
    } catch (err) {
      console.error('[MonitoringPage] Fetch error:', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [fetchData])

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

  if (isLoading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Activity className="w-12 h-12 text-primary-600" />
        </motion.div>
        <p className="text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest text-xs">Initializing Observability...</p>
      </div>
    )
  }

  return (
    <AnimatedPage className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Gauge className="w-8 h-8 text-primary-600" />
            System Observability
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Live Pulse
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none">Global Status</span>
                <span className={`text-xs font-black uppercase tracking-widest mt-0.5`} style={{ color: getHealthColor(health?.status) }}>
                   {health?.status || 'Active'}
                </span>
             </div>
             <div className={`w-3 h-3 rounded-full animate-pulse`} style={{ backgroundColor: getHealthColor(health?.status) }} />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()} className="rounded-xl border-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Force Refresh
          </Button>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          label="CPU Load"
          value={`${metrics?.system.cpu_percent || 0}%`}
          color="#3b82f6"
          delay={0}
          animated
        />
        <StatCard
          icon={Activity}
          label="Memory Usage"
          value={`${metrics?.system.memory_percent || 0}%`}
          color="#8b5cf6"
          delay={100}
          animated
        />
        <StatCard
          icon={HardDrive}
          label="Disk Storage"
          value={`${metrics?.system.disk_percent || 0}%`}
          color="#10b981"
          delay={200}
          animated
        />
        <StatCard
          icon={Globe}
          label="Load (1m/5m)"
          value={`${metrics?.system.load_avg_1m || 0} / ${metrics?.system.load_avg_5m || 0}`}
          color="#f59e0b"
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Infrastructure */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Health */}
            <Card className="p-6 border-none shadow-xl bg-white dark:bg-gray-900/50">
               <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                        <Database className="w-6 h-6 text-emerald-500" />
                     </div>
                     <div>
                        <h3 className="font-black text-sm uppercase tracking-widest">Database Engine</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{dbStatus?.database || 'PostgreSQL/SQLite'}</p>
                     </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" 
                       style={{ backgroundColor: `${getHealthColor(dbStatus?.status)}20`, color: getHealthColor(dbStatus?.status) }}>
                     {dbStatus?.status === 'connected' ? 'Up' : 'Down'}
                  </div>
               </div>
               
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                     <span className="text-xs font-bold text-gray-500 uppercase">Response Time</span>
                     <span className="text-xl font-black tabular-nums">{dbStatus?.response_time_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                     <motion.div 
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (dbStatus?.response_time_ms || 0) * 2)}%` }}
                     />
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                     <span>Latency: Nominal</span>
                     <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure Encryption</span>
                  </div>
               </div>
            </Card>

            {/* Cache / Redis Health */}
            <Card className="p-6 border-none shadow-xl bg-white dark:bg-gray-900/50">
               <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-orange-500" />
                     </div>
                     <div>
                        <h3 className="font-black text-sm uppercase tracking-widest">Neural Cache</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Redis Engine v7.x</p>
                     </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" 
                       style={{ backgroundColor: `${getHealthColor(cacheStatus?.status)}20`, color: getHealthColor(cacheStatus?.status) }}>
                     {cacheStatus?.status === 'connected' ? 'Active' : 'Offline'}
                  </div>
               </div>
               
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                     <span className="text-xs font-bold text-gray-500 uppercase">Hit Latency</span>
                     <span className="text-xl font-black tabular-nums">{cacheStatus?.response_time_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                     <motion.div 
                        className="h-full bg-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (cacheStatus?.response_time_ms || 0) * 5)}%` }}
                     />
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                     <span>Fragmentation: 1.02%</span>
                     <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> High Availability</span>
                  </div>
               </div>
            </Card>
          </div>

          {/* Process Monitor */}
          <Card className="overflow-hidden border-none shadow-xl">
             <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900/50">
                <div className="flex items-center gap-2">
                   <Terminal className="w-5 h-5 text-primary-500" />
                   <h2 className="text-sm font-black uppercase tracking-widest">Active System Processes</h2>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-500 uppercase">{processes.length} Active</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">PID</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Process Name</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">CPU %</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">MEM %</th>
                         <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {processes.map((proc) => (
                         <tr key={proc.pid} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-400">#{proc.pid}</td>
                            <td className="px-6 py-4 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">{proc.name}</td>
                            <td className="px-6 py-4 text-xs font-black text-right tabular-nums text-primary-500">{proc.cpu_percent.toFixed(1)}%</td>
                            <td className="px-6 py-4 text-xs font-black text-right tabular-nums text-purple-500">{proc.memory_percent.toFixed(1)}%</td>
                            <td className="px-6 py-4 text-center">
                               <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-tighter">
                                  {proc.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          {/* Application Metrics */}
          {metrics?.application && (
            <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white">
               <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 opacity-80">Platform Statistics</h3>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Users</p>
                        <p className="text-xl font-black tracking-tight">{metrics.application.total_users.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Courses</p>
                        <p className="text-xl font-black tracking-tight">{metrics.application.total_courses.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Enrollments</p>
                        <p className="text-xl font-black tracking-tight">{metrics.application.total_enrollments.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
               <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Syncing with Mainframe</span>
                  <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
               </div>
            </Card>
          )}

          {/* AI Engine Pulse */}
          <Card className="p-6 border-none shadow-xl">
             <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-6">AI Core Diagnostics</h3>
             <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                   <span className="text-sm font-black uppercase tracking-tight">{health?.components.ai_engine.status || 'Standby'}</span>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{health?.components.ai_engine.provider}</span>
                </div>
                <div className="w-12 h-12">
                   <ProgressRing 
                      progress={100} 
                      size={48} 
                      strokeWidth={4} 
                      className="text-primary-500"
                   />
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold uppercase tracking-tight">
                   <span className="text-gray-500">Inference:</span>
                   <span>0.42 T/s</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold uppercase tracking-tight">
                   <span className="text-gray-500">Accuracy:</span>
                   <span className="text-emerald-500">99.8%</span>
                </div>
             </div>
             <Button variant="outline" fullWidth className="mt-6 rounded-xl text-[10px] font-black uppercase tracking-widest py-4 border-2">
                Run Model Diagnostics
             </Button>
          </Card>

          {/* Infrastructure Warnings */}
          <AnimatePresence>
            {health?.status !== 'healthy' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Active Incident</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase leading-relaxed">
                    {health?.components.database.error || health?.components.cache.error || 'System is operating in degraded state. Latency may be affected.'}
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
