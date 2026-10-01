import React from 'react'
import { Search, X, CheckCircle2, AlertCircle } from 'lucide-react'

export interface UpdateFilterBarProps {
  search?: string
  searchQuery?: string
  onSearchChange: (value: string) => void
  selectedCategory?: string
  onCategorySelect?: (category: string) => void
  onSelectCategory?: (category: any) => void
  selectedImportance?: string
  onImportanceSelect?: (importance: string) => void
  onSelectImportance?: (importance: any) => void
  officialOnly?: boolean
  onOfficialOnlyToggle?: (enabled: boolean) => void
  onlyDeadlines?: boolean
  onToggleOnlyDeadlines?: (enabled: boolean) => void
  selectedInstitution?: string
  onSelectInstitution?: (institution: string) => void
  onResetFilters?: () => void
  hasActiveFilters?: boolean
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: '', label: 'All Categories' },
  { id: 'EXAMINATION', label: 'Examinations' },
  { id: 'ACADEMIC', label: 'Academic & Notices' },
  { id: 'ADMISSION', label: 'Admissions' },
  { id: 'SCHOLARSHIP', label: 'Scholarships' },
  { id: 'CAREER', label: 'Career & Internships' },
  { id: 'COMPETITIVE_EXAMS', label: 'Competitive Exams' },
]

export const UpdateFilterBar: React.FC<UpdateFilterBarProps> = ({
  search,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  onSelectCategory,
  selectedImportance,
  onImportanceSelect,
  onSelectImportance,
  officialOnly = false,
  onOfficialOnlyToggle,
  onResetFilters,
  hasActiveFilters = false,
}) => {
  const currentSearch = search ?? searchQuery ?? ''
  const currentCategory = selectedCategory ?? ''
  const currentImportance = selectedImportance ?? ''

  const handleCategoryClick = (catId: string) => {
    onCategorySelect?.(catId)
    onSelectCategory?.(catId)
  }

  const handleImportanceToggle = () => {
    const next = currentImportance === 'URGENT' ? '' : 'URGENT'
    onImportanceSelect?.(next)
    onSelectImportance?.(next)
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={currentSearch}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search notices, circulars, exams (e.g. MGKVP, BCA, SSC CGL, admit card, result)..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {currentSearch && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Official Level 1/2 Only Toggle */}
          {onOfficialOnlyToggle && (
            <button
              type="button"
              onClick={() => onOfficialOnlyToggle(!officialOnly)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                officialOnly
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Official Only</span>
            </button>
          )}

          {/* Urgent Filter Toggle */}
          <button
            type="button"
            onClick={handleImportanceToggle}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              currentImportance === 'URGENT'
                ? 'border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>Urgent</span>
          </button>

          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              title="Reset all filters"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isSelected = currentCategory === cat.id || (cat.id === '' && (currentCategory === '' || currentCategory === 'ALL'))
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default UpdateFilterBar
