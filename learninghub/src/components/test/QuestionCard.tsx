import { memo, useState, useEffect, useCallback, useId } from 'react'
import { motion } from 'framer-motion'
import {
  Flag,
  CheckCircle,
  Lock,
  Sparkles,
  Lightbulb,
  Play,
  RotateCcw,
  Code2,
  Terminal,
  Zap,
  Loader2,
  XCircle,
  ClipboardCheck,
} from 'lucide-react'
import { MathRenderer } from '../MathRenderer'
import { Button } from '../ui/Button'
import { wasmSandboxService } from '../../services/wasm/WasmSandboxService'
import { WasmTestResultsView } from '../WasmTestResultsView'
import type { WasmExecutionResult } from '../../services/wasm/types'
import type { TestQuestion } from '../../services/testsAService'

const DEFAULT_CODING_TEMPLATES: Record<string, string> = {
  python: `# Complete your solution below
def solve(*args):
    # Write your solution here
    return None
`,
  javascript: `// Complete your solution below
function solve(...args) {
  // Write your solution here
  return null;
}
`,
  typescript: `// Complete your solution below
function solve(...args: any[]): any {
  // Write your solution here
  return null;
}
`,
}

const getCodingTemplate = (lang: string): string => {
  if (lang === 'javascript') return DEFAULT_CODING_TEMPLATES.javascript
  if (lang === 'typescript') return DEFAULT_CODING_TEMPLATES.typescript
  return DEFAULT_CODING_TEMPLATES.python
}

/**
 * Intelligently resolves language starter code from multi-language JSON,
 * signature translation, or default boilerplates.
 */
const resolveLanguageStarterCode = (question: TestQuestion, targetLang: string): string => {
  const rawTemplate = question.starter_code || question.code_template
  if (rawTemplate) {
    try {
      const parsed = JSON.parse(rawTemplate) as Record<string, string>
      // eslint-disable-next-line security/detect-object-injection
      if (typeof parsed === 'object' && parsed !== null && typeof parsed[targetLang] === 'string') {
        // eslint-disable-next-line security/detect-object-injection
        return parsed[targetLang]
      }
    } catch {
      // rawTemplate is code string
    }

    const questionLang = (question.language || 'python').toLowerCase()
    if (targetLang === questionLang) {
      return rawTemplate
    }

    // Dynamic signature conversion from Python to JS / TS
    if (questionLang === 'python' && rawTemplate.includes('def ')) {
      const funcMatch = rawTemplate.match(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/)
      if (funcMatch) {
        const [, funcName, params] = funcMatch
        const cleanParams = params
          .split(',')
          .map(p => p.split(':')[0].trim())
          .filter(Boolean)
          .join(', ')

        if (targetLang === 'javascript') {
          return `// Complete your solution below\nfunction ${funcName}(${cleanParams}) {\n  // Write your solution here\n  return null;\n}\n`
        }
        if (targetLang === 'typescript') {
          const typedParams = params
            .split(',')
            .map(p => `${p.split(':')[0].trim()}: any`)
            .filter(Boolean)
            .join(', ')
          return `// Complete your solution below\nfunction ${funcName}(${typedParams}): any {\n  // Write your solution here\n  return null;\n}\n`
        }
      }
    }
  }

  return getCodingTemplate(targetLang)
}

interface CodingQuestionWorkbenchProps {
  question: TestQuestion
  selectedAnswer: string | string[] | null
  onAnswer: (code: string) => void
  disabled?: boolean
}

