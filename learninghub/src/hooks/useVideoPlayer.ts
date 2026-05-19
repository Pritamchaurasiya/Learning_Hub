import { useState, useRef, useCallback, useEffect } from 'react'

interface VideoState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  isFullscreen: boolean
  isLoading: boolean
  buffered: number
}

interface VideoControls {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  skip: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => void
}

interface Bookmark {
  id: string
  time: number
  label: string
  createdAt: string
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  state: VideoState
  controls: VideoControls
  bookmarks: Bookmark[]
  addBookmark: (label: string) => void
  removeBookmark: (id: string) => void
  goToBookmark: (time: number) => void
  formatTime: (seconds: number) => string
}

export function useVideoPlayer(
  onTimeUpdate?: (currentTime: number, duration: number) => void,
  onEnded?: () => void
): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    isFullscreen: false,
    isLoading: true,
    buffered: 0,
  })
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const lastSavedTime = useRef(0)

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('videoBookmarks')
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved))
      } catch {
        if (import.meta.env.DEV) {
          console.error('Failed to load bookmarks')
        }
      }
    }
  }, [])

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('videoBookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  const play = useCallback(async () => {
    try {
      await videoRef.current?.play()
      setState(prev => ({ ...prev, isPlaying: true }))
    } catch {
      // Autoplay prevented or other error
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause()
    } else {
      void play()
    }
  }, [state.isPlaying, play, pause])

  const seek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, Math.min(time, state.duration))
      }
    },
    [state.duration]
  )

  const skip = useCallback(
    (seconds: number) => {
      if (videoRef.current) {
        const newTime = videoRef.current.currentTime + seconds
        seek(newTime)
      }
    },
    [seek]
  )

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      videoRef.current.volume = clampedVolume
      setState(prev => ({ ...prev, volume: clampedVolume }))
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !state.isMuted
      videoRef.current.muted = newMuted
      setState(prev => ({ ...prev, isMuted: newMuted }))
    }
  }, [state.isMuted])

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setState(prev => ({ ...prev, playbackRate: rate }))
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (!document.fullscreenElement) {
      void video.requestFullscreen?.()
      setState(prev => ({ ...prev, isFullscreen: true }))
    } else {
      void document.exitFullscreen?.()
      setState(prev => ({ ...prev, isFullscreen: false }))
    }
  }, [])

  // Format time helper - defined before use
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const addBookmark = useCallback(
    (label: string) => {
      const newBookmark: Bookmark = {
        id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        time: state.currentTime,
        label: label || `Bookmark at ${formatTime(state.currentTime)}`,
        createdAt: new Date().toISOString(),
      }
      setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.time - b.time))
    },
    [state.currentTime, formatTime]
  )

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }, [])

  const goToBookmark = useCallback(
    (time: number) => {
      seek(time)
      void play()
    },
    [seek, play]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
        case 'j':
          e.preventDefault()
          skip(e.shiftKey ? -10 : -5)
          break
        case 'ArrowRight':
        case 'l':
          e.preventDefault()
          skip(e.shiftKey ? 10 : 5)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(state.volume + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(state.volume - 0.1)
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          const percent = parseInt(e.key) * 10
          seek((state.duration * percent) / 100)
          break
        case 'b':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            addBookmark('Quick bookmark')
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    togglePlay,
    skip,
    setVolume,
    state.volume,
    toggleFullscreen,
    toggleMute,
    seek,
    state.duration,
    addBookmark,
  ])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const current = video.currentTime
      const duration = video.duration || 0

      setState(prev => ({ ...prev, currentTime: current, duration }))

      // Save progress every 5 seconds
      if (Math.abs(current - lastSavedTime.current) >= 5) {
        onTimeUpdate?.(current, duration)
        lastSavedTime.current = current
      }
    }

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: video.duration || 0,
        isLoading: false,
      }))
    }

    const handleWaiting = () => {
      setState(prev => ({ ...prev, isLoading: true }))
    }

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }))
    }

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
      onEnded?.()
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1)
        setState(prev => ({ ...prev, buffered }))
      }
    }

    const handleVolumeChange = () => {
      setState(prev => ({ ...prev, volume: video.volume, isMuted: video.muted }))
    }

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onTimeUpdate, onEnded])

  return {
    videoRef,
    state,
    controls: {
      play,
      pause,
      togglePlay,
      seek,
      skip,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
    },
    bookmarks,
    addBookmark,
    removeBookmark,
    goToBookmark,
    formatTime,
  }
}
