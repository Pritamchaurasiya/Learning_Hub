import React, { useState } from 'react'
import { Activity, Target, Clock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface PacingRecalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  onRecalibrate: (accuracy: number, hours?: number) => Promise<void>
  currentWeeklyHours: number
  isLoading: boolean
}

export const PacingRecalibrationModal: React.FC<PacingRecalibrationModalProps> = ({
  isOpen,
  onClose,
  onRecalibrate,
  currentWeeklyHours,
  isLoading,
}) => {
  const [accuracy, setAccuracy] = useState(75)
  const [hours, setHours] = useState(currentWeeklyHours)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onRecalibrate(accuracy, hours)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dynamic Pacing & Syllabus Recalibration"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-900 dark:text-amber-300">
            Feed your recent mock test accuracy into the Bayesian Pacing Engine. If your accuracy is high (&gt;85%), review timelines will be accelerated; if lower (&lt;60%), consolidation drills will be scheduled into buffer weeks.
          </p>
        </div>

        {/* 1. Recent Test Accuracy */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              Recent Practice / Mock Test Accuracy
            </label>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              {accuracy}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={1}
            value={accuracy}
            onChange={e => setAccuracy(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>&lt;60% (Reinforce Buffer)</span>
            <span>75% (Target Velocity)</span>
            <span>&gt;85% (Accelerate Pacing)</span>
          </div>
        </div>

        {/* 2. Actual Hours Studied */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Actual Hours Studied Per Week
            </label>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {hours} hrs / week
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-bold"
          >
            {isLoading ? 'Recalibrating...' : 'Recalibrate Pacing Engine'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
