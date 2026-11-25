import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingPassword,
  getPendingPassword,
  setPendingPassword,
} from '@/features/auth/pending-password'
import { server } from '@/test/server'
import VerifyEmailPage from './VerifyEmailPage'

const API = import.meta.env.VITE_API_BASE_URL
const EMAIL = 'new@b.co'
const PASSWORD = 'horse battery 1'
const OK = {
  user: { id: 'u1', email: EMAIL, fullName: 'An', systemRole: 'USER' },
  next: 'home',
}
const running = () => Date.now() + 60_000
const over = () => Date.now() - 1

function setup({ state = { email: EMAIL, resendAt: running() } as unknown, held = true } = {}) {
  if (held) setPendingPassword(EMAIL, PASSWORD)
  const client = new QueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state }]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/signin" element={<p>Sign in page</p>} />
          <Route path="/signup" element={<p>Sign up page</p>} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    client,
    view,
    user: userEvent.setup(vi.isFakeTimers() ? { advanceTimers: vi.advanceTimersByTime } : {}),
  }
}

const boxes = () => screen.getAllByRole<HTMLInputElement>('textbox', { name: /^Digit/ })
const codeShown = () =>
  boxes()
    .map((b) => b.value)
    .join('')
const verifyButton = () => screen.getByRole('button', { name: 'Verify' })

async function enter(user: ReturnType<typeof userEvent.setup>, code = '123456') {
  await user.click(boxes()[0])
  await user.paste(code)
}

function onVerify(respond: () => Response | Promise<Response>) {
  const bodies: unknown[] = []
  server.use(
    http.post(`${API}/auth/verify-email`, async ({ request }) => {
      bodies.push(await request.json())
      return respond()
    }),
  )
  return bodies
}
const fail = (status: number, code: string) => () =>
  HttpResponse.json({ error: { code } }, { status })

