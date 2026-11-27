import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import type { Home, WorkspaceTile } from '../api'
import { useHome } from '../hooks'
import { WorkspaceSidebar } from './WorkspaceSidebar'

const API = import.meta.env.VITE_API_BASE_URL

const ws = (id: string, name: string, role: WorkspaceTile['role']): WorkspaceTile => ({
  id,
  name,
  role,
  boardCount: 0,
  memberCount: role ? 1 : null,
  boards: [],
})

const HOME: Home = {
  starred: [],
  recent: [],
  workspaces: [ws('w2', 'beta', 'member'), ws('w1', 'Alpha', 'admin'), ws('w3', 'Lab', null)],
  invites: [],
  hasArchivedWorkspaces: false,
}

function renderSidebar(home: Home, at = '/') {
  server.use(http.get(`${API}/home`, () => HttpResponse.json(home)))
  const router = createMemoryRouter(
    [
      { path: '/', element: <WorkspaceSidebar /> },
      { path: '/w/:workspaceId/*', element: <WorkspaceSidebar /> },
    ],
    { initialEntries: [at] },
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), router }
}

const group = (title: string) =>
  screen.getByRole('heading', { name: title }).parentElement as HTMLElement

describe('WorkspaceSidebar', () => {
  it('groups own and guest workspaces A to Z, all collapsed', async () => {
    renderSidebar(HOME)
    await screen.findByRole('navigation', { name: 'Workspaces' })
    const own = within(group('Your workspaces')).getAllByRole('button')
    expect(own.map((b) => b.textContent)).toEqual(['AAlpha', 'Bbeta'])
    expect(
      within(group('Guest workspaces')).getByRole('button', { name: 'Lab' }),
    ).toBeInTheDocument()
    for (const b of screen.getAllByRole('button'))
      expect(b).toHaveAttribute('aria-expanded', 'false')
    // Only the Home link shows while every row is collapsed.
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Home'])
  })

  it('highlights Home on Home only (decision #378)', async () => {
    renderSidebar(HOME)
    const home = await screen.findByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')
    expect(home).toHaveAttribute('aria-current', 'page')
  })

  it('links back to Home without highlighting it on a workspace page', async () => {
    renderSidebar(HOME, '/w/w1/members')
    const home = await screen.findByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')
    expect(home).not.toHaveAttribute('aria-current')
  })

  it('shows Boards, Members and Settings to a workspace admin', async () => {
    const { user } = renderSidebar(HOME)
    await user.click(await screen.findByRole('button', { name: /Alpha/ }))
    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/w/w1')
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/w/w1/members')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/w/w1/settings')
  })

  it.each([
    ['member', /beta/],
    ['guest', /Lab/],
  ])('shows only Boards to a %s', async (_role, name) => {
    const { user } = renderSidebar(HOME)
    await user.click(await screen.findByRole('button', { name }))
    expect(screen.getByRole('link', { name: 'Boards' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('shows View archived workspaces only for an archived-workspace admin', async () => {
    renderSidebar({ ...HOME, hasArchivedWorkspaces: true })
    expect(await screen.findByRole('link', { name: 'View archived workspaces' })).toHaveAttribute(
      'href',
      '/archived-workspaces',
    )
  })

  it('hides View archived workspaces otherwise', async () => {
    renderSidebar(HOME)
    await screen.findByRole('navigation', { name: 'Workspaces' })
    expect(screen.queryByRole('link', { name: 'View archived workspaces' })).not.toBeInTheDocument()
  })

  it('expands the current workspace and highlights the current page', async () => {
    renderSidebar(HOME, '/w/w1/members')
    expect(await screen.findByRole('link', { name: 'Members' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Boards' })).not.toHaveAttribute('aria-current')
  })

  it('keeps every open row open after clicking another workspace Boards link', async () => {
    const { user } = renderSidebar(HOME, '/w/w1')
    await screen.findByRole('link', { name: 'Members' })
    await user.click(screen.getByRole('button', { name: 'beta' }))
    // Two rows open now: Alpha (current) and beta; beta's Boards is the second Boards link.
    await user.click(screen.getAllByRole('link', { name: 'Boards' })[1])

    expect(screen.getByRole('button', { name: 'beta' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Lab' })).toHaveAttribute('aria-expanded', 'false')
    const boards = screen.getAllByRole('link', { name: 'Boards' })
    expect(boards[0]).not.toHaveAttribute('aria-current')
    expect(boards[1]).toHaveAttribute('aria-current', 'page')
  })

  it('does not open a row the person closed when moving to another workspace', async () => {
    const { user, router } = renderSidebar(HOME, '/w/w1')
    await screen.findByRole('link', { name: 'Members' })
    await user.click(screen.getByRole('button', { name: 'Alpha' }))
    await act(() => router.navigate('/w/w2'))
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'beta' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('expands the new current workspace when the URL changes without remounting', async () => {
    const { router } = renderSidebar(HOME, '/w/w1')
    await screen.findByRole('link', { name: 'Members' })
    await act(() => router.navigate('/w/w3'))
    expect(screen.getByRole('button', { name: 'Lab' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders nothing without an active workspace', async () => {
    server.use(http.get(`${API}/home`, () => HttpResponse.json({ ...HOME, workspaces: [] })))
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <>
            <WorkspaceSidebar />
            <Loaded />
          </>
        ),
      },
    ])
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await screen.findByText('loaded')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})

/** Shows when /home has answered, so the test knows the sidebar had its data. */
function Loaded() {
  return useHome().data ? <p>loaded</p> : null
}
