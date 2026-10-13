import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Swords,
  Trophy,
  Zap,
  Flame,
  Clock,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Code2,
  Users,
  Play,
  Terminal,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { duelService } from '../services/duelService'
import type { DuelPlayer, DuelMatch, DuelEmote } from '../types/duel'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { useWebSocket } from '../hooks/useWebSocket'
import { useStore } from '../stores/useStore'
import { wasmSandboxService } from '../services/wasm/WasmSandboxService'
import { playRewardChime } from '../utils/soundEffects'

export default function ArenaDuelPage() {
  const addToast = useStore(state => state.addToast)
  const { emit, on, joinRoom, connect, disconnect } = useWebSocket()

  // Connect WebSocket on mount for active matchmaking and dueling
  useEffect(() => {
    connect?.()
    return () => {
      disconnect?.()
    }
  }, [connect, disconnect])

  const [duelMobileTab, setDuelMobileTab] = useState<'problem' | 'code' | 'telemetry'>('code')

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'lobby' | 'duel' | 'leaderboard'>('lobby')
  const [isQueueing, setIsQueueing] = useState(false)
  const [queueSeconds, setQueueSeconds] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('ANY')

  // Active match state
  const [match, setMatch] = useState<DuelMatch | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python'>('javascript')
  const [code, setCode] = useState('')
  const [userTestsPassed, setUserTestsPassed] = useState(0)
  const [opponentTestsPassed, setOpponentTestsPassed] = useState(0)
  const [opponentStatus, setOpponentStatus] = useState<string>('DRAFTING')
  const [opponentKeystrokes, setOpponentKeystrokes] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(600)
  const [testResults, setTestResults] = useState<
    Array<{ id: string; input: string; expected: string; actual: string; passed: boolean }>
  >([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [matchFinishedResult, setMatchFinishedResult] = useState<{
    isWinner: boolean
    eloDelta: number
    winnerId: string | null
  } | null>(null)
  const [floatingEmotes, setFloatingEmotes] = useState<
    Array<{ id: string; emote: string; sender: string }>
  >([])
  const [matchIntroCountdown, setMatchIntroCountdown] = useState<number | null>(null)

  // Keystroke telemetry throttle
  const keystrokeCountRef = useRef(0)
  const lastProgressBroadcastRef = useRef(0)

  // Fetch Player Profile
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['duel', 'profile'],
    queryFn: () => duelService.getProfile().then(res => res.data),
    staleTime: 60 * 1000,
  })

  // Fetch Leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ['duel', 'leaderboard'],
    queryFn: () => duelService.getLeaderboard().then(res => res.data.leaderboard),
    staleTime: 60 * 1000,
  })

  const playerProfile: DuelPlayer = profileData || {
    userId: 'local-duelist',
    username: 'ApexDuelist',
    elo: 1200,
    tier: 'SILVER',
    wins: 14,
    losses: 6,
    streak: 2,
    peakElo: 1410,
  }

  const tierProgress = useMemo(
    () => duelService.calculateTierProgress(playerProfile.elo),
    [playerProfile.elo]
  )

  const isPlayer1 = match?.player1.userId === playerProfile.userId
  const opponentState = match ? (isPlayer1 ? match.player2 : match.player1) : null

  // ── Queue Timer ────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isQueueing) {
      interval = setInterval(() => {
        setQueueSeconds(prev => prev + 1)
      }, 1000)
    } else {
      setQueueSeconds(0)
    }
    return () => clearInterval(interval)
  }, [isQueueing])

  // ── Match Countdown Timer ──────────────────────────────────────
  useEffect(() => {
    if (!match || match.status === 'FINISHED') return
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleMatchTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [match])

  // ── Match Intro 3-Second Versus Countdown Effect ─────────────
  useEffect(() => {
    if (matchIntroCountdown === null) return
    if (matchIntroCountdown > 0) {
      playRewardChime('xp-gain')
      const timer = setTimeout(() => {
        setMatchIntroCountdown(prev => (prev !== null ? prev - 1 : null))
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      playRewardChime('milestone')
      const timer = setTimeout(() => {
        setMatchIntroCountdown(null)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [matchIntroCountdown])

  // ── WebSocket Room & Live Telemetry ───────────────────────────
  useEffect(() => {
    if (!match) return

    const roomId = `duel-${match.id}`
    joinRoom(roomId)

    const handlePeerProgress = (data: {
      testsPassed: number
      totalTests: number
      keystrokes: number
    }) => {
      setOpponentTestsPassed(data.testsPassed)
      setOpponentKeystrokes(data.keystrokes)
      setOpponentStatus(data.testsPassed > 0 ? 'RUNNING' : 'DRAFTING')
    }

    const handlePeerEmote = (data: DuelEmote) => {
      const emoteId = `emote-${Date.now()}-${Math.random()}`
      setFloatingEmotes(prev => [
        ...prev,
        { id: emoteId, emote: data.emote, sender: data.senderUserId },
      ])
      setTimeout(() => {
        setFloatingEmotes(prev => prev.filter(e => e.id !== emoteId))
      }, 3000)
    }

    const handlePeerSurrender = () => {
      setOpponentStatus('SURRENDERED')
      handleMatchSolutionSubmit(true)
    }

    const unsubProgress = on<{
      testsPassed: number
      totalTests: number
      keystrokes: number
    }>('duel-peer-progress', handlePeerProgress)
    const unsubEmote = on<DuelEmote>('duel-peer-emote', handlePeerEmote)
    const unsubSurrender = on('duel-peer-surrendered', handlePeerSurrender)

    return () => {
      unsubProgress?.()
      unsubEmote?.()
      unsubSurrender?.()
    }
  }, [match, on, joinRoom])

  // ── AI Ghost Simulation ───────────────────────────────────────
  useEffect(() => {
    if (!match || !opponentState?.isGhost || match.status === 'FINISHED') return

    // Simulate realistic AI Ghost progression over match duration
    const totalTests = match.problem.testCases.length
    const t1 = setTimeout(() => {
      setOpponentTestsPassed(1)
      setOpponentStatus('RUNNING')
    }, 12000)

    const t2 = setTimeout(() => {
      setOpponentTestsPassed(Math.min(3, totalTests - 1))
      setOpponentKeystrokes(84)
    }, 28000)

    const t3 = setTimeout(() => {
      setOpponentTestsPassed(totalTests - 1)
      setOpponentKeystrokes(165)
    }, 45000)

    const t4 = setTimeout(() => {
      if (match.status !== 'FINISHED') {
        setOpponentTestsPassed(totalTests)
        setOpponentStatus('SUBMITTED')
        setMatchFinishedResult({
          isWinner: false,
          eloDelta: -16,
          winnerId: opponentState.userId,
        })
      }
    }, 70000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [match, opponentState])

  // ── Queue & Match Initialization ──────────────────────────────
  const handleStartQueue = async (forceGhost = false) => {
    setIsQueueing(true)
    try {
      const res = await duelService.joinQueue(selectedCategory, forceGhost)
      if (res.data.match) {
        initMatch(res.data.match)
      } else {
        // If searching peer, auto fallback to Ghost after 5s for flawless UX
        setTimeout(async () => {
          if (isQueueing) {
            const ghostRes = await duelService.joinQueue(selectedCategory, true)
            if (ghostRes.data.match) {
              initMatch(ghostRes.data.match)
            }
          }
        }, 5000)
      }
    } catch {
      // Fallback local match creation
      const localMatch: DuelMatch = {
        id: `duel-match-${Date.now()}`,
        status: 'IN_PROGRESS',
        problem: {
          id: 'duel-p-01',
          title: 'Two Sum',
          slug: 'two-sum',
          difficulty: 'EASY',
          category: 'Array / Hash Table',
          description:
            'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
          constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
          starterCode: {
            javascript:
              'function twoSum(nums, target) {\n  // Write your O(n) solution here\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
            python:
              'def two_sum(nums, target):\n    # Write your O(n) solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i\n    return []',
          },
          testCases: [
            { id: 'tc-1', input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0, 1]' },
            { id: 'tc-2', input: 'nums = [3,2,4], target = 6', expectedOutput: '[1, 2]' },
            { id: 'tc-3', input: 'nums = [3,3], target = 6', expectedOutput: '[0, 1]' },
            { id: 'tc-4', input: 'nums = [1,5,9,14], target = 15', expectedOutput: '[1, 3]' },
            { id: 'tc-5', input: 'nums = [-3,4,3,90], target = 0', expectedOutput: '[0, 2]' },
          ],
        },
        player1: {
          userId: playerProfile.userId,
          username: playerProfile.username,
          elo: playerProfile.elo,
          tier: playerProfile.tier,
          testsPassed: 0,
          totalTests: 5,
          status: 'DRAFTING',
          keystrokes: 0,
        },
        player2: {
          userId: 'ghost-adalovelace',
          username: 'AdaLovelace_AI',
          avatar: '👩‍💻',
          elo: 1250,
          tier: 'SILVER',
          isGhost: true,
          testsPassed: 0,
          totalTests: 5,
          status: 'DRAFTING',
          keystrokes: 0,
        },
        winnerId: null,
        startedAt: Date.now(),
        durationSeconds: 600,
      }
      initMatch(localMatch)
    }
  }

  const handleCancelQueue = async () => {
    setIsQueueing(false)
    await duelService.leaveQueue().catch(() => {})
  }

  const initMatch = (m: DuelMatch) => {
    setIsQueueing(false)
    setMatch(m)
    setUserTestsPassed(0)
    setOpponentTestsPassed(0)
    setOpponentStatus('DRAFTING')
    setMatchFinishedResult(null)
    setTimeRemaining(m.durationSeconds || 600)
    // eslint-disable-next-line security/detect-object-injection
    setCode(m.problem.starterCode[selectedLanguage] || m.problem.starterCode.javascript || '')
    setActiveTab('duel')
    setMatchIntroCountdown(3)
  }

  // ── Code Editing & Telemetry Sync ─────────────────────────────
  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    keystrokeCountRef.current += 1

    const now = Date.now()
    if (now - lastProgressBroadcastRef.current > 1500 && match) {
      lastProgressBroadcastRef.current = now
      emit('duel-progress', {
        roomId: `duel-${match.id}`,
        testsPassed: userTestsPassed,
        totalTests: match.problem.testCases.length,
        keystrokes: keystrokeCountRef.current,
      })
      duelService.updateProgress(match.id, userTestsPassed, keystrokeCountRef.current).catch(() => {})
    }
  }

  // ── Test Execution ─────────────────────────────────────────────
  const handleRunTests = async () => {
    if (!match) return
    setIsRunningTests(true)

    try {
      const sandboxTestCases = match.problem.testCases.map(tc => ({
        input: tc.input,
        output: tc.expectedOutput,
      }))

      const wasmRes = await wasmSandboxService.execute(selectedLanguage, code, {
        testCases: sandboxTestCases,
        timeoutMs: 2500,
      })

      const results = match.problem.testCases.map((tc, idx) => {
        const tr = wasmRes.testResults[idx]
        const isPassed = tr ? tr.passed : false
        return {
          id: tc.id,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: tr ? tr.actualOutput : 'undefined',
          passed: isPassed,
        }
      })

      const passedCount = wasmRes.passedTests
      setTestResults(results)
      setUserTestsPassed(passedCount)

      // Broadcast progress via live WebSockets
      emit('duel-progress', {
        roomId: `duel-${match.id}`,
        testsPassed: passedCount,
        totalTests: match.problem.testCases.length,
        keystrokes: keystrokeCountRef.current,
      })
      duelService.updateProgress(match.id, passedCount, keystrokeCountRef.current).catch(() => {})

      if (passedCount === match.problem.testCases.length && passedCount > 0) {
        addToast({
          message: '⚔️ All test cases passed! Submitting solution for instant victory...',
          type: 'success',
        })
        setTimeout(() => {
          void handleMatchSolutionSubmit(true)
        }, 300)
      }
    } catch (err) {
      console.error('[ArenaDuel] Sandbox execution failed:', err)
      addToast({ message: 'Execution error in sandbox runner', type: 'error' })
    } finally {
      setIsRunningTests(false)
    }
  }

  const handleMatchSolutionSubmit = async (forcedWin = false) => {
    if (!match) return
    setIsSubmitting(true)

    const passedAll = forcedWin || userTestsPassed >= match.problem.testCases.length - 1

    try {
      const res = await duelService.submitSolution(match.id, code, passedAll)
      setMatchFinishedResult({
        isWinner: res.data.isWinner,
        eloDelta: res.data.eloDelta,
        winnerId: res.data.match.winnerId,
      })
      refetchProfile()
    } catch {
      // Local fallback calculation
      const delta = passedAll ? 26 : -14
      setMatchFinishedResult({
        isWinner: passedAll,
        eloDelta: delta,
        winnerId: passedAll ? playerProfile.userId : opponentState?.userId || 'opponent',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMatchTimeout = () => {
    const isWinner = userTestsPassed > opponentTestsPassed
    setMatchFinishedResult({
      isWinner,
      eloDelta: isWinner ? 18 : -14,
      winnerId: isWinner ? playerProfile.userId : opponentState?.userId || 'opponent',
    })
  }

  const handleSendEmote = (emote: string) => {
    if (!match) return
    const emoteId = `emote-${Date.now()}-${Math.random()}`
    setFloatingEmotes(prev => [...prev, { id: emoteId, emote, sender: playerProfile.userId }])
    setTimeout(() => {
      setFloatingEmotes(prev => prev.filter(e => e.id !== emoteId))
    }, 3000)

    emit('duel-emote', {
      roomId: `duel-${match.id}`,
      emote,
    })
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 lg:p-8">
      <SEO
        title="1v1 Algorithm Duel & Live Arena | LearningHub"
        description="Compete in real-time speed coding battles, climb the Elo ladder, and duel AI ghost champions in the LearningHub Arena."
      />

      {/* Floating Emote Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingEmotes.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 100, scale: 0.5, x: Math.random() * 200 - 100 }}
              animate={{ opacity: 1, y: -200, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute bottom-20 left-1/2 text-5xl"
            >
              {e.emote}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Top Arena Navigation Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
            <Swords className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Arena Duel Mode
              <span className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                Live 1v1 Elo
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time competitive DSA battles & algorithm rating ladder
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'lobby'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Lobby & Matchmaking
          </button>
          {match && (
            <button
              onClick={() => setActiveTab('duel')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'duel'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Active Duel
            </button>
          )}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Grandmaster Ranks
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. ARENA LOBBY VIEW                                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Player Profile & Rank Card */}
          <div className="space-y-6">
            <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/60 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-2xl shadow-md">
                    ⚔️
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      {playerProfile.username}
                    </h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tierProgress.currentTier.bgBadge}`}
                    >
                      {tierProgress.currentTier.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                    {playerProfile.elo}
                  </span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Rating Elo
                  </p>
                </div>
              </div>

              {/* Tier Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Tier Progress</span>
                  <span className="text-rose-500 font-bold">
                    {tierProgress.nextTier
                      ? `${tierProgress.pointsToNext} pts to ${tierProgress.nextTier.label}`
                      : 'Max Tier Reached'}
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress.percentage}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Wins</p>
                  <p className="text-xl font-black text-emerald-500 tabular-nums">
                    {playerProfile.wins}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Losses</p>
                  <p className="text-xl font-black text-rose-500 tabular-nums">
                    {playerProfile.losses}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Streak</p>
                  <p className="text-xl font-black text-amber-500 tabular-nums flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    {playerProfile.streak}
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Tips Card */}
            <Card className="p-6 border-none shadow-lg bg-white dark:bg-gray-900 space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Duel Scoring Rules
              </h4>
              <ul className="text-xs space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  First duelist to pass 100% of testcases instantly claims victory.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  3+ Consecutive win streak applies a <strong>+20% bonus</strong> to Elo gains.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  Speed victory (under 5 minutes) earns a <strong>+5 bonus point surge</strong>.
                </li>
              </ul>
            </Card>
          </div>

          {/* Center Column: Matchmaking Action Center */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 relative overflow-hidden">
              <div className="max-w-xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  Real-Time Ranked Matchmaking
                </div>

                <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  Enter the Arena. Challenge Peer or Ghost.
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You will be paired with an opponent within ±150 Elo points. Both players receive
                  the exact same algorithmic problem and live telemetry.
                </p>

                {/* Category Selector */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {['ANY', 'Arrays & Hash Tables', 'Stack & Strings', 'Dynamic Programming'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      disabled={isQueueing}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedCategory === cat
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                          : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Queue Buttons / Radar Searching Status */}
                <div className="pt-4">
                  {!isQueueing ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={() => handleStartQueue(false)}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-rose-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                      >
                        <Swords className="w-5 h-5" />
                        Find 1v1 Opponent
                      </button>

                      <button
                        onClick={() => handleStartQueue(true)}
                        className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 text-amber-500" />
                        Instant AI Ghost Duel
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-4">
                      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-40" />
                        <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                          <Swords className="w-8 h-8 animate-spin" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                          Searching for Worthy Opponent...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Queue Time: <strong className="tabular-nums">{queueSeconds}s</strong> •
                          Matching in {playerProfile.elo} ± 150 bracket
                        </p>
                      </div>
                      <button
                        onClick={handleCancelQueue}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Cancel Matchmaking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Live Arena Matches Snapshot */}
            <Card className="p-6 border-none shadow-lg bg-white dark:bg-gray-900">
              <h3 className="text-base font-black mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Featured Grandmaster Contenders
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(leaderboardData || []).slice(0, 4).map(p => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center text-white font-black text-sm">
                        {p.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {p.username}
                        </p>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          {p.tier}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-500 tabular-nums">
                        {p.elo}
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {Math.round((p.wins / Math.max(1, p.wins + p.losses)) * 100)}% Win
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. ACTIVE 1V1 DUEL ARENA                                    */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'duel' && match && (
        <div className="space-y-6">
          {/* Synchronous Match Header HUD */}
          <Card className="p-4 sm:p-6 border-none shadow-xl bg-white dark:bg-gray-900">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Player 1 (You) */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-xl text-white font-bold shadow-md">
                  😎
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {playerProfile.username} (You)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 font-black">
                      {playerProfile.elo}
                    </span>
                  </div>
                  {/* Test Pass Indicator */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {Array.from({ length: match.problem.testCases.length }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                          i < userTestsPassed
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        {i < userTestsPassed ? '✓' : ''}
                      </span>
                    ))}
                    <span className="text-xs font-bold text-gray-500 ml-1.5">
                      {userTestsPassed}/{match.problem.testCases.length} Tests
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Timer & VS Centerpiece */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-lg tabular-nums shadow-inner">
                  <Clock className="w-4 h-4 text-rose-500" />
                  {formatTimer(timeRemaining)}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1">
                  {userTestsPassed > opponentTestsPassed
                    ? '⚔️ You are Leading!'
                    : opponentTestsPassed > userTestsPassed
                      ? '⚠️ Opponent Leads!'
                      : '⚡ Neck and Neck'}
                </span>
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex items-center justify-end gap-3 w-full md:w-auto">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-500 font-black">
                      {opponentState?.elo || 1200}
                    </span>
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {opponentState?.username || 'Opponent'}
                    </span>
                  </div>
                  {/* Opponent Test Pass Indicator */}
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-xs font-bold text-gray-500 mr-1.5">
                      {opponentTestsPassed}/{match.problem.testCases.length} Tests
                    </span>
                    {Array.from({ length: match.problem.testCases.length }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] font-bold ${
                          i < opponentTestsPassed
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        {i < opponentTestsPassed ? '✓' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xl text-white font-bold shadow-md">
                  {opponentState?.avatar || '🤖'}
                </div>
              </div>
            </div>
          </Card>

          {/* Mobile Segmented View Controller (<1024px) */}
          <div className="lg:hidden flex items-center bg-gray-100 dark:bg-gray-800/90 p-1.5 rounded-2xl gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDuelMobileTab('problem')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                duelMobileTab === 'problem'
                  ? 'bg-white dark:bg-gray-700 text-rose-500 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Problem
            </button>
            <button
              type="button"
              onClick={() => setDuelMobileTab('code')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                duelMobileTab === 'code'
                  ? 'bg-white dark:bg-gray-700 text-rose-500 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Code & Tests
            </button>
            <button
              type="button"
              onClick={() => setDuelMobileTab('telemetry')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                duelMobileTab === 'telemetry'
                  ? 'bg-white dark:bg-gray-700 text-rose-500 shadow-md scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Opponent
            </button>
          </div>

          {/* Arena Dual Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Problem Specs & Code Editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problem Description Drawer */}
              <Card
                className={`p-6 border-none shadow-lg bg-white dark:bg-gray-900 space-y-4 ${
                  duelMobileTab === 'problem' ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {match.problem.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {match.problem.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {match.problem.category}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {match.problem.description}
                </p>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl font-mono text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200">Constraints:</strong>
                  <br />
                  {match.problem.constraints}
                </div>
              </Card>

              {/* Code Editor */}
              <Card
                className={`p-6 border-none shadow-xl bg-white dark:bg-gray-900 space-y-4 ${
                  duelMobileTab === 'code' ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Your Solution
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedLanguage('javascript')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg ${
                        selectedLanguage === 'javascript'
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      JavaScript
                    </button>
                    <button
                      onClick={() => setSelectedLanguage('python')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg ${
                        selectedLanguage === 'python'
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Python
                    </button>
                  </div>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  className="w-full h-80 p-4 rounded-2xl bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed border-2 border-gray-800 focus:border-rose-500 focus:outline-none resize-none shadow-inner"
                  placeholder="// Implement your solution here..."
                  spellCheck={false}
                />

                {/* Action Dock */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                    {isRunningTests ? 'Executing Sandbox...' : 'Run Test Cases'}
                  </button>

                  <button
                    onClick={() => handleMatchSolutionSubmit(false)}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? 'Evaluating...' : 'Submit Final Solution'}
                  </button>
                </div>
              </Card>

              {/* Test Results Output */}
              {testResults.length > 0 && (
                <Card
                  className={`p-6 border-none shadow-lg bg-white dark:bg-gray-900 space-y-3 ${
                    duelMobileTab === 'code' ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-500" />
                    Sandbox Execution Results ({userTestsPassed}/{testResults.length} Passed)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {testResults.map((r, i) => (
                      <div
                        key={r.id}
                        className={`p-3 rounded-xl border text-xs font-mono ${
                          r.passed
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 font-bold">
                          <span>Test Case #{i + 1}</span>
                          <span>{r.passed ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        <p className="text-[11px] opacity-80 truncate">Input: {r.input}</p>
                        <p className="text-[11px] opacity-80 truncate">Expected: {r.expected}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Opponent Telemetry HUD & Emotes */}
            <div className={`space-y-6 ${duelMobileTab === 'telemetry' ? 'block' : 'hidden lg:block'}`}>
              {/* Opponent Live Telemetry Card */}
              <Card className="p-6 border-none shadow-xl bg-white dark:bg-gray-900 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">
                    Opponent Telemetry
                  </h4>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="text-center space-y-2">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-4xl shadow-lg">
                    {opponentState?.avatar || '🤖'}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {opponentState?.username || 'Opponent'}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-purple-50 dark:bg-purple-900/30 text-purple-500">
                    Status: {opponentStatus} {opponentKeystrokes > 0 ? `(${opponentKeystrokes} keys)` : ''}
                  </span>
                </div>

                {/* Opponent Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Tests Solved</span>
                    <span className="text-purple-500 font-bold">
                      {opponentTestsPassed}/{match.problem.testCases.length}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(opponentTestsPassed / match.problem.testCases.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Live Activity Pulse Indicator */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      Typing Activity
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                    Active Code Flow
                  </span>
                </div>
              </Card>

              {/* Live Competitive Emotes Dock */}
              <Card className="p-6 border-none shadow-lg bg-white dark:bg-gray-900 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                  Arena Emotes Dock
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {['🔥', '⚡', '🧠', '😅', '👏', 'GG'].map(emote => (
                    <button
                      key={emote}
                      onClick={() => handleSendEmote(emote)}
                      className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-xl font-bold transition-transform hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {emote}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Leave / Surrender Button */}
              <button
                onClick={() => {
                  emit('duel-surrender', { roomId: `duel-${match.id}` })
                  setActiveTab('lobby')
                }}
                className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 hover:text-rose-500 hover:border-rose-500 transition-colors"
              >
                Forfeit & Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. POST-MATCH VICTORY / DEFEAT MODAL                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {matchFinishedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl text-center space-y-6"
            >
              <div
                className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-5xl shadow-xl ${
                  matchFinishedResult.isWinner
                    ? 'bg-gradient-to-tr from-amber-400 to-rose-500 text-white shadow-rose-500/30'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {matchFinishedResult.isWinner ? '🏆' : '💀'}
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                  {matchFinishedResult.isWinner ? 'VICTORY!' : 'DEFEAT'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {matchFinishedResult.isWinner
                    ? 'Outstanding algorithm speed and correctness!'
                    : 'A hard fought duel. Review solution and sharpen skills!'}
                </p>
              </div>

              {/* Rating Adjustment Breakdown */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Rating Adjustment
                </p>
                <p
                  className={`text-3xl font-black tabular-nums ${
                    matchFinishedResult.eloDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {matchFinishedResult.eloDelta >= 0
                    ? `+${matchFinishedResult.eloDelta}`
                    : matchFinishedResult.eloDelta}{' '}
                  Elo
                </p>
                <p className="text-[11px] text-gray-400">
                  New Rating: <strong>{playerProfile.elo + matchFinishedResult.eloDelta}</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMatchFinishedResult(null)
                    handleStartQueue(false)
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
                <button
                  onClick={() => {
                    setMatchFinishedResult(null)
                    setMatch(null)
                    setActiveTab('lobby')
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold transition-all"
                >
                  Return to Lobby
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. LEADERBOARD VIEW                                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <Card className="p-8 border-none shadow-xl bg-white dark:bg-gray-900 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Global Arena Grandmasters
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Top rated competitive algorithm duelists ranked by FIDE-calibrated Elo
              </p>
            </div>
            <button
              onClick={() => setActiveTab('lobby')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300"
            >
              Back to Lobby
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(leaderboardData || []).map((entry, idx) => (
              <div
                key={entry.userId}
                className="py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-3 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-7 text-center font-black text-sm ${
                      idx === 0
                        ? 'text-amber-500'
                        : idx === 1
                          ? 'text-slate-400'
                          : idx === 2
                            ? 'text-amber-700'
                            : 'text-gray-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {entry.username.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {entry.username}
                    </p>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {entry.tier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {entry.wins}W - {entry.losses}L
                    </p>
                    <p className="text-[10px] text-emerald-500 font-bold">
                      {Math.round((entry.wins / Math.max(1, entry.wins + entry.losses)) * 100)}% Win
                      Rate
                    </p>
                  </div>
                  <div>
                    <span className="text-base font-black text-rose-500 tabular-nums">
                      {entry.elo}
                    </span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Elo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Match Intro Versus Countdown Overlay (Glassmorphic) ────── */}
      <AnimatePresence>
        {matchIntroCountdown !== null && match && (
          <motion.div
            data-testid="arena-versus-countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-2xl flex flex-col items-center text-center">
              {/* Problem Preview Badge */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-6 shadow-inner"
              >
                <Swords className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Duel Challenge: {match.problem.title} ({match.problem.difficulty})</span>
              </motion.div>

              {/* Matchup Showcase: Player 1 VS Player 2 */}
              <div className="grid grid-cols-5 items-center gap-4 w-full mb-8">
                {/* Player 1 Card */}
                <motion.div
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="col-span-2 p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900/80 border border-indigo-500/30 shadow-2xl backdrop-blur-md flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl mb-3 shadow-lg ring-2 ring-indigo-500/20">
                    👨‍💻
                  </div>
                  <h3 className="text-base font-bold text-white truncate max-w-[140px]">
                    {playerProfile.username}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-semibold text-indigo-400">{playerProfile.tier}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-black text-rose-400">{playerProfile.elo} Elo</span>
                  </div>
                  <div className="mt-3 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Win: +26 Elo
                  </div>
                </motion.div>

                {/* VS Emblem & Pulsing Countdown */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <motion.div
                    key={matchIntroCountdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1.2, 1], opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="relative flex items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 ring-4 ring-rose-500/20">
                      <span className="text-3xl font-black tracking-wider">
                        {matchIntroCountdown > 0 ? matchIntroCountdown : 'GO!'}
                      </span>
                    </div>
                  </motion.div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                    {matchIntroCountdown > 0 ? 'READY' : 'DUEL!'}
                  </span>
                </div>

                {/* Opponent Card */}
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="col-span-2 p-5 rounded-2xl bg-gradient-to-br from-rose-950/60 to-slate-900/80 border border-rose-500/30 shadow-2xl backdrop-blur-md flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-2xl mb-3 shadow-lg ring-2 ring-rose-500/20">
                    {opponentState?.avatar || '🤖'}
                  </div>
                  <h3 className="text-base font-bold text-white truncate max-w-[140px]">
                    {opponentState?.username || 'Opponent'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-semibold text-rose-400">{opponentState?.tier || 'SILVER'}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-black text-amber-400">{opponentState?.elo || 1250} Elo</span>
                  </div>
                  <div className="mt-3 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Loss: -14 Elo
                  </div>
                </motion.div>
              </div>

              {/* Stakes & Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMatchIntroCountdown(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
                >
                  Skip Countdown →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}
