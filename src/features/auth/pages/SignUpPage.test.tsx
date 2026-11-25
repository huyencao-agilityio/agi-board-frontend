import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearPendingPassword, getPendingPassword } from '@/features/auth/pending-password'
import { server } from '@/test/server'
import SignUpPage from './SignUpPage'

const API = import.meta.env.VITE_API_BASE_URL
const EMAIL = 'new@b.co'
const PASSWORD = 'horse battery 1'

function StateProbe() {
  return <pre data-testid="state">{JSON.stringify(useLocation().state)}</pre>
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<p>Sign in page</p>} />
          <Route path="/verify-email" element={<StateProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

type User = ReturnType<typeof userEvent.setup>

async function fill(user: User, values: { name?: string; email?: string; password?: string } = {}) {
  await user.type(screen.getByLabelText('Full name'), values.name ?? 'An Nguyen')
  await user.type(screen.getByLabelText('Email'), values.email ?? EMAIL)
  await user.type(screen.getByLabelText('Password'), values.password ?? PASSWORD)
}

const submit = () => screen.getByRole('button', { name: 'Sign up' })
const rule = (label: string) => {
  const item = screen.getAllByRole('listitem').find((li) => li.textContent?.includes(label))
  if (!item) throw new Error(`No rule ${label}`)
  return item
}

describe('SignUpPage', () => {
  afterEach(() => {
    clearPendingPassword()
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('starts disabled, with rules neither met nor broken', () => {
    setup()
    expect(submit()).toBeDisabled()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'A valid email address',
      'At least 8 characters',
      'At least one letter and one number',
      'Does not contain your email name',
    ])
  })

  it('needs a name that is not only spaces, of any length', async () => {
    const user = setup()
    await fill(user, { name: '   ' })
    expect(submit()).toBeDisabled()
    await user.click(screen.getByLabelText('Full name'))
    await user.paste('n'.repeat(500))
    expect(submit()).toBeEnabled()
  })

  it('flags an invalid email under the field after leaving it', async () => {
    const user = setup()
    await fill(user, { email: 'an.nguyen@' })
    await user.tab()
    const email = screen.getByLabelText('Email')
    expect(email).toBeInvalid()
    expect(email).toHaveAccessibleDescription(/Enter a valid email address\./)
    expect(rule('A valid email address')).toHaveTextContent('not met')
    expect(submit()).toBeDisabled()
  })

  it('posts the form and hands the email to verify-email, but not the password', async () => {
    document.cookie = 'csrf_token=tok123'
    let sent: { body: unknown; csrf: string | null } | undefined
    server.use(
      http.post(`${API}/auth/sign-up`, async ({ request }) => {
        sent = { body: await request.json(), csrf: request.headers.get('X-CSRF-Token') }
        return HttpResponse.json({ next: 'verify-email' }, { status: 201 })
      }),
    )
    const before = Date.now()
    const user = setup()
    await fill(user, { name: '  An Nguyen ' })
    await user.click(submit())
    const state = JSON.parse((await screen.findByTestId('state')).textContent ?? '') as {
      email: string
      resendAt: number
    }
    expect(Object.keys(state).sort()).toEqual(['email', 'resendAt'])
    expect(state.email).toBe(EMAIL)
    expect(state.resendAt).toBeGreaterThanOrEqual(before + 60_000)
    expect(state.resendAt).toBeLessThanOrEqual(Date.now() + 60_000)
    expect(getPendingPassword(EMAIL)).toBe(PASSWORD)
    expect(sent).toEqual({
      body: { fullName: 'An Nguyen', email: EMAIL, password: PASSWORD },
      csrf: 'tok123',
    })
  })

  it('locks the inputs and shows a busy button while signing up', async () => {
    server.use(http.post(`${API}/auth/sign-up`, () => new Promise(() => {})))
    const user = setup()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByRole('button', { name: 'Signing up' })).toBeDisabled()
    for (const label of ['Full name', 'Email', 'Password']) {
      expect(screen.getByLabelText(label)).toBeDisabled()
    }
  })

  it.each([
    [
      'an email that already has an account',
      () => HttpResponse.json({ error: { code: 'EMAIL_ALREADY_EXISTS' } }, { status: 409 }),
      'An account with this email already exists. Sign in instead.',
    ],
    [
      'a validation error the form does not know',
      () => HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 }),
      'Something went wrong. Try again.',
    ],
    ['a network error', () => HttpResponse.error(), 'Something went wrong. Try again.'],
  ])('shows a banner and no red field for %s', async (_name, respond, text) => {
    server.use(http.post(`${API}/auth/sign-up`, respond))
    const user = setup()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    for (const label of ['Full name', 'Email', 'Password']) {
      expect(screen.getByLabelText(label)).toBeValid()
    }
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL)
    expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD)
    expect(submit()).toBeEnabled()
    expect(getPendingPassword(EMAIL)).toBeUndefined()
  })

  it('links to sign in', async () => {
    const user = setup()
    await user.click(screen.getByRole('link', { name: 'Already have an account? Sign in' }))
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })

  it.each([
    ['abcd123', ['At least 8 characters']],
    ['12345678', ['At least one letter and one number']],
    ['abcdefgh', ['At least one letter and one number']],
    ['xxNEWxx12', ['Does not contain your email name']],
    ['abc', ['At least 8 characters', 'At least one letter and one number']],
  ])('shows the broken rules of %s and no other error', async (password, broken) => {
    const user = setup()
    await fill(user, { password })
    await user.tab()
    const list = screen.getAllByRole('list', { name: 'Rules' })[1]
    const failed = within(list)
      .getAllByRole('listitem')
      .filter((li) => li.textContent?.includes('not met'))
    expect(failed).toHaveLength(broken.length)
    broken.forEach((label) => expect(rule(label)).toHaveTextContent('not met'))
    expect(submit()).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('checks the password again when the email changes', async () => {
    const user = setup()
    await fill(user)
    expect(submit()).toBeEnabled()
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'horse@b.co')
    expect(rule('Does not contain your email name')).toHaveTextContent('not met')
    expect(submit()).toBeDisabled()
  })
})
