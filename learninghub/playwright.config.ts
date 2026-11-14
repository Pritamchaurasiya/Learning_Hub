import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration for LearningHub
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI (2x) and locally (1x) to handle Vite cold-start flakiness */
  retries: process.env.CI ? 2 : 1,

  /* Run tests sequentially to avoid DB lock collisions */
  workers: 1,

  /* Reporter to use */
  reporter: 'html',

  /* Global test timeout — increased for Vite cold-start module compilation */
  timeout: 60000,

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Navigation timeout — Vite cold-starts can take 30s+ on first load */
    navigationTimeout: 45000,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* In live-backend CI, the workflow starts the frontend and Django itself.
   * For local runs, Playwright starts the Vite development server. */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          NODE_ENV: 'test',
          VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:8000/api/v1',
          VITE_API_TARGET: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
        },
      },
})
