import React from 'react'
import { EdgeModelPreset } from '../../types/edgeAI'
import { Sparkles, Download, CheckCircle, Cpu, Cloud, Laptop, Flame } from 'lucide-react'

interface ModelSelectorCardProps {
  models: EdgeModelPreset[]
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  onDownloadModel: (modelId: string) => void
  downloadingModelId: string | null
  downloadProgress: number
}

export const ModelSelectorCard: React.FC<ModelSelectorCardProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onDownloadModel,
  downloadingModelId,
  downloadProgress,
}) => {
  const getProviderIcon = (modelId: string) => {
    if (modelId.includes('groq')) {
      return <Cloud className="w-4 h-4 text-emerald-400" />
    }
    if (modelId.includes('ollama')) {
      return <Laptop className="w-4 h-4 text-purple-400" />
    }
    return <Cpu className="w-4 h-4 text-cyan-400" />
  }

  const getBadges = (model: EdgeModelPreset) => {
    if (model.id.includes('groq')) {
      return (
        <>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> 100% Free Cloud
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            500+ tok/s
          </span>
        </>
      )
    }
    if (model.id.includes('ollama')) {
      return (
        <>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Local & Private
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            No API Key
          </span>
        </>
      )
    }
    return (
      <>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          In-Browser WebGPU
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          100% Offline
        </span>
      </>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" /> Free & Powerful AI Model Hub
        </h3>
        <span className="text-xs text-slate-400">Zero Server Cost • Free Tiers</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {models.map(model => {
          const isSelected = selectedModelId === model.id
          const isDownloading = downloadingModelId === model.id
          const isLocalBrowser = !model.id.includes('groq') && !model.id.includes('ollama')

          return (
            <div
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                      {getProviderIcon(model.id)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                        {model.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {model.sizeFormatted} • {model.quantization}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                  {model.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getBadges(model)}
                </div>

                {isLocalBrowser && !model.isDownloaded && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onDownloadModel(model.id)
                    }}
                    disabled={isDownloading}
                    className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Download className={`w-3 h-3 ${isDownloading ? 'animate-bounce' : ''}`} />
                    {isDownloading ? `${downloadProgress}%` : 'Load to GPU'}
                  </button>
                )}
              </div>

              {isDownloading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
