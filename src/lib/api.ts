import { env } from '@/lib/env'

// shortcut: names agreed by default in the init plan, change here once the backend confirms them.
export const CSRF_COOKIE = 'csrf_token'
export const CSRF_HEADER = 'X-CSRF-Token'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API ${status}`)
    this.status = status
    this.body = body
  }
}

/** The backend's `error.code`, or undefined for any other failure. */
export function errorCode(e: unknown): string | undefined {
  if (!(e instanceof ApiError)) return undefined
  return (e.body as { error?: { code?: string } } | null | undefined)?.error?.code
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/** Calls the API with the session cookie; adds the double-submit CSRF header on every write. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (!SAFE_METHODS.includes(method)) {
    const token = readCookie(CSRF_COOKIE)
    if (token) headers.set(CSRF_HEADER, decodeURIComponent(token))
  }

  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  })

  const text = await res.text()
  const body: unknown = text ? JSON.parse(text) : undefined
  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}
