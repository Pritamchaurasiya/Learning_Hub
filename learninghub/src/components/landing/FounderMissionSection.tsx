import { motion } from 'framer-motion'
import { HeartHandshake, ShieldCheck, Zap, Sparkles, Check } from 'lucide-react'

export function FounderMissionSection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800 text-white relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-slate-950 rounded-2xl p-8 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Letter Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-400 mb-6">
            <HeartHandshake className="w-3.5 h-3.5" />
            An Open Letter to Students & Developers
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-6">
            Why We Built LearningHub:{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
              Rigor Over Marketing
            </span>
          </h2>

          <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            <p>
              Like many of you, our team spent years navigating the intense pressure cooker of Indian
              competitive exams and technical coding interviews. We experienced firsthand the frustration
              with legacy coaching institutes: slow, clunky web portals that charged exorbitant fees,
              locked PDFs behind aggressive sales calls, and provided explanations with missing steps.
            </p>
            <p>
              More recently, we saw the rise of generic &ldquo;AI ed-tech&rdquo; websites that churned out
              hallucinated calculus proofs and buggy code snippets that left students more confused
              than when they started.
            </p>
            <p className="font-semibold text-white">
              We decided to build the platform we wished had existed when we were preparing.
            </p>
          </div>

          {/* Our Core Guarantees Grid */}
          <div className="mt-8 pt-8 border-t border-slate-800 grid sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Zero Telemarketing Spam</p>
                <p className="text-slate-400">
                  We never sell student data or employ sales callers. Your phone number is strictly for
                  two-factor auth.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Client-Side Speed</p>
                <p className="text-slate-400">
                  Sub-15ms code compilation and instant problem navigation. We value your preparation
                  hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Faculty-Audited Explanations</p>
                <p className="text-slate-400">
                  Every step is verified by experienced educators. No AI shortcuts, no missed edge
                  cases.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Permanent Free Tier</p>
                <p className="text-slate-400">
                  Core practice questions, chapter filters, and formula notes remain accessible to every
                  student, forever.
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-3">
            <div>
              <p className="font-semibold text-white">The LearningHub Engineering & Pedagogy Team</p>
              <p className="text-slate-500">Built with care across Bengaluru, Kota, and Delhi</p>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Version 2.14.0 • Built on Open Standards
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FounderMissionSection
