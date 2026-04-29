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
    cache: { status: string; backend?: string; error?: string }
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

export const monitoringService = {
  getMetrics: (): Promise<SystemMetrics> => 
    fetchApi('/monitoring/api/metrics/'),
    
  getDatabaseStatus: (): Promise<DatabaseStatus> => 
    fetchApi('/monitoring/api/database/'),
    
  getCacheStatus: (): Promise<CacheStatus> => 
    fetchApi('/monitoring/api/cache/'),
    
  getProcesses: (): Promise<{ processes: ProcessInfo[] }> => 
    fetchApi('/monitoring/api/processes/'),
    
  getDeepHealth: (): Promise<HealthReport> => 
    fetchApi('/health/deep/'),
}
