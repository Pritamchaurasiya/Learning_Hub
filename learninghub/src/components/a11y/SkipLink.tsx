import { useCallback } from 'react'

interface SkipLinkProps {
  mainContentId: string
  label?: string
}

export function SkipLink({ mainContentId, label = 'Skip to main content' }: SkipLinkProps) {
  const handleClick = useCallback(() => {
    const mainContent = document.getElementById(mainContentId)
    if (mainContent) {
      // Make it focusable temporarily
      mainContent.setAttribute('tabindex', '-1')
      mainContent.focus()
      // Remove tabindex after focus
      setTimeout(() => {
        mainContent.removeAttribute('tabindex')
      }, 0)
    }
  }, [mainContentId])

  return (
    <a
      href={`#${mainContentId}`}
      onClick={e => {
        e.preventDefault()
        handleClick()
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white 
                 focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 
                 focus:ring-offset-2 focus:ring-primary-600"
    >
      {label}
    </a>
  )
}
