import { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import DOMPurify from 'dompurify'
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
} from 'lucide-react'

const DEFAULT_CODE: Record<string, string> = {
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solve(nums, target) {
    // Write your code here

}`,
  python: `class Solution:
    def solve(self, nums, target):
        # Write your code here
        pass`,
  cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> solve(vector<int>& nums, int target) {
        // Write your code here

    }
};`,
}

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'python':
      return python()
    case 'cpp':
      return cpp()
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
  const [isReviewing, setIsReviewing] = useState(false)

  const consoleHeightRef = useRef(30) // percentage
  const consoleDragging = useRef(false)
  const editorPanelRef = useRef<HTMLDivElement>(null)
  const consolePanelRef = useRef<HTMLDivElement>(null)
  const codeEditorRef = useRef<HTMLDivElement>(null)

  const { leftPercentRef, onMouseDown, containerRef, leftPaneRef, rightPaneRef } =
    useHorizontalResize(42)

  // ── Auto-save to Local Storage ─────────────────────────────────────
  // Load saved code on mount or when slug/language changes
  useEffect(() => {
    if (slug) {
      const savedCode = localStorage.getItem(`draft_${slug}_${language}`)
      if (savedCode) {
        setCode(savedCode)
      } else {
        // eslint-disable-next-line security/detect-object-injection
        setCode(DEFAULT_CODE[language] ?? '')
      }
    }
  }, [slug, language])

  useEffect(() => {
    if (!slug || code === DEFAULT_CODE[language]) return
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`draft_${slug}_${language}`, code)
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [code, slug, language])

  // Language switch logic:
  const prevLangRef = useRef(language)
  useEffect(() => {
    if (prevLangRef.current !== language) {
      // If code matches the previous language's default, swap it

      if (code === DEFAULT_CODE[prevLangRef.current]) {
        // eslint-disable-next-line security/detect-object-injection
        setCode(DEFAULT_CODE[language] ?? '')
      }
      prevLangRef.current = language
    }
  }, [language, code])

  // ── Data queries ──────────────────────────────────────────────────
  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', slug],
    queryFn: () => problemService.getProblem(slug!).then(r => r.data),
    enabled: !!slug,
  })

  const sanitizedDescription = useMemo(() => {
    return problem?.description ? DOMPurify.sanitize(problem.description) : ''
  }, [problem?.description])

  const runCodeMutation = useMutation({
    mutationFn: () => problemService.submitSolution(problem!.id, language, code),
    onSuccess: res => {
      const d = res.data
      const lines = [
        `✅ Status: ${d.status}`,
        `   Passed: ${d.passed_tests}/${d.total_tests} test cases`,
        d.execution_time_ms != null ? `   Runtime: ${d.execution_time_ms}ms` : null,
        d.memory_kb != null ? `   Memory: ${d.memory_kb}KB` : null,
        d.feedback ? `\n${d.feedback}` : null,
      ].filter(Boolean)
      setOutput(lines.join('\n'))
      setIsConsoleOpen(true)
    },
    onError: (err: Error) => {
      setOutput(`❌ Error: ${err.message}`)
      setIsConsoleOpen(true)
    },
  })

  const handleRun = useCallback(() => {
    if (!problem) return
    setOutput('⏳ Compiling and running tests…')
    setIsConsoleOpen(true)
    runCodeMutation.mutate()
  }, [problem, runCodeMutation])

  const handleSubmit = useCallback(() => {
    if (!problem) return
    setOutput('⏳ Evaluating against all test cases…')
    setIsConsoleOpen(true)
    runCodeMutation.mutate()
    addToast({ message: 'Solution submitted!', type: 'success' })
  }, [problem, runCodeMutation, addToast])

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
    } catch (err) {
      setOutput('❌ Error contacting ML Engine.')
    } finally {
      setIsReviewing(false)
    }
  }, [problem, code, language])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, handleRun])

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
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/problems')}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-100 text-sm truncate">{problem.title}</h1>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${difficultyColor}`}
          >
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIReview}
            isLoading={isReviewing}
            leftIcon={<BrainCircuit className="w-3.5 h-3.5" />}
            className="bg-purple-900/20 border-purple-500/50 hover:bg-purple-800/40 text-purple-300 text-xs h-8 mr-2"
          >
            AI Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            isLoading={runCodeMutation.isPending}
            leftIcon={<Play className="w-3.5 h-3.5" />}
            className="bg-gray-800/80 border-gray-700 hover:bg-gray-700 text-gray-200 text-xs h-8"
          >
            Run
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={runCodeMutation.isPending}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-xs h-8"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* ═══ Main Split ═══ */}
      <div ref={containerRef} className="flex-1 flex min-h-0">
        {/* ─── Left: Problem Description ─── */}
        <div
          ref={leftPaneRef}
          className="h-full overflow-y-auto custom-scrollbar border-r border-gray-800/60"
          style={{ width: `${leftPercentRef.current}%` }}
        >
          <div className="p-5 space-y-5">
            {/* Tags */}
            {problem.tags && problem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map(tag => (
                  <span
                    key={tag.id || tag.name}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700/50"
                  >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                  </span>
                ))}
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
                    key={i}
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
          className="w-1.5 bg-gray-800/60 hover:bg-primary-500/40 transition-colors cursor-col-resize shrink-0 relative group"
          onMouseDown={onMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* bigger hit area */}
        </div>

        {/* ─── Right: Editor + Console ─── */}
        <div
          ref={rightPaneRef}
          className="h-full flex flex-col min-w-0"
          style={{ width: `${100 - leftPercentRef.current}%` }}
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
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++</option>
                </select>
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
                  className="p-1 text-gray-500 hover:text-gray-200 transition-colors rounded"
                  title="Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div
              ref={codeEditorRef}
              className="min-h-0 overflow-hidden"
              style={{ height: isConsoleOpen ? `${100 - consoleHeightRef.current}%` : '100%' }}
            >
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
                  onChange={(val: string) => setCode(val)}
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
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  Console
                </div>
                <button
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className="text-gray-500 hover:text-white transition-colors p-0.5 rounded"
                >
                  {isConsoleOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Console Body */}
              {isConsoleOpen && (
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs whitespace-pre-wrap text-gray-400 custom-scrollbar min-h-0">
                  {output ?? (
                    <div className="text-gray-500 space-y-2">
                      <p className="italic text-gray-400">Ready to execute.</p>
                      <div className="mt-4 pt-4 border-t border-gray-800/50">
                        <p className="font-semibold text-gray-300 mb-2">Shortcuts</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded font-sans text-gray-300 border border-gray-700 mr-1">
                              Shift
                            </kbd>{' '}
                            +{' '}
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded font-sans text-gray-300 border border-gray-700">
                              Enter
                            </kbd>
                          </div>
                          <div className="text-gray-500">Run code against examples</div>
                          <div>
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded font-sans text-gray-300 border border-gray-700 mr-1">
                              Cmd/Ctrl
                            </kbd>{' '}
                            +{' '}
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded font-sans text-gray-300 border border-gray-700">
                              Enter
                            </kbd>
                          </div>
                          <div className="text-gray-500">Submit solution</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
