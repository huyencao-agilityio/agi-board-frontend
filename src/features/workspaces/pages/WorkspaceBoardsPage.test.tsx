import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import type { BoardTile, WorkspaceTile } from '../api'
import WorkspaceBoardsPage from './WorkspaceBoardsPage'

const API = import.meta.env.VITE_API_BASE_URL

const board = (id: string, name: string): BoardTile => ({
  id,
  name,
  workspaceId: 'w1',
  workspaceName: 'Team',
  visibility: 'workspace',
  backgroundKey: null,
  backgroundThumbnailUrl: null,
  backgroundColor: '#0d9488',
  starred: false,
})

const WORKSPACE: WorkspaceTile = {
  id: 'w1',
  name: 'Team',
  role: 'member',
  boardCount: 2,
  memberCount: 3,
  boards: [board('b2', 'Zeta'), board('b1', 'alpha')],
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/w/:workspaceId', element: <WorkspaceBoardsPage /> }],
    {
      initialEntries: ['/w/w1'],
    },
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const serve = (body: WorkspaceTile) =>
  server.use(http.get(`${API}/workspaces/w1`, () => HttpResponse.json(body)))

describe('WorkspaceBoardsPage', () => {
  it('shows the workspace name and its accessible boards by name', async () => {
    serve(WORKSPACE)
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Team' })).toBeInTheDocument()
    const links = within(screen.getByRole('list')).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['alpha', 'Zeta'])
    expect(links[0]).toHaveAttribute('href', '/b/b1')
  })

  it('shows the preset thumbnail from the API, or the board color when there is none', async () => {
    serve({
      ...WORKSPACE,
      boards: [
        {
          ...board('b1', 'alpha'),
          backgroundKey: 'ocean',
          backgroundThumbnailUrl: '/api/v1/board-backgrounds/ocean/thumbnail',
        },
        board('b2', 'Zeta'),
      ],
    })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Team' })
    const [withPhoto, withColor] = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(within(withPhoto).getByRole('presentation', { hidden: true })).toHaveAttribute(
      'src',
      new URL('/api/v1/board-backgrounds/ocean/thumbnail', API).href,
    )
    expect(within(withColor).queryByRole('presentation', { hidden: true })).not.toBeInTheDocument()
  })

  it.each([
    ['member', 'member' as const, true],
    ['guest', null, true],
    ['admin', 'admin' as const, false],
  ])('shows "No boards yet." in an empty workspace to a %s: %s', async (_who, role, shown) => {
    serve({ ...WORKSPACE, role, boards: [], boardCount: 0 })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Team' })
    expect(screen.queryByText('No boards yet.') !== null).toBe(shown)
  })

  it.each([
    ['admin', 'admin' as const, true],
    ['member', 'member' as const, false],
    ['guest', null, false],
  ])('shows the Closed boards link to a workspace %s: %s', async (_who, role, shown) => {
    serve({ ...WORKSPACE, role })
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Team' })
    const link = screen.queryByRole('link', { name: 'Closed boards' })
    expect(link !== null).toBe(shown)
    if (link) expect(link).toHaveAttribute('href', '/w/w1/closed-boards')
  })

  it('shows the generic error instead of loading forever when the request fails', async () => {
    server.use(
      http.get(`${API}/workspaces/w1`, () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'x' } }, { status: 500 }),
      ),
    )
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('WorkspaceBoardsPage Create new board tile (#23)', () => {
  it('shows the tile to the workspace admin instead of the empty line', async () => {
    serve({ ...WORKSPACE, role: 'admin', boardCount: 0, boards: [] })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Create new board' })).toBeInTheDocument()
    expect(screen.queryByText('No boards yet.')).not.toBeInTheDocument()
  })

  it('opens Create board with the workspace name read-only', async () => {
    serve({ ...WORKSPACE, role: 'admin' })
    renderPage()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Create new board' }))
    const dialog = screen.getByRole('dialog', { name: 'Create board' })
    expect(within(dialog).getByRole('textbox', { name: 'Workspace' })).toHaveValue('Team')
  })

  it('shows no tile to an ordinary member', async () => {
    serve(WORKSPACE)
    renderPage()
    expect(await screen.findByRole('link', { name: 'alpha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create new board' })).not.toBeInTheDocument()
  })
})
