import { memo } from 'react'
import { SEO } from '../components/SEO'

const TestsAStationPage = memo(() => {
  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-[#0a0a1f] relative overflow-hidden">
      <SEO
        title="Tests A+ Studio | CBT Simulator"
        description="Comprehensive interactive CBT testing simulator, adaptive pathway, spaced flashcards and mistake notebook."
      />
      <iframe
        src="/tests-a-plus.html"
        title="Tests A+ Interactive Studio"
        className="w-full h-full border-0"
        allow="fullscreen; clipboard-write; clipboard-read"
      />
    </div>
  )
})

export default TestsAStationPage
