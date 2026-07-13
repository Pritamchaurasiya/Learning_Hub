export { AdminEngine, adminEngineInstance } from './AdminEngine'
export type {
  SystemDiagnosticsReport,
  AnomalyDetectionResult,
  RetentionCleanupReport,
} from './AdminEngine'

export const adminEngine = {
  name: 'Admin Engine',
  version: '2.0.0',
  status: 'production' as const,
}
