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
} from 'lucide-react'
import { AICouncilModal } from '../components/AICouncilModal'
import { CollabSessionModal } from '../components/CollabSessionModal'
import { useCollaborativeSession } from '../hooks/useCollaborativeSession'

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

// ─── Resizable Split Pane (horizontal) ──────────────────────────────
function useHorizontalResize(initialLeftPercent = 40) {
  const leftPercentRef = useRef(initialLeftPercent)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (leftPaneRef.current) leftPaneRef.current.style.width = `${initialLeftPercent}%`
      if (rightPaneRef.current) rightPaneRef.current.style.width = `${100 - initialLeftPercent}%`
    }
  }, [initialLeftPercent])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (
        !dragging.current ||
        !containerRef.current ||
        !leftPaneRef.current ||
        !rightPaneRef.current
      )
        return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const clampedPct = Math.max(20, Math.min(80, pct))
      leftPercentRef.current = clampedPct
      // DIRECT DOM MUTATION for 60fps drag without React re-renders
      leftPaneRef.current.style.width = `${clampedPct}%`
      rightPaneRef.current.style.width = `${100 - clampedPct}%`
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const pct = ((e.clientX - rect.left) / rect.width) * 100
        leftPercentRef.current = Math.max(20, Math.min(80, pct))
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return { leftPercentRef, onMouseDown, containerRef, leftPaneRef, rightPaneRef }
}