describe('VerifyEmailPage', () => {
  afterEach(() => {
    clearPendingPassword()
    vi.useRealTimers()
  })

  it.each([null, {}, { email: 1 }])('goes to sign in without a pending email (%j)', (state) => {
    setup({ state })
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })

  it('shows the email in full, with Verify disabled and the countdown running', () => {
    setup()
    expect(screen.getByText(`Enter the 6-digit code we sent to ${EMAIL}.`)).toBeInTheDocument()
    expect(verifyButton()).toBeDisabled()
    expect(screen.getByText('Resend in 60s')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('submits once on the 6th digit, starts the session and goes home', async () => {
    const bodies = onVerify(() => HttpResponse.json(OK))
    const { user, client } = setup()
    await enter(user)
    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(bodies).toEqual([{ email: EMAIL, code: '123456', password: PASSWORD }])
    expect(client.getQueryData(['session'])).toMatchObject({ id: 'u1', email: EMAIL })
    expect(getPendingPassword(EMAIL)).toBeUndefined()
  })

  it('locks the boxes while verifying, and still starts the session if the page closes', async () => {
    let finish = () => {}
    const bodies = onVerify(
      () => new Promise((resolve) => (finish = () => resolve(HttpResponse.json(OK)))),
    )
    const { user, client, view } = setup()
    await enter(user)
    expect(await screen.findByRole('button', { name: 'Verifying' })).toBeDisabled()
    boxes().forEach((b) => expect(b).toBeDisabled())
    await waitFor(() => expect(bodies).toHaveLength(1))
    view.unmount()
    finish()
    await waitFor(() => expect(client.getQueryData(['session'])).toMatchObject({ id: 'u1' }))
    expect(getPendingPassword(EMAIL)).toBeUndefined()
  })

  it.each([
    [400, 'INCORRECT_CODE', 'Incorrect code.'],
    [400, 'CODE_EXPIRED', 'This code has expired. Request a new code.'],
  ])('%i %s shows its message until a digit is edited', async (status, code, text) => {
    onVerify(fail(status, code))
    const { user } = setup()
    await enter(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByRole('group')).toHaveAccessibleDescription(text)
    expect(codeShown()).toBe('')
    expect(verifyButton()).toBeDisabled()
    boxes().forEach((b) => expect(b).toBeInvalid())
    expect(boxes()[0]).toHaveFocus()
    expect(screen.getByText(/^Resend in/)).toBeInTheDocument()
    await user.keyboard('9')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    boxes().forEach((b) => expect(b).toBeValid())
  })

  it('submits again when a new code is typed after a wrong one', async () => {
    const bodies = onVerify(fail(400, 'INCORRECT_CODE'))
    const { user } = setup()
    await enter(user)
    await screen.findByRole('alert')
    await user.keyboard('654321')
    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[1]).toMatchObject({ code: '654321' })
  })

  it('blocks the boxes when locked and keeps the countdown', async () => {
    onVerify(fail(429, 'CODE_LOCKED'))
    const { user } = setup()
    await enter(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Request a new code.',
    )
    expect(codeShown()).toBe('')
    boxes().forEach((b) => expect(b).toBeDisabled())
    expect(verifyButton()).toBeDisabled()
    expect(screen.getByText(/^Resend in/)).toBeInTheDocument()
  })

  it('opens the boxes again when a locked code is replaced', async () => {
    onVerify(fail(429, 'CODE_LOCKED'))
    server.use(http.post(`${API}/auth/resend-code`, () => HttpResponse.json({ sent: true })))
    const { user } = setup({ state: { email: EMAIL, resendAt: over() } })
    await enter(user)
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(await screen.findByText('A new code has been sent.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    boxes().forEach((b) => expect(b).toBeEnabled())
  })

  it.each([
    [
      'a deactivated account',
      fail(403, 'ACCOUNT_DEACTIVATED'),
      'This account has been deactivated. Contact your administrator.',
    ],
    ['a network error', () => HttpResponse.error(), 'Something went wrong. Try again.'],
  ])('shows %s without red boxes and keeps the code', async (_name, respond, text) => {
    onVerify(respond)
    const { user } = setup()
    await enter(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(codeShown()).toBe('123456')
    boxes().forEach((b) => expect(b).toBeValid())
    expect(verifyButton()).toBeEnabled()
  })

  it('resends after 60 seconds: toast for 5 seconds, cleared boxes, new countdown', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let body: unknown
    server.use(
      http.post(`${API}/auth/resend-code`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ sent: true })
      }),
    )
    const { user } = setup()
    await user.click(boxes()[0])
    await user.keyboard('12')
    act(() => void vi.advanceTimersByTime(58_000))
    expect(screen.getByText(/^Resend in [12]s$/)).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(3_000))
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(await screen.findByText('A new code has been sent.')).toBeInTheDocument()
    expect(body).toEqual({ email: EMAIL })
    expect(codeShown()).toBe('')
    expect(screen.getByText(/^Resend in (60|59)s$/)).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(5_000))
    expect(screen.queryByText('A new code has been sent.')).not.toBeInTheDocument()
  })

  it('restarts the countdown without a toast when it is too soon', async () => {
    server.use(http.post(`${API}/auth/resend-code`, fail(429, 'RESEND_TOO_SOON')))
    const { user } = setup({ state: { email: EMAIL, resendAt: over() } })
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(await screen.findByText(/^Resend in/)).toBeInTheDocument()
    expect(screen.queryByText('A new code has been sent.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reports a failed resend', async () => {
    server.use(http.post(`${API}/auth/resend-code`, () => HttpResponse.error()))
    const { user } = setup({ state: { email: EMAIL, resendAt: over() } })
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled()
  })

  it('locks the code while a resend is pending, then moves focus to the first box', async () => {
    let finish = () => {}
    server.use(
      http.post(
        `${API}/auth/resend-code`,
        () =>
          new Promise<Response>(
            (resolve) => (finish = () => resolve(HttpResponse.json({ sent: true }))),
          ),
      ),
    )
    const bodies = onVerify(() => HttpResponse.error())
    const { user } = setup({ state: { email: EMAIL, resendAt: over() } })
    await enter(user) // a full code that failed once, so Verify is enabled
    await waitFor(() => expect(verifyButton()).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Resend code' }))
    await waitFor(() => boxes().forEach((b) => expect(b).toBeDisabled()))
    expect(verifyButton()).toBeDisabled()
    expect(bodies).toHaveLength(1)
    finish()
    expect(await screen.findByText('A new code has been sent.')).toBeInTheDocument()
    boxes().forEach((b) => expect(b).toBeEnabled())
    expect(boxes()[0]).toHaveFocus()
  })

  it('continues an earlier countdown instead of restarting it', () => {
    setup({ state: { email: EMAIL, resendAt: Date.now() + 20_000 } })
    expect(screen.getByText(/^Resend in (20|19)s$/)).toBeInTheDocument()
  })

  it('forgets the password when going back to sign up', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Back to sign up' }))
    expect(screen.getByText('Sign up page')).toBeInTheDocument()
    expect(getPendingPassword(EMAIL)).toBeUndefined()
  })

  it.each(['no password', 'the password of another email'])(
    'asks for the password when it holds %s',
    async (kind) => {
      if (kind !== 'no password') setPendingPassword('other@b.co', 'other horse 2')
      const bodies = onVerify(() => HttpResponse.json(OK))
      const { user } = setup({ held: false })
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      expect(screen.getByLabelText('Password')).not.toHaveFocus()
      await enter(user)
      expect(bodies).toHaveLength(0)
      expect(verifyButton()).toBeDisabled()
      await user.type(screen.getByLabelText('Password'), 'new horse 1')
      expect(verifyButton()).toBeDisabled() // contains the email name
      await user.clear(screen.getByLabelText('Password'))
      await user.type(screen.getByLabelText('Password'), PASSWORD)
      await user.click(verifyButton())
      expect(await screen.findByText('Home')).toBeInTheDocument()
      expect(bodies).toEqual([{ email: EMAIL, code: '123456', password: PASSWORD }])
    },
  )

  it('asks for the password when the one it holds is refused', async () => {
    onVerify(fail(400, 'VALIDATION_FAILED'))
    const { user } = setup()
    await enter(user)
    expect(await screen.findByLabelText('Password')).toHaveFocus()
    expect(boxes()[0]).toBeEnabled()
    expect(codeShown()).toBe('123456')
    expect(getPendingPassword(EMAIL)).toBeUndefined()
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(verifyButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })
})
