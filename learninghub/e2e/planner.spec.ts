import { test, expect } from '@playwright/test'

test.describe('Study Planner Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
    })
    await context.clearCookies()

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/auth/login'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'usr-1',
                username: 'Scholar',
                role: 'STUDENT',
              },
              tokens: { accessToken: 'mock-token' },
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/auth/me'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'usr-1',
                username: 'Scholar',
                role: 'STUDENT',
              },
            },
          }),
        })
      }
    )

    await page.route(
      url =>
        url.pathname.startsWith('/api/') &&
        (url.pathname.includes('/auth/logout') || url.pathname.includes('/auth/refresh')),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { tokens: { accessToken: 'mock-token' } },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/notifications'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { notifications: [], count: 0 },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/tests/attempts'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [],
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/study-goals'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [],
            count: 0,
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/study-planner/tasks'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [],
            count: 0,
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/recommendations'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              nodes: [],
              edges: [],
              recommendedConceptId: null,
              overallProgressPercentage: 0,
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/analytics'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [],
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/user-analytics'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { summary: {} },
          }),
        })
      }
    )
  })

  test('should display study strategy planner, focus timer controls, and tasks', async ({
    page,
  }) => {
    page.on('response', res => {
      if (res.status() >= 400) {
        console.log('HTTP ERROR:', res.status(), res.url())
      }
    })

    await page.goto('/auth')
    await page.locator('#auth-email').fill('student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

    await page.goto('/study-planner')

    // Verify main header
    await expect(page.getByRole('heading', { name: /Strategy Planner/i })).toBeVisible({
      timeout: 15000,
    })

    // Verify Focus Engine timer
    await expect(page.getByText(/Focus Engine/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/25:00/)).toBeVisible()

    // Verify play/pause timer button
    const playBtn = page.getByRole('button', { name: /Start Focus/i })
    await expect(playBtn).toBeVisible()

    // Start timer
    await playBtn.click()

    // Button transitions to Pause state
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible()
  })
})
