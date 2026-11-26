import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import { routes } from '../router'

const API = import.meta.env.VITE_API_BASE_URL
const ME = {
  user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Lee', systemRole: 'USER' },
  next: 'home',
}

/** Signed in at Home; logout answers with `respond`. Returns what the server saw. */
async function signedInHome(respond: () => Response | Promise<Response>) {
  const seen = { me: 0, logouts: [] as (string | null)[] }
  server.use(
    http.get(`${API}/auth/me`, () => {
      seen.me++
      return HttpResponse.json(ME)
    }),
    http.post(`${API}/auth/logout`, ({ request }) => {
      seen.logouts.push(request.headers.get('X-CSRF-Token'))
      return respond()
    }),
  )
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Ann Lee' }))
  await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
  await screen.findByRole('heading', { name: 'Sign in' })
  return { router, seen }
}

describe('AppLayout Log out', () => {
  afterEach(() => {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('posts logout with the CSRF header and opens a plain Sign in', async () => {
    document.cookie = 'csrf_token=abc'
    const { router, seen } = await signedInHome(() => new HttpResponse(null, { status: 204 }))
    // The request runs in the background, so it may reach the server after Sign in shows.
    await waitFor(() => expect(seen.logouts).toEqual(['abc']))
    expect(router.state.location.pathname).toBe('/signin')
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    ['a network error', () => HttpResponse.error()],
    ['a 500', () => HttpResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 })],
    ['a request that never answers', () => new Promise<Response>(() => {})],
  ])('still signs out locally on %s', async (_name, respond) => {
    const { router, seen } = await signedInHome(respond)
    expect(router.state.location.pathname).toBe('/signin')
    // The session is seeded as signed out, so a still-valid cookie is not asked about again.
    expect(seen.me).toBe(1)
  })
})

describe('AppLayout account button', () => {
  function home(avatarUrl: string | null) {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({ ...ME, user: { ...ME.user, avatarUrl } }),
      ),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />
      </QueryClientProvider>,
    )
    return screen.findByRole('button', { name: 'Ann Lee' })
  }

  it('shows initials next to the name without a photo', async () => {
    const account = await home(null)
    expect(account).toHaveTextContent('AL')
    expect(within(account).queryByRole('img', { hidden: true })).not.toBeInTheDocument()
  })

  it('shows the photo when the person has one', async () => {
    const account = await home('/api/v1/users/me/avatar?v=3')
    expect(within(account).getByRole('img', { hidden: true })).toHaveAttribute(
      'src',
      new URL('/api/v1/users/me/avatar?v=3', API).href,
    )
  })
})
