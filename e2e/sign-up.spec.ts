import { expect, test, type Page } from '@playwright/test'

const EMAIL = 'new@example.com'
const PASSWORD = 'horse battery 1'
const USER = { id: 'u1', email: EMAIL, fullName: 'An', systemRole: 'USER' }

const signedOut = (page: Page) =>
  page.route('http://api.e2e/auth/me', (route) => route.fulfill({ status: 401, json: {} }))

/** Answers POST /auth/verify-email and collects the bodies sent to it. */
async function verifyRoute(page: Page) {
  const bodies: unknown[] = []
  await page.route('http://api.e2e/auth/verify-email', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ json: { user: USER, next: 'home' } })
  })
  return bodies
}

async function signUp(page: Page) {
  await page.route('http://api.e2e/auth/sign-up', (route) =>
    route.fulfill({ status: 201, json: { next: 'verify-email' } }),
  )
  await page.goto('/signup')
  await page.getByLabel('Full name').fill('An Nguyen')
  await page.getByLabel('Email', { exact: true }).fill(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/verify-email$/)
  await expect(page.getByText(`Enter the 6-digit code we sent to ${EMAIL}.`)).toBeVisible()
}

async function typeCode(page: Page) {
  await page.getByLabel('Digit 1').click()
  await page.keyboard.type('123456')
}

test('Continue with Google on sign up starts the Google flow', async ({ page }) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/google', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Google' }),
  )
  await page.goto('/signup')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL('http://api.e2e/auth/google')
})

test('the Google return URL opens Home, not email verification', async ({ page }) => {
  await page.route('http://api.e2e/auth/me', (route) =>
    route.fulfill({ json: { user: USER, next: 'home' } }),
  )
  const visited: string[] = []
  page.on('framenavigated', (frame) => visited.push(new URL(frame.url()).pathname))
  await page.goto('/home')
  await expect(page).toHaveURL(/:4173\/$/)
  expect(visited).not.toContain('/verify-email')
})

test('signs up, verifies and reaches Home', async ({ page }) => {
  await signedOut(page)
  const bodies = await verifyRoute(page)
  await signUp(page)
  await typeCode(page)
  await expect(page).toHaveURL(/:4173\/$/)
  expect(bodies).toEqual([{ email: EMAIL, code: '123456', password: PASSWORD }])
})

test('a reload keeps the email and countdown and asks for the password, which is stored nowhere', async ({
  page,
}) => {
  await signedOut(page)
  const bodies = await verifyRoute(page)
  await signUp(page)

  const stored = await page.evaluate(() =>
    JSON.stringify([history.state, { ...localStorage }, { ...sessionStorage }, location.href]),
  )
  expect(stored).toContain(EMAIL)
  expect(stored).not.toContain(PASSWORD)
  const resendAt = () =>
    page.evaluate(() => (history.state as { usr: { resendAt: number } }).usr.resendAt)
  const before = await resendAt()

  await page.reload()
  await expect(page.getByText(`Enter the 6-digit code we sent to ${EMAIL}.`)).toBeVisible()
  expect(await resendAt()).toBe(before)
  await expect(page.getByText(/^Resend in \d+s$/)).toBeVisible()
  await typeCode(page)
  await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled()
  await page.getByLabel('Password', { exact: true }).fill('another horse 2')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL(/:4173\/$/)
  expect(bodies).toEqual([{ email: EMAIL, code: '123456', password: 'another horse 2' }])
})

test('typing a code again over the old one keeps every digit', async ({ page }) => {
  await signedOut(page)
  await signUp(page)
  await page.reload() // with the password field shown, a full code is not submitted
  await page.getByLabel('Digit 1').click()
  await page.keyboard.type('123956')
  await typeCode(page)
  for (let i = 1; i <= 6; i++) {
    await expect(page.getByLabel(`Digit ${i}`)).toHaveValue(String(i))
  }
})

test('keyboard focus goes to the first box after a resend', async ({ page }) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/resend-code', (route) =>
    route.fulfill({ json: { sent: true } }),
  )
  await signUp(page)
  await page.evaluate(() => {
    const state = history.state as { usr: { resendAt: number } }
    state.usr.resendAt = 0
    history.replaceState(state, '')
  })
  await page.reload()
  await page.getByRole('button', { name: 'Resend code' }).press('Enter')
  await expect(page.getByText('A new code has been sent.')).toBeVisible()
  await expect(page.getByLabel('Digit 1')).toBeFocused()
})

test('keyboard focus goes to the password field when the held password is refused', async ({
  page,
}) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/verify-email', (route) =>
    route.fulfill({ status: 400, json: { error: { code: 'VALIDATION_FAILED' } } }),
  )
  await signUp(page)
  await typeCode(page)
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
})

test('sign-in of an unverified account opens email verification, not Home', async ({ page }) => {
  await signedOut(page)
  await page.route('http://api.e2e/auth/sign-in', (route) =>
    route.fulfill({ json: { user: USER, next: 'verify-email' } }),
  )
  await page.goto('/signin')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/verify-email$/)
  await expect(page.getByText(`Enter the 6-digit code we sent to ${EMAIL}.`)).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
})

test('a signed-in person cannot reopen email verification with the back button', async ({
  page,
}) => {
  await signedOut(page)
  await verifyRoute(page)
  await signUp(page)
  await page.getByRole('link', { name: 'Back to sign up' }).click()
  await page.getByLabel('Full name').fill('An Nguyen')
  await page.getByLabel('Email', { exact: true }).fill(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await typeCode(page)
  await expect(page).toHaveURL(/:4173\/$/)
  // Straight to the first verify-email entry: home <- sign up <- verify-email.
  await page.evaluate(() => history.go(-2))
  await expect(page).toHaveURL(/:4173\/$/)
  await expect(page.getByRole('heading', { name: 'Verify email' })).toHaveCount(0)
})

test('opening verify-email directly goes to Sign in', async ({ page }) => {
  await signedOut(page)
  await page.goto('/verify-email')
  await expect(page).toHaveURL(/\/signin$/)
})
