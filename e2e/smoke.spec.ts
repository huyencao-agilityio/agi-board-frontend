import { expect, test } from '@playwright/test'

test('signed-out visitor is sent to Sign in', async ({ page }) => {
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))
  await page.goto('/b/some-board')
  await expect(page).toHaveURL(/\/signin\?next=%2Fb%2Fsome-board$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
