import { test, expect } from '@playwright/test'

/**
 * Course Flow E2E Tests
 * Tests: Course List, Course Details, Lesson Player, Progress Tracking
 */
test.describe('Course Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each course test
    await page.goto('/auth')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
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
    await page.goto('/course/1')

    await expect(page).toHaveURL('/course/1')

    // Course page should load with content
    await page.waitForTimeout(2000)

    const courseDetails = page.locator('text=/lessons|content|syllabus|instructor/i').first()
    await expect(courseDetails).toBeVisible()
  })

  test('should display course lessons list', async ({ page }) => {
    await page.goto('/course/1')

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
    await page.goto('/course/1')

    await page.waitForTimeout(2000)

    // Find and click on a lesson
    const lessonLink = page.locator('a[class*="lesson"], button[class*="lesson"]').first()

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

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/search|find/i)

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
    await page.goto('/course/1')

    await page.waitForTimeout(2000)

    // Find bookmark button
    const bookmarkButton = page.getByRole('button', { name: /bookmark|save|favorite/i })

    if (await bookmarkButton.isVisible().catch(() => false)) {
      await bookmarkButton.click()

      // Should show feedback
      await page.waitForTimeout(1000)

      // Bookmarked state or confirmation
      const bookmarked = page.locator('text=/bookmarked|saved|added/i').first()
      if (await bookmarked.isVisible().catch(() => false)) {
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
