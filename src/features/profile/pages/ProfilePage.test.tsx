import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/server'
import type { AccountSession, Profile } from '../api'
import ProfilePage from './ProfilePage'

const API = import.meta.env.VITE_API_BASE_URL
const GENERIC = 'Something went wrong. Try again.'
const PHOTO_ERROR = 'Choose a JPG, PNG or WebP image up to 5 MB.'

const PROFILE: Profile = {
  id: 'u1',
  email: 'an.nguyen@example.com',
  fullName: 'An Nguyen',
  avatarUrl: null,
  hasPassword: true,
  googleLinked: true,
  changePasswordLockedUntil: null,
}

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const SESSIONS: AccountSession[] = [
  {
    id: 's1',
    userAgent: CHROME_WIN,
    createdAt: ago(0),
    lastActiveAt: ago(0),
    isCurrent: true,
  },
  {
    id: 's2',
    userAgent: SAFARI_IPHONE,
    createdAt: ago(0),
    lastActiveAt: ago(2 * 3_600_000),
    isCurrent: false,
  },
  { id: 's3', userAgent: null, createdAt: ago(0), lastActiveAt: ago(0), isCurrent: false },
]

const fail = (status: number, code: string, details?: unknown) =>
  HttpResponse.json({ error: { code, message: code, details } }, { status })

/** Serves the page's two GETs; returns the client so tests can read the caches. */
function renderPage({
  profile = PROFILE,
  sessions = SESSIONS,
}: { profile?: Profile; sessions?: AccountSession[] } = {}) {
  let list = sessions
  const seen = { sessionGets: 0 }
  server.use(
    http.get(`${API}/users/me`, () => HttpResponse.json(profile)),
    http.get(`${API}/auth/sessions`, () => {
      seen.sessionGets++
      return HttpResponse.json({ items: list })
    }),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['session'], {
    id: 'u1',
    email: profile.email,
    name: profile.fullName,
    systemRole: 'USER',
    avatarUrl: profile.avatarUrl,
  })
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    client,
    seen,
    setSessions: (next: AccountSession[]) => (list = next),
    fileInput: () => utils.container.querySelector<HTMLInputElement>('input[type="file"]')!,
  }
}

const loaded = () => screen.findByRole('heading', { name: 'Sessions' })
const button = (name: string | RegExp) => screen.getByRole('button', { name })

