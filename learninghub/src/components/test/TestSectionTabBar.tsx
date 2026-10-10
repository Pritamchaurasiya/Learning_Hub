import type { FC } from 'react'
import { Layers, Clock, Lock } from 'lucide-react'
import type { TestSection } from '../../services/testsAService'

export interface TestSectionTabBarProps {
  sections: TestSection[]
  questions: Array<{
    id: string
    section_id?: string | null
    sectionId?: string | null
    [key: string]: any
  }>
  answers: Record<string, string | string[] | number | undefined>
  activeSectionId?: string | null
  lockedSectionIds?: string[]
  isCurrentSectionLocked?: boolean
  onSelectSection: (sectionId: string, firstQuestionIndex?: number) => void
  onLockSection?: (sectionId: string) => void
  onWarning?: (message: string) => void
}

export const TestSectionTabBar: FC<TestSectionTabBarProps> = ({
  sections,
  questions,
  answers,
  activeSectionId,
  lockedSectionIds = [],
  isCurrentSectionLocked = false,
  onSelectSection,
  onLockSection,
  onWarning,
}) => {
  if (!sections || sections.length === 0) return null

  const activeSection = sections.find(s => s.id === activeSectionId)

  const handleLockClick = () => {
    if (!activeSection || !onLockSection) return
    const confirmed = window.confirm(
      `Lock section "${activeSection.title}"? Answers in this section cannot be edited once locked.`
    )
    if (confirmed) {
      onLockSection(activeSection.id)
    }
  }

  const handleSectionClick = (section: TestSection) => {
    const isSecLocked = Boolean(lockedSectionIds?.includes(section.id))
    const canNavigate = !isSecLocked || section.allow_backward_navigation !== false

    if (!canNavigate) {
      onWarning?.(
        `🔒 Section "${section.title}" is locked. Backward navigation is disabled.`
      )
      return
    }

    const firstIndex = questions.findIndex(
      q => (q.section_id || q.sectionId) === section.id
    )
    onSelectSection(section.id, firstIndex !== -1 ? firstIndex : undefined)
  }

  return (
    <div
      data-testid="test-section-tab-bar"
      className="mb-4 bg-white dark:bg-gray-800/90 rounded-2xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Exam Sections ({sections.length})
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Switch between subjects or focus section questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSection?.is_timed && activeSection.duration_minutes && (
            <span
              data-testid="section-limit-badge"
              className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              Section Limit: {activeSection.duration_minutes}m
            </span>
          )}
          {activeSection && !isCurrentSectionLocked && onLockSection && (
            <button
              type="button"
              data-testid="lock-section-btn"
              onClick={handleLockClick}
              className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Lock Section</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {sections.map((section, idx) => {
          const sectionQuestions = questions.filter(
            q => (q.section_id || q.sectionId) === section.id
          )
          const totalSecQuestions = sectionQuestions.length || section.question_count || 0
          const answeredSecCount = sectionQuestions.filter(
            q => answers[q.id] !== undefined && answers[q.id] !== ''
          ).length
          const isSelected = activeSectionId === section.id
          const isSecLocked = Boolean(lockedSectionIds?.includes(section.id))

          return (
            <button
              key={section.id || idx}
              data-testid={`section-tab-${section.id}`}
              onClick={() => handleSectionClick(section)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-500/30'
                  : isSecLocked
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                    : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-700/60 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {isSecLocked && <Lock className="w-3 h-3 text-amber-500" />}
              <span>{section.title || `Section ${idx + 1}`}</span>
              <span
                data-testid={`section-progress-${section.id}`}
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-purple-700 text-purple-100'
                    : isSecLocked
                      ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {answeredSecCount} / {totalSecQuestions}
              </span>
              {isSecLocked && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Locked
                </span>
              )}
              {section.is_timed && section.duration_minutes && !isSecLocked && (
                <span className="text-[10px] opacity-80 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {section.duration_minutes}m
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
