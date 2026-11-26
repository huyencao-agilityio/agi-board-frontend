import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import { routes } from './router'

const API = import.meta.env.VITE_API_BASE_URL

const SIGNED_IN = () =>
  HttpResponse.json({
    user: { id: 'u1', email: 'a@b.co', fullName: 'An', systemRole: 'USER' },
    next: 'home',
  })

function visit(path: string, respond: () => Response | Promise<Response>) {
  server.use(http.get(`${API}/auth/me`, respond))
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

/** An /auth/me answer held until `answer()` is called. */
function held() {
  let answer = () => {}
  const respond = () =>
    new Promise<Response>((resolve) => {
      answer = () => resolve(new HttpResponse(null, { status: 401 }))
    })
  return { respond, answer: () => answer() }
}

async function signinSearch(respond: () => Response) {
  const router = visit('/b/x', respond)
  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
  return router.state.location.search
}

describe('RequireAuth', () => {
  it('sends a protected path to a plain /signin', async () => {
    expect(await signinSearch(() => new HttpResponse(null, { status: 401 }))).toBe('')
  })

  it('sends an unknown URL to a plain /signin', async () => {
    const router = visit('/no-such-page', () => new HttpResponse(null, { status: 401 }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect(router.state.location.search).toBe('')
  })

  it('says "signed out" when the session ended without a logout', async () => {
    const ended = () => HttpResponse.json({ error: { code: 'SESSION_ENDED' } }, { status: 401 })
    expect(await signinSearch(ended)).toBe('?notice=signed-out')
  })
})

describe('RequireGuest', () => {
  it.each(['/signin', '/signup', '/verify-email', '/forgot-password'])(
    'sends a signed-in person from %s to Home',
    async (path) => {
      const router = visit(path, SIGNED_IN)
      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    },
  )

  it('renders no auth card until the session is known', async () => {
    const { respond, answer } = held()
    visit('/signin', respond)
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    await waitFor(() => {
      answer()
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    })
  })

  it('keeps the page and what was typed when a failed check runs again on focus', async () => {
    let calls = 0
    visit('/forgot-password', () => {
      calls += 1
      return calls === 1 ? HttpResponse.error() : new Promise(() => {})
    })
    await userEvent.type(await screen.findByLabelText('Email'), 'a@b.co')
    await act(async () => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
      // One task, for TanStack Query to notify its observers.
      await new Promise((resolve) => setTimeout(resolve))
    })
    focusManager.setFocused(undefined)
    await waitFor(() => expect(calls).toBe(2))
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.co')
  })
})

describe('WaitForSession', () => {
  const heading = { name: 'Reset password' }

  it('waits for the first GET, which sets the CSRF cookie', async () => {
    const { respond, answer } = held()
    visit('/reset-password', respond)
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    await waitFor(() => {
      answer()
      expect(screen.getByRole('heading', heading)).toBeInTheDocument()
    })
  })

  it.each([
    ['a signed-in person', SIGNED_IN],
    ['a failing API', () => HttpResponse.error()],
  ])('lets %s through', async (_name, respond) => {
    const router = visit('/reset-password', respond)
    expect(await screen.findByRole('heading', heading)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/reset-password')
  })

  it('takes a signed-in person to Sign in with the notice after a reset, not Home', async () => {
    server.use(
      http.post(`${API}/auth/reset-password/check`, () =>
        HttpResponse.json({ email: 'jane@example.com' }),
      ),
      http.post(`${API}/auth/reset-password`, () => HttpResponse.json({ next: 'sign-in' })),
    )
    const router = visit('/reset-password#token=tok', SIGNED_IN)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('New password'), 'horse battery 1')
    await user.type(screen.getByLabelText('Confirm new password'), 'horse battery 1')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(
      await screen.findByText('Password updated. Sign in with your new password.'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signin')
    expect(router.state.location.search).toBe('?notice=password-updated')
  })
})
