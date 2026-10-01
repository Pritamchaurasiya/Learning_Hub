import { test, expect } from '@playwright/test'

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
    })
    await context.clearCookies()

    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'usr-1',
              username: 'Ada Lovelace',
              role: 'STUDENT',
              streak: 7,
              xp: 1500,
              level: 5,
            },
          },
        }),
      })
    })

    await page.route(
      url => url.pathname.includes('/notifications'),
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
      url => url.pathname.includes('/tests/attempts'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              results: [
                {
                  id: 'att-1',
                  status: 'COMPLETED',
                  score: 92,
                  passed: true,
                  completedAt: new Date().toISOString(),
                  test: { title: 'Algorithms & Data Structures Assessment' },
                },
              ],
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.includes('/user-analytics'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              summary: {
                totalTestsCompleted: 14,
                totalQuestionsAnswered: 248,
                overallAccuracy: 84.5,
                averageScore: 82.0,
                passRate: 88.0,
                totalStudyTimeMinutes: 340,
                currentStreak: 7,
                longestStreak: 12,
              },
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.includes('/analytics/'),
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
      url => url.pathname.includes('/auth/login'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'usr-1',
                username: 'Ada Lovelace',
                role: 'STUDENT',
                streak: 7,
                xp: 1500,
                level: 5,
              },
              tokens: { accessToken: 'mock-token' },
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.includes('/auth/logout') || url.pathname.includes('/auth/refresh'),
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
  })

  test('should display dashboard welcome, stats counters, and open AI test generator modal', async ({
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

    // Verify welcome greeting
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({
      timeout: 15000,
    })

    // Verify stats tiles (with timeout to allow skeleton to transition to loaded stats)
    await expect(page.getByText(/Assessments Taken/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Overall Accuracy Rate/i).first()).toBeVisible({ timeout: 15000 })

    // Verify AI Generator trigger button
    const generateBtn = page.getByRole('button', { name: /Generate.*AI/i })
    await expect(generateBtn).toBeVisible()

    // Trigger AI Modal
    await generateBtn.click()

    // Verify modal overlay appears
    await expect(page.getByText('AI Dynamic Test Generation')).toBeVisible()
  })
})
