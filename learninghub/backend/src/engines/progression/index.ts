export { ProgressionEngine, progressionEngineInstance } from './ProgressionEngine'
export type {
  XPCalculationResult,
  LevelEvaluationResult,
  StreakMaintenanceResult,
  UnlockedAchievement,
} from './ProgressionEngine'

export const progressionEngine = {
  name: 'Progression Engine',
  version: '2.0.0',
  status: 'production' as const,
}
