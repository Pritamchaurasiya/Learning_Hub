export { AIEngine, aiEngineInstance } from './AIEngine'
export type {
  AdaptivePathStep,
  AdaptiveLearningPath,
  DifficultyPrediction,
  SemanticHint,
  DropoutRiskAnalysis,
} from './AIEngine'

export const aiEngine = {
  name: 'AI Engine',
  version: '2.0.0',
  status: 'production' as const,
}
