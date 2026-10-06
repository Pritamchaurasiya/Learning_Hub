import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AudioVisualizerWaveProps {
  isActive: boolean
  barCount?: number
  accentColor?: string
  label?: string
}

export function AudioVisualizerWave({
  isActive,
  barCount = 18,
  accentColor = '#6366F1',
  label = 'Voice Channel Active',
}: AudioVisualizerWaveProps) {
  const [frequencies, setFrequencies] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 20)
  )

  useEffect(() => {
    if (!isActive) {
      setFrequencies(Array.from({ length: barCount }, () => 12))
      return
    }

    const interval = setInterval(() => {
      setFrequencies(
        Array.from({ length: barCount }, (_, i) => {
          // Dynamic simulated frequency curve (higher in middle, lower on edges)
          const centerBias = 1 - Math.abs(i - barCount / 2) / (barCount / 2)
          const randomFactor = Math.random() * 0.7 + 0.3
          return Math.round(Math.max(16, centerBias * randomFactor * 75))
        })
      )
    }, 120)

    return () => clearInterval(interval)
  }, [isActive, barCount])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs shadow-inner">
      <div className="flex items-center gap-1 h-6">
        {frequencies.map((height, idx) => (
          <motion.div
            key={idx}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.1, ease: 'easeInOut' }}
            style={{ backgroundColor: isActive ? accentColor : '#64748B' }}
            className="w-1 rounded-full min-h-[4px]"
          />
        ))}
      </div>
      <span className={`text-[11px] font-medium tracking-wide ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  )
}
