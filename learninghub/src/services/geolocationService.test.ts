import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCountryFlag,
  isDoNotTrackEnabled,
  hasRequestedLocationPermission,
  markLocationPermissionRequested,
  getCachedDetection,
  setCachedDetection,
  detectFromBrowserLocale,
  detectCountryPipeline,
  type GeoDetectionResult,
} from './geolocationService'
import type { ActiveCountryInfo } from '../types/learningContext'

describe('geolocationService', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('getCountryFlag', () => {
    it('returns correct emoji for mapped ISO codes', () => {
      expect(getCountryFlag('IN')).toBe('🇮🇳')
      expect(getCountryFlag('US')).toBe('🇺🇸')
      expect(getCountryFlag('UK')).toBe('🇬🇧')
      expect(getCountryFlag('GB')).toBe('🇬🇧')
      expect(getCountryFlag('AU')).toBe('🇦🇺')
      expect(getCountryFlag('CA')).toBe('🇨🇦')
    })

    it('returns globe fallback for null or empty code', () => {
      expect(getCountryFlag(null)).toBe('🌐')
      expect(getCountryFlag('')).toBe('🌐')
    })

    it('generates regional indicator symbols for unknown 2-letter codes', () => {
      const flag = getCountryFlag('FR')
      expect(flag).toBe('🇫🇷')
    })
  })

  describe('permission persistence', () => {
    it('correctly tracks location permission requested state', () => {
      expect(hasRequestedLocationPermission()).toBe(false)
      markLocationPermissionRequested()
      expect(hasRequestedLocationPermission()).toBe(true)
    })
  })

  describe('session caching', () => {
    it('saves and retrieves cached detection result', () => {
      const mockResult: GeoDetectionResult = {
        countryCode: 'IN',
        countryName: 'India',
        method: 'ip',
        confidence: 'high',
      }
      setCachedDetection(mockResult)
      const cached = getCachedDetection()
      expect(cached).toEqual(mockResult)
    })
  })

  describe('detectFromBrowserLocale', () => {
    it('extracts country code from BCP47 tag in navigator.language', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'en-IN',
        configurable: true,
      })
      const res = detectFromBrowserLocale()
      expect(res).not.toBeNull()
      expect(res?.countryCode).toBe('IN')
      expect(res?.countryName).toBe('India')
      expect(res?.method).toBe('locale')
    })

    it('handles UK / GB mapping', () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'en-GB',
        configurable: true,
      })
      const res = detectFromBrowserLocale()
      expect(res?.countryCode).toBe('UK')
    })
  })

  describe('detectCountryPipeline', () => {
    const mockCountries: ActiveCountryInfo[] = [
      { id: 'c-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
      { id: 'c-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
      { id: 'c-uk', name: 'United Kingdom', code: 'UK', flagEmoji: '🇬🇧' },
    ]

    it('prioritizes saved country ID if provided', async () => {
      const result = await detectCountryPipeline('c-us', mockCountries)
      expect(result.countryCode).toBe('US')
      expect(result.countryId).toBe('c-us')
      expect(result.method).toBe('profile')
    })

    it('falls back to locale when no saved country and no cached IP', async () => {
      Object.defineProperty(window.navigator, 'language', {
        value: 'en-IN',
        configurable: true,
      })
      const result = await detectCountryPipeline(null, mockCountries)
      expect(result.countryCode).toBe('IN')
    })
  })

  describe('Do Not Track compliance', () => {
    it('detects when DNT is enabled', () => {
      Object.defineProperty(window.navigator, 'doNotTrack', {
        value: '1',
        configurable: true,
      })
      expect(isDoNotTrackEnabled()).toBe(true)
    })
  })
})
