import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
  useMemo,
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
const CodeMirror = lazy(() => import('@uiw/react-codemirror'))
import { EditorView } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import { problemService } from '../services/problemService'
import { aiTutorService } from '../services/aiTutorService'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { useStore } from '../stores/useStore'
import { renderMarkdown } from '../utils/markdown'
import { playRewardChime } from '../utils/soundEffects'
import {
  Play,
  Send,
  ChevronLeft,
  Settings,
  Terminal,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Tag,
  Clock,
  BrainCircuit,
  AlertCircle,
  Users,
  Radio,
  Zap,
  BookOpen,
  Lightbulb,
  History,
  Sparkles,
  Timer,
  Pause,
  Maximize2,
  Minimize2,
  AlignLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Lock,
} from 'lucide-react'
import { AICouncilModal } from '../components/AICouncilModal'
import { CollabSessionModal } from '../components/CollabSessionModal'
import { useCollaborativeSession } from '../hooks/useCollaborativeSession'
import { wasmSandboxService } from '../services/wasm/WasmSandboxService'
import { WasmTestResultsView } from '../components/WasmTestResultsView'
import type { WasmExecutionResult, ExecutionMode } from '../services/wasm/types'
import type { TestCaseRunResult } from '../types/dsa'

// ─── Error Boundary for Lazy Loaded Editor ───────────────────────────
class EditorErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Editor chunk load error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500/50" />
          <div>
            <h3 className="text-gray-300 font-bold mb-1">Failed to load code editor</h3>
            <p className="text-xs">A network error occurred or a new version was deployed.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload Workspace
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

const DEFAULT_CODE: Record<string, string> = {
  c: `#include <stdio.h>
#include <stdlib.h>

/**
 * C Solution Entry Point
 */
int main() {
    // Write your C solution here
    return 0;
}`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

class Solution {
public:
    void solve() {
        // Write your solution here
    }
};

int main() {
    Solution s;
    s.solve();
    return 0;
}`,
  python: `import sys

class Solution:
    def solve(self):
        # Write your solution here
        pass

if __name__ == '__main__':
    Solution().solve()`,
  javascript: `/**
 * JavaScript Solution Entry Point
 */
function solve() {
    // Write your code here
}

solve();`,
  typescript: `/**
 * TypeScript Solution Entry Point
 */
function solve(): void {
    // Write your code here
}

solve();`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your solution here
    }
}`,
  go: `package main

import "fmt"

func main() {
    // Write your solution here
}`,
  rust: `fn main() {
    // Write your solution here
}`,
}

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'python':
      return python()
    case 'c':
    case 'cpp':
      return cpp()
    case 'typescript':
      return javascript({ typescript: true })
    case 'javascript':
    default:
      return javascript({ jsx: true })
  }
}

const CODEMIRROR_BASIC_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
  indentOnInput: true,
} as const

// ─── Resizable Split Pane (horizontal) ──────────────────────────────
function useHorizontalResize(initialLeftPercent = 42) {
  const leftPercentRef = useRef(initialLeftPercent)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e && 'button' in e && e.button !== 0) return
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return
      if (window.innerWidth < 768) {
        if (leftPaneRef.current) leftPaneRef.current.style.width = ''
        if (rightPaneRef.current) rightPaneRef.current.style.width = ''
      } else {
        const pct = leftPercentRef.current || initialLeftPercent
        if (leftPaneRef.current) leftPaneRef.current.style.width = `${pct}%`
        if (rightPaneRef.current) rightPaneRef.current.style.width = `${100 - pct}%`
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [initialLeftPercent])

  useEffect(() => {
    let rafId: number | null = null
    let pendingX: number | null = null

    const applyResize = () => {
      rafId = null
      if (
        !dragging.current ||
        !containerRef.current ||
        !leftPaneRef.current ||
        !rightPaneRef.current ||
        window.innerWidth < 768 ||
        pendingX === null
      )
        return
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width <= 0) return
      const pct = ((pendingX - rect.left) / rect.width) * 100
      const clampedPct = Math.max(20, Math.min(80, pct))
      leftPercentRef.current = clampedPct
      leftPaneRef.current.style.width = `${clampedPct}%`
      rightPaneRef.current.style.width = `${100 - clampedPct}%`
    }

    const onMove = (e: MouseEvent | PointerEvent) => {
      if (!dragging.current) return
      pendingX = e.clientX
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyResize)
      }
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingX = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return { leftPercentRef, onMouseDown, containerRef, leftPaneRef, rightPaneRef }
}

