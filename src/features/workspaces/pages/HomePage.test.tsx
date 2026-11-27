import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import type { BoardTile, Home, PendingInvite, WorkspaceTile } from '../api'
import HomePage from './HomePage'

const API = import.meta.env.VITE_API_BASE_URL
const GENERIC = 'Something went wrong. Try again.'
const EMPTY_TEXT = 'You have no workspace yet. Create one or wait for an invite.'
const EXPIRED = 'This invite has expired. Ask an admin to resend it.'

const board = (id: string, name: string, extra: Partial<BoardTile> = {}): BoardTile => ({
  id,
  name,
  workspaceId: 'w1',
  workspaceName: 'Team',
  visibility: 'private',
  backgroundKey: null,
  backgroundThumbnailUrl: null,
  backgroundColor: '#0d9488',
  starred: false,
  ...extra,
})

const workspace = (
  id: string,
  name: string,
  extra: Partial<WorkspaceTile> = {},
): WorkspaceTile => ({
  id,
  name,
  role: 'member',
  boardCount: 0,
  memberCount: 1,
  boards: [],
  ...extra,
})

const invite = (id: string, extra: Partial<PendingInvite> = {}): PendingInvite => ({
  id,
  type: 'workspace',
  workspace: { id: 'w9', name: 'ASNET Engineering' },
  board: null,
  role: 'member',
  invitedBy: { fullName: 'Binh Tran' },
  expiresAt: '2026-12-10T00:00:00.000Z',
  expired: false,
  ...extra,
})

const home = (extra: Partial<Home> = {}): Home => ({
  starred: [],
  recent: [],
  workspaces: [workspace('w1', 'Team')],
  invites: [],
  hasArchivedWorkspaces: false,
  ...extra,
})

const fail = (status: number, code: string) =>
  HttpResponse.json({ error: { code, message: code } }, { status })

/** Serves `/home` from a value the test can swap (e.g. inside a mutation handler); counts requests. */
function serveHome(initial: Home) {
  const state = { current: initial, gets: 0 }
  server.use(
    http.get(`${API}/home`, () => {
      state.gets++
      return HttpResponse.json(state.current)
    }),
  )
  return state
}

function Where() {
  return <p>at {useLocation().pathname}</p>
}

function renderHome() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomePage /> },
      { path: '*', element: <Where /> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup() }
}

/** The page content without the Workspace sidebar, which repeats `Your workspaces`. */
const content = () =>
  screen.getByRole('heading', { level: 1, name: 'Home' }).parentElement as HTMLElement

const sectionOf = (heading: string) =>
  within(content())
    .getByRole('heading', { level: 2, name: heading })
    .closest('section') as HTMLElement

const linkNames = (list: HTMLElement) =>
  within(list)
    .getAllByRole('link')
    .map((a) => a.textContent)

