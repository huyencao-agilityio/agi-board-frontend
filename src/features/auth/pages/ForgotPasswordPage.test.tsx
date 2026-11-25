import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import ForgotPasswordPage from './ForgotPasswordPage'

const API = import.meta.env.VITE_API_BASE_URL
const EMAIL = 'an.nguyen@example.com'
const SENT = "If this email has an account, we've sent a reset link."
const FAILED = 'Something went wrong. Try again.'

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signin" element={<p>Sign in page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const email = () => screen.getByLabelText('Email')
const submit = () => screen.getByRole('button', { name: 'Send reset link' })
const answer = (respond: () => Response | Promise<Response>) =>
  server.use(http.post(`${API}/auth/forgot-password`, respond))
const ok = () => HttpResponse.json({ sent: true })

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('starts empty and disabled, and leads only back to sign in', async () => {
    const user = setup()
    expect(email()).toHaveValue('')
    expect(submit()).toBeDisabled()
    expect(screen.getByText('We will email a reset link valid for 30 minutes.')).toBeVisible()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    await user.click(screen.getByRole('link', { name: 'Back to sign in' }))
    expect(screen.getByText('Sign in page')).toBeVisible()
  })

  it('flags an invalid email after leaving it, until it is corrected', async () => {
    const user = setup()
    await user.type(email(), 'abc')
    await user.tab()
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(email()).toBeInvalid()
    expect(email()).toHaveAccessibleDescription('Enter a valid email address.')
    expect(submit()).toBeDisabled()
    await user.type(email(), '@b.co')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('posts the trimmed email with the CSRF header and shows the confirmation', async () => {
    document.cookie = 'csrf_token=tok123'
    let sent: unknown
    server.use(
      http.post(`${API}/auth/forgot-password`, async ({ request }) => {
        sent = { body: await request.json(), csrf: request.headers.get('X-CSRF-Token') }
        return ok()
      }),
    )
    const user = setup()
    await user.type(email(), `  ${EMAIL} `)
    await user.click(submit())
    expect(await screen.findByRole('status')).toHaveTextContent(SENT)
    expect(sent).toEqual({ body: { email: EMAIL }, csrf: 'tok123' })
    expect(submit()).toBeEnabled()
  })

  it('locks the field and shows a busy button while sending', async () => {
    answer(() => new Promise(() => {}))
    const user = setup()
    await user.type(email(), EMAIL)
    await user.click(submit())
    const busy = await screen.findByRole('button', { name: 'Sending reset link' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(email()).toBeDisabled()
  })

  it('drops the confirmation when the email is edited', async () => {
    answer(ok)
    const user = setup()
    await user.type(email(), EMAIL)
    await user.click(submit())
    await screen.findByText(SENT)
    await user.type(email(), '@')
    expect(screen.queryByText(SENT)).not.toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('shows a banner and keeps the email when sending fails, then recovers', async () => {
    answer(() => HttpResponse.error())
    const user = setup()
    await user.type(email(), EMAIL)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED)
    expect(screen.queryByText(SENT)).not.toBeInTheDocument()
    expect(email()).toHaveValue(EMAIL)
    expect(email()).toBeValid()
    answer(ok)
    await user.click(submit())
    expect(await screen.findByText(SENT)).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
