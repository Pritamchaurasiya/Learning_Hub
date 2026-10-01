import { test, expect } from '@playwright/test'

/**
 * Two-Factor Authentication (2FA / MFA) End-to-End Test Suite
 * Covers:
 * 1. User-facing 2FA Enrollment in Settings (/settings)
 * 2. 2FA Verification & Activation
 * 3. 2FA Login Challenge & Session Exchange (/auth)
 */
test.describe('Two-Factor Authentication (2FA) User Journey', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
    })
  })

  test('should complete 2FA enrollment flow in Settings', async ({ page }) => {
    // Seed authenticated session in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem('lh_access_token', 'mock-valid-token')
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'user-mfa-enroll',
          email: 'student@learninghub.com',
          role: 'STUDENT',
          mfaEnabled: false,
        })
      )
    })

    // Mock /auth/me profile query
    let userMfaEnabled = false
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'user-mfa-enroll',
              email: 'student@learninghub.com',
              role: 'STUDENT',
              mfaEnabled: userMfaEnabled,
            },
          },
        }),
      })
    })

    // Mock preferences and settings endpoints
    await page.route('**/exam-content/countries*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'c-1', name: 'Global', code: 'GL' }] }),
      })
    })
    await page.route('**/web3/profile*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      })
    })

    // Mock MFA setup endpoint
    await page.route('**/auth/mfa/setup', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
            qrCodeUrl:
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="black"/></svg>',
          },
        }),
      })
    })

    // Mock MFA verification endpoint
    await page.route('**/auth/mfa/verify', async route => {
      const payload = JSON.parse(route.request().postData() || '{}')
      if (payload.token === '849201') {
        userMfaEnabled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'MFA enabled successfully',
          }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', message: 'Invalid verification code' }),
        })
      }
    })

    await page.goto('/settings')

    // Verify 2FA card is rendered in disabled state
    await expect(page.getByText('Two-Factor Auth (2FA)')).toBeVisible()
    const enableBtn = page.getByRole('button', { name: /Enable 2FA Protection/i })
    await expect(enableBtn).toBeVisible()

    // Trigger MFA Setup
    await enableBtn.click()

    // Verify QR Code and Manual Setup Key appear
    await expect(page.getByAltText('2FA QR Code')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ')).toBeVisible()

    // Input 6-digit TOTP token
    const tokenInput = page.getByTestId('mfa-token-input')
    await tokenInput.fill('849201')

    // Submit verification
    const verifyBtn = page.getByTestId('mfa-verify-btn')
    await verifyBtn.click()

    // Verify 2FA Active badge is displayed
    await expect(page.getByText('2FA Active & Protected')).toBeVisible({ timeout: 10000 })
  })

  test('should require and complete MFA challenge during sign-in', async ({ page }) => {
    await page.goto('/auth')

    // Mock Login endpoint returning mfaRequired
    await page.route('**/auth/login', async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.email === 'mfa.student@learninghub.com' && body.password === 'Student@123!') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              mfaRequired: true,
              mfaSessionToken: 'mock-mfa-session-jwt-token-999',
            },
            message: 'MFA verification required',
          }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', message: 'Invalid credentials' }),
        })
      }
    })

    // Mock MFA Login completion endpoint
    await page.route('**/auth/mfa/login', async route => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.mfaSessionToken === 'mock-mfa-session-jwt-token-999' && body.token === '456789') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'usr-mfa-complete',
                email: 'mfa.student@learninghub.com',
                username: 'mfastudent',
                role: 'STUDENT',
                mfaEnabled: true,
              },
              tokens: {
                accessToken: 'final-mfa-session-jwt',
              },
            },
          }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', message: 'Invalid MFA verification token' }),
        })
      }
    })

    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'usr-mfa-complete',
              email: 'mfa.student@learninghub.com',
              role: 'STUDENT',
              mfaEnabled: true,
            },
          },
        }),
      })
    })

    // Mock notifications and dashboard dependencies
    await page.route('**/notifications*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { notifications: [], count: 0 } }),
      })
    })
    await page.route('**/gamification/achievements', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      })
    })
    await page.route('**/tests/attempts*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      })
    })

    // Fill login form
    await page.locator('#auth-email').fill('mfa.student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')
    await page.getByRole('button', { name: /Sign In/i }).click()

    // Expect MFA challenge form to be visible
    await expect(page.getByText('Two-Factor Verification')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('auth-mfa-code')).toBeVisible()

    // Fill 6-digit MFA token
    await page.getByTestId('auth-mfa-code').fill('456789')

    // Submit MFA verification
    await page.getByRole('button', { name: /Verify & Continue/i }).click()

    // Expect redirection to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })
  })
})