afterEach(() => {
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('ProfilePage', () => {
  it('shows the title and the four sections', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    await loaded()
    for (const name of ['Profile', 'Password', 'Google', 'Sessions'])
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
  })

  it('shows the banner when the page cannot load', async () => {
    server.use(http.get(`${API}/users/me`, () => fail(500, 'INTERNAL')))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    server.use(http.get(`${API}/auth/sessions`, () => HttpResponse.json({ items: [] })))
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
  })
})

describe('ProfilePage — name and photo (US1)', () => {
  it('keeps Save disabled until the name changes to a valid value', async () => {
    renderPage()
    const user = userEvent.setup()
    await loaded()
    const field = screen.getByLabelText('Full name')
    expect(field).toHaveValue('An Nguyen')
    expect(button('Save')).toBeDisabled()

    await user.clear(field)
    expect(button('Save')).toBeDisabled()
    await user.type(field, '   ')
    expect(button('Save')).toBeDisabled()
    await user.clear(field)
    await user.type(field, 'An Nguyen')
    expect(button('Save')).toBeDisabled()
    await user.type(field, 'x')
    expect(button('Save')).toBeEnabled()
  })

  it('saves the trimmed name with the CSRF header and updates the header name', async () => {
    document.cookie = 'csrf_token=abc'
    const { client } = renderPage()
    const sent: { body: unknown; csrf: string | null }[] = []
    let answer!: () => void
    server.use(
      http.patch(`${API}/users/me`, async ({ request }) => {
        const body = (await request.json()) as { fullName: string }
        sent.push({ body, csrf: request.headers.get('X-CSRF-Token') })
        await new Promise<void>((r) => (answer = r))
        return HttpResponse.json({ ...PROFILE, fullName: body.fullName })
      }),
    )
    const user = userEvent.setup()
    await loaded()
    const field = screen.getByLabelText('Full name')
    await user.clear(field)
    await user.type(field, '  Binh Le  ')
    await user.click(button('Save'))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(field).toBeDisabled()
    expect(button('Save')).toBeDisabled()
    answer()

    // The section restarts from the new saved name, so look the field up again.
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue('Binh Le'))
    expect(sent[0]).toEqual({ body: { fullName: 'Binh Le' }, csrf: 'abc' })
    expect(client.getQueryData(['session'])).toMatchObject({ name: 'Binh Le' })
    expect(button('Save')).toBeDisabled()
  })

  it('shows the banner and keeps the typed name when saving fails', async () => {
    renderPage()
    server.use(http.patch(`${API}/users/me`, () => fail(500, 'INTERNAL')))
    const user = userEvent.setup()
    await loaded()
    const field = screen.getByLabelText('Full name')
    await user.type(field, ' Jr')
    await user.click(button('Save'))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
    expect(field).toHaveValue('An Nguyen Jr')
    expect(field).not.toHaveAttribute('aria-invalid', 'true')
    expect(button('Save')).toBeEnabled()
  })

  it('shows initials without a photo, then uploads and removes one', async () => {
    const withPhoto = { ...PROFILE, avatarUrl: '/api/v1/users/me/avatar?v=2' }
    const { client, fileInput } = renderPage()
    const uploads: string[] = []
    server.use(
      http.put(`${API}/users/me/avatar`, ({ request }) => {
        // jsdom's File cannot be streamed back by MSW, so check the encoding, not the bytes.
        uploads.push(request.headers.get('Content-Type') ?? '')
        return HttpResponse.json(withPhoto)
      }),
      http.delete(`${API}/users/me/avatar`, () => new HttpResponse(null, { status: 204 })),
    )
    const user = userEvent.setup()
    await loaded()
    const section = within(screen.getByRole('region', { name: 'Profile' }))
    expect(section.getByText('AN')).toBeInTheDocument()
    expect(section.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()

    await user.upload(fileInput(), new File(['png'], 'me.png', { type: 'image/png' }))
    expect(await section.findByRole('img', { name: 'An Nguyen' })).toBeInTheDocument()
    expect(uploads[0]).toMatch(/^multipart\/form-data; boundary=/)
    expect(client.getQueryData(['session'])).toMatchObject({ avatarUrl: withPhoto.avatarUrl })

    await user.click(section.getByRole('button', { name: 'Remove photo' }))
    expect(await section.findByText('AN')).toBeInTheDocument()
    expect(section.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
    expect(client.getQueryData(['session'])).toMatchObject({ avatarUrl: null })
  })

  it.each([
    ['a PDF', new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })],
    [
      'a 6 MB image',
      (() => {
        const f = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
        Object.defineProperty(f, 'size', { value: 6 * 1024 * 1024 })
        return f
      })(),
    ],
  ])('refuses %s without sending it', async (_label, file) => {
    const { fileInput } = renderPage()
    let puts = 0
    server.use(
      http.put(`${API}/users/me/avatar`, () => {
        puts++
        return HttpResponse.json(PROFILE)
      }),
    )
    const user = userEvent.setup({ applyAccept: false })
    await loaded()
    await user.upload(fileInput(), file)
    expect(await screen.findByRole('alert')).toHaveTextContent(PHOTO_ERROR)
    expect(puts).toBe(0)
    expect(screen.getByText('AN')).toBeInTheDocument()
  })

  it.each([
    [413, 'PAYLOAD_TOO_LARGE'],
    [415, 'UNSUPPORTED_IMAGE_TYPE'],
  ])('shows the photo error for %i %s', async (status, code) => {
    const { fileInput } = renderPage()
    server.use(http.put(`${API}/users/me/avatar`, () => fail(status, code)))
    const user = userEvent.setup()
    await loaded()
    await user.upload(fileInput(), new File(['x'], 'me.webp', { type: 'image/webp' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(PHOTO_ERROR)
  })
})

describe('ProfilePage — password (US2)', () => {
  const current = () => screen.getByLabelText('Current password')
  const next = () => screen.getByLabelText('New password')

  async function fill(user: ReturnType<typeof userEvent.setup>, cur: string, nw: string) {
    await user.type(current(), cur)
    await user.type(next(), nw)
  }

  it('starts empty and disabled, and checks the rules live', async () => {
    renderPage()
    const user = userEvent.setup()
    await loaded()
    expect(current()).toHaveValue('')
    expect(next()).toHaveValue('')
    expect(button('Change password')).toBeDisabled()
    const rules = within(screen.getByRole('list', { name: 'Rules' }))
    expect(rules.queryByText(/\(met\)|\(not met\)/)).not.toBeInTheDocument()

    await user.type(next(), 'an.nguyen1')
    expect(rules.getByText('At least 8 characters')).toHaveTextContent('(met)')
    expect(rules.getByText('Does not contain your email name')).toHaveTextContent('(not met)')
    await user.type(current(), 'Oldpass1')
    expect(button('Change password')).toBeDisabled()
  })

  it('refuses a new password equal to the current one without a request', async () => {
    renderPage()
    const user = userEvent.setup()
    await loaded()
    await fill(user, 'Samepass1', 'Samepass1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'New password must be different from the current one.',
    )
    expect(next()).toHaveAttribute('aria-invalid', 'true')
    expect(button('Change password')).toBeDisabled()
  })

  it('changes the password: toast, cleared fields, sessions refetched', async () => {
    document.cookie = 'csrf_token=abc'
    const { seen } = renderPage()
    const sent: unknown[] = []
    server.use(
      http.post(`${API}/auth/change-password`, async ({ request }) => {
        sent.push({ body: await request.json(), csrf: request.headers.get('X-CSRF-Token') })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    await loaded()
    await fill(user, 'Oldpass1', 'Newpass22')
    await user.click(button('Change password'))

    expect(await screen.findByText('Password updated')).toBeInTheDocument()
    expect(sent).toEqual([
      { body: { currentPassword: 'Oldpass1', newPassword: 'Newpass22' }, csrf: 'abc' },
    ])
    expect(current()).toHaveValue('')
    expect(next()).toHaveValue('')
    await waitFor(() => expect(seen.sessionGets).toBe(2))
  })

  it.each([
    ['CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect.', 'Current password'],
    [
      'NEW_PASSWORD_SAME_AS_CURRENT',
      'New password must be different from the current one.',
      'New password',
    ],
  ])('shows %s inline', async (code, message, label) => {
    renderPage()
    server.use(http.post(`${API}/auth/change-password`, () => fail(400, code)))
    const user = userEvent.setup()
    await loaded()
    await fill(user, 'Oldpass1', 'Newpass22')
    await user.click(button('Change password'))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(button('Change password')).toBeDisabled()
  })

  it('locks Change password until the time the server sends', async () => {
    renderPage()
    const until = new Date(Date.now() + 15 * 60_000).toISOString()
    server.use(
      http.post(`${API}/auth/change-password`, () =>
        fail(429, 'CHANGE_PASSWORD_LOCKED', { lockedUntil: until }),
      ),
    )
    const user = userEvent.setup()
    await loaded()
    await fill(user, 'Oldpass1', 'Newpass22')
    await user.click(button('Change password'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 15 minutes.',
    )
    expect(current()).toHaveAttribute('aria-invalid', 'true')
    expect(button('Change password')).toBeDisabled()
  })

  it('is still locked after a reload and unlocks when the lock time passes', async () => {
    // Fake clock: the lock is 15 minutes away, so loading can never race it.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true })
    try {
      renderPage({
        profile: {
          ...PROFILE,
          changePasswordLockedUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await loaded()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts. Try again in 15 minutes.',
      )
      await fill(user, 'Oldpass1', 'Newpass22')
      expect(button('Change password')).toBeDisabled()

      await act(() => vi.advanceTimersByTimeAsync(15 * 60_000))
      expect(button('Change password')).toBeEnabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('is not locked when the backend sends no lock field', async () => {
    const { changePasswordLockedUntil: _omit, ...older } = PROFILE
    renderPage({ profile: older as Profile })
    const user = userEvent.setup()
    await loaded()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await fill(user, 'Oldpass1', 'Newpass22')
    expect(button('Change password')).toBeEnabled()
  })

  it('hides the Password section for a Google-only account', async () => {
    renderPage({ profile: { ...PROFILE, hasPassword: false } })
    await loaded()
    expect(screen.queryByRole('heading', { name: 'Password' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Google' })).toBeInTheDocument()
  })

  it('shows the banner and keeps the entries when the request fails', async () => {
    renderPage()
    server.use(http.post(`${API}/auth/change-password`, () => fail(500, 'INTERNAL')))
    const user = userEvent.setup()
    await loaded()
    await fill(user, 'Oldpass1', 'Newpass22')
    await user.click(button('Change password'))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
    expect(current()).toHaveValue('Oldpass1')
    expect(button('Change password')).toBeEnabled()
  })
})

describe('ProfilePage — sessions (US4)', () => {
  it('lists device and last active time, current one marked This device', async () => {
    renderPage()
    await loaded()
    const rows = within(screen.getByRole('region', { name: 'Sessions' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Chrome on Windows')
    expect(rows[0]).toHaveTextContent('Last active now')
    expect(rows[0]).toHaveTextContent('This device')
    expect(within(rows[0]).queryByRole('button')).not.toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('Safari on iPhone')
    expect(rows[1]).toHaveTextContent('Last active 2 hours ago')
    expect(rows[2]).toHaveTextContent('Unknown device')
  })

  it('signs out one session and then all others', async () => {
    const { setSessions } = renderPage()
    const deleted: string[] = []
    server.use(
      http.delete(`${API}/auth/sessions/:id`, ({ params }) => {
        deleted.push(String(params.id))
        setSessions(SESSIONS.filter((s) => s.id !== params.id))
        return new HttpResponse(null, { status: 204 })
      }),
      http.delete(`${API}/auth/sessions`, () => {
        deleted.push('others')
        setSessions([SESSIONS[0]])
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    await loaded()
    await user.click(button('Sign out Safari on iPhone'))
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument())

    await user.click(button('Sign out of all other sessions'))
    await waitFor(() => expect(screen.queryByText('Unknown device')).not.toBeInTheDocument())
    expect(deleted).toEqual(['s2', 'others'])
    expect(screen.getByText('This device')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sign out/ })).not.toBeInTheDocument()
  })

  it('hides both sign-out controls with only the current session', async () => {
    renderPage({ sessions: [SESSIONS[0]] })
    await loaded()
    expect(screen.queryByRole('button', { name: /^Sign out/ })).not.toBeInTheDocument()
  })

  it('refreshes without a banner when the session is already gone', async () => {
    const { seen } = renderPage()
    server.use(http.delete(`${API}/auth/sessions/:id`, () => fail(404, 'SESSION_NOT_FOUND')))
    const user = userEvent.setup()
    await loaded()
    await user.click(button('Sign out Safari on iPhone'))
    await waitFor(() => expect(seen.sessionGets).toBe(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the banner and keeps the list when signing out fails', async () => {
    renderPage()
    server.use(http.delete(`${API}/auth/sessions`, () => fail(500, 'INTERNAL')))
    const user = userEvent.setup()
    await loaded()
    await user.click(button('Sign out of all other sessions'))
    expect(await screen.findByRole('alert')).toHaveTextContent(GENERIC)
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument()
  })
})

describe('ProfilePage — Google (US3)', () => {
  it.each([
    [true, 'Google: Linked'],
    [false, 'Google: Not linked'],
  ])('googleLinked %s → %s, no button', async (linked, text) => {
    renderPage({ profile: { ...PROFILE, googleLinked: linked } })
    await loaded()
    const section = within(screen.getByRole('region', { name: 'Google' }))
    expect(section.getByText(/^Google:/)).toHaveTextContent(text)
    expect(section.queryByRole('button')).not.toBeInTheDocument()
  })
})
