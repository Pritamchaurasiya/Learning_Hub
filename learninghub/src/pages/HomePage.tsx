import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { SystemStatusBar } from '../components/landing/SystemStatusBar'
import { PublicHeader } from '../components/landing/PublicHeader'
import { HeroSection } from '../components/landing/HeroSection'
import { ExamCoverage } from '../components/landing/ExamCoverage'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { FacultyAdvisorySection } from '../components/landing/FacultyAdvisorySection'
import { FounderMissionSection } from '../components/landing/FounderMissionSection'
import { HowItWorks } from '../components/landing/HowItWorks'
import { BenefitsSection } from '../components/landing/BenefitsSection'
import { TrustMetrics } from '../components/landing/TrustMetrics'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { PublicFooter } from '../components/landing/PublicFooter'
import { KeyboardShortcutsModal } from '../components/landing/KeyboardShortcutsModal'
import {
  getOrganizationSchema,
  getWebSiteSchema,
  getFAQSchema,
  getSoftwareApplicationSchema,
} from '../utils/seoSchemas'

const HomePage = memo(function HomePage() {
  const navigate = useNavigate()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const handleStartFree = () => navigate('/auth?mode=signup')
  const handleViewDemo = () => navigate('/library')
  const handleSelectExam = (examId: string) => {
    if (examId === 'dsa-mastery') {
      navigate('/problems')
    } else if (examId === 'arena-duels') {
      navigate('/arena')
    } else if (examId === 'algo-visualizer') {
      navigate('/visualizer')
    } else if (examId === 'system-design') {
      navigate('/library?search=System%20Design')
    } else {
      navigate(`/library?search=${encodeURIComponent(examId)}`)
    }
  }

  // Aggregate Schema.org structured data for rich snippets in Google SERP
  const homeSchemas = useMemo(() => {
    return [
      getOrganizationSchema(),
      getWebSiteSchema(),
      getFAQSchema(),
      getSoftwareApplicationSchema(),
    ]
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      <SEO
        title="LearningHub: STEM & Software Engineering Practice Platform"
        description="India's rigorous dual-track practice platform. Master JEE, NEET & BITSAT with 100,000+ chapter-wise PYQs and build software engineering excellence with in-browser AST code execution, 1v1 Arena Duels, and verified faculty proofs."
        keywords="JEE Main, JEE Advanced, NEET, BITSAT, previous year questions, DSA practice, algorithm visualizer, software engineering, 1v1 coding duels, system design"
        jsonLd={homeSchemas}
      />
      <SystemStatusBar onOpenKeyboardShortcuts={() => setShortcutsOpen(true)} />
      <PublicHeader onOpenShortcuts={() => setShortcutsOpen(true)} />
      <main className="flex-1">
        <HeroSection onStartFree={handleStartFree} onViewDemo={handleViewDemo} />
        <ExamCoverage onSelectExam={handleSelectExam} />
        <FeaturesGrid />
        <FacultyAdvisorySection />
        <HowItWorks />
        <FounderMissionSection />
        <BenefitsSection />
        <TrustMetrics />
        <FAQSection />
        <CTASection onGetStarted={handleStartFree} />
      </main>
      <PublicFooter />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
})

export default HomePage
