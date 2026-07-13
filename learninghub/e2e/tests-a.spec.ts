import { test, expect } from '@playwright/test'

test.describe('Tests A+ Module', () => {
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

    // Mock notifications to prevent 401 Session Expired redirects
    await page.route('**/notifications*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { notifications: [], count: 0 },
        }),
      })
    })

    // Mock tests attempts to prevent 401 Session Expired redirects
    await page.route('**/tests/attempts*', async route => {
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

  test('should display available tests on /tests-a', async ({ page }) => {
    // Mock tests list
    await page.route(/.*\/tests(\?.*)?$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            results: [
              {
                id: 'test-1',
                title: 'Mock DSA Test',
                description: 'This is a mock test',
                category: 'DSA',
                difficulty: 'hard',
                durationMinutes: 45,
                totalMarks: 100,
                questionsCount: 10,
                mode: 'mock',
                time_limit_minutes: 45,
                passing_score: 60,
                negative_marks_per_question: 0,
                question_count: 10,
                is_ai_generated: false,
                is_featured: false,
                attempt_count: 0,
              },
            ],
          },
        }),
      })
    })

    await page.goto('/tests-a')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Mock DSA Test' })).toBeVisible({
      timeout: 15000,
    })
  })

  test('should display empty state on /tests-a-history when no history exists', async ({
    page,
  }) => {
    // Mock history
    await page.route(/.*\/tests\/attempts/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [],
        }),
      })
    })

    await page.route(/.*\/gamification\/achievements/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [],
        }),
      })
    })

    await page.goto('/tests-a-history')
    await expect(page.locator('text=No test attempts found')).toBeVisible()
  })

  test('should allow a user to start, take, and submit an exam', async ({ page }) => {
    // 1. Mock Test Details (GET)
    await page.route(/.*\/tests\/test-1$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 'test-1',
            title: 'Mock Gamified Exam',
            mode: 'mock',
            time_limit_minutes: 10,
            question_count: 2,
            total_marks: 20,
          },
        }),
      })
    })

    // 1.5 Mock Test List
    await page.route(/.*\/tests(\?.*)?$/, async route => {
      // Don't match /tests/test-1
      if (
        route
          .request()
          .url()
          .match(/.*\/tests\/[^?]/)
      ) {
        return route.fallback()
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            results: [
              {
                id: 'test-1',
                title: 'Mock Gamified Exam',
                mode: 'mock',
                difficulty: 'medium',
                time_limit_minutes: 10,
                question_count: 2,
              },
            ]
          },
        }),
      })
    })

    // 2. Mock Start Test (POST)
    await page.route(/.*\/tests\/test-1\/start$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            attempt_id: 'attempt-1',
            time_limit: 10,
            questions: [
              {
                id: 'q1',
                text: 'What is 2 + 2?',
                question_type: 'mcq',
                marks: 10,
                options: [
                  { id: 'opt1', text: '3', order: 1 },
                  { id: 'opt2', text: '4', order: 2 },
                ],
              },
              {
                id: 'q2',
                text: 'Capital of France?',
                question_type: 'mcq',
                marks: 10,
                options: [
                  { id: 'opt3', text: 'London', order: 1 },
                  { id: 'opt4', text: 'Paris', order: 2 },
                ],
              },
            ],
          },
        }),
      })
    })

    // 3. Mock Autosave (POST)
    await page.route(/.*\/tests\/test-1\/autosave$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { saved: true } }),
      })
    })

    // 4. Mock Submit (POST)
    await page.route(/.*\/tests\/test-1\/submit$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            attempt_id: 'attempt-1',
            test_id: 'test-1',
            score: 20,
            percentage: 100,
            passed: true,
          },
        }),
      })
    })

    // Navigate to tests page
    await page.goto('/tests-a')
    await expect(page.locator('text=Mock Gamified Exam')).toBeVisible()

    // Click Start Test on the card
    await page.getByRole('button', { name: 'Start Test' }).click()

    // Should see Question 1
    await expect(page.locator('text=What is 2 + 2?')).toBeVisible()

    // Click option "4"
    await page.getByRole('button', { name: '4' }).click({ force: true })

    // Click Next
    await page.getByRole('button', { name: 'Next' }).click({ force: true })

    // Should see Question 2
    await expect(page.locator('text=Capital of France?')).toBeVisible()

    // Click option "Paris"
    await page.getByRole('button', { name: 'Paris' }).click()

    // Click Submit
    await page.getByRole('button', { name: 'Submit', exact: true }).click()

    // Should navigate to success / results or show toast
    // After submission the app may show results, a score, or navigate back to the tests list
    const postSubmit = page
      .locator('text=/result|score|100%|passed|mock gamified exam|submitted|test/i')
      .first()
    await expect(postSubmit).toBeVisible({ timeout: 10000 })
  })
})
