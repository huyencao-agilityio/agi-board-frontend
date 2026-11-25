import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { queryClient as appClient } from '@/lib/query-client'
import { server } from '@/test/server'
import ResetPasswordPage from './ResetPasswordPage'

const API = import.meta.env.VITE_API_BASE_URL
const EMAIL = 'jane@example.com'
const PASSWORD = 'horse battery 1'
const EXPIRED = 'This link has expired or was already used.'
const FAILED = 'Something went wrong. Try again.'
const MISMATCH = 'Passwords do not match.'

const fail = (status: number, code: string) => () =>
  HttpResponse.json({ error: { code } }, { status })
const invalidLink = fail(400, 'RESET_LINK_INVALID')

/** Answers the link check and collects the tokens sent to it. */
function checkRoute(respond: () => Response | Promise<Response>) {
  const tokens: unknown[] = []
  server.use(
    http.post(`${API}/auth/reset-password/check`, async ({ request }) => {
      tokens.push(await request.json())
      return respond()
    }),
  )
  return tokens
}
const validLink = () => checkRoute(() => HttpResponse.json({ email: EMAIL }))
const resetRoute = (respond: () => Response | Promise<Response>) =>
  server.use(http.post(`${API}/auth/reset-password`, respond))

function setup(hash = '#token=tok') {
  // The app's defaults, so a 403 would reach the error boundary (WEB-13) as it does there.
  const client = new QueryClient({
    defaultOptions: { queries: { ...appClient.getDefaultOptions().queries, retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/forgot-password', element: <p>Forgot page</p> },
      { path: '/signin', element: <p>Sign in page</p> },
    ],
    { initialEntries: [`/reset-password${hash}`] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { client, router, user: userEvent.setup() }
}

const password = () => screen.findByLabelText('New password')
const confirm = () => screen.getByLabelText('Confirm new password')
const submit = () => screen.getByRole('button', { name: 'Set new password' })
const rules = () => screen.getAllByRole('listitem').map((li) => li.textContent)

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await password(), PASSWORD)
  await user.type(confirm(), PASSWORD)
}

describe('ResetPasswordPage link', () => {
  it.each(['', '#token=', '#other=1'])(
    'shows the expired message without a request for "%s"',
    (hash) => {
      const tokens = validLink()
      setup(hash)
      expect(screen.getByRole('alert')).toHaveTextContent(EXPIRED)
      expect(tokens).toEqual([])
    },
  )

  it('checks the token, shows the form and cleans the URL', async () => {
    const tokens = validLink()
    const { router } = setup()
    expect(await password()).toHaveAttribute('type', 'password')
    expect(confirm()).toHaveAttribute('type', 'password')
    expect(submit()).toBeDisabled()
    expect(tokens).toEqual([{ token: 'tok' }])
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    expect(router.state.location.state).toBeNull()
    expect(document.body).not.toHaveTextContent(EMAIL)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('replaces the form for an unusable link and offers a new one', async () => {
    checkRoute(invalidLink)
    const { router, user } = setup()
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED)
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    await user.click(screen.getByRole('link', { name: 'Request a new link' }))
    expect(screen.getByText('Forgot page')).toBeVisible()
  })

  it.each([
    ['a network error', () => HttpResponse.error()],
    ['a 403', fail(403, 'CSRF_INVALID')],
  ])('shows a banner and keeps the link in the URL after %s', async (_name, respond) => {
    checkRoute(respond)
    const { router } = setup()
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED)
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(screen.queryByText(EXPIRED)).not.toBeInTheDocument()
    expect(router.state.location.hash).toBe('#token=tok')
  })

  it('checks another link opened in the same tab and empties the form', async () => {
    const tokens = validLink()
    const { router, user } = setup()
    await user.type(await password(), PASSWORD)
    await act(() => router.navigate('/reset-password#token=tok2'))
    expect(await password()).toHaveValue('')
    expect(tokens).toEqual([{ token: 'tok' }, { token: 'tok2' }])
    await waitFor(() => expect(router.state.location.hash).toBe(''))
  })
})

describe('ResetPasswordPage form', () => {
  it('updates the rules live, with the email name in any case', async () => {
    validLink()
    const { user } = setup()
    const field = await password()
    expect(rules()).toEqual([
      'At least 8 characters',
      'At least one letter and one number',
      'Does not contain your email name',
    ])
    await user.type(field, 'JANE')
    expect(rules()).toEqual([
      'At least 8 characters (not met)',
      'At least one letter and one number (not met)',
      'Does not contain your email name (not met)',
    ])
    await user.type(field, '-horse-1')
    await user.type(confirm(), 'JANE-horse-1')
    expect(rules()[2]).toContain('not met')
    expect(submit()).toBeDisabled()
    await user.clear(field)
    await user.type(field, PASSWORD)
    expect(rules().every((text) => text?.endsWith('(met)'))).toBe(true)
  })

  it('blocks a password over 128 characters and names the limit only then', async () => {
    validLink()
    const { user } = setup()
    const field = await password()
    for (const input of [field, confirm()]) {
      await user.click(input)
      await user.paste(`a1${'x'.repeat(127)}`)
    }
    expect(rules()).toContain('At most 128 characters (not met)')
    expect(submit()).toBeDisabled()
    for (const input of [field, confirm()]) await user.type(input, '{Backspace}')
    expect(rules()).toHaveLength(3)
    expect(submit()).toBeEnabled()
  })

  it('shows the mismatch under confirm once it is left, cleared from either field', async () => {
    validLink()
    const { user } = setup()
    const field = await password()
    await user.type(field, PASSWORD)
    await user.type(confirm(), 'horse')
    expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('alert')).toHaveTextContent(MISMATCH)
    expect(confirm()).toBeInvalid()
    expect(confirm()).toHaveAccessibleDescription(MISMATCH)
    expect(field).toBeValid()
    expect(submit()).toBeDisabled()
    await user.type(confirm(), ' battery 1')
    expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument()
    expect(submit()).toBeEnabled()
    await user.type(field, '2')
    expect(screen.getByText(MISMATCH)).toBeVisible()
    await user.type(field, '{Backspace}')
    expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument()
  })
})

describe('ResetPasswordPage submit', () => {
  afterEach(() => {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('sets the password, forgets the session and opens sign in with the notice', async () => {
    document.cookie = 'csrf_token=tok123'
    const tokens = validLink()
    let sent: unknown
    server.use(
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        sent = { body: await request.json(), csrf: request.headers.get('X-CSRF-Token') }
        return HttpResponse.json({ next: 'sign-in' })
      }),
    )
    const { client, router, user } = setup()
    client.setQueryData(['session'], { id: 'u1' })
    client.setQueryData(['boards', 'b1'], { name: 'Private' })
    await fill(user)
    await user.click(submit())
    expect(await screen.findByText('Sign in page')).toBeVisible()
    expect(router.state.location.search).toBe('?notice=password-updated')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(sent).toEqual({ body: { token: 'tok', password: PASSWORD }, csrf: 'tok123' })
    expect(client.getQueryData(['session'])).toBeNull()
    expect(client.getQueryData(['boards', 'b1'])).toBeUndefined()
    expect(tokens).toHaveLength(1)
    // Neither the token nor the password outlives the page.
    await waitFor(() =>
      expect(client.getQueryCache().findAll({ queryKey: ['reset-link'] })).toEqual([]),
    )
    expect(client.getMutationCache().getAll()).toEqual([])
  })

  it('locks both fields and shows a busy button while processing', async () => {
    validLink()
    resetRoute(() => new Promise(() => {}))
    const { user } = setup()
    await fill(user)
    await user.click(submit())
    const busy = await screen.findByRole('button', { name: 'Setting new password' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(await password()).toBeDisabled()
    expect(confirm()).toBeDisabled()
  })

  it('replaces the form when the link stopped working meanwhile', async () => {
    validLink()
    resetRoute(invalidLink)
    const { user } = setup()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED)
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeVisible()
  })

  it.each([
    ['a validation error', fail(400, 'VALIDATION_FAILED')],
    ['a network error', () => HttpResponse.error()],
  ])('keeps the form with a banner after %s, until the next submit', async (_name, respond) => {
    validLink()
    resetRoute(respond)
    const { user } = setup()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(FAILED)
    expect(await password()).toHaveValue(PASSWORD)
    expect(confirm()).toHaveValue(PASSWORD)
    resetRoute(() => new Promise(() => {}))
    await user.click(submit())
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
