import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { HeroSection } from '../components/landing/HeroSection'
import { ExamCoverage } from '../components/landing/ExamCoverage'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { HowItWorks } from '../components/landing/HowItWorks'
import { BenefitsSection } from '../components/landing/BenefitsSection'
import { TrustMetrics } from '../components/landing/TrustMetrics'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'

const HomePage = memo(function HomePage() {
  const navigate = useNavigate()

  const handleStartFree = () => navigate('/auth?mode=signup')
  const handleViewDemo = () => navigate('/search')
  const handleSelectExam = (examId: string) => navigate(`/search?q=${encodeURIComponent(examId)}`)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <SEO
        title="LearningHub - Master Your Exam with India's Best Practice Platform"
        description="Practice chapter-wise previous year questions for JEE, NEET, BITSAT & more. Get detailed solutions, smart analytics, and ace your competitive exam."
        keywords="JEE Main, JEE Advanced, NEET, BITSAT, previous year questions, competitive exam preparation, online practice"
      />
      <HeroSection onStartFree={handleStartFree} onViewDemo={handleViewDemo} />
      <ExamCoverage onSelectExam={handleSelectExam} />
      <FeaturesGrid />
      <HowItWorks />
      <BenefitsSection />
      <TrustMetrics />
      <FAQSection />
      <CTASection onGetStarted={handleStartFree} />
    </div>
  )
})

export default HomePage
