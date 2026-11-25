export const RESEND_SECONDS = 60

/** Router state of WEB-16. It survives a reload; the password is never part of it. */
export type VerifyState = { email: string; resendAt: number }

/** State for a code sent just now. */
export function newVerifyState(email: string): VerifyState {
  return { email, resendAt: Date.now() + RESEND_SECONDS * 1000 }
}
