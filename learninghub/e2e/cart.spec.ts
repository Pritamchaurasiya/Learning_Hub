import { test, expect } from '@playwright/test'

test.describe('Shopping Cart & Checkout Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // Set localStorage tokens before any page navigation
    await context.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted')
      window.localStorage.setItem(
        'learninghub-storage',
        JSON.stringify({
          state: {
            auth: {
              isAuthenticated: true,
              user: { id: 'user-1', username: 'TestUser', role: 'STUDENT' },
            },
          },
          version: 0,
        })
      )
    })

    // Mock user authentication
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            user: {
              id: 'user-1',
              username: 'TestUser',
              role: 'STUDENT',
              streak: 5,
              xp: 100,
              level: 2,
            },
          },
        }),
      })
    })

    // Mock notifications
    await page.route('**/notifications*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { notifications: [], count: 0 },
        }),
      })
    })
  })

  test('should display empty cart state when no items are present', async ({ page }) => {
    await page.route('**/commerce/cart', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              id: 'cart-empty',
              items: [],
              total_items: 0,
              subtotal: 0,
              discount: 0,
              total: 0,
              currency: 'USD',
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/cart')
    await expect(page.locator('text=Shopping Cart').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Your cart is waiting for knowledge')).toBeVisible()
    await expect(page.locator('button:has-text("Explore Course Catalog")')).toBeVisible()
  })

  test('should display items, apply coupon, and complete checkout', async ({ page }) => {
    let hasCoupon = false

    await page.route('**/commerce/cart', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: {
              id: 'cart-123',
              items: [
                {
                  id: 'item-1',
                  course: {
                    id: 'course-sys-design',
                    title: 'System Design Architecture Mastery',
                    thumbnail: '',
                    instructor: { display_name: 'Lead Architect' },
                    price: 49,
                    original_price: 99,
                  },
                  quantity: 1,
                  added_at: new Date().toISOString(),
                },
              ],
              total_items: 1,
              subtotal: 49,
              discount: hasCoupon ? 10 : 0,
              total: hasCoupon ? 39 : 49,
              currency: 'USD',
              coupon_code: hasCoupon ? 'PROMO10' : null,
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock Apply Coupon
    await page.route('**/commerce/cart/apply-coupon', async route => {
      hasCoupon = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          message: 'Coupon applied successfully',
          data: { discount: 10, total: 39 },
        }),
      })
    })

    // Mock Checkout
    await page.route('**/commerce/cart/checkout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            order_id: 'order-sample-789',
            amount: 39,
            currency: 'USD',
            gateway: 'razorpay',
            status: 'PENDING_PAYMENT',
          },
        }),
      })
    })

    await page.goto('/cart')
    await expect(page.locator('text=System Design Architecture Mastery')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=$49.00').first()).toBeVisible()
    await expect(page.locator('text=Order Summary')).toBeVisible()

    // Test Coupon Application
    const couponInput = page.locator('#coupon-code-input')
    await couponInput.fill('PROMO10')
    await page.click('button:has-text("Apply")')

    // Test Checkout Click
    const checkoutButton = page.locator('button:has-text("Complete Checkout")')
    await expect(checkoutButton).toBeVisible()
    await checkoutButton.click()

    // Verify toast or order redirection
    await expect(page).toHaveURL(/.*order_id=order-sample-789.*/, { timeout: 10000 })
  })
})
