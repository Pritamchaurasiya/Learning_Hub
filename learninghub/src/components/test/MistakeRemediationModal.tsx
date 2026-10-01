import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  BrainCircuit,
  AlertTriangle,
  Clock,
  XCircle,
  Target,
  ArrowRight,
  BookOpen,
  Bookmark,
  Zap,
} from 'lucide-react'
import {
  RemediationSummary,
  CognitiveMistakeType,
  MistakeAnalysisItem,
} from '../../services/remediationService'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { MathRenderer } from '../MathRenderer'

interface MistakeRemediationModalProps {
  isOpen: boolean
  onClose: () => void
  summary: RemediationSummary
  onStartTargetedDrill: (topics: string[], mistakeTypes: CognitiveMistakeType[]) => void
  onBookmarkQuestion?: (questionId: string) => void
  bookmarkedQuestionIds?: Set<string>
  onOpenEbookTopic?: (topic: string) => void
}

export const MistakeRemediationModal: React.FC<MistakeRemediationModalProps> = ({
  isOpen,
  onClose,
  summary,
  onStartTargetedDrill,
  onBookmarkQuestion,
  bookmarkedQuestionIds = new Set(),
  onOpenEbookTopic,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<CognitiveMistakeType | 'ALL'>('ALL')
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'ALL') return summary.items
    return summary.items.filter(item => item.mistakeType === selectedFilter)
  }, [summary.items, selectedFilter])

  if (!isOpen) return null

  const getCategoryIcon = (type: CognitiveMistakeType) => {
    switch (type) {
      case 'CONCEPT_GAP':
        return <BrainCircuit className="w-5 h-5 text-red-500" />
      case 'CALCULATION_SLIP':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'TIME_CRUNCH':
        return <Clock className="w-5 h-5 text-purple-500" />
      case 'UNANSWERED':
        return <XCircle className="w-5 h-5 text-slate-500" />
      case 'CONFIDENCE_MISMATCH':
        return <Target className="w-5 h-5 text-rose-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Cognitive Mistake Diagnostics
                  </h2>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold text-xs">
                    {summary.totalMistakes} Error{summary.totalMistakes === 1 ? '' : 's'} Analyzed
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Primary Root Cause:{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {summary.primaryWeaknessLabel}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Cognitive Category Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {summary.categories.map(cat => (
                <button
                  key={cat.type}
                  onClick={() =>
                    setSelectedFilter(prev => (prev === cat.type ? 'ALL' : cat.type))
                  }
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    selectedFilter === cat.type
                      ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-indigo-400 shadow-md bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getCategoryIcon(cat.type)}
                    <span className="text-lg font-black text-gray-900 dark:text-white">
                      {cat.count}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    {cat.label}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {cat.percentage}% of errors
                  </div>
                </button>
              ))}
            </div>

            {/* Actionable Strategy Insights */}
            {summary.actionableInsights.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider mb-2">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Psychometric Action Plan
                </div>
                <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  {summary.actionableInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedFilter === 'ALL'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                All Mistakes ({summary.totalMistakes})
              </button>
              {summary.categories.map(cat => (
                <button
                  key={cat.type}
                  onClick={() => setSelectedFilter(cat.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedFilter === cat.type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Detailed Mistake Items List */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No questions matched this category filter.
                </div>
              ) : (
                filteredItems.map((item: MistakeAnalysisItem) => {
                  const isExpanded = expandedQuestionId === item.questionId
                  const isBookmarked = bookmarkedQuestionIds.has(item.questionId)

                  return (
                    <Card
                      key={item.questionId}
                      className="p-4 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {getCategoryIcon(item.mistakeType)}
                          </span>
                          <span className="font-bold text-xs text-gray-900 dark:text-white">
                            {item.mistakeLabel}
                          </span>
                          <Badge className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {item.topic}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.timeSpent}s spent</span>
                          {item.severity === 'CRITICAL' && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 text-[10px] border border-red-300">
                              Critical Gap
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 mb-3 font-medium leading-relaxed">
                        <MathRenderer text={item.questionText} />
                      </div>

                      {/* Options comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                        <div className="p-2.5 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40">
                          <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">
                            Your Choice
                          </div>
                          <div className="text-gray-800 dark:text-gray-200 font-medium">
                            <MathRenderer text={item.selectedOptionText || 'Unanswered'} />
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                          <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                            Correct Answer
                          </div>
                          <div className="text-gray-800 dark:text-gray-200 font-medium">
                            <MathRenderer text={item.correctOptionText || 'N/A'} />
                          </div>
                        </div>
                      </div>

                      {/* Cognitive Diagnosis */}
                      <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg mb-3">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Diagnosis:{' '}
                        </span>
                        {item.diagnosis}
                      </div>

                      {/* Quick Action Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          {onBookmarkQuestion && (
                            <button
                              onClick={() => onBookmarkQuestion(item.questionId)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                isBookmarked
                                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                            </button>
                          )}

                          {onOpenEbookTopic && (
                            <button
                              onClick={() => onOpenEbookTopic(item.topic)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Theory in Ebook</span>
                            </button>
                          )}
                        </div>

                        {item.explanation && (
                          <button
                            onClick={() =>
                              setExpandedQuestionId(prev =>
                                prev === item.questionId ? null : item.questionId
                              )
                            }
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            {isExpanded ? 'Hide Solution' : 'View Full Solution'}
                          </button>
                        )}
                      </div>

                      {/* Expanded Solution Drawer */}
                      {isExpanded && item.explanation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 bg-indigo-50/20 dark:bg-indigo-950/20 p-3 rounded-lg"
                        >
                          <div className="font-bold text-gray-900 dark:text-white mb-1">
                            Step-by-Step Explanation:
                          </div>
                          <MathRenderer text={item.explanation} />
                        </motion.div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          {/* Modal Footer / Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
              <span>Targeting </span>
              <strong className="text-gray-800 dark:text-gray-200">
                {summary.targetTopics.slice(0, 3).join(', ') || 'Weak Topics'}
              </strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 sm:flex-none text-xs"
              >
                Close Review
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  onStartTargetedDrill(
                    summary.targetTopics,
                    summary.categories.map(c => c.type)
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md text-xs font-semibold py-2 px-4"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Start 5-Min Remediation Drill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
