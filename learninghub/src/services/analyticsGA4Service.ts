/**
 * Google Analytics 4 Service
 * Production-ready analytics with privacy compliance
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? ''

const isAnalyticsEnabled = () => {
  if (import.meta.env.DEV) return false
  if (!GA_MEASUREMENT_ID) return false
  const consent = localStorage.getItem('cookieConsent')
  if (consent !== 'accepted') return false
  return true
}

type GtagArg = string | number | Date | Record<string, unknown> | undefined

declare global {
  interface Window {
    gtag?: (...args: GtagArg[]) => void
    dataLayer?: Record<string, unknown>[]
  }
}

export function initializeGA4(): void {
  if (!isAnalyticsEnabled() || window.gtag) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function (...args: GtagArg[]) {
    window.dataLayer?.push(args as unknown as Record<string, unknown>)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: false, // We'll handle page views manually
  })
}

export function trackPageView(path: string, title?: string): void {
  if (!isAnalyticsEnabled() || !window.gtag) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.origin + path,
  })
}

export function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[Analytics]', eventName, parameters)
    }
    return
  }

  if (!window.gtag) return
  window.gtag('event', eventName, parameters)
}

export function setUserProperties(properties: Record<string, unknown>): void {
  if (!isAnalyticsEnabled() || !window.gtag) return
  window.gtag('set', 'user_properties', properties)
}

export const analyticsGA4Service = {
  initialize: initializeGA4,
  trackPageView,
  trackEvent,
  setUserProperties,
  isEnabled: isAnalyticsEnabled,
}
