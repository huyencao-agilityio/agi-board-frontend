import { expect, test, type Page } from '@playwright/test'

const ME = {
  user: {
    id: 'u1',
    email: 'ann@example.com',
    fullName: 'Ann Lee',
    systemRole: 'USER',
    avatarUrl: null,
  },
  next: 'home',
}
const PROFILE = {
  id: 'u1',
  email: 'ann@example.com',
  fullName: 'Ann Lee',
  avatarUrl: null,
  hasPassword: true,
  googleLinked: false,
  changePasswordLockedUntil: null,
}
const SESSIONS = {
  items: [
    {
      id: 's1',
      userAgent: null,
      createdAt: '2026-11-20T08:00:00.000Z',
      lastActiveAt: new Date().toISOString(),
      isCurrent: true,
    },
  ],
}

async function mockProfile(page: Page) {
  let signedIn = true
  const ended = { status: 401, json: { error: { code: 'SESSION_ENDED', message: 'ended' } } }
  await page.route('http://api.e2e/auth/me', (route) =>
    signedIn ? route.fulfill({ json: ME }) : route.fulfill(ended),
  )
  await page.route('http://api.e2e/users/me', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: PROFILE })
    // Signed out from another device: the next write finds the session ended.
    signedIn = false
    return route.fulfill(ended)
  })
  await page.route('http://api.e2e/auth/sessions', (route) => route.fulfill({ json: SESSIONS }))
}

test('Profile shows its four sections', async ({ page }) => {
  await mockProfile(page)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
  for (const name of ['Password', 'Google', 'Sessions'])
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  await expect(page.getByText('Google: Not linked')).toBeVisible()
  await expect(page.getByText('This device')).toBeVisible()
})

test('a session ended elsewhere sends the person to Sign in on the next request', async ({
  page,
}) => {
  await mockProfile(page)
  await page.goto('/profile')
  await page.getByLabel('Full name').fill('Ann Lee-Tran')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/signin\?notice=signed-out$/)
  await expect(page.getByRole('status')).toHaveText('You were signed out. Sign in again.')
})
