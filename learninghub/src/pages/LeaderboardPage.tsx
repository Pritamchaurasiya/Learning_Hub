import { useState, useEffect, useCallback } from 'react'
import { Trophy, Medal, TrendingUp, Award, Crown, Star, Flame, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { leaderboardService, type LeaderboardEntry } from '../services/leaderboardService'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeRange, setTimeRange] = useState<'weekly' | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (showLoading = true, signal?: AbortSignal) => {
    try {
      if (showLoading) setIsLoading(true)
      setError(null)
      const res = await leaderboardService.getLeaderboard(timeRange, 50, signal)
      if (!signal?.aborted) {
        setLeaderboard(res.data)
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        if (showLoading) setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
        console.error('[LeaderboardPage] Failed to fetch leaderboard:', err)
      }
    } finally {
      if (!signal?.aborted && showLoading) {
        setIsLoading(false)
      }
    }
  }, [timeRange])

  useEffect(() => {
    const controller = new AbortController()
    fetchLeaderboard(true, controller.signal)
    
    // Live Polling every 30 seconds with proper cleanup
    const intervalId = setInterval(() => {
      if (!controller.signal.aborted) {
        fetchLeaderboard(false, controller.signal)
      }
    }, 30000)
    
    return () => {
      controller.abort()
      clearInterval(intervalId)
    }
  }, [fetchLeaderboard])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">{rank}</span>
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
    if (rank === 2) return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    if (rank === 3) return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
    return ''
  }

  const currentUser = leaderboard.find(entry => entry.is_current_user)

  return (
    <>
      <SEO
        title="Leaderboard - LearningHub"
        description="See how you rank among other learners"
        keywords="leaderboard, ranking, competition"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Leaderboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Compete with learners worldwide
            </p>
          </div>
          <div className="flex gap-2">
            {(['weekly', 'all'] as const).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'outline'}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => fetchLeaderboard(true)}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {/* Top 3 Podium */}
        {!isLoading && leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2nd Place */}
          <Card className={`p-6 text-center ${getRankColor(2)} border-2`}>
            <div className="flex justify-center mb-4">
              {getRankIcon(2)}
            </div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-2xl font-bold">
              {leaderboard[1]?.display_name?.charAt(0) || leaderboard[1]?.username?.charAt(0) || '?'}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {leaderboard[1]?.display_name || leaderboard[1]?.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Level {leaderboard[1]?.level}
            </p>
            <div className="flex items-center justify-center gap-1 text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{leaderboard[1]?.xp?.toLocaleString()} XP</span>
            </div>
          </Card>

          {/* 1st Place */}
          <Card className={`p-6 text-center ${getRankColor(1)} border-2 border-yellow-400 dark:border-yellow-600`}>
            <div className="flex justify-center mb-4">
              {getRankIcon(1)}
            </div>
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {leaderboard[0]?.display_name?.charAt(0) || leaderboard[0]?.username?.charAt(0) || '?'}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-lg">
              {leaderboard[0]?.display_name || leaderboard[0]?.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Level {leaderboard[0]?.level}
            </p>
            <div className="flex items-center justify-center gap-1 text-yellow-500">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold text-lg">{leaderboard[0]?.xp?.toLocaleString()} XP</span>
            </div>
          </Card>

          {/* 3rd Place */}
          <Card className={`p-6 text-center ${getRankColor(3)} border-2`}>
            <div className="flex justify-center mb-4">
              {getRankIcon(3)}
            </div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-2xl font-bold">
              {leaderboard[2]?.display_name?.charAt(0) || leaderboard[2]?.username?.charAt(0) || '?'}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {leaderboard[2]?.display_name || leaderboard[2]?.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Level {leaderboard[2]?.level}
            </p>
            <div className="flex items-center justify-center gap-1 text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{leaderboard[2]?.xp?.toLocaleString()} XP</span>
            </div>
          </Card>
        </div>
        )}

        {/* Current User Stats */}
        {!isLoading && currentUser && (
          <Card className="p-6 bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                  {currentUser.rank}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Your Rank: #{currentUser.rank}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentUser.xp.toLocaleString()} XP • Level {currentUser.level}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="w-5 h-5" />
                  <span className="font-medium">{currentUser.streak} day streak</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard List */}
        {!isLoading && leaderboard.length > 3 && (
        <Card className="p-4">
          <div className="space-y-2">
            {leaderboard.slice(3).map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  entry.is_current_user
                    ? 'bg-primary-50 dark:bg-primary-900/10 border-2 border-primary-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                  {entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                  {(entry.display_name || entry.username).charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${entry.is_current_user ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                    {entry.display_name || entry.username}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Level {entry.level} • {entry.courses_completed} courses
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-medium">{entry.xp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-4 h-4" />
                    <span className="text-sm">{entry.streak}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        )}

        {/* Empty State */}
        {!isLoading && leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No leaderboard data
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start learning to appear on the leaderboard
            </p>
          </div>
        )}

        {/* Achievements */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Achievements
            </h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Top 10</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reached top 10</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
              <Flame className="w-8 h-8 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Hot Streak</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">10+ day streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Rising Star</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Moved up 5 ranks</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
