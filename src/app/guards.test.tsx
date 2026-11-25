import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('WaitForSession', () => {
  function visit(respond: () => Response | Promise<Response>) {
    server.use(http.get(`${API}/auth/me`, respond))
    const router = createMemoryRouter(routes, { initialEntries: ['/forgot-password'] })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    return router
  }
  const heading = { name: 'Forgot password' }

  it('waits for the first GET, which sets the CSRF cookie', async () => {
    let answer = () => {}
    visit(
      () =>
        new Promise((resolve) => {
          answer = () => resolve(new HttpResponse(null, { status: 401 }))
        }),
    )
    await screen.findByRole('main')
    expect(screen.queryByRole('heading', heading)).not.toBeInTheDocument()
    await waitFor(() => {
      answer()
      expect(screen.getByRole('heading', heading)).toBeInTheDocument()
    })
  })

  it.each([
    [
      'a signed-in person',
      () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'a@b.co', fullName: 'An', systemRole: 'USER' },
          next: 'home',
        }),
    ],
    ['a failing API', () => HttpResponse.error()],
  ])('lets %s through', async (_name, respond) => {
    const router = visit(respond)
    expect(await screen.findByRole('heading', heading)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forgot-password')
  })

  it('keeps the page and what was typed when a failed check runs again on focus', async () => {
    let calls = 0
    visit(() => {
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
