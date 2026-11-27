import { expect, test, type Page } from '@playwright/test'

const ME = {
  user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Lee', systemRole: 'USER' },
  next: 'home',
}
const WORKSPACE = {
  id: 'w1',
  name: 'ASNET Engineering',
  role: 'admin',
  boardCount: 0,
  memberCount: 1,
  boards: [],
}
const HOME = {
  starred: [],
  recent: [],
  workspaces: [WORKSPACE],
  invites: [],
  hasArchivedWorkspaces: false,
}

/** Signed-in admin with a stateful invite list behind the card #21 endpoints. */
async function mockMembers(page: Page) {
  let invites: object[] = []
  await page.route('http://api.e2e/auth/me', (route) => route.fulfill({ json: ME }))
  await page.route('http://api.e2e/home', (route) => route.fulfill({ json: HOME }))
  await page.route('http://api.e2e/workspaces/w1', (route) => route.fulfill({ json: WORKSPACE }))
  await page.route('http://api.e2e/workspaces/w1/invites**', async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'GET') return route.fulfill({ json: { items: invites, nextCursor: null } })
    if (method === 'POST' && request.url().endsWith('/resend'))
      return route.fulfill({ json: invites[0] })
    if (method === 'POST') {
      const { email, role } = request.postDataJSON() as { email: string; role: string }
      const created = {
        id: 'i1',
        email,
        role,
        expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        lastSentAt: new Date().toISOString(),
        expired: false,
        invitedBy: { id: 'u1', fullName: 'Ann Lee' },
      }
      invites = [created]
      return route.fulfill({ status: 201, json: created })
    }
    invites = [] // DELETE (revoke)
    return route.fulfill({ status: 204 })
  })
}

test('an admin sends, resends and revokes a workspace invite', async ({ page }) => {
  await mockMembers(page)
  await page.goto('/w/w1/members')

  await page.getByRole('button', { name: 'Invite' }).click()
  const dialog = page.getByRole('dialog', { name: 'Invite' })
  await dialog.getByLabel('Email').fill('new@example.com')
  await dialog.getByRole('button', { name: 'Send invite' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Invite sent')).toBeVisible()
  const row = page.getByRole('row', { name: /new@example\.com/ })
  await expect(row.getByText('Pending')).toBeVisible()
  await expect(row.getByText('Member')).toBeVisible()

  await row.getByRole('button', { name: 'Resend' }).click()
  await expect(row.getByText('Pending')).toBeVisible()

  await row.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByRole('heading', { name: 'Sent invites' })).toBeHidden()
})
