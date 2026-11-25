// The password typed on WEB-01/02, sent with the code on WEB-16. Memory only: a reload must forget it.
let pending: { email: string; password: string } | undefined

export function setPendingPassword(email: string, password: string) {
  pending = { email, password }
}

/** Undefined when nothing is held, or what is held belongs to another email. */
export function getPendingPassword(email: string): string | undefined {
  return pending?.email === email ? pending.password : undefined
}

export function clearPendingPassword() {
  pending = undefined
}
