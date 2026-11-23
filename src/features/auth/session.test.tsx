import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import { SESSION_ENDED_KEY, useSession } from './session'

const API = import.meta.env.VITE_API_BASE_URL

function run() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useSession(), { wrapper }) }
}

describe('useSession', () => {
  it('maps GET /auth/me to the session user', async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'a@b.co', fullName: 'An', systemRole: 'USER' },
          next: 'home',
        }),
      ),
    )
    const { result } = run()
    await waitFor(() =>
      expect(result.current.data).toEqual({
        id: 'u1',
        email: 'a@b.co',
        name: 'An',
        systemRole: 'USER',
      }),
    )
  })

  it.each([
    ['SESSION_ENDED', true],
    ['UNAUTHORIZED', false],
  ])('401 %s gives null and ended=%s', async (code, ended) => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json({ error: { code } }, { status: 401 })),
    )
    const { result, client } = run()
    await waitFor(() => expect(result.current.data).toBeNull())
    expect(client.getQueryData(SESSION_ENDED_KEY)).toBe(ended)
  })

  it('fails once, without retrying, when the API errors', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/auth/me`, () => {
        calls++
        return HttpResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
      }),
    )
    const { result } = run()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls).toBe(1)
  })
})
