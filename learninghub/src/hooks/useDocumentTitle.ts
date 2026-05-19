import { useEffect } from 'react'

/**
 * Custom hook to set the document title dynamically per page.
 * Restores default title on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title
      ? `${title} | LearningHub`
      : 'LearningHub - Complete Software Engineering Learning Platform'
    return () => {
      document.title = prevTitle
    }
  }, [title])
}

export default useDocumentTitle
