import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseSpeechVoiceOptions {
  onTranscript?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useSpeechVoice(options: UseSpeechVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(Boolean(SpeechRecognition && 'speechSynthesis' in window))

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        if (transcript) {
          options.onTranscript?.(transcript)
        }
      }

      recognition.onerror = (event: any) => {
        setIsListening(false)
        options.onError?.(event.error || 'Speech recognition error')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      options.onError?.('Speech recognition is not supported in this browser')
      return
    }
    try {
      recognitionRef.current.start()
    } catch {
      // ignore if already started
    }
  }, [options])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!('speechSynthesis' in window)) {
        options.onError?.('Text-to-speech is not supported in this browser')
        return
      }

      // Cancel ongoing speech
      window.speechSynthesis.cancel()

      if (!text.trim()) return

      // Clean markdown symbols for cleaner pronunciation
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_#~[\]()]/g, '')
        .trim()

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => {
        setIsSpeaking(true)
        if (messageId) setSpeakingMessageId(messageId)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setSpeakingMessageId(null)
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setSpeakingMessageId(null)
      }

      window.speechSynthesis.speak(utterance)
    },
    [options]
  )

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setSpeakingMessageId(null)
  }, [])

  return {
    isListening,
    isSpeaking,
    speakingMessageId,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  }
}
