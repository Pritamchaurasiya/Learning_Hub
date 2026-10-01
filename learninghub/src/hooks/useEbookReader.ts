import { useState, useEffect, useCallback } from 'react'
import type { EbookSettings, EbookTheme, EbookFontFamily } from '../types/ebook'

const DEFAULT_SETTINGS: EbookSettings = {
  theme: 'sepia',
  fontFamily: 'merriweather',
  fontSize: 18,
  lineHeight: 1.7,
  contentWidth: 'normal',
  textAlign: 'left',
  bionicReading: false,
  ttsSpeed: 1.0,
  ttsVoice: null,
}

const STORAGE_KEY_SETTINGS = 'lh_ebook_reader_settings'

export function useEbookReader() {
  const [settings, setSettings] = useState<EbookSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_SETTINGS
  })

  const [isTOCOpen, setIsTOCOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(false)
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const updateSetting = useCallback(
    <K extends keyof EbookSettings>(key: K, value: EbookSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const setTheme = useCallback(
    (theme: EbookTheme) => {
      updateSetting('theme', theme)
    },
    [updateSetting]
  )

  const setFontFamily = useCallback(
    (fontFamily: EbookFontFamily) => {
      updateSetting('fontFamily', fontFamily)
    },
    [updateSetting]
  )

  const setFontSize = useCallback(
    (size: number) => {
      updateSetting('fontSize', Math.max(12, Math.min(32, size)))
    },
    [updateSetting]
  )

  const setLineHeight = useCallback(
    (lh: number) => {
      updateSetting('lineHeight', Math.max(1.3, Math.min(2.4, Math.round(lh * 10) / 10)))
    },
    [updateSetting]
  )

  const toggleBionicReading = useCallback(() => {
    setSettings(prev => ({ ...prev, bionicReading: !prev.bionicReading }))
  }, [])

  return {
    settings,
    updateSetting,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    toggleBionicReading,
    isTOCOpen,
    setIsTOCOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isNotesOpen,
    setIsNotesOpen,
    isAIToolsOpen,
    setIsAIToolsOpen,
    isFlashcardsOpen,
    setIsFlashcardsOpen,
    readingProgress,
    setReadingProgress,
  }
}