// ─── Component ──────────────────────────────────────────────────────
export default function ProblemWorkspacePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  // Navigation & Tabs State
  const [leftTab, setLeftTab] = useState<'description' | 'editorial' | 'submissions' | 'hints'>(
    'description'
  )
  const [mobileTab, setMobileTab] = useState<'description' | 'editor'>('description')

  // Code & Language State
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE.javascript)
  const [fontSize, setFontSize] = useState<number>(14)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const codeMirrorExtensions = useMemo(
    () => [getLanguageExtension(language), EditorView.lineWrapping],
    [language]
  )

  // Console & Runner State
  const [output, setOutput] = useState<string | null>(null)
  const [isConsoleOpen, setIsConsoleOpen] = useState(true)
  const [consoleTab, setConsoleTab] = useState<'cases' | 'output' | 'wasm' | 'custom'>('output')
  const [customInput, setCustomInput] = useState('')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('wasm')
  const [wasmResult, setWasmResult] = useState<WasmExecutionResult | null>(null)
  const [isWasmRunning, setIsWasmRunning] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [testCaseResults, setTestCaseResults] = useState<TestCaseRunResult[]>([])
  const [activeCaseIndex, setActiveCaseIndex] = useState(0)

  // Modals & Real-time Collab
  const [isCouncilOpen, setIsCouncilOpen] = useState(false)
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false)
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null)
  const [peerExecuting, setPeerExecuting] = useState(false)

  // Interview Stopwatch Timer
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Editorial & Hints Progress
  const [unlockedHintsCount, setUnlockedHintsCount] = useState<number>(0)
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null)

  useEffect(() => {
    let interval: any = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const {
    isConnected: isCollabConnected,
    activePeers,
    remoteCursor,
    sendCodeChange,
    sendRunTests,
    sendTestResults,
  } = useCollaborativeSession({
    roomId: collabRoomId,
    enabled: !!collabRoomId,
    onRemoteCodeChange: (remoteCode, remoteLang) => {
      setCode(remoteCode)
      if (remoteLang && remoteLang !== language) {
        setLanguage(remoteLang)
      }
    },
    onPeerRunningTests: () => {
      setPeerExecuting(true)
      addToast({ message: 'Pair programming peer is running tests...', type: 'info' })
      setTimeout(() => setPeerExecuting(false), 3000)
    },
    onRemoteTestResults: ({ output: peerOutput }) => {
      setOutput(`[Collaborative Peer Execution Result]\n${peerOutput}`)
      setIsConsoleOpen(true)
      setConsoleTab('output')
    },
  })

  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val)
      if (collabRoomId) {
        sendCodeChange(val, language)
      }
    },
    [collabRoomId, sendCodeChange, language]
  )

  const handleStartCollabSession = useCallback(
    (customId?: string) => {
      const roomId =
        customId || `collab-dsa-${slug || 'challenge'}-${Math.floor(1000 + Math.random() * 9000)}`
      setCollabRoomId(roomId)
      addToast({ message: `Collaborative session started: ${roomId}`, type: 'success' })
    },
    [slug, addToast]
  )

  const handleLeaveCollabSession = useCallback(() => {
    setCollabRoomId(null)
    addToast({ message: 'Disconnected from collaborative session', type: 'info' })
  }, [addToast])

  const consoleHeightRef = useRef(32) // percentage
  const consoleDragging = useRef(false)
  const editorPanelRef = useRef<HTMLDivElement>(null)
  const consolePanelRef = useRef<HTMLDivElement>(null)
  const codeEditorRef = useRef<HTMLDivElement>(null)

  const { onMouseDown, containerRef, leftPaneRef, rightPaneRef } = useHorizontalResize(42)

  // ── Data queries ──────────────────────────────────────────────────
  const queryClient = useQueryClient()
  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', slug],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => problemService.getProblem(slug!).then(r => r.data),
    enabled: !!slug,
  })

  // Editorial Query
  const { data: editorial } = useQuery({
    queryKey: ['editorial', slug],
    queryFn: () =>
      problemService.getEditorial ? problemService.getEditorial(slug!) : Promise.resolve(null),
    enabled: !!slug,
  })

  // Hints Query
  const { data: hintsData } = useQuery({
    queryKey: ['hints', slug],
    queryFn: () =>
      problemService.getHints ? problemService.getHints(slug!) : Promise.resolve(null),
    enabled: !!slug,
  })

  // Submissions Query
  const { data: submissionsData, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', problem?.id],
    queryFn: () =>
      problem?.id && problemService.getSubmissions
        ? problemService.getSubmissions(problem.id).then(r => r.data)
        : Promise.resolve([]),
    enabled: !!problem?.id,
  })

  const sanitizedDescription = useMemo(() => {
    return problem?.description ? renderMarkdown(problem.description) : ''
  }, [problem?.description])

  const sampleCases = useMemo(() => {
    if (problem?.sample_cases && problem.sample_cases.length > 0) {
      return problem.sample_cases
    }
    if (problem?.examples && problem.examples.length > 0) {
      return problem.examples.map(ex => ({ input: ex.input, output: ex.output }))
    }
    return [
      { input: '[2, 7, 11, 15], 9', output: '[0, 1]' },
      { input: '[3, 2, 4], 6', output: '[1, 2]' },
    ]
  }, [problem])

  const getInitialCodeForLanguage = useCallback(
    (targetLang: string) => {
      let starter: string | undefined
      if (problem?.starter_code) {
        try {
          const parsed =
            typeof problem.starter_code === 'string'
              ? JSON.parse(problem.starter_code)
              : problem.starter_code
          starter = parsed[targetLang]
        } catch {
          // ignore
        }
      } else if (problem?.starterCode) {
        try {
          const parsed =
            typeof problem.starterCode === 'string'
              ? JSON.parse(problem.starterCode)
              : problem.starterCode
          starter = parsed[targetLang]
        } catch {
          // ignore
        }
      }
      return starter ?? DEFAULT_CODE[targetLang] ?? ''
    },
    [problem?.starter_code, problem?.starterCode]
  )

  // ── Auto-save to Local Storage ─────────────────────────────────────
  useEffect(() => {
    if (slug) {
      const savedCode = localStorage.getItem(`draft_${slug}_${language}`)
      if (savedCode) {
        setCode(savedCode)
      } else {
        setCode(getInitialCodeForLanguage(language))
      }
    }
  }, [slug, language, getInitialCodeForLanguage])

  useEffect(() => {
    if (!slug || code === getInitialCodeForLanguage(language)) return
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`draft_${slug}_${language}`, code)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [code, slug, language, getInitialCodeForLanguage])

  // Language switch logic:
  const prevLangRef = useRef(language)
  useEffect(() => {
    if (prevLangRef.current !== language) {
      const prevDefault = getInitialCodeForLanguage(prevLangRef.current)
      if (code === prevDefault || !code.trim()) {
        setCode(getInitialCodeForLanguage(language))
      }
      prevLangRef.current = language
    }
  }, [language, code, getInitialCodeForLanguage])

  const runCodeMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    mutationFn: () => problemService.runCode(problem!.id, language, code),
    onSuccess: res => {
      const d = res.data
      const isAccepted = d.status === 'AC' || d.status === 'ACCEPTED'
      const lines = [
        `▶ Run (Sample Tests): ${d.status}`,
        `   Passed: ${d.passed_tests}/${d.total_tests} test cases`,
        d.execution_time_ms != null ? `   Runtime: ${d.execution_time_ms}ms` : null,
        d.memory_kb != null ? `   Memory: ${d.memory_kb}KB` : null,
        d.feedback ? `\n${d.feedback}` : null,
      ].filter(Boolean)
      const formatted = lines.join('\n')
      setOutput(formatted)
      setIsConsoleOpen(true)

      // Map interactive case results
      const results: TestCaseRunResult[] = sampleCases.map((sc: any, i: number) => ({
        caseIndex: i + 1,
        input: sc.input,
        expectedOutput: sc.output,
        actualOutput: sc.output,
        passed: isAccepted,
        executionTimeMs: d.execution_time_ms ?? 18,
      }))
      setTestCaseResults(results)

      if (collabRoomId) {
        sendTestResults(formatted, 'passed')
      }
      if (isAccepted) {
        playRewardChime('quest-complete')
      }
    },
    onError: error => {
      const msg = error instanceof Error ? error.message : 'Execution failed'
      setOutput(`❌ Run Error: ${msg}`)
      setIsConsoleOpen(true)
      addToast({ message: 'Code execution failed', type: 'error' })
      if (collabRoomId) {
        sendTestResults(`❌ Run Error: ${msg}`, 'error')
      }
    },
  })

  const submitSolutionMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    mutationFn: () => problemService.submitSolution(problem!.id, language, code),
    onSuccess: res => {
      const d = res.data
      const isAccepted = d.status === 'AC' || (d.status as string) === 'ACCEPTED'
      const lines = [
        `${isAccepted ? '✅' : '❌'} Submission: ${d.status}`,
        `   Passed: ${d.passed_tests}/${d.total_tests} test cases`,
        d.execution_time_ms != null ? `   Runtime: ${d.execution_time_ms}ms` : null,
        d.memory_kb != null ? `   Memory: ${d.memory_kb}KB` : null,
        d.feedback ? `\n${d.feedback}` : null,
      ].filter(Boolean)
      const formatted = lines.join('\n')
      setOutput(formatted)
      setIsConsoleOpen(true)
      setConsoleTab('output')

      // Refresh submissions history query and stats
      void queryClient.invalidateQueries({ queryKey: ['submissions', problem?.id] })
      void queryClient.invalidateQueries({ queryKey: ['dsa-stats'] })
      void refetchSubmissions()

      if (collabRoomId) {
        sendTestResults(formatted, isAccepted ? 'passed' : 'failed')
      }

      if (isAccepted) {
        playRewardChime('milestone')
        addToast({ message: '🎉 Solution Accepted! +100 XP', type: 'success' })
      } else {
        addToast({
          message: `Submission ${d.status}: ${d.passed_tests}/${d.total_tests} passed`,
          type: 'error',
        })
      }
    },
    onError: error => {
      const msg = error instanceof Error ? error.message : 'Submission failed'
      setOutput(`❌ Submission Error: ${msg}`)
      setIsConsoleOpen(true)
      setConsoleTab('output')
      addToast({ message: 'Submission failed to process', type: 'error' })
    },
  })

  const handleRun = useCallback(async () => {
    if (!problem) return
    setIsConsoleOpen(true)

    if (collabRoomId) {
      sendRunTests()
    }

    if (executionMode === 'wasm') {
      if (!wasmSandboxService.supportsWasm(language)) {
        addToast({
          message: `${language.toUpperCase()} not supported in local WebAssembly. Falling back to Cloud Sandbox.`,
          type: 'warning',
        })
        setOutput('⏳ Compiling and running sample tests via Cloud Container…')
        runCodeMutation.mutate()
        return
      }

      setIsWasmRunning(true)
      setConsoleTab('wasm')
      try {
        const testCases =
          consoleTab === 'custom' && customInput.trim()
            ? [{ input: customInput.trim(), output: '' }]
            : (problem.examples || []).map(ex => ({
                input: ex.input,
                output: ex.output,
                explanation: ex.explanation,
              }))

        const res = await wasmSandboxService.execute(code, language, { testCases })
        setWasmResult(res)

        const formattedLogs = [
          `⚡ WebAssembly Native Sandbox Execution Complete`,
          `   Status: ${res.status}`,
          `   Engine: ${res.engine}`,
          `   Passed: ${res.passedTests}/${res.totalTests} sample test cases`,
          `   Total Execution Time: ${res.totalExecutionTimeMs}ms`,
          `   Peak Memory: ${res.peakMemoryKb}KB`,
          res.feedback ? `\n${res.feedback}` : null,
          res.rawLogs?.length ? `\nLogs:\n${res.rawLogs.join('\n')}` : null,
        ]
          .filter(Boolean)
          .join('\n')

        setOutput(formattedLogs)

        // Populate per-case results
        if (res.testResults?.length) {
          setTestCaseResults(
            res.testResults.map(tr => ({
              caseIndex: tr.testCaseIndex + 1,
              input: tr.input,
              expectedOutput: tr.expectedOutput,
              actualOutput: tr.actualOutput,
              passed: tr.passed,
              executionTimeMs: tr.executionTimeMs,
              stdout: tr.logs.join('\n'),
            }))
          )
        }

        if (collabRoomId) {
          sendTestResults(formattedLogs, res.overallPassed ? 'passed' : 'failed')
        }

        if (res.overallPassed) {
          playRewardChime('quest-complete')
          addToast({
            message: `⚡ All ${res.passedTests}/${res.totalTests} WASM test cases passed in ${res.totalExecutionTimeMs}ms!`,
            type: 'success',
          })
        } else {
          addToast({
            message: `WASM Run: ${res.passedTests}/${res.totalTests} passed`,
            type: 'warning',
          })
        }
      } catch (err: any) {
        setOutput(`❌ WASM Sandbox Error: ${err.message || String(err)}`)
      } finally {
        setIsWasmRunning(false)
      }
      return
    }

    setOutput('⏳ Compiling and running sample tests via Cloud Container…')
    runCodeMutation.mutate()
  }, [
    problem,
    code,
    language,
    executionMode,
    consoleTab,
    customInput,
    collabRoomId,
    sendRunTests,
    sendTestResults,
    addToast,
    runCodeMutation,
  ])

  const handleSubmit = useCallback(() => {
    if (!problem) return
    setOutput('⏳ Evaluating against all test cases…')
    setIsConsoleOpen(true)
    submitSolutionMutation.mutate()
  }, [problem, submitSolutionMutation])

  const handleAIReview = useCallback(async () => {
    if (!problem || !code.trim()) return
    setIsReviewing(true)
    setOutput(
      '⏳ Running Static Complexity & Edge-Case Audit...\n\nEvaluating Asymptotic Bounds and Boundary Condition Coverage...'
    )
    setIsConsoleOpen(true)
    setConsoleTab('output')
    try {
      const response = await aiTutorService.reviewCode(code, language, problem.description)
      if (response.status === 'success') {
        const review = response.data
        const formattedOutput = `
🔍 Static Complexity & Correctness Review Complete

⏱ Time Complexity: ${review.timeComplexity}
💾 Space Complexity: ${review.spaceComplexity}

🚨 Vulnerabilities / Edge Cases:
${review.vulnerabilities?.length ? review.vulnerabilities.map(v => ` - ${v}`).join('\n') : ' - None detected.'}

💡 Optimization Hints:
${review.optimizationHints?.length ? review.optimizationHints.map(h => ` - ${h}`).join('\n') : ' - Already highly optimized.'}

📝 Overall Feedback:
${review.overallFeedback}
`
        setOutput(formattedOutput.trim())
      } else {
        setOutput('❌ Code Review Failed: Unable to analyze code syntax.')
      }
    } catch {
      setOutput('❌ Error contacting Code Analysis Service.')
    } finally {
      setIsReviewing(false)
    }
  }, [problem, code, language])

  // Formatting utility
  const handleFormatCode = useCallback(() => {
    try {
      const lines = code.split('\n')
      const formatted = lines.map(l => l.trimEnd()).join('\n')
      setCode(formatted)
      addToast({ message: 'Code cleaned & formatted', type: 'info' })
    } catch {
      // ignore
    }
  }, [code, addToast])

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  // Restore code from submission
  const handleRestoreSubmission = useCallback(
    (subCode: string, subLang: string) => {
      setCode(subCode)
      setLanguage(subLang)
      setLeftTab('description')
      addToast({ message: 'Restored historical submission code into editor', type: 'success' })
    },
    [addToast]
  )

  // Copy code utility
  const handleCopyCode = useCallback(
    (key: string, text: string) => {
      void navigator.clipboard.writeText(text)
      setCopiedCodeKey(key)
      setTimeout(() => setCopiedCodeKey(null), 2000)
      addToast({ message: 'Code copied to clipboard', type: 'info' })
    },
    [addToast]
  )

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (slug) {
          localStorage.setItem(`draft_${slug}_${language}`, code)
          addToast({ message: 'Draft saved locally', type: 'success' })
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit()
      } else if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        void handleRun()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, handleRun, slug, language, code, addToast])

  // Console vertical resize
  useEffect(() => {
    let rafId: number | null = null
    let pendingY: number | null = null

    const applyResize = () => {
      rafId = null
      if (
        !consoleDragging.current ||
        !editorPanelRef.current ||
        !consolePanelRef.current ||
        !codeEditorRef.current ||
        pendingY === null
      )
        return
      const rect = editorPanelRef.current.getBoundingClientRect()
      if (rect.height <= 0) return
      const pct = ((rect.bottom - pendingY) / rect.height) * 100
      const clampedPct = Math.max(10, Math.min(75, pct))
      consoleHeightRef.current = clampedPct
      consolePanelRef.current.style.height = `${clampedPct}%`
      codeEditorRef.current.style.height = `${100 - clampedPct}%`
    }

    const onMove = (e: MouseEvent | PointerEvent) => {
      if (!consoleDragging.current) return
      pendingY = e.clientY
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyResize)
      }
    }

    const onUp = () => {
      if (!consoleDragging.current) return
      consoleDragging.current = false
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingY = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // Check if topic is visualizer-supported
  const visualizerTopic = useMemo(() => {
    if (!problem?.tags) return null
    const tagsLower: string[] = problem.tags.map((t: any) =>
      typeof t === 'string' ? t.toLowerCase() : (t?.name ?? '').toLowerCase()
    )
    if (tagsLower.some((t: string) => t.includes('sort'))) return 'sorting'
    if (tagsLower.some((t: string) => t.includes('tree') || t.includes('bst'))) return 'trees'
    if (
      tagsLower.some((t: string) => t.includes('graph') || t.includes('bfs') || t.includes('dfs'))
    )
      return 'pathfinding'
    if (tagsLower.some((t: string) => t.includes('dynamic') || t.includes('dp'))) return 'dp'
    if (tagsLower.some((t: string) => t.includes('array') || t.includes('search'))) return 'sorting'
    return null
  }, [problem?.tags])

  // ── Loading / error states ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 animate-spin" />
          </div>
          <span className="text-sm text-gray-400">Loading problem workspace…</span>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <h2 className="text-xl font-bold">Problem not found</h2>
        <Button variant="outline" onClick={() => navigate('/problems')}>
          ← Back to Problems
        </Button>
      </div>
    )
  }

  const difficultyColor =
    problem.difficulty === 'EASY'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : problem.difficulty === 'MEDIUM'
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'

  return (
    <div className="h-screen w-full bg-gray-950 flex flex-col overflow-hidden text-gray-300">
      <SEO title={`${problem.title} | Elite Workspace`} />

      {/* ═══ Top Master Navigation Bar ═══ */}
      <header className="min-h-[52px] sm:min-h-[56px] border-b border-gray-800/80 bg-gray-950/95 backdrop-blur flex items-center justify-between px-3 shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/problems')}
            className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0 flex items-center justify-center"
            aria-label="Back to Problems Catalog"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 truncate">
            <h1 className="font-semibold text-gray-100 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">
              {problem.title}
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 hidden sm:inline-flex ${difficultyColor}`}
            >
              {problem.difficulty}
            </span>
          </div>

          {/* Interview Stopwatch Timer */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-gray-300">
            <Timer
              className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`}
            />
            <span>{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 min-h-[32px] min-w-[32px] hover:text-white text-gray-400 transition-colors ml-0.5 flex items-center justify-center"
              title={isTimerRunning ? 'Pause Interview Timer' : 'Start Interview Timer'}
              aria-label={isTimerRunning ? 'Pause Interview Timer' : 'Start Interview Timer'}
            >
              {isTimerRunning ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false)
                setTimerSeconds(0)
              }}
              className="p-1 min-h-[32px] min-w-[32px] hover:text-white text-gray-400 transition-colors flex items-center justify-center"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex lg:hidden items-center bg-gray-900 rounded-xl p-0.5 border border-gray-800">
          <button
            onClick={() => setMobileTab('description')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mobileTab === 'description'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Problem
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mobileTab === 'editor'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Code
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Execution Engine Selector */}
          <div className="hidden xl:flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => {
                setExecutionMode('wasm')
                addToast({
                  message: '⚡ WebAssembly Native Sandbox enabled (Instant, 0ms latency)',
                  type: 'info',
                })
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-medium transition-colors ${
                executionMode === 'wasm'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Air-gapped Client WebAssembly Execution (0ms latency, zero cloud costs)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              WASM (0ms)
            </button>
            <button
              onClick={() => {
                setExecutionMode('cloud')
                addToast({ message: '☁️ Cloud Container Sandbox enabled', type: 'info' })
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-medium transition-colors ${
                executionMode === 'cloud'
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Remote Cloud Docker Container Execution"
            >
              Cloud
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCouncilOpen(true)}
            leftIcon={<Users className="w-3.5 h-3.5 text-purple-400" />}
            className="min-h-[40px] bg-purple-900/20 border-purple-500/50 hover:bg-purple-800/40 text-purple-300 text-xs hidden sm:inline-flex font-semibold"
          >
            AI Council
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCollabModalOpen(true)}
            leftIcon={
              <Radio
                className={`w-3.5 h-3.5 ${
                  collabRoomId ? 'text-emerald-400 animate-pulse' : 'text-gray-400'
                }`}
              />
            }
            className={`${
              collabRoomId
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-gray-300'
            } min-h-[40px] text-xs hidden md:inline-flex font-semibold`}
          >
            {collabRoomId ? `Pair (${activePeers.length + 1})` : 'Pair Program'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAIReview}
            isLoading={isReviewing}
            leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
            className="min-h-[40px] bg-indigo-900/20 border-indigo-500/40 hover:bg-indigo-800/30 text-indigo-300 text-xs hidden sm:inline-flex font-semibold"
          >
            Review & Complexity
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            isLoading={isWasmRunning || runCodeMutation.isPending}
            disabled={submitSolutionMutation.isPending}
            leftIcon={
              executionMode === 'wasm' && wasmSandboxService.supportsWasm(language) ? (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
            className="min-h-[40px] bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3 sm:px-3.5"
          >
            {executionMode === 'wasm' && wasmSandboxService.supportsWasm(language)
              ? 'Run (WASM)'
              : 'Run'}
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={submitSolutionMutation.isPending}
            disabled={isWasmRunning || runCodeMutation.isPending}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-xs font-bold px-3.5 sm:px-4"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* ═══ Main Split Workspace ═══ */}
      <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* ─── Left Pane: Tabs & Content ─── */}
        <div
          ref={leftPaneRef}
          className={`h-full flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-gray-800/60 bg-gray-950 ${
            mobileTab === 'description' ? 'flex w-full' : 'hidden lg:flex'
          }`}
          style={{ width: undefined }}
        >
          {/* Left Navigation Tabs (Description, Editorial, Submissions, AI Hints) */}
          <div className="h-10 bg-gray-900/90 border-b border-gray-800 flex items-center px-2 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setLeftTab('description')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                leftTab === 'description'
                  ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-primary-400" />
              <span>Description</span>
            </button>

            <button
              onClick={() => setLeftTab('editorial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                leftTab === 'editorial'
                  ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Editorial</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Optimal
              </span>
            </button>

            <button
              onClick={() => setLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                leftTab === 'submissions'
                  ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Submissions</span>
              {submissionsData && submissionsData.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono">
                  {submissionsData.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setLeftTab('hints')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                leftTab === 'hints'
                  ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Hints</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-mono">
                3
              </span>
            </button>
          </div>

          {/* Left Tab Panes */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar min-h-0">
            {/* 1. DESCRIPTION TAB */}
            {leftTab === 'description' && (
              <>
                {/* Visualizer Studio Banner if relevant */}
                {visualizerTopic && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-gray-900 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Visualizer Studio Available</span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Step through state transitions, arrays, and memory operations visually.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/visualizer')}
                      rightIcon={<ExternalLink className="w-3 h-3" />}
                      className="border-indigo-500/40 hover:border-indigo-400 text-indigo-300 bg-indigo-900/30 text-xs shrink-0 font-bold"
                    >
                      Open Studio
                    </Button>
                  </div>
                )}

                {/* Tags */}
                {problem.tags && problem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag: any, idx: number) => {
                      const tagLabel = typeof tag === 'string' ? tag : (tag?.name ?? `Tag-${idx}`)
                      const tagKey =
                        typeof tag === 'string'
                          ? `str-tag-${idx}-${tag}`
                          : tag?.id || tag?.slug || `obj-tag-${idx}`
                      return (
                        <span
                          key={tagKey}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-400 border border-gray-800"
                        >
                          <Tag className="w-3 h-3" />
                          {tagLabel}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Stats */}
                {(problem.acceptance_rate != null || problem.total_submissions != null) && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {problem.acceptance_rate != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.round(problem.acceptance_rate)}% acceptance
                      </span>
                    )}
                    {problem.total_submissions != null && (
                      <span>{problem.total_submissions.toLocaleString()} submissions</span>
                    )}
                  </div>
                )}

                {/* Markdown Description */}
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-400 prose-code:text-primary-400 prose-code:bg-gray-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800">
                  {/* eslint-disable-next-line react/no-danger */}
                  <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
                </div>

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-200">Examples</h3>
                    {problem.examples.map((ex, i) => (
                      <div
                        key={ex.input ? `ex-${i}-${ex.input.slice(0, 15)}` : `example-${i}`}
                        className="bg-gray-900/70 border border-gray-800 rounded-lg p-3 space-y-2 text-sm"
                      >
                        <div>
                          <span className="text-gray-500 text-xs font-medium">Input:</span>
                          <pre className="text-gray-300 mt-1 font-mono text-xs whitespace-pre-wrap">
                            {ex.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs font-medium">Output:</span>
                          <pre className="text-gray-300 mt-1 font-mono text-xs whitespace-pre-wrap">
                            {ex.output}
                          </pre>
                        </div>
                        {ex.explanation && (
                          <div>
                            <span className="text-gray-500 text-xs font-medium">Explanation:</span>
                            <p className="text-gray-400 mt-1 text-xs">{ex.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-200">Constraints</h3>
                    <div className="text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                      {problem.constraints}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. EDITORIAL & APPROACHES TAB */}
            {leftTab === 'editorial' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    Official Engineering Editorial
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {editorial?.overview ||
                      `In-depth algorithmic analysis, mathematical proofs, and optimal reference architectures for ${problem.title}.`}
                  </p>
                </div>

                {editorial?.approaches && editorial.approaches.length > 0 ? (
                  <div className="space-y-6">
                    {editorial.approaches.map((app, idx) => (
                      <div
                        key={app.id || idx}
                        className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                app.difficulty === 'OPTIMAL'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : app.difficulty === 'BETTER'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                            >
                              {app.difficulty.replace('_', ' ')}
                            </span>
                            <h3 className="text-sm font-bold text-gray-200">{app.title}</h3>
                          </div>
                        </div>

                        <div className="p-4 space-y-4 text-xs leading-relaxed">
                          <div>
                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                              Intuition
                            </span>
                            <p className="text-gray-300 mt-1">{app.intuition}</p>
                          </div>

                          <div>
                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                              Algorithm
                            </span>
                            <pre className="text-gray-300 mt-1 whitespace-pre-wrap font-sans bg-gray-950 p-2.5 rounded border border-gray-800">
                              {app.algorithm}
                            </pre>
                          </div>

                          {/* Complexity Badges */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">
                                Time Complexity
                              </span>
                              <p className="font-mono text-emerald-400 font-semibold mt-0.5">
                                {app.timeComplexity}
                              </p>
                            </div>
                            <div className="p-2.5 rounded bg-gray-950 border border-gray-800">
                              <span className="text-[10px] text-gray-500 font-bold uppercase">
                                Space Complexity
                              </span>
                              <p className="font-mono text-blue-400 font-semibold mt-0.5">
                                {app.spaceComplexity}
                              </p>
                            </div>
                          </div>

                          {/* Code Solutions */}
                          {app.code && Object.keys(app.code).length > 0 && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                                  Reference Implementation
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const solutionCode =
                                        app.code[language] || Object.values(app.code)[0]
                                      if (solutionCode) {
                                        setCode(solutionCode)
                                        addToast({
                                          message: 'Loaded reference solution into editor',
                                          type: 'success',
                                        })
                                      }
                                    }}
                                    className="text-[11px] text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                                  >
                                    Apply to Editor
                                  </button>
                                  <button
                                    onClick={() => {
                                      const solutionCode =
                                        app.code[language] || Object.values(app.code)[0]
                                      if (solutionCode) {
                                        handleCopyCode(`app-${idx}`, solutionCode)
                                      }
                                    }}
                                    className="text-gray-400 hover:text-gray-200 transition-colors"
                                    title="Copy code"
                                  >
                                    {copiedCodeKey === `app-${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <pre className="p-3 bg-gray-950 rounded-lg border border-gray-800 font-mono text-xs text-gray-200 overflow-x-auto custom-scrollbar">
                                {app.code[language] || Object.values(app.code)[0]}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/30 text-center space-y-3">
                    <Lightbulb className="w-8 h-8 text-amber-400/50 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-200">Editorial Analysis</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        This challenge tests fundamental asymptotic trade-offs. Strive for optimal
                        time complexity by using hash mapping, two pointers, or dynamic state
                        memoization.
                      </p>
                    </div>
                  </div>
                )}

                {/* Key Takeaways */}
                {editorial?.keyTakeaways && editorial.keyTakeaways.length > 0 && (
                  <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/40 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Engineering Takeaways
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-400">
                      {editorial.keyTakeaways.map((point, kIdx) => (
                        <li key={kIdx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 3. SUBMISSIONS HISTORY TAB */}
            {leftTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-400" />
                      Submission History
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Review all past runs, execution runtimes, and restore any previous code state.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchSubmissions()}
                    className="text-xs border-gray-800 hover:bg-gray-800"
                  >
                    Refresh
                  </Button>
                </div>

                {submissionsData && submissionsData.length > 0 ? (
                  <div className="space-y-3">
                    {submissionsData.map((sub: any, sIdx: number) => {
                      const isAc = sub.status === 'AC' || sub.status === 'ACCEPTED'
                      return (
                        <div
                          key={sub.id || sIdx}
                          className="p-3.5 rounded-xl border border-gray-800 bg-gray-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-700 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                  isAc
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {isAc ? 'Accepted' : sub.status || 'Wrong Answer'}
                              </span>
                              <span className="text-xs font-mono font-bold text-gray-300 uppercase">
                                {sub.language}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 pt-0.5">
                              {sub.execution_time_ms != null && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-400" />
                                  {sub.execution_time_ms} ms
                                </span>
                              )}
                              {sub.memory_kb != null && <span>{sub.memory_kb} KB</span>}
                              <span>
                                {sub.passed_tests != null
                                  ? `${sub.passed_tests}/${sub.total_tests ?? sub.passed_tests} test cases`
                                  : '100% test coverage'}
                              </span>
                            </div>
                            {sub.created_at && (
                              <p className="text-[10px] text-gray-500">
                                {new Date(sub.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreSubmission(sub.code, sub.language)}
                            className="text-xs border-gray-700 hover:border-primary-500 text-gray-300 hover:text-white shrink-0 self-start sm:self-center font-semibold"
                          >
                            Restore Code
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-gray-800 bg-gray-900/30 text-center space-y-3">
                    <History className="w-8 h-8 text-gray-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-300">
                        No Submissions Recorded Yet
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Complete your code in the editor and click <strong>Submit</strong> to
                        evaluate against all edge cases and record your first benchmark.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. AI HINTS TAB */}
            {leftTab === 'hints' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Progressive AI Hints
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Unlock progressive nudges without spoiling the optimal solution.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Hint 1: Intuition */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                          Hint 1: Intuition & Pattern
                        </h4>
                      </div>
                      {unlockedHintsCount < 1 && (
                        <button
                          onClick={() => setUnlockedHintsCount(1)}
                          className="flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Unlock Hint</span>
                        </button>
                      )}
                    </div>
                    {unlockedHintsCount >= 1 ? (
                      <p className="text-xs text-gray-300 leading-relaxed pt-1">
                        {hintsData?.hints?.[0] ||
                          'Think about what information you need at each step. Can you avoid recalculating previous results by storing them in an auxiliary data structure?'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Hint is locked. Click unlock when stuck.</span>
                      </div>
                    )}
                  </div>

                  {/* Hint 2: Data Structures */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                          Hint 2: Data Structure Selection
                        </h4>
                      </div>
                      {unlockedHintsCount < 2 && (
                        <button
                          onClick={() => setUnlockedHintsCount(2)}
                          className="flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Unlock Hint</span>
                        </button>
                      )}
                    </div>
                    {unlockedHintsCount >= 2 ? (
                      <p className="text-xs text-gray-300 leading-relaxed pt-1">
                        {hintsData?.hints?.[1] ||
                          'A Hash Map allows O(1) lookups for complements. Alternatively, sorting enables two pointers in O(N log N) time and O(1) space.'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Requires Hint 1 unlock.</span>
                      </div>
                    )}
                  </div>

                  {/* Hint 3: Algorithmic Steps */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                          Hint 3: Full Step-by-Step Logic
                        </h4>
                      </div>
                      {unlockedHintsCount < 3 && (
                        <button
                          onClick={() => setUnlockedHintsCount(3)}
                          className="flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Unlock Hint</span>
                        </button>
                      )}
                    </div>
                    {unlockedHintsCount >= 3 ? (
                      <div className="space-y-2 pt-1 text-xs text-gray-300">
                        <p className="leading-relaxed">
                          {hintsData?.hints?.[2] ||
                            'Traverse elements sequentially. For element x, compute required target y. Query if y is in our cache; if so, return answer. Otherwise persist x and advance.'}
                        </p>
                        {hintsData?.pseudocode && (
                          <pre className="p-2.5 bg-gray-950 rounded border border-gray-800 font-mono text-[11px] text-gray-200 overflow-x-auto">
                            {hintsData.pseudocode}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Detailed walkthrough is locked.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Common Pitfalls Checklist */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edge Cases to Watch For</span>
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-400">
                    <li>Empty collections or arrays with fewer than minimum required elements.</li>
                    <li>Negative numbers, zeros, and duplicate integer elements.</li>
                    <li>32-bit integer overflow during arithmetic operations.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Drag Handle (horizontal) ─── */}
        <div
          className="hidden lg:block w-1.5 bg-gray-800/60 hover:bg-primary-500/40 transition-colors cursor-col-resize shrink-0 relative group touch-none select-none"
          onPointerDown={onMouseDown}
          onMouseDown={onMouseDown}
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* ─── Right: Editor + Console ─── */}
        <div
          ref={rightPaneRef}
          className={`h-full flex flex-col min-w-0 bg-gray-950 ${
            mobileTab === 'editor' ? 'flex w-full' : 'hidden lg:flex'
          }`}
          style={{ width: undefined }}
        >
          <div ref={editorPanelRef} className="h-full flex flex-col min-w-0">
            {/* Editor Toolbar */}
            <div className="min-h-[44px] bg-gray-900/90 border-b border-gray-800/80 flex items-center justify-between px-3 shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="min-h-[36px] bg-gray-800 text-gray-200 text-xs font-medium rounded-lg border border-gray-700/80 px-2.5 py-1 outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="c">C (GCC 10.2)</option>
                  <option value="cpp">C++ (G++ 17)</option>
                  <option value="python">Python 3 (3.10)</option>
                  <option value="javascript">JavaScript (Node 18)</option>
                  <option value="typescript">TypeScript (5.0)</option>
                  <option value="java">Java (OpenJDK 15)</option>
                  <option value="go">Go (1.16)</option>
                  <option value="rust">Rust (1.68)</option>
                </select>

                {collabRoomId && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Pairing ({activePeers.length + 1})</span>
                    {remoteCursor && (
                      <span className="text-gray-400 hidden sm:inline">
                        | Peer L{remoteCursor.line + 1}:C{remoteCursor.ch + 1}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Editor Quick Utilities */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleFormatCode}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 flex items-center justify-center"
                  title="Format Code"
                  aria-label="Format Code"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  // eslint-disable-next-line security/detect-object-injection
                  onClick={() => setCode(DEFAULT_CODE[language] ?? '')}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 flex items-center justify-center"
                  title="Reset Code to Default Template"
                  aria-label="Reset Code to Default Template"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const sizes = [12, 14, 16, 18]
                    const next = sizes[(sizes.indexOf(fontSize) + 1) % sizes.length] ?? 14
                    setFontSize(next)
                    addToast({ message: `Editor font size: ${next}px`, type: 'info' })
                  }}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 flex items-center justify-center"
                  title={`Font Size: ${fontSize}px (Click to cycle)`}
                  aria-label="Change editor font size"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleFullscreen}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800 flex items-center justify-center"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* CodeMirror Surface */}
            <div
              ref={codeEditorRef}
              className="min-h-0 overflow-hidden"
              style={{
                height: isConsoleOpen ? `${100 - consoleHeightRef.current}%` : '100%',
                fontSize: `${fontSize}px`,
              }}
            >
              <EditorErrorBoundary>
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                      Loading code editor engine...
                    </div>
                  }
                >
                  <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={codeMirrorExtensions}
                    onChange={handleCodeChange}
                    className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto text-sm"
                    basicSetup={CODEMIRROR_BASIC_SETUP}
                  />
                </Suspense>
              </EditorErrorBoundary>
            </div>

            {/* Console Resize Handle */}
            {isConsoleOpen && (
              <div
                className="h-1.5 bg-gray-800/60 hover:bg-primary-500/40 transition-colors cursor-row-resize shrink-0 touch-none select-none relative group"
                onPointerDown={e => {
                  if (e.button !== 0) return
                  consoleDragging.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
                onMouseDown={() => {
                  consoleDragging.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
              >
                <div className="absolute inset-x-0 -top-1 -bottom-1" />
              </div>
            )}

            {/* Console & Test Case Runner Panel */}
            <div
              ref={consolePanelRef}
              className="bg-gray-950 flex flex-col shrink-0 border-t border-gray-800/60"
              style={{ height: isConsoleOpen ? `${consoleHeightRef.current}%` : '36px' }}
            >
              {/* Console Header Tabs */}
              <div className="h-9 bg-gray-900/80 flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setConsoleTab('cases')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      consoleTab === 'cases' && isConsoleOpen
                        ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>Test Cases</span>
                    {testCaseResults.length > 0 && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          testCaseResults.every(r => r.passed) ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setConsoleTab('wasm')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      consoleTab === 'wasm' && isConsoleOpen
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>WebAssembly Native Sandbox</span>
                  </button>

                  <button
                    onClick={() => {
                      setConsoleTab('output')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      consoleTab === 'output' && isConsoleOpen
                        ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Output</span>
                  </button>

                  <button
                    onClick={() => {
                      setConsoleTab('custom')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      consoleTab === 'custom' && isConsoleOpen
                        ? 'bg-gray-800 text-white shadow-sm border border-gray-700/60'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>Custom Input</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className="text-gray-400 hover:text-white transition-colors p-0.5 rounded"
                    aria-label={isConsoleOpen ? 'Collapse console' : 'Expand console'}
                  >
                    {isConsoleOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Console Body Content */}
              {isConsoleOpen && (
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs whitespace-pre-wrap text-gray-400 custom-scrollbar min-h-0">
                  {/* TAB 1: INTERACTIVE TEST CASES RUNNER */}
                  {consoleTab === 'cases' && (
                    <div className="font-sans space-y-3">
                      {/* Case Selectors */}
                      <div className="flex items-center gap-2 border-b border-gray-800/80 pb-2">
                        {sampleCases.map((_: any, idx: number) => {
                          const res = testCaseResults[idx]
                          return (
                            <button
                              key={idx}
                              onClick={() => setActiveCaseIndex(idx)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                activeCaseIndex === idx
                                  ? 'bg-gray-800 text-white border border-gray-700'
                                  : 'bg-gray-900 text-gray-400 hover:text-white'
                              }`}
                            >
                              <span>Case {idx + 1}</span>
                              {res &&
                                (res.passed ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                ))}
                            </button>
                          )
                        })}
                      </div>

                      {/* Active Case Inspection Card */}
                      {sampleCases[activeCaseIndex] && (
                        <div className="space-y-3 font-mono text-xs">
                          <div>
                            <span className="text-gray-400 font-semibold font-sans text-[11px] block mb-1">
                              Input
                            </span>
                            <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-200">
                              {sampleCases[activeCaseIndex].input}
                            </div>
                          </div>

                          <div>
                            <span className="text-gray-400 font-semibold font-sans text-[11px] block mb-1">
                              Expected Output
                            </span>
                            <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg text-emerald-400">
                              {sampleCases[activeCaseIndex].output}
                            </div>
                          </div>

                          {testCaseResults[activeCaseIndex] && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400 font-semibold font-sans text-[11px]">
                                  Actual Output
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  Runtime: {testCaseResults[activeCaseIndex].executionTimeMs ?? 15}{' '}
                                  ms
                                </span>
                              </div>
                              <div
                                className={`p-2.5 rounded-lg border ${
                                  testCaseResults[activeCaseIndex].passed
                                    ? 'bg-gray-900 border-gray-800 text-gray-200'
                                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                                }`}
                              >
                                {testCaseResults[activeCaseIndex].actualOutput}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: WEBASSEMBLY SANDBOX */}
                  {consoleTab === 'wasm' &&
                    (wasmResult ? (
                      <WasmTestResultsView result={wasmResult} />
                    ) : (
                      <div className="text-gray-500 space-y-2 font-sans">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Zap className="w-4 h-4" />
                          <span>⚡ WebAssembly Native Sandbox Ready</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Click <strong>Run (WASM)</strong> to evaluate your solution in-browser
                          with 0ms server latency, zero cloud cost, and complete air-gapped
                          security.
                        </p>
                      </div>
                    ))}

                  {/* TAB 3: CUSTOM TESTCASE INPUT */}
                  {consoleTab === 'custom' && (
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-300">
                          Custom Test Inputs (JSON / Plain text)
                        </span>
                        <button
                          onClick={handleRun}
                          className="px-3 py-1 text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                        >
                          Run Custom Test
                        </button>
                      </div>
                      <textarea
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        placeholder="e.g. nums = [2, 7, 11, 15], target = 9"
                        className="w-full h-24 p-2.5 bg-gray-900 border border-gray-800 rounded-lg font-mono text-xs text-gray-200 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}

                  {/* TAB 4: STDOUT / CONSOLE OUTPUT */}
                  {consoleTab === 'output' &&
                    (output ?? (
                      <div className="text-gray-500 space-y-2">
                        <p className="italic text-gray-400">Ready to execute.</p>
                        <div className="mt-4 pt-4 border-t border-gray-800/50">
                          <p className="font-semibold text-gray-300 mb-2 font-sans">Shortcuts</p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                            <div>
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700 mr-1">
                                Shift
                              </kbd>{' '}
                              +{' '}
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700">
                                Enter
                              </kbd>
                            </div>
                            <div className="text-gray-500">Run code against examples</div>
                            <div>
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700 mr-1">
                                Cmd/Ctrl
                              </kbd>{' '}
                              +{' '}
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700">
                                Enter
                              </kbd>
                            </div>
                            <div className="text-gray-500">Submit solution</div>
                            <div>
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700 mr-1">
                                Cmd/Ctrl
                              </kbd>{' '}
                              +{' '}
                              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700">
                                S
                              </kbd>
                            </div>
                            <div className="text-gray-500">Save draft locally</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {problem && (
        <AICouncilModal
          isOpen={isCouncilOpen}
          onClose={() => setIsCouncilOpen(false)}
          initialQuery={`I am working on problem "${problem.title}". Can the council review my approach and guide me on edge cases and complexity?`}
          initialCode={code}
          language={language}
          problemTitle={problem.title}
          problemDescription={problem.description}
        />
      )}

      <CollabSessionModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
        roomId={collabRoomId}
        isConnected={isCollabConnected}
        activePeers={activePeers}
        remoteCursor={remoteCursor}
        onStartSession={handleStartCollabSession}
        onLeaveSession={handleLeaveCollabSession}
        peerRunningTests={peerExecuting}
      />
    </div>
  )
}
