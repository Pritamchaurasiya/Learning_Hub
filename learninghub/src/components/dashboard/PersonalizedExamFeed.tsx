import React, { useState, useMemo, useEffect } from 'react'
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
  Sliders,
  ShieldCheck,
  Bell,
  ExternalLink,
} from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ExamSelectorModal } from '../exam/ExamSelectorModal'
import { CatAdaptiveModal } from '../test/CatAdaptiveModal'
import { StudentPreferencesModal } from './StudentPreferencesModal'
import { updatesService } from '../../services/updatesService'
import type { StudentUpdate } from '../../types/updates'

interface PersonalizedExamFeedProps {
  onLaunchAITest?: () => void
}

type FeedTab = 'recommended' | 'pyqs' | 'mocktests' | 'formulas' | 'announcements'

export const PersonalizedExamFeed: React.FC<PersonalizedExamFeedProps> = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FeedTab>('recommended')
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<StudentUpdate[]>([])
  const [isLoadingFeed, setIsLoadingFeed] = useState(false)

  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeCountry = useLearningContextStore(s => s.activeCountry)
  const activeSubjects = useLearningContextStore(s => s.activeSubjects)
  const targetExams = useLearningContextStore(s => s.targetExams)
  const stateRegion = useLearningContextStore(s => s.stateRegion)
  const examAuthority = useLearningContextStore(s => s.examAuthority)
  const targetExamDate = useLearningContextStore(s => s.targetExamDate)
  const preparationStage = useLearningContextStore(s => s.preparationStage)
  const dailyGoal = useLearningContextStore(s => s.dailyGoal)
  const switchExam = useLearningContextStore(s => s.switchExam)

  // Determine current exam name and target exam classification
  const examName = activeExam?.name || 'JEE Main'
  const examSlug = activeExam?.slug || 'jee-main'
  const isMedical = examSlug.includes('neet')
  const isGovt = examSlug.includes('ssc') || examSlug.includes('upsc')
  const isGate = examSlug.includes('gate')
  const isCat = examSlug.includes('cat')
  const isStudyAbroad =
    examSlug.includes('sat') || examSlug.includes('gre') || examSlug.includes('ielts')
  const isTech =
    examSlug.includes('dsa') || examSlug.includes('software') || examSlug.includes('fullstack')

  // Calculate live countdown to user-configured date or default seasonal date
  const countdown = useMemo(() => {
    const now = new Date()

    if (targetExamDate) {
      const parsed = new Date(targetExamDate)
      if (!isNaN(parsed.getTime())) {
        const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(1, diffDays)
      }
    }

    let defaultTarget = new Date(now.getFullYear(), 0, 24) // Jan 24 for JEE Main Session 1

    if (isMedical) {
      defaultTarget = new Date(now.getFullYear(), 4, 4) // May 4 for NEET
    } else if (isGovt) {
      defaultTarget = new Date(now.getFullYear(), 8, 15) // Sept 15 for SSC Tier 1
    } else if (isGate) {
      defaultTarget = new Date(now.getFullYear(), 1, 8) // Feb 8 for GATE
    } else if (isCat) {
      defaultTarget = new Date(now.getFullYear(), 10, 29) // Late Nov for CAT
    } else if (isStudyAbroad) {
      defaultTarget = new Date(now.getFullYear(), 2, 9) // March for SAT
    } else if (isTech) {
      defaultTarget = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    }

    if (defaultTarget.getTime() < now.getTime()) {
      defaultTarget.setFullYear(now.getFullYear() + 1)
    }

    const diffDays = Math.max(
      1,
      Math.ceil((defaultTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
    return diffDays
  }, [targetExamDate, isMedical, isGovt, isGate, isCat, isStudyAbroad, isTech])

  // Load announcements from updatesService
  useEffect(() => {
    let isMounted = true
    setIsLoadingFeed(true)
    updatesService
      .getUpdates()
      .then(res => {
        if (isMounted && Array.isArray(res)) {
          setAnnouncements(res.slice(0, 6))
        }
      })
      .catch(() => {
        // Handled silently
      })
      .finally(() => {
        if (isMounted) setIsLoadingFeed(false)
      })

    return () => {
      isMounted = false
    }
  }, [examSlug])

  // Curated High-Yield PYQs matching target exam
  const pyqList = useMemo(() => {
    if (isMedical) {
      return [
        {
          id: 'neet-pyq-1',
          title: 'NEET 2024 National Exam Paper (Code Q4)',
          subject: 'Biology, Physics, Chemistry',
          year: 2024,
          questionsCount: 200,
          difficulty: 'Moderate',
          timeLimit: '200 mins',
          tag: 'Official NTA CBT',
          authority: 'National Testing Agency',
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
          authority: 'National Testing Agency',
        },
        {
          id: 'neet-pyq-3',
          title: 'Human Physiology & Molecular Genetics PYQs (2019-2024)',
          subject: 'Biology',
          year: 2024,
          questionsCount: 90,
          difficulty: 'High-Yield',
          timeLimit: '90 mins',
          tag: 'Chapter Wise',
          authority: 'NCERT / NTA',
        },
      ]
    }

    if (isGovt) {
      return [
        {
          id: 'ssc-pyq-1',
          title: 'SSC CGL Tier 1 All Shifts Combined Official PYQ Paper',
          subject: 'Quantitative Aptitude, Reasoning, English, GA',
          year: 2024,
          questionsCount: 100,
          difficulty: 'Moderate',
          timeLimit: '60 mins',
          tag: 'Official SSC CBT',
          authority: 'Staff Selection Commission',
        },
        {
          id: 'ssc-pyq-2',
          title: 'SSC CGL Tier 2 Mathematical Abilities & Reasoning Sprint',
          subject: 'Quantitative & Analytical Abilities',
          year: 2023,
          questionsCount: 60,
          difficulty: 'Hard',
          timeLimit: '60 mins',
          tag: 'Official Tier 2',
          authority: 'Staff Selection Commission',
        },
        {
          id: 'ssc-pyq-3',
          title: 'UPSC CSE Prelims General Studies Paper 1 Solved PYQ Bank',
          subject: 'Polity, Economy, History, Geography',
          year: 2024,
          questionsCount: 100,
          difficulty: 'Advanced',
          timeLimit: '120 mins',
          tag: 'Official UPSC',
          authority: 'Union Public Service Commission',
        },
      ]
    }

    if (isStudyAbroad) {
      return [
        {
          id: 'sat-pyq-1',
          title: 'Official Digital SAT Practice Test #1 (Linear & Adaptive Modules)',
          subject: 'Reading & Writing, Math',
          year: 2024,
          questionsCount: 98,
          difficulty: 'Official Standard',
          timeLimit: '134 mins',
          tag: 'College Board Bluebook',
          authority: 'The College Board',
        },
        {
          id: 'sat-pyq-2',
          title: 'Digital SAT Advanced Math & Algebra Module 2 Drill',
          subject: 'Advanced Math',
          year: 2024,
          questionsCount: 44,
          difficulty: 'Hard',
          timeLimit: '70 mins',
          tag: 'High-Percentile',
          authority: 'The College Board',
        },
        {
          id: 'sat-pyq-3',
          title: 'GRE General Sectional Quant & Verbal Practice Test',
          subject: 'Quantitative & Verbal Reasoning',
          year: 2024,
          questionsCount: 80,
          difficulty: 'Advanced',
          timeLimit: '120 mins',
          tag: 'Official ETS Pattern',
          authority: 'ETS USA',
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
          authority: 'Industry Benchmark',
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
          authority: 'Core Technical Standards',
        },
        {
          id: 'tech-pyq-3',
          title: 'System Design Real-World Architectures (Distributed Cache, Rate Limiter)',
          subject: 'System Architecture',
          year: 2024,
          questionsCount: 10,
          difficulty: 'Advanced',
          timeLimit: '60 mins',
          tag: 'Case Studies',
          authority: 'Systems Engineering',
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
        authority: 'National Testing Agency',
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
        authority: 'National Testing Agency',
      },
      {
        id: 'jee-pyq-3',
        title: 'JEE Advanced High-Weightage Multi-Correct & Numerical PYQs',
        subject: 'Mechanics & Calculus',
        year: 2023,
        questionsCount: 54,
        difficulty: 'Very Hard',
        timeLimit: '180 mins',
        tag: 'IIT JAB Verified',
        authority: 'Joint Admission Board',
      },
    ]
  }, [isMedical, isGovt, isStudyAbroad, isTech])

  // Mock Tests Series matching target exam
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

    if (isGovt) {
      return [
        {
          id: 'mock-ssc-1',
          title: 'SSC CGL Tier 1 All-India CBT Speed Mock #1',
          mode: 'TCS iON CBT Interface',
          questions: 100,
          time: '60 mins',
          ranking: 'Rank & Cutoff Predictor',
        },
        {
          id: 'mock-ssc-2',
          title: 'Quantitative Aptitude 25/25 Arithmetic & Advance Sprint',
          mode: 'Sectional Speed Test',
          questions: 25,
          time: '20 mins',
          ranking: 'Speed Calibrator',
        },
        {
          id: 'mock-ssc-3',
          title: 'General Intelligence & Reasoning High-Score Mock',
          mode: 'Sectional Test',
          questions: 25,
          time: '15 mins',
          ranking: 'Accuracy Focused',
        },
      ]
    }

    if (isStudyAbroad) {
      return [
        {
          id: 'mock-sat-1',
          title: 'Full-Length Digital SAT Adaptive Mock #1',
          mode: 'Section-Adaptive Multi-Stage',
          questions: 98,
          time: '134 mins',
          ranking: 'Score Range 400-1600',
        },
        {
          id: 'mock-sat-2',
          title: 'Reading & Writing Craft & Structure Sprint',
          mode: 'Speed Sprint',
          questions: 27,
          time: '32 mins',
          ranking: 'Verbal Calibration',
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

    // Default: JEE Main & Advanced
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
  }, [isMedical, isGovt, isStudyAbroad, isTech])

  // High-Yield Formula Sheets & Verified Learning Resources
  const formulaSheets = useMemo(() => {
    if (isMedical) {
      return [
        {
          title: 'Human Physiology Complete System Mindmap',
          subject: 'Biology',
          pages: '8 Pages',
          format: 'High-Res PDF & Flashcards',
          isVerified: true,
        },
        {
          title: 'NEET Physics All Formulas & Dimension Constants',
          subject: 'Physics',
          pages: '12 Pages',
          format: 'One-Sheet Formula Map',
          isVerified: true,
        },
        {
          title: 'Organic Chemistry Named Reactions & Reagents Table',
          subject: 'Chemistry',
          pages: '6 Pages',
          format: 'Cheat Sheet',
          isVerified: true,
        },
      ]
    }

    if (isGovt) {
      return [
        {
          title: 'SSC CGL Quantitative Aptitude Short Tricks & Formulas Bible',
          subject: 'Mathematics',
          pages: '16 Pages',
          format: 'Verified Formula Handbook',
          isVerified: true,
        },
        {
          title: 'Indian Polity Articles, Amendments & Constitutional Bodies Map',
          subject: 'General Awareness',
          pages: '10 Pages',
          format: 'High-Yield Visual Mindmap',
          isVerified: true,
        },
        {
          title: 'Grammar Rules, Idioms & 500 High-Frequency Vocab Flashcards',
          subject: 'English Language',
          pages: '12 Pages',
          format: 'Revision Deck',
          isVerified: true,
        },
      ]
    }

    if (isStudyAbroad) {
      return [
        {
          title: 'Digital SAT Math Formula Sheet & Desmos Graphing Hacks',
          subject: 'Math',
          pages: '6 Pages',
          format: 'Official Reference Sheet',
          isVerified: true,
        },
        {
          title: 'SAT Reading Grammar Conventions & Transitions Guide',
          subject: 'Writing',
          pages: '8 Pages',
          format: 'Cheat Sheet',
          isVerified: true,
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
          isVerified: true,
        },
        {
          title: 'System Design Building Blocks & Scaling Formulas',
          subject: 'Architecture',
          pages: '10 Pages',
          format: 'Architectural Cheatsheet',
          isVerified: true,
        },
      ]
    }

    return [
      {
        title: 'JEE Physics: Complete Mechanics & Electrodynamics Formulas',
        subject: 'Physics',
        pages: '14 Pages',
        format: 'Complete Formula Bible',
        isVerified: true,
      },
      {
        title: 'JEE Mathematics: Calculus & Coordinate Geometry Cheat Sheet',
        subject: 'Mathematics',
        pages: '10 Pages',
        format: 'Derivations & Shortcuts',
        isVerified: true,
      },
      {
        title: 'JEE Chemistry: Periodic Trends, Hybridization & Named Reactions',
        subject: 'Chemistry',
        pages: '8 Pages',
        format: 'NCERT Direct Notes',
        isVerified: true,
      },
    ]
  }, [isMedical, isGovt, isStudyAbroad, isTech])

  return (
    <div className="space-y-6" data-testid="personalized-exam-feed">
      {/* Target Goal Banner (Personalized Hero) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950/90 to-purple-950 text-white p-6 sm:p-8 shadow-2xl border border-indigo-500/30">
        {/* Glow ambient meshes */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Target Goal
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-bold border border-white/10 backdrop-blur-sm">
                {activeCountry?.flagEmoji || '🇮🇳'} {activeCountry?.name || 'India'}
                {stateRegion && stateRegion !== 'All India / Central' ? ` • ${stateRegion}` : ''}
              </span>
              {examAuthority && (
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                  {examAuthority}
                </span>
              )}
              {preparationStage && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  Stage: {preparationStage.replace('_', ' ')}
                </span>
              )}
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
                  {activeExam?.description ||
                    'Calibrated practice assessments, official PYQs, and daily mock tests.'}
                </p>
              </div>
            </div>

            {/* Multiple Target Exams Quick Switcher */}
            {targetExams && targetExams.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Exams:
                </span>
                {targetExams.map(ex => {
                  const isCurrent = ex.id === activeExam?.id
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => switchExam(ex)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      {ex.name}
                    </button>
                  )
                })}
              </div>
            )}

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

          {/* Right Metrics & Switcher Buttons */}
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

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setIsPreferencesModalOpen(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Goal</span>
              </Button>

              <Button
                type="button"
                onClick={() => setIsExamModalOpen(true)}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change Exam</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Feed Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-gray-100 dark:border-gray-800 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/70 dark:bg-slate-800/40 rounded-2xl">
          {[
            { id: 'recommended', label: '🔥 Priority Sprint', icon: Sparkles },
            { id: 'pyqs', label: '📝 Official PYQs (2022-2024)', icon: FileText },
            { id: 'mocktests', label: '🧪 CBT Mock Series', icon: Award },
            { id: 'formulas', label: '📖 Verified Formulas & Notes', icon: BookOpen },
            { id: 'announcements', label: '📢 Exam Notices & Feed', icon: Bell },
          ].map(tab => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
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
          type="button"
          onClick={() => navigate(`/tests-a?exam=${examSlug}`)}
          className="hidden sm:flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 whitespace-nowrap pl-2 hover:underline"
        >
          <span>Explore All {examName} CBT Exams</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: RECOMMENDED PRIORITY SPRINT */}
      {activeTab === 'recommended' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Adaptive CAT Calibrator */}
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
                Calibrate your speed, test information curve, and accuracy across key high-weightage
                topics.
              </p>
            </div>

            <Button
              type="button"
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
                {isMedical
                  ? 'Genetics & Molecular Inheritance'
                  : isGovt
                    ? 'Quantitative Aptitude & Logical Reasoning'
                    : isTech
                      ? 'Dynamic Programming & Graphs'
                      : isStudyAbroad
                        ? 'Digital SAT Reading Craft & Math'
                        : 'Calculus & Mechanics Sprint'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consistently yields 15-20% of total marks in {examName}. Practice the most frequent
                verified question patterns.
              </p>
            </div>

            <Button
              type="button"
              onClick={() =>
                navigate(
                  `/tests-a?exam=${examSlug}&search=${encodeURIComponent(
                    isMedical
                      ? 'Genetics'
                      : isGovt
                        ? 'Quantitative Aptitude'
                        : isTech
                          ? 'Dynamic Programming'
                          : isStudyAbroad
                            ? 'Reading'
                            : 'Calculus'
                  )}`
                )
              }
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
                <span className="text-xs font-black text-amber-500">{dailyGoal} Mins Daily</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                Complete Today&apos;s Focus Session
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maintain your cognitive momentum. Review 10 flashcards and complete 1 speed practice
                test today.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => navigate('/revision')}
              className="mt-5 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Review Revision Deck</span>
            </Button>
          </Card>
        </div>
      )}

      {/* TAB 2: OFFICIAL PYQs */}
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
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium pt-1">
                    <span>{pyq.questionsCount} Questions</span>
                    <span>•</span>
                    <span>{pyq.timeLimit}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>{pyq.authority}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/tests-a?exam=${examSlug}&search=${encodeURIComponent(pyq.title)}&pill=pyq`
                    )
                  }
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

      {/* TAB 3: CBT MOCK TEST SERIES */}
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
                  type="button"
                  onClick={() =>
                    navigate(
                      `/tests-a?exam=${examSlug}&search=${encodeURIComponent(mock.title)}&pill=mock`
                    )
                  }
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

      {/* TAB 4: HIGH-YIELD FORMULAS & VERIFIED RESOURCES */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formulaSheets.map(sheet => (
              <Card
                key={sheet.title}
                className="p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl hover:border-amber-400/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      {sheet.subject}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Notes
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white leading-snug">
                    {sheet.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {sheet.format} • {sheet.pages}
                  </p>
                </div>

                <Button
                  type="button"
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

      {/* TAB 5: EXAM NOTICES & LEARNING FEED */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {isLoadingFeed ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading verified updates...</div>
          ) : announcements.length === 0 ? (
            <Card className="p-6 text-center rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 space-y-2">
              <p className="text-xs text-gray-500">
                No recent circulars for {examName}. All exam updates are verified against official
                portals.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map(ann => (
                <Card
                  key={ann.id}
                  className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 hover:border-indigo-400 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-bold text-indigo-500">{ann.category}</span>
                      <span>
                        {ann.published_at
                          ? new Date(ann.published_at).toLocaleDateString()
                          : 'Verified Notice'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-gray-900 dark:text-white leading-snug">
                      {ann.title}
                    </h4>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {ann.summary}
                    </p>

                    {ann.source_domain && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>Source: {ann.source_domain}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/updates/${ann.id}`)}
                    className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Read Full Notice</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Target Exam Switcher & Preferences Modals */}
      <ExamSelectorModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} />
      <CatAdaptiveModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        initialExamSlug={examSlug}
        initialSubject={activeSubjects[0]?.name}
      />
      <StudentPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
      />
    </div>
  )
}
