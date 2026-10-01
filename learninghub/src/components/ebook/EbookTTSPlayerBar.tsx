import { Play, Pause, Square, FastForward, Rewind, CloudRain, Volume2 } from 'lucide-react'

interface Props {
  isPlaying: boolean
  isPaused: boolean
  currentSentence: number
  totalSentences: number
  rate: number
  ambientNoise: 'off' | 'rain' | 'whitenoise'
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onJump: (delta: number) => void
  onChangeRate: (rate: number) => void
  onChangeAmbient: (noise: 'off' | 'rain' | 'whitenoise') => void
}

export function EbookTTSPlayerBar({
  isPlaying,
  isPaused,
  currentSentence,
  totalSentences,
  rate,
  ambientNoise,
  onPlay,
  onPause,
  onStop,
  onJump,
  onChangeRate,
  onChangeAmbient,
}: Props) {
  const percent = totalSentences > 0 ? Math.round((currentSentence / totalSentences) * 100) : 0

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 text-white backdrop-blur-xl border border-slate-800 rounded-3xl p-3 px-5 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 max-w-xl w-full mx-auto">
      {/* Play/Pause & Jumps */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onJump(-3)}
          className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
          title="Back 3 sentences"
        >
          <Rewind className="w-4 h-4" />
        </button>

        <button
          onClick={isPlaying && !isPaused ? onPause : onPlay}
          className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
        >
          {isPlaying && !isPaused ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => onJump(3)}
          className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
          title="Forward 3 sentences"
        >
          <FastForward className="w-4 h-4" />
        </button>

        <button
          onClick={onStop}
          className="p-2 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
          title="Stop reading"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1 text-indigo-400">
            <Volume2 className="w-3 h-3" />
            AI Audio Narration
          </span>
          <span>
            {currentSentence + 1} / {totalSentences} ({percent}%)
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Speed & Ambient Controls */}
      <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
        {/* Speed */}
        <button
          onClick={() => {
            const speeds = [1.0, 1.25, 1.5, 2.0]
            const nextIdx = (speeds.indexOf(rate) + 1) % speeds.length
            onChangeRate(speeds[nextIdx])
          }}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-black text-indigo-300"
          title="Reading speed"
        >
          {rate}x
        </button>

        {/* Ambient Study Noise */}
        <button
          onClick={() => {
            const next =
              ambientNoise === 'off' ? 'rain' : ambientNoise === 'rain' ? 'whitenoise' : 'off'
            onChangeAmbient(next)
          }}
          className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-[11px] font-bold ${
            ambientNoise !== 'off'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title={`Ambient Noise: ${ambientNoise}`}
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline capitalize">{ambientNoise}</span>
        </button>
      </div>
    </div>
  )
}
