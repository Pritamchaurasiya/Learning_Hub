import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BrainCircuit, Sparkles, CalendarClock, Brain, Target, ArrowRight } from 'lucide-react'
import { Card } from './ui/Card'
import { analyticsService } from '../services/analyticsService'
import { Skeleton } from './ui/Skeleton'

export default function AILearningEngine() {
  const { data: recommendationsRes, isLoading: isLoadingRecs } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: () => analyticsService.getRecommendations(),
  })

  const { data: spacedRepetitionRes, isLoading: isLoadingSr } = useQuery({
    queryKey: ['ai-spaced-repetition'],
    queryFn: () => analyticsService.getSpacedRepetitionSchedule(),
  })

  const recommendations = recommendationsRes?.data ?? []
  const srSchedule = spacedRepetitionRes?.data ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <Card className="p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
              <BrainCircuit className="w-6 h-6 text-purple-400" />
              Cognitive Recommendations
            </h3>

            {isLoadingRecs ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl bg-white/10" />
                <Skeleton className="h-20 w-full rounded-2xl bg-white/10" />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map(rec => (
                  <motion.div
                    key={rec.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 cursor-pointer hover:bg-white/20 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-300" />
                        <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                          {rec.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-bold bg-purple-500/30 text-purple-100 px-2 py-1 rounded-full">
                        {Math.round(rec.confidence * 100)}% Match
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white/90">{rec.reason}</p>
                    <div className="mt-3 flex justify-end">
                      <button className="flex items-center gap-1 text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl transition-colors">
                        Launch Practice <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10">
                <p className="text-sm font-bold text-white/70">No immediate recommendations.</p>
                <p className="text-xs text-white/50 mt-1">
                  Keep learning, we are analyzing your neural patterns.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Spaced Repetition Schedule */}
        <Card className="p-6 bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Brain className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
              <CalendarClock className="w-6 h-6 text-emerald-400" />
              Spaced Repetition Engine
            </h3>

            {isLoadingSr ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-2xl bg-white/10" />
                <Skeleton className="h-16 w-full rounded-2xl bg-white/10" />
              </div>
            ) : srSchedule.length > 0 ? (
              <div className="space-y-3">
                {srSchedule.map(sr => {
                  const reviewDate = new Date(sr.nextReview)
                  const isToday = reviewDate.toDateString() === new Date().toDateString()
                  const isOverdue = reviewDate < new Date() && !isToday

                  return (
                    <motion.div
                      key={sr.id}
                      whileHover={{ scale: 1.02 }}
                      className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between ${
                        isOverdue ? 'border-red-500/50 bg-red-500/10' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{sr.topicName}</p>
                        <p className="text-xs text-emerald-200/70">{sr.subjectName}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black px-3 py-1.5 rounded-full ${
                            isOverdue
                              ? 'bg-red-500/30 text-red-100'
                              : isToday
                                ? 'bg-emerald-500/30 text-emerald-100'
                                : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {isOverdue
                            ? 'Overdue'
                            : isToday
                              ? 'Review Today'
                              : reviewDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                        </span>
                        <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest font-black">
                          {sr.intervalDays}d Interval
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10">
                <p className="text-sm font-bold text-white/70">
                  Your memory matrix is completely optimized.
                </p>
                <p className="text-xs text-white/50 mt-1">No reviews scheduled right now.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
