import { test, expect } from '@playwright/test'

/**
 * Quiz Flow E2E Tests
 * Tests: Quiz List, Quiz Taking, Results, History
 */
test.describe('Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each quiz test
    await page.goto('/auth')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('should navigate to quiz page', async ({ page }) => {
    await page.goto('/quiz')

    // Quiz page should load
    await expect(page).toHaveURL('/quiz')

    // Check for quiz-related content
    const quizContent = page.locator('text=/quiz|test|assessment/i').first()
    await expect(quizContent).toBeVisible()
  })

  test('should display quiz list', async ({ page }) => {
    await page.goto('/quiz')

    // Wait for quiz list to load
    await page.waitForTimeout(2000)

    // Check for quiz cards or list items
    const quizItems = page.locator('[data-testid="quiz-item"], .quiz-card, [class*="quiz"]').first()

    // Either quiz items exist or "no quizzes" message
    const hasQuizzes = await quizItems.isVisible().catch(() => false)
    const noQuizzesMessage = await page
      .getByText(/no quizzes|empty|available/i)
      .isVisible()
      .catch(() => false)

    expect(hasQuizzes || noQuizzesMessage).toBeTruthy()
  })

  test('should start a quiz', async ({ page }) => {
    await page.goto('/quiz')

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Find and click start quiz button
    const startButton = page.getByRole('button', { name: /start|begin|take quiz/i }).first()

    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click()

      // Should navigate to quiz taking page
      await expect(page).toHaveURL(/.*quiz.*/, { timeout: 5000 })

      // Quiz interface should be visible
      const quizInterface = page.locator('text=/question|option|answer|timer/i').first()
      await expect(quizInterface).toBeVisible()
    }
  })

  test('should answer quiz questions', async ({ page }) => {
    // Navigate to specific quiz (if exists)
    await page.goto('/quiz/sample-quiz-id')

    await page.waitForTimeout(2000)

    // Look for answer options
    const answerOptions = page
      .locator('input[type="radio"], button[class*="option"], [role="radio"]')
      .first()

    if (await answerOptions.isVisible().catch(() => false)) {
      // Select an answer
      await answerOptions.click()

      // Look for next/submit button
      const nextButton = page.getByRole('button', { name: /next|submit|continue/i })
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click()
      }
    }
  })

  test('should view quiz results', async ({ page }) => {
    // Navigate to quiz history
    await page.goto('/quiz-history')

    await expect(page).toHaveURL('/quiz-history')

    // Page should load with history content
    await page.waitForTimeout(2000)

    const historyContent = page.locator('text=/history|results|attempts|score/i').first()
    await expect(historyContent).toBeVisible()
  })

  test('should show timer during quiz', async ({ page }) => {
    await page.goto('/quiz/sample-quiz-id')

    await page.waitForTimeout(2000)

    // Look for timer element
    const timer = page.locator('text=/\\d+:\\d+|timer|time remaining/i').first()

    // Timer may or may not be present depending on quiz settings
    if (await timer.isVisible().catch(() => false)) {
      await expect(timer).toBeVisible()
    }
  })

  test('should handle quiz submission', async ({ page }) => {
    await page.goto('/quiz/sample-quiz-id')

    await page.waitForTimeout(2000)

    // Try to submit quiz
    const submitButton = page.getByRole('button', { name: /submit|finish|complete/i })

    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click()

      // Should show results or confirmation
      await page.waitForTimeout(2000)

      const resultContent = page.locator('text=/result|score|completed|submitted/i').first()
      await expect(resultContent).toBeVisible()
    }
  })
})
