import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import {
  clearPendingPassword,
  getPendingPassword,
  setPendingPassword,
} from '@/features/auth/pending-password'
import { server } from '@/test/server'
import SignInPage from './SignInPage'

const RESULT = (next: string) => ({
  user: { id: 'u1', email: 'a@b.co', fullName: 'A', systemRole: 'USER' },
  next,
})
const API = import.meta.env.VITE_API_BASE_URL

function StateProbe() {
  return <pre data-testid="state">{JSON.stringify(useLocation().state)}</pre>
}

function SearchProbe() {
  return <pre data-testid="search">{useLocation().search}</pre>
}

function setupWithClient(url = '/signin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/signin"
            element={
              <>
                <SignInPage />
                <SearchProbe />
              </>
            }
          />
          <Route path="/" element={<p>Home</p>} />
          <Route path="/verify-email" element={<StateProbe />} />
          <Route path="/b/x" element={<p>Board</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), client }
}

const setup = (url?: string) => setupWithClient(url).user

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'a@b.co')
  await user.type(screen.getByLabelText('Password'), 'x')
}

describe('SignInPage', () => {
  it('posts the credentials with the CSRF header and links the email error', async () => {
    document.cookie = 'csrf_token=tok123'
    let sent: { body: unknown; csrf: string | null } | undefined
    server.use(
      http.post(`${API}/auth/sign-in`, async ({ request }) => {
        sent = { body: await request.json(), csrf: request.headers.get('X-CSRF-Token') }
        return HttpResponse.json(RESULT('home'))
      }),
    )
    const user = setup()
    await user.type(screen.getByLabelText('Email'), 'a@')
    await user.tab()
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    )
    await user.clear(screen.getByLabelText('Email'))
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(sent).toEqual({ body: { email: 'a@b.co', password: 'x' }, csrf: 'tok123' })
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it.each([
    ['/b/x', 'Board'],
    ['//evil.com', 'Home'],
    ['https://evil.com', 'Home'],
  ])('after sign-in goes to ?next=%s -> %s', async (target, page) => {
    server.use(http.post(`${API}/auth/sign-in`, () => HttpResponse.json(RESULT('home'))))
    const user = setup(`/signin?next=${encodeURIComponent(target)}`)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(page)).toBeInTheDocument()
  })

  it('locks the inputs and shows a busy button while signing in', async () => {
    server.use(http.post(`${API}/auth/sign-in`, () => new Promise(() => {})))
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('button', { name: 'Signing in' })).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
  })

  it('starts disabled and flags an invalid email', async () => {
    const user = setup()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    await user.type(screen.getByLabelText('Email'), 'an@')
    await user.tab()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('signs in and goes home', async () => {
    server.use(http.post(`${API}/auth/sign-in`, () => HttpResponse.json(RESULT('home'))))
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('sends unverified users to verify-email without a session, with their email', async () => {
    server.use(http.post(`${API}/auth/sign-in`, () => HttpResponse.json(RESULT('verify-email'))))
    const before = Date.now()
    const { user, client } = setupWithClient()
    await user.type(screen.getByLabelText('Email'), 'A@b.co')
    await user.type(screen.getByLabelText('Password'), 'x')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const state = JSON.parse((await screen.findByTestId('state')).textContent ?? '') as {
      email: string
      resendAt: number
    }
    expect(state.email).toBe('a@b.co')
    expect(state.resendAt).toBeGreaterThanOrEqual(before + 60_000)
    expect(Object.keys(state)).toHaveLength(2)
    expect(getPendingPassword('a@b.co')).toBe('x')
    expect(client.getQueryData(['session'])).toBeUndefined()
    clearPendingPassword()
  })

  it('seeds the session of a verified user and forgets a password held from before', async () => {
    setPendingPassword('other@b.co', 'x')
    server.use(http.post(`${API}/auth/sign-in`, () => HttpResponse.json(RESULT('home'))))
    const { user, client } = setupWithClient()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(client.getQueryData(['session'])).toMatchObject({ id: 'u1' })
    expect(getPendingPassword('other@b.co')).toBeUndefined()
  })

  it.each([
    [401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'],
    [403, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated. Contact your administrator.'],
    [429, 'SIGN_IN_LOCKED', 'Too many attempts. Try again in 15 minutes.'],
  ])('shows the banner for %i', async (status, code, text) => {
    server.use(
      http.post(`${API}/auth/sign-in`, () => HttpResponse.json({ error: { code } }, { status })),
    )
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
  })

  it.each([
    ['google_failed', 'Google sign-in failed. Try again.'],
    ['account_deactivated', 'This account has been deactivated. Contact your administrator.'],
  ])('shows the banner for ?error=%s and takes it out of the URL', (error, text) => {
    setup(`/signin?next=%2Fb%2Fx&error=${error}`)
    expect(screen.getByRole('alert')).toHaveTextContent(text)
    expect(screen.getByTestId('search')).toHaveTextContent(/^\?next=%2Fb%2Fx$/)
  })

  it('toggles password visibility and shows notices', async () => {
    const user = setup('/signin?notice=signed-out')
    expect(screen.getByRole('status')).toHaveTextContent('You were signed out. Sign in again.')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })
})
