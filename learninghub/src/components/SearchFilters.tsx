import { memo } from 'react'
import { motion } from 'framer-motion'
import { X, Star, Clock, BarChart3, Layers, Tag } from 'lucide-react'
import { Button } from './ui/Button'

interface SearchFiltersProps {
  difficulty: string
  setDifficulty: (value: string) => void
  phase: string
  setPhase: (value: string) => void
  duration: string
  setDuration: (value: string) => void
  rating: string
  setRating: (value: string) => void
  hasCertificate: boolean
  setHasCertificate: (value: boolean) => void
  isFree: boolean
  setIsFree: (value: boolean) => void
  activeFiltersCount: number
  onClearFilters: () => void
  isOpen: boolean
  onClose: () => void
}

const difficultyOptions = [
  { value: 'all', label: 'All Levels', icon: BarChart3 },
  { value: 'beginner', label: 'Beginner', icon: BarChart3 },
  { value: 'intermediate', label: 'Intermediate', icon: BarChart3 },
  { value: 'advanced', label: 'Advanced', icon: BarChart3 },
  { value: 'expert', label: 'Expert', icon: BarChart3 },
]

const phaseOptions = [
  { value: 'all', label: 'All Phases', icon: Layers },
  { value: 'foundation', label: 'Foundation', icon: Layers },
  { value: 'beginner', label: 'Beginner', icon: Layers },
  { value: 'intermediate', label: 'Intermediate', icon: Layers },
  { value: 'advanced', label: 'Advanced', icon: Layers },
  { value: 'singularity', label: 'Singularity', icon: Layers },
]

const durationOptions = [
  { value: 'all', label: 'Any Duration', icon: Clock },
  { value: 'short', label: '< 5 hours', icon: Clock },
  { value: 'medium', label: '5-20 hours', icon: Clock },
  { value: 'long', label: '> 20 hours', icon: Clock },
]

const ratingOptions = [
  { value: 'all', label: 'Any Rating', icon: Star },
  { value: '4.5', label: '4.5+ Stars', icon: Star },
  { value: '4.0', label: '4.0+ Stars', icon: Star },
  { value: '3.5', label: '3.5+ Stars', icon: Star },
]

export const SearchFilters = memo(function SearchFilters({
  difficulty,
  setDifficulty,
  phase,
  setPhase,
  duration,
  setDuration,
  rating,
  setRating,
  hasCertificate,
  setHasCertificate,
  isFree,
  setIsFree,
  activeFiltersCount,
  onClearFilters,
  isOpen,
  onClose,
}: SearchFiltersProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary-500" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Difficulty Level
          </label>
          <div className="flex flex-wrap gap-2">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  difficulty === opt.value
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 ring-2 ring-primary-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phase */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Learning Phase
          </label>
          <div className="flex flex-wrap gap-2">
            {phaseOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPhase(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  phase === opt.value
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-2 ring-purple-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  duration === opt.value
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Minimum Rating
          </label>
          <div className="flex flex-wrap gap-2">
            {ratingOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRating(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  rating === opt.value
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Filters */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCertificate}
              onChange={e => setHasCertificate(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Includes Certificate</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFree}
              onChange={e => setIsFree(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Free Courses Only</span>
          </label>
        </div>
      </div>
    </motion.div>
  )
})

export default SearchFilters
