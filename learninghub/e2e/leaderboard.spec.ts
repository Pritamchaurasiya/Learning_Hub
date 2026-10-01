import { test, expect } from '@playwright/test'

test.describe('Leaderboard Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              user: {
                id: 'usr-2',
                username: 'Alan Turing',
                role: 'STUDENT',
              },
            },
          },
          version: 0,
        })
      )
    })

    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'usr-2',
              username: 'Alan Turing',
              role: 'STUDENT',
            },
          },
        }),
      })
    })

    await page.route('**/notifications*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [],
        }),
      })
    })

    await page.route('**/gamification/leaderboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [
            {
              id: 'usr-1',
              username: 'Ada Lovelace',
              xp: 3200,
              level: 14,
              streak: 20,
            },
            {
              id: 'usr-2',
              username: 'Alan Turing',
              xp: 2800,
              level: 12,
              streak: 15,
            },
            {
              id: 'usr-3',
              username: 'Grace Hopper',
              xp: 2500,
              level: 10,
              streak: 10,
            },
          ],
        }),
      })
    })
  })

  test('should display leaderboard title, podium items, and switch timeframe tabs', async ({
    page,
  }) => {
    await page.goto('/leaderboard')

    // Verify header
    await expect(page.getByText('Global Ranks')).toBeVisible({ timeout: 15000 })

    // Verify top learners
    await expect(page.getByText('Ada Lovelace').first()).toBeVisible()
    await expect(page.getByText('Alan Turing').first()).toBeVisible()
    await expect(page.getByText('Grace Hopper').first()).toBeVisible()

    // Switch to Weekly tab
    const weeklyTab = page.getByRole('button', { name: 'Weekly' })
    await weeklyTab.click()
    await expect(weeklyTab).toBeVisible()
  })
})
