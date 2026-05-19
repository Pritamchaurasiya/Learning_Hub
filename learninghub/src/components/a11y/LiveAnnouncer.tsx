import { useEffect, useRef } from 'react'

interface LiveAnnouncerProps {
  message: string
  priority?: 'polite' | 'assertive'
  clearAfter?: number
}

// Component to announce messages to screen readers
export function LiveAnnouncer({
  message,
  priority = 'polite',
  clearAfter = 1000,
}: LiveAnnouncerProps) {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const targetRef = priority === 'polite' ? politeRef : assertiveRef
    if (targetRef.current && message) {
      targetRef.current.textContent = message

      const timer = setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.textContent = ''
        }
      }, clearAfter)

      return () => clearTimeout(timer)
    }
  }, [message, priority, clearAfter])

  return (
    <div className="sr-only" aria-live="off">
      <div ref={politeRef} aria-live="polite" aria-atomic="true" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" />
    </div>
  )
}

// Static announcer region for the app
export function AnnouncerRegions() {
  return (
    <div className="sr-only" aria-live="off">
      <div id="announcer-polite" aria-live="polite" aria-atomic="true" />
      <div id="announcer-assertive" aria-live="assertive" aria-atomic="true" />
    </div>
  )
}
