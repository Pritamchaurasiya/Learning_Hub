import { useState, useEffect, useCallback } from 'react'
import {
  Route,
  MapPin,
  Clock,
  BookOpen,
  CheckCircle,
  Lock,
  Play,
  ChevronRight,
  Target,
  Award,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { learningPathService, type LearningPath } from '../services/learningPathService'
import { useStore } from '../stores/useStore'

const levels = ['All', 'Beginner', 'Intermediate', 'Advanced']

export default function LearningPathPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [showEnrolled, setShowEnrolled] = useState(false)
  const { addToast } = useStore()

  const fetchPaths = useCallback(async () => {
    try {
      const res = await learningPathService.getLearningPaths()
      setPaths(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[LearningPathPage] Failed to fetch paths:', err)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchPaths().then(() => {
      if (controller.signal.aborted) return
    })
    return () => controller.abort()
  }, [fetchPaths])

  const handleEnroll = async (pathId: string) => {
    try {
      await learningPathService.enrollInPath(pathId)
      addToast({ message: 'Successfully enrolled in learning path!', type: 'success' })
      void fetchPaths()
    } catch (err) {
      addToast({ message: 'Failed to enroll', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[LearningPathPage] Failed to enroll:', err)
      }
    }
  }

  const filteredPaths = paths.filter(path => {
    const matchesLevel = selectedLevel === 'All' || path.level === selectedLevel
    const matchesEnrolled = !showEnrolled || path.enrolled
    return matchesLevel && matchesEnrolled
  })

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      case 'Intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
      case 'Advanced':
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <>
      <SEO
        title="Learning Paths - LearningHub"
        description="Structured learning paths to achieve your career goals"
        keywords="learning paths, career, roadmap"
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Learning Paths</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Structured roadmaps to achieve your career goals
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {levels.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLevel === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showEnrolled}
                onChange={e => setShowEnrolled(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show enrolled only</span>
            </label>
          </div>
        </Card>

        {/* Learning Paths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPaths.map(path => (
            <Card key={path.id} hover className="overflow-hidden">
              {/* Header */}
              <div className="aspect-video bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center relative">
                <Route className="w-16 h-16 text-white/80" />
                {path.enrolled && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enrolled
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(path.level)}`}
                    >
                      {path.level}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {path.duration}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {path.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {path.description}
                  </p>
                </div>

                {/* Skills */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Skills you&apos;ll learn
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {path.skills.map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{path.courses} courses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{path.duration}</span>
                  </div>
                </div>

                {/* Progress */}
                {path.enrolled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {path.completed_courses}/{path.courses} courses completed
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {path.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: `${path.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {path.enrolled ? (
                    <Button className="w-full" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      Continue Learning
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      leftIcon={<Lock className="w-4 h-4" />}
                      onClick={() => handleEnroll(path.id)}
                    >
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Paths */}
        {filteredPaths.length === 0 && (
          <div className="text-center py-12">
            <Route className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No learning paths found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters</p>
          </div>
        )}

        {/* Benefits Section */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Why follow a learning path?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Structured Roadmap</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Clear path from beginner to expert
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Career Focused</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Skills aligned with job requirements
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Self-Paced</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Learn at your own schedule
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
