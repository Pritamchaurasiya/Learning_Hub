import { motion } from 'framer-motion'
import { GraduationCap, Users, UserCheck, CheckCircle2, ShieldCheck } from 'lucide-react'

const stakeholderBenefits = [
  {
    icon: GraduationCap,
    title: 'For Aspiring Rankers & Builders',
    audience: 'Competitive Exam Candidates & Software Engineers',
    items: [
      'Zero-lag browser code runner and instant LaTeX formulas',
      'Realistic NTA CBT exam simulation with official color palette',
      'Spaced repetition schedules formulas right before forgetting decay',
      'No AI-hallucinated math; 100% human-verified solution derivations',
      'Full offline PWA mode for uninterrupted practice on commutes',
      'Verifiable W3C credentials to showcase real technical mastery',
    ],
    accent: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    icon: Users,
    title: 'For Parents & Guardians',
    audience: 'Transparency & Peace of Mind',
    items: [
      'Strict zero-telemarketing policy: zero sales caller harassment',
      'Objective accuracy tracking and weekly topic-level progress heatmaps',
      'Eliminates predatory coaching paywalls with permanent free tiers',
      'Identifies real conceptual blind-spots instead of superficial scores',
      'Verifiable scorecards with cryptographic tamper-proofing',
      'Safe, focused, ad-free study environment with zero social distractions',
    ],
    accent: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: UserCheck,
    title: 'For Educators & Mentors',
    audience: 'Coaching Faculty, School Teachers & TAs',
    items: [
      'Batch-wide error heatmaps to pinpoint cohort conceptual misconceptions',
      'Instant custom test creation by chapter, difficulty, and year',
      'Complete question provenance: paper year, session, and official key',
      'Downloadable LaTeX assignment sets with step-by-step solutions',
      'Eliminates time spent manual grading through automated AST runners',
      'Real-time student engagement metrics and consistency logs',
    ],
    accent: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  },
]

export function BenefitsSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-950 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Designed for Every Stakeholder
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Rigor and Value for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Students, Parents & Faculty
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Engineered to remove friction from the learning loop while providing complete
            transparency to families and mentors.
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {stakeholderBenefits.map((stakeholder, index) => (
            <motion.div
              key={stakeholder.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="bg-slate-900/80 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${stakeholder.accent}`}>
                    <stakeholder.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Verified Pedagogy
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{stakeholder.title}</h3>
                <p className="text-xs text-slate-400 mb-6">{stakeholder.audience}</p>

                {/* Items List */}
                <ul className="space-y-3">
                  {stakeholder.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
                <span>Zero Compromise Standards</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BenefitsSection
