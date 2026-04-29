import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return

    const handleScroll = () => {
      setVisible(main.scrollTop > 400)
    }

    main.addEventListener('scroll', handleScroll, { passive: true })
    return () => main.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    const main = document.querySelector('main')
    main?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full
                 bg-primary-600/90 hover:bg-primary-500 text-white
                 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40
                 backdrop-blur-sm border border-primary-400/30
                 transition-all duration-300 hover:scale-110
                 animate-fade-in-up"
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
