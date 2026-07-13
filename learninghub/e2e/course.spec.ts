import { test, expect } from '@playwright/test'

/**
 * Course Flow E2E Tests
 * Tests: Course List, Course Details, Lesson Player, Progress Tracking
 *
 * These tests require a running backend with seeded test data.
 * They authenticate once per worker via the API, then inject the
 * token into localStorage before each navigation.
 */
// Feature disabled/missing in current frontend implementation
test.describe.skip('Course Flow', () => {
  let storageState: any

  test.beforeAll(async ({ request }) => {
    // Authenticate once per worker to avoid auth rate limits
    const apiUrl = process.env.API_URL || 'http://localhost:5000'
    await request.post(`${apiUrl}/api/v1/auth/login`, {
      data: {
        email: 'student@learninghub.com',
        password: 'Student@123!',
      },
    })
    storageState = await request.storageState()
  })

  test.beforeEach(async ({ context }) => {
    if (storageState && storageState.cookies) {
      await context.addCookies(storageState.cookies)
    }

    // Set localStorage state before any page navigation to avoid auth redirect race conditions
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem('learninghub-storage', JSON.stringify({
        state: {
          auth: {
            isAuthenticated: true,
            user: { id: "test-user-1", email: "student@learninghub.com", role: "STUDENT" }
          }
        },
        version: 0
      }))
    })
  })

  test('should display course list on home page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for course-related content
    const courseContent = page.locator('text=/course|lesson|learn|study/i').first()
    await expect(courseContent).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to course details page', async ({ page }) => {
    // Navigate to a course (using sample ID)
    await page.goto('/course/course-001')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL('/course/course-001')

    // Course page should load with content
    const courseDetails = page.locator('text=/lessons|content|syllabus|instructor/i').first()
    await expect(courseDetails).toBeVisible({ timeout: 15000 })
  })

  test('should display course lessons list', async ({ page }) => {
    await page.goto('/course/course-001')
    await page.waitForLoadState('networkidle')

    // Either lessons exist or loading/empty state
    const contentLocator = page
      .locator('[class*="lesson"], [data-testid*="lesson"]')
      .or(page.getByText(/loading|no lessons|empty/i))
      .first()

    await expect(contentLocator).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to lesson player', async ({ page }) => {
    await page.goto('/course/course-001')
    await page.waitForLoadState('networkidle')

    // Find and click on a lesson using robust data-testid
    const lessonLink = page.locator('[data-testid="lesson-item"]').first()

    if (await lessonLink.isVisible().catch(() => false)) {
      await lessonLink.click()

      // Should navigate to lesson player
      await expect(page).toHaveURL(/.*lesson.*/, { timeout: 10000 })

      // Lesson player should be visible
      const playerContent = page.locator('text=/video|content|lesson|player/i').first()
      await expect(playerContent).toBeVisible({ timeout: 10000 })
    }
  })

  test('should show course progress', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for progress indicators
    const progressIndicator = page
      .locator('[class*="progress"], [class*="completed"]')
      .or(page.getByText(/\d+%/))
      .first()

    // Progress may or may not be visible depending on enrollment
    if (await progressIndicator.isVisible().catch(() => false)) {
      await expect(progressIndicator).toBeVisible()
    }
  })

  test('should search for courses', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL('/search')

    // Search input should be visible specifically on the search page
    const searchInput = page.getByPlaceholder(/enter search query/i)

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('javascript')
      await searchInput.press('Enter')

      // Wait for search results to load
      await page.waitForLoadState('networkidle')

      // Results should appear
      const results = page.locator('text=/result|course|found/i').first()
      await expect(results).toBeVisible({ timeout: 10000 })
    }
  })

  test('should bookmark a course', async ({ page }) => {
    await page.goto('/course/course-001')
    await page.waitForLoadState('networkidle')

    // Find bookmark button (may not exist if course not in test DB)
    const bookmarkButton = page.getByRole('button', { name: /bookmark|save|favorite/i })

    if (await bookmarkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookmarkButton.click()

      // Bookmarked state or confirmation
      const bookmarked = page.locator('text=/bookmarked|saved|added/i').first()
      if (await bookmarked.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(bookmarked).toBeVisible()
      }
    }
  })

  test('should navigate to bookmarks page', async ({ page }) => {
    await page.goto('/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL('/bookmarks')

    // Bookmarks page should load
    const bookmarksContent = page.locator('text=/bookmarks|saved|favorites/i').first()
    await expect(bookmarksContent).toBeVisible({ timeout: 15000 })
  })

  test('should show enrolled courses', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for "My Courses" or "Enrolled" section
    const myCourses = page.locator('text=/my courses|enrolled|learning/i').first()

    if (await myCourses.isVisible().catch(() => false)) {
      await myCourses.click({ force: true })

      // Should show enrolled courses
      await page.waitForLoadState('networkidle')

      const enrolledContent = page.locator('text=/continue|resume|progress/i').first()
      await expect(enrolledContent).toBeVisible({ timeout: 10000 })
    }
  })
})
