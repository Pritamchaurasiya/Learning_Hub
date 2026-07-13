import { test, expect } from '@playwright/test'

test('Verify code copy functionality in AI Tutor', async ({ page, context }) => {
  // Increase the overall test timeout for streaming + rendering
  test.setTimeout(120_000)

  // Grant clipboard permissions for Chromium-based browsers
  if (context.browser()?.browserType().name() === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }

  // ──────────────────────────────────────────────────────────
  // Step 1: Login via UI (Mocked)
  // ──────────────────────────────────────────────────────────
  await page.route('**/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' }, tokens: { accessToken: 'mock' } }
      })
    })
  })

  await page.route('**/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { user: { id: 'test-user-1', email: 'student@learninghub.com', role: 'STUDENT' } }
      })
    })
  })

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

  // Mock notifications to prevent 401 redirects from useNotificationConnection globally
  await page.route('**/notifications*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { notifications: [], count: 0 } }),
    })
  })

  // Mock AI Tutor sessions
  await page.route('**/ai/tutor/sessions', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [{ id: 'mock-session-1', title: 'Mock Session', updatedAt: new Date().toISOString() }]
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { id: 'mock-session-1', title: 'Mock Session', updatedAt: new Date().toISOString() }
        })
      })
    }
  })

  await page.route('**/ai/tutor/sessions/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: []
      })
    })
  })

  await page.goto('http://localhost:3000/dashboard')
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 30_000 })

  // ──────────────────────────────────────────────────────────
  // Step 2: Dismiss Cookie Preferences modal if present
  // ──────────────────────────────────────────────────────────
  const cookieAcceptBtn = page.getByRole('button', { name: 'Accept All' })
  if (await cookieAcceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await cookieAcceptBtn.click()
    // Wait for modal to disappear
    await cookieAcceptBtn.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }

  // ──────────────────────────────────────────────────────────
  // Step 3: Navigate to AI Tutor
  // ──────────────────────────────────────────────────────────
  await page.goto('http://localhost:3000/ai-tutor')

  if (await cookieAcceptBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cookieAcceptBtn.click()
    await cookieAcceptBtn.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }

  // Mock AI Chat to return a deterministic code block instantly (SSE format)
  await page.route('**/ai/tutor/stream*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: {"text":"Here is your hello world:\\n\\n\`\`\`javascript\\nconsole.log(\\"Hello, World!\\");\\n\`\`\`\\n"}\n\ndata: [DONE]\n\n`,
    })
  })

  // Wait for the chat textarea to be ready
  const inputLocator = page.locator('textarea[placeholder*="Ask your tutor"]')
  await inputLocator.waitFor({ state: 'visible', timeout: 30_000 })

  // ──────────────────────────────────────────────────────────
  // Step 4: Send a message that triggers a code-block response
  // ──────────────────────────────────────────────────────────
  await inputLocator.fill('Write a simple hello world function in javascript')
  await inputLocator.press('Enter')

  // ──────────────────────────────────────────────────────────
  // Step 5: Wait for the code block to appear in the DOM
  //
  // The copy button is inside a wrapper with `opacity-0` that
  // only becomes `opacity-100` on hover. Playwright's "visible"
  // check requires `opacity > 0`, so we first wait for the
  // button to be *attached* to the DOM, then hover to reveal it.
  // ──────────────────────────────────────────────────────────
  const copyButtonLocator = page.locator('.copy-code-button').last()

  // Wait for the button element to exist in DOM (attached), not necessarily visible
  await copyButtonLocator.waitFor({ state: 'attached', timeout: 45_000 })

  // Hover over the code block container (the .group parent) to trigger opacity-100
  const codeBlockContainer = page.locator('.copy-code-button').last().locator('..')
  // The parent of .copy-code-button is the inner div; the .group is 2 levels up
  const groupContainer = codeBlockContainer.locator('..')
  await groupContainer.hover()

  // Now the button should be visible after hover triggers group-hover:opacity-100
  await copyButtonLocator.waitFor({ state: 'visible', timeout: 10_000 })

  // ──────────────────────────────────────────────────────────
  // Step 6: Click copy and verify
  // ──────────────────────────────────────────────────────────
  await copyButtonLocator.click({ force: true })

  // Verify the button text changes to "Copied!"
  await expect(copyButtonLocator).toContainText('Copied!', { timeout: 5_000 })

  // Verify clipboard content (Chromium only — other browsers may not support this)
  if (context.browser()?.browserType().name() === 'chromium') {
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('Hello, World!')
  }
})
