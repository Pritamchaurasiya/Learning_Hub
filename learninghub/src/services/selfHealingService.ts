import api from '../utils/api'
import {
  CodeSnippetPresetId,
  CodeAnalysisPayload,
} from '../types/selfHealing'

export const selfHealingService = {
  /**
   * Fetch a vulnerable code snippet preset.
   */
  async getPreset(presetId: CodeSnippetPresetId = 'N_PLUS_ONE_QUERY_LOOP'): Promise<{
    presetId: CodeSnippetPresetId
    fileName: string
    code: string
  }> {
    const response = await api.get(`/api/v1/self-healing/presets/${presetId}`)
    return response.data?.data || response.data
  },

  /**
   * Submit source code for multi-vector AST analysis and automated patch synthesis.
   */
  async analyzeCode(params: {
    code: string
    fileName?: string
  }): Promise<CodeAnalysisPayload> {
    const response = await api.post('/api/v1/self-healing/analyze', params)
    return response.data?.data || response.data
  },
}
