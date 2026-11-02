import { test, expect } from '@playwright/test'

test.describe('Country personalization consent', () => {
  test('first-time visitor can skip location detection and keep using the app', async ({ browser }) => {
    // This test intentionally starts with empty storage to cover the first-visit flow.
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [],
      },
    })

    try {
      await context.addInitScript(() => {
        window.localStorage.setItem('cookieConsent', 'accepted')
      })

      const page = await context.newPage()

      // Keep this test independent of live country/geo services.
      await page.route('**/exam-content/countries*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [{ id: 'country-in', name: 'India', code: 'IN' }],
          }),
        })
      })

      await page.route('**/geo/detect*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              countryCode: 'IN',
              countryName: 'India',
              method: 'locale',
            },
          }),
        })
      })

      await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000')

      const consentDialog = page.getByRole('dialog', { name: 'Personalize Your Exams' })
      await expect(consentDialog).toBeVisible({ timeout: 15000 })

      await page.getByRole('button', { name: /Skip for now/i }).click()

      await expect(consentDialog).toBeHidden()
      await expect
        .poll(() =>
          page.evaluate(() => localStorage.getItem('lh_location_permission_requested'))
        )
        .toBe('true')
    } finally {
      await context.close()
    }
  })
})
