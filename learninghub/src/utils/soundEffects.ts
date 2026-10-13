/**
 * Web Audio API synthesized sound cues for test examinations
 * Zero external audio files required. Safe across modern browsers.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        audioCtx = new AudioCtx()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Play a synthesized chime using Web Audio API
 */
export function playExamChime(type: 'warning-5m' | 'warning-1m' | 'time-up'): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (type === 'warning-5m') {
    // Elegant two-tone notification (C5 -> G5)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now) // C5
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(783.99, now + 0.15) // G5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.18)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.6)
  } else if (type === 'warning-1m') {
    // Subtle double pulse alert (A5)
    for (let i = 0; i < 2; i++) {
      const startTime = now + i * 0.2
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880, startTime) // A5

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.15)
    }
  } else if (type === 'time-up') {
    // Descending tone marking conclusion
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(659.25, now) // E5
    osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.5) // E4

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.7)
  }
}

/**
 * Play a synthesized positive reward / dopamine chime
 */
export function playRewardChime(type: 'quest-complete' | 'xp-gain' | 'milestone'): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (type === 'quest-complete') {
    // Upbeat major triad arpeggio (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.08

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.35)
    })
  } else if (type === 'xp-gain') {
    // Quick two-note ascending sparkle (G5 -> C6)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(783.99, now)
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.28)
  } else if (type === 'milestone') {
    // Celebratory 4-note fanfare (C5 -> G5 -> C6 -> E6)
    const notes = [523.25, 783.99, 1046.5, 1318.51]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.1

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.5)
    })
  }
}

/**
 * Play a synthesized competitive arena chime using Web Audio API
 */
export function playArenaChime(type: 'submission-accepted' | 'rank-up' | 'duel-start'): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (type === 'submission-accepted') {
    // Crisp ascending triad indicating all test cases passed (F5 -> A5 -> C6)
    const notes = [698.46, 880.0, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.07

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.3)
    })
  } else if (type === 'rank-up') {
    // Resonant trumpet fanfare (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.09

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.45)
    })
  } else if (type === 'duel-start') {
    // Dynamic cybernetic alert cue (double punch at 440Hz -> 880Hz)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  }
}

