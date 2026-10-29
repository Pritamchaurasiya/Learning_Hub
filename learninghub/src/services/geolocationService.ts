/**
 * Geolocation & Country Detection Service
 *
 * Implements multi-signal country detection with privacy-first principles:
 * Signal 1: Authenticated User Profile / Saved Preference
 * Signal 2: Browser Geolocation API (navigator.geolocation - HTTPS & consented only)
 * Signal 3: IP Geolocation (CF-IPCountry header / backend /geo/detect / fallback)
 * Signal 4: Browser Locale Fallback (navigator.language BCP47 tag e.g. en-IN -> IN)
 * Signal 5: Explicit Fallback (generic list or manual country selector)
 *
 * Privacy: Exact coordinates are NEVER stored, logged, or sent to the backend.
 * Only ISO 3166-1 alpha-2 country codes are retained.
 */

import { fetchApi } from '../utils/api'
import type { ActiveCountryInfo } from '../types/learningContext'

export type DetectionMethod =
  | 'profile'
  | 'geolocation'
  | 'ip'
  | 'locale'
  | 'manual'
  | 'fallback'

export interface GeoDetectionResult {
  countryCode: string | null
  countryName: string | null
  countryId?: string | null
  method: DetectionMethod
  confidence: 'high' | 'medium' | 'low'
  isConsented?: boolean
}

export const COUNTRY_FLAG_MAP: Record<string, { name: string; flag: string }> = {
  IN: { name: 'India', flag: '🇮🇳' },
  US: { name: 'United States', flag: '🇺🇸' },
  UK: { name: 'United Kingdom', flag: '🇬🇧' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪' },
}

const STORAGE_KEY_PERMISSION_REQUESTED = 'lh_location_permission_requested'
const STORAGE_KEY_DETECTED_COUNTRY = 'lh_detected_country'
const STORAGE_KEY_CACHE_TIMESTAMP = 'lh_geo_cache_timestamp'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Returns emoji flag for an ISO2 country code.
 */
export function getCountryFlag(code?: string | null): string {
  if (!code) return '🌐'
  const upper = code.trim().toUpperCase()
  if (COUNTRY_FLAG_MAP[upper]) {
    return COUNTRY_FLAG_MAP[upper].flag
  }
  // Generic Unicode flag generation from 2-letter ISO code
  if (upper.length === 2) {
    const codePoints = [...upper].map(c => 127397 + c.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }
  return '🌐'
}

/**
 * Check if the browser or user has requested "Do Not Track".
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { doNotTrack?: string; msDoNotTrack?: string }
  return (
    nav.doNotTrack === '1' ||
    nav.doNotTrack === 'yes' ||
    nav.msDoNotTrack === '1' ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === '1'
  )
}

/**
 * Check if location permission has already been prompted previously.
 */
export function hasRequestedLocationPermission(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_PERMISSION_REQUESTED) === 'true'
}

/**
 * Mark that location permission modal has been answered/dismissed.
 */
export function markLocationPermissionRequested(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PERMISSION_REQUESTED, 'true')
  }
}

/**
 * Retrieve cached geolocation result from sessionStorage/localStorage.
 */
export function getCachedDetection(): GeoDetectionResult | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_DETECTED_COUNTRY)
    const timestamp = sessionStorage.getItem(STORAGE_KEY_CACHE_TIMESTAMP)
    if (!raw || !timestamp) return null

    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY_DETECTED_COUNTRY)
      sessionStorage.removeItem(STORAGE_KEY_CACHE_TIMESTAMP)
      return null
    }

    return JSON.parse(raw) as GeoDetectionResult
  } catch {
    return null
  }
}

/**
 * Store geolocation result in session cache.
 */
export function setCachedDetection(result: GeoDetectionResult): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY_DETECTED_COUNTRY, JSON.stringify(result))
    sessionStorage.setItem(STORAGE_KEY_CACHE_TIMESTAMP, Date.now().toString())
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Signal 4: Extract country from browser locale (navigator.language).
 * Handles BCP47 tags like "en-IN", "en-US", "en-GB", "es-419", etc.
 */
