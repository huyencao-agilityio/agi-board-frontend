import { api } from '@/lib/api'
import type { AuthResult } from './session'

/** POST /auth/sign-in. Errors carry `{ error: { code } }`: INVALID_CREDENTIALS, ACCOUNT_DEACTIVATED, SIGN_IN_LOCKED. */
export function signIn(body: { email: string; password: string }) {
  return api<AuthResult>('/auth/sign-in', { method: 'POST', body: JSON.stringify(body) })
}
