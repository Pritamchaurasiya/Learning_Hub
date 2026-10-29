import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  detectCountryPipeline,
  requestBrowserGeolocation,
  markLocationPermissionRequested,
  hasRequestedLocationPermission,
  getCountryFlag,
  type DetectionMethod,
} from '../services/geolocationService'
import { useLearningContextStore } from '../stores/useLearningContextStore'
import { fetchApi } from '../utils/api'
import { queryKeys } from '../utils/queryKeys'
import type { ActiveCountryInfo } from '../types/learningContext'

export interface CountryContextValue {
  activeCountry: ActiveCountryInfo | null
  countryCode: string | null
  countryId: string | null
  countryName: string | null
  flagEmoji: string
  detectionMethod: DetectionMethod
  availableCountries: ActiveCountryInfo[]
  isLoading: boolean
  isPermissionModalOpen: boolean
  isCountrySelectorOpen: boolean
  isFeatureEnabled: boolean
  setCountry: (country: ActiveCountryInfo | string, method?: DetectionMethod) => Promise<void>
  requestGeolocationPermission: () => Promise<void>
  denyGeolocationPermission: () => void
  openPermissionModal: () => void
  closePermissionModal: () => void
  openCountrySelector: () => void
  closeCountrySelector: () => void
  refreshCountries: () => Promise<ActiveCountryInfo[]>
}

export const CountryContext = createContext<CountryContextValue | null>(null)

interface CountryProviderProps {
  children: ReactNode
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  const queryClient = useQueryClient()
  const storeCountryId = useLearningContextStore(s => s.countryId)
  const storeActiveCountry = useLearningContextStore(s => s.activeCountry)
  const setStoreContext = useLearningContextStore(s => s.setContext)

  const [availableCountries, setAvailableCountries] = useState<ActiveCountryInfo[]>([])
  const [activeCountry, setActiveCountryState] = useState<ActiveCountryInfo | null>(storeActiveCountry)
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('fallback')
  const [isLoading, setIsLoading] = useState(true)
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [isCountrySelectorOpen, setIsCountrySelectorOpen] = useState(false)

  // Feature flag check (controllable via env or defaults to true)
  const isFeatureEnabled =
    import.meta.env.VITE_FEATURE_COUNTRY_FILTER !== 'false' &&
    import.meta.env.VITE_FEATURE_COUNTRY_FILTER !== '0'