export function detectFromBrowserLocale(): GeoDetectionResult | null {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return null
  }

  const locales = [navigator.language, ...(navigator.languages || [])]
  for (const locale of locales) {
    if (!locale) continue
    // Handle tags like en-US, en-IN, pt-BR, zh-CN
    const parts = locale.split(/[-_]/)
    if (parts.length >= 2) {
      let code = parts[1].toUpperCase()
      if (code === 'GB') code = 'UK'
      if (code.length === 2 && COUNTRY_FLAG_MAP[code]) {
        return {
          countryCode: code,
          countryName: COUNTRY_FLAG_MAP[code].name,
          method: 'locale',
          confidence: 'medium',
        }
      }
    }
  }

  return null
}

/**
 * Signal 3: Detect country via IP Geolocation (CF-IPCountry / backend detect).
 */
export async function detectFromIpGeolocation(): Promise<GeoDetectionResult | null> {
  // If Do Not Track is on, do not invoke third-party or remote IP lookup
  if (isDoNotTrackEnabled()) {
    return detectFromBrowserLocale()
  }

  const cached = getCachedDetection()
  if (cached && cached.countryCode) {
    return cached
  }

  try {
    // Try backend geo endpoint (which reads CF-IPCountry header or IP)
    const res = await fetchApi('/geo/detect')
    const payload = res?.data || res
    const code = (payload?.countryCode || payload?.code || '').toUpperCase()
    const name = payload?.countryName || payload?.name || COUNTRY_FLAG_MAP[code]?.name || code

    if (code && code.length === 2 && code !== 'XX') {
      const normalizedCode = code === 'GB' ? 'UK' : code
      const result: GeoDetectionResult = {
        countryCode: normalizedCode,
        countryName: name,
        countryId: payload?.countryId,
        method: (payload?.method as DetectionMethod) || 'ip',
        confidence: 'high',
      }
      setCachedDetection(result)
      return result
    }
  } catch {
    // Backend geo endpoint unavailable, proceed to locale fallback
  }

  return null
}

/**
 * Signal 2: Detect country via Browser Geolocation API.
 * Prompts user for permission and reverse geocodes lat/lng.
 * Privacy: Exact coordinates are used ephemerally and discarded immediately.
 */
export async function requestBrowserGeolocation(): Promise<GeoDetectionResult> {
  markLocationPermissionRequested()

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords

          // Privacy: Truncate coordinates to 1 decimal place (~11km fuzzing) before reverse lookup
          const fuzzyLat = Math.round(latitude * 10) / 10
          const fuzzyLng = Math.round(longitude * 10) / 10

          // Approximate bounds check for common countries to avoid external calls if possible
          // India: ~ 8N-37N, 68E-97E
          if (fuzzyLat >= 8 && fuzzyLat <= 37 && fuzzyLng >= 68 && fuzzyLng <= 97) {
            const result: GeoDetectionResult = {
              countryCode: 'IN',
              countryName: 'India',
              method: 'geolocation',
              confidence: 'high',
              isConsented: true,
            }
            setCachedDetection(result)
            resolve(result)
            return
          }
          // USA: ~ 24N-50N, 66W-125W
          if (fuzzyLat >= 24 && fuzzyLat <= 50 && fuzzyLng >= -125 && fuzzyLng <= -66) {
            const result: GeoDetectionResult = {
              countryCode: 'US',
              countryName: 'United States',
              method: 'geolocation',
              confidence: 'high',
              isConsented: true,
            }
            setCachedDetection(result)
            resolve(result)
            return
          }
          // UK: ~ 49N-61N, 8W-2E
          if (fuzzyLat >= 49 && fuzzyLat <= 61 && fuzzyLng >= -8 && fuzzyLng <= 2) {
            const result: GeoDetectionResult = {
              countryCode: 'UK',
              countryName: 'United Kingdom',
              method: 'geolocation',
              confidence: 'high',
              isConsented: true,
            }
            setCachedDetection(result)
            resolve(result)
            return
          }
          // Australia: ~ 10S-44S, 112E-154E
          if (fuzzyLat >= -44 && fuzzyLat <= -10 && fuzzyLng >= 112 && fuzzyLng <= 154) {
            const result: GeoDetectionResult = {
              countryCode: 'AU',
              countryName: 'Australia',
              method: 'geolocation',
              confidence: 'high',
              isConsented: true,
            }
            setCachedDetection(result)
            resolve(result)
            return
          }
          // Canada: ~ 42N-83N, 52W-141W
          if (fuzzyLat >= 42 && fuzzyLat <= 83 && fuzzyLng >= -141 && fuzzyLng <= -52) {
            const result: GeoDetectionResult = {
              countryCode: 'CA',
              countryName: 'Canada',
              method: 'geolocation',
              confidence: 'high',
              isConsented: true,
            }
            setCachedDetection(result)
            resolve(result)
            return
          }

          // Fallback to IP geolocation if outside coarse bounding boxes
          const ipResult = await detectFromIpGeolocation()
          if (ipResult) {
            resolve({ ...ipResult, method: 'geolocation', isConsented: true })
            return
          }

          const localeResult = detectFromBrowserLocale()
          resolve(
            localeResult || {
              countryCode: 'IN',
              countryName: 'India',
              method: 'fallback',
              confidence: 'low',
              isConsented: true,
            }
          )
        } catch (err) {
          reject(err)
        }
      },
      error => {
        // MDN error codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        reject(error)
      },
      {
        timeout: 10000,
        maximumAge: 600000, // 10 min cache
        enableHighAccuracy: false, // Low power, coarse location is sufficient for country
      }
    )
  })
}

