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
