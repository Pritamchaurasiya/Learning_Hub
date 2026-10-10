import api from '../utils/api'
import {
  BenchmarkRequestParams,
  ProfilerResultPayload,
  AlgorithmPreset,
} from '../types/complexity'

export const complexityService = {
  /**
   * Submit an algorithm code snippet or preset for multi-scale empirical benchmarking.
   */
  async benchmarkAlgorithm(params: BenchmarkRequestParams): Promise<ProfilerResultPayload> {
    const response = await api.post('/api/v1/complexity/benchmark', params)
    return response.data?.data || response.data
  },

  /**
   * Fetch library of standard algorithm complexity presets.
   */
  async getPresets(): Promise<AlgorithmPreset[]> {
    const response = await api.get('/api/v1/complexity/presets')
    return response.data?.data || response.data
  },
}