/**
 * Multi-Signal Orchestrator:
 * Executes country detection pipeline honoring privacy, fallbacks, and user consent.
 */
export async function detectCountryPipeline(
  savedCountryIdOrCode?: string | null,
  availableCountries?: ActiveCountryInfo[]
): Promise<GeoDetectionResult> {
  // Signal 1: Saved User Preference / Profile
  if (savedCountryIdOrCode) {
    const match = availableCountries?.find(
      c =>
        c.id === savedCountryIdOrCode ||
        c.code.toUpperCase() === savedCountryIdOrCode.toUpperCase()
    )
    if (match) {
      return {
        countryCode: match.code,
        countryName: match.name,
        countryId: match.id,
        method: 'profile',
        confidence: 'high',
      }
    }
  }

  // Signal 2: Check Session Cache
  const cached = getCachedDetection()
  if (cached && cached.countryCode) {
    const match = availableCountries?.find(
      c => c.code.toUpperCase() === cached.countryCode?.toUpperCase()
    )
    if (match) {
      return { ...cached, countryId: match.id }
    }
    return cached
  }

  // Signal 3: IP Geolocation (CF-IPCountry / backend detect)
  try {
    const ipResult = await detectFromIpGeolocation()
    if (ipResult && ipResult.countryCode) {
      const match = availableCountries?.find(
        c => c.code.toUpperCase() === ipResult.countryCode?.toUpperCase()
      )
      return {
        ...ipResult,
        countryId: match?.id ?? ipResult.countryId,
      }
    }
  } catch {
    // Continue pipeline
  }

  // Signal 4: Browser Locale Fallback
  const localeResult = detectFromBrowserLocale()
  if (localeResult && localeResult.countryCode) {
    const match = availableCountries?.find(
      c => c.code.toUpperCase() === localeResult.countryCode?.toUpperCase()
    )
    return {
      ...localeResult,
      countryId: match?.id,
    }
  }

  // Signal 5: Explicit Fallback (Default to India or first available country)
  const defaultCountry =
    availableCountries?.find(c => c.code === 'IN') ||
    availableCountries?.[0] ||
    null

  return {
    countryCode: defaultCountry?.code ?? 'IN',
    countryName: defaultCountry?.name ?? 'India',
    countryId: defaultCountry?.id ?? null,
    method: 'fallback',
    confidence: 'low',
  }
}
