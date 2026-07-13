import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Sparkles } from 'lucide-react'
import { useStore } from '../stores/useStore'
import { aiTutorService } from '../services/aiTutorService'
import { testsAService } from '../services/testsAService'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface AITestGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onTestGenerated: (testData: {
    questions: any[]
    testId: string
    testTitle: string
    totalQuestions: number
    timeLimit: number
    attemptId: string
  }) => void
  hasAccess?: boolean
}

export const AITestGeneratorModal = memo(function AITestGeneratorModal({
  isOpen,
  onClose,
  onTestGenerated,
  hasAccess = true,
}: AITestGeneratorModalProps) {
  const auth = useStore(state => state.auth)
  const addToast = useStore(state => state.addToast)

  const [isGenerating, setIsGenerating] = useState(false)
  const [aiTestMode, setAiTestMode] = useState<'adaptive' | 'weak_area'>('adaptive')
  const [aiTestTopic, setAiTestTopic] = useState('')
  const [aiTestDifficulty, setAiTestDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [aiTestCount, setAiTestCount] = useState<number>(10)

  useEffect(() => {
    if (isOpen && auth.user?.examPreference) {
      const pref = auth.user.examPreference
      if (pref.difficulty) {
        const diff = pref.difficulty.toLowerCase()
        if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
          setAiTestDifficulty(diff as 'easy' | 'medium' | 'hard')
        }
      }
      if (pref.subjects && pref.subjects.length > 0) {
        setAiTestTopic(pref.subjects[0].name)
      }
    }
  }, [isOpen, auth.user?.examPreference])

  const handleGenerate = useCallback(async () => {
    if (!hasAccess) {
      addToast({ message: 'AI Test Generation is a premium feature.', type: 'error' })
      return
    }

    try {
      setIsGenerating(true)
      let response
      if (aiTestMode === 'weak_area') {
        response = await aiTutorService.generateWeakAreaTest(aiTestCount)
      } else {
        if (!aiTestTopic.trim()) {
          addToast({
            message:
              aiTestMode === 'adaptive'
                ? 'Please select or enter a topic.'
                : 'Please enter a topic.',
            type: 'warning',
          })
          setIsGenerating(false)
          return
        }
        response = await aiTutorService.generatePracticeQuestions(
          aiTestTopic,
          aiTestDifficulty,
          aiTestCount
        )
      }

      if (response.status === 'success') {
        const data = response.data
        const generatedTestId = data.testId || data.test_id
        if (!generatedTestId) {
          throw new Error('AI generated a test but did not return a persisted test id.')
        }

        const started = await testsAService.startTest(generatedTestId)
        if (started.status !== 'success') {
          throw new Error('Generated test could not be started.')
        }

        const startData = started.data
        const startedQuestions = startData.questions ?? data.questions ?? []
        const questions = startedQuestions.map((q: any, i: number) => ({
          id: q.id,
          text: q.text ?? '',
          question_type: q.question_type ?? q.type ?? 'mcq',
          difficulty: q.difficulty ?? 0.5,
          bloom_level: q.bloom_level ?? 'apply',
          options: q.options ?? [],
          order: q.order ?? i,
          marks: q.marks ?? q.points ?? 1,
        }))
        const testTitle =
          data.title ||
          (aiTestMode === 'weak_area' ? 'Targeted Weak Area Mock' : `Adaptive: ${aiTestTopic}`)
        const totalQuestions = questions.length || data.question_count
        const timeLimit = startData.time_limit ?? data.time_limit

        onTestGenerated({
          questions,
          testId: generatedTestId,
          testTitle,
          totalQuestions,
          timeLimit,
          attemptId: startData.attempt_id ?? startData.attemptId ?? '',
        })
        onClose()
      } else {
        throw new Error((response.data as any)?.error ?? 'Failed to generate test.')
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('AI Test Generation failed:', err)
      }
      addToast({ message: 'Failed to generate AI Test', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }, [
    hasAccess,
    aiTestMode,
    aiTestCount,
    aiTestTopic,
    aiTestDifficulty,
    onTestGenerated,
    onClose,
    addToast,
  ])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isGenerating && onClose()}
      title="AI Dynamic Test Generation"
    >
      <div className="space-y-6 py-4">
        {auth.user?.examPreference?.exam && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-xs text-purple-800 dark:text-purple-300 font-medium">
              Generating questions matching the{' '}
              <strong>{auth.user.examPreference.exam.name}</strong> exam pattern.
            </span>
          </div>
        )}

        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => setAiTestMode('adaptive')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              aiTestMode === 'adaptive'
                ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Adaptive Subject
          </button>
          <button
            onClick={() => setAiTestMode('weak_area')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              aiTestMode === 'weak_area'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BrainCircuit className="w-4 h-4" /> Target Weak Areas
          </button>
        </div>

        <AnimatePresence mode="wait">
          {aiTestMode === 'adaptive' ? (
            <motion.div
              key="adaptive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject / Topic
                </label>
                {auth.user?.examPreference?.subjects &&
                  auth.user.examPreference.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {auth.user.examPreference.subjects.map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setAiTestTopic(sub.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
                            aiTestTopic === sub.name
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-transparent text-white shadow-md transform scale-105'
                              : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAiTestTopic('')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          !auth.user.examPreference.subjects.some(
                            sub => sub.name === aiTestTopic
                          ) && aiTestTopic !== ''
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                        }`}
                      >
                        Custom Topic
                      </button>
                    </div>
                  )}
                <Input
                  placeholder="e.g. Advanced Calculus"
                  value={aiTestTopic}
                  onChange={e => setAiTestTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Difficulty
                </label>
                <select
                  value={aiTestDifficulty}
                  onChange={e => setAiTestDifficulty(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="weak_area"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  The AI Engine will analyze your historical Topic Performance and generate a
                  specialized test heavily weighted towards the areas where you are{' '}
                  <strong>Developing</strong> or <strong>Weak</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Number of Questions
          </label>
          <input
            type="range"
            min="5"
            max="20"
            step="5"
            value={aiTestCount}
            onChange={e => setAiTestCount(parseInt(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5</span>
            <span>{aiTestCount} Questions</span>
            <span>20</span>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (!aiTestTopic.trim() && aiTestMode === 'adaptive')}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 border-none text-white shadow-lg"
        >
          {isGenerating ? (
            <span className="animate-pulse flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 animate-spin" /> Neural Syncing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Generate Deep Learning Mock
            </span>
          )}
        </Button>
      </div>
    </Modal>
  )
})

export default AITestGeneratorModal
