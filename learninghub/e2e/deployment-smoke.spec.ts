import { expect, test } from '@playwright/test'

const djangoApiUrl = process.env.DJANGO_API_URL || 'http://localhost:8000'

test.describe('LearningHub deployment smoke', () => {
  test('Django readiness endpoint is healthy', async ({ request }) => {
    const response = await request.get(`${djangoApiUrl}/api/v1/health/ready`)

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.data?.ready).toBe(true)
    expect(body.data?.checks?.database).toBe(true)
  })

  test('Cloudflare-ready frontend shell renders', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('#root')).toBeVisible()
    await expect(page).toHaveTitle(/LearningHub/i)
  })

  test('same-origin API proxy forwards the Django readiness route', async ({ page }) => {
    const response = await page.request.get('/api/v1/health/ready')

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.data?.ready).toBe(true)
    expect(body.data?.checks?.database).toBe(true)
  })
})
