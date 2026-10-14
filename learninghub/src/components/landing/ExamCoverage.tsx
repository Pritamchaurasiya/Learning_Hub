import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Atom,
  Microscope,
  Calculator,
  BookOpen,
  Target,
  Shield,
  GraduationCap,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Terminal,
  Network,
  CheckCircle2,
} from 'lucide-react'

const competitiveExams = [
  {
    id: 'jee-main',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination - Main (NTA)',
    icon: Atom,
    badge: 'NTA 2026 Aligned',
    questions: '45,000+ PYQs',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'Gateway to NITs, IIITs, and CFTIs with full CBT exam interface simulation.',
    accent: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    id: 'jee-advanced',
    name: 'JEE Advanced',
    fullName: 'IIT Joint Entrance Examination - Advanced',
    icon: Microscope,
    badge: 'IIT Kanpur / Madras Format',
    questions: '25,000+ Multi-Correct',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'Rigorous multi-correct, matrix match, and numerical integer problems for IIT aspirants.',
    accent: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'neet',
    name: 'NEET UG',
    fullName: 'National Eligibility cum Entrance Test (Medical)',
    icon: BookOpen,
    badge: 'NCERT 100% Verified',
    questions: '50,000+ MCQs',
    subjects: ['Botany', 'Zoology', 'Physics', 'Chemistry'],
    description: 'NCERT-aligned diagram questions, assertion-reasoning, and timed medical drills.',
    accent: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    id: 'bitsat',
    name: 'BITSAT',
    fullName: 'BITS Pilani Computer Based Admission Test',
    icon: Calculator,
    badge: 'Speed & Bonus Question Mode',
    questions: '20,000+ Timed Questions',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English & Logic'],
    description: 'Speed-optimized test sets with the authentic 12-question bonus challenge round.',
    accent: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  },
  {
    id: 'gate-cs',
    name: 'GATE CSE',
    fullName: 'Graduate Aptitude Test in Engineering (CS & IT)',
    icon: Cpu,
    badge: 'IISc / IIT Exam Standard',
    questions: '15,000+ Rigorous Items',
    subjects: ['Algorithms', 'OS', 'DBMS', 'Computer Networks'],
    description: 'Deep theoretical computer science questions with step-by-step mathematical proofs.',
    accent: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
  },
  {
    id: 'wbjee',
    name: 'WBJEE & MHT CET',
    fullName: 'State Engineering & Technology Common Tests',
    icon: Target,
    badge: 'State Syllabus Aligned',
    questions: '28,000+ PYQs',
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
    description: 'Chapter-wise question sets targeting top state technical universities and Jadavpur.',
    accent: 'border-pink-500/40 text-pink-400 bg-pink-500/10',
  },
  {
    id: 'nda',
    name: 'NDA & NA',
    fullName: 'National Defence Academy & Naval Academy Exam',
    icon: Shield,
    badge: 'UPSC Standards',
    questions: '12,000+ PYQs',
    subjects: ['Mathematics', 'General Ability', 'Physics'],
    description: 'Comprehensive math and analytical preparation for Indian Armed Forces officers.',
    accent: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
  },
  {
    id: 'olympiad',
    name: 'Science Olympiads',
    fullName: 'KVPY, NSEP, NSEC & RMO Mathematics',
    icon: GraduationCap,
    badge: 'Advanced Problem Solving',
    questions: '8,000+ Selected Proofs',
    subjects: ['Physics', 'Chemistry', 'Pure Mathematics'],
    description: 'Challenging olympiad problem sets designed to build deep first-principles intuition.',
    accent: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
]

const engineeringTracks = [
  {
    id: 'dsa-mastery',
    name: 'DSA Problem Suite',
    fullName: 'Algorithmic Problem Solving & Blind 75',
    icon: Code2,
    badge: 'Browser AST Sandbox',
    questions: '750+ Curated Problems',
    subjects: ['Arrays & Hashing', 'Trees & Graphs', 'Dynamic Programming'],
    description: 'Practice data structures with sub-15ms browser-based code execution and memory traces.',
    accent: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    id: 'system-design',
    name: 'System Design Studio',
    fullName: 'Distributed Systems & Architecture Simulators',
    icon: Network,
    badge: 'Interactive Canvas',
    questions: '45+ Interactive Scenarios',
    subjects: ['Load Balancing', 'Consistent Hashing', 'Event Sourcing'],
    description: 'Interactive architecture blueprints with realistic throughput calculations and failure modes.',
    accent: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  },
  {
    id: 'arena-duels',
    name: '1v1 Arena Coding Duels',
    fullName: 'Real-Time Synchronous Head-to-Head Battles',
    icon: Terminal,
    badge: 'Live WebSocket Engine',
    questions: 'Live Competitions',
    subjects: ['Speed Algorithmic Solving', 'ELO Rating', 'Anti-Cheat'],
    description: 'Challenge developers worldwide in timed coding duels with real-time test case verification.',
    accent: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'algo-visualizer',
    name: 'Algorithm Visualizer',
    fullName: 'Step-by-Step State Machine Inspector',
    icon: Layers,
    badge: 'Frame-by-Frame Playback',
    questions: '60+ Visualized Algorithms',
    subjects: ['Graph BFS/DFS', 'Sorting Networks', 'Trie Traversals'],
    description: 'Watch pointer shifts, recursion stacks, and memory arrays animate in real time.',
    accent: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
]

interface ExamCoverageProps {
  onSelectExam: (examId: string) => void
}

export function ExamCoverage({ onSelectExam }: ExamCoverageProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'competitive' | 'engineering'>('all')

  const displayedItems =
    selectedCategory === 'all'
      ? [...competitiveExams.slice(0, 4), ...engineeringTracks]
      : selectedCategory === 'competitive'
      ? competitiveExams
      : engineeringTracks

  return (
    <section className="py-20 lg:py-28 bg-slate-900/60 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            Curriculum Aligned with 2026 Examination Patterns
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Comprehensive Coverage Across{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              STEM & Software Engineering
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every problem is verified by experienced educators and senior software architects. No
            fluff, no outdated questions.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              Full Curriculum Overview
            </button>
            <button
              onClick={() => setSelectedCategory('competitive')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                selectedCategory === 'competitive'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              Competitive Entrance Exams (JEE / NEET / BITSAT)
            </button>
            <button
              onClick={() => setSelectedCategory('engineering')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                selectedCategory === 'engineering'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              Software Engineering & DSA Suites
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => onSelectExam(item.id)}
              className="group cursor-pointer bg-slate-950/80 rounded-xl p-5 border border-slate-800 hover:border-slate-700 hover:shadow-2xl hover:shadow-slate-900/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${item.accent}`}>
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 mb-3">{item.fullName}</p>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Subjects Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.subjects.map(subj => (
                    <span
                      key={subj}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400"
                    >
                      {subj}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                <span>{item.questions}</span>
                <span className="flex items-center gap-1">
                  Start Practice
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ExamCoverage
