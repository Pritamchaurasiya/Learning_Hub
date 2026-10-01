import { test, expect } from '@playwright/test'

/**
 * Course Flow E2E Tests
 * Validates: Course Catalog, Course Details, Lesson Player, Bookmarks, and Search
 */
test.describe('Course Flow', () => {
  const mockCourse = {
    id: 'course-001',
    title: 'Advanced React & Distributed Systems',
    description: 'Master full-stack distributed system patterns with React and TypeScript.',
    short_description: 'Comprehensive curriculum on scalable web architectures.',
    thumbnail: null,
    trailer_video: null,
    price: 0,
    original_price: 99,
    rating: 4.9,
    review_count: 1420,
    student_count: 5400,
    duration: '18 hours',
    level: 'intermediate',
    language: 'English',
    last_updated: '2026',
    certificate: true,
    is_enrolled: true,
    progress_percent: 45,
    learning_outcomes: [
      'Architect resilient frontend architectures',
      'Optimize React rendering performance',
      'Design idempotent API contracts',
    ],
    prerequisites: ['Basic JavaScript', 'HTML/CSS basics'],
    tags: ['React', 'TypeScript', 'Architecture'],
    instructor: {
      id: 'inst-1',
      display_name: 'Dr. Sarah Connor',
      avatar: null,
      bio: 'Principal Distributed Systems Engineer',
      total_students: 24000,
      total_courses: 8,
    },
    sections: [
      {
        id: 'sec-1',
        title: 'Module 1: Foundations of Resilient State',
        order: 1,
        lessons: [
          {
            id: 'les-1',
            title: 'Lesson 1: Immutability and State Machines',
            duration: '15:20',
            completed: true,
            is_free: true,
            description: 'Understanding deterministic state transitions.',
          },
          {
            id: 'les-2',
            title: 'Lesson 2: Optimistic UI Updates & Rollbacks',
            duration: '22:10',
            completed: false,
            is_free: false,
            description: 'Handling network latency with local projections.',
          },
        ],
      },
    ],
  }

  test.beforeEach(async ({ context, page }) => {
    // Set accepted cookies
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
    })

    // Mock auth verification endpoints to prevent 401 redirects
    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/auth/me'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'test-user-1',
                email: 'student@learninghub.com',
                username: 'StudentDeveloper',
                role: 'STUDENT',
                xp: 850,
                level: 3,
              },
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/auth/refresh'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'test-user-1',
                email: 'student@learninghub.com',
                username: 'StudentDeveloper',
                role: 'STUDENT',
              },
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/auth/login'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              user: {
                id: 'test-user-1',
                email: 'student@learninghub.com',
                username: 'StudentDeveloper',
                role: 'STUDENT',
                xp: 850,
                level: 3,
              },
              tokens: { accessToken: 'mock-access-token' },
            },
          }),
        })
      }
    )

    // Mock course queries
    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/courses/course-001'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: mockCourse,
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.endsWith('/courses'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [mockCourse],
            meta: { total: 1, page: 1, limit: 10 },
          }),
        })
      }
    )

    // Mock analytics and notifications
    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/user-analytics'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              total_xp: 850,
              current_streak: 4,
              tests_completed: 12,
              courses_enrolled: 3,
            },
          }),
        })
      }
    )

    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/notifications'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { notifications: [], count: 0 },
          }),
        })
      }
    )

    // Mock bookmarks
    await page.route(
      url => url.pathname.startsWith('/api/') && url.pathname.includes('/bookmarks'),
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: [{ id: 'bm-1', courseId: 'course-001', course: mockCourse }],
          }),
        })
      }
    )
  })

  test('should display course list on home landing page for public visitors', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Public landing page has course/learning headlines
    const content = page.locator('text=/course|learn|curriculum|skills/i').first()
    await expect(content).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to course details page when authenticated', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/course/course-001')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL('/course/course-001')
    // Course title or syllabus must be visible
    const title = page.getByRole('heading', { name: /Advanced React|Course Details/i })
    await expect(title).toBeVisible({ timeout: 15000 })
  })

  test('should display course lessons list', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/course/course-001')
    await page.waitForLoadState('domcontentloaded')

    const lessonItem = page.locator('[data-testid="lesson-item"]').first()
    await expect(lessonItem).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to lesson player on lesson click', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/course/course-001')
    await page.waitForLoadState('domcontentloaded')

    const lessonItem = page.locator('[data-testid="lesson-item"]').first()
    await expect(lessonItem).toBeVisible({ timeout: 15000 })
    await lessonItem.click()

    await expect(page).toHaveURL(/.*lesson-player.*/, { timeout: 15000 })
  })

  test('should show course progress on dashboard', async ({ page }) => {
    await page.goto('/auth')
    await page.locator('#auth-email').fill('student@learninghub.com')
    await page.locator('#auth-password').fill('Student@123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 })
    const dashboardContent = page.locator('text=/overview|stats|progress|courses/i').first()
    await expect(dashboardContent).toBeVisible({ timeout: 15000 })
  })

  test('should search for courses', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/search')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL('/search')
    const searchHeading = page.locator('text=/search|explore|find/i').first()
    await expect(searchHeading).toBeVisible({ timeout: 15000 })
  })

  test('should bookmark a course and show feedback toast', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/course/course-001')
    await page.waitForLoadState('domcontentloaded')

    const bookmarkButton = page.getByRole('button', { name: /bookmark|save/i }).first()
    if (await bookmarkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookmarkButton.click()
      const toast = page.locator('text=/bookmark/i').first()
      await expect(toast).toBeVisible({ timeout: 5000 })
    }
  })

  test('should navigate to bookmarks page', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/bookmarks')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL('/bookmarks')
    const bookmarksTitle = page.locator('text=/bookmark/i').first()
    await expect(bookmarksTitle).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to course catalog library', async ({ context, page }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              isHydrated: true,
              user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    await page.goto('/library')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL('/library')
    const libraryContent = page.locator('text=/course|library|catalog|all/i').first()
    await expect(libraryContent).toBeVisible({ timeout: 15000 })
  })
})
