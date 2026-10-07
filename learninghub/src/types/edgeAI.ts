export type WebGpuTier =
  | 'TIER_1_WEBGPU_FULL' // Dedicated GPU >= 4GB VRAM (e.g. RTX 3060+, Apple M1/M2/M3 Pro)
  | 'TIER_2_WEBGPU_LITE' // Integrated GPU 2-4GB VRAM (e.g. Intel Iris, AMD Radeon 680M, Mobile)
  | 'TIER_3_WASM_CPU_FALLBACK' // WebGPU not available, CPU-based quantized WASM fallback
  | 'UNSUPPORTED'

export type InferenceMode =
  | 'LOCAL_EDGE_WEBGPU' // 100% on-device private micro-inference (0ms latency, zero token cost)
  | 'CLOUD_API' // Server-side high-capacity model (Gemini Pro)
  | 'AUTO_ADAPTIVE' // Automatically selects local edge when offline or for quick answers

export interface GpuDeviceInfo {
  isSupported: boolean
  adapterName: string
  vendor: string
  architecture?: string
  tier: WebGpuTier
  vramEstimateMB: number
  maxBufferSizeMB: number
  f16Supported: boolean
  driverInfo?: string
}

export type EdgeModelCategory = 'GENERAL_TUTOR' | 'CODE_DSA' | 'MATH_SCIENCE' | 'ULTRA_FAST'

export interface EdgeModelPreset {
  id: string
  name: string
  family: 'Llama' | 'Qwen' | 'Phi' | 'SmolLM'
  sizeFormatted: string
  vramRequiredMB: number
  quantization: string // e.g. 'q4f16', 'q0f16'
  description: string
  contextWindowTokens: number
  recommendedFor: EdgeModelCategory
  isDownloaded: boolean
  downloadProgressPercent: number
  downloadedBytes?: number
  totalBytes?: number
}

export interface EdgeInferenceMetrics {
  ttftMs: number // Time to First Token (ms)
  tokensPerSec: number
  totalTokensGenerated: number
  elapsedMs: number
  peakMemoryMB: number
  engineMode: 'WEBGPU_SHADERS' | 'WASM_SIMD' | 'CLOUD_PROXY'
  modelId: string
}

export interface EdgeTutorStreamChunk {
  token: string
  accumulatedText: string
  done: boolean
  metrics?: EdgeInferenceMetrics
}

export type EdgeSystemRole = 'SOCRATIC_TUTOR' | 'CODE_REVIEWER' | 'MATH_SOLVER' | 'DSA_EXPERT'

export interface EdgeTutorPromptParams {
  prompt: string
  systemRole?: EdgeSystemRole
  modelId?: string
  temperature?: number
  maxTokens?: number
}

export interface EdgeChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metrics?: EdgeInferenceMetrics
  modelId?: string
  systemRole?: EdgeSystemRole
}

export interface EdgeChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: EdgeChatMessage[]
  activeModelId: string
  systemRole: EdgeSystemRole
}

export interface EdgeModelDownloadState {
  modelId: string
  status: 'idle' | 'downloading' | 'ready' | 'error'
  progressPercent: number
  downloadedBytes: number
  totalBytes: number
  errorMessage?: string
}

export interface EdgeHardwareBenchmark {
  timestamp: string
  adapterName: string
  tier: WebGpuTier
  tokensPerSec: number
  ttftMs: number
  modelTested: string
  memoryFootprintMB: number
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
}
