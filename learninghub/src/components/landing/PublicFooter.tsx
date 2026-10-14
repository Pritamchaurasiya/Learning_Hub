import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import { ShieldCheck, Award, Heart, Terminal } from 'lucide-react'

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="inline-block" aria-label="LearningHub Home">
            <BrandLogo size="md" variant="full" />
          </Link>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
            The dual-track practice platform for Competitive STEM Entrance (JEE/NEET/BITSAT) and
            Software Engineering Mastery. 100,000+ chapter-wise PYQs, sub-15ms browser AST execution,
            and verified proofs audited by senior faculty.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              NTA 2026 Aligned
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Award className="w-4 h-4" aria-hidden="true" />
              W3C Verifiable Credentials
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Terminal className="w-4 h-4" aria-hidden="true" />
              Wasm AST Sandbox
            </span>
          </div>
        </div>

        {/* Column 1: Competitive STEM Track */}
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">
            Competitive STEM Track
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <Link to="/library?search=JEE%20Main" className="hover:text-white transition-colors">
                JEE Main PYQs (2010–2026)
              </Link>
            </li>
            <li>
              <Link to="/library?search=JEE%20Advanced" className="hover:text-white transition-colors">
                JEE Advanced Multi-Correct
              </Link>
            </li>
            <li>
              <Link to="/library?search=NEET" className="hover:text-white transition-colors">
                NEET UG NCERT Biology Drills
              </Link>
            </li>
            <li>
              <Link to="/tests-a" className="hover:text-white transition-colors">
                Tests A+ NTA CBT Simulator
              </Link>
            </li>
            <li>
              <Link to="/revision" className="hover:text-white transition-colors">
                Spaced Revision Flashcards
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Software Engineering Track */}
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">
            Software Engineering
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <Link to="/problems" className="hover:text-white transition-colors">
                DSA Problem Directory (Blind 75)
              </Link>
            </li>
            <li>
              <Link to="/arena" className="hover:text-white transition-colors">
                1v1 Arena Coding Duels
              </Link>
            </li>
            <li>
              <Link to="/visualizer" className="hover:text-white transition-colors">
                Algorithm Visualizer Studio
              </Link>
            </li>
            <li>
              <Link to="/interview" className="hover:text-white transition-colors">
                Technical Interview Simulator
              </Link>
            </li>
            <li>
              <Link to="/verify-certificate" className="hover:text-white transition-colors">
                Verify Digital Credentials
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Trust, Standards & Openness */}
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-4">
            Trust & Governance
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li>
              <Link to="/pricing" className="hover:text-white transition-colors">
                Pricing & Free Tier Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white transition-colors">
                Academic Integrity & Terms
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Zero-Spam Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/updates" className="hover:text-white transition-colors">
                Official Notices & Circulars
              </Link>
            </li>
            <li>
              <Link to="/offline" className="hover:text-white transition-colors">
                Offline PWA Station
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>
          © {currentYear} LearningHub Academic & Systems Engineering Foundation. All rights reserved.
        </p>
        <p className="flex items-center gap-1.5">
          Crafted with{' '}
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" aria-hidden="true" />{' '}
          for ambitious STEM students and software engineers worldwide.
        </p>
      </div>
    </footer>
  )
}

export default PublicFooter
