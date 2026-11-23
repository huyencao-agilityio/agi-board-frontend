import { expect, test } from '@playwright/test'

test('status page is reachable signed out', async ({ page }) => {
  await page.route('http://api.e2e/health', (route) => route.fulfill({ json: { status: 'ok' } }))
  await page.route('http://api.e2e/health/db', (route) => route.fulfill({ json: { status: 'ok' } }))
  await page.goto('/status')
  await expect(page.getByText('API: OK')).toBeVisible()
  await expect(page.getByText('Database: OK')).toBeVisible()
})

test('signed-out visitor is sent to Sign in', async ({ page }) => {
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))
  await page.goto('/b/some-board')
  await expect(page).toHaveURL(/\/signin\?next=%2Fb%2Fsome-board$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('Google callback redirect to /sign-in keeps its error', async ({ page }) => {
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))
  await page.goto('/sign-in?error=google_failed')
  await expect(page).toHaveURL(/\/signin\?error=google_failed$/)
  await expect(page.getByRole('alert')).toHaveText('Google sign-in failed. Try again.')
})

test('opening the app at / goes to a plain /signin without ?next', async ({ page }) => {
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))
  await page.goto('/')
  await expect(page).toHaveURL(/\/signin$/)
})

test('an ended session sends the visitor to Sign in with the signed-out notice', async ({
  page,
}) => {
  await page.route('http://api.e2e/auth/me', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'SESSION_ENDED' } } }),
  )
  await page.goto('/b/some-board')
  await expect(page).toHaveURL(/\/signin\?next=%2Fb%2Fsome-board&notice=signed-out$/)
  await expect(page.getByRole('status')).toHaveText('You were signed out. Sign in again.')
})
