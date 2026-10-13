import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import { ShieldCheck, Award, Heart, ExternalLink } from 'lucide-react'

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="inline-block" aria-label="LearningHub Home">
            <BrandLogo size="md" variant="full" />
          </Link>
          <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
            Comprehensive Software Engineering & Exam Practice Platform. Master Data Structures, System Design, JEE & NEET with 100,000+ chapter-wise PYQs, interactive workspaces, and structured mentor guidance.
          </p>
          <div className="flex items-center gap-3 pt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              256-Bit SSL Encrypted
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Award className="w-4 h-4" aria-hidden="true" />
              W3C Verifiable Credentials
            </span>
          </div>
        </div>

        {/* Column 1: Curriculum & Practice */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
            Practice & Curriculum
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/library" className="hover:text-white transition-colors">
                Course Catalog & Ebooks
              </Link>
            </li>
            <li>
              <Link to="/problems" className="hover:text-white transition-colors">
                DSA Problem Directory
              </Link>
            </li>
            <li>
              <Link to="/tests-a" className="hover:text-white transition-colors">
                Tests A+ Adaptive CAT
              </Link>
            </li>
            <li>
              <Link to="/visualizer" className="hover:text-white transition-colors">
                Algorithm Visualizer Studio
              </Link>
            </li>
            <li>
              <Link to="/library?tab=ebooks" className="hover:text-white transition-colors">
                Interactive Textbooks
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Platform & Students */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
            Platform & Tools
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/pricing" className="hover:text-white transition-colors">
                Subscription & Pricing
              </Link>
            </li>
            <li>
              <Link to="/updates" className="hover:text-white transition-colors">
                Student Circulars & Notices
              </Link>
            </li>
            <li>
              <Link to="/verify-certificate" className="hover:text-white transition-colors">
                Verify Digital Certificate
              </Link>
            </li>
            <li>
              <Link to="/offline" className="hover:text-white transition-colors">
                Offline PWA Station
              </Link>
            </li>
            <li>
              <Link to="/auth?mode=signup" className="hover:text-white transition-colors text-amber-400 font-medium">
                Create Free Account
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal & Trust */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
            Legal & Standards
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy & GDPR
              </Link>
            </li>
            <li>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1"
              >
                Robots.txt Gateway <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1"
              >
                XML Sitemap Feed <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p className="text-gray-400">
          © {currentYear} LearningHub Technologies Inc. All rights reserved.
        </p>
        <p className="flex items-center gap-1 text-gray-400">
          Crafted with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" aria-hidden="true" /> for ambitious software engineers worldwide.
        </p>
      </div>
    </footer>
  )
}
