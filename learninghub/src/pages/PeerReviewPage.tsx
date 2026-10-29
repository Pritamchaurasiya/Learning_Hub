import { useState, useEffect } from 'react'
import {
  CheckSquare,
  Clock,
  Award,
  FileCode2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  X,
} from 'lucide-react'
import {
  peerReviewService,
  PeerReviewAssignment,
  RubricCriterion,
} from '../services/peerReviewService'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useStore } from '../stores/useStore'

export default function PeerReviewPage() {
  const addToast = useStore(s => s.addToast)
  const [activeTab, setActiveTab] = useState<'pending' | 'feedback'>('pending')
  const [pendingReviews, setPendingReviews] = useState<PeerReviewAssignment[]>([])
  const [feedbackReviews, setFeedbackReviews] = useState<PeerReviewAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [activeReview, setActiveReview] = useState<PeerReviewAssignment | null>(null)

  // Evaluation modal form state
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const [pending, feedback] = await Promise.all([
          peerReviewService.getPendingReviews(),
          peerReviewService.getMyFeedback(),
        ])
        if (isMounted) {
          setPendingReviews(pending)
          setFeedbackReviews(feedback)
        }
      } catch {
        // fallback handles errors gracefully
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenReviewModal = (assignment: PeerReviewAssignment) => {
    setActiveReview(assignment)
    // Initialize default rubric scores
    const initialScores: Record<string, number> = {}
    assignment.rubric.forEach(r => {
      initialScores[r.id] = Math.round(r.maxScore * 0.9)
    })
    setScores(initialScores)
    setComments('')
  }

  const calculateTotalScore = (rubric: RubricCriterion[]): number => {
    const totalAchieved = rubric.reduce((acc, r) => acc + (scores[r.id] || 0), 0)
    const maxPossible = rubric.reduce((acc, r) => acc + r.maxScore, 0)
    return maxPossible > 0 ? Math.round((totalAchieved / maxPossible) * 100) : 0
  }

  const handleSubmitEvaluation = async () => {
    if (!activeReview) return
    if (!comments.trim() || comments.trim().length < 20) {
      addToast({
        message: 'Please provide constructive feedback (at least 20 characters).',
        type: 'warning',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const computedScore = calculateTotalScore(activeReview.rubric)
      const updated = await peerReviewService.submitReview({
        assignmentId: activeReview.id,
        comments,
        criteriaScores: scores,
        score: computedScore,
      })

      // Update state
      setPendingReviews(prev => prev.filter(r => r.id !== activeReview.id))
      setFeedbackReviews(prev => [updated, ...prev])

      addToast({
        message: `Evaluation submitted (+30 XP awarded for peer review)!`,
        type: 'success',
      })
      setActiveReview(null)
    } catch (err: any) {
      addToast({ message: err?.message || 'Failed to submit review', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-primary-950 p-8 sm:p-10 border border-emerald-800/40 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Collaborative Peer Evaluation Engine
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Peer Reviews & Code Critique
          </h1>
          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed">
            Review algorithmic solutions submitted by peers, calibrate code against standardized
            rubrics, and receive in-depth technical critiques on your own submissions.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={() => setActiveTab('pending')}
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'pending'
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-emerald-950/60 text-white hover:bg-emerald-950'
              }`}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Pending Reviews ({pendingReviews.length})
            </Button>
            <Button
              onClick={() => setActiveTab('feedback')}
              variant="outline"
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'feedback'
                  ? 'bg-white text-gray-900 border-white hover:bg-gray-100'
                  : 'text-white border-emerald-400/40 hover:bg-emerald-800/40'
              }`}
            >
              <Award className="w-4 h-4 mr-2" />
              My Feedback ({feedbackReviews.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              Assignments Assigned to You for Evaluation
            </h2>
            <span className="text-xs text-gray-500">
              Each completed review earns you +30 Karma XP
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">Loading assignments...</div>
          ) : pendingReviews.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                All Assigned Reviews Completed!
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                You have no pending peer evaluations. New peer solutions will automatically appear
                here when classmates submit coding assignments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingReviews.map(item => (
                <Card
                  key={item.id}
                  className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.courseTitle}
                      </span>
                      <span className="text-xs text-amber-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Due {new Date(item.dueBy).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {item.submissionTitle}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Author: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.authorName}</span> • Language: <span className="font-semibold uppercase">{item.language || 'TypeScript'}</span>
                    </p>

                    {item.codeSnippet && (
                      <div className="rounded-xl bg-gray-950 p-3 overflow-x-auto text-[11px] font-mono text-gray-300 border border-gray-800 max-h-36 custom-scrollbar">
                        <pre>{item.codeSnippet.slice(0, 300)}...</pre>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400">
                      {item.rubric.length} Evaluation Criteria
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenReviewModal(item)}
                      className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Start Evaluation
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Evaluations & Feedback Received
          </h2>

          {feedbackReviews.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No Feedback Received Yet
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Submit coding assignments in the Problem Workspace to receive detailed peer reviews
                and rubric scoring.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackReviews.map(item => (
                <Card
                  key={item.id}
                  className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {item.submissionTitle}
                      </h3>
                      <p className="text-xs text-gray-500">{item.courseTitle}</p>
                    </div>
                    {item.feedback && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-emerald-500">
                          {item.feedback.score}
                        </span>
                        <span className="text-xs text-gray-400">/ 100 Overall</span>
                      </div>
                    )}
                  </div>

                  {item.feedback && (
                    <div className="space-y-3 pt-2">
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                          Reviewer Comments
                        </h4>
                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                          "{item.feedback.comments}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {item.rubric.map(r => {
                          const score = item.feedback?.criteriaScores[r.id] ?? 0
                          const pct = Math.round((score / r.maxScore) * 100)
                          return (
                            <div
                              key={r.id}
                              className="p-3 rounded-xl bg-gray-100/70 dark:bg-gray-800/40 space-y-1"
                            >
                              <span className="text-[10px] font-semibold text-gray-500 truncate block">
                                {r.label}
                              </span>
                              <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-white">
                                <span>
                                  {score} / {r.maxScore}
                                </span>
                                <span className="text-[10px] text-emerald-500">{pct}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluation Rubric Modal */}
      {activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setActiveReview(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                Peer Review Rubric
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {activeReview.submissionTitle}
              </h3>
              <p className="text-xs text-gray-500">
                Author: {activeReview.authorName} • {activeReview.courseTitle}
              </p>
            </div>

            {/* Code Snippet */}
            {activeReview.codeSnippet && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-emerald-500" />
                  Submitted Code Snippet
                </label>
                <div className="rounded-2xl bg-gray-950 p-4 font-mono text-xs text-gray-200 overflow-x-auto max-h-48 border border-gray-800 custom-scrollbar">
                  <pre>{activeReview.codeSnippet}</pre>
                </div>
              </div>
            )}

            {/* Rubric Criteria Sliders */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Score by Criteria (Total: {calculateTotalScore(activeReview.rubric)} / 100)
              </h4>
              <div className="space-y-3">
                {activeReview.rubric.map(criterion => {
                  const current = scores[criterion.id] ?? criterion.maxScore
                  return (
                    <div
                      key={criterion.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                            {criterion.label}
                          </h5>
                          <p className="text-[11px] text-gray-500">{criterion.description}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                          {current} / {criterion.maxScore}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={criterion.maxScore}
                        value={current}
                        onChange={e =>
                          setScores(prev => ({
                            ...prev,
                            [criterion.id]: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Detailed Feedback & Code Critique
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Explain what went well, edge case risks, and specific suggestions for optimization..."
                rows={4}
                className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 custom-scrollbar resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setActiveReview(null)}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitEvaluation}
                disabled={isSubmitting}
                className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Peer Evaluation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
