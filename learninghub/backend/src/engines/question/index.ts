export { QuestionEngine, questionEngineInstance } from './QuestionEngine'
export type {
  BloomsTaxonomyLevel,
  QuestionItem,
  DistractorGenerationResult,
  SimilarityCheckResult,
  TagRecommendationResult,
} from './QuestionEngine'

export const questionEngine = {
  name: 'Question Engine',
  version: '2.0.0',
  status: 'production' as const,
}
