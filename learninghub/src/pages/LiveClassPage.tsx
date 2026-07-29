import { motion } from 'framer-motion'
import { Video, Clock, Users, Calendar, Play, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { liveClassService } from '../services/liveClassService'
import { SEO } from '../components/SEO'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import AnimatedPage from '../components/AnimatedPage'

export default function LiveClassPage() {
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const response = await liveClassService.getUpcomingSessions()
      return response?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const statusColors: Record<string, string> = {
    live: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }

  return (
    <AnimatedPage>
      <SEO title="Live Classes - LearningHub" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Video className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Join interactive live sessions with expert instructors
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load live sessions"
            message={error?.message ?? 'Could not load live sessions.'}
            error={error}
            onRetry={() => void refetch()}
          />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No Live Sessions Scheduled"
            description="Check back later for upcoming live classes."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full flex flex-col p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={statusColors[session.status] ?? statusColors.upcoming}>
                      {session.status === 'live'
                        ? '🔴 Live Now'
                        : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {session.title}
                  </h3>

                  {session.instructorName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      By {session.instructorName}
                    </p>
                  )}

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(session.scheduledAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{session.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>
                        {session.currentParticipants ?? 0}/{session.maxParticipants ?? '∞'}{' '}
                        participants
                      </span>
                    </div>
                  </div>

                  <button
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
                    onClick={() => window.open(`/live-class/${session.id}`, '_blank')}
                  >
                    {session.status === 'live' ? (
                      <>
                        <Play className="w-4 h-4" /> Join Now
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" /> View Details
                      </>
                    )}
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}
