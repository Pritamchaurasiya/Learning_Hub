import { useEffect, useState } from 'react'

/**
 * Ultra-fast, zero-layout-shift progress indicator for asynchronous route transitions.
 * Displays a sleek 2.5px gradient beam at the top of the viewport after 60ms delay
 * to avoid flashing for instant (<60ms) cached page transitions.
 */
export function RouteProgressBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show progress indicator if route chunk takes longer than 60ms
    const timer = setTimeout(() => {
      setVisible(true)
    }, 60)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading page content"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] bg-transparent overflow-hidden pointer-events-none"
    >
      <div className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500 animate-[route-progress_1.2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      <style>{`
        @keyframes route-progress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(20%) scaleX(0.7); }
          100% { transform: translateX(100%) scaleX(0.2); }
        }
      `}</style>
    </div>
  )
}

export default RouteProgressBar
