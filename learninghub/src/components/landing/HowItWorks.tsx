import { motion } from 'framer-motion'
import { Compass, BookCheck, Terminal, Award } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Compass,
    title: 'Select Your Learning Track',
    description:
      'Choose between Competitive STEM Entrance (JEE/NEET/BITSAT) or Software Engineering & Systems (DSA/System Design). Toggle anytime.',
    accent: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    number: '02',
    icon: Terminal,
    title: 'Sub-15ms First-Principles Practice',
    description:
      'Solve official PYQs or code algorithmic challenges in your browser with zero latency. Test cases execute locally via WebAssembly.',
    accent: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    number: '03',
    icon: BookCheck,
    title: 'Faculty-Verified Proofs & Pacing',
    description:
      'Review step-by-step mathematical proofs with dimensional analysis. Identify careless mistakes, pacing dips, and blind spots.',
    accent: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    number: '04',
    icon: Award,
    title: 'Spaced Retention & Verifiable Proof',
    description:
      'SuperMemo SM-2 spaced repetition locks concepts before forgetting curves decay. Earn tamper-proof W3C cryptographic credentials.',
    accent: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 mb-4">
            Evidence-Based Learning Methodology
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            How Serious Practice{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Actually Works
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A 4-step framework engineered around active recall, zero-lag browser execution, and
            transparent error diagnosis.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="bg-slate-950/80 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${step.accent}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Step {step.number}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center text-[11px] font-mono text-slate-500">
                <span>Phase {step.number} Protocol</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
