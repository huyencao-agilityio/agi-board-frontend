import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/server'
import BoardPage from './BoardPage'

// The board socket is out of scope here; this test is about recording the view.
vi.mock('@/lib/ws', () => ({ useBoardSocket: () => {} }))

const API = import.meta.env.VITE_API_BASE_URL

function renderBoard(respond: () => Response) {
  const calls: string[] = []
  server.use(
    http.post(`${API}/boards/:boardId/views`, ({ params }) => {
      calls.push(String(params.boardId))
      return respond()
    }),
  )
  const router = createMemoryRouter([{ path: '/b/:boardId', element: <BoardPage /> }], {
    initialEntries: ['/b/b1'],
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return calls
}

describe('BoardPage records a view (AC 6.2)', () => {
  it('posts one view for the opened board', async () => {
    const calls = renderBoard(() => new HttpResponse(null, { status: 204 }))
    await waitFor(() => expect(calls).toEqual(['b1']))
  })

  it('keeps the board on screen when the view cannot be recorded', async () => {
    const calls = renderBoard(() =>
      HttpResponse.json({ error: { code: 'BOARD_NOT_FOUND', message: 'x' } }, { status: 404 }),
    )
    await waitFor(() => expect(calls).toEqual(['b1']))
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument()
  })
})
