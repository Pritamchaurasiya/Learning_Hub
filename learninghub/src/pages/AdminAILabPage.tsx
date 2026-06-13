import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../stores/useStore'
import { adminService } from '../services/adminService'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Sparkles, Loader2, BookOpen, Layers, BarChart } from 'lucide-react'

export default function AdminAILabPage() {
  const [prompt, setPrompt] = useState('')
  const [difficulty, setDifficulty] = useState('BEGINNER')
  const [modulesCount, setModulesCount] = useState(3)
  const [isGenerating, setIsGenerating] = useState(false)
  const addToast = useStore(state => state.addToast)
  const navigate = useNavigate()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      addToast({ message: 'Initializing AI generation pipeline...', type: 'info' })
      const res = await adminService.generateCourse(prompt, difficulty, modulesCount)
      addToast({ message: 'Course successfully generated!', type: 'success' })
      navigate(`/course/${res.data.courseId}`)
    } catch (error: any) {
      addToast({
        message: error.message ?? 'Failed to generate course',
        type: 'error',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            AI Course Workshop
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Autonomously generate full courses, complete with modules and markdown-rich lessons.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Topic / Prompt
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A comprehensive guide to building microservices in Node.js and Docker, focusing on scalability."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-blue-500" />
                  Target Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Number of Modules (Max 8)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={modulesCount}
                  onChange={e => setModulesCount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="w-full sm:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Curriculum... (This may take ~30s)
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    Autogenerate Course
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        {isGenerating && (
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-4 flex items-start gap-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                AI is constructing the course...
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Our Gemini 2.0 model is currently outlining the syllabus, breaking it into modules,
                and generating highly detailed markdown lessons for your specified topic. Please
                don&apos;t navigate away.
              </p>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}
