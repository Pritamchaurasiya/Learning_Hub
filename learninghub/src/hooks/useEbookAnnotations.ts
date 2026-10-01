import { useState, useEffect, useCallback } from 'react'
import type { EbookHighlight, EbookBookmark, HighlightColor } from '../types/ebook'

export function useEbookAnnotations(ebookId: string, chapterId: string) {
  const storageKeyHighlights = `lh_ebook_highlights_${ebookId}`
  const storageKeyBookmarks = `lh_ebook_bookmarks_${ebookId}`

  const [highlights, setHighlights] = useState<EbookHighlight[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyHighlights)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [bookmarks, setBookmarks] = useState<EbookBookmark[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyBookmarks)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyHighlights, JSON.stringify(highlights))
    } catch {}
  }, [highlights, storageKeyHighlights])

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyBookmarks, JSON.stringify(bookmarks))
    } catch {}
  }, [bookmarks, storageKeyBookmarks])

  const addHighlight = useCallback(
    (text: string, color: HighlightColor = 'yellow', note?: string) => {
      const newHighlight: EbookHighlight = {
        id: `hl_${Date.now()}`,
        chapterId,
        text,
        color,
        startOffset: 0,
        endOffset: text.length,
        note,
        createdAt: new Date().toISOString(),
      }
      setHighlights(prev => [newHighlight, ...prev])
      return newHighlight
    },
    [chapterId]
  )

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  const updateHighlightNote = useCallback((id: string, note: string) => {
    setHighlights(prev => prev.map(h => (h.id === id ? { ...h, note } : h)))
  }, [])

  const toggleBookmark = useCallback(
    (chapterTitle: string, note?: string) => {
      setBookmarks(prev => {
        const exists = prev.some(b => b.chapterId === chapterId)
        if (exists) {
          return prev.filter(b => b.chapterId !== chapterId)
        }
        const newBm: EbookBookmark = {
          id: `bm_${Date.now()}`,
          chapterId,
          chapterTitle,
          note,
          createdAt: new Date().toISOString(),
        }
        return [newBm, ...prev]
      })
    },
    [chapterId]
  )

  const isBookmarked = bookmarks.some(b => b.chapterId === chapterId)

  const exportStudyGuideMarkdown = useCallback(
    (ebookTitle: string) => {
      const lines: string[] = []
      lines.push(`# Study Guide: ${ebookTitle}`)
      lines.push(`Generated on ${new Date().toLocaleDateString()}\n`)
      lines.push('## Highlights & Key Takeaways\n')

      highlights.forEach((h, idx) => {
        lines.push(`### ${idx + 1}. [${h.color.toUpperCase()}] Highlight`)
        lines.push(`> "${h.text}"\n`)
        if (h.note) {
          lines.push(`*Note: ${h.note}*\n`)
        }
      })

      if (bookmarks.length > 0) {
        lines.push('## Bookmarked Sections\n')
        bookmarks.forEach(b => {
          lines.push(
            `- **${b.chapterTitle}** (Bookmarked ${new Date(b.createdAt).toLocaleDateString()})`
          )
        })
      }

      return lines.join('\n')
    },
    [highlights, bookmarks]
  )

  return {
    highlights,
    chapterHighlights: highlights.filter(h => h.chapterId === chapterId),
    bookmarks,
    isBookmarked,
    addHighlight,
    removeHighlight,
    updateHighlightNote,
    toggleBookmark,
    exportStudyGuideMarkdown,
  }
}
