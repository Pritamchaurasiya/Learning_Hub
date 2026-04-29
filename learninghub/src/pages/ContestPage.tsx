import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Timer, Users, Play, CheckCircle, Clock, Star, Award, Medal, Target, Zap, ArrowRight, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { contestService, type Contest } from '../services/contestService'

const mockResults = [
  { contestId: '2', rank: 12, score: 350, time: 2340, solved: 4 },
  { contestId: '4', rank: 5, score: 280, time: 890, solved: 3 },
  { contestId: '1', rank: 28, score: 210, time: 4500, solved: 3 }
]

export default function ContestPage() {
  const navigate = useNavigate()
  const { addToast } = useStore()
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'results'>('active')
  
  const [apiContests, setApiContests] = useState<Contest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const fetchContests = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await contestService.getContests()
      setApiContests(res.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contests')
      console.error('[ContestPage] Failed to fetch contests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContests()
  }, [fetchContests])

  const contests = apiContests.filter(c => {
    if (activeTab === 'active') return c.status === 'active' || c.status === 'completed'
    if (activeTab === 'upcoming') return c.status === 'upcoming'
    return false
  })

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
      case 'hard': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'expert': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'upcoming': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      case 'completed': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleParticipate = (contest: Contest) => {
    if (contest.status === 'upcoming') {
      addToast({ message: `Contest starts at ${formatDate(contest.start_time)}`, type: 'info' })
    } else {
      navigate(`/problems?contest=${contest.contest_id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading contests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        <Button variant="outline" onClick={fetchContests} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-8 h-8 text-amber-500" />
          Contests
        </h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'active'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Active
          {activeTab === 'active' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'upcoming'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Upcoming
          {activeTab === 'upcoming' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'results'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          My Results
          {activeTab === 'results' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
      </div>

      {activeTab === 'results' ? (
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5" />
              Contest History
            </h2>
            <div className="space-y-4">
              {mockResults.map((result) => {
                // Find contest from API contests if possible, else fallback to a generic title
                const contest = apiContests.find(c => c.contest_id === result.contestId)
                return (
                  <div key={result.contestId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <h3 className="font-semibold">{contest?.title || `Contest #${result.contestId}`}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          Rank #{result.rank}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {result.score} pts
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {result.solved}/{contest?.problem_count || '?'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(result.time)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      View
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contests.map((contest) => (
            <Card key={contest.contest_id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(contest.difficulty)}`}>
                  {contest.difficulty || 'All Levels'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contest.status)}`}>
                  {contest.status}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2">{contest.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{contest.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {formatDuration(contest.duration)}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {contest.problem_count} problems
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {contest.participants}
                </div>
                {contest.prize && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="w-4 h-4" />
                    {contest.prize}
                  </div>
                )}
              </div>

              {contest.status === 'upcoming' && contest.start_time && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <Calendar className="w-4 h-4" />
                  Starts: {formatDate(contest.start_time)}
                </div>
              )}

              <Button
                onClick={() => handleParticipate(contest)}
                fullWidth
                leftIcon={contest.status === 'active' ? <Play className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              >
                {contest.status === 'active' ? 'Start Challenge' : contest.status === 'upcoming' ? 'Set Reminder' : 'View Results'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {activeTab !== 'results' && contests.length === 0 && (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">No contests found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === 'upcoming'
              ? 'No upcoming contests at the moment. Check back later!'
              : 'No active contests. Try the upcoming tab.'}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5" />
          Leaderboard Top 5
        </h2>
        <div className="space-y-3">
          {[
            { rank: 1, name: 'CodeMaster42', score: 2450, streak: 15 },
            { rank: 2, name: 'AlgoNinja', score: 2380, streak: 12 },
            { rank: 3, name: 'ByteWizard', score: 2290, streak: 8 },
            { rank: 4, name: 'DataChamp', score: 2150, streak: 5 },
            { rank: 5, name: 'TechGuru', score: 2080, streak: 3 }
          ].map((user) => (
            <div key={user.rank} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  user.rank === 1
                    ? 'bg-amber-500 text-white'
                    : user.rank === 2
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
                    : user.rank === 3
                    ? 'bg-amber-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {user.rank}
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{user.streak} day streak</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-600">{user.score}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">XP</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}