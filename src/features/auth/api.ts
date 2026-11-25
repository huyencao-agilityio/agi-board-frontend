import { api } from '@/lib/api'
import type { AuthResult } from './session'

const post = <T>(path: string, body: object) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })

/** POST /auth/sign-in. Errors carry `{ error: { code } }`: INVALID_CREDENTIALS, ACCOUNT_DEACTIVATED, SIGN_IN_LOCKED. */
export function signIn(body: { email: string; password: string }) {
  return post<AuthResult>('/auth/sign-in', body)
}

/** POST /auth/sign-up. No session yet. Code: EMAIL_ALREADY_EXISTS (verified, Google-only or deactivated account). */
export function signUp(body: { fullName: string; email: string; password: string }) {
  return post<{ next: 'verify-email' }>('/auth/sign-up', body)
}

/** POST /auth/verify-email. Starts the session; the password becomes the account's. Codes: INCORRECT_CODE, CODE_LOCKED, CODE_EXPIRED, ACCOUNT_DEACTIVATED. */
export function verifyEmail(body: { email: string; code: string; password: string }) {
  return post<AuthResult>('/auth/verify-email', body)
}

/** POST /auth/resend-code. The same answer for every email; RESEND_TOO_SOON within 60 seconds. */
export function resendCode(body: { email: string }) {
  return post<{ sent: true }>('/auth/resend-code', body)
}

/** POST /auth/forgot-password. The same answer for every email, also when nothing was sent. */
export function forgotPassword(body: { email: string }) {
  return post<{ sent: true }>('/auth/forgot-password', body)
}

/** POST /auth/reset-password/check. Does not use the link up. Code: RESET_LINK_INVALID. */
export function checkResetLink(body: { token: string }) {
  return post<{ email: string }>('/auth/reset-password/check', body)
}

/** POST /auth/reset-password. Ends every session of the account. Codes: RESET_LINK_INVALID, VALIDATION_FAILED (the link stays valid). */
export function resetPassword(body: { token: string; password: string }) {
  return post<{ next: 'sign-in' }>('/auth/reset-password', body)
}
