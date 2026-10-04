import React, { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  UploadCloud,
  FileText,
  FileCode,
  Download,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  HelpCircle,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { MathRenderer } from '../MathRenderer'
import {
  questionBankService,
  RawQuestionInput,
  ImportResult,
} from '../../services/questionBankService'
import {
  parseQuestionsCSV,
  generateSampleQuestionsCSV,
  generateSampleQuestionsJSON,
} from '../../utils/csvParser'
import { useStore } from '../../stores/useStore'

export interface QuestionBankImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (result: ImportResult) => void
  targetTestId?: string
  targetTestTitle?: string
}

type TabType = 'upload' | 'paste' | 'templates'

export const QuestionBankImportModal: React.FC<QuestionBankImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  targetTestId,
  targetTestTitle,
}) => {
  const addToast = useStore(state => state.addToast)

  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json'>('csv')
  const [pastedText, setPastedText] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState<RawQuestionInput[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row?: number; error: string }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    setParsedQuestions([])
    setParseErrors([])
    setImportSummary(null)
    setPastedText('')
    setExpandedIndex(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  // Handle parsing raw text
  const parseRawContent = (content: string, format: 'csv' | 'json') => {
    setIsProcessing(true)
    setParseErrors([])
    setImportSummary(null)

    try {
      if (format === 'json') {
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) {
          setParseErrors([{ error: 'JSON payload must be an array of question objects.' }])
          setParsedQuestions([])
          return
        }

        const validQuestions: RawQuestionInput[] = []
        const errors: Array<{ row: number; error: string }> = []

        parsed.forEach((item, idx) => {
          if (!item.text || typeof item.text !== 'string' || item.text.trim().length < 3) {
            errors.push({
              row: idx + 1,
              error: `Question at index ${idx + 1} must have a valid "text" with at least 3 characters.`,
            })
            return
          }
          if (
            (item.type === 'MCQ' || item.type === 'MSQ') &&
            (!Array.isArray(item.options) || item.options.length < 2)
          ) {
            errors.push({
              row: idx + 1,
              error: `Question at index ${idx + 1} (${item.type}) requires at least 2 options.`,
            })
            return
          }

          validQuestions.push({
            text: String(item.text).trim(),
            type: item.type || 'MCQ',
            difficulty: typeof item.difficulty === 'number' ? item.difficulty : 0.5,
            bloomLevel: item.bloomLevel || 'UNDERSTAND',
            points: typeof item.points === 'number' && item.points > 0 ? item.points : 10,
            explanation: item.explanation ? String(item.explanation) : undefined,
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            options: Array.isArray(item.options)
              ? item.options.map((opt: any, optIdx: number) => ({
                  text: String(opt.text || ''),
                  isCorrect: Boolean(opt.isCorrect),
                  explanation: opt.explanation ? String(opt.explanation) : undefined,
                  order: typeof opt.order === 'number' ? opt.order : optIdx,
                }))
              : [],
            topicId: item.topicId || undefined,
            testId: targetTestId || item.testId || undefined,
          })
        })

        setParsedQuestions(validQuestions)
        setParseErrors(errors)
      } else {
        // CSV Parsing
        const res = parseQuestionsCSV(content)
        setParsedQuestions(res.questions)
        setParseErrors(res.errors)
      }
    } catch (err) {
      setParseErrors([
        {
          error:
            err instanceof Error
              ? `Syntax error during parsing: ${err.message}`
              : 'Failed to parse content. Please check formatting.',
        },
      ])
      setParsedQuestions([])
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const format = file.name.endsWith('.json') ? 'json' : 'csv'
    const reader = new FileReader()

    reader.onload = event => {
      const text = event.target?.result as string
      if (text) {
        parseRawContent(text, format)
      }
    }

    reader.readAsText(file)
  }

  // Download template helpers
  const handleDownloadCSVTemplate = () => {
    const csvContent = generateSampleQuestionsCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'learninghub_sample_questions.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadJSONTemplate = () => {
    const jsonContent = generateSampleQuestionsJSON()
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'learninghub_sample_questions.json')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Submit ingestion to backend
  const handleExecuteImport = async () => {
    if (parsedQuestions.length === 0) return

    setIsSubmitting(true)
    try {
      const result = await questionBankService.importQuestions({
        testId: targetTestId,
        questions: parsedQuestions,
        skipDuplicates,
      })

      setImportSummary(result)
      addToast({
        message: `Successfully processed ${result.totalProcessed} questions (${result.importedCount} ingested, ${result.skippedDuplicates} duplicates skipped).`,
        type: 'success',
      })

      if (onImportComplete) {
        onImportComplete(result)
      }
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? `Import failed: ${err.message}`
            : 'Question Bank bulk import encountered a server error.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove single question from staging list
  const handleRemoveStagedQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== index))
  }

  // Metrics summary
  const metrics = useMemo(() => {
    const total = parsedQuestions.length
    const mcqCount = parsedQuestions.filter(q => q.type === 'MCQ').length
    const msqCount = parsedQuestions.filter(q => q.type === 'MSQ').length
    const tfCount = parsedQuestions.filter(q => q.type === 'TRUE_FALSE').length
    const otherCount = total - mcqCount - msqCount - tfCount
    const avgDiff =
      total > 0
        ? (parsedQuestions.reduce((acc, q) => acc + q.difficulty, 0) / total).toFixed(2)
        : '0.00'
    const totalPoints = parsedQuestions.reduce((acc, q) => acc + q.points, 0)

    return { total, mcqCount, msqCount, tfCount, otherCount, avgDiff, totalPoints }
  }, [parsedQuestions])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Bulk Ingest Questions
                {targetTestTitle && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs">
                    Target: {targetTestTitle}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Import multiple questions at once from CSV or JSON with instant schema & KaTeX validation.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6 gap-6 bg-white dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            File Upload (CSV/JSON)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Direct Paste
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Templates & Spec
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Drop your CSV or JSON file here, or browse
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports UTF-8 encoded files up to 10 MB (supports LaTeX formulas e.g. $O(N)$)
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    .CSV
                  </span>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    .JSON
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Data Format:
                </span>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-800">
                  <button
                    onClick={() => setPasteFormat('csv')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      pasteFormat === 'csv'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => setPasteFormat('json')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      pasteFormat === 'json'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder={
                  pasteFormat === 'csv'
                    ? 'Question,Type,OptionA,OptionB,OptionC,OptionD,CorrectOption\n"What is $2+2$?",MCQ,3,4,5,6,B'
                    : '[\n  {\n    "text": "What is 2+2?",\n    "type": "MCQ",\n    "options": [\n      { "text": "3", "isCorrect": false },\n      { "text": "4", "isCorrect": true }\n    ]\n  }\n]'
                }
                rows={9}
                className="w-full font-mono text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPastedText('')}
                  disabled={!pastedText}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => parseRawContent(pastedText, pasteFormat)}
                  disabled={!pastedText.trim() || isProcessing}
                >
                  {isProcessing ? 'Validating...' : 'Parse & Validate'}
                </Button>
              </div>
            </div>
          )}

          {/* Tab 3: Templates & Guidance */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Standard CSV Template
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Includes columns for Question text, Question Type, Bloom's Taxonomy, Options A-D,
                    Answer Key, Math equations, and Tags.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCSVTemplate}
                    className="w-full flex items-center justify-center gap-2 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                  >
                    <Download className="w-4 h-4" /> Download Sample CSV
                  </Button>
                </Card>

                <Card className="p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-purple-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Structured JSON Schema
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Full JSON specification supporting multi-choice (MSQ), numerical ranges, code blocks,
                    and detailed solutions.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadJSONTemplate}
                    className="w-full flex items-center justify-center gap-2 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-400"
                  >
                    <Download className="w-4 h-4" /> Download Sample JSON
                  </Button>
                </Card>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <h5 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> Best Practices for Math & Equations
                </h5>
                <ul className="text-xs text-blue-800 dark:text-blue-300/90 list-disc list-inside space-y-1">
                  <li>Use single dollar signs for inline math: <code>$O(N \log N)$</code></li>
                  <li>Use double dollar signs for centered display equations: <code>$$\sum_{'{i=1}'}^n i$$</code></li>
                  <li>CorrectOption in CSV can be specified as letters (A, B, C) or 1-based indices (1, 2, 3).</li>
                  <li>For Multi-Select (MSQ), separate keys with commas: <code>A,C,D</code></li>
                </ul>
              </div>
            </div>
          )}

          {/* Validation Errors Box */}
          {parseErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Found {parseErrors.length} Issue(s) during parsing:</span>
              </div>
              <ul className="text-xs text-red-600 dark:text-red-300 max-h-32 overflow-y-auto space-y-1 list-disc list-inside">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>
                    {err.row ? <span className="font-semibold">Row {err.row}: </span> : null}
                    {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Staging Section */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    Valid Questions
                  </span>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.total}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    Types
                  </span>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
                    {metrics.mcqCount} MCQ • {metrics.msqCount} MSQ • {metrics.tfCount} T/F
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    Avg Difficulty
                  </span>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {metrics.avgDiff} / 5
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                    Total Marks
                  </span>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {metrics.totalPoints} pts
                  </p>
                </div>
              </div>

              {/* Ingestion Settings */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Skip existing duplicate questions (matched by question text)</span>
                </label>
                <span className="text-gray-400">Ready to ingest</span>
              </div>

              {/* Preview Staged List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <span>Questions Preview ({parsedQuestions.length})</span>
                  <button
                    onClick={handleReset}
                    className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {parsedQuestions.map((q, idx) => {
                    const isExpanded = expandedIndex === idx
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 shadow-sm text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-500">#{idx + 1}</span>
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 text-[10px]">
                                {q.type}
                              </Badge>
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px]">
                                Diff: {q.difficulty}
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 text-[10px]">
                                {q.bloomLevel}
                              </Badge>
                              <span className="text-gray-400 ml-auto">{q.points} pts</span>
                            </div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              <MathRenderer text={q.text} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              title="Toggle Options"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveStagedQuestion(idx)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Options & Explanation */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1.5 pl-2">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`flex items-center gap-2 p-1.5 rounded-lg ${
                                  opt.isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {opt.isCorrect ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 inline-block text-center text-[10px] text-gray-400">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                )}
                                <MathRenderer text={opt.text} />
                              </div>
                            ))}
                            {q.explanation && (
                              <div className="text-[11px] text-gray-500 italic mt-1 pt-1 border-t border-gray-50 dark:border-gray-750">
                                Solution: <MathRenderer text={q.explanation} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Import Complete Success Banner */}
          {importSummary && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Ingestion Completed Successfully</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {importSummary.importedCount} questions successfully added to the Question Bank.
                {importSummary.skippedDuplicates > 0 &&
                  ` (${importSummary.skippedDuplicates} duplicates were safely skipped).`}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {importSummary ? 'Done' : 'Cancel'}
          </Button>

          <div className="flex items-center gap-3">
            {parsedQuestions.length > 0 && !importSummary && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Ingesting to DB...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Import {parsedQuestions.length} Questions</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
export default QuestionBankImportModal
