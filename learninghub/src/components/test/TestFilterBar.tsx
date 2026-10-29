import type { FC } from 'react'
import {
  Search,
  X,
  Target,
  Activity,
  Trophy,
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  DownloadCloud,
  GraduationCap,
} from 'lucide-react'

export interface TestFilterState {
  mode: string
  difficulty: string
  aiMode: string
  exam?: string
}

export interface TestFilterBarProps {
  selectedModePill: string
  onSelectModePill: (pillId: string, updates: { mode: string; aiMode: string }) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  filter: TestFilterState
  onFilterChange: (updates: Partial<TestFilterState>) => void
  offlineCount?: number
  availableExams?: string[]
}

const DEFAULT_EXAMS = [
  'JEE Main',
  'JEE Advanced',
  'NEET UG',
  'GATE CS',
  'UPSC Prelims',
  'SSC CGL',
  'Digital SAT',
]

export const TestFilterBar: FC<TestFilterBarProps> = ({
  selectedModePill,
  onSelectModePill,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  offlineCount = 0,
  availableExams = DEFAULT_EXAMS,
}) => {
  const modePills = [
    { id: 'all', label: 'All Modes', icon: Target, mode: '', ai: '' },
    {
      id: 'pyq',
      label: '🎯 Target Exam PYQs & Mocks',
      icon: GraduationCap,
      mode: 'pyq',
      ai: '',
    },
    {
      id: 'adaptive',
      label: 'Adaptive CAT (2PL/3PL)',
      icon: Activity,
      mode: 'adaptive',
      ai: '',
    },
    { id: 'contest', label: 'Contest Arena', icon: Trophy, mode: 'contest', ai: '' },
    {
      id: 'practice',
      label: 'Practice & Socratic',
      icon: Sparkles,
      mode: 'practice',
      ai: '',
    },
    { id: 'ai', label: 'AI Generative', icon: BrainCircuit, mode: '', ai: 'ai_required' },
    {
      id: 'non_ai',
      label: 'Native Bank (Zero Latency)',
      icon: ShieldCheck,
      mode: '',
      ai: 'no_ai',
    },
    {
      id: 'offline',
      label: `Offline Ready (${offlineCount})`,
      icon: DownloadCloud,
      mode: '',
      ai: '',
    },
  ]

  return (
    <div data-testid="test-filter-bar" className="w-full">
      {/* Modality Filter Selector */}
      <div
        role="tablist"
        aria-label="Filter by test modality"
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6"
      >
        {modePills.map(m => {
          const isSelected = selectedModePill === m.id
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={isSelected}
              data-testid={`mode-pill-${m.id}`}
              onClick={() => {
                onSelectModePill(m.id, { mode: m.mode, aiMode: m.ai })
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/50 font-bold'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search and Dropdowns Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            data-testid="test-search-input"
            placeholder="Search tests, exams, shifts or topics..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              data-testid="clear-search-btn"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Exam Filter */}
          <select
            data-testid="exam-filter-select"
            value={filter.exam || ''}
            onChange={e => onFilterChange({ exam: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm"
            aria-label="Filter by exam"
          >
            <option value="">All Exams</option>
            {availableExams.map(ex => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>

          {/* Mode Filter */}
          <select
            data-testid="mode-filter-select"
            value={filter.mode}
            onChange={e => onFilterChange({ mode: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm"
            aria-label="Filter by mode"
          >
            <option value="">All Modes</option>
            <option value="pyq">Official PYQ Shifts</option>
            <option value="practice">Practice</option>
            <option value="mock">Mock</option>
            <option value="timed_challenge">Timed Challenge</option>
            <option value="adaptive">Adaptive CAT</option>
            <option value="contest">Contest Arena</option>
          </select>

          {/* Difficulty Filter */}
          <select
            data-testid="difficulty-filter-select"
            value={filter.difficulty}
            onChange={e => onFilterChange({ difficulty: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm"
            aria-label="Filter by difficulty"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* AI Policy Filter */}
          <select
            data-testid="ai-mode-filter-select"
            value={filter.aiMode}
            onChange={e => onFilterChange({ aiMode: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm"
            aria-label="Filter by AI Policy"
          >
            <option value="">All Engines</option>
            <option value="no_ai">Native Question Bank (No AI)</option>
            <option value="ai_optional">AI Optional</option>
            <option value="hybrid">Hybrid</option>
            <option value="ai_required">AI Required</option>
          </select>
        </div>
      </div>
    </div>
  )
}
