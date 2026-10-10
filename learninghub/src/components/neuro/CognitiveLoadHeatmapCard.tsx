import { memo } from 'react'
import { Activity, Clock, Keyboard, Eye } from 'lucide-react'
import { KeystrokeTelemetry, OcularTelemetry } from '../../types/neuroAdaptive'

export interface CognitiveLoadHeatmapCardProps {
  activeDurationMinutes: number
  keystroke: KeystrokeTelemetry
  ocular?: OcularTelemetry
}

export const CognitiveLoadHeatmapCard = memo(function CognitiveLoadHeatmapCard({
  activeDurationMinutes,
  keystroke,
  ocular,
}: CognitiveLoadHeatmapCardProps) {
  return (
    <div
      role="region"
      aria-label="Cognitive Telemetry Matrix"
      className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          Biometric & Keystroke Telemetry
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Real-time Ingestion
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Session Focus</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {activeDurationMinutes}m
          </span>
          <span className="text-[10px] text-gray-400 block">Active Deep Work</span>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Keyboard className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Backspace Rate</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {keystroke.backspaceCountPerMinute}/m
          </span>
          <span className="text-[10px] text-gray-400 block">Correction Cadence</span>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Flight Latency</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {keystroke.flightTimeMeanMs}ms
          </span>
          <span className="text-[10px] text-gray-400 block">
            Var: {Math.round(keystroke.flightTimeVarianceMs2)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Blink Frequency</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {ocular ? `${ocular.blinkRatePerMinute}/m` : 'N/A (Webcam Off)'}
          </span>
          <span className="text-[10px] text-gray-400 block">
            {ocular ? `${ocular.averageFixationDurationMs}ms fix` : 'Heuristic Mode'}
          </span>
        </div>
      </div>
    </div>
  )
})
