import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import type { SentInvite, WorkspaceTile } from '../api'
import { formatInviteDate } from '../invite-date'
import WorkspaceMembersPage from './WorkspaceMembersPage'

const API = import.meta.env.VITE_API_BASE_URL
const INVITES = `${API}/workspaces/w1/invites`

const WORKSPACE: WorkspaceTile = {
  id: 'w1',
  name: 'ASNET Engineering',
  role: 'admin',
  boardCount: 0,
  memberCount: 1,
  boards: [],
}

const invite = (over: Partial<SentInvite>): SentInvite => ({
  id: 'i1',
  email: 'dung.pham@asnet.com.vn',
  role: 'member',
  expiresAt: '2026-11-28T09:00:00.000Z',
  lastSentAt: '2026-11-14T09:00:00.000Z',
  expired: false,
  invitedBy: { id: 'u1', fullName: 'Ann Lee' },
  ...over,
})

const fail = (status: number, code: string) =>
  HttpResponse.json({ error: { code, message: code } }, { status })

/** Serves the workspace and a stateful invite list; returns the list so tests can change it. */
function serve(workspace: WorkspaceTile = WORKSPACE, initial: SentInvite[] = []) {
  const state = { invites: initial, listCalls: 0 }
  server.use(
    http.get(`${API}/workspaces/w1`, () => HttpResponse.json(workspace)),
    http.get(INVITES, () => {
      state.listCalls++
      return HttpResponse.json({ items: state.invites, nextCursor: null })
    }),
  )
  return state
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/w/:workspaceId/members',
        element: <WorkspaceMembersPage />,
        errorElement: <p>WEB-13</p>,
      },
    ],
    { initialEntries: ['/w/w1/members'] },
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function openDialog() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Invite' }))
  return { user, dialog: await screen.findByRole('dialog', { name: 'Invite' }) }
}

