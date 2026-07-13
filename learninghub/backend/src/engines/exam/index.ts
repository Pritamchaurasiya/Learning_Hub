export { ExamEngine, examEngineInstance } from './ExamEngine'
export type {
  ProctoredSessionConfig,
  IRTItemEvaluation,
  SecurityIncidentLog,
  ExamFinalReport,
} from './ExamEngine'

export const examEngine = {
  name: 'Exam Engine',
  version: '2.0.0',
  status: 'production' as const,
}
