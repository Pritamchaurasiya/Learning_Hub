export type EbookTheme = 'light' | 'sepia' | 'dark' | 'oled'
export type EbookFontFamily = 'inter' | 'merriweather' | 'jetbrains-mono' | 'opendyslexic'
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'coral' | 'purple'

export interface EbookMetadata {
  id: string
  title: string
  slug: string
  author: string
  authorAvatar?: string
  coverUrl: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  totalChapters: number
  estimatedReadingTimeMins: number
  rating: number
  reviewCount: number
  fileSizeBytes: number
  isOfflineCached?: boolean
  tags: string[]
  publishedAt: string
}

export interface EbookChapter {
  id: string
  ebookId: string
  title: string
  order: number
  contentMarkdown: string
  estimatedReadTimeMins: number
  summary?: string
  keyTakeaways?: string[]
  glossary?: EbookGlossaryTerm[]
}

export interface EbookGlossaryTerm {
  id: string
  term: string
  definition: string
  relatedConcepts?: string[]
}

export interface EbookHighlight {
  id: string
  chapterId: string
  text: string
  color: HighlightColor
  startOffset: number
  endOffset: number
  note?: string
  createdAt: string
}

export interface EbookBookmark {
  id: string
  chapterId: string
  chapterTitle: string
  pageNumber?: number
  note?: string
  createdAt: string
}

export interface EbookFlashcard {
  id: string
  chapterId: string
  front: string
  back: string
  explanation: string
  repetitionData?: {
    repetitions: number
    intervalDays: number
    easeFactor: number
    nextReviewDate: string
  }
}

export interface EbookSettings {
  theme: EbookTheme
  fontFamily: EbookFontFamily
  fontSize: number // 12 - 32
  lineHeight: number // 1.3 - 2.2
  contentWidth: 'narrow' | 'normal' | 'wide'
  textAlign: 'left' | 'justify'
  bionicReading: boolean
  ttsSpeed: number
  ttsVoice: string | null
}
