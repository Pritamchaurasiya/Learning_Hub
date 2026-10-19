import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize2, Minimize2, LayoutGrid } from 'lucide-react'
import { SEO } from '../components/SEO'

const TestsAStationPage = memo(() => {
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      void document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 w-full h-screen bg-[#0a0a1f] flex flex-col overflow-hidden">
      <SEO
        title="Tests A+ | LearningHub CBT Studio"
        description="Comprehensive interactive CBT testing simulator, adaptive pathway, spaced flashcards and mistake notebook."
      />
      {/* Top Floating App Bridge Bar */}
      <header className="h-11 bg-[#0d0d2b]/95 backdrop-blur border-b border-[#8b78ff]/20 px-3 sm:px-4 flex items-center justify-between shrink-0 z-50 text-xs font-semibold text-gray-200">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="flex items-center gap-1.5 text-purple-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tests A+ Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tests-a/catalog')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-colors border border-indigo-500/30"
            title="Switch to Question Bank / Admin Import"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Test Catalog & Bank</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Full-Fidelity Tests A+ Studio Frame */}
      <div className="flex-1 w-full h-[calc(100vh-2.75rem)] relative overflow-hidden bg-[#0a0a1f]">
        <iframe
          src="/tests-a-plus.html"
          title="Tests A+ Interactive Studio"
          className="w-full h-full border-0 block"
          allow="fullscreen; clipboard-write; clipboard-read"
        />
      </div>
    </div>
  )
})

export default TestsAStationPage
