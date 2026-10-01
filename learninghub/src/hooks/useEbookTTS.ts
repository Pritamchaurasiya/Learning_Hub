import { useState, useEffect, useRef, useCallback } from 'react'

export interface TTSState {
  isPlaying: boolean
  isPaused: boolean
  currentSentenceIndex: number
  totalSentences: number
  rate: number
  voice: SpeechSynthesisVoice | null
  availableVoices: SpeechSynthesisVoice[]
  ambientNoise: 'off' | 'rain' | 'whitenoise'
}

export function useEbookTTS(text: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [rate, setRate] = useState(1.0)
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [ambientNoise, setAmbientNoise] = useState<'off' | 'rain' | 'whitenoise'>('off')

  const sentencesRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioNode | null>(null)

  // Split chapter into readable sentences
  useEffect(() => {
    const raw = text.replace(/#+|\*+|_|`+/g, '') // strip markdown
    const sentences = raw
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5)
    sentencesRef.current = sentences
    setCurrentSentenceIndex(0)
    currentIndexRef.current = 0
  }, [text])

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
      if (!voice && voices.length > 0) {
        // Prefer natural English voices
        const natural = voices.find(
          v =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))
        )
        setVoice(natural || voices[0])
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [voice])

  // Ambient sound generator via Web Audio API
  useEffect(() => {
    if (ambientNoise === 'off') {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      return
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        if (ambientNoise === 'rain') {
          // Pink/Rain filter
          lastOut = (lastOut + 0.02 * white) / 1.02
          data[i] = lastOut * 1.5
        } else {
          // Soft white noise
          data[i] = white * 0.08
        }
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const gain = ctx.createGain()
      gain.gain.value = ambientNoise === 'rain' ? 0.15 : 0.08

      noise.connect(gain)
      gain.connect(ctx.destination)
      noise.start(0)
      noiseNodeRef.current = noise
    } catch {}

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [ambientNoise])

  const speakSentence = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const sentences = sentencesRef.current
      if (index >= sentences.length) {
        setIsPlaying(false)
        setIsPaused(false)
        return
      }

      window.speechSynthesis.cancel()

      const s = sentences[index]
      const utterance = new SpeechSynthesisUtterance(s)
      if (voice) utterance.voice = voice
      utterance.rate = rate

      utterance.onend = () => {
        const next = index + 1
        if (next >= sentences.length) {
          setIsPlaying(false)
          setCurrentSentenceIndex(0)
          currentIndexRef.current = 0
          return
        }
        currentIndexRef.current = next
        setCurrentSentenceIndex(next)
        speakSentence(next)
      }

      utterance.onerror = () => {
        setIsPlaying(false)
      }

      window.speechSynthesis.speak(utterance)
    },
    [rate, voice]
  )

  const play = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    setIsPlaying(true)
    setIsPaused(false)
    speakSentence(currentSentenceIndex)
  }, [currentSentenceIndex, isPaused, speakSentence])

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSentenceIndex(0)
    currentIndexRef.current = 0
  }, [])

  const jump = useCallback(
    (delta: number) => {
      const total = sentencesRef.current.length
      const next = Math.max(0, Math.min(total - 1, currentSentenceIndex + delta))
      setCurrentSentenceIndex(next)
      currentIndexRef.current = next
      if (isPlaying) {
        speakSentence(next)
      }
    },
    [currentSentenceIndex, isPlaying, speakSentence]
  )

  return {
    isPlaying,
    isPaused,
    currentSentenceIndex,
    totalSentences: sentencesRef.current.length,
    rate,
    setRate,
    voice,
    setVoice,
    availableVoices,
    ambientNoise,
    setAmbientNoise,
    play,
    pause,
    stop,
    jump,
  }
}