afterEach(() => {
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('HomePage workspaces and boards (US1)', () => {
  it('shows a loading state, then own and guest workspaces A to Z with their counts', async () => {
    const served = serveHome(
      home({
        workspaces: [
          workspace('w2', 'Beta', { boardCount: 1, memberCount: 1 }),
          workspace('w1', 'alpha', { role: 'admin', boardCount: 3, memberCount: 5 }),
          workspace('w3', 'Lab', { role: null, boardCount: 1, memberCount: null }),
        ],
      }),
    )
    renderHome()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()

    await screen.findByRole('navigation', { name: 'Workspaces' })
    const own = sectionOf('Your workspaces')
    const headers = within(own).getAllByRole('heading', { level: 3 })
    expect(headers.map((h) => h.textContent)).toEqual(['alpha', 'Beta'])
    expect(within(own).getByText('3 boards · 5 members')).toBeInTheDocument()
    expect(within(own).getByText('1 board · 1 member')).toBeInTheDocument()

    const guest = sectionOf('Guest workspaces')
    expect(within(guest).getByText('1 board')).toBeInTheDocument()
    expect(within(guest).getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/w/w3')
    // Sidebar and content share one request.
    expect(served.gets).toBe(1)
  })

  it('lists a workspace boards by name with their visibility and links', async () => {
    serveHome(
      home({
        workspaces: [
          workspace('w1', 'Team', {
            boards: [board('b2', 'Zeta', { visibility: 'workspace' }), board('b1', 'apple')],
          }),
        ],
      }),
    )
    renderHome()
    await screen.findByRole('navigation', { name: 'Workspaces' })
    const list = within(sectionOf('Your workspaces')).getByRole('list')
    expect(linkNames(list)).toEqual(['apple', 'Zeta'])
    expect(within(list).getByRole('link', { name: 'apple' })).toHaveAttribute('href', '/b/b1')
    expect(within(list).getByText('Private')).toBeInTheDocument()
    expect(within(list).getByText('Workspace')).toBeInTheDocument()
  })

  it('opens the workspace from its name', async () => {
    serveHome(home())
    const { user } = renderHome()
    await screen.findByRole('navigation', { name: 'Workspaces' })
    await user.click(within(sectionOf('Your workspaces')).getByRole('link', { name: 'Team' }))
    expect(await screen.findByText('at /w/w1')).toBeInTheDocument()
  })

  it('shows the empty state with no sidebar or board sections', async () => {
    serveHome(home({ workspaces: [], starred: [board('b1', 'Old', { starred: true })] }))
    renderHome()
    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Starred boards' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recently viewed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Workspaces' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View archived workspaces' })).not.toBeInTheDocument()
  })

  it('shows View archived workspaces under the empty message for an archived-workspace admin', async () => {
    serveHome(home({ workspaces: [], hasArchivedWorkspaces: true }))
    renderHome()
    expect(await screen.findByRole('link', { name: 'View archived workspaces' })).toHaveAttribute(
      'href',
      '/archived-workspaces',
    )
  })

  it('shows the generic error when Home fails to load', async () => {
    server.use(http.get(`${API}/home`, () => fail(500, 'INTERNAL')))
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
  })
})

describe('HomePage Create workspace (US2)', () => {
  it('keeps Create disabled until a name is entered and flags a blank name', async () => {
    serveHome(home())
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Create workspace' }))
    const dialog = screen.getByRole('dialog', { name: 'Create workspace' })
    const field = within(dialog).getByLabelText('Workspace name')
    expect(field).toHaveFocus()
    const create = within(dialog).getByRole('button', { name: 'Create' })
    expect(create).toBeDisabled()

    await user.type(field, '   ')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a workspace name.')
    expect(create).toBeDisabled()
    await user.type(field, 'x')
    expect(create).toBeEnabled()
  })

  it('creates the trimmed name with the CSRF header and opens the new workspace', async () => {
    document.cookie = 'csrf_token=abc'
    const seen: { body: unknown; csrf: string | null }[] = []
    serveHome(home())
    server.use(
      http.post(`${API}/workspaces`, async ({ request }) => {
        seen.push({ body: await request.json(), csrf: request.headers.get('X-CSRF-Token') })
        return HttpResponse.json(workspace('w7', 'Team A', { role: 'admin' }), { status: 201 })
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Create workspace' }))
    await user.type(screen.getByLabelText('Workspace name'), '  Team A  {Enter}')
    expect(await screen.findByText('at /w/w7')).toBeInTheDocument()
    expect(seen).toEqual([{ body: { name: 'Team A' }, csrf: 'abc' }])
  })

  it('locks the dialog while creating', async () => {
    serveHome(home())
    server.use(
      http.post(`${API}/workspaces`, async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Create workspace' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Workspace name'), 'Team A')
    await user.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(within(dialog).getByLabelText('Workspace name')).toHaveAttribute('readonly')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not create a name the server refuses as too long (AC 1.3)', async () => {
    let created = 0
    serveHome(home())
    server.use(
      http.post(`${API}/workspaces`, () => {
        created++
        return fail(400, 'VALIDATION_FAILED')
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Create workspace' }))
    await user.click(screen.getByLabelText('Workspace name'))
    await user.paste('x'.repeat(101))
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
    expect(screen.getByRole('dialog', { name: 'Create workspace' })).toBeInTheDocument()
    expect(created).toBe(1)
  })

  it('shows the banner on failure, keeps the name, and clears it on edit and on reopen', async () => {
    serveHome(home())
    server.use(http.post(`${API}/workspaces`, () => fail(500, 'INTERNAL')))
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Create workspace' }))
    const field = screen.getByLabelText('Workspace name')
    await user.type(field, 'Team A')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
    expect(field).toHaveValue('Team A')
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled()

    await user.type(field, 's')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Workspace name')).toHaveValue('')
  })
})

describe('HomePage Starred boards and Recently viewed (US3)', () => {
  it('lists starred boards A to Z, then recently viewed in server order', async () => {
    serveHome(
      home({
        starred: [board('s1', 'Beta', { starred: true }), board('s2', 'alpha', { starred: true })],
        recent: [board('r1', 'Zed'), board('r2', 'Ann')],
      }),
    )
    renderHome()
    await screen.findByRole('heading', { name: 'Starred boards' })
    const headings = within(content())
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(headings.indexOf('Starred boards')).toBeLessThan(headings.indexOf('Recently viewed'))
    expect(linkNames(within(sectionOf('Starred boards')).getByRole('list'))).toEqual([
      'alpha',
      'Beta',
    ])
    expect(linkNames(within(sectionOf('Recently viewed')).getByRole('list'))).toEqual([
      'Zed',
      'Ann',
    ])
  })

  it('hides both sections when empty', async () => {
    serveHome(home())
    renderHome()
    await screen.findByRole('navigation', { name: 'Workspaces' })
    expect(screen.queryByRole('heading', { name: 'Starred boards' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recently viewed' })).not.toBeInTheDocument()
  })

  it('stars a board at once and sends PUT with the CSRF header', async () => {
    document.cookie = 'csrf_token=abc'
    const csrf: (string | null)[] = []
    serveHome(home({ recent: [board('b1', 'Plan')] }))
    server.use(
      http.put(`${API}/boards/b1/star`, async ({ request }) => {
        csrf.push(request.headers.get('X-CSRF-Token'))
        await delay('infinite')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Star board' }))
    const starred = await within(sectionOf('Starred boards')).findByRole('button', {
      name: 'Unstar board',
    })
    expect(starred).toHaveAttribute('aria-pressed', 'true')
    expect(csrf).toEqual(['abc'])
  })

  it('keeps a starred board in Recently viewed as well (AC 2.2)', async () => {
    serveHome(home({ recent: [board('b1', 'Plan')] }))
    server.use(
      http.put(`${API}/boards/b1/star`, async () => {
        await delay('infinite')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Star board' }))
    await within(sectionOf('Starred boards')).findByRole('link', { name: 'Plan' })
    const recent = within(sectionOf('Recently viewed'))
    expect(recent.getByRole('link', { name: 'Plan' })).toBeInTheDocument()
    expect(recent.getByRole('button', { name: 'Unstar board' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('undoes a failed star silently', async () => {
    serveHome(home({ recent: [board('b1', 'Plan')] }))
    server.use(http.put(`${API}/boards/b1/star`, () => fail(500, 'INTERNAL')))
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Star board' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Star board' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    expect(screen.queryByRole('heading', { name: 'Starred boards' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('unstars with DELETE', async () => {
    let deleted = 0
    serveHome(home({ starred: [board('b1', 'Plan', { starred: true })] }))
    server.use(
      http.delete(`${API}/boards/b1/star`, () => {
        deleted++
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Unstar board' }))
    await waitFor(() => expect(deleted).toBe(1))
  })
})

describe('HomePage pending invites (US4)', () => {
  it('shows workspace and board invites with inviter and role', async () => {
    serveHome(
      home({
        invites: [
          invite('i1'),
          invite('i2', {
            type: 'board',
            workspace: { id: 'w8', name: 'Training Lab' },
            board: { id: 'b8', name: 'Mentor review' },
            invitedBy: { fullName: 'Chi Le' },
            role: 'admin',
          }),
        ],
      }),
    )
    renderHome()
    await screen.findByRole('heading', { name: 'Pending invites' })
    const [first, second] = within(sectionOf('Pending invites')).getAllByRole('listitem')
    expect(first).toHaveTextContent('ASNET Engineering')
    expect(first).toHaveTextContent('Invited by Binh Tran · Role: Member')
    expect(second).toHaveTextContent('Mentor review')
    expect(second).toHaveTextContent('Training Lab')
    expect(second).toHaveTextContent('Invited by Chi Le · Role: Admin')
  })

  it('locks only the accepting row, then shows the joined workspace', async () => {
    document.cookie = 'csrf_token=abc'
    const csrf: (string | null)[] = []
    let release: () => void = () => {}
    const served = serveHome(
      home({
        workspaces: [],
        invites: [invite('i1'), invite('i2', { workspace: { id: 'w5', name: 'Other' } })],
      }),
    )
    server.use(
      http.post(`${API}/invites/i1/accept`, async ({ request }) => {
        csrf.push(request.headers.get('X-CSRF-Token'))
        await new Promise<void>((r) => (release = r))
        served.current = home({ workspaces: [workspace('w9', 'ASNET Engineering')] })
        return HttpResponse.json({ workspaceId: 'w9', boardId: null })
      }),
    )
    const { user } = renderHome()
    await screen.findByRole('heading', { name: 'Pending invites' })
    const [row1, row2] = within(sectionOf('Pending invites')).getAllByRole('listitem')
    await user.click(within(row1).getByRole('button', { name: 'Accept' }))

    expect(await within(row1).findByRole('button', { name: 'Accepting invite' })).toBeDisabled()
    expect(within(row1).getByRole('button', { name: 'Decline' })).toBeDisabled()
    expect(within(row2).getByRole('button', { name: 'Accept' })).toBeEnabled()

    release()
    await screen.findByRole('navigation', { name: 'Workspaces' })
    const joined = within(sectionOf('Your workspaces')).getByRole('link', {
      name: 'ASNET Engineering',
    })
    expect(joined).toHaveAttribute('href', '/w/w9')
    expect(screen.queryByRole('heading', { name: 'Pending invites' })).not.toBeInTheDocument()
    expect(csrf).toEqual(['abc'])
  })

  it('disables Accept on an expired invite but still declines it', async () => {
    let declined = 0
    const served = serveHome(home({ invites: [invite('i1', { expired: true })] }))
    server.use(
      http.post(`${API}/invites/i1/decline`, () => {
        declined++
        served.current = home()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderHome()
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(screen.queryByText(EXPIRED)).not.toBeInTheDocument())
    expect(declined).toBe(1)
  })

  it('shows the row error when accepting fails and enables the buttons again', async () => {
    serveHome(home({ invites: [invite('i1')] }))
    server.use(http.post(`${API}/invites/i1/accept`, () => fail(500, 'INTERNAL')))
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Accept' }))
    const row = within(sectionOf('Pending invites')).getByRole('listitem')
    expect(await within(row).findByRole('alert')).toHaveTextContent(GENERIC)
    expect(within(row).getByRole('button', { name: 'Accept' })).toBeEnabled()
    expect(within(row).getByRole('button', { name: 'Decline' })).toBeEnabled()
  })

  it('shows only the expired text when the invite expired before Accept', async () => {
    const served = serveHome(home({ invites: [invite('i1')] }))
    server.use(
      http.post(`${API}/invites/i1/accept`, () => {
        served.current = home({ invites: [invite('i1', { expired: true })] })
        return fail(409, 'INVITE_EXPIRED')
      }),
    )
    const { user } = renderHome()
    await user.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
  })

  it('shows invites even in the empty state', async () => {
    serveHome(home({ workspaces: [], invites: [invite('i1')] }))
    renderHome()
    expect(await screen.findByRole('heading', { name: 'Pending invites' })).toBeInTheDocument()
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument()
  })
})
