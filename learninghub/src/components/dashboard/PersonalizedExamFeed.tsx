import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Target,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  Flame,
  FileText,
  Zap,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ExamSelectorModal } from '../exam/ExamSelectorModal'
import { CatAdaptiveModal } from '../test/CatAdaptiveModal'

interface PersonalizedExamFeedProps {
  onLaunchAITest?: () => void
}

type FeedTab = 'recommended' | 'pyqs' | 'mocktests' | 'formulas' | 'courses'

export const PersonalizedExamFeed: React.FC<PersonalizedExamFeedProps> = ({ }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FeedTab>('recommended')
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)

  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeCountry = useLearningContextStore(s => s.activeCountry)
  const activeSubjects = useLearningContextStore(s => s.activeSubjects)
  const dailyGoal = useLearningContextStore(s => s.dailyGoal)
  const difficulty = useLearningContextStore(s => s.difficulty)

  // Determine current exam name and target exam details
  const examName = activeExam?.name || 'JEE Main'
  const examSlug = activeExam?.slug || 'jee-main'
  const isMedical = examSlug.includes('neet')
  const isTech = examSlug.includes('dsa') || examSlug.includes('software')
  const isGate = examSlug.includes('gate')

  // Calculate live countdown to the typical target exam dates
  const countdown = useMemo(() => {
    const now = new Date()
    let targetDate = new Date(now.getFullYear(), 0, 24) // Jan 24 for JEE Main Session 1

    if (isMedical) {
      targetDate = new Date(now.getFullYear(), 4, 4) // May 4 for NEET
    } else if (isGate) {
      targetDate = new Date(now.getFullYear(), 1, 8) // Feb 8 for GATE
    } else if (isTech) {
      // 90-day hiring sprint
      targetDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    }

    if (targetDate.getTime() < now.getTime()) {
      targetDate.setFullYear(now.getFullYear() + 1)
    }

    const diffDays = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    return diffDays
  }, [isMedical, isGate, isTech])

  // Curated High-Yield PYQs matching the target exam
  const pyqList = useMemo(() => {
    if (isMedical) {
      return [
        {
          id: 'neet-pyq-1',
          title: 'NEET 2024 National Exam Paper (Code Q4)',
          subject: 'Biology & Physics',
          year: 2024,
          questionsCount: 200,
          difficulty: 'Moderate',
          timeLimit: '200 mins',
          tag: 'Official NTA',
        },
        {
          id: 'neet-pyq-2',
          title: 'NEET 2023 National Exam Paper',
          subject: 'Complete PCB',
          year: 2023,
          questionsCount: 200,
          difficulty: 'Moderate',
          timeLimit: '200 mins',
          tag: 'Solved Paper',
        },
        {
          id: 'neet-pyq-3',
          title: 'Human Physiology & Genetics High-Yield PYQs (2019-2024)',
          subject: 'Biology',
          year: 2024,
          questionsCount: 90,
          difficulty: 'High-Yield',
          timeLimit: '90 mins',
          tag: 'Chapter Wise',
        },
      ]
    }

    if (isTech) {
      return [
        {
          id: 'tech-pyq-1',
          title: 'Google & Meta SDE-1 Technical Coding Rounds (2024)',
          subject: 'DSA & Algorithms',
          year: 2024,
          questionsCount: 15,
          difficulty: 'Hard',
          timeLimit: '90 mins',
          tag: 'FAANG Curated',
        },
        {
          id: 'tech-pyq-2',
          title: 'Blind 75 & Striver SDE Core Patterns',
          subject: 'Trees, Graphs, DP',
          year: 2024,
          questionsCount: 75,
          difficulty: 'Medium-Hard',
          timeLimit: 'Self-Paced',
          tag: 'Top 75',
        },
        {
          id: 'tech-pyq-3',
          title: 'System Design Real-World Architectures (WhatsApp, Uber)',
          subject: 'System Architecture',
          year: 2024,
          questionsCount: 10,
          difficulty: 'Advanced',
          timeLimit: '60 mins',
          tag: 'Case Studies',
        },
      ]
    }

    // Default: JEE Main & Advanced
    return [
      {
        id: 'jee-pyq-1',
        title: 'JEE Main 2024 Session 1 (27 Jan Morning Shift)',
        subject: 'Physics, Chemistry, Math',
        year: 2024,
        questionsCount: 90,
        difficulty: 'Moderate',
        timeLimit: '180 mins',
        tag: 'Official NTA CBT',
      },
      {
        id: 'jee-pyq-2',
        title: 'JEE Main 2024 Session 1 (29 Jan Evening Shift)',
        subject: 'Physics, Chemistry, Math',
        year: 2024,
        questionsCount: 90,
        difficulty: 'Hard',
        timeLimit: '180 mins',
        tag: 'Official NTA CBT',
      },
      {
        id: 'jee-pyq-3',
        title: 'JEE Main 2023 Session 2 All Shifts Combined PYQs',
        subject: 'Physics & Calculus',
        year: 2023,
        questionsCount: 75,
        difficulty: 'High-Yield',
        timeLimit: '180 mins',
        tag: 'Verified Proofs',
      },
    ]
  }, [isMedical, isTech])

  // Mock Tests Series
  const mockTests = useMemo(() => {
    if (isMedical) {
      return [
        {
          id: 'mock-neet-1',
          title: 'All-India NEET Full CBT Mock #1 (720 Marks)',
          mode: 'NTA OMR / CBT',
          questions: 200,
          time: '3h 20m',
          ranking: 'Live AIR Available',
        },
        {
          id: 'mock-neet-2',
          title: 'Biology 360/360 NCERT Line-by-Line Sprint Mock',
          mode: 'Speed Challenge',
          questions: 90,
          time: '45 mins',
          ranking: 'Accuracy Focused',
        },
        {
          id: 'mock-neet-3',
          title: 'Physics & Chemistry High-Yield Formula Mock',
          mode: 'Numerical Practice',
          questions: 50,
          time: '60 mins',
          ranking: 'Concept Calibrator',
        },
      ]
    }

    if (isTech) {
      return [
        {
          id: 'mock-tech-1',
          title: 'Full SDE Interview Simulation (Coding + Complexity)',
          mode: 'Live Compiler',
          questions: 4,
          time: '90 mins',
          ranking: 'Automated Testcases',
        },
        {
          id: 'mock-tech-2',
          title: 'Dynamic Programming & Graph Traversal Speedrun',
          mode: 'Algorithmic Sprint',
          questions: 10,
          time: '45 mins',
          ranking: 'Code Review AST',
        },
      ]
    }

    // JEE Main & Advanced
    return [
      {
        id: 'mock-jee-1',
        title: 'All-India NTA Pattern JEE Main CBT Full Mock #1 (300 Marks)',
        mode: 'NTA CBT Interface',
        questions: 75,
        time: '180 mins',
        ranking: 'Percentile Predictor',
      },
      {
        id: 'mock-jee-2',
        title: 'Calculus & Mechanics High-Weightage Speed Test',
        mode: 'Speed Sprint',
        questions: 30,
        time: '60 mins',
        ranking: 'Subject Calibration',
      },
      {
        id: 'mock-jee-3',
        title: 'Organic Chemistry Reactions & Mechanisms Master Test',
        mode: 'Rapid Fire',
        questions: 25,
        time: '30 mins',
        ranking: 'NCERT Exemplar',
      },
    ]
  }, [isMedical, isTech])

  // High-Yield Formula Sheets & Mindmaps
  const formulaSheets = useMemo(() => {
    if (isMedical) {
      return [
        {
          title: 'Human Physiology Complete System Mindmap',
          subject: 'Biology',
          pages: '8 Pages',
          format: 'High-Res PDF & Flashcards',
        },
        {
          title: 'NEET Physics All Formulas & Dimension Constants',
          subject: 'Physics',
          pages: '12 Pages',
          format: 'One-Sheet Formula Map',
        },
        {
          title: 'Organic Chemistry Named Reactions & Reagents Table',
          subject: 'Chemistry',
          pages: '6 Pages',
          format: 'Cheat Sheet',
        },
      ]
    }

    if (isTech) {
      return [
        {
          title: 'Big-O Cheat Sheet & Data Structure Complexity Matrix',
          subject: 'DSA Core',
          pages: '4 Pages',
          format: 'Quick Reference',
        },
        {
          title: 'System Design Building Blocks & Scaling Formulas',
          subject: 'Architecture',
          pages: '10 Pages',
          format: 'Architectural Cheatsheet',
        },
      ]
    }

    return [
      {
        title: 'JEE Physics: Complete Mechanics & Electrodynamics Formulas',
        subject: 'Physics',
        pages: '14 Pages',
        format: 'Complete Formula Bible',
      },
      {
        title: 'JEE Mathematics: Calculus & Coordinate Geometry Cheat Sheet',
        subject: 'Mathematics',
        pages: '10 Pages',
        format: 'Derivations & Shortcuts',
      },
      {
        title: 'JEE Chemistry: Periodic Trends, Hybridization & Named Reactions',
        subject: 'Chemistry',
        pages: '8 Pages',
        format: 'NCERT Direct Notes',
      },
    ]
  }, [isMedical, isTech])

  return (
    <div className="space-y-6">
      {/* Target Goal Banner (Personalized Hero) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950/90 to-purple-950 text-white p-6 sm:p-8 shadow-2xl border border-indigo-500/30">
        {/* Glow ambient meshes */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Target Goal
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-bold border border-white/10 backdrop-blur-sm">
                {activeCountry?.flagEmoji || '🇮🇳'} {activeCountry?.name || 'India'}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                Difficulty: {difficulty}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
                <Target className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  {examName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
                  {activeExam?.description || 'Calibrated practice assessments, official PYQs, and daily mock tests.'}
                </p>
              </div>
            </div>

            {/* Active Subjects Pills */}
            {activeSubjects && activeSubjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Focus Subjects:
                </span>
                {activeSubjects.map(sub => (
                  <span
                    key={sub.id}
                    className="px-2.5 py-0.5 rounded-lg bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-xs font-bold"
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right Metrics & Switcher Button */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8">
            <div className="text-left lg:text-right">
              <div className="flex items-center gap-2 text-amber-400 font-black text-2xl sm:text-3xl tabular-nums">
                <Clock className="w-6 h-6 animate-spin-slow" />
                <span>{countdown} Days</span>
              </div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Until Primary Target Exam
              </div>
            </div>

            <Button
              onClick={() => setIsExamModalOpen(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Exam Target</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Feed Navigation Tabs — Animated Pill Slider */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-gray-100 dark:border-gray-800 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/70 dark:bg-slate-800/40 rounded-2xl">
          {[
            { id: 'recommended', label: '🔥 Today’s Priority Sprint', icon: Sparkles },
            { id: 'pyqs', label: '📝 Official PYQs (2022-2024)', icon: FileText },
            { id: 'mocktests', label: '🧪 CBT Mock Test Series', icon: Award },
            { id: 'formulas', label: '📖 High-Yield Formulas', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FeedTab)}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 flex items-center gap-2 z-10 ${
                  isSelected
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="exam-feed-active-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl shadow-md shadow-primary-500/25 -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => navigate(`/tests-a?exam=${examSlug}`)}
          className="hidden sm:flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 whitespace-nowrap pl-2 hover:underline"
        >
          <span>Explore All {examName} CBT Exams</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* TAB CONTENT 1: RECOMMENDED PRIORITY SPRINT */}
      {activeTab === 'recommended' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 5-Question AI Calibrator */}
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-wider">
                  Adaptive AI Calibrator
                </span>
                <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  +100 XP
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                Daily 5-Question Diagnostic for {examName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Calibrate your speed, test information curve, and accuracy across key high-weightage topics.
              </p>
            </div>

            <Button
              onClick={() => setIsCatModalOpen(true)}
              className="mt-5 w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-primary-600 hover:from-indigo-500 hover:to-primary-500 text-white rounded-xl font-bold text-xs py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Launch Adaptive CAT Test</span>
            </Button>
          </Card>

          {/* Card 2: Highest Weightage Chapter Practice */}
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                  High-Weightage Target
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Top 25% Syllabus
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {isMedical ? 'Genetics & Molecular Inheritance' : isTech ? 'Dynamic Programming & Graphs' : 'Calculus & Mechanics Sprint'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consistently yields 12-16% of total marks in {examName}. Practice the 20 most frequent question patterns.
              </p>
            </div>

            <Button
              onClick={() => navigate(`/tests-a?exam=${examSlug}&search=${encodeURIComponent(isMedical ? 'Genetics' : isTech ? 'Dynamic Programming' : 'Calculus')}`)}
              variant="outline"
              className="mt-5 w-full border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl font-bold text-xs py-2.5 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Practice Chapter Questions</span>
            </Button>
          </Card>

          {/* Card 3: Daily Streak & Target Goal */}
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-amber-950/40 border border-amber-100 dark:border-amber-900/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-wider">
                  Consistency Target
                </span>
                <span className="text-xs font-black text-amber-500">
                  {dailyGoal} Mins Daily
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                Complete Today's Focus Session
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maintain your cognitive momentum. Review 10 flashcards and complete 1 speed practice test today.
              </p>
            </div>

            <Button
              onClick={() => navigate('/revision')}
              className="mt-5 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Review Revision Deck</span>
            </Button>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: OFFICIAL PYQs */}
      {activeTab === 'pyqs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pyqList.map(pyq => (
              <Card
                key={pyq.id}
                className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl hover:border-primary-400/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-wider">
                      {pyq.tag}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{pyq.year}</span>
                  </div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {pyq.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium pt-1">
                    <span>{pyq.questionsCount} Questions</span>
                    <span>•</span>
                    <span>{pyq.timeLimit}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/tests-a?exam=${examSlug}&search=${encodeURIComponent(pyq.title)}&pill=pyq`)}
                  className="mt-4 w-full text-xs font-bold py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white text-gray-700 dark:text-gray-200 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Solve Full Paper</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CBT MOCK TEST SERIES */}
      {activeTab === 'mocktests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockTests.map(mock => (
              <Card
                key={mock.id}
                className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl hover:border-emerald-400/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                      {mock.mode}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500">{mock.ranking}</span>
                  </div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {mock.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                    <span>{mock.questions} Qs</span>
                    <span>•</span>
                    <span>{mock.time}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/tests-a?exam=${examSlug}&search=${encodeURIComponent(mock.title)}&pill=mock`)}
                  className="mt-4 w-full text-xs font-bold py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <span>Start CBT Mock Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: HIGH-YIELD FORMULAS */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formulaSheets.map((sheet, idx) => (
              <Card
                key={idx}
                className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl hover:border-amber-400/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      {sheet.subject}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{sheet.pages}</span>
                  </div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug">
                    {sheet.title}
                  </h4>
                  <p className="text-xs text-gray-500">{sheet.format}</p>
                </div>

                <Button
                  onClick={() => navigate('/revision')}
                  variant="outline"
                  className="mt-4 w-full text-xs font-bold py-2.5 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Formula Vault</span>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Target Exam Switcher Modal */}
      <ExamSelectorModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} />
      <CatAdaptiveModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        initialExamSlug={examSlug}
        initialSubject={activeSubjects[0]?.name}
      />
    </div>
  )
}
