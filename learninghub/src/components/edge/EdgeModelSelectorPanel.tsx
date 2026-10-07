import React, { useState } from 'react'
import { EdgeModelPreset } from '../../types/edgeAI'
import { HardDrive, Download, Check, Trash2 } from 'lucide-react'

interface EdgeModelSelectorPanelProps {
  models: EdgeModelPreset[]
  activeModelId: string
  onSelectModel: (modelId: string) => void
  onDownloadModel: (modelId: string) => Promise<void>
  onDeleteModel: (modelId: string) => void
  isDownloadingId: string | null
  downloadProgress: number
}

export const EdgeModelSelectorPanel: React.FC<EdgeModelSelectorPanelProps> = ({
  models,
  activeModelId,
  onSelectModel,
  onDownloadModel,
  onDeleteModel,
  isDownloadingId,
  downloadProgress,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL')

  const filterCategories: { label: string; value: string }[] = [
    { label: 'All Models', value: 'ALL' },
    { label: 'Ultra Fast (<100MB)', value: 'ULTRA_FAST' },
    { label: 'Code & DSA', value: 'CODE_DSA' },
    { label: 'General Tutor', value: 'GENERAL_TUTOR' },
    { label: 'Math & Proofs', value: 'MATH_SCIENCE' },
  ]

  const filteredModels = models.filter(m => {
    if (selectedFilter === 'ALL') return true
    return m.recommendedFor === selectedFilter
  })

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Quantized Edge Models Library
          </h3>
          <p className="text-xs text-slate-400">
            Stored directly in browser cache for zero-latency, offline execution
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {filterCategories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedFilter(cat.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedFilter === cat.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModels.map(model => {
          const isActive = model.id === activeModelId
          const isDownloadingThis = isDownloadingId === model.id

          return (
            <div
              key={model.id}
              className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-800/80 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      {model.name}
                      {isActive && (
                        <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {model.sizeFormatted} • {model.quantization.toUpperCase()} • VRAM ~{model.vramRequiredMB}MB
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {model.family}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">{model.description}</p>
              </div>

              <div>
                {isDownloadingThis && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] text-cyan-300 mb-1">
                      <span>Downloading weights...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  {model.isDownloaded ? (
                    <>
                      <button
                        onClick={() => onSelectModel(model.id)}
                        disabled={isActive}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                          isActive
                            ? 'bg-slate-800 text-cyan-400 cursor-default'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isActive ? 'In Use' : 'Select Model'}
                      </button>

                      <button
                        onClick={() => onDeleteModel(model.id)}
                        title="Purge model from browser cache"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onDownloadModel(model.id)}
                      disabled={Boolean(isDownloadingId)}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 transition disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Weights ({model.sizeFormatted})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
