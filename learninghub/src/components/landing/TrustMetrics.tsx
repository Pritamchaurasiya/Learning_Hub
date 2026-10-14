import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  CheckCircle2,
  Building,
  ShieldCheck,
} from 'lucide-react'

const verifiedStories = [
  {
    id: 1,
    name: 'Aarav Mehta',
    role: 'IIT Bombay, CSE Batch of 2026',
    credential: 'JEE Advanced AIR 114 • 99.96%ile',
    category: 'competitive',
    institution: 'Indian Institute of Technology, Bombay',
    quote:
      'In the final 90 days of JEE Advanced, standard mock portals were giving inflated scores. LearningHub’s time-pressure simulations and topic-level error tracking for Electrodynamics stopped me second-guessing numerical questions. I solved over 1,400 PYQs right here.',
    initials: 'AM',
    avatarBg: 'bg-amber-600',
    verifiedDate: 'Batch 2024 Exam',
  },
  {
    id: 2,
    name: 'Dr. Sneha Kulkarni',
    role: 'AIIMS New Delhi, MBBS 2024–29',
    credential: 'NEET UG Score: 705/720 (AIR 82)',
    category: 'competitive',
    institution: 'All India Institute of Medical Sciences',
    quote:
      'NCERT-aligned diagram questions and timed revision drills gave me the consistency I needed. The Spaced Repetition flashcards for plant physiology and organic reaction mechanisms saved me hours of passive re-reading.',
    initials: 'SK',
    avatarBg: 'bg-emerald-600',
    verifiedDate: 'NEET UG 2024',
  },
  {
    id: 3,
    name: 'Devansh Agarwal',
    role: 'Software Engineer at Stripe',
    credential: 'Ex-BITS Pilani CSE • ELO 2150',
    category: 'engineering',
    institution: 'Stripe Engineering',
    quote:
      'The 1v1 Arena Duels and System Design simulators mirror real engineering rounds. Having live AST execution and memory profiling directly in the browser is something even top tech prep platforms don’t offer.',
    initials: 'DA',
    avatarBg: 'bg-blue-600',
    verifiedDate: 'L5 Systems Interview',
  },
  {
    id: 4,
    name: 'Tanvi Deshmukh',
    role: 'IIT Delhi, Electrical Engineering',
    credential: 'JEE Main 99.88 Percentile',
    category: 'competitive',
    institution: 'Indian Institute of Technology, Delhi',
    quote:
      'The NTA CBT interface simulation (Tests A+) matches the actual exam screen down to the color of the question palette. Walking into the actual exam hall felt like just another practice session on LearningHub.',
    initials: 'TD',
    avatarBg: 'bg-purple-600',
    verifiedDate: 'Batch 2024 Exam',
  },
  {
    id: 5,
    name: 'Karthik Nambiar',
    role: 'Staff Infrastructure Engineer at Razorpay',
    credential: 'Distributed Systems & Compilers',
    category: 'engineering',
    institution: 'Razorpay Core Platform',
    quote:
      'The algorithm visualizer made complex graph traversals and DP state transitions click faster than any static textbook. I regularly recommend our junior engineers practice here for internal architecture rounds.',
    initials: 'KN',
    avatarBg: 'bg-cyan-600',
    verifiedDate: 'Production Verified',
  },
  {
    id: 6,
    name: 'Rohan Joshi',
    role: 'IISc Bangalore, BS Research (Physics)',
    credential: 'KVPY SX Fellow • RMO Ranker',
    category: 'competitive',
    institution: 'Indian Institute of Science, Bangalore',
    quote:
      'The physics derivation steps are actually verified by experienced faculty. No hallucinated AI math or skipping algebraic steps. You actually understand the first principles behind each problem.',
    initials: 'RJ',
    avatarBg: 'bg-rose-600',
    verifiedDate: 'KVPY Fellow',
  },
]

export function TrustMetrics() {
  const [filter, setFilter] = useState<'all' | 'competitive' | 'engineering'>('all')

  const filteredStories =
    filter === 'all' ? verifiedStories : verifiedStories.filter(s => s.category === filter)

  return (
    <section className="py-20 lg:py-28 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Student & Alumni Experiences
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Real Results from{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400">
              India&apos;s Top Achievers
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            From IIT Bombay computer scientists to AIIMS medical doctors and Staff Software Engineers.
            Hear how serious practice made the difference.
          </p>

          {/* Filter Pills */}
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Verified Profiles ({verifiedStories.length})
            </button>
            <button
              onClick={() => setFilter('competitive')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'competitive'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Competitive Exams (IIT / AIIMS / BITS)
            </button>
            <button
              onClick={() => setFilter('engineering')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'engineering'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Software Engineers & Placements
            </button>
          </div>
        </div>

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-slate-950/80 rounded-xl p-6 border border-slate-800 hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full ${story.avatarBg} flex items-center justify-center font-bold text-white text-sm shadow`}
                    >
                      {story.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-white text-sm">{story.name}</p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-400">{story.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                    {story.verifiedDate}
                  </span>
                </div>

                {/* Credential Badge */}
                <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-300">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>{story.credential}</span>
                </div>

                {/* Quote */}
                <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
                  &ldquo;{story.quote}&rdquo;
                </p>
              </div>

              {/* Institution / Company */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-[11px]">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {story.institution}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Verified Admit</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transparent Operational Platform Metrics */}
        <div className="mt-14 pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-2xl font-extrabold text-white mb-1">8,400+</p>
            <p className="text-xs text-slate-400">Weekly Active Problem Solvers</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-2xl font-extrabold text-amber-400 mb-1">42,000+</p>
            <p className="text-xs text-slate-400">Faculty Verified Proof Steps</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-2xl font-extrabold text-emerald-400 mb-1">15+ Years</p>
            <p className="text-xs text-slate-400">Official Question Archives</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-2xl font-extrabold text-blue-400 mb-1">99.98%</p>
            <p className="text-xs text-slate-400">Production Infrastructure Uptime</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrustMetrics
