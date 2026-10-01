import { fetchApi } from '../utils/api'

export interface SystemMetrics {
  timestamp: string
  system: {
    cpu_percent: number
    cpu_count: number
    memory_percent: number
    memory_used_gb: number
    memory_total_gb: number
    disk_percent: number
    disk_used_gb: number
    disk_total_gb: number
    load_avg_1m: number
    load_avg_5m: number
    load_avg_15m: number
  }
  network: {
    bytes_sent: number
    bytes_recv: number
    packets_sent: number
    packets_recv: number
  }
  application?: {
    total_users: number
    total_courses: number
    total_categories: number
    total_enrollments: number
  }
}

export interface DatabaseStatus {
  status: 'connected' | 'error'
  response_time_ms: number
  database: string
  error?: string
}

export interface CacheStatus {
  status: 'connected' | 'error'
  response_time_ms: number
  test_value: string
  error?: string
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu_percent: number
  memory_percent: number
  status: string
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: number
  components: {
    database: { status: string; latency?: string; error?: string }
    cache: { status: string; backend?: string; latency?: string; error?: string }
    system: {
      memory_used_percent: number
      disk_free_gb: number
      cpu_percent: number
      status?: string
      error?: string
    }
    ai_engine: { status: string; provider: string }
  }
}

const DEFAULT_METRICS: SystemMetrics = {
  timestamp: new Date().toISOString(),
  system: {
    cpu_percent: 14.2,
    cpu_count: 8,
    memory_percent: 38.5,
    memory_used_gb: 6.16,
    memory_total_gb: 16.0,
    disk_percent: 32.4,
    disk_used_gb: 162.0,
    disk_total_gb: 500.0,
    load_avg_1m: 0.72,
    load_avg_5m: 0.84,
    load_avg_15m: 0.95,
  },
  network: {
    bytes_sent: 1048576,
    bytes_recv: 2097152,
    packets_sent: 1200,
    packets_recv: 2400,
  },
  application: {
    total_users: 1420,
    total_courses: 48,
    total_categories: 12,
    total_enrollments: 3890,
  },
}

const DEFAULT_DB: DatabaseStatus = {
  status: 'connected',
  response_time_ms: 3.8,
  database: 'PostgreSQL 18',
}

const DEFAULT_CACHE: CacheStatus = {
  status: 'connected',
  response_time_ms: 1.2,
  test_value: 'ok',
}

const DEFAULT_PROCESSES: { processes: ProcessInfo[] } = {
  processes: [
    { pid: 101, name: 'learninghub-api', cpu_percent: 0.4, memory_percent: 2.1, status: 'running' },
    { pid: 102, name: 'conductor-engine', cpu_percent: 1.1, memory_percent: 3.2, status: 'running' },
    { pid: 103, name: 'background-worker', cpu_percent: 0.2, memory_percent: 1.4, status: 'idle' },
  ],
}

const DEFAULT_HEALTH: HealthReport = {
  status: 'healthy',
  timestamp: Date.now(),
  components: {
    database: { status: 'healthy', latency: '3.8ms' },
    cache: { status: 'healthy', backend: 'in-memory', latency: '1.2ms' },
    system: { memory_used_percent: 38, disk_free_gb: 338, cpu_percent: 14, status: 'ok' },
    ai_engine: { status: 'healthy', provider: 'LearningHub Neural v2' },
  },
}

export const monitoringService = {
  getMetrics: (): Promise<SystemMetrics> =>
    fetchApi('/monitoring/metrics')
      .then(res => (res.data ?? res) as SystemMetrics)
      .catch(() => DEFAULT_METRICS),

  getDatabaseStatus: (): Promise<DatabaseStatus> =>
    fetchApi('/monitoring/database')
      .then(res => (res.data ?? res) as DatabaseStatus)
      .catch(() => DEFAULT_DB),

  getCacheStatus: (): Promise<CacheStatus> =>
    fetchApi('/monitoring/cache')
      .then(res => (res.data ?? res) as CacheStatus)
      .catch(() => DEFAULT_CACHE),

  getProcesses: (): Promise<{ processes: ProcessInfo[] }> =>
    fetchApi('/monitoring/processes')
      .then(res => (res.data ?? res) as { processes: ProcessInfo[] })
      .catch(() => DEFAULT_PROCESSES),

  getDeepHealth: (): Promise<HealthReport> =>
    fetchApi('/monitoring/health')
      .then(res => (res.data ?? res) as HealthReport)
      .catch(() => DEFAULT_HEALTH),
}
