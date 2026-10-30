import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  Clock,
  FileText,
  Target,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { getCuratedSubjectsForExam } from '../../data/examCatalogData'

interface TopicMasteryRecord {
  topicName: string
  accuracy: number
  totalAttempts: number
}

interface ExamPreparationOverviewWidgetProps {
  topicMastery?: Record<string, TopicMasteryRecord>
  onOpenCatModal?: () => void
}

export const ExamPreparationOverviewWidget: React.FC<ExamPreparationOverviewWidgetProps> = ({
  topicMastery = {},
  onOpenCatModal,
}) => {
  const navigate = useNavigate()
  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeSubjects = useLearningContextStore(s => s.activeSubjects)
  const preparationStage = useLearningContextStore(s => s.preparationStage)
  const examAuthority = useLearningContextStore(s => s.examAuthority)

  const examName = activeExam?.name || 'JEE Main'
  const examSlug = activeExam?.slug || 'jee-main'

  // Subjects fallback
  const subjects = useMemo(() => {
    if (activeSubjects && activeSubjects.length > 0) return activeSubjects
    if (activeExam) {
      return activeExam.subjects || getCuratedSubjectsForExam(activeExam.id, activeExam.slug) || []
    }
    return []
  }, [activeSubjects, activeExam])

  // Count total topics and mastered topics
  const { totalTopics, masteredTopics, syllabusProgress } = useMemo(() => {
    let total = 0
    let mastered = 0

    subjects.forEach(sub => {
      const topics = sub.topics || []
      total += Math.max(topics.length, 4) // minimum baseline of 4 topics per subject

      topics.forEach(top => {
        const match = topicMastery[top.name] || topicMastery[top.slug]
        if (match && match.accuracy >= 70 && match.totalAttempts >= 3) {
          mastered += 1
        }
      })
    })

    const progress = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0
    return { totalTopics: total, masteredTopics: mastered, syllabusProgress: progress }
  }, [subjects, topicMastery])

  // Official Exam Milestones
  const milestones = useMemo(() => {
    const isMedical = examSlug.includes('neet')
    const isGovt = examSlug.includes('ssc') || examSlug.includes('upsc')
    const isGate = examSlug.includes('gate')
    const isTech = examSlug.includes('dsa') || examSlug.includes('software')

    if (isMedical) {
      return [
        {
          label: 'Information Bulletin & Application',
          date: 'Feb - Mar 2026',
          status: 'COMPLETED',
        },
        { label: 'City Intimation & Admit Card', date: 'Late April 2026', status: 'UPCOMING' },
        { label: 'NEET-UG National Exam', date: 'First Sunday of May', status: 'TARGET' },
        { label: 'NTA All-India Rank / Cutoffs', date: 'June 2026', status: 'FUTURE' },
      ]
    }

    if (isGovt) {
      return [
        { label: 'Official Exam Notification', date: 'Published', status: 'COMPLETED' },
        { label: 'Application Verification Window', date: 'Completed', status: 'COMPLETED' },
        { label: 'Tier 1 Computer-Based Test (CBT)', date: 'Target Window', status: 'TARGET' },
        { label: 'Tier 2 Descriptive & Skill Test', date: 'Subsequent Stage', status: 'FUTURE' },
      ]
    }

    if (isGate) {
      return [
        { label: 'Candidate Registration', date: 'Closed', status: 'COMPLETED' },
        { label: 'Official Admit Card Release', date: 'Jan 2026', status: 'COMPLETED' },
        { label: 'National GATE Examination', date: 'Feb 2026', status: 'TARGET' },
        { label: 'Scorecard & COAP Admissions', date: 'March 2026', status: 'FUTURE' },
      ]
    }

    if (isTech) {
      return [
        { label: 'Core Foundations (DSA & Complexity)', date: 'Sprint 1', status: 'COMPLETED' },
        {
          label: 'Medium-Hard Patterns (Trees, Graphs, DP)',
          date: 'Current Focus',
          status: 'TARGET',
        },
        { label: 'System Design & Real-World Case Studies', date: 'Next Up', status: 'UPCOMING' },
        { label: 'Mock Technical Rounds & Live Bar-Raiser', date: 'Final Stage', status: 'FUTURE' },
      ]
    }

    // Default JEE Main
    return [
      { label: 'NTA JEE Session 1 Registration', date: 'Nov - Dec', status: 'COMPLETED' },
      { label: 'Session 1 CBT Examination', date: 'January Session', status: 'COMPLETED' },
      { label: 'Session 2 Final CBT Examination', date: 'April Target', status: 'TARGET' },
      { label: 'JEE Advanced & JoSAA Counseling', date: 'May - June', status: 'FUTURE' },
    ]
  }, [examSlug])

  return (
    <div className="space-y-6" data-testid="exam-preparation-overview-widget">
      {/* Header & Overall Syllabus Progress */}
      <Card className="p-6 gradient-border bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {examAuthority || 'National Examination Authority'}
              </span>
              {preparationStage && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                  {preparationStage.replace('_', ' ')}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1">
              {examName} Preparation & Syllabus Mastery
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Grounded in verified syllabus guidelines and recent topic attempt analytics
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
              {syllabusProgress}%
            </span>
            <span className="block text-[11px] font-bold text-gray-400">
              {masteredTopics} / {totalTopics} Topics Mastered
            </span>
          </div>
        </div>

        <ProgressBar progress={syllabusProgress} className="h-2.5 rounded-full" />

        {/* Practice Shortcuts (Section D) */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
            Functional Practice Shortcuts (Tests A+)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {[
              {
                id: 'topic-tests',
                label: 'Topic Tests',
                icon: Target,
                color: 'text-indigo-500',
                url: `/tests-a?exam=${examSlug}&pill=topic`,
              },
              {
                id: 'timed-tests',
                label: 'Timed Tests',
                icon: Clock,
                color: 'text-emerald-500',
                url: `/tests-a?exam=${examSlug}&pill=timed`,
              },
              {
                id: 'mock-exams',
                label: 'Mock Exams',
                icon: Award,
                color: 'text-amber-500',
                url: `/tests-a?exam=${examSlug}&pill=mock`,
              },
              {
                id: 'pyq-tests',
                label: 'Official PYQs',
                icon: FileText,
                color: 'text-cyan-500',
                url: `/tests-a?exam=${examSlug}&pill=pyq`,
              },
              {
                id: 'cat-practice',
                label: 'Adaptive CAT',
                icon: Zap,
                color: 'text-purple-500',
                onClick: onOpenCatModal,
              },
            ].map(shortcut => {
              const Icon = shortcut.icon
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => {
                    if (shortcut.onClick) shortcut.onClick()
                    else if (shortcut.url) navigate(shortcut.url)
                  }}
                  className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-950/60 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-1.5 transition-all hover:scale-102 hover:shadow-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Icon
                    className={`w-5 h-5 ${shortcut.color} group-hover:scale-110 transition-transform`}
                  />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {shortcut.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Subject-Wise Mastery Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Subject-Wise Syllabus Coverage
          </h4>
          <button
            type="button"
            onClick={() => navigate(`/tests-a?exam=${examSlug}`)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Explore All Subjects</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const subjectTopics = subject.topics || []
            const testedTopics = subjectTopics.filter(t =>
              Boolean(topicMastery[t.name] || topicMastery[t.slug])
            )
            const subjectMasteryScore =
              testedTopics.length > 0
                ? Math.round(
                    testedTopics.reduce((acc, t) => {
                      const m = topicMastery[t.name] || topicMastery[t.slug]
                      return acc + (m?.accuracy || 0)
                    }, 0) / testedTopics.length
                  )
                : 0

            return (
              <Card
                key={subject.id}
                className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      {subject.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        testedTopics.length > 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                      }`}
                    >
                      {testedTopics.length > 0 ? `${subjectMasteryScore}% Mastery` : 'Uncalibrated'}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400">
                    {subjectTopics.length > 0
                      ? `${subjectTopics.length} Core Topics Identified`
                      : 'Comprehensive Syllabus Bank'}
                  </div>

                  {subjectTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {subjectTopics.slice(0, 3).map(top => (
                        <span
                          key={top.id}
                          className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-600 dark:text-gray-300 font-medium"
                        >
                          {top.name}
                        </span>
                      ))}
                      {subjectTopics.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-gray-400 font-bold">
                          +{subjectTopics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/tests-a?exam=${examSlug}&search=${encodeURIComponent(subject.name)}`)
                  }
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Practice {subject.name}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Official Exam Milestones Timeline */}
      <Card className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Upcoming Exam Milestones & Official Timeline
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {milestones.map((m, idx) => (
            <div
              key={m.title}
              className={`p-3.5 rounded-xl border ${
                m.status === 'TARGET'
                  ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30'
                  : m.status === 'COMPLETED'
                    ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Stage {idx + 1}
                </span>
                {m.status === 'COMPLETED' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
                {m.status === 'TARGET' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                    TARGET
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                {m.label}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{m.date}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
