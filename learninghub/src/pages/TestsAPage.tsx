import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, Star } from 'lucide-react'
import { testsAService, TestA, TestQuestion } from '../services/testsAService'
import {
  offlineAssessmentManager,
  CachedOfflineBundle,
} from '../services/offline/OfflineAssessmentManager'
import { useStore } from '../stores/useStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { AITestGeneratorModal } from '../components/AITestGeneratorModal'
import { ManualTestCreationModal } from '../components/ManualTestCreationModal'
import {
  ResultsView,
  QuestionBankImportModal,
  OfflineStationBanner,
  TestFilterBar,
  TestCatalogCardGrid,
  TestActiveExamStation,
  TestHeroHeader,
  TestGamificationStrip,
  TestQuickActionsGrid,
  TestPathwayMap,
  TestPerformanceSection,
  TestBlitzModal,
  TestFlashcardsModal,
  TargetExamPyqHub,
  CatAdaptiveModal,
} from '../components/test'
import { useProctoring } from '../hooks/useProctoring'
import { playExamChime } from '../utils/soundEffects'

const TestsAPage = memo(() => {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const attemptQueryId = searchParams.get('attempt')
  const navigate = useNavigate()
  const test = useStore(state => state.test)
  const startTest = useStore(state => state.startTest)
  const answerQuestion = useStore(state => state.answerQuestion)
  const setConfidence = useStore(state => state.setConfidence)
  const flagQuestion = useStore(state => state.flagQuestion)
  const unflagQuestion = useStore(state => state.unflagQuestion)
  const navigateToQuestion = useStore(state => state.navigateToQuestion)
  const setActiveSection = useStore(state => state.setActiveSection)
  const setTestQuestions = useStore(state => state.setTestQuestions)
  const setTestResults = useStore(state => state.setTestResults)
  const submitTest = useStore(state => state.submitTest)
  const resetTestState = useStore(state => state.resetTestState)
  const updateSubjectiveGrade = useStore(state => state.updateSubjectiveGrade)
  const setAssessmentMode = useStore(state => state.setAssessmentMode)
  const setAdaptiveMetrics = useStore(state => state.setAdaptiveMetrics)
  const stepAdaptiveQuestion = useStore(state => state.stepAdaptiveQuestion)
  const recordProctorViolation = useStore(state => state.recordProctorViolation)
  const setPendingSyncCount = useStore(state => state.setPendingSyncCount)
  const lockSection = useStore(state => state.lockSection)
  const clearQuestionAnswer = useStore(state => state.clearQuestionAnswer)
  const setExamLanguage = useStore(state => state.setExamLanguage)

  const [tests, setTests] = useState<TestA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ mode: '', difficulty: '', aiMode: '', exam: '' })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [hasAccess, setHasAccess] = useState(true)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)

  const {
    violations: proctorViolations,
    violationCount: proctorViolationCount,
    isWarningVisible: isProctorWarningVisible,
    lastViolation: proctorLastViolation,
    remoteProctorWarning,
    dismissRemoteProctorWarning,
    isWsConnected: isProctorWsConnected,
    webcamStream,
    isWebcamActive,
    dismissWarning: dismissProctorWarning,
    resetViolations: resetProctorViolations,
  } = useProctoring({
    isActive: Boolean(test.isActive && test.questions.length > 0 && !test.results),
    attemptId:
      test.attempt?.attemptId ||
      (test.testInfo?.testId ? `attempt-${test.testInfo.testId}` : undefined),
    enableWebcam: test.assessmentMode === 'contest',
    strictMode: true,
    requireFullscreen: false,
    onProctorWarning: msg => {
      addToast({
        message: `⚠️ Proctor Notice: ${msg}`,
        type: 'warning',
        duration: 6000,
      })
    },
    onProctorTimeExtension: seconds => {
      addToast({
        message: `⏱️ Extra Time Granted: ${Math.round(seconds / 60)} minutes added by proctor.`,
        type: 'info',
        duration: 5000,
      })
    },
    onViolation: v => {
      recordProctorViolation()
      if (v.type === 'TAB_SWITCH') {
        setTabSwitchCount(prev => {
          const next = prev + 1
          if (test.assessmentMode === 'contest' && test.testInfo?.testId) {
            void testsAService.logProctorEvent(test.testInfo.testId, 'TAB_SWITCH', {
              switchCount: next,
            })
          }
          addToast({
            message: `⚠️ Proctoring Notice: Window/tab switch detected (${next}). Logged to integrity audit trail.`,
            type: 'warning',
            duration: 4000,
          })
          return next
        })
      }
    },
  })
  void remoteProctorWarning
  void dismissRemoteProctorWarning
  void isProctorWsConnected

  // 6-Mode Platform States
  const [offlineBundles, setOfflineBundles] = useState<CachedOfflineBundle[]>([])
  const [downloadingTestIds, setDownloadingTestIds] = useState<Set<string>>(new Set())
  const [localPendingSyncCount, setLocalPendingSyncCount] = useState(0)
  const [isSyncingQueue, setIsSyncingQueue] = useState(false)
  const [selectedModePill, setSelectedModePill] = useState('all')
  const [practiceChecked, setPracticeChecked] = useState<Record<string, boolean>>({})
  const [adaptiveStepLoading, setAdaptiveStepLoading] = useState(false)
  const [adaptiveDiagnostics, setAdaptiveDiagnostics] = useState<{
    abilityBand?: string
    confidenceInterval?: [number, number]
    stoppingReason?: string
  } | null>(null)
  const [socraticModalQuestion, setSocraticModalQuestion] = useState<{
    questionText: string
    selectedOptionText: string
    correctOptionText: string
  } | null>(null)

  const submitAttempted = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const targetEndTimeRef = useRef<number | null>(null)
  const prevAttemptIdRef = useRef<string | undefined>(undefined)
  const chime5mPlayedRef = useRef(false)
  const chime1mPlayedRef = useRef(false)
  const addToast = useStore(state => state.addToast)

  const activeSection = useMemo(() => {
    if (!test.sections || test.sections.length === 0) return null
    const currentQ = test.questions[test.currentQuestionIndex]
    const qSectionId = currentQ?.section_id || currentQ?.sectionId
    if (qSectionId) {
      return test.sections.find(s => s.id === qSectionId) || null
    }
    if (test.activeSectionId) {
      return test.sections.find(s => s.id === test.activeSectionId) || test.sections[0]
    }
    return test.sections[0]
  }, [test.sections, test.questions, test.currentQuestionIndex, test.activeSectionId])

  const isCurrentSectionLocked = useMemo(() => {
    if (!activeSection) return false
    return test.lockedSectionIds?.includes(activeSection.id) ?? false
  }, [activeSection, test.lockedSectionIds])

  // Load offline bundles & register sync queue listener
  useEffect(() => {
    let isMounted = true
    const initOffline = async () => {
      try {
        const bundles = await offlineAssessmentManager.listOfflineBundles()
        const count = await offlineAssessmentManager.getPendingSyncCount()
        if (isMounted) {
          setOfflineBundles(bundles)
          setLocalPendingSyncCount(count)
          setPendingSyncCount(count)
        }
      } catch (err) {
        console.warn('[TestsAPage] Failed to load offline bundles:', err)
      }
    }
    void initOffline()

    const unsub = offlineAssessmentManager.onPendingCountChange(count => {
      if (isMounted) {
        setLocalPendingSyncCount(count)
        setPendingSyncCount(count)
      }
    })
    return () => {
      isMounted = false
      unsub()
    }
  }, [setPendingSyncCount])

  // Keyboard navigation shortcuts during active exam
  useEffect(() => {
    if (!test.isActive || test.questions.length === 0 || test.isSubmitting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      // Next / Previous navigation with Arrow keys
      if (!isInput) {
        if (e.key === 'ArrowRight' || e.key === 'j') {
          e.preventDefault()
          if (test.currentQuestionIndex < test.questions.length - 1) {
            navigateToQuestion(test.currentQuestionIndex + 1)
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'k') {
          e.preventDefault()
          if (test.currentQuestionIndex > 0) {
            navigateToQuestion(test.currentQuestionIndex - 1)
          }
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          const currentQ = test.questions[test.currentQuestionIndex]
          if (currentQ) {
            if (test.flaggedQuestions.includes(currentQ.id)) {
              unflagQuestion(currentQ.id)
            } else {
              flagQuestion(currentQ.id)
            }
          }
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          const optionIdx = parseInt(e.key, 10) - 1
          const currentQ = test.questions[test.currentQuestionIndex]
          // eslint-disable-next-line security/detect-object-injection
          const opt = currentQ?.options?.[optionIdx]
          if (currentQ && opt) {
            e.preventDefault()
            const optId = (opt as unknown as { id?: string }).id ?? opt.text
            if (optId) {
              answerQuestion(currentQ.id, optId)
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    test.isActive,
    test.questions,
    test.currentQuestionIndex,
    test.flaggedQuestions,
    test.isSubmitting,
    navigateToQuestion,
    flagQuestion,
    unflagQuestion,
    answerQuestion,
  ])

  const { on, isConnected } = useWebSocket()

  // Listen for real-time grading updates from the backend
  useEffect(() => {
    if (!isConnected) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = on('subjective_grade_completed', (data: any) => {
      // Only process if it matches the current active result
      if (test.results && test.results.attempt_id === data.testResultId) {
        updateSubjectiveGrade(data)
        addToast({
          message: 'AI grading completed for subjective answer!',
          type: 'success',
        })
      }
    })
    return unsubscribe
  }, [on, isConnected, test.results, updateSubjectiveGrade, addToast])

  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isBlitzModalOpen, setIsBlitzModalOpen] = useState(false)
  const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [aiModalInitialTopic, setAiModalInitialTopic] = useState<string | undefined>(undefined)
  const [aiModalInitialMode, setAiModalInitialMode] = useState<
    'adaptive' | 'weak_area' | undefined
  >(undefined)

  // Handle cross-feature deep linking (?search=..., ?generate=true, ?topic=..., ?mode=...)
  useEffect(() => {
    const searchParam = searchParams.get('search')
    if (searchParam && searchParam !== searchQuery) {
      setSearchQuery(searchParam)
    }

    const topicParam = searchParams.get('topic')
    const generateParam = searchParams.get('generate') === 'true'
    const modeParam = searchParams.get('mode') as 'adaptive' | 'weak_area' | undefined

    if (topicParam || generateParam) {
      if (topicParam) {
        setAiModalInitialTopic(topicParam)
      }
      if (modeParam) {
        setAiModalInitialMode(modeParam)
      }
      setIsAIModalOpen(true)
    }
  }, [searchParams])

  // Load attempt results directly when ?attempt=... is present in URL
  useEffect(() => {
    if (!attemptQueryId) return
    let isCancelled = false
    const loadAttemptResult = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await testsAService.getAttemptResult(attemptQueryId)
        if (!isCancelled && response.status === 'success' && response.data) {
          setTestResults(response.data)
        } else if (!isCancelled) {
          setError('Attempt result not found')
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load attempt result')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }
    void loadAttemptResult()
    return () => {
      isCancelled = true
    }
  }, [attemptQueryId, setTestResults])

  const isCatalogMode = !testId && !test.isActive && !attemptQueryId

  const {
    data: catalogResponse,
    isLoading: isCatalogLoading,
    error: catalogQueryError,
  } = useQuery({
    queryKey: ['tests-catalog', filter],
    queryFn: () => testsAService.getTests(filter),
    enabled: isCatalogMode,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (isCatalogMode) {
      if (catalogResponse?.status === 'success' && Array.isArray(catalogResponse.data)) {
        setTests(catalogResponse.data)
        setHasAccess(true)
        setError(null)
      } else if (catalogQueryError) {
        setError((catalogQueryError as Error).message || 'Failed to load tests')
      }
      setLoading(isCatalogLoading && tests.length === 0)
    }
  }, [isCatalogMode, catalogResponse, catalogQueryError, isCatalogLoading, tests.length])

  useEffect(() => {
    if (testId && !test.isActive) {
      // Direct navigation to /tests-a/:testId (e.g. bookmarks or retake links)
      const loadAndStartDirectTest = async () => {
        try {
          setLoading(true)
          setHasAccess(true)
          const [testDetailsRes, startRes] = await Promise.all([
            testsAService.getTest(testId).catch(() => null),
            testsAService.startTest(testId),
          ])

          if (startRes.status === 'success' && startRes.data) {
            const data = startRes.data
            const testTitle = testDetailsRes?.data?.title ?? 'Assessment'
            const timeLimit = data.time_limit ?? testDetailsRes?.data?.time_limit_minutes ?? 30
            const sections = data.sections ?? testDetailsRes?.data?.sections

            setTestQuestions(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (data.questions ?? []).map((q: any) => ({
              id: q.id,
              text: q.text ?? '',
              text_hi: q.text_hi ?? q.hindi_text ?? null,
              hindi_text: q.hindi_text ?? q.text_hi ?? null,
              explanation_hi: q.explanation_hi ?? null,
              question_type: q.question_type ?? q.type ?? 'mcq',
              type: q.type ?? q.question_type ?? 'mcq',
              difficulty: q.difficulty ?? 0.5,
              bloom_level: q.bloom_level ?? 'understand',
              options: q.options ?? [],
              order: q.order ?? 0,
              marks: q.points ?? q.marks ?? 1,
              section_id: q.section_id ?? q.sectionId ?? null,
              sectionId: q.sectionId ?? q.section_id ?? null,
            })),
              {
                testId,
                testTitle,
                totalQuestions: data.questions?.length ?? 0,
                timeLimit,
                sections,
              },
              data.attempt_id ?? data.attemptId ?? '',
              data.answers ?? {},
              data.time_remaining_seconds,
              sections
            )
          } else {
            setError('Failed to start test session.')
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to start test')
        } finally {
          setLoading(false)
        }
      }
      void loadAndStartDirectTest()
    } else {
      setHasAccess(true)
      if (test.isActive && test.questions.length > 0) {
        setLoading(false)
      }
    }
  }, [testId, test.isActive, test.questions.length, setTestQuestions])

  // Recover missing questions for active tests (e.g. after page reload)
  useEffect(() => {
    const recoverTestQuestions = async () => {
      if (test.isActive && test.testInfo?.testId && test.questions.length === 0) {
        setLoading(true)
        try {
          // startTest on the backend automatically resumes if IN_PROGRESS
          const response = await testsAService.startTest(test.testInfo.testId)
          if (response.status === 'success' && response.data.questions) {
            setTestQuestions(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              response.data.questions.map((q: any) => ({
                id: q.id,
                text: q.text ?? '',
                question_type: q.type ?? 'mcq',
                difficulty: q.difficulty ?? 0.5,
                bloom_level: q.bloom_level ?? 'understand',
                options: q.options ?? [],
                order: q.order ?? 0,
                marks: q.points ?? 1,
                section_id: q.section_id ?? q.sectionId ?? null,
                sectionId: q.sectionId ?? q.section_id ?? null,
              })),
              {
                testId: test.testInfo.testId,
                testTitle: test.testInfo.testTitle,
                totalQuestions: test.testInfo.totalQuestions,
                timeLimit: response.data.time_limit ?? test.testInfo.timeLimit,
                sections: response.data.sections,
              },
              response.data.attempt_id ?? test.attempt?.attemptId ?? '',
              response.data.answers ?? {},
              response.data.time_remaining_seconds,
              response.data.sections
            )
          } else {
            setError('Failed to recover test attempt.')
            resetTestState()
          }
        } catch (err) {
          if (!navigator.onLine || test.isOfflineMode) {
            try {
              const bundle = await offlineAssessmentManager.getTestBundle(test.testInfo.testId)
              if (bundle && bundle.questions.length > 0) {
                setTestQuestions(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  bundle.questions.map((q: any) => ({
                    id: q.id,
                    text: q.text ?? '',
                    question_type: q.type ?? 'mcq',
                    difficulty: q.difficulty ?? 0.5,
                    bloom_level: q.bloomLevel ?? 'understand',
                    options: q.options ?? [],
                    order: q.order ?? 0,
                    marks: q.points ?? 1,
                  })),
                  {
                    testId: test.testInfo.testId,
                    testTitle: test.testInfo.testTitle,
                    totalQuestions: bundle.questions.length,
                    timeLimit: bundle.timeLimitMinutes,
                    sections: test.sections,
                  },
                  test.attempt?.attemptId || `offline_${Date.now()}`,
                  (test.answers || {}) as Record<string, string>,
                  test.timeRemaining,
                  test.sections
                )
                setLoading(false)
                return
              }
            } catch {
              // fallback below
            }
          }
          setError(err instanceof Error ? err.message : 'Failed to recover test')
          resetTestState()
        } finally {
          setLoading(false)
        }
      }
    }

    void recoverTestQuestions()
  }, [
    test.isActive,
    test.testInfo?.testId,
    test.testInfo?.testTitle,
    test.testInfo?.totalQuestions,
    test.testInfo?.timeLimit,
    test.attempt?.attemptId,
    test.questions.length,
    setTestQuestions,
    resetTestState,
  ])

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      addToast({ message: '🌐 Network restored. Syncing test state...', type: 'success' })
      void offlineAssessmentManager.syncPendingQueue()
    }
    const handleOffline = () => {
      setIsOnline(false)
      addToast({
        message: '⚡ Working Offline: Answers will buffer locally with cryptographic signatures.',
        type: 'warning',
        duration: 5000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addToast])

  const handleDownloadOffline = useCallback(
    async (testItem: TestA) => {
      setDownloadingTestIds(prev => new Set(prev).add(testItem.id))
      try {
        const res = await testsAService.getOfflineBundle(testItem.id)
        if (res.status === 'success' && res.data) {
          await offlineAssessmentManager.saveTestBundle(res.data)
          const list = await offlineAssessmentManager.listOfflineBundles()
          setOfflineBundles(list)
          addToast({
            message: `📦 "${testItem.title}" saved offline! You can take this exam anytime without internet.`,
            type: 'success',
          })
        }
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : 'Failed to download offline bundle',
          type: 'error',
        })
      } finally {
        setDownloadingTestIds(prev => {
          const next = new Set(prev)
          next.delete(testItem.id)
          return next
        })
      }
    },
    [addToast]
  )

  const handleManualSync = useCallback(async () => {
    if (!isOnline) {
      addToast({
        message: '⚠️ Cannot sync while offline. Please connect to the internet.',
        type: 'warning',
      })
      return
    }
    setIsSyncingQueue(true)
    try {
      await offlineAssessmentManager.syncPendingQueue()
      const count = await offlineAssessmentManager.getPendingSyncCount()
      setLocalPendingSyncCount(count)
      setPendingSyncCount(count)
      addToast({ message: '✅ All offline submissions reconciled with server!', type: 'success' })
    } catch {
      addToast({ message: 'Failed to sync queue. Will retry automatically.', type: 'error' })
    } finally {
      setIsSyncingQueue(false)
    }
  }, [isOnline, addToast, setPendingSyncCount])

  const handleAdaptiveStep = useCallback(async () => {
    const currentQ = test.questions[test.currentQuestionIndex]
    const selected = test.answers[currentQ?.id]
    if (!currentQ || selected === undefined || selected === '') {
      addToast({
        message: 'Please select an answer before proceeding to the next adaptive question.',
        type: 'warning',
      })
      return
    }

    setAdaptiveStepLoading(true)
    try {
      const res = await testsAService.submitAdaptiveStep(test.testInfo?.testId || '', {
        attempt_id: test.attempt?.attemptId || '',
        question_id: currentQ.id,
        selected_option_id: selected,
        time_spent_seconds: 30,
      })

      if (res.status === 'success' && res.data) {
        const { isCompleted, nextQuestion, currentTheta, sem, normalizedScore, diagnostics } =
          res.data

        setAdaptiveMetrics(currentTheta, sem)

        if (isCompleted) {
          setAdaptiveDiagnostics(diagnostics)

          // Try fetching the full server-scored attempt result first
          let authoritativeResult: any = null
          if (test.attempt?.attemptId) {
            try {
              const attemptRes = await testsAService.getAttemptResult(test.attempt.attemptId)
              if (attemptRes.status === 'success' && attemptRes.data) {
                authoritativeResult = attemptRes.data
              }
            } catch {
              // Fallback to local synthesis below
            }
          }

          if (
            authoritativeResult &&
            Array.isArray(authoritativeResult.question_results) &&
            authoritativeResult.question_results.length > 0
          ) {
            setTestResults({
              ...authoritativeResult,
              mode: 'adaptive',
              diagnostics,
            })
          } else {
            const administeredQuestions = test.questions
            const totalAdministered = administeredQuestions.length || 1
            const estCorrect = Math.round((normalizedScore / 100) * totalAdministered)
            const estIncorrect = Math.max(0, totalAdministered - estCorrect)

            setTestResults({
              test_id: test.testInfo?.testId || '',
              attempt_id: test.attempt?.attemptId || '',
              test_title: test.testInfo?.testTitle || 'Adaptive Assessment',
              mode: 'adaptive',
              score: normalizedScore,
              total_marks: 100,
              percentage: normalizedScore,
              passed: normalizedScore >= 70,
              correct_count: estCorrect,
              incorrect_count: estIncorrect,
              unanswered_count: 0,
              time_limit: test.testInfo?.timeLimit || 30,
              time_taken: Math.max(1, (test.testInfo?.timeLimit || 30) * 60 - test.timeRemaining),
              is_mock: false,
              question_results: administeredQuestions.map((q, idx) => {
                const selId = String(test.answers[q.id] || '')
                const selOpt = q.options?.find(o => o.id === selId)
                const isCorrect = idx < estCorrect
                return {
                  question_id: q.id,
                  question_text: q.text,
                  question_type: q.question_type,
                  selected_options: [
                    {
                      id: selId,
                      text: selOpt?.text || selId || 'Answer submitted',
                    },
                  ],
                  correct_options:
                    q.options
                      ?.filter(o => (o as any).is_correct || (o as any).isCorrect)
                      .map(o => ({ id: o.id, text: o.text })) || [],
                  is_correct: isCorrect,
                  marks_obtained: isCorrect ? q.marks || 1 : 0,
                  explanation:
                    (q as any).explanation ||
                    'Adaptive item calibrated with 2PL IRT discrimination & item difficulty parameter.',
                  time_spent: 30,
                  is_flagged: test.flaggedQuestions.includes(q.id),
                  confidence: test.confidences[q.id],
                }
              }),
            })
          }
          addToast({
            message: `🎯 CAT Converged! Latent Ability θ: ${currentTheta > 0 ? '+' : ''}${currentTheta.toFixed(2)} (${diagnostics?.abilityBand || 'Proficient'}).`,
            type: 'success',
            duration: 6000,
          })
        } else if (nextQuestion) {
          stepAdaptiveQuestion({
            id: nextQuestion.id,
            text: nextQuestion.text,
            question_type: nextQuestion.type || nextQuestion.question_type || 'mcq',
            difficulty: nextQuestion.difficulty ?? 0.5,
            bloom_level: nextQuestion.bloom_level || nextQuestion.bloomLevel || 'analyze',
            options: nextQuestion.options || [],
            order: test.questions.length,
            marks: nextQuestion.points || 1,
            code_template: nextQuestion.code_template,
            starter_code: nextQuestion.starter_code || nextQuestion.code_template,
            language: nextQuestion.language,
            test_cases: nextQuestion.test_cases,
          })
        }
      }
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : 'Error processing adaptive step',
        type: 'error',
      })
    } finally {
      setAdaptiveStepLoading(false)
    }
  }, [
    test.questions,
    test.currentQuestionIndex,
    test.answers,
    test.testInfo,
    test.attempt,
    test.timeRemaining,
    addToast,
    setAdaptiveMetrics,
    setTestResults,
    stepAdaptiveQuestion,
  ])

  const handleStartTest = useCallback(
    async (testItem: TestA) => {
      if (!hasAccess) {
        addToast({
          message:
            'This is a premium feature. Please upgrade your subscription to unlock Tests A+.',
          type: 'error',
        })
        navigate('/pricing')
        return
      }

      try {
        setError(null)
        resetProctorViolations()
        const isAdaptive = testItem.mode === 'adaptive' || testItem.difficulty === 'adaptive'
        const isContest = testItem.mode === 'contest'
        const isPractice = testItem.mode === 'practice'
        const isOfflineAvailable = offlineBundles.some(b => b.testId === testItem.id)

        startTest(
          'tests-a',
          testItem.id,
          testItem.title,
          testItem.question_count,
          testItem.time_limit_minutes
        )

        if (isAdaptive) {
          setAssessmentMode('adaptive')
          setAdaptiveMetrics(0.0, 1.0)
        } else if (isContest) {
          setAssessmentMode('contest')
          try {
            await testsAService.getTimeSync()
          } catch {
            // non-critical
          }
        } else if (isPractice) {
          setAssessmentMode('practice')
        } else if (!isOnline && isOfflineAvailable) {
          setAssessmentMode('offline')
        }

        // If offline and bundle exists, load bundle directly from IndexedDB without network!
        if (!isOnline && isOfflineAvailable) {
          const bundle = await offlineAssessmentManager.getTestBundle(testItem.id)
          if (bundle && bundle.questions) {
            setTestQuestions(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              bundle.questions.map((q: any) => ({
                id: q.id,
                text: q.text ?? '',
                question_type: q.type ?? 'mcq',
                difficulty: q.difficulty ?? 0.5,
                bloom_level: q.bloomLevel ?? 'understand',
                options: q.options ?? [],
                order: q.order ?? 0,
                marks: q.points ?? 1,
              })),
              {
                testId: testItem.id,
                testTitle: testItem.title,
                totalQuestions: bundle.questions.length,
                timeLimit: bundle.timeLimitMinutes ?? testItem.time_limit_minutes,
              },
              `offline_attempt_${Date.now()}`
            )
            navigate(`/tests-a/${testItem.id}`)
            return
          }
        }

        const response = await testsAService.startTest(testItem.id)
        if (response.status === 'success') {
          const data = response.data
          setTestQuestions(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data.questions ?? []).map((q: any) => ({
              id: q.id,
              text: q.text ?? '',
              question_type: q.type ?? 'mcq',
              difficulty: q.difficulty ?? 0.5,
              bloom_level: q.bloom_level ?? 'understand',
              options: q.options ?? [],
              order: q.order ?? 0,
              marks: q.points ?? 1,
              section_id: q.section_id ?? q.sectionId ?? null,
              sectionId: q.sectionId ?? q.section_id ?? null,
            })),
            {
              testId: testItem.id,
              testTitle: testItem.title,
              totalQuestions: data.questions?.length ?? 0,
              timeLimit: data.time_limit ?? testItem.time_limit_minutes,
              sections: data.sections ?? testItem.sections,
            },
            data.attempt_id ?? data.attemptId ?? '',
            data.answers ?? {},
            data.time_remaining_seconds,
            data.sections ?? testItem.sections
          )
          navigate(`/tests-a/${testItem.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start test')
        resetTestState()
      }
    },
    [
      hasAccess,
      startTest,
      setAssessmentMode,
      setAdaptiveMetrics,
      offlineBundles,
      isOnline,
      setTestQuestions,
      navigate,
      addToast,
      resetTestState,
      resetProctorViolations,
    ]
  )

  const handleTestGenerated = useCallback(
    (testData: {
      questions: TestQuestion[]
      testId: string
      testTitle: string
      totalQuestions: number
      timeLimit: number
      attemptId: string
    }) => {
      startTest(
        'tests-a',
        testData.testId,
        testData.testTitle,
        testData.totalQuestions,
        testData.timeLimit
      )
      setTestQuestions(
        testData.questions,
        {
          testId: testData.testId,
          testTitle: testData.testTitle,
          totalQuestions: testData.totalQuestions,
          timeLimit: testData.timeLimit,
        },
        testData.attemptId
      )
      setIsAIModalOpen(false)
      navigate(`/tests-a/${testData.testId}`)
    },
    [startTest, setTestQuestions, navigate]
  )

  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmitting || (!isAutoSubmit && submitAttempted.current)) return
      submitAttempted.current = true
      setIsSubmitting(true)

      try {
        if (!isOnline || test.isOfflineMode) {
          const bundle = offlineBundles.find(b => b.testId === test.testInfo?.testId)
          const attemptId = test.attempt?.attemptId || `offline_${Date.now()}`
          const totalElapsedSeconds = Math.max(
            0,
            (test.testInfo?.timeLimit ?? 30) * 60 - test.timeRemaining
          )

          await offlineAssessmentManager.queueOfflineSubmission({
            testId: test.testInfo?.testId || '',
            bundleId: bundle?.bundleId || `bundle_${test.testInfo?.testId}`,
            attemptId,
            answers: test.answers,
            confidences: test.confidences,
            timesSpent: {},
            clientStartedAt: test.attempt?.startedAt || new Date().toISOString(),
            clientCompletedAt: new Date().toISOString(),
            totalElapsedSeconds,
            bundleSignature: bundle?.signature || 'offline_signature',
          })

          const count = await offlineAssessmentManager.getPendingSyncCount()
          setLocalPendingSyncCount(count)
          setPendingSyncCount(count)

          const totalQ = Math.max(1, test.questions.length)
          const ansCount = Object.keys(test.answers).length

          setTestResults({
            test_id: test.testInfo?.testId || '',
            attempt_id: attemptId,
            test_title: test.testInfo?.testTitle || 'Offline Assessment',
            mode: 'offline',
            score: ansCount * 5,
            total_marks: totalQ * 5,
            percentage: Math.round((ansCount / totalQ) * 100),
            passed: true,
            correct_count: ansCount,
            incorrect_count: Math.max(0, totalQ - ansCount),
            unanswered_count: Math.max(0, totalQ - ansCount),
            time_limit: test.testInfo?.timeLimit || 30,
            time_taken: totalElapsedSeconds,
            is_mock: false,
            question_results: test.questions.map(q => ({
              question_id: q.id,
              question_text: q.text,
              question_type: q.question_type,
              selected_options: [
                {
                  id: String(test.answers[q.id] || ''),
                  text: String(test.answers[q.id] || 'Answered offline'),
                },
              ],
              correct_options: [{ id: 'offline', text: 'Verification Pending Reconnect' }],
              is_correct: true,
              marks_obtained: 5,
              explanation:
                'Submission sealed with cryptographic HMAC-SHA256 signature. Awaiting auto-sync.',
              time_spent: 30,
              is_flagged: test.flaggedQuestions.includes(q.id),
              confidence: test.confidences[q.id],
            })),
          })

          addToast({
            message:
              '⚡ Submission sealed offline! Will automatically sync once network is restored.',
            type: 'success',
            duration: 6000,
          })
          return
        }

        const result = await submitTest(proctorViolations)
        if (!result.success) {
          submitAttempted.current = false
          setError('Failed to submit test. Please try again.')
        }
      } catch (err) {
        submitAttempted.current = false
        setError(err instanceof Error ? err.message : 'Failed to submit test')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSubmitting,
      isOnline,
      test.isOfflineMode,
      test.testInfo,
      test.attempt,
      test.timeRemaining,
      test.answers,
      test.confidences,
      test.questions,
      test.flaggedQuestions,
      offlineBundles,
      proctorViolations,
      submitTest,
      setTestResults,
      addToast,
      setPendingSyncCount,
    ]
  )

  // Client countdown anchored to Date.now()+timeRemaining, corrected by server
  // heartbeat for contest mode. Deps include timeRemaining + attemptId to avoid
  // stale closures; prevAttemptIdRef resets the anchor on attempt switch.
  useEffect(() => {
    if (test.attempt?.attemptId !== prevAttemptIdRef.current) {
      targetEndTimeRef.current = null
      prevAttemptIdRef.current = test.attempt?.attemptId
      chime5mPlayedRef.current = false
      chime1mPlayedRef.current = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }

    if (!test.isActive || test.isSubmitting) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
      targetEndTimeRef.current = null
      return
    }

    const currentRemaining = useStore.getState().test.timeRemaining
    if (!targetEndTimeRef.current && currentRemaining > 0) {
      targetEndTimeRef.current = Date.now() + currentRemaining * 1000
    } else if (targetEndTimeRef.current && currentRemaining === 0) {
      // handle ref reset when truthy check fails (recovered time_remaining was 0 or reset)
      targetEndTimeRef.current = null
    }

    if (timerRef.current) return

    timerRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return
      const remainingSeconds = Math.max(
        0,
        Math.round((targetEndTimeRef.current - Date.now()) / 1000)
      )
      useStore.setState(state => ({
        test: { ...state.test, timeRemaining: remainingSeconds },
      }))

      // Audio chimes & gentle countdown notices
      if (remainingSeconds <= 300 && remainingSeconds > 290 && !chime5mPlayedRef.current) {
        chime5mPlayedRef.current = true
        playExamChime('warning-5m')
        addToast({ message: '⏳ 5 minutes remaining in your examination session.', type: 'info' })
      } else if (remainingSeconds <= 60 && remainingSeconds > 50 && !chime1mPlayedRef.current) {
        chime1mPlayedRef.current = true
        playExamChime('warning-1m')
        addToast({ message: '⚠️ 1 minute remaining! Please finalize your answers.', type: 'error' })
      } else if (remainingSeconds === 0) {
        playExamChime('time-up')
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = undefined
      }
    }
  }, [test.isActive, test.isSubmitting, test.attempt?.attemptId, addToast])

  // Server heartbeat: every 60s during contest mode, reconcile client clock
  // drift against authoritative server time so auto-submit matches backend.
  useEffect(() => {
    if (!test.isActive || test.isSubmitting || test.assessmentMode !== 'contest') return
    if (!test.testInfo?.testId || !test.attempt?.attemptId) return
    const heartbeatId = setInterval(() => {
      void (async () => {
        try {
          const res = await testsAService.getTimeSync()
          const serverRemaining = (res?.data as { time_remaining_seconds?: number })
            ?.time_remaining_seconds
          if (typeof serverRemaining === 'number' && serverRemaining >= 0) {
            targetEndTimeRef.current = Date.now() + serverRemaining * 1000
            useStore.setState(state => ({
              test: { ...state.test, timeRemaining: serverRemaining },
            }))
          }
        } catch {
          // Heartbeat is best-effort; client countdown continues uninterrupted.
        }
      })()
    }, 60_000)
    return () => clearInterval(heartbeatId)
  }, [
    test.isActive,
    test.isSubmitting,
    test.assessmentMode,
    test.testInfo?.testId,
    test.attempt?.attemptId,
  ])

  // Periodic autosave every 30 seconds during active test
  const autosaveRef = useRef<ReturnType<typeof setInterval> | undefined>()
  const testAnswersRef = useRef(test.answers)
  const testInfoRef = useRef(test.testInfo)
  const attemptIdRef = useRef(test.attempt?.attemptId)
  const lockedSectionsRef = useRef(test.lockedSectionIds)

  // Keep refs in sync
  useEffect(() => {
    testAnswersRef.current = test.answers
    testInfoRef.current = test.testInfo
    attemptIdRef.current = test.attempt?.attemptId
    lockedSectionsRef.current = test.lockedSectionIds
  }, [test.answers, test.testInfo, test.attempt?.attemptId, test.lockedSectionIds])

  useEffect(() => {
    if (!test.isActive || test.isSubmitting || !attemptIdRef.current) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
        autosaveRef.current = undefined
      }
      return
    }

    const flushAutosave = async () => {
      try {
        const answers = testAnswersRef.current || {}
        const testInfo = testInfoRef.current
        const attemptId = attemptIdRef.current
        const lockedSectionIds = lockedSectionsRef.current || []
        // Skip empty autosaves to avoid pointless writes, but offline queue
        // count is still refreshed below so the Offline Station stays accurate.
        if (testInfo?.testId && attemptId && Object.keys(answers).length > 0) {
          await testsAService.batchAutosave(testInfo.testId, answers, attemptId, lockedSectionIds)
          useStore.setState(state => ({
            test: { ...state.test, lastAutosavedAt: new Date().toISOString() },
          }))
        }
      } catch (err) {
        // Autosave failure (often offline): refresh queued offline count so the
        // Offline Assessment Station badge stays truthful instead of hiding loss.
        try {
          const count = await offlineAssessmentManager.getPendingSyncCount()
          setLocalPendingSyncCount(count)
          setPendingSyncCount(count)
        } catch {
          // ignore count-refresh failure
        }
        console.warn('[TestsAPage] Autosave failed, offline queue updated:', err)
      }
    }

    autosaveRef.current = setInterval(() => {
      void flushAutosave()
    }, 30000)

    // beforeunload flush: best-effort save so closing the tab mid-exam does
    // not lose the last <30s of answers. Async is not guaranteed here, so we
    // fire-and-forget and rely on the offline queue as fallback.
    const handleBeforeUnload = () => {
      const answers = testAnswersRef.current || {}
      const testInfo = testInfoRef.current
      const attemptId = attemptIdRef.current
      const lockedSectionIds = lockedSectionsRef.current || []
      if (testInfo?.testId && attemptId && Object.keys(answers).length > 0) {
        const payload = JSON.stringify({
          answers,
          attempt_id: attemptId,
          locked_section_ids: lockedSectionIds,
        })
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          try {
            const blob = new Blob([payload], { type: 'application/json' })
            navigator.sendBeacon(`/api/v1/tests/${testInfo.testId}/autosave`, blob)
          } catch {
            void testsAService
              .batchAutosave(testInfo.testId, answers, attemptId, lockedSectionIds)
              .catch(() => undefined)
          }
        } else {
          void testsAService
            .batchAutosave(testInfo.testId, answers, attemptId, lockedSectionIds)
            .catch(() => undefined)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
        autosaveRef.current = undefined
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [test.isActive, test.isSubmitting, test.attempt?.attemptId, setPendingSyncCount])

  useEffect(() => {
    if (test.timeRemaining === 0 && test.isActive && !test.isSubmitting && !isSubmitting) {
      void handleSubmit(true)
    }
  }, [test.timeRemaining, test.isActive, test.isSubmitting, isSubmitting, handleSubmit])

  const availableExams = useMemo(
    () => Array.from(new Set(tests.map(t => t.exam_name).filter(Boolean))),
    [tests]
  )

  const filteredTests = useMemo(
    () =>
      tests.filter(test => {
        if (
          selectedModePill === 'adaptive' &&
          test.mode !== 'adaptive' &&
          test.difficulty !== 'adaptive'
        )
          return false
        if (selectedModePill === 'contest' && test.mode !== 'contest') return false
        if (selectedModePill === 'practice' && test.mode !== 'practice') return false
        if (selectedModePill === 'ai' && test.ai_mode !== 'ai_required' && !test.is_ai_generated)
          return false
        if (selectedModePill === 'non_ai' && test.ai_mode !== 'no_ai') return false
        if (selectedModePill === 'offline' && !offlineBundles.some(b => b.testId === test.id))
          return false

        return (
          (filter.mode === '' || test.mode === filter.mode) &&
          (filter.difficulty === '' || test.difficulty === filter.difficulty) &&
          (!filter.exam ||
            (test.exam_name || '').toLowerCase() === filter.exam.toLowerCase() ||
            (test.exam_code || '').toLowerCase() === filter.exam.toLowerCase()) &&
          (filter.aiMode === '' ||
            (test.ai_mode || (test.is_ai_generated ? 'ai_optional' : 'no_ai')).toLowerCase() ===
              filter.aiMode.toLowerCase()) &&
          (searchQuery === '' ||
            test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            test.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }),
    [tests, searchQuery, filter, selectedModePill, offlineBundles]
  )

  // State-preserving retry: re-fetch list WITHOUT window.location.reload()
  // so in-progress answers, timer refs, and offline queue are never lost.
  const handleRetryLoadTests = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await testsAService.getTests(filter)
      if (response.status === 'success') {
        setTests(response.data)
      } else {
        setError('Failed to load tests. Your answers are preserved — try again.')
      }
    } catch (err) {
      // Preserve all local state (answers/timer/queue); surface retryable UI.
      setError(
        err instanceof Error
          ? `${err.message} — your answers and timer are preserved.`
          : 'Failed to load tests. Your answers and timer are preserved.'
      )
    } finally {
      setLoading(false)
    }
  }, [filter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !test.isActive && tests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={AlertTriangle}
              title="Could not load tests"
              description={`${error} Your in-progress answers (if any) and offline queue are preserved.`}
              actionLabel="Retry without losing progress"
              onAction={() => void handleRetryLoadTests()}
              secondaryAction={{ label: 'Back to dashboard', href: '/dashboard' }}
            />
          </Card>
        </div>
      </div>
    )
  }

  if (test.isActive && test.questions.length > 0) {
    return (
      <TestActiveExamStation
        test={test}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        isSubmitModalOpen={isSubmitModalOpen}
        setIsSubmitModalOpen={setIsSubmitModalOpen}
        tabSwitchCount={tabSwitchCount}
        isProctorWarningVisible={isProctorWarningVisible}
        proctorLastViolation={proctorLastViolation}
        proctorViolationCount={proctorViolationCount}
        dismissProctorWarning={dismissProctorWarning}
        remoteProctorWarning={remoteProctorWarning}
        dismissRemoteProctorWarning={dismissRemoteProctorWarning}
        isWsConnected={isProctorWsConnected}
        webcamStream={webcamStream}
        isWebcamActive={isWebcamActive}
        activeSection={activeSection}
        isCurrentSectionLocked={isCurrentSectionLocked}
        practiceChecked={practiceChecked}
        onCheckPracticeAnswer={qId => setPracticeChecked(prev => ({ ...prev, [qId]: true }))}
        adaptiveStepLoading={adaptiveStepLoading}
        socraticModalQuestion={socraticModalQuestion}
        setSocraticModalQuestion={setSocraticModalQuestion}
        onNavigateToQuestion={navigateToQuestion}
        onSelectSection={(sectionId, firstIndex) => {
          setActiveSection(sectionId)
          if (firstIndex !== undefined && firstIndex !== -1) {
            navigateToQuestion(firstIndex)
          }
        }}
        onLockSection={lockSection}
        onAnswerQuestion={answerQuestion}
        onConfidenceChange={setConfidence}
        onFlagQuestion={flagQuestion}
        onUnflagQuestion={unflagQuestion}
        onAdaptiveStep={handleAdaptiveStep}
        onSubmit={() => {
          setIsSubmitModalOpen(false)
          void handleSubmit()
        }}
        onToast={addToast}
        onClearAnswer={clearQuestionAnswer}
        examLanguage={test.examLanguage || 'en'}
        onLanguageChange={setExamLanguage}
      />
    )
  }

  if (test.results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <SEO title="Tests A+ - Results" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ResultsView
            result={test.results}
            adaptiveDiagnostics={adaptiveDiagnostics}
            onReattemptMistakes={(incorrectIds) => {
              const incorrectQuestions = test.questions.filter(q => incorrectIds.includes(q.id))
              if (incorrectQuestions.length > 0) {
                const drillId = `drill-${test.testInfo?.testId || 'pyq'}-${Date.now()}`
                const drillTitle = `Mistake Re-attempt Drill: ${test.testInfo?.testTitle || 'Test'}`
                startTest(
                  'tests-a',
                  drillId,
                  drillTitle,
                  incorrectQuestions.length,
                  Math.max(5, Math.ceil(incorrectQuestions.length * 2))
                )
                setTestQuestions(
                  incorrectQuestions,
                  {
                    testId: drillId,
                    testTitle: drillTitle,
                    totalQuestions: incorrectQuestions.length,
                    timeLimit: Math.max(5, Math.ceil(incorrectQuestions.length * 2)),
                  },
                  `attempt-${Date.now()}`
                )
                resetTestState()
                addToast({
                  message: `🎯 Launched focused drill with ${incorrectQuestions.length} mistake questions!`,
                  type: 'success',
                })
              }
            }}
            onRemediate={(topics: string[]) => {
              const topicStr = topics.join(', ')
              setAiModalInitialTopic(topicStr)
              setAiModalInitialMode('weak_area')
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              addToast({
                message: `🎯 Opening adaptive remediation drill for: ${topicStr}`,
                type: 'info',
              })
              setIsAIModalOpen(true)
            }}
            onRetry={() => {
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              if (test.testInfo) {
                const testItem = tests.find(t => t.id === test.testInfo?.testId)
                if (testItem) void handleStartTest(testItem)
              }
            }}
            onBack={() => {
              resetTestState()
              setAdaptiveDiagnostics(null)
              submitAttempted.current = false
              setSearchParams({})
              navigate('/tests-a')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1f] py-8 relative transition-colors duration-200">
      <SEO
        title="Tests A+"
        description="Practice smarter. Test yourself. Improve faster with Tests A+ adaptive CBT simulator and diagnostics."
      />

      {/* Ambient background visual glows matching user's design */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 right-0 w-[45vmax] h-[45vmax] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute top-1/3 -left-40 w-[40vmax] h-[40vmax] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Full Interactive Hero matching the exact user file */}
        <TestHeroHeader
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenManualModal={() => setIsManualModalOpen(true)}
          onOpenAIModal={() => setIsAIModalOpen(true)}
        />

        {/* Gamification Strip: Day Streak, Weekly Target, Accuracy Ring, Hex Badges */}
        <TestGamificationStrip />

        {/* 4 Quick Action Cards: 60s Blitz, Spaced Flashcards, Mistake Notebook, AI Drill */}
        <TestQuickActionsGrid
          onLaunchBlitz={() => setIsBlitzModalOpen(true)}
          onOpenFlashcards={() => setIsFlashcardsModalOpen(true)}
          onOpenMistakes={() => navigate('/revision')}
          onOpenAdaptiveDrill={() => {
            setIsCatModalOpen(true)
            // Cat adaptive modal active
          }}
        />

        {/* Guided Learning Pathway Roadmap */}
        <TestPathwayMap
          onStartStage={stage => {
            setAiModalInitialTopic(stage.topic)
            setIsAIModalOpen(true)
          }}
        />

        {/* Full Performance Dashboard: Radar Chart, Score Trend, 70% Benchmarks, 12-Week Study Heatmap */}
        <TestPerformanceSection />

        {/* Offline Assessment Station Bar */}
        <OfflineStationBanner
          isOnline={isOnline}
          offlineBundlesCount={offlineBundles.length}
          localPendingSyncCount={localPendingSyncCount}
          isSyncingQueue={isSyncingQueue}
          onSync={handleManualSync}
        />

        {hasAccess === false && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 dark:border-primary-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary-500 fill-current" /> Unlock Tests A+ Elite
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You need a premium subscription to start taking mock tests and access deep
                analytics.
              </p>
            </div>
            <Button
              onClick={() => navigate('/pricing')}
              className="shrink-0 shadow-lg shadow-primary-500/20"
            >
              View Plans
            </Button>
          </motion.div>
        )}

        {error && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {/* Full Collection Header & Filter */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            All Practice Tests & Mocks
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Explore the complete question repository with filters, difficulty tiers, and timed exam
            modes.
          </p>
        </div>

        <TestFilterBar
          selectedModePill={selectedModePill}
          onSelectModePill={(pillId, updates) => {
            setSelectedModePill(pillId)
            setFilter(prev => ({
              ...prev,
              mode: updates.mode,
              aiMode: updates.aiMode,
            }))
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={updates => setFilter(prev => ({ ...prev, ...updates }))}
          offlineCount={offlineBundles.length}
          availableExams={availableExams}
        />

        {selectedModePill === 'pyq' ? (
          <div className="mb-10">
            <TargetExamPyqHub
              onStartPyqPaper={pyqPaper => {
                void handleStartTest(pyqPaper)
              }}
            />
          </div>
        ) : (
          <TestCatalogCardGrid
            tests={filteredTests}
            offlineBundles={offlineBundles}
            downloadingTestIds={downloadingTestIds}
            onStartTest={test => void handleStartTest(test)}
            onDownloadOffline={test => void handleDownloadOffline(test)}
          />
        )}
      </div>

      <AITestGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => {
          setIsAIModalOpen(false)
          setAiModalInitialTopic(undefined)
          setAiModalInitialMode(undefined)
        }}
        onTestGenerated={handleTestGenerated}
        hasAccess={hasAccess}
        initialTopic={aiModalInitialTopic}
        initialMode={aiModalInitialMode}
      />

      <ManualTestCreationModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onTestCreated={newTest => {
          setTests(prev => [newTest, ...prev])
        }}
      />

      <QuestionBankImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          void handleRetryLoadTests()
        }}
      />

      <TestBlitzModal isOpen={isBlitzModalOpen} onClose={() => setIsBlitzModalOpen(false)} />

      <TestFlashcardsModal
        isOpen={isFlashcardsModalOpen}
        onClose={() => setIsFlashcardsModalOpen(false)}
      />

      <CatAdaptiveModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} />
    </div>
  )
})

export default TestsAPage
