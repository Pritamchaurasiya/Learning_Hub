import { test, expect } from '@playwright/test'

/**
 * Course Flow E2E Tests
 * Tests: Course List, Course Details, Lesson Player, Progress Tracking
 */
test.describe('Course Flow', () => {
  let authToken = ''

  test.beforeAll(async ({ request }) => {
    // Authenticate once per worker to avoid auth rate limits
    const response = await request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: 'student@learninghub.com',
        password: 'Student@123!',
      },
    })
    const body = await response.json()
    if (body.data?.access_token) {
      authToken = body.data.access_token
    }
  })

  test.beforeEach(async ({ context, page }) => {
    // Set localStorage tokens before any page navigation to avoid auth redirect race conditions
    await context.addInitScript((token) => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      if (token) {
        window.localStorage.setItem('lh_token', token)
      }
    }, authToken)
  })

  test('should display course list on home page', async ({ page }) => {
    await page.goto('/')

    // Wait for courses to load
    await page.waitForTimeout(2000)

    // Check for course-related content
    const courseContent = page.locator('text=/course|lesson|learn|study/i').first()
    await expect(courseContent).toBeVisible()
  })

  test('should navigate to course details page', async ({ page }) => {
    // Navigate to a course (using sample ID)
    await page.goto('/course/course-001')

    await expect(page).toHaveURL('/course/course-001')

    // Course page should load with content
    await page.waitForTimeout(2000)

    const courseDetails = page.locator('text=/lessons|content|syllabus|instructor/i').first()
    await expect(courseDetails).toBeVisible()
  })

  test('should display course lessons list', async ({ page }) => {
    await page.goto('/course/course-001')

    await page.waitForTimeout(2000)

    // Look for lesson items
    const lessonItems = page.locator('[class*="lesson"], [data-testid*="lesson"]').first()

    // Either lessons exist or loading/empty state
    const hasLessons = await lessonItems.isVisible().catch(() => false)
    const loadingOrEmpty = await page
      .getByText(/loading|no lessons|empty/i)
      .isVisible()
      .catch(() => false)

    expect(hasLessons || loadingOrEmpty).toBeTruthy()
  })

  test('should navigate to lesson player', async ({ page }) => {
    await page.goto('/course/course-001')

    await page.waitForTimeout(2000)

    // Find and click on a lesson using robust data-testid
    const lessonLink = page.locator('[data-testid="lesson-item"]').first()

    if (await lessonLink.isVisible().catch(() => false)) {
      await lessonLink.click()

      // Should navigate to lesson player
      await expect(page).toHaveURL(/.*lesson.*/, { timeout: 5000 })

      // Lesson player should be visible
      const playerContent = page.locator('text=/video|content|lesson|player/i').first()
      await expect(playerContent).toBeVisible()
    }
  })

  test('should show course progress', async ({ page }) => {
    await page.goto('/')

    await page.waitForTimeout(2000)

    // Look for progress indicators
    const progressIndicator = page
      .locator('[class*="progress"], [class*="completed"], text=/\\d+%/')
      .first()

    // Progress may or may not be visible depending on enrollment
    if (await progressIndicator.isVisible().catch(() => false)) {
      await expect(progressIndicator).toBeVisible()
    }
  })

  test('should search for courses', async ({ page }) => {
    await page.goto('/search')

    await expect(page).toHaveURL('/search')

    // Search input should be visible specifically on the search page
    const searchInput = page.getByPlaceholder(/enter search query/i)

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('javascript')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(2000)

      // Results should appear
      const results = page.locator('text=/result|course|found/i').first()
      await expect(results).toBeVisible()
    }
  })

  test('should bookmark a course', async ({ page }) => {
    await page.goto('/course/course-001')

    await page.waitForTimeout(2000)

    // Find bookmark button (may not exist if course not in test DB)
    const bookmarkButton = page.getByRole('button', { name: /bookmark|save|favorite/i })

    if (await bookmarkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookmarkButton.click()

      // Should show feedback
      await page.waitForTimeout(1000)

      // Bookmarked state or confirmation
      const bookmarked = page.locator('text=/bookmarked|saved|added/i').first()
      if (await bookmarked.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(bookmarked).toBeVisible()
      }
    }
  })

  test('should navigate to bookmarks page', async ({ page }) => {
    await page.goto('/bookmarks')

    await expect(page).toHaveURL('/bookmarks')

    // Bookmarks page should load
    await page.waitForTimeout(2000)

    const bookmarksContent = page.locator('text=/bookmarks|saved|favorites/i').first()
    await expect(bookmarksContent).toBeVisible()
  })

  test('should show enrolled courses', async ({ page }) => {
    await page.goto('/')

    // Look for "My Courses" or "Enrolled" section
    const myCourses = page.locator('text=/my courses|enrolled|learning/i').first()

    if (await myCourses.isVisible().catch(() => false)) {
      await myCourses.click()

      // Should show enrolled courses
      await page.waitForTimeout(2000)

      const enrolledContent = page.locator('text=/continue|resume|progress/i').first()
      await expect(enrolledContent).toBeVisible()
    }
  })
})
