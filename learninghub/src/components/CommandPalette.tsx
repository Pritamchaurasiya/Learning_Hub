import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  BookOpen,
  Code2,
  Swords,
  Award,
  Layers,
  BarChart3,
  Calendar,
  MessageSquare,
  Radio,
  FileDown,
  Shield,
  Settings,
  Sparkles,
  Zap,
  ArrowRight,
  X,
  RotateCcw,
  BellRing,
  Bookmark,
  Trophy,
  FileText,
  Cpu,
  PenTool,
  Activity,
  Bug,
  Gauge,
  Server,
  Wand2,
  Flame,
} from 'lucide-react'

interface CommandItem {
  id: string
  title: string
  description: string
  category: 'Navigation' | 'Practice' | 'Tools' | 'Community' | 'Admin'
  icon: typeof BookOpen
  path: string
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Overview of your learning streak, XP, and weekly goals',
    category: 'Navigation',
    icon: BarChart3,
    path: '/dashboard',
    keywords: ['home', 'overview', 'stats', 'streak'],
  },
  {
    id: 'nav-library',
    title: 'Course Library',
    description: 'Explore curated courses across Mathematics, CS, and Sciences',
    category: 'Navigation',
    icon: BookOpen,
    path: '/library',
    keywords: ['courses', 'subjects', 'syllabus', 'lessons'],
  },
  {
    id: 'nav-study-planner',
    title: 'Study Planner',
    description: 'AI-generated study roadmap, daily milestones, and countdowns',
    category: 'Navigation',
    icon: Calendar,
    path: '/study-planner',
    keywords: ['schedule', 'tasks', 'roadmap', 'calendar', 'curriculum', 'syllabus', 'pacing'],
  },
  {
    id: 'nav-updates',
    title: 'Student Updates & Circulars',
    description: 'Official notifications, exam dates, deadlines, and syllabus circulars',
    category: 'Navigation',
    icon: BellRing,
    path: '/updates',
    keywords: ['updates', 'notices', 'circulars', 'announcements', 'deadlines', 'dates', 'news'],
  },
  {
    id: 'nav-bookmarks',
    title: 'Saved Bookmarks',
    description: 'Quick access to your saved problems, questions, and course notes',
    category: 'Navigation',
    icon: Bookmark,
    path: '/bookmarks',
    keywords: ['bookmarks', 'saved', 'favorites', 'stars'],
  },
  {
    id: 'practice-problems',
    title: 'DSA Problems',
    description: 'Solve coding problems with interactive editor and test cases',
    category: 'Practice',
    icon: Code2,
    path: '/problems',
    keywords: ['leetcode', 'code', 'dsa', 'algorithms', 'python', 'javascript', 'cpp'],
  },
  {
    id: 'practice-arena-duel',
    title: '1v1 Arena Duel',
    description: 'Real-time 1v1 algorithm battle with Elo rating & live telemetry',
    category: 'Practice',
    icon: Swords,
    path: '/arena',
    keywords: ['duel', '1v1', 'arena', 'elo', 'versus', 'battle', 'pvp', 'ghost', 'multiplayer'],
  },
  {
    id: 'practice-interview-simulator',
    title: 'AI Technical Interview Simulator',
    description: 'Real-time audio & coding mock interview with dual Staff & Algo AI personas',
    category: 'Practice',
    icon: Sparkles,
    path: '/interview',
    keywords: ['interview', 'mock', 'faang', 'system design', 'alex', 'sophia', 'rubric', 'audio', 'voice'],
  },
  {
    id: 'tool-verifiable-resume',
    title: 'Verifiable AI Resume & Career Portfolio',
    description: 'ATS-optimized career resume synthesizing Arena Elo, BKT mastery & W3C DID credentials',
    category: 'Practice',
    icon: FileText,
    path: '/resume',
    keywords: ['resume', 'cv', 'ats', 'portfolio', 'did', 'w3c', 'career', 'credentials', 'hiring', 'verifiable'],
  },
  {
    id: 'practice-revision',
    title: 'Spaced Revision Hub',
    description: 'SuperMemo SM-2+ spaced repetition flashcards & targeted mistake remediation',
    category: 'Practice',
    icon: RotateCcw,
    path: '/revision',
    keywords: ['flashcards', 'revision', 'supermemo', 'spaced repetition', 'memory', 'formulas', 'mistakes'],
  },
  {
    id: 'practice-tests',
    title: 'Adaptive Mock Tests',
    description: 'Computerized Adaptive Tests (CAT/IRT) for JEE, NEET & SAT',
    category: 'Practice',
    icon: Award,
    path: '/tests-a',
    keywords: ['exam', 'mock', 'irt', 'quiz', 'test', 'jee', 'neet'],
  },
  {
    id: 'practice-contests',
    title: 'Live Contests',
    description: 'Compete in timed coding and examination contests',
    category: 'Practice',
    icon: Zap,
    path: '/contest',
    keywords: ['contest', 'competition', 'live', 'ranking', 'leaderboard'],
  },
  {
    id: 'tool-edge-ai',
    title: 'Edge AI Offline Studio',
    description: '100% on-device private micro-inference powered by WebGPU compute shaders',
    category: 'Tools',
    icon: Cpu,
    path: '/edge-ai',
    keywords: ['edge', 'webgpu', 'offline', 'local', 'air-gapped', 'slm', 'qwen', 'llama', 'phi', 'smollm'],
  },
  {
    id: 'tool-neuro-flow',
    title: 'Neuro-Adaptive Flow State Optimizer',
    description: 'Biometric cognitive load estimation, keystroke cadence dynamics & autonomic micro-breaks',
    category: 'Tools',
    icon: Activity,
    path: '/neuro-study',
    keywords: ['neuro', 'flow', 'biofeedback', 'cognitive', 'fatigue', 'sweller', 'keystroke', 'cadence', 'load'],
  },
  {
    id: 'tool-time-travel-debugger',
    title: 'Time-Travel Execution Debugger',
    description: 'Omniscient step-by-step memory trace scrubber, live call stack inspection, and invariant detection',
    category: 'Tools',
    icon: Bug,
    path: '/debugger',
    keywords: ['debugger', 'time travel', 'trace', 'heap', 'stack', 'variables', 'inspect', 'invariants', 'step'],
  },
  {
    id: 'tool-complexity-profiler',
    title: 'Empirical Complexity & Big-O Benchmark Lab',
    description: 'Empirical algorithm scaling profiler, non-linear regression curves, bottleneck detection, and SLA projections',
    category: 'Tools',
    icon: Gauge,
    path: '/profiler',
    keywords: ['complexity', 'profiler', 'big o', 'asymptotic', 'benchmark', 'latency', 'sla', 'regression', 'scale'],
  },
  {
    id: 'tool-system-design',
    title: 'Distributed System Design & Chaos Simulator',
    description: 'Interactive C4 topology canvas, Little’s Law queueing dynamics, CAP theorem audits, and fault injection',
    category: 'Tools',
    icon: Server,
    path: '/system-design',
    keywords: ['system design', 'architecture', 'chaos', 'distributed', 'c4', 'topology', 'spof', 'latency', 'cap', 'redis', 'kafka', 'database'],
  },
  {
    id: 'tool-chaos-cluster',
    title: 'Chaos Engineering Sandbox & Cluster Fault Injection',
    description: 'Simulate network partitions, latency spikes, packet loss, thread exhaustion, and circuit breakers',
    category: 'Tools',
    icon: Flame,
    path: '/chaos',
    keywords: ['chaos', 'fault injection', 'network partition', 'circuit breaker', 'resilience', 'sre', 'cluster', 'slo'],
  },
  {
    id: 'tool-zkp-attestation',
    title: 'Zero-Knowledge Skill Attestation & Soulbound Tokens',
    description: 'BN128 Groth16 zero-knowledge proofs, private threshold verification & ERC-5192 Soulbound Tokens',
    category: 'Tools',
    icon: Shield,
    path: '/zkp',
    keywords: ['zkp', 'zero knowledge', 'snark', 'groth16', 'soulbound', 'sbt', 'erc5192', 'attestation', 'proof', 'bn128', 'web3'],
  },
  {
    id: 'tool-self-healing',
    title: 'Autonomous AI Self-Healing Code Studio',
    description: 'Static AST anti-pattern scanner, automated N+1 query and SQLi patch synthesis, and regression verifier',
    category: 'Tools',
    icon: Wand2,
    path: '/self-healing',
    keywords: ['self healing', 'refactor', 'patch', 'ast', 'n+1', 'sqli', 'memory leak', 'owasp', 'security', 'clean code'],
  },
  {
    id: 'tool-crdt-collab',
    title: 'P2P CRDT Collaborative Whiteboard & Canvas',
    description: 'Decentralized peer-to-peer real-time whiteboard, Lamport vector clocks, and WebRTC collaboration',
    category: 'Tools',
    icon: Layers,
    path: '/crdt',
    keywords: ['crdt', 'collab', 'whiteboard', 'canvas', 'webrtc', 'p2p', 'lamport', 'decentralized', 'drawing', 'code'],
  },
  {
    id: 'tool-agent-debate',
    title: 'Autonomous Multi-Agent AI Debate & RFC Council',
    description: 'Adversarial architectural dialectical review, Pareto frontier consensus & signed RFC generator',
    category: 'Tools',
    icon: MessageSquare,
    path: '/debate',
    keywords: ['debate', 'council', 'rfc', 'architecture', 'pareto', 'consensus', 'byzantine', 'review', 'tradeoff'],
  },
  {
    id: 'tool-multimodal-studio',
    title: 'Voice, Vision & Interactive Canvas Studio',
    description: 'Multi-modal AI tutoring with LaTeX math parsing, sub-300ms audio dialogue, and gaze tracking',
    category: 'Tools',
    icon: Sparkles,
    path: '/multimodal-studio',
    keywords: ['multimodal', 'voice', 'vision', 'canvas', 'whiteboard', 'gaze', 'latex', 'math', 'ocr', 'audio'],
  },
  {
    id: 'tool-canvas-studio',
    title: 'Interactive Canvas & AI Proctor Studio',
    description: 'Vector whiteboard, LaTeX OCR math recognition, and live vision/audio proctoring',
    category: 'Tools',
    icon: PenTool,
    path: '/canvas',
    keywords: ['canvas', 'whiteboard', 'blackboard', 'math', 'latex', 'ocr', 'graph', 'proctor', 'vision', 'drawing'],
  },
  {
    id: 'tool-ai-tutor',
    title: 'AI Tutor',
    description: 'Ask questions, debug code, and explore concepts with AI',
    category: 'Tools',
    icon: Sparkles,
    path: '/ai-tutor',
    keywords: ['chat', 'gemini', 'socratic', 'assistant', 'explain', 'help'],
  },
  {
    id: 'tool-algo-visualizer',
    title: 'Algorithm Visualizer',
    description: 'Interactive Sorting, Pathfinding, Tree, and DP visualizers',
    category: 'Tools',
    icon: Layers,
    path: '/visualizer',
    keywords: ['sorting', 'dijkstra', 'trees', 'knapsack', 'lcs', 'edit distance'],
  },
  {
    id: 'tool-downloads',
    title: 'Offline Downloads',
    description: 'Access revision notes and offline PWA learning assets',
    category: 'Tools',
    icon: FileDown,
    path: '/downloads',
    keywords: ['offline', 'pdf', 'notes', 'revision'],
  },
  {
    id: 'comm-discussions',
    title: 'Discussions Forum',
    description: 'Ask doubts, share solutions, and discuss with peers',
    category: 'Community',
    icon: MessageSquare,
    path: '/discussions',
    keywords: ['forum', 'community', 'help', 'doubt', 'threads'],
  },
  {
    id: 'comm-live-classes',
    title: 'Live Classes',
    description: 'Attend live lectures with chat and interactive whiteboard',
    category: 'Community',
    icon: Radio,
    path: '/live-class',
    keywords: ['stream', 'lecture', 'mentor', 'video', 'session'],
  },
  {
    id: 'comm-leaderboard',
    title: 'Global Leaderboard',
    description: 'Check global XP rankings, division tiers, and active streaks',
    category: 'Community',
    icon: Award,
    path: '/leaderboard',
    keywords: ['rank', 'xp', 'leaderboard', 'streaks', 'gamification'],
  },
  {
    id: 'comm-achievements',
    title: 'Badges & Achievements',
    description: 'View unlocked badges, XP progression milestones, and streak trophies',
    category: 'Community',
    icon: Trophy,
    path: '/achievements',
    keywords: ['achievements', 'badges', 'trophies', 'xp', 'rewards', 'milestones'],
  },
  {
    id: 'admin-panel',
    title: 'Admin Control Center',
    description: 'Platform metrics, user management, and AI telemetry',
    category: 'Admin',
    icon: Shield,
    path: '/admin',
    keywords: ['admin', 'users', 'telemetry', 'analytics', 'audit'],
  },
  {
    id: 'settings-page',
    title: 'Settings & Security',
    description: 'Manage MFA, passkeys, themes, and notification preferences',
    category: 'Admin',
    icon: Settings,
    path: '/settings',
    keywords: ['theme', 'mfa', 'password', 'profile', 'preferences'],
  },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter(cmd => {
      const matchTitle = cmd.title.toLowerCase().includes(q)
      const matchDesc = cmd.description.toLowerCase().includes(q)
      const matchCategory = cmd.category.toLowerCase().includes(q)
      const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(q))
      return matchTitle || matchDesc || matchCategory || matchKeywords
    }).sort((a, b) => {
      // Prioritize exact or prefix title matches
      const score = (cmd: CommandItem) => {
        const titleLower = cmd.title.toLowerCase()
        if (titleLower === q) return 100
        if (titleLower.startsWith(q)) return 80
        if (titleLower.includes(q)) return 60
        if (cmd.keywords?.some(k => k.toLowerCase() === q)) return 50
        if (cmd.keywords?.some(k => k.toLowerCase().includes(q))) return 40
        return 20
      }
      return score(b) - score(a)
    })
  }, [query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      setIsOpen(false)
      navigate(cmd.path)
    },
    [navigate]
  )

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(
        prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length)
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex])
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-10"
          >
            <div className="flex items-center px-4 py-3.5 border-b border-gray-200 dark:border-gray-800 gap-3">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-controls="command-list"
                aria-autocomplete="list"
                placeholder="Type a command or search (e.g. AI Tutor, Knapsack, Problems)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px]">
                  ESC
                </kbd>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close command palette"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={listRef}
              id="command-list"
              role="listbox"
              aria-label="Command suggestions"
              className="max-h-[380px] overflow-y-auto p-2 divide-y divide-gray-100 dark:divide-gray-800/50 custom-scrollbar"
            >
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <p className="text-sm font-medium">No results found for &rdquo;{query}&ldquo;</p>
                  <p className="text-xs mt-1">Try searching for courses, problems, or tools.</p>
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold truncate">{cmd.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {cmd.category}
                        </span>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">
                    ↓
                  </kbd>{' '}
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">
                    ↵
                  </kbd>{' '}
                  Open
                </span>
              </div>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                LearningHub Quick Switcher
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
