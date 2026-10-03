import React from 'react'
import {
  Brain,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Calendar,
  Bookmark,
  PlusCircle,
} from 'lucide-react'
import type { RetentionStats } from '../../types/revision'
import { Card } from '../ui/Card'

interface RetentionAnalyticsCardProps {
  stats: RetentionStats
  onSyncBookmarks?: () => void
  onOpenCreateCard?: () => void
  className?: string
}

export const RetentionAnalyticsCard: React.FC<RetentionAnalyticsCardProps> = ({
  stats,
  onSyncBookmarks,
  onOpenCreateCard,
  className = '',
}) => {
  const avgRetentionPct = Math.round(stats.average_retention * 100)

  return (
    <Card className={`p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              Memory Retention Engine
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                SM-2+
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Forgetting curve stability & active recall telemetry
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenCreateCard && (
            <button
              onClick={onOpenCreateCard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Card</span>
            </button>
          )}
          {onSyncBookmarks && (
            <button
              onClick={onSyncBookmarks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Import saved question bookmarks into revision cards"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sync Bookmarks</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Total Cards
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {stats.total_cards}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">
            {stats.due_today} due today
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-500" /> Mastered
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.mastered_count}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">
            {stats.mastery_rate}% mastery rate
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Memory Stability
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {avgRetentionPct}%
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">
            Average retrievability
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Due Today
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.due_today}
          </div>
          <div className="text-[11px] font-medium text-gray-400 mt-1">
            Prioritized by SM-2
          </div>
        </div>
      </div>

      {/* 7-Day Review Load Forecast */}
      {stats.forecast_7d && stats.forecast_7d.length > 0 && (
        <div className="py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> 7-Day Review Workload Projection
            </span>
            <span className="text-gray-400 text-[11px]">Daily expected reviews</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {stats.forecast_7d.map((count, idx) => {
              const dayLabel = idx === 0 ? 'Today' : `+${idx}d`
              const isToday = idx === 0
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs ${
                    isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 font-bold text-indigo-600 dark:text-indigo-400'
                      : 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-gray-400">{dayLabel}</div>
                  <div className="text-sm font-black mt-0.5">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Topic Mastery Breakdown */}
      {stats.topic_breakdown && stats.topic_breakdown.length > 0 && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
            Topic Retention & Mastery Levels
          </div>
          <div className="space-y-2.5">
            {stats.topic_breakdown.slice(0, 5).map(topic => (
              <div key={topic.topic} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {topic.topic}
                  </span>
                  <span className="font-mono text-gray-500 dark:text-gray-400">
                    {topic.mastered_cards}/{topic.total_cards} cards · {Math.round(topic.average_retention * 100)}% retention
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, topic.mastery_percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
