import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '@/test/server'
import { api, ApiError, CSRF_COOKIE, CSRF_HEADER } from './api'

const API = import.meta.env.VITE_API_BASE_URL

describe('api', () => {
  afterEach(() => {
    document.cookie = `${CSRF_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  })

  it('sends the CSRF cookie value as a header on writes', async () => {
    document.cookie = `${CSRF_COOKIE}=abc123`
    let header: string | null = null
    server.use(
      http.post(`${API}/cards`, ({ request }) => {
        header = request.headers.get(CSRF_HEADER)
        return HttpResponse.json({ id: '1' })
      }),
    )

    await expect(api('/cards', { method: 'POST', body: '{}' })).resolves.toEqual({ id: '1' })
    expect(header).toBe('abc123')
  })

  it('does not send the CSRF header on reads', async () => {
    document.cookie = `${CSRF_COOKIE}=abc123`
    let header: string | null = 'unset'
    server.use(
      http.get(`${API}/boards`, ({ request }) => {
        header = request.headers.get(CSRF_HEADER)
        return HttpResponse.json([])
      }),
    )

    await api('/boards')
    expect(header).toBeNull()
  })

  it('throws ApiError with status and body on failure', async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          { status: 401 },
        ),
      ),
    )

    const error = await api('/auth/me').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, body: { error: { code: 'UNAUTHORIZED' } } })
  })

  it('accepts an empty response body', async () => {
    server.use(http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })))
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
