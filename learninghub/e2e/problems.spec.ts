import { test, expect } from '@playwright/test'

test.describe('DSA Practice Module', () => {
  test.beforeEach(async ({ context, page }) => {
    // Set localStorage tokens before any page navigation to avoid auth redirect race conditions
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem('learninghub-storage', JSON.stringify({
        state: {
          auth: {
            isAuthenticated: true,
            user: { id: "user-1", username: "TestUser", role: "STUDENT" }
          }
        },
        version: 0
      }))
    })

    // Mock user authentication
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'user-1',
              username: 'TestUser',
              role: 'STUDENT',
              streak: 5,
              xp: 100,
              level: 2,
            },
          },
        }),
      })
    })

    // Mock notifications to prevent 401 redirects from useNotificationConnection
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
  })

  test('should display DSA stats and problems on /problems', async ({ page }) => {
    // Mock DSA Stats
    await page.route('**/gamification/dsa-stats*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            total_problems: 100,
            solved_problems: 42,
            attempted_problems: 50,
            submissions_count: 200,
            acceptance_rate: 65.5,
            current_streak: 7,
            longest_streak: 14,
            rank: 1337,
            easy_solved: 20,
            medium_solved: 15,
            hard_solved: 7,
            total_easy: 30,
            total_medium: 40,
            total_hard: 30,
          },
        }),
      })
    })

    // Mock Problems
    await page.route('**/problems*', async (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            results: [
              {
                id: 'prob-1',
                title: 'Two Sum',
                slug: 'two-sum',
                description: 'Given an array of integers...',
                difficulty: 'EASY',
                points: 10,
                tags: [{ id: 't1', name: 'Arrays', slug: 'arrays' }],
                acceptance_rate: 85.5,
                user_status: 'SOLVED',
              },
              {
                id: 'prob-2',
                title: 'Reverse Linked List',
                slug: 'reverse-linked-list',
                description: 'Reverse a singly linked list...',
                difficulty: 'MEDIUM',
                points: 30,
                tags: [{ id: 't2', name: 'LinkedList', slug: 'linked-list' }],
                acceptance_rate: 60.2,
                user_status: 'UNATTEMPTED',
              },
            ],
            total: 2,
            page: 1,
            pages: 1,
          },
        }),
      })
    })

    await page.goto('/problems')

    // Verify Stats
    await expect(page.getByText('42', { exact: true }).first()).toBeVisible({ timeout: 10000 }) // Solved
    await expect(page.getByText('66%', { exact: true }).first()).toBeVisible({ timeout: 10000 }) // Accuracy (rounded 65.5 to 66)
    await expect(page.getByText('7 Days', { exact: true }).first()).toBeVisible({ timeout: 10000 }) // Streak
    await expect(page.getByText('#1337', { exact: true }).first()).toBeVisible({ timeout: 10000 }) // Rank

    // Verify Problems Grid
    await expect(page.locator('text=Two Sum').first()).toBeVisible()
    await expect(page.locator('text=Reverse Linked List').first()).toBeVisible()
  })

  test('should display empty state when filtering yields no results', async ({ page }) => {
    // Mock empty problems
    await page.route('**/problems*', async (route, request) => {
      if (request.resourceType() === 'document') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            results: [],
            total: 0,
            page: 1,
            pages: 1,
          },
        }),
      })
    })

    await page.route('**/gamification/dsa-stats*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: null }),
      })
    })

    await page.goto('/problems')

    // Wait for the empty state to appear
    await expect(page.getByRole('heading', { name: 'No Problems Found' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/Try adjusting your filters/i).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
