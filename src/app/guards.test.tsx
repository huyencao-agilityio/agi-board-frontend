import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import { routes } from './router'

const API = import.meta.env.VITE_API_BASE_URL

async function visitSignedOut(path: string) {
  server.use(http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 401 })))
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
  return router.state.location.search
}

describe('RequireAuth', () => {
  it('keeps ?next for a known protected path', async () => {
    expect(await visitSignedOut('/b/x')).toBe('?next=%2Fb%2Fx')
  })

  it('sends an unknown URL to /signin without ?next', async () => {
    expect(await visitSignedOut('/no-such-page')).toBe('')
  })
})
