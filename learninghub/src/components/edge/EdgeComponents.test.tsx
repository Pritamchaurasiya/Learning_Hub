import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EdgeHardwareDiagnosticCard } from './EdgeHardwareDiagnosticCard'
import { EdgeModelSelectorPanel } from './EdgeModelSelectorPanel'
import { EdgeTelemetryBanner } from './EdgeTelemetryBanner'
import { GpuDeviceInfo, EdgeHardwareBenchmark, EdgeModelPreset } from '../../types/edgeAI'

describe('Edge AI Components (Milestone 13)', () => {
  const mockGpuInfo: GpuDeviceInfo = {
    isSupported: true,
    adapterName: 'NVIDIA GeForce RTX 4080',
    vendor: 'NVIDIA',
    tier: 'TIER_1_WEBGPU_FULL',
    vramEstimateMB: 16384,
    maxBufferSizeMB: 2048,
    f16Supported: true,
    driverInfo: 'DirectX 12 HAL',
  }

  const mockBenchmark: EdgeHardwareBenchmark = {
    timestamp: new Date().toISOString(),
    adapterName: 'NVIDIA GeForce RTX 4080',
    tier: 'TIER_1_WEBGPU_FULL',
    tokensPerSec: 72.4,
    ttftMs: 24,
    modelTested: 'Qwen2.5 Coder 0.5B (q4f16)',
    memoryFootprintMB: 4096,
    grade: 'EXCELLENT',
  }

  const mockPresets: EdgeModelPreset[] = [
    {
      id: 'smollm2-135m',
      name: 'SmolLM2 135M Instruct',
      family: 'SmolLM',
      sizeFormatted: '92 MB',
      vramRequiredMB: 280,
      quantization: 'q4f16',
      description: 'Ultra-lightweight micro-model.',
      contextWindowTokens: 2048,
      recommendedFor: 'ULTRA_FAST',
      isDownloaded: true,
      downloadProgressPercent: 100,
    },
    {
      id: 'qwen2.5-coder-0.5b',
      name: 'Qwen2.5 Coder 0.5B',
      family: 'Qwen',
      sizeFormatted: '380 MB',
      vramRequiredMB: 768,
      quantization: 'q4f16',
      description: 'Code-specialized transformer.',
      contextWindowTokens: 8192,
      recommendedFor: 'CODE_DSA',
      isDownloaded: false,
      downloadProgressPercent: 0,
    },
  ]

  it('renders EdgeHardwareDiagnosticCard with GPU specs and triggers benchmark', async () => {
    const onRunBenchmark = vi.fn().mockResolvedValue(mockBenchmark)

    render(
      <EdgeHardwareDiagnosticCard
        deviceInfo={mockGpuInfo}
        onRunBenchmark={onRunBenchmark}
        lastBenchmark={null}
      />
    )

    expect(screen.getByText('Hardware WebGPU Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('NVIDIA GeForce RTX 4080')).toBeInTheDocument()
    expect(screen.getByText(/Tier 1 Dedicated WebGPU/)).toBeInTheDocument()
    expect(screen.getByText(/Supported \(shader-f16\)/)).toBeInTheDocument()

    const benchButton = screen.getByRole('button', { name: /Run Micro-Benchmark/i })
    fireEvent.click(benchButton)

    await waitFor(() => {
      expect(onRunBenchmark).toHaveBeenCalled()
      expect(screen.getByText('72.4 tok/s')).toBeInTheDocument()
      expect(screen.getByText('Grade: EXCELLENT')).toBeInTheDocument()
    })
  })

  it('renders EdgeModelSelectorPanel and handles download/select triggers', () => {
    const onSelect = vi.fn()
    const onDownload = vi.fn()
    const onDelete = vi.fn()

    render(
      <EdgeModelSelectorPanel
        models={mockPresets}
        activeModelId="smollm2-135m"
        onSelectModel={onSelect}
        onDownloadModel={onDownload}
        onDeleteModel={onDelete}
        isDownloadingId={null}
        downloadProgress={0}
      />
    )

    expect(screen.getByText('Quantized Edge Models Library')).toBeInTheDocument()
    expect(screen.getByText('SmolLM2 135M Instruct')).toBeInTheDocument()
    expect(screen.getByText('Qwen2.5 Coder 0.5B')).toBeInTheDocument()

    const downloadBtn = screen.getByText(/Download Weights \(380 MB\)/)
    fireEvent.click(downloadBtn)
    expect(onDownload).toHaveBeenCalledWith('qwen2.5-coder-0.5b')
  })

  it('renders EdgeTelemetryBanner with live metrics and air-gapped badge', () => {
    render(
      <EdgeTelemetryBanner
        metrics={{
          ttftMs: 32,
          tokensPerSec: 54.2,
          totalTokensGenerated: 128,
          elapsedMs: 2360,
          peakMemoryMB: 480,
          engineMode: 'WEBGPU_SHADERS',
          modelId: 'qwen2.5-coder-0.5b',
        }}
        isStreaming={false}
        isAirGappedActive={true}
      />
    )

    expect(screen.getByText('32ms')).toBeInTheDocument()
    expect(screen.getByText('54.2 tok/s')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('480 MB')).toBeInTheDocument()
    expect(screen.getByText(/Air-Gapped \(0 Bytes Sent\)/)).toBeInTheDocument()
  })
})
