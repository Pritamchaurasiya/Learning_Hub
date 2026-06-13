import { test, expect } from '@playwright/test'

/**
 * Authentication E2E Tests
 * Tests: Login, Logout, Register, Protected Routes
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // Seed cookieConsent accepted in localStorage before navigation
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
    })
    // Clear any existing auth state
    await context.clearCookies()
    await page.goto('/auth')
    await page.evaluate(() => {
      localStorage.removeItem('lh_token')
      localStorage.removeItem('user')
      sessionStorage.clear()
      localStorage.setItem('cookieConsent', 'accepted')
    })
  })

  test('should redirect unauthenticated user to login page', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to /auth
    await expect(page).toHaveURL(/.*auth/)

    // Login form should be visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should display login form with all required fields', async ({ page }) => {
    await page.goto('/auth')

    // Form elements
    await expect(page.locator('#auth-email')).toBeVisible()
    await expect(page.locator('#auth-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Toggle to register
    await page.getByRole('button', { name: /sign up/i }).click()

    // Register form should appear
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    // Note: Username is auto-generated from email; only Confirm Password is shown
    await expect(page.locator('#auth-confirm-password')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth')

    // Fill in invalid credentials
    await page.locator('#auth-email').fill('invalid@example.com')
    await page.locator('#auth-password').fill('wrongpassword123')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Error message should appear
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 15000 })
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth')

    // Use test credentials (assuming backend has test user)
    await page.locator('#auth-email').fill('student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to home page
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

    // Home page content should be visible
    await expect(page.getByText(/learninghub|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth')
    await page.locator('#auth-email').fill('student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for home page
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

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
    await page.locator('#auth-email').fill('student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

    // Reload page
    await page.reload()

    // Should still be on home page (session maintained)
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText(/learninghub|welcome|dashboard/i).first()).toBeVisible({ timeout: 15000 })
  })
})
