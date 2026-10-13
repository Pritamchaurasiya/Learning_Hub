import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { playExamChime, playRewardChime, playArenaChime } from './soundEffects'

describe('soundEffects Web Audio Synthesizer', () => {
  const originalAudioContext = window.AudioContext

  class MockAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    createOscillator = vi.fn().mockReturnValue({
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })
    createGain = vi.fn().mockReturnValue({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })
    resume = vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    // @ts-expect-error Mocking window AudioContext
    window.AudioContext = MockAudioContext
  })

  afterEach(() => {
    window.AudioContext = originalAudioContext
  })

  it('plays exam chimes without throwing', () => {
    expect(() => playExamChime('warning-5m')).not.toThrow()
    expect(() => playExamChime('warning-1m')).not.toThrow()
    expect(() => playExamChime('time-up')).not.toThrow()
  })

  it('plays reward chimes without throwing', () => {
    expect(() => playRewardChime('quest-complete')).not.toThrow()
    expect(() => playRewardChime('xp-gain')).not.toThrow()
    expect(() => playRewardChime('milestone')).not.toThrow()
  })

  it('plays competitive arena chimes without throwing', () => {
    expect(() => playArenaChime('submission-accepted')).not.toThrow()
    expect(() => playArenaChime('rank-up')).not.toThrow()
    expect(() => playArenaChime('duel-start')).not.toThrow()
  })

  it('handles environment where AudioContext is unavailable gracefully', () => {
    // @ts-expect-error Intentionally clearing AudioContext
    window.AudioContext = undefined

    expect(() => playExamChime('warning-5m')).not.toThrow()
    expect(() => playRewardChime('milestone')).not.toThrow()
    expect(() => playArenaChime('rank-up')).not.toThrow()
  })
})