const CodingQuestionWorkbench = memo(
  ({ question, selectedAnswer, onAnswer, disabled }: CodingQuestionWorkbenchProps) => {
    const defaultLang = (question.language || 'python').toLowerCase()
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
      ['python', 'javascript', 'typescript'].includes(defaultLang) ? defaultLang : 'python'
    )
    const [wasmResult, setWasmResult] = useState<WasmExecutionResult | null>(null)
    const [isExecuting, setIsExecuting] = useState(false)
    const [showCustomInput, setShowCustomInput] = useState(false)
    const [customInput, setCustomInput] = useState('')
    const [languageDrafts, setLanguageDrafts] = useState<Record<string, string>>({})
    const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 })
    const [pasteNotice, setPasteNotice] = useState<{ chars: number; timestamp: number } | null>(
      null
    )
    const customInputId = useId()

    // Determine current code value
    const currentCode =
      typeof selectedAnswer === 'string' && selectedAnswer.trim().length > 0
        ? selectedAnswer
        : resolveLanguageStarterCode(question, selectedLanguage)

    // When question changes, reset execution state
    useEffect(() => {
      setWasmResult(null)
      setShowCustomInput(false)
      setCustomInput('')
      setPasteNotice(null)
      if (question.language) {
        setSelectedLanguage(question.language.toLowerCase())
      }
    }, [question.id, question.language])

    // Synchronize initial starter template if answer is empty
    useEffect(() => {
      if (!selectedAnswer && currentCode) {
        onAnswer(currentCode)
      }
    }, [question.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleLanguageChange = (lang: string) => {
      if (lang === selectedLanguage) return

      // Save current code in drafts map
      setLanguageDrafts(prev => ({
        ...prev,
        [selectedLanguage]: currentCode,
      }))

      setSelectedLanguage(lang)

      // Restore code if examinee previously typed in that language, else load template
      // eslint-disable-next-line security/detect-object-injection
      const nextCode = languageDrafts[lang] || resolveLanguageStarterCode(question, lang)
      onAnswer(nextCode)
    }

    const handleReset = () => {
      if (disabled) return
      const template = resolveLanguageStarterCode(question, selectedLanguage)
      setLanguageDrafts(prev => ({
        ...prev,
        [selectedLanguage]: template,
      }))
      onAnswer(template)
      setWasmResult(null)
    }

    const handleRunWasmTests = useCallback(async () => {
      if (disabled || isExecuting) return
      setIsExecuting(true)
      try {
        const testCases =
          showCustomInput && customInput.trim()
            ? [{ input: customInput.trim(), output: '' }]
            : question.test_cases && question.test_cases.length > 0
              ? question.test_cases
              : [{ input: '', output: '' }]

        const result = await wasmSandboxService.execute(selectedLanguage, currentCode, {
          testCases,
          customInput: showCustomInput ? customInput : undefined,
          timeoutMs: 3000,
        })
        setWasmResult(result)
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setWasmResult({
          status: 'RE',
          engine: wasmSandboxService.getEngineLabel(selectedLanguage),
          executionMode: 'wasm',
          overallPassed: false,
          passedTests: 0,
          totalTests: 1,
          totalExecutionTimeMs: 0,
          peakMemoryKb: 0,
          testResults: [
            {
              testCaseIndex: 1,
              passed: false,
              input: showCustomInput ? customInput : '',
              expectedOutput: '',
              actualOutput: `Execution error: ${errMsg}`,
              logs: [],
              executionTimeMs: 0,
              memoryKb: 0,
              status: 'RE',
              error: errMsg,
            },
          ],
          rawLogs: [errMsg],
          feedback: 'Runtime error encountered during in-browser WebAssembly execution.',
        })
      } finally {
        setIsExecuting(false)
      }
    }, [
      disabled,
      isExecuting,
      showCustomInput,
      customInput,
      question.test_cases,
      selectedLanguage,
      currentCode,
    ])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        void handleRunWasmTests()
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const val = textarea.value
        const updated = `${val.substring(0, start)}  ${val.substring(end)}`
        onAnswer(updated)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        })
      }
    }

    const handleCursorUpdate = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget
      const pos = textarea.selectionStart
      const textBefore = textarea.value.substring(0, pos)
      const lines = textBefore.split('\n')
      const line = lines.length
      const col = lines[lines.length - 1].length + 1
      setCursorPos({ line, col })
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = e.clipboardData.getData('text')
      if (pasted && pasted.length > 20) {
        setPasteNotice({ chars: pasted.length, timestamp: Date.now() })
        setTimeout(() => {
          setPasteNotice(prev => (prev && Date.now() - prev.timestamp >= 2800 ? null : prev))
        }, 3000)
      }
    }

    const lineCount = currentCode ? currentCode.split('\n').length : 1

    return (
      <div className="space-y-4 font-sans" data-testid="coding-workbench">
        {/* Editor Container */}
        <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-xl">
          {/* Editor Header Toolbar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>Code Solution</span>
              </div>

              {/* Language Selector */}
              <div
                role="group"
                aria-label="Select Programming Language"
                className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs"
              >
                {(['python', 'javascript', 'typescript'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    aria-pressed={selectedLanguage === lang}
                    disabled={disabled}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                      selectedLanguage === lang
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {lang === 'typescript' ? 'TS' : lang === 'javascript' ? 'JS' : 'Python'}
                  </button>
                ))}
              </div>

              {/* Engine Badge */}
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <Zap className="w-3 h-3 text-amber-400" />
                {wasmSandboxService.getEngineLabel(selectedLanguage)}
              </span>

              {/* Keyboard Shortcut Hint */}
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700 text-[10px]">
                  Ctrl+Enter
                </kbd>{' '}
                run
              </span>

              {/* Proctoring Clipboard Paste Alert */}
              {pasteNotice && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded animate-pulse">
                  <ClipboardCheck className="w-3 h-3 text-amber-400" />
                  Clipboard: +{pasteNotice.chars} chars logged
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowCustomInput(!showCustomInput)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
                  showCustomInput
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Custom Input</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={handleReset}
                title="Reset to starter template"
                className="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800/60 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <Button
                type="button"
                disabled={disabled || isExecuting}
                onClick={handleRunWasmTests}
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing WASM...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Tests (WASM)</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Custom Input Drawer */}
          {showCustomInput && (
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 text-xs space-y-1.5">
              <label htmlFor={customInputId} className="block text-slate-300 font-medium">
                Custom Test Input / Arguments (passed to your function execution):
              </label>
              <textarea
                id={customInputId}
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="e.g. nums = [2, 7, 11, 15], target = 9"
                rows={2}
                className="w-full font-mono text-xs p-2.5 rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Code Textarea Surface */}
          <div className="relative">
            <textarea
              value={currentCode}
              onChange={e => onAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={handleCursorUpdate}
              onKeyUp={handleCursorUpdate}
              onClick={handleCursorUpdate}
              onPaste={handlePaste}
              disabled={disabled}
              aria-label="Code Editor"
              placeholder={disabled ? 'Section is locked.' : 'Write your code solution here...'}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="w-full min-h-[300px] p-4 font-mono text-xs sm:text-sm bg-slate-950 text-emerald-300 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-y leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed selection:bg-blue-600/40"
            />
            <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-slate-500 flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/60 backdrop-blur-sm">
              <span>
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
              <span>·</span>
              <span>
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
              <span>·</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>

        {/* Sample Test Cases Preview (if question has preconfigured test cases) */}
        {question.test_cases && question.test_cases.length > 0 && !wasmResult && (
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Preconfigured Sample Test Cases ({question.test_cases.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {question.test_cases.slice(0, 4).map((tc, idx) => (
                <div
                  key={tc.input ? `tc-in-${tc.input}` : `tc-out-${tc.output}`}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] space-y-1"
                >
                  <div className="text-slate-400 font-bold">Case {idx + 1}:</div>
                  <div className="text-slate-300 truncate">
                    <span className="text-slate-500">Input: </span>
                    {tc.input || '(empty)'}
                  </div>
                  <div className="text-emerald-400 truncate">
                    <span className="text-slate-500">Expected: </span>
                    {tc.output}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wasm Test Results View */}
        {wasmResult && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>In-Browser WebAssembly Test Results</span>
              </div>
              <button
                type="button"
                onClick={() => setWasmResult(null)}
                className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Clear Output</span>
              </button>
            </div>
            <WasmTestResultsView result={wasmResult} />
          </div>
        )}
      </div>
    )
  }
)
CodingQuestionWorkbench.displayName = 'CodingQuestionWorkbench'

export interface QuestionCardProps {
  question: TestQuestion
  currentIndex: number
  totalQuestions: number
  selectedAnswer: string | string[] | null
  isFlagged: boolean
  onAnswer: (optionId: string | string[]) => void
  onConfidenceChange: (confidence: string) => void
  confidence: string | undefined
  onFlag: () => void
  onUnflag: () => void
  assessmentMode?: string
  practiceChecked?: boolean
  onCheckPracticeAnswer?: () => void
  onDiagnoseMisconception?: () => void
  sectionTitle?: string
  isSectionLocked?: boolean
  examLanguage?: 'en' | 'hi'
  onClearAnswer?: () => void
  quotaInfo?: { maxAllowed?: number; currentAttempted?: number }
}

export const QuestionCard = memo(
  ({
    question,
    currentIndex,
    totalQuestions,
    selectedAnswer,
    confidence,
    isFlagged,
    onAnswer,
    onConfidenceChange,
    onFlag,
    onUnflag,
    assessmentMode,
    practiceChecked,
    onCheckPracticeAnswer,
    onDiagnoseMisconception,
    sectionTitle,
    isSectionLocked,
    examLanguage = 'en',
    onClearAnswer,
    quotaInfo,
  }: QuestionCardProps) => {
    const isCodingQuestion =
      question.question_type === 'coding' ||
      question.type === 'coding' ||
      Boolean(question.code_template) ||
      Boolean(question.starter_code) ||
      (Array.isArray(question.test_cases) && question.test_cases.length > 0)

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            {sectionTitle && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                {sectionTitle}
              </span>
            )}
            <button
              onClick={isFlagged ? onUnflag : onFlag}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors cursor-pointer ${
                isFlagged
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Flag className="w-4 h-4" />
              {isFlagged ? 'Flagged' : 'Flag'}
            </button>
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% Complete
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-6 md:p-8 shadow-md border border-gray-100 dark:border-gray-800 backdrop-blur-xl">
          {isSectionLocked && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Section Finalized & Locked</span>
                Answers in this section are sealed and cannot be modified under examination rules.
              </div>
            </div>
          )}
          {/* Section Attempt Quota Badge & Warning */}
          {quotaInfo && typeof quotaInfo.maxAllowed === 'number' && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs">
              <span className="font-semibold text-blue-800 dark:text-blue-300">
                Optional Section Quota: Attempted {quotaInfo.currentAttempted || 0} of {quotaInfo.maxAllowed} allowed
              </span>
              {quotaInfo.currentAttempted !== undefined &&
                quotaInfo.currentAttempted >= quotaInfo.maxAllowed &&
                !selectedAnswer && (
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    Quota limit reached. Clear response from another question to attempt this.
                  </span>
                )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <MathRenderer
              text={
                examLanguage === 'hi'
                  ? question.text_hi || question.hindi_text || question.text
                  : question.text
              }
              className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white leading-relaxed flex-1"
            />
            {selectedAnswer && onClearAnswer && !isSectionLocked && (
              <button
                type="button"
                onClick={onClearAnswer}
                className="shrink-0 self-start sm:self-auto text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clear selected answer (Prevents negative marks)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Response</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {isCodingQuestion ? (
              <CodingQuestionWorkbench
                question={question}
                selectedAnswer={selectedAnswer}
                onAnswer={onAnswer}
                disabled={isSectionLocked}
              />
            ) : question.question_type === 'subjective' || question.type === 'subjective' ? (
              <textarea
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={e => onAnswer(e.target.value)}
                disabled={isSectionLocked}
                placeholder={
                  isSectionLocked ? 'Section is locked.' : 'Type your detailed answer here...'
                }
                className="w-full min-h-[200px] p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y disabled:opacity-60 disabled:cursor-not-allowed"
              />
            ) : !question.options ||
              question.options.length === 0 ||
              question.question_type === 'numerical' ||
              question.type === 'numerical' ||
              question.question_type === 'fill_blank' ||
              question.type === 'fill_blank' ? (
              <div className="space-y-2">
                <input
                  type={
                    question.question_type === 'numerical' || question.type === 'numerical'
                      ? 'number'
                      : 'text'
                  }
                  value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                  onChange={e => onAnswer(e.target.value)}
                  disabled={isSectionLocked}
                  placeholder={isSectionLocked ? 'Section is locked.' : 'Type your answer here...'}
                  className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
                <span className="text-xs text-gray-500">
                  {question.question_type === 'numerical' || question.type === 'numerical'
                    ? 'Enter a numerical value (1% tolerance applied)'
                    : 'Enter your answer value'}
                </span>
              </div>
            ) : (
              (question.options ?? []).map(option => {
                const isMultiSelect =
                  question.question_type === 'multiple_select' || question.type === 'MSQ'
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(option.id)
                  : selectedAnswer === option.id

                const handleSelect = () => {
                  if (isSectionLocked) return
                  if (isMultiSelect) {
                    const current = Array.isArray(selectedAnswer)
                      ? [...selectedAnswer]
                      : selectedAnswer
                        ? [selectedAnswer]
                        : []
                    const next = current.includes(option.id)
                      ? current.filter(id => id !== option.id)
                      : [...current, option.id]
                    onAnswer(next)
                  } else {
                    onAnswer(option.id)
                  }
                }

                return (
                  <motion.button
                    key={option.id}
                    aria-pressed={isSelected}
                    aria-disabled={isSectionLocked}
                    whileHover={isSectionLocked ? undefined : { scale: 1.01 }}
                    whileTap={isSectionLocked ? undefined : { scale: 0.99 }}
                    onClick={handleSelect}
                    disabled={isSectionLocked}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 min-h-[52px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isSectionLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 ${isMultiSelect ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <MathRenderer
                        text={
                          examLanguage === 'hi'
                            ? option.text_hi || (option as any).hindi_text || option.text
                            : option.text
                        }
                        inline
                        className="text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>

          {/* Practice Mode Diagnostic & Socratic Scaffolding */}
          {assessmentMode === 'practice' && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Practice Mode: Test your intuition with instant feedback & Socratic AI</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onCheckPracticeAnswer && !practiceChecked && (
                  <Button
                    onClick={onCheckPracticeAnswer}
                    disabled={!selectedAnswer}
                    size="sm"
                    variant="primary"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Check Answer
                  </Button>
                )}
                {practiceChecked && onDiagnoseMisconception && (
                  <Button
                    onClick={onDiagnoseMisconception}
                    size="sm"
                    variant="outline"
                    className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1.5"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Socratic AI Hint</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Confidence Meter */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How confident are you in this answer?
            </h4>
            <div role="radiogroup" aria-label="Confidence Level" className="flex gap-3">
              {[
                {
                  level: 'LOW',
                  label: 'Low',
                  color:
                    'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
                  activeColor:
                    'bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'MEDIUM',
                  label: 'Medium',
                  color:
                    'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
                  activeColor:
                    'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'HIGH',
                  label: 'High',
                  color:
                    'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
                  activeColor:
                    'bg-green-500 text-white dark:bg-green-600 dark:text-white ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
                },
              ].map(({ level, label, color, activeColor }) => (
                <button
                  key={level}
                  role="radio"
                  aria-checked={confidence === level}
                  disabled={isSectionLocked}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => !isSectionLocked && onConfidenceChange(level as any)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    confidence === level ? activeColor : color
                  } ${isSectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

QuestionCard.displayName = 'QuestionCard'
