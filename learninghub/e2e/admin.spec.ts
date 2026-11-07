import { test, expect } from '@playwright/test'

/**
 * Admin Command Center & Governance End-to-End Suite
 * Validates:
 * 1. RBAC Route Protection: Non-admins blocked with Access Denied fallback
 * 2. Authenticated Admin Session: Command Center rendering and Telemetry Stats
 * 3. Tab switching & workflows: Courses catalog, Users, Analytics, Security, and AI Lab
 */
test.describe('Admin Command Center & Platform Governance', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem('lh_location_permission_requested', 'true')
    })

    // Mock global background requests to prevent session-expired redirects
    await page.route('**/notifications*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { notifications: [], count: 0 } }),
      })
    })

    await page.route('**/tests/attempts*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: [] }),
      })
    })
  })

  test('should deny access to standard non-admin learners', async ({ page }) => {
    // Mock /auth/me for student
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'student-42',
              email: 'learner@example.com',
              username: 'Learner One',
              role: 'STUDENT',
            },
          },
        }),
      })
    })

    // Seed standard student session
    await page.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem('lh_location_permission_requested', 'true')
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: {
                id: 'student-42',
                email: 'learner@example.com',
                username: 'Learner One',
                role: 'STUDENT',
              },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/admin')

    // Expect RBAC Access Denied screen
    await expect(page.getByText('Access Denied')).toBeVisible()
    await expect(
      page.getByText('You do not have administrator privileges to access this area.')
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Go Home/i })).toBeVisible()
  })

  test('should render Admin Command Center and navigate management tabs for admin', async ({
    page,
  }) => {
    // Mock /auth/me for admin
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'admin-super-1',
              email: 'admin@learninghub.com',
              username: 'Lead Administrator',
              role: 'ADMIN',
            },
          },
        }),
      })
    })

    // Mock Admin API endpoints
    await page.route('**/api/v1/admin/dashboard', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            total_users: 1540,
            active_users_24h: 420,
            total_courses: 58,
            test_submissions_24h: 185,
            new_users_today: 25,
            recent_completions: 48,
            total_enrollments: 3400,
            passed: 120,
          },
        }),
      })
    })

    await page.route('**/api/v1/admin/courses*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [
            {
              id: 'course-101',
              title: 'High Performance Go & Distributed Systems',
              category: 'Backend',
              level: 'advanced',
              difficulty: 'HARD',
              isPublished: true,
              studentCount: 520,
              enrolledCount: 520,
              duration: 90,
            },
          ],
        }),
      })
    })

    await page.route('**/api/v1/admin/users*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            users: [
              {
                id: 'user-admin-1',
                email: 'principal@learninghub.com',
                username: 'Principal Architect',
                role: 'SUPERADMIN',
                xp: 12000,
                level: 15,
                streak: 45,
                created_at: new Date().toISOString(),
                is_active: true,
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
        }),
      })
    })

    await page.route('**/api/v1/admin/analytics/courses*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            popular: [{ id: 'course-101', title: 'High Performance Go', enrollments: 520 }],
            byCategory: [{ category: 'Backend Systems', count: 24 }],
          },
        }),
      })
    })

    // Seed admin session
    await page.addInitScript(() => {
      window.localStorage.setItem('lh_access_token', 'mock-admin-token')
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              token: 'mock-admin-token',
              user: {
                id: 'admin-super-1',
                email: 'admin@learninghub.com',
                username: 'Lead Administrator',
                role: 'ADMIN',
              },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/admin')

    // 1. Verify Command Center Header & Overview Stats
    await expect(page.getByText('Admin Command Center')).toBeVisible()
    await expect(page.getByText('Total Learners')).toBeVisible()
    await expect(page.getByText('1540')).toBeVisible()
    await expect(page.getByText('Active Today')).toBeVisible()
    await expect(page.getByText('420')).toBeVisible()

    // 2. Switch to Courses tab & verify Course Master Modal
    const coursesTab = page.getByRole('button', { name: /^courses$/i })
    await coursesTab.click()

    await expect(page.getByPlaceholder(/search courses by name or ID/i)).toBeVisible()
    await expect(page.getByText('High Performance Go & Distributed Systems')).toBeVisible()

    const createCourseBtn = page.getByRole('button', { name: /create course/i })
    await createCourseBtn.click()

    await expect(page.getByText('New Course Master')).toBeVisible()
    await expect(page.getByPlaceholder(/e\.g\. Distributed Systems in Go/i)).toBeVisible()

    // Cancel modal
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText('New Course Master')).not.toBeVisible()

    // 3. Switch to Users tab
    const usersTab = page.getByRole('button', { name: /^users$/i })
    await usersTab.click()
    await expect(page.getByPlaceholder(/Find learners by name or email/i)).toBeVisible()
    await expect(page.getByText('principal@learninghub.com')).toBeVisible()

    // 4. Switch to AI Lab tab
    const aiLabTab = page.getByRole('button', { name: /^ai-lab$/i })
    await aiLabTab.click()
    await expect(page.getByText('AI Course Workshop')).toBeVisible()
    await expect(
      page.getByPlaceholder(/e\.g\. A comprehensive guide to building microservices/i)
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Autogenerate Course/i })).toBeVisible()

    // 5. Switch to Security tab
    const securityTab = page.getByRole('button', { name: /^security$/i })
    await securityTab.click()
    await expect(page.getByText(/Two-Factor Authentication \(2FA\)/i)).toBeVisible()
    await expect(page.getByText(/Enable 2FA Protection/i)).toBeVisible()
  })
})