describe('WorkspaceMembersPage invite dialog (US1)', () => {
  it('shows the title and Invite, without Sent invites when there are none', async () => {
    serve()
    renderPage()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ASNET Engineering' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Invite' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sent invites' })).not.toBeInTheDocument()
  })

  it('opens with an empty email, Member and Send invite disabled', async () => {
    serve()
    renderPage()
    const { dialog } = await openDialog()
    expect(within(dialog).getByLabelText('Email')).toHaveValue('')
    expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Member')
    expect(within(dialog).getByRole('button', { name: 'Send invite' })).toBeDisabled()
  })

  it('shows the invalid email error until the address is fixed', async () => {
    serve()
    renderPage()
    const { user, dialog } = await openDialog()
    const email = within(dialog).getByLabelText('Email')
    await user.type(email, 'abc')
    await user.tab()
    expect(await within(dialog).findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('button', { name: 'Send invite' })).toBeDisabled()

    await user.clear(email)
    await user.type(email, 'new@example.com')
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Send invite' })).toBeEnabled(),
    )
    expect(within(dialog).queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })

  it('sends the invite with the chosen role, closes, toasts and lists it as Pending', async () => {
    const state = serve()
    let body: unknown
    server.use(
      http.post(INVITES, async ({ request }) => {
        body = await request.json()
        const created = invite({ id: 'i9', email: 'new@example.com', role: 'admin' })
        state.invites = [created]
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    renderPage()
    const { user, dialog } = await openDialog()
    await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
    await user.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Admin' }))
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(body).toEqual({ email: 'new@example.com', role: 'admin' })
    expect(screen.getByRole('status')).toHaveTextContent('Invite sent')
    const row = await screen.findByRole('row', { name: /new@example\.com/ })
    expect(within(row).getByText('Admin')).toBeInTheDocument()
    expect(within(row).getByText('Pending')).toBeInTheDocument()
  })

  it('trims the email and leaves the case to the server', async () => {
    serve()
    let body: { email?: string } = {}
    server.use(
      http.post(INVITES, async ({ request }) => {
        body = (await request.json()) as typeof body
        return HttpResponse.json(invite({}), { status: 201 })
      }),
    )
    renderPage()
    const { user, dialog } = await openDialog()
    await user.type(within(dialog).getByLabelText('Email'), '  New@Example.com ')
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))
    await waitFor(() => expect(body.email).toBe('New@Example.com'))
  })

  it('locks the dialog while sending', async () => {
    serve()
    server.use(
      http.post(INVITES, async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    renderPage()
    const { user, dialog } = await openDialog()
    await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByRole('button', { name: 'Sending invite' })).toBeDisabled()
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('readonly')
    expect(within(dialog).getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Invite' })).toBeInTheDocument()
  })

  it.each([
    ['ALREADY_MEMBER', 'This person is already a member.'],
    ['INVITE_PENDING', 'This person already has a pending invite.'],
  ])('shows %s inline and clears it when the email is edited', async (code, message) => {
    serve()
    server.use(http.post(INVITES, () => fail(409, code)))
    renderPage()
    const { user, dialog } = await openDialog()
    const email = within(dialog).getByLabelText('Email')
    await user.type(email, 'ann@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('button', { name: 'Send invite' })).toBeDisabled()

    await user.type(email, 'x')
    expect(within(dialog).queryByText(message)).not.toBeInTheDocument()
  })

  it('keeps the values and shows the banner when sending fails', async () => {
    serve()
    server.use(http.post(INVITES, () => fail(500, 'INTERNAL')))
    renderPage()
    const { user, dialog } = await openDialog()
    await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
    await user.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Admin' }))
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    )
    expect(within(dialog).getByLabelText('Email')).toHaveValue('new@example.com')
    expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Admin')
    expect(within(dialog).getByRole('button', { name: 'Send invite' })).toBeEnabled()
  })

  it('cancels without sending and reopens empty', async () => {
    serve()
    let posts = 0
    server.use(
      http.post(INVITES, () => {
        posts++
        return HttpResponse.json(invite({}), { status: 201 })
      }),
    )
    renderPage()
    const { user, dialog } = await openDialog()
    await user.type(within(dialog).getByLabelText('Email'), 'new@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Invite' }))
    const reopened = await screen.findByRole('dialog', { name: 'Invite' })
    expect(within(reopened).getByLabelText('Email')).toHaveValue('')
    expect(within(reopened).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Member')
    expect(posts).toBe(0)
  })

  it('hides Invite and loads no invites for a workspace member', async () => {
    const state = serve({ ...WORKSPACE, role: 'member' })
    renderPage()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ASNET Engineering' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument()
    expect(state.listCalls).toBe(0)
  })
})

describe('WorkspaceMembersPage sent invites (US2)', () => {
  const PENDING = invite({})
  const EXPIRED = invite({
    id: 'i2',
    email: 'em.vo@asnet.com.vn',
    role: 'admin',
    expired: true,
    expiresAt: '2026-11-02T09:00:00.000Z',
  })
  const row = (email: string) => screen.findByRole('row', { name: new RegExp(email) })

  it('lists email, role, status and expiry date', async () => {
    serve(WORKSPACE, [PENDING, EXPIRED])
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Sent invites' })).toBeInTheDocument()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Email', 'Role', 'Status', 'Expires'])
    const pending = await row('dung.pham')
    expect(within(pending).getByText('Member')).toBeInTheDocument()
    expect(within(pending).getByText('Pending')).toBeInTheDocument()
    expect(within(pending).getByText(formatInviteDate(PENDING.expiresAt))).toBeInTheDocument()
    const expired = await row('em.vo')
    expect(within(expired).getByText('Admin')).toBeInTheDocument()
    expect(within(expired).getByText('Expired')).toBeInTheDocument()
  })

  it('resends an expired invite and shows it Pending again', async () => {
    const state = serve(WORKSPACE, [PENDING, EXPIRED])
    let resent = ''
    server.use(
      http.post(`${INVITES}/:inviteId/resend`, ({ params }) => {
        resent = String(params.inviteId)
        state.invites = [PENDING, { ...EXPIRED, expired: false }]
        return HttpResponse.json(state.invites[1])
      }),
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(within(await row('em.vo')).getByRole('button', { name: 'Resend' }))
    await waitFor(async () => expect(within(await row('em.vo')).getByText('Pending')).toBeVisible())
    expect(resent).toBe('i2')
  })

  it('revokes an invite and hides the section when none are left', async () => {
    const state = serve(WORKSPACE, [PENDING])
    let revoked = ''
    server.use(
      http.delete(`${INVITES}/:inviteId`, ({ params }) => {
        revoked = String(params.inviteId)
        state.invites = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(within(await row('dung.pham')).getByRole('button', { name: 'Revoke' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Sent invites' })).not.toBeInTheDocument(),
    )
    expect(revoked).toBe('i1')
  })

  it('locks only the busy row', async () => {
    serve(WORKSPACE, [PENDING, EXPIRED])
    server.use(
      http.post(`${INVITES}/:inviteId/resend`, async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    renderPage()
    const user = userEvent.setup()
    const busy = await row('dung.pham')
    await user.click(within(busy).getByRole('button', { name: 'Resend' }))
    expect(within(busy).getByRole('button', { name: 'Resend' })).toBeDisabled()
    expect(within(busy).getByRole('button', { name: 'Revoke' })).toBeDisabled()
    const other = await row('em.vo')
    expect(within(other).getByRole('button', { name: 'Resend' })).toBeEnabled()
  })

  it.each([
    ['resend on cooldown', 'post', `${INVITES}/:inviteId/resend`, 'Resend', 429, 'RESEND_COOLDOWN'],
    [
      'revoke of a gone invite',
      'delete',
      `${INVITES}/:inviteId`,
      'Revoke',
      404,
      'INVITE_NOT_FOUND',
    ],
  ] as const)(
    'shows the page banner on a failed %s and keeps the row',
    async (_name, method, url, button, status, code) => {
      serve(WORKSPACE, [PENDING])
      server.use(http[method](url, () => fail(status, code)))
      renderPage()
      const user = userEvent.setup()
      await user.click(within(await row('dung.pham')).getByRole('button', { name: button }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
      expect(within(await row('dung.pham')).getByText('Pending')).toBeInTheDocument()
    },
  )

  it('shows the banner when a revoked invite is already gone and its row disappears', async () => {
    const state = serve(WORKSPACE, [PENDING])
    server.use(
      http.delete(`${INVITES}/:inviteId`, () => {
        state.invites = [] // accepted meanwhile: the refetch drops the row
        return fail(404, 'INVITE_NOT_FOUND')
      }),
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(within(await row('dung.pham')).getByRole('button', { name: 'Revoke' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Sent invites' })).not.toBeInTheDocument(),
    )
  })

  it('keeps the page when a background refetch fails', async () => {
    const state = serve(WORKSPACE, [PENDING])
    server.use(
      http.post(`${INVITES}/:inviteId/resend`, () => {
        server.use(http.get(INVITES, () => fail(500, 'INTERNAL')))
        return HttpResponse.json(PENDING)
      }),
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(within(await row('dung.pham')).getByRole('button', { name: 'Resend' }))
    await waitFor(() => expect(state.listCalls).toBeGreaterThan(0))
    expect(screen.getByRole('heading', { level: 1, name: 'ASNET Engineering' })).toBeInTheDocument()
    expect(await row('dung.pham')).toBeInTheDocument()
  })

  it('drops the banner when the person does something else', async () => {
    serve(WORKSPACE, [PENDING])
    server.use(
      http.post(`${INVITES}/:inviteId/resend`, () => fail(500, 'INTERNAL')),
      http.delete(`${INVITES}/:inviteId`, async () => {
        await delay('infinite')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderPage()
    const user = userEvent.setup()
    await user.click(within(await row('dung.pham')).getByRole('button', { name: 'Resend' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Invite' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
