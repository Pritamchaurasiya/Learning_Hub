import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { PublicHeader } from '../components/landing/PublicHeader'
import { HeroSection } from '../components/landing/HeroSection'
import { ExamCoverage } from '../components/landing/ExamCoverage'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { HowItWorks } from '../components/landing/HowItWorks'
import { BenefitsSection } from '../components/landing/BenefitsSection'
import { TrustMetrics } from '../components/landing/TrustMetrics'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { PublicFooter } from '../components/landing/PublicFooter'
import {
  getOrganizationSchema,
  getWebSiteSchema,
  getFAQSchema,
  getSoftwareApplicationSchema,
} from '../utils/seoSchemas'

const HomePage = memo(function HomePage() {
  const navigate = useNavigate()

  const handleStartFree = () => navigate('/auth?mode=signup')
  const handleViewDemo = () => navigate('/library')
  const handleSelectExam = (examId: string) => navigate(`/library?search=${encodeURIComponent(examId)}`)

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
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <SEO
        title="LearningHub: India's Top Exam Practice & PYQ Platform"
        description="Master JEE, NEET & BITSAT with 100,000+ chapter-wise PYQs, step-by-step AI solutions, and real-time weak area analytics. Start your free practice session today!"
        keywords="JEE Main, JEE Advanced, NEET, BITSAT, previous year questions, competitive exam preparation, online practice, DSA practice, software engineering"
        jsonLd={homeSchemas}
      />
      <PublicHeader />
      <main className="flex-1">
        <HeroSection onStartFree={handleStartFree} onViewDemo={handleViewDemo} />
        <ExamCoverage onSelectExam={handleSelectExam} />
        <FeaturesGrid />
        <HowItWorks />
        <BenefitsSection />
        <TrustMetrics />
        <FAQSection />
        <CTASection onGetStarted={handleStartFree} />
      </main>
      <PublicFooter />
    </div>
  )
})

export default HomePage
