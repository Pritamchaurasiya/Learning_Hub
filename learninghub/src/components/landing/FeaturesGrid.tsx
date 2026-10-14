import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Cpu,
  Layers,
  Terminal,
  Clock,
  RotateCcw,
  Award,
  TrendingUp,
  WifiOff,
  CheckCircle2,
  FileText,
  Zap,
} from 'lucide-react'

const allFeatures = [
  {
    category: 'competitive',
    icon: BookOpen,
    title: 'Chapter-wise PYQ Archives',
    metric: '15+ Years of Papers',
    description:
      'Official question papers from 2010–2026 verified against official NTA and IIT answer keys with complete negative marking audit.',
    tags: ['NTA 2026 Aligned', 'Zero Typos', 'Official Keys'],
    accent: 'border-amber-500/30 text-amber-400',
  },
  {
    category: 'engineering',
    icon: Terminal,
    title: 'In-Browser AST Sandbox',
    metric: '<15ms Execution',
    description:
      'Execute TypeScript, Python, and C++ code directly in your browser. Real-time test-case runners with memory profile traces.',
    tags: ['WebAssembly Engine', 'Zero Server Lag', 'Memory Profiler'],
    accent: 'border-blue-500/30 text-blue-400',
  },
  {
    category: 'competitive',
    icon: Clock,
    title: 'Authentic CBT Simulator (Tests A+)',
    metric: '1:1 Interface Fidelity',
    description:
      'Exact NTA computer-based exam palette, color-coded question states (answered, marked for review), and section switching.',
    tags: ['Time Pressure', 'Palette Colors', 'Virtual Calculator'],
    accent: 'border-emerald-500/30 text-emerald-400',
  },
  {
    category: 'engineering',
    icon: Layers,
    title: 'Interactive Algorithm Visualizer',
    metric: '60+ Dynamic State Machines',
    description:
      'Step through Dijkstra, AVL Trees, and Dynamic Programming grids frame-by-frame with live pointer positions and stack inspections.',
    tags: ['Frame Playback', 'Stack Inspector', 'Pointer Tracker'],
    accent: 'border-cyan-500/30 text-cyan-400',
  },
  {
    category: 'engineering',
    icon: Zap,
    title: 'Real-Time 1v1 Arena Duels',
    metric: 'Sub-50ms Matchmaking',
    description:
      'Live synchronized head-to-head coding battles over WebSockets. Compete on ELO-ranked ladders with automatic anti-cheat protection.',
    tags: ['WebSocket Duels', 'ELO Rating', 'Anti-Cheat'],
    accent: 'border-purple-500/30 text-purple-400',
  },
  {
    category: 'competitive',
    icon: RotateCcw,
    title: 'SuperMemo SM-2 Spaced Revision',
    metric: 'Scientifically Proven Retention',
    description:
      'Algorithmic flashcards schedule difficult formulas and concept gaps right before memory decay occurs, ensuring long-term retention.',
    tags: ['SM-2 Algorithm', 'Active Recall', 'Formula Cards'],
    accent: 'border-rose-500/30 text-rose-400',
  },
  {
    category: 'engineering',
    icon: Award,
    title: 'W3C Verifiable Credentials',
    metric: 'Cryptographically Signed',
    description:
      'Earn digitally signed certificates and scorecards with cryptographic tamper-proofing, instantly verifiable on LinkedIn or to employers.',
    tags: ['W3C Standards', 'Public Verifier', 'Tamper-Proof'],
    accent: 'border-yellow-500/30 text-yellow-400',
  },
  {
    category: 'competitive',
    icon: FileText,
    title: 'Faculty-Verified Proofs',
    metric: 'No AI Hallucinations',
    description:
      'Every solution is reviewed and typeset with rigorous mathematical proofs, dimensional analysis, and common pitfalls to avoid.',
    tags: ['LaTeX Typeset', 'Multiple Approaches', 'Dimensional Checks'],
    accent: 'border-indigo-500/30 text-indigo-400',
  },
  {
    category: 'competitive',
    icon: TrendingUp,
    title: 'Diagnostic Error Analytics',
    metric: 'Topic-Level Precision',
    description:
      'Tracks speed per question, concept blind-spots, and careless mistakes. Automatically builds targeted recovery test sets.',
    tags: ['Accuracy Trends', 'Pacing Heatmaps', 'Weak-Area Drills'],
    accent: 'border-teal-500/30 text-teal-400',
  },
  {
    category: 'engineering',
    icon: WifiOff,
    title: 'Offline PWA Station',
    metric: 'Full IndexedDB Cache',
    description:
      'Installable Progressive Web App with complete offline question packs, allowing uninterrupted study on commutes or unstable networks.',
    tags: ['IndexedDB Sync', 'Offline First', 'Background Update'],
    accent: 'border-orange-500/30 text-orange-400',
  },
]

export function FeaturesGrid() {
  const [filter, setFilter] = useState<'all' | 'competitive' | 'engineering'>('all')

  const displayedFeatures =
    filter === 'all' ? allFeatures : allFeatures.filter(f => f.category === filter)

  return (
    <section className="py-20 lg:py-28 bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 mb-4">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Engineered for Deep Focus & Zero Friction
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Tools Built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">
              Serious Practice
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every feature on LearningHub is purposefully designed to eliminate busywork, optimize
            cognitive load, and maximize test-day speed.
          </p>

          {/* Filter Pills */}
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Features ({allFeatures.length})
            </button>
            <button
              onClick={() => setFilter('competitive')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'competitive'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Competitive Exams (JEE / NEET)
            </button>
            <button
              onClick={() => setFilter('engineering')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                filter === 'engineering'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Software Engineering & DSA
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-slate-900/80 rounded-xl p-6 border border-slate-800 hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${feature.accent}`}>
                    {feature.metric}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {feature.description}
                </p>
              </div>

              {/* Tags */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {feature.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Hardware & Rigor Benchmarks */}
        <div className="mt-14 pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-2xl font-extrabold text-white mb-1">100,000+</p>
            <p className="text-slate-400">Verified PYQs from 2010–2026</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-2xl font-extrabold text-emerald-400 mb-1">&lt;15 ms</p>
            <p className="text-slate-400">AST Code Execution Latency</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-2xl font-extrabold text-amber-400 mb-1">100%</p>
            <p className="text-slate-400">Official Exam Key Audit</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-2xl font-extrabold text-cyan-400 mb-1">99.98%</p>
            <p className="text-slate-400">Production Platform Uptime</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesGrid
