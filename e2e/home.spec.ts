import { expect, test, type Page } from '@playwright/test'

const ME = {
  user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Lee', systemRole: 'USER' },
  next: 'home',
}

const BOARD = {
  id: 'b1',
  name: 'Product Roadmap',
  workspaceId: 'w1',
  workspaceName: 'ASNET Engineering',
  visibility: 'workspace',
  backgroundKey: null,
  backgroundThumbnailUrl: null,
  backgroundColor: '#0d9488',
  starred: false,
}
const WORKSPACE = {
  id: 'w1',
  name: 'ASNET Engineering',
  role: 'member',
  boardCount: 1,
  memberCount: 4,
  boards: [BOARD],
}
const HOME = {
  starred: [],
  recent: [],
  workspaces: [WORKSPACE],
  invites: [],
  hasArchivedWorkspaces: false,
}

async function signIn(page: Page, home: object) {
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ json: ME }))
  await page.route('http://api.e2e/home', (route) => route.fulfill({ json: home }))
}

test('the sidebar opens a workspace, which keeps the sidebar and has no tabs', async ({ page }) => {
  await signIn(page, HOME)
  await page.route('http://api.e2e/workspaces/w1', (route) => route.fulfill({ json: WORKSPACE }))
  await page.goto('/')

  const sidebar = page.getByRole('navigation', { name: 'Workspaces' })
  await expect(page.getByText('1 board · 4 members')).toBeVisible()
  await sidebar.getByRole('button', { name: 'ASNET Engineering' }).click()
  await sidebar.getByRole('link', { name: 'Boards' }).click()

  await expect(page).toHaveURL(/\/w\/w1$/)
  await expect(page.getByRole('heading', { level: 1, name: 'ASNET Engineering' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Product Roadmap' })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: 'Boards' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  // No tab row any more (decision #370); a member gets no Closed boards link either.
  await expect(page.getByRole('navigation', { name: 'Workspace', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Closed boards' })).toHaveCount(0)
})

test('a workspace admin finds Closed boards under the tiles and Audit log on Settings', async ({
  page,
}) => {
  const admin = { ...WORKSPACE, role: 'admin' }
  await signIn(page, { ...HOME, workspaces: [admin] })
  await page.route('http://api.e2e/workspaces/w1', (route) => route.fulfill({ json: admin }))
  await page.goto('/w/w1')

  await expect(page.getByRole('link', { name: 'Closed boards' })).toHaveAttribute(
    'href',
    '/w/w1/closed-boards',
  )
  await page
    .getByRole('navigation', { name: 'Workspaces' })
    .getByRole('link', { name: 'Settings' })
    .click()
  await page.getByRole('link', { name: 'Audit log' }).click()
  await expect(page).toHaveURL(/\/w\/w1\/audit-log$/)
})

test('a workspace the person cannot see shows Page not available', async ({ page }) => {
  await signIn(page, HOME)
  await page.route('http://api.e2e/workspaces/w404', (route) =>
    route.fulfill({
      status: 404,
      json: { error: { code: 'WORKSPACE_NOT_FOUND', message: 'not found' } },
    }),
  )
  await page.goto('/w/w404')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/not available/i)
})

test('a new account sees the empty state and no sidebar', async ({ page }) => {
  await signIn(page, { ...HOME, workspaces: [] })
  await page.goto('/')
  await expect(
    page.getByText('You have no workspace yet. Create one or wait for an invite.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create workspace' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Workspaces' })).toHaveCount(0)
})

const CREATED = { id: 'w9', name: 'Acme', role: 'admin', boardCount: 0, memberCount: 1, boards: [] }

test('browser Back closes only the Create workspace dialog, also after a reload', async ({
  page,
}) => {
  await signIn(page, HOME)
  await page.goto('/')
  const open = page.getByRole('button', { name: 'Create workspace' })
  const dialog = page.getByRole('dialog', { name: 'Create workspace' })

  await open.click()
  await expect(page).toHaveURL(/\/$/) // same URL, no `?index`
  await page.reload()
  await expect(open).toBeVisible()
  await expect(dialog).toBeHidden()

  // The reloaded entry still carries the dialog state: one Back must still close it.
  await open.click()
  await expect(dialog).toBeVisible()
  await page.goBack()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})

test('Back from a newly created workspace returns to Home without the dialog', async ({ page }) => {
  await signIn(page, HOME)
  await page.route('http://api.e2e/workspaces', (route) =>
    route.fulfill({ status: 201, json: CREATED }),
  )
  await page.route('http://api.e2e/workspaces/w9', (route) => route.fulfill({ json: CREATED }))
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: 'Create workspace' })

  await page.getByRole('button', { name: 'Create workspace' }).click()
  await dialog.getByLabel('Workspace name').fill('Acme')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/w\/w9$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Create workspace' })).toBeVisible()
  await expect(dialog).toBeHidden()
})

test('a workspace admin creates a board from the Home tile and lands on it', async ({ page }) => {
  const admin = { ...WORKSPACE, role: 'admin' }
  await signIn(page, { ...HOME, workspaces: [admin] })
  const posted: unknown[] = []
  await page.route('http://api.e2e/workspaces/w1/boards', (route) => {
    posted.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { ...BOARD, id: 'b9', name: 'Roadmap' } })
  })
  await page.route('http://api.e2e/boards/b9/views', (route) => route.fulfill({ status: 204 }))
  await page.goto('/')
  const tile = page.getByRole('button', { name: 'Create new board' })
  const dialog = page.getByRole('dialog', { name: 'Create board' })

  // A click outside closes it without creating anything.
  await tile.click()
  await expect(dialog).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(dialog).toBeHidden()

  await tile.click()
  await dialog.getByLabel('Board title').fill('Roadmap')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/b\/b9$/)
  expect(posted).toEqual([{ name: 'Roadmap', visibility: 'workspace' }])
})