// ─── Component ──────────────────────────────────────────────────────
export default function ProblemWorkspacePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE.javascript)
  const [output, setOutput] = useState<string | null>(null)
  const [isConsoleOpen, setIsConsoleOpen] = useState(true)
  const [consoleTab, setConsoleTab] = useState<'output' | 'custom'>('output')
  const [customInput, setCustomInput] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [mobileTab, setMobileTab] = useState<'description' | 'editor'>('description')
  const [fontSize, setFontSize] = useState<number>(14)
  const [isCouncilOpen, setIsCouncilOpen] = useState(false)
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false)
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null)
  const [peerExecuting, setPeerExecuting] = useState(false)

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
        customId ||
        `collab-dsa-${slug || 'challenge'}-${Math.floor(1000 + Math.random() * 9000)}`
      setCollabRoomId(roomId)
      addToast({ message: `Collaborative session started: ${roomId}`, type: 'success' })
    },
    [slug, addToast]
  )

  const handleLeaveCollabSession = useCallback(() => {
    setCollabRoomId(null)
    addToast({ message: 'Disconnected from collaborative session', type: 'info' })
  }, [addToast])

  const consoleHeightRef = useRef(30) // percentage
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

  const sanitizedDescription = useMemo(() => {
    return problem?.description ? renderMarkdown(problem.description) : ''
  }, [problem?.description])

  const getInitialCodeForLanguage = useCallback(
    (targetLang: string) => {
      let starter: string | undefined
      if (problem?.starterCode) {
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
    [problem?.starterCode]
  )

  // ── Auto-save to Local Storage ─────────────────────────────────────
  // Load saved code on mount or when slug/language changes
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
      if (collabRoomId) {
        sendTestResults(formatted, 'passed')
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
      const isAccepted = d.status === 'AC' || d.status === 'ACCEPTED'
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
      if (collabRoomId) {
        sendTestResults(formatted, isAccepted ? 'passed' : 'failed')
      }

      if (isAccepted) {
        addToast({ message: 'Solution Accepted! +100 XP', type: 'success' })
      } else {
        addToast({
          message: `Submission ${d.status}: ${d.passed_tests}/${d.total_tests} passed`,
          type: 'warning',
        })
      }

      // Proactively invalidate user XP and stats to update gamification UI instantly
      void queryClient.invalidateQueries({ queryKey: ['user'] })
      void queryClient.invalidateQueries({ queryKey: ['dsaStats'] })
    },
    onError: error => {
      const msg = error instanceof Error ? error.message : 'Execution failed'
      setOutput(`❌ Submission Error: ${msg}`)
      setIsConsoleOpen(true)
      addToast({ message: 'Submission failed', type: 'error' })
      if (collabRoomId) {
        sendTestResults(`❌ Submission Error: ${msg}`, 'error')
      }
    },
  })

  const handleRun = useCallback(() => {
    if (!problem) return
    setOutput('⏳ Compiling and running sample tests…')
    setIsConsoleOpen(true)
    if (collabRoomId) {
      sendRunTests()
    }
    runCodeMutation.mutate()
  }, [problem, runCodeMutation, collabRoomId, sendRunTests])

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
      '⏳ Initiating Deep ML Code Analysis...\n\nScanning for Time/Space Complexity and Logic Flaws...'
    )
    setIsConsoleOpen(true)
    try {
      const response = await aiTutorService.reviewCode(code, language, problem.description)
      if (response.status === 'success') {
        const review = response.data
        const formattedOutput = `
🤖 AI Code Review Complete

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
        setOutput('❌ AI Review Failed: Unable to analyze code.')
      }
    } catch {
      setOutput('❌ Error contacting ML Engine.')
    } finally {
      setIsReviewing(false)
    }
  }, [problem, code, language])

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
        handleSubmit()
      } else if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, handleRun, slug, language, code, addToast])

  // Console vertical resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (
        !consoleDragging.current ||
        !editorPanelRef.current ||
        !consolePanelRef.current ||
        !codeEditorRef.current
      )
        return
      const rect = editorPanelRef.current.getBoundingClientRect()
      const pct = ((rect.bottom - e.clientY) / rect.height) * 100
      const clampedPct = Math.max(10, Math.min(70, pct))
      consoleHeightRef.current = clampedPct
      // DIRECT DOM MUTATION
      consolePanelRef.current.style.height = `${clampedPct}%`
      codeEditorRef.current.style.height = `${100 - clampedPct}%`
    }
    const onUp = (e: MouseEvent) => {
      if (!consoleDragging.current) return
      consoleDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (editorPanelRef.current) {
        const rect = editorPanelRef.current.getBoundingClientRect()
        const pct = ((rect.bottom - e.clientY) / rect.height) * 100
        consoleHeightRef.current = Math.max(10, Math.min(70, pct))
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── Loading / error states ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-primary-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 animate-spin" />
          </div>
          <span className="text-sm text-gray-400">Loading problem…</span>
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
        : 'text-red-400 bg-red-500/10 border-red-500/20'

  return (
    <div className="h-screen w-full bg-gray-950 flex flex-col overflow-hidden text-gray-300">
      <SEO title={`${problem.title} | Workspace`} />

      {/* ═══ Top Bar ═══ */}
      <header className="h-12 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur flex items-center justify-between px-3 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/problems')}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-100 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
            {problem.title}
          </h1>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 hidden sm:inline-flex ${difficultyColor}`}
          >
            {problem.difficulty}
          </span>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex md:hidden items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800">
          <button
            onClick={() => setMobileTab('description')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
              mobileTab === 'description'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Problem
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
              mobileTab === 'editor'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCouncilOpen(true)}
            leftIcon={<Users className="w-3.5 h-3.5 text-purple-400" />}
            className="bg-purple-900/20 border-purple-500/50 hover:bg-purple-800/40 text-purple-300 text-xs h-8 hidden sm:inline-flex"
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
            } text-xs h-8 hidden md:inline-flex`}
          >
            {collabRoomId ? `Pair (${activePeers.length + 1})` : 'Pair Program'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIReview}
            isLoading={isReviewing}
            leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
            className="bg-purple-900/20 border-purple-500/50 hover:bg-purple-800/40 text-purple-300 text-xs h-8 hidden sm:inline-flex"
          >
            AI Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            isLoading={runCodeMutation.isPending}
            disabled={submitSolutionMutation.isPending}
            leftIcon={<Play className="w-3.5 h-3.5" />}
            className="bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-gray-200 text-xs h-8"
          >
            Run
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={submitSolutionMutation.isPending}
            disabled={runCodeMutation.isPending}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-xs h-8"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* ═══ Main Split ═══ */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* ─── Left: Problem Description ─── */}
        <div
          ref={leftPaneRef}
          className={`h-full overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-gray-800/60 ${
            mobileTab === 'description' ? 'flex flex-col w-full' : 'hidden md:flex md:flex-col'
          }`}
          style={{ width: undefined }}
        >
          <div className="p-5 space-y-5">
            {/* Tags */}
            {problem.tags && problem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((tag: any, idx: number) => {
                  const tagLabel = typeof tag === 'string' ? tag : (tag?.name ?? `Tag-${idx}`)
                  const tagKey =
                    typeof tag === 'string'
                      ? `str-tag-${idx}-${tag}`
                      : (tag?.id || tag?.slug || `obj-tag-${idx}`)
                  return (
                    <span
                      key={tagKey}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700/50"
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

            {/* Description */}
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-400 prose-code:text-primary-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800">
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
                      <pre className="text-gray-300 mt-1 font-mono text-xs">{ex.input}</pre>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-medium">Output:</span>
                      <pre className="text-gray-300 mt-1 font-mono text-xs">{ex.output}</pre>
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
          </div>
        </div>

        {/* ─── Drag Handle (horizontal) ─── */}
        <div
          className="hidden md:block w-1.5 bg-gray-800/60 hover:bg-primary-500/40 transition-colors cursor-col-resize shrink-0 relative group"
          onMouseDown={onMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* bigger hit area */}
        </div>

        {/* ─── Right: Editor + Console ─── */}
        <div
          ref={rightPaneRef}
          className={`h-full flex flex-col min-w-0 ${
            mobileTab === 'editor' ? 'flex w-full' : 'hidden md:flex'
          }`}
          style={{ width: undefined }}
        >
          <div ref={editorPanelRef} className="h-full flex flex-col min-w-0">
            {/* Editor Toolbar */}
            <div className="h-9 bg-gray-900/80 border-b border-gray-800/60 flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="bg-gray-800 text-gray-300 text-xs rounded-md border border-gray-700/60 px-2 py-1 outline-none focus:border-primary-500/50 transition-colors"
                >
                  <option value="c">C (GCC 10.2)</option>
                  <option value="cpp">C++ (G++ 10.2)</option>
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
              <div className="flex items-center gap-1">
                <button
                  // eslint-disable-next-line security/detect-object-injection
                  onClick={() => setCode(DEFAULT_CODE[language] ?? '')}
                  className="p-1 text-gray-500 hover:text-gray-200 transition-colors rounded"
                  title="Reset Code"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const sizes = [12, 14, 16, 18]
                    const next = sizes[(sizes.indexOf(fontSize) + 1) % sizes.length] ?? 14
                    setFontSize(next)
                    addToast({ message: `Editor font size: ${next}px`, type: 'info' })
                  }}
                  className="p-1 text-gray-500 hover:text-gray-200 transition-colors rounded"
                  title={`Font Size: ${fontSize}px (Click to cycle)`}
                  aria-label="Change editor font size"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code Editor */}
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
                      Loading editor...
                    </div>
                  }
                >
                  <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={[getLanguageExtension(language)]}
                    onChange={handleCodeChange}
                    className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto text-sm"
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightActiveLine: true,
                      foldGutter: true,
                      autocompletion: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      indentOnInput: true,
                    }}
                  />
                </Suspense>
              </EditorErrorBoundary>
            </div>

            {/* Console Resize Handle */}
            {isConsoleOpen && (
              <div
                className="h-1 bg-gray-800/60 hover:bg-primary-500/40 transition-colors cursor-row-resize shrink-0"
                onMouseDown={() => {
                  consoleDragging.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
              />
            )}

            {/* Console Panel */}
            <div
              ref={consolePanelRef}
              className="bg-gray-950 flex flex-col shrink-0 border-t border-gray-800/60"
              style={{ height: isConsoleOpen ? `${consoleHeightRef.current}%` : '36px' }}
            >
              {/* Console Header */}
              <div className="h-9 bg-gray-900/80 flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setConsoleTab('output')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      consoleTab === 'output' && isConsoleOpen
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Output
                  </button>
                  <button
                    onClick={() => {
                      setConsoleTab('custom')
                      setIsConsoleOpen(true)
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      consoleTab === 'custom' && isConsoleOpen
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Custom Testcase
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className="text-gray-500 hover:text-white transition-colors p-0.5 rounded"
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

              {/* Console Body */}
              {isConsoleOpen && (
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs whitespace-pre-wrap text-gray-400 custom-scrollbar min-h-0">
                  {consoleTab === 'custom' ? (
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">
                          Custom Test Inputs (JSON / Plain text)
                        </span>
                        <button
                          onClick={handleRun}
                          className="px-2.5 py-1 text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
                        >
                          Run Custom Test
                        </button>
                      </div>
                      <textarea
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        placeholder="e.g. nums = [2, 7, 11, 15], target = 9"
                        className="w-full h-24 p-2 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-gray-200 focus:border-primary-500 focus:outline-none resize-none"
                      />
                    </div>
                  ) : (
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
                    ))
                  )}
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
