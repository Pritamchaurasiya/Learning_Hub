import api from '../utils/api'
import {
  ArchitecturePresetId,
  ArchitectureTopology,
  ChaosFaultType,
  SimulationTelemetryResult,
} from '../types/systemDesign'

export const systemDesignService = {
  /**
   * Fetch an architecture preset topology.
   */
  async getPreset(presetId: ArchitecturePresetId = 'URL_SHORTENER_TINYURL'): Promise<{
    presetId: ArchitecturePresetId
    topology: ArchitectureTopology
    spofNodeIds: string[]
  }> {
    const response = await api.get(`/api/v1/system-design/presets/${presetId}`)
    return response.data?.data || response.data
  },

  /**
   * Run discrete-event simulation with target QPS and chaos fault injection.
   */
  async simulateArchitecture(params: {
    topology: ArchitectureTopology
    targetQps: number
    activeFault?: ChaosFaultType
  }): Promise<SimulationTelemetryResult> {
    const response = await api.post('/api/v1/system-design/simulate', params)
    return response.data?.data || response.data
  },
}
