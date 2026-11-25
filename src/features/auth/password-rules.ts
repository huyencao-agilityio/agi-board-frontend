export type Rule = { label: string; ok: boolean }

/** The rules for a new password, in display order. Same checks as the backend. */
export function passwordRules(password: string, email: string): Rule[] {
  const name = email.trim().toLowerCase().split('@')[0]
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    // Not in the mockups, so listed only when broken.
    ...(password.length > 128 ? [{ label: 'At most 128 characters', ok: false }] : []),
    {
      label: 'At least one letter and one number',
      ok: /\p{L}/u.test(password) && /\d/.test(password),
    },
    {
      label: 'Does not contain your email name',
      ok: !name || !password.toLowerCase().includes(name),
    },
  ]
}

export function isValidPassword(password: string, email: string): boolean {
  return passwordRules(password, email).every((rule) => rule.ok)
}
