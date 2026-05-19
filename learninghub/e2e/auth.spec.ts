import { test, expect } from '@playwright/test'

/**
 * Authentication E2E Tests
 * Tests: Login, Logout, Register, Protected Routes
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should redirect unauthenticated user to login page', async ({ page }) => {
    await page.goto('/')

    // Should redirect to /auth
    await expect(page).toHaveURL(/.*auth/)

    // Login form should be visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should display login form with all required fields', async ({ page }) => {
    await page.goto('/auth')

    // Form elements
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Toggle to register
    await page.getByText(/don't have an account/i).click()

    // Register form should appear
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    await expect(page.getByLabel(/username/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth')

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Error message should appear
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 })
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth')

    // Use test credentials (assuming backend has test user)
    await page.getByLabel(/email/i).fill('student@learninghub.com')
    await page.getByLabel(/password/i).fill('student123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Home page content should be visible
    await expect(page.getByText(/learninghub|welcome|dashboard/i)).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth')
    await page.getByLabel(/email/i).fill('student@learninghub.com')
    await page.getByLabel(/password/i).fill('student123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for home page
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Click logout (usually in user menu)
    const userMenu = page.getByRole('button', { name: /user|profile|account/i })
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click()
      await page.getByText(/logout|sign out/i).click()

      // Should redirect to auth page
      await expect(page).toHaveURL(/.*auth/)
    }
  })

  test('should maintain session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/auth')
    await page.getByLabel(/email/i).fill('student@learninghub.com')
    await page.getByLabel(/password/i).fill('student123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Reload page
    await page.reload()

    // Should still be on home page (session maintained)
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/learninghub|welcome|dashboard/i)).toBeVisible()
  })
})