  // Load available countries from API
  const loadCountries = useCallback(async (): Promise<ActiveCountryInfo[]> => {
    try {
      const res = await fetchApi('/exam-content/countries')
      const rawList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : []

      const formatted: ActiveCountryInfo[] = rawList.map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name),
        code: String(c.code).toUpperCase(),
        flagEmoji: getCountryFlag(String(c.code)),
      }))

      if (formatted.length > 0) {
        setAvailableCountries(formatted)
        return formatted
      }
    } catch {
      // Fallback countries list if network or server is offline
    }

    const defaultCountries: ActiveCountryInfo[] = [
      { id: 'c-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
      { id: 'c-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
      { id: 'c-uk', name: 'United Kingdom', code: 'UK', flagEmoji: '🇬🇧' },
      { id: 'c-au', name: 'Australia', code: 'AU', flagEmoji: '🇦🇺' },
      { id: 'c-ca', name: 'Canada', code: 'CA', flagEmoji: '🇨🇦' },
    ]
    setAvailableCountries(defaultCountries)
    return defaultCountries
  }, [])

  // Commit selected country and invalidate exam queries
  const setCountry = useCallback(
    async (target: ActiveCountryInfo | string, method: DetectionMethod = 'manual') => {
      let matchedCountry: ActiveCountryInfo | null = null

      if (typeof target === 'string') {
        const needle = target.trim().toUpperCase()
        matchedCountry =
          availableCountries.find(
            c => c.id === target || c.code.toUpperCase() === needle
          ) || null
        if (!matchedCountry) {
          matchedCountry = {
            id: target,
            name: target,
            code: needle.length === 2 ? needle : 'GLOBAL',
            flagEmoji: getCountryFlag(needle),
          }
        }
      } else {
        matchedCountry = target
      }

      setActiveCountryState(matchedCountry)
      setDetectionMethod(method)

      // Sync with LearningContextStore
      await setStoreContext(
        {
          countryId: matchedCountry ? matchedCountry.id : null,
          activeCountry: matchedCountry,
        },
        true // Persist to server if authenticated
      )

      // Invalidate React Query exam cache keys to guarantee strict country cache isolation
      void queryClient.invalidateQueries({
        queryKey: ['learninghub', 'exams'],
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.exams(matchedCountry?.id),
      })

      // Dispatch global events for analytics and listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lh:country-changed', {
            detail: {
              country: matchedCountry,
              countryCode: matchedCountry?.code,
              method,
            },
          })
        )
      }
    },
    [availableCountries, queryClient, setStoreContext]
  )

  // Initialize Country Detection on component mount
  useEffect(() => {
    let isCancelled = false

    const initialize = async () => {
      setIsLoading(true)
      const countries = await loadCountries()
      if (isCancelled) return

      // Step 1: Check existing store / profile preference
      if (storeCountryId || storeActiveCountry) {
        const found =
          countries.find(c => c.id === storeCountryId || c.code === storeActiveCountry?.code) ||
          storeActiveCountry
        if (found) {
          setActiveCountryState(found)
          setDetectionMethod('profile')
          setIsLoading(false)
          return
        }
      }

      // Step 2: If no country chosen and haven't prompted yet, show consent modal
      const hasPrompted = hasRequestedLocationPermission()
      if (!hasPrompted && isFeatureEnabled) {
        setIsPermissionModalOpen(true)
      }

      // Step 3: Run multi-signal detection pipeline (IP -> Locale -> Fallback)
      try {
        const result = await detectCountryPipeline(null, countries)
        if (isCancelled) return

        if (result.countryCode) {
          const matched =
            countries.find(c => c.code.toUpperCase() === result.countryCode?.toUpperCase()) ||
            countries.find(c => c.id === result.countryId) ||
            null

          if (matched) {
            setActiveCountryState(matched)
            setDetectionMethod(result.method)
            void setStoreContext({
              countryId: matched.id,
              activeCountry: matched,
            }, false)
          }
        }
      } catch (err) {
        console.warn('[CountryContext] Country detection fallback initiated:', err)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      isCancelled = true
    }
  }, [loadCountries, storeCountryId, storeActiveCountry, isFeatureEnabled, setStoreContext])

  // Browser Geolocation permission accepted
  const requestGeolocationPermission = useCallback(async () => {
    try {
      setIsLoading(true)
      setIsPermissionModalOpen(false)
      const result = await requestBrowserGeolocation()

      const matched =
        availableCountries.find(c => c.code.toUpperCase() === result.countryCode?.toUpperCase()) ||
        availableCountries[0]

      if (matched) {
        await setCountry(matched, 'geolocation')
      }
    } catch {
      // User declined or timeout: fall back gracefully to IP or locale without popup
      denyGeolocationPermission()
    } finally {
      setIsLoading(false)
    }
  }, [availableCountries, setCountry])

  // User dismissed or denied permission prompt
  const denyGeolocationPermission = useCallback(() => {
    markLocationPermissionRequested()
    setIsPermissionModalOpen(false)

    // Dispatch analytics event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lh:location-denied', {
          detail: { timestamp: new Date().toISOString() },
        })
      )
    }

    // Fall back to IP/locale detection smoothly
    void (async () => {
      const result = await detectCountryPipeline(null, availableCountries)
      const matched =
        availableCountries.find(c => c.code.toUpperCase() === result.countryCode?.toUpperCase()) ||
        availableCountries.find(c => c.code === 'IN') ||
        availableCountries[0]
      if (matched && !activeCountry) {
        await setCountry(matched, result.method)
      }
    })()
  }, [availableCountries, activeCountry, setCountry])

  const openPermissionModal = useCallback(() => setIsPermissionModalOpen(true), [])
  const closePermissionModal = useCallback(() => {
    markLocationPermissionRequested()
    setIsPermissionModalOpen(false)
  }, [])

  const openCountrySelector = useCallback(() => setIsCountrySelectorOpen(true), [])
  const closeCountrySelector = useCallback(() => setIsCountrySelectorOpen(false), [])

  const flagEmoji = useMemo(
    () => activeCountry?.flagEmoji || getCountryFlag(activeCountry?.code),
    [activeCountry]
  )

  const value = useMemo<CountryContextValue>(
    () => ({
      activeCountry,
      countryCode: activeCountry?.code ?? null,
      countryId: activeCountry?.id ?? null,
      countryName: activeCountry?.name ?? null,
      flagEmoji,
      detectionMethod,
      availableCountries,
      isLoading,
      isPermissionModalOpen,
      isCountrySelectorOpen,
      isFeatureEnabled,
      setCountry,
      requestGeolocationPermission,
      denyGeolocationPermission,
      openPermissionModal,
      closePermissionModal,
      openCountrySelector,
      closeCountrySelector,
      refreshCountries: loadCountries,
    }),
    [
      activeCountry,
      flagEmoji,
      detectionMethod,
      availableCountries,
      isLoading,
      isPermissionModalOpen,
      isCountrySelectorOpen,
      isFeatureEnabled,
      setCountry,
      requestGeolocationPermission,
      denyGeolocationPermission,
      openPermissionModal,
      closePermissionModal,
      openCountrySelector,
      closeCountrySelector,
      loadCountries,
    ]
  )

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
}
