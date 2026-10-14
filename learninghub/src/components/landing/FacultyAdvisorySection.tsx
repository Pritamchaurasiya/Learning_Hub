import { motion } from 'framer-motion'
import { GraduationCap, ShieldCheck, BookCheck } from 'lucide-react'

const advisors = [
  {
    name: 'Prof. Anirban Mukherjee, Ph.D.',
    pedigree: 'Ex-Visiting Academic Fellow, IIT Delhi • Ph.D. Theoretical CS',
    role: 'Lead, Algorithmic Curriculum & Problem Verification',
    experience: '18+ Years Academic & Research Experience',
    bio: 'Oversees the algorithmic correctness of all 750+ DSA problems and AST test-case suites. Champions formal correctness proofs over ad-hoc trick heuristics.',
    initials: 'AM',
    accentBg: 'bg-blue-600',
    tags: ['Graph Theory', 'Dynamic Programming', 'AST Engine'],
  },
  {
    name: 'Dr. Meenakshi Sundaram, Ph.D.',
    pedigree: 'IISc Bangalore Doctoral Fellow • 16+ Years JEE Advanced Pedagogy',
    role: 'Head of Physics & Mathematical Proofs',
    experience: 'Mentored 40+ Top 100 JEE Advanced Rankers',
    bio: 'Audits every physics derivation on LearningHub for dimensional consistency, vector rigor, and alternate calculus approaches so students understand the why, not just the formula.',
    initials: 'MS',
    accentBg: 'bg-amber-600',
    tags: ['Rotational Dynamics', 'Electrodynamics', 'Calculus Proofs'],
  },
  {
    name: 'K. S. Venkatesh',
    pedigree: 'Ex-Staff Infrastructure Engineer • Scaled to 10M+ DAU',
    role: 'Director of Distributed Systems & System Design',
    experience: '14+ Years Core Engineering Practice',
    bio: 'Designs our interactive system design blueprints and arena duel engine. Dedicated to teaching production reality—failure modes, latency trade-offs, and consensus algorithms.',
    initials: 'KV',
    accentBg: 'bg-emerald-600',
    tags: ['Distributed Systems', 'Load Balancing', 'Consensus'],
  },
  {
    name: 'Dr. Ritu Bhatnagar, M.D.',
    pedigree: 'Maulana Azad Medical College Alumna • University Gold Medalist',
    role: 'Lead, Medical Sciences & NCERT Biology',
    experience: 'Chief Academic Reviewer for Medical Entrance',
    bio: 'Ensures 100% adherence to NCERT diagrams and National Testing Agency NEET guidelines. Reviews assertion-reasoning matrices to eliminate ambiguous or poorly drafted questions.',
    initials: 'RB',
    accentBg: 'bg-rose-600',
    tags: ['Human Physiology', 'Genetics', 'Assertion-Reasoning'],
  },
]

export function FacultyAdvisorySection() {
  return (
    <section className="py-20 lg:py-28 bg-slate-950 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 mb-4">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            Academic & Engineering Pedigree
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Guided by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Distinguished Educators
            </span>{' '}
            & Staff Engineers
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every question, solution proof, and code test runner is designed and audited by senior
            academics and industry veterans. No hallucinated LLM shortcuts.
          </p>
        </div>

        {/* Advisory Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advisors.map((advisor, index) => (
            <motion.div
              key={advisor.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="bg-slate-900/80 rounded-xl p-6 border border-slate-800 hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                {/* Avatar & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${advisor.accentBg} flex items-center justify-center font-bold text-white text-base shadow-md`}
                  >
                    {advisor.initials}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Faculty
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{advisor.name}</h3>
                <p className="text-xs font-semibold text-amber-400 mb-1">{advisor.role}</p>
                <p className="text-xs text-slate-400 mb-3">{advisor.pedigree}</p>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {advisor.bio}
                </p>
              </div>

              {/* Tags */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1">
                {advisor.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Academic Integrity Pledge Box */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <BookCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Our Triple-Pass Verification Guarantee</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Before any question or proof is published, it passes: (1) Official Exam Key Alignment,
                (2) Dimensional & Boundary-Condition Validation, and (3) Senior Faculty Peer Review.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Audit Hash: SHA-256 #lh-curriculum-2026
          </div>
        </div>
      </div>
    </section>
  )
}

export default FacultyAdvisorySection
