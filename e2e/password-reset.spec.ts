import { expect, test, type Page } from '@playwright/test'

const EMAIL = 'jane@example.com'
const PASSWORD = 'horse battery 1'
const TOKEN = 'emailed-token'

const signedOut = (page: Page) =>
  page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))

/** Answers the link check and the reset; collects path and body of each POST, in order. */
async function resetRoutes(page: Page) {
  const posts: unknown[] = []
  await page.route('http://api.e2e/auth/reset-password**', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() })
    return route.fulfill({ json: { next: 'sign-in' } })
  })
  await page.route('http://api.e2e/auth/reset-password/check', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() })
    return route.fulfill({ json: { email: EMAIL } })
  })
  return posts
}

async function setPassword(page: Page) {
  await page.getByLabel('New password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm new password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Set new password' }).click()
  await expect(page).toHaveURL(/\/signin\?notice=password-updated$/)
  await expect(page.getByRole('status')).toHaveText(
    'Password updated. Sign in with your new password.',
  )
}

test('asks for a reset link from Sign in', async ({ page }) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/forgot-password', (route) =>
    route.fulfill({ json: { sent: true } }),
  )
  await page.goto('/signin')
  await page.getByRole('link', { name: 'Forgot your password?' }).click()
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toHaveText(
    "If this email has an account, we've sent a reset link.",
  )
})

test('a link opened first in a new browser waits for the CSRF cookie and sets the password', async ({
  page,
}) => {
  const csrf: (string | undefined)[] = []
  const posts = await resetRoutes(page)
  page.on('request', (request) => {
    if (request.method() === 'POST') csrf.push(request.headers()['x-csrf-token'])
  })
  await page.route('http://api.e2e/auth/me', async (route) => {
    // The cookie arrives with this slow answer, as from the real API.
    await new Promise((resolve) => setTimeout(resolve, 300))
    await page
      .context()
      .addCookies([{ name: 'csrf_token', value: 'tok123', url: 'http://localhost:4173' }])
    await route.fulfill({ status: 401, json: {} })
  })
  await page.goto(`/reset-password#token=${TOKEN}`)
  await setPassword(page)
  expect(posts).toEqual([
    { path: '/auth/reset-password/check', body: { token: TOKEN } },
    { path: '/auth/reset-password', body: { token: TOKEN, password: PASSWORD } },
  ])
  expect(csrf).toEqual(['tok123', 'tok123'])
})

test('a signed-in person ends on Sign in, not Home', async ({ page }) => {
  await resetRoutes(page)
  await page.route('http://api.e2e/auth/me', (route) =>
    route.fulfill({
      json: {
        user: { id: 'u1', email: EMAIL, fullName: 'Jane', systemRole: 'USER' },
        next: 'home',
      },
    }),
  )
  await page.goto(`/reset-password#token=${TOKEN}`)
  await setPassword(page)
})

test('after the check the token is stored nowhere', async ({ page }) => {
  await signedOut(page)
  await resetRoutes(page)
  await page.goto(`/reset-password#token=${TOKEN}`)
  await expect(page.getByLabel('Confirm new password')).toBeVisible()
  await expect(page).toHaveURL(/\/reset-password$/)
  const stored = await page.evaluate(() =>
    JSON.stringify([history.state, { ...localStorage }, { ...sessionStorage }, location.href]),
  )
  expect(stored).not.toContain(TOKEN)
})

test('an unusable link leads to a request for a new one', async ({ page }) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/reset-password/check', (route) =>
    route.fulfill({ status: 400, json: { error: { code: 'RESET_LINK_INVALID' } } }),
  )
  await page.goto(`/reset-password#token=${TOKEN}`)
  await expect(page.getByRole('alert')).toHaveText('This link has expired or was already used.')
  await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(/\/reset-password$/)
  await page.getByRole('link', { name: 'Request a new link' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible()
})
