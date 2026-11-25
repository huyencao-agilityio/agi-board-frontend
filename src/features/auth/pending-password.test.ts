import { afterEach, describe, expect, it } from 'vitest'
import { clearPendingPassword, getPendingPassword, setPendingPassword } from './pending-password'

describe('pending password', () => {
  afterEach(clearPendingPassword)

  it('is returned only for its own email, until cleared', () => {
    expect(getPendingPassword('a@b.co')).toBeUndefined()
    setPendingPassword('a@b.co', 'secret 1')
    expect(getPendingPassword('a@b.co')).toBe('secret 1')
    expect(getPendingPassword('c@d.co')).toBeUndefined()
    clearPendingPassword()
    expect(getPendingPassword('a@b.co')).toBeUndefined()
  })
})
